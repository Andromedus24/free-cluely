import { BrowserWindow, ipcMain, globalShortcut, app, screen } from 'electron';
import { Plugin, PluginBus, ConfigManager, Logger, PluginError, ScreenshotItem, ScreenshotConfig, CaptureMode, Region, WindowInfo } from '@free-cluely/shared';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

interface CancellationToken {
  isCancelled: boolean;
  cancel(): void;
  onCancelled(callback: () => void): void;
}

class ScreenshotCancellationToken implements CancellationToken {
  private _isCancelled = false;
  private cancellationCallbacks: (() => void)[] = [];

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  cancel(): void {
    if (!this._isCancelled) {
      this._isCancelled = true;
      this.cancellationCallbacks.forEach(callback => callback());
      this.cancellationCallbacks = [];
    }
  }

  onCancelled(callback: () => void): void {
    if (this._isCancelled) {
      callback();
    } else {
      this.cancellationCallbacks.push(callback);
    }
  }

  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new PluginError('Operation was cancelled', 'screenshot-plugin');
    }
  }
}

class TimeoutError extends PluginError {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`, 'screenshot-plugin');
    this.name = 'TimeoutError';
  }
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  operationName: string,
  cancellationToken?: CancellationToken
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (cancellationToken) {
        cancellationToken.cancel();
      }
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);

    const handleCancellation = () => {
      clearTimeout(timeout);
      reject(new PluginError('Operation was cancelled', 'screenshot-plugin'));
    };

    if (cancellationToken) {
      cancellationToken.onCancelled(handleCancellation);
    }

    operation
      .then((result) => {
        clearTimeout(timeout);
        if (cancellationToken) {
          cancellationToken.cancel(); // Prevent memory leaks
        }
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeout);
        if (cancellationToken) {
          cancellationToken.cancel(); // Prevent memory leaks
        }
        reject(error);
      });
  });
}

function createCompositeTimeout(baseTimeout: number, operationCount: number): number {
  return baseTimeout + (operationCount * 1000); // Add 1s per operation
}

export class ScreenshotPlugin implements Plugin {
  name = 'screenshot-plugin';
  version = '1.0.0';
  permissions = ['screen'];

  private problemQueue: ScreenshotItem[] = [];
  private debugQueue: ScreenshotItem[] = [];
  private config: ScreenshotConfig;
  private logger: Logger;
  private bus: PluginBus;
  private screenshotDir: string;
  private isOverlayHidden = false;
  private overlayHidePromise: Promise<void> | null = null;
  private pendingCapture = false;
  private previewCache: Map<string, { preview: any; timestamp: number }> = new Map();
  private activeCancellationToken: CancellationToken | null = null;
  private operationTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private currentOperationName: string | null = null;
  private operationStartTime: number | null = null;

  constructor(config: Partial<ScreenshotConfig> = {}) {
    this.config = {
      maxQueues: 5,
      saveDirectory: 'screenshots',
      format: 'png',
      quality: 90,
      autoHideOverlay: true,
      hotkey: process.platform === 'darwin' ? 'Cmd+H' : 'Ctrl+H',
      defaultCaptureMode: 'full',
      regionSelectionDelay: 200,
      windowHighlightDelay: 1000,
      includeCursor: true,
      captureDelay: 100,
      enablePreviews: true,
      previewSize: {
        width: 320,
        height: 240,
        quality: 80
      },
      previewCacheTTL: 3600000,
      maxPreviewCacheSize: 100,
      ...config
    };
  }

  async initialize(bus: PluginBus, configManager: ConfigManager, logger: Logger): Promise<void> {
    this.bus = bus;
    this.logger = logger;
    
    // Load configuration
    const screenshotConfig = configManager.get('screenshot') as ScreenshotConfig;
    if (screenshotConfig) {
      this.config = { ...this.config, ...screenshotConfig };
    }

    // Setup screenshot directory
    this.screenshotDir = join(app.getPath('userData'), this.config.saveDirectory);
    if (!existsSync(this.screenshotDir)) {
      mkdirSync(this.screenshotDir, { recursive: true });
    }

    this.logger.info('Initializing ScreenshotPlugin');
    
    // Setup IPC handlers
    this.setupIpcHandlers();
    
    // Register global shortcut
    this.registerGlobalShortcut();
    
    // Register plugin methods
    this.registerPluginMethods();
    
    // Load existing screenshots
    await this.loadExistingScreenshots();

    // Setup overlay state listeners
    this.setupOverlayListeners();

    this.logger.info('ScreenshotPlugin initialized successfully');
  }

  private cleanupOperationTimeouts(): void {
    for (const [operation, timeout] of this.operationTimeouts.entries()) {
      clearTimeout(timeout);
    }
    this.operationTimeouts.clear();
  }

  private scheduleOperationTimeout(operationId: string, timeoutMs: number, callback: () => void): void {
    this.cleanupOperationTimeouts();
    const timeout = setTimeout(callback, timeoutMs);
    this.operationTimeouts.set(operationId, timeout);
  }

  // IPC cancellation handler
  private registerCancellationHandlers(): void {
    ipcMain.handle('screenshot:cancel', async (event, operationId?: string) => {
      try {
        if (this.activeCancellationToken) {
          this.activeCancellationToken.cancel();
          this.logger.info(`Cancelled operation: ${operationId || 'current'}`);
          return { success: true, message: 'Operation cancelled' };
        }
        return { success: false, message: 'No active operation to cancel' };
      } catch (error) {
        this.logger.error('Failed to cancel operation:', error);
        return { success: false, message: 'Cancellation failed' };
      }
    });

    ipcMain.handle('screenshot:getStatus', async () => {
      return {
        pendingCapture: this.pendingCapture,
        hasActiveOperation: this.activeCancellationToken !== null,
        isOperationCancelled: this.activeCancellationToken?.isCancelled || false,
        overlayHidden: this.isOverlayHidden,
        currentOperation: this.currentOperationName,
        operationStartTime: this.operationStartTime
      };
    });
  }

  private setupIpcHandlers(): void {
    // Capture operations with validation
    ipcMain.handle('screenshot:capture', async (event, type?: 'problem' | 'debug', mode?: CaptureMode) => {
      try {
        const validatedType = this.validateScreenshotType(type);
        const validatedMode = this.validateCaptureMode(mode);
        return await this.captureScreenshot(validatedType, validatedMode);
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:capture:', error);
        throw this.createIPError('Invalid capture parameters', error);
      }
    });

    ipcMain.handle('screenshot:captureFull', async (event, type?: 'problem' | 'debug') => {
      try {
        const validatedType = this.validateScreenshotType(type);
        return await this.captureScreenshot(validatedType, 'full');
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:captureFull:', error);
        throw this.createIPError('Invalid capture parameters', error);
      }
    });

    ipcMain.handle('screenshot:captureWindow', async (event, type?: 'problem' | 'debug') => {
      try {
        const validatedType = this.validateScreenshotType(type);
        return await this.captureScreenshot(validatedType, 'window');
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:captureWindow:', error);
        throw this.createIPError('Invalid capture parameters', error);
      }
    });

    ipcMain.handle('screenshot:captureRegion', async (event, type?: 'problem' | 'debug') => {
      try {
        const validatedType = this.validateScreenshotType(type);
        return await this.captureScreenshot(validatedType, 'region');
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:captureRegion:', error);
        throw this.createIPError('Invalid capture parameters', error);
      }
    });

    // Read-only operations
    ipcMain.handle('screenshot:getWindows', async () => {
      try {
        return await this.getWindows();
      } catch (error) {
        this.logger.error('IPC failed for screenshot:getWindows:', error);
        throw this.createIPError('Failed to get windows', error);
      }
    });

    ipcMain.handle('screenshot:getQueues', async () => {
      try {
        return await this.getQueues();
      } catch (error) {
        this.logger.error('IPC failed for screenshot:getQueues:', error);
        throw this.createIPError('Failed to get queues', error);
      }
    });

    ipcMain.handle('screenshot:getBase64', async (event, id?: string) => {
      try {
        const validatedId = this.validateScreenshotId(id);
        return await this.getBase64(validatedId);
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:getBase64:', error);
        throw this.createIPError('Invalid screenshot ID', error);
      }
    });

    ipcMain.handle('screenshot:getConfig', async () => {
      try {
        return await this.getConfig();
      } catch (error) {
        this.logger.error('IPC failed for screenshot:getConfig:', error);
        throw this.createIPError('Failed to get config', error);
      }
    });

    // Write operations with validation
    ipcMain.handle('screenshot:delete', async (event, id?: string) => {
      try {
        const validatedId = this.validateScreenshotId(id);
        return await this.deleteScreenshot(validatedId);
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:delete:', error);
        throw this.createIPError('Invalid screenshot ID', error);
      }
    });

    ipcMain.handle('screenshot:clear', async (event, type?: 'problem' | 'debug') => {
      try {
        const validatedType = type ? this.validateScreenshotType(type) : undefined;
        return await this.clearQueue(validatedType);
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:clear:', error);
        throw this.createIPError('Invalid clear parameters', error);
      }
    });

    ipcMain.handle('screenshot:process', async (event, id?: string) => {
      try {
        const validatedId = this.validateScreenshotId(id);
        return await this.processScreenshot(validatedId);
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:process:', error);
        throw this.createIPError('Invalid screenshot ID', error);
      }
    });

    ipcMain.handle('screenshot:setConfig', async (event, config?: Partial<ScreenshotConfig>) => {
      try {
        const validatedConfig = this.validateConfig(config);
        return await this.setConfig(validatedConfig);
      } catch (error) {
        this.logger.error('IPC validation failed for screenshot:setConfig:', error);
        throw this.createIPError('Invalid configuration', error);
      }
    });

    // Register cancellation and status handlers
    this.registerCancellationHandlers();
  }

  private registerGlobalShortcut(): void {
    if (this.config.hotkey) {
      const ret = globalShortcut.register(this.config.hotkey, () => {
        this.captureScreenshot('problem').catch(err => {
          this.logger.error('Failed to capture screenshot via hotkey:', err);
        });
      });
      
      if (!ret) {
        this.logger.error(`Failed to register screenshot hotkey: ${this.config.hotkey}`);
      } else {
        this.logger.info(`Registered screenshot hotkey: ${this.config.hotkey}`);
      }
    }
  }

  private registerPluginMethods(): void {
    this.bus.on('screenshot:capture', (data: { type?: 'problem' | 'debug'; mode?: CaptureMode }) =>
      this.captureScreenshot(data.type || 'problem', data.mode)
    );
    this.bus.on('screenshot:captureFull', (data: { type?: 'problem' | 'debug' }) =>
      this.captureScreenshot(data.type || 'problem', 'full')
    );
    this.bus.on('screenshot:captureWindow', (data: { type?: 'problem' | 'debug' }) =>
      this.captureScreenshot(data.type || 'problem', 'window')
    );
    this.bus.on('screenshot:captureRegion', (data: { type?: 'problem' | 'debug' }) =>
      this.captureScreenshot(data.type || 'problem', 'region')
    );
    this.bus.on('screenshot:delete', (data: { id: string }) => this.deleteScreenshot(data.id));
    this.bus.on('screenshot:clear', (data: { type?: 'problem' | 'debug' }) =>
      this.clearQueue(data.type)
    );
    this.bus.on('screenshot:process', (data: { id: string }) => this.processScreenshot(data.id));
  }

  private setupOverlayListeners(): void {
    // Listen for external overlay state changes
    this.bus.on('overlay:hidden', () => {
      this.isOverlayHidden = true;
      if (this.overlayHidePromise) {
        this.overlayHidePromise = null;
      }
    });

    this.bus.on('overlay:shown', () => {
      this.isOverlayHidden = false;
    });
  }

  async captureScreenshot(type: 'problem' | 'debug' = 'problem', mode?: CaptureMode, cancellationToken?: CancellationToken): Promise<ScreenshotItem> {
    // Cancel any existing operation
    if (this.activeCancellationToken) {
      this.activeCancellationToken.cancel();
      this.activeCancellationToken = null;
    }

    // Create new cancellation token if not provided
    const localCancellationToken = cancellationToken || new ScreenshotCancellationToken();
    this.activeCancellationToken = localCancellationToken;

    try {
      // Prevent concurrent captures
      if (this.pendingCapture) {
        throw new PluginError('Capture already in progress', this.name);
      }

      this.pendingCapture = true;
      this.currentOperationName = `captureScreenshot(${type}, ${mode || this.config.defaultCaptureMode})`;
      this.operationStartTime = Date.now();

      const captureMode = mode || this.config.defaultCaptureMode;
      this.logger.info(`Capturing ${type} screenshot (${captureMode} mode)`);

      // Calculate composite timeout based on capture mode
      const baseTimeout = this.config.timeouts.baseOperation;
      const operationCount = captureMode === 'region' ? 3 : 1; // Region selection adds operations
      const timeoutMs = createCompositeTimeout(baseTimeout, operationCount);

      return await withTimeout(
        this.performCapture(type, captureMode, localCancellationToken),
        timeoutMs,
        `captureScreenshot(${captureMode})`,
        localCancellationToken
      );

    } finally {
      this.pendingCapture = false;
      this.activeCancellationToken = null;
      this.currentOperationName = null;
      this.operationStartTime = null;
      this.cleanupOperationTimeouts();
    }
  }

  private async performCapture(type: 'problem' | 'debug', captureMode: CaptureMode, cancellationToken: CancellationToken): Promise<ScreenshotItem> {
    cancellationToken.throwIfCancelled();

    try {
      // Hide overlay if configured (race-free)
      if (this.config.autoHideOverlay) {
        await this.hideOverlayRaceFree(cancellationToken);
      }

      cancellationToken.throwIfCancelled();

      // Ensure overlay is hidden before capture
      await new Promise(resolve => setTimeout(resolve, this.config.captureDelay));
      cancellationToken.throwIfCancelled();

      let screenshot: Buffer;
      let captureRegion: Region | undefined;
      let windowInfo: WindowInfo | undefined;

      switch (captureMode) {
        case 'full':
          screenshot = await this.captureFullScreen(cancellationToken);
          break;
        case 'window':
          const windowCaptureResult = await this.captureActiveWindow(cancellationToken);
          screenshot = windowCaptureResult.screenshot;
          windowInfo = windowCaptureResult.windowInfo;
          break;
        case 'region':
          const regionCaptureResult = await this.captureRegion(cancellationToken);
          screenshot = regionCaptureResult.screenshot;
          captureRegion = regionCaptureResult.region;
          break;
        default:
          throw new Error(`Unsupported capture mode: ${captureMode}`);
      }

      cancellationToken.throwIfCancelled();

      // Generate filename and path
      const id = uuidv4();
      const timestamp = Date.now();
      const filename = `screenshot_${type}_${captureMode}_${timestamp}.${this.config.format}`;
      const path = join(this.screenshotDir, filename);

      // Save screenshot
      writeFileSync(path, screenshot);

      // Convert to base64
      const base64 = screenshot.toString('base64');
      const size = screenshot.length;

      cancellationToken.throwIfCancelled();

      // Generate preview if enabled
      let preview;
      if (this.config.enablePreviews) {
        preview = await this.generatePreview(base64, cancellationToken);
      }

      // Create screenshot item
      const screenshotItem: ScreenshotItem = {
        id,
        filename,
        path,
        base64,
        timestamp,
        type,
        size,
        captureMode,
        region: captureRegion,
        windowInfo,
        preview
      };

      cancellationToken.throwIfCancelled();

      // Attach to artifact if possible
      let artifactId;
      try {
        artifactId = await this.attachToArtifact(screenshotItem, cancellationToken);
        if (artifactId) {
          screenshotItem.artifactId = artifactId;
        }
      } catch (error) {
        this.logger.warn('Failed to attach screenshot to artifact:', error);
      }

      // Add to appropriate queue
      const queue = type === 'problem' ? this.problemQueue : this.debugQueue;
      queue.push(screenshotItem);

      // Enforce queue limit
      if (queue.length > this.config.maxQueues) {
        const removed = queue.shift();
        if (removed) {
          this.deleteScreenshotFile(removed.path);
        }
      }

      this.logger.info(`Captured ${type} screenshot (${captureMode} mode): ${filename}`);
      this.bus.emit('screenshot:captured', screenshotItem);

      // Show overlay again after capture (race-free)
      if (this.config.autoHideOverlay) {
        setTimeout(() => {
          this.showOverlayRaceFree(cancellationToken);
        }, 500);
      }

      return screenshotItem;

    } catch (error) {
      this.logger.error('Failed to capture screenshot:', error);
      // Ensure overlay is restored on error
      if (this.config.autoHideOverlay) {
        this.showOverlayRaceFree(cancellationToken);
      }
      throw new PluginError(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`, this.name);
    }
  }

  private async captureFullScreen(cancellationToken?: CancellationToken): Promise<Buffer> {
    return await withTimeout(
      this.performFullScreenCapture(cancellationToken),
      this.config.timeouts.fullScreenCapture,
      'captureFullScreen',
      cancellationToken
    );
  }

  private async performFullScreenCapture(cancellationToken?: CancellationToken): Promise<Buffer> {
    try {
      cancellationToken?.throwIfCancelled();

      // Use Electron's desktopCapturer for full screen capture
      const { desktopCapturer } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;

      cancellationToken?.throwIfCancelled();

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      });

      cancellationToken?.throwIfCancelled();

      const primarySource = sources.find(source => source.name === 'Entire Screen') || sources[0];

      if (!primarySource) {
        throw new Error('No screen source found');
      }

      return primarySource.thumbnail.toPNG();
    } catch (error) {
      this.logger.error('Failed to capture full screen:', error);
      throw new Error(`Full screen capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async captureActiveWindow(cancellationToken?: CancellationToken): Promise<{ screenshot: Buffer; windowInfo: WindowInfo }> {
    return await withTimeout(
      this.performActiveWindowCapture(cancellationToken),
      this.config.timeouts.windowCapture,
      'captureActiveWindow',
      cancellationToken
    );
  }

  private async performActiveWindowCapture(cancellationToken?: CancellationToken): Promise<{ screenshot: Buffer; windowInfo: WindowInfo }> {
    try {
      cancellationToken?.throwIfCancelled();

      // Use Electron's desktopCapturer for window capture
      const { desktopCapturer } = require('electron');

      cancellationToken?.throwIfCancelled();

      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 800, height: 600 }
      });

      cancellationToken?.throwIfCancelled();

      const activeSource = sources[0]; // Simplified - would need proper window detection

      if (!activeSource) {
        throw new Error('No window source found');
      }

      const screenshot = activeSource.thumbnail.toPNG();

      const windowInfo: WindowInfo = {
        id: Date.now(), // Simplified ID
        title: activeSource.name || 'Unknown Window',
        bounds: { x: 0, y: 0, width: 800, height: 600 }, // Simplified bounds
        ownerName: 'Unknown'
      };

      return { screenshot, windowInfo };
    } catch (error) {
      this.logger.error('Failed to capture active window:', error);
      throw new Error(`Window capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async captureRegion(cancellationToken?: CancellationToken): Promise<{ screenshot: Buffer; region: Region }> {
    return await withTimeout(
      this.performRegionCapture(cancellationToken),
      this.config.timeouts.regionCapture,
      'captureRegion',
      cancellationToken
    );
  }

  private async performRegionCapture(cancellationToken?: CancellationToken): Promise<{ screenshot: Buffer; region: Region }> {
    try {
      cancellationToken?.throwIfCancelled();

      // Hide overlay before region selection
      await this.hideOverlayRaceFree(cancellationToken);

      cancellationToken?.throwIfCancelled();

      // Emit event to trigger region selection UI
      await this.bus.emit('screenshot:regionSelectStart', {});

      cancellationToken?.throwIfCancelled();

      // Wait for region selection (simplified implementation)
      const region = await this.waitForRegionSelection(cancellationToken);

      cancellationToken?.throwIfCancelled();

      // Capture the selected region using full screen and then crop
      const fullScreen = await this.captureFullScreen(cancellationToken);
      const cropped = this.cropImage(fullScreen, region);

      // Emit completion event
      await this.bus.emit('screenshot:regionSelectEnd', { region });

      return { screenshot: cropped, region };
    } catch (error) {
      this.logger.error('Failed to capture region:', error);
      throw new Error(`Region capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async hideOverlayRaceFree(cancellationToken?: CancellationToken): Promise<void> {
    // If overlay is already hidden, wait for it to be shown again
    if (this.overlayHidePromise) {
      await this.overlayHidePromise;
    }

    // If overlay is not hidden, hide it
    if (!this.isOverlayHidden) {
      cancellationToken?.throwIfCancelled();

      this.isOverlayHidden = true;
      this.overlayHidePromise = this.bus.emit('overlay:hide', {}).then(() => {
        this.overlayHidePromise = null;
      });

      await this.overlayHidePromise;
    }
  }

  private async showOverlayRaceFree(cancellationToken?: CancellationToken): Promise<void> {
    // If overlay is hidden, show it
    if (this.isOverlayHidden) {
      cancellationToken?.throwIfCancelled();

      this.isOverlayHidden = false;
      await this.bus.emit('overlay:show', {});
    }
  }

  private async waitForRegionSelection(cancellationToken?: CancellationToken): Promise<Region> {
    return await withTimeout(
      new Promise((resolve, reject) => {
        cancellationToken?.onCancelled(() => {
          this.bus.off('screenshot:regionSelected', handleRegionSelected);
          reject(new PluginError('Region selection cancelled', 'screenshot-plugin'));
        });

        const handleRegionSelected = (region: Region) => {
          this.bus.off('screenshot:regionSelected', handleRegionSelected);
          resolve(region);
        };

        this.bus.on('screenshot:regionSelected', handleRegionSelected);
      }),
      this.config.timeouts.regionSelection,
      'waitForRegionSelection',
      cancellationToken
    );
  }

  private cropImage(imageBuffer: Buffer, region: Region): Buffer {
    // Simplified image cropping - in a real implementation, you'd use a library like sharp
    // For now, just return the original buffer
    return imageBuffer;
  }

  async getWindows(): Promise<WindowInfo[]> {
    try {
      // Simplified implementation using desktopCapturer
      const { desktopCapturer } = require('electron');

      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 100, height: 100 }
      });

      return sources.map(source => ({
        id: Date.now() + Math.random(),
        title: source.name || 'Unknown Window',
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        ownerName: 'Unknown'
      }));
    } catch (error) {
      this.logger.error('Failed to get windows:', error);
      return [];
    }
  }

  private async generatePreview(base64Image: string, cancellationToken?: CancellationToken): Promise<any> {
    return await withTimeout(
      this.performPreviewGeneration(base64Image, cancellationToken),
      this.config.timeouts.previewGeneration,
      'generatePreview',
      cancellationToken
    );
  }

  private async performPreviewGeneration(base64Image: string, cancellationToken?: CancellationToken): Promise<any> {
    try {
      cancellationToken?.throwIfCancelled();

      // Check cache first
      const cacheKey = this.generateCacheKey(base64Image);
      const cached = this.previewCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.config.previewCacheTTL) {
        return cached.preview;
      }

      // Generate preview (simplified implementation)
      // In a real implementation, you'd use an image processing library like sharp
      const preview = {
        base64: base64Image, // Simplified - would resize/compress in real implementation
        width: this.config.previewSize.width,
        height: this.config.previewSize.height,
        size: Math.floor(base64Image.length * 0.3), // Estimate 30% size reduction
        generatedAt: Date.now()
      };

      cancellationToken?.throwIfCancelled();

      // Cache the preview
      this.previewCache.set(cacheKey, {
        preview,
        timestamp: Date.now()
      });

      // Clean up cache if it exceeds maximum size
      this.cleanupPreviewCache();

      return preview;
    } catch (error) {
      this.logger.error('Failed to generate preview:', error);
      return null;
    }
  }

  private generateCacheKey(base64Image: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < base64Image.length; i++) {
      const char = base64Image.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private cleanupPreviewCache(): void {
    if (this.previewCache.size <= this.config.maxPreviewCacheSize) {
      return;
    }

    // Remove oldest entries
    const entries = Array.from(this.previewCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, this.previewCache.size - this.config.maxPreviewCacheSize);
    toRemove.forEach(([key]) => this.previewCache.delete(key));

    this.logger.info(`Cleaned up preview cache, removed ${toRemove.length} entries`);
  }

  private async attachToArtifact(screenshot: ScreenshotItem, cancellationToken?: CancellationToken): Promise<string | null> {
    return await withTimeout(
      this.performArtifactAttachment(screenshot, cancellationToken),
      this.config.timeouts.artifactAttachment,
      'attachToArtifact',
      cancellationToken
    );
  }

  private async performArtifactAttachment(screenshot: ScreenshotItem, cancellationToken?: CancellationToken): Promise<string | null> {
    try {
      cancellationToken?.throwIfCancelled();

      // Try to attach screenshot to an existing job artifact
      const artifactData = {
        jobId: 0, // Would be populated from context
        type: 'screenshot' as const,
        name: screenshot.filename,
        description: `Screenshot captured in ${screenshot.captureMode} mode`,
        mimeType: `image/${this.config.format}`,
        metadata: {
          captureMode: screenshot.captureMode,
          timestamp: screenshot.timestamp,
          type: screenshot.type,
          size: screenshot.size,
          region: screenshot.region,
          windowInfo: screenshot.windowInfo
        },
        fileData: Buffer.from(screenshot.base64, 'base64')
      };

      cancellationToken?.throwIfCancelled();

      // Emit event to create artifact
      const result = await this.bus.send({
        id: uuidv4(),
        type: 'request',
        plugin: 'database-service',
        method: 'createArtifact',
        payload: artifactData,
        timestamp: Date.now()
      });

      if (result.success) {
        return result.data.id;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to attach screenshot to artifact:', error);
      return null;
    }
  }

  // Validation methods
  private validateScreenshotType(type?: any): 'problem' | 'debug' {
    if (!type || typeof type !== 'string') {
      return 'problem'; // Default value
    }

    const validTypes = ['problem', 'debug'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid screenshot type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    }

    return type;
  }

  private validateCaptureMode(mode?: any): CaptureMode {
    if (!mode || typeof mode !== 'string') {
      return this.config.defaultCaptureMode; // Default from config
    }

    const validModes = ['full', 'window', 'region'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid capture mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }

    return mode as CaptureMode;
  }

  private validateScreenshotId(id?: any): string {
    if (!id || typeof id !== 'string') {
      throw new Error('Screenshot ID is required and must be a string');
    }

    if (id.length === 0 || id.length > 255) {
      throw new Error('Screenshot ID must be between 1 and 255 characters');
    }

    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error('Screenshot ID must be a valid UUID');
    }

    return id;
  }

  private validateConfig(config?: any): Partial<ScreenshotConfig> {
    if (!config || typeof config !== 'object') {
      return {}; // Empty config is valid
    }

    const validatedConfig: Partial<ScreenshotConfig> = {};

    // Validate numeric fields
    if (config.maxQueues !== undefined) {
      if (typeof config.maxQueues !== 'number' || config.maxQueues < 1 || config.maxQueues > 1000) {
        throw new Error('maxQueues must be a number between 1 and 1000');
      }
      validatedConfig.maxQueues = config.maxQueues;
    }

    if (config.quality !== undefined) {
      if (typeof config.quality !== 'number' || config.quality < 1 || config.quality > 100) {
        throw new Error('quality must be a number between 1 and 100');
      }
      validatedConfig.quality = config.quality;
    }

    if (config.captureDelay !== undefined) {
      if (typeof config.captureDelay !== 'number' || config.captureDelay < 0 || config.captureDelay > 10000) {
        throw new Error('captureDelay must be a number between 0 and 10000');
      }
      validatedConfig.captureDelay = config.captureDelay;
    }

    // Validate boolean fields
    if (config.autoHideOverlay !== undefined) {
      if (typeof config.autoHideOverlay !== 'boolean') {
        throw new Error('autoHideOverlay must be a boolean');
      }
      validatedConfig.autoHideOverlay = config.autoHideOverlay;
    }

    if (config.enablePreviews !== undefined) {
      if (typeof config.enablePreviews !== 'boolean') {
        throw new Error('enablePreviews must be a boolean');
      }
      validatedConfig.enablePreviews = config.enablePreviews;
    }

    // Validate string fields
    if (config.hotkey !== undefined) {
      if (typeof config.hotkey !== 'string' || config.hotkey.length === 0) {
        throw new Error('hotkey must be a non-empty string');
      }
      validatedConfig.hotkey = config.hotkey;
    }

    if (config.format !== undefined) {
      const validFormats = ['png', 'jpg'];
      if (!validFormats.includes(config.format)) {
        throw new Error(`format must be one of: ${validFormats.join(', ')}`);
      }
      validatedConfig.format = config.format;
    }

    if (config.defaultCaptureMode !== undefined) {
      const validModes = ['full', 'window', 'region'];
      if (!validModes.includes(config.defaultCaptureMode)) {
        throw new Error(`defaultCaptureMode must be one of: ${validModes.join(', ')}`);
      }
      validatedConfig.defaultCaptureMode = config.defaultCaptureMode;
    }

    return validatedConfig;
  }

  private createIPError(message: string, originalError?: any): PluginError {
    const error = new PluginError(message, this.name);
    if (originalError) {
      error.stack = originalError.stack;
    }
    return error;
  }

  getQueues(): { problem: ScreenshotItem[]; debug: ScreenshotItem[] } {
    return {
      problem: [...this.problemQueue],
      debug: [...this.debugQueue]
    };
  }

  async deleteScreenshot(id: string): Promise<boolean> {
    try {
      // Find in problem queue
      const problemIndex = this.problemQueue.findIndex(item => item.id === id);
      if (problemIndex !== -1) {
        const item = this.problemQueue.splice(problemIndex, 1)[0];
        this.deleteScreenshotFile(item.path);
        this.bus.emit('screenshot:deleted', item);
        return true;
      }
      
      // Find in debug queue
      const debugIndex = this.debugQueue.findIndex(item => item.id === id);
      if (debugIndex !== -1) {
        const item = this.debugQueue.splice(debugIndex, 1)[0];
        this.deleteScreenshotFile(item.path);
        this.bus.emit('screenshot:deleted', item);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Failed to delete screenshot:', error);
      return false;
    }
  }

  async clearQueue(type?: 'problem' | 'debug'): Promise<void> {
    try {
      if (type === 'problem' || !type) {
        const cleared = this.problemQueue.splice(0);
        cleared.forEach(item => this.deleteScreenshotFile(item.path));
        this.bus.emit('screenshot:queueCleared', { type: 'problem', count: cleared.length });
      }
      
      if (type === 'debug' || !type) {
        const cleared = this.debugQueue.splice(0);
        cleared.forEach(item => this.deleteScreenshotFile(item.path));
        this.bus.emit('screenshot:queueCleared', { type: 'debug', count: cleared.length });
      }
    } catch (error) {
      this.logger.error('Failed to clear queue:', error);
    }
  }

  async getBase64(id: string): Promise<string | null> {
    // Find in problem queue
    const problemItem = this.problemQueue.find(item => item.id === id);
    if (problemItem) {
      return problemItem.base64;
    }
    
    // Find in debug queue
    const debugItem = this.debugQueue.find(item => item.id === id);
    if (debugItem) {
      return debugItem.base64;
    }
    
    return null;
  }

  async processScreenshot(id: string, cancellationToken?: CancellationToken): Promise<void> {
    return await withTimeout(
      this.performScreenshotProcessing(id, cancellationToken),
      this.config.timeouts.screenshotProcessing,
      'processScreenshot',
      cancellationToken
    );
  }

  private async performScreenshotProcessing(id: string, cancellationToken?: CancellationToken): Promise<void> {
    try {
      cancellationToken?.throwIfCancelled();

      const screenshot = this.problemQueue.find(item => item.id === id);
      if (!screenshot) {
        throw new Error('Screenshot not found');
      }

      this.logger.info(`Processing screenshot: ${screenshot.filename}`);

      // Emit processing event
      this.bus.emit('screenshot:processing', screenshot);

      cancellationToken?.throwIfCancelled();

      // Send to vision service for analysis
      const visionResult = await this.bus.send({
        id: uuidv4(),
        type: 'request',
        plugin: 'vision-service',
        method: 'analyzeImage',
        payload: {
          imageData: screenshot.base64,
          analysisType: 'screenshot'
        },
        timestamp: Date.now()
      });

      if (visionResult.success) {
        this.bus.emit('screenshot:processed', {
          screenshot,
          analysis: visionResult.data
        });
      } else {
        throw new Error(visionResult.error || 'Vision analysis failed');
      }

    } catch (error) {
      this.logger.error('Failed to process screenshot:', error);
      throw new PluginError(`Screenshot processing failed: ${error.message}`, this.name);
    }
  }

  private deleteScreenshotFile(path: string): void {
    try {
      if (existsSync(path)) {
        unlinkSync(path);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete screenshot file: ${path}`, error);
    }
  }

  private async loadExistingScreenshots(): Promise<void> {
    try {
      // This would load existing screenshots from disk
      // For now, we'll start with empty queues
      this.logger.info('Screenshot queues initialized as empty');
    } catch (error) {
      this.logger.error('Failed to load existing screenshots:', error);
    }
  }

  getConfig(): ScreenshotConfig {
    return { ...this.config };
  }

  async setConfig(config: Partial<ScreenshotConfig>): Promise<void> {
    const oldHotkey = this.config.hotkey;
    this.config = { ...this.config, ...config };
    
    // Update hotkey registration if changed
    if (config.hotkey && config.hotkey !== oldHotkey) {
      globalShortcut.unregister(oldHotkey);
      this.registerGlobalShortcut();
    }
    
    this.logger.info('Screenshot configuration updated');
    this.bus.emit('screenshot:configChanged', this.config);
  }

  async destroy(): Promise<void> {
    this.logger.info('Destroying ScreenshotPlugin');

    // Unregister global shortcut
    if (this.config.hotkey) {
      globalShortcut.unregister(this.config.hotkey);
    }

    // Clear all screenshots
    await this.clearQueue();

    // Restore overlay if hidden
    if (this.isOverlayHidden) {
      await this.showOverlayRaceFree();
    }

    // Remove IPC handlers
    ipcMain.removeHandler('screenshot:capture');
    ipcMain.removeHandler('screenshot:captureFull');
    ipcMain.removeHandler('screenshot:captureWindow');
    ipcMain.removeHandler('screenshot:captureRegion');
    ipcMain.removeHandler('screenshot:getWindows');
    ipcMain.removeHandler('screenshot:getQueues');
    ipcMain.removeHandler('screenshot:delete');
    ipcMain.removeHandler('screenshot:clear');
    ipcMain.removeHandler('screenshot:getBase64');
    ipcMain.removeHandler('screenshot:process');
    ipcMain.removeHandler('screenshot:getConfig');
    ipcMain.removeHandler('screenshot:setConfig');
    ipcMain.removeHandler('screenshot:cancel');
    ipcMain.removeHandler('screenshot:getStatus');

    // Cancel any active operation
    if (this.activeCancellationToken) {
      this.activeCancellationToken.cancel();
    }

    // Clean up timeouts
    this.cleanupOperationTimeouts();

    this.logger.info('ScreenshotPlugin destroyed');
  }
}