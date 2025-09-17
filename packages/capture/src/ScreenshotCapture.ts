import { screen, BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

import {
  CaptureOptions,
  CaptureResult,
  PreviewOptions,
  PreviewResult,
  CaptureError,
  DisplayInfo,
  WindowInfo
} from './types/CaptureTypes';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export class ScreenshotCapture {
  private overlayWindow: BrowserWindow | null = null;
  private isCapturing = false;
  private captureDir: string;
  private previewCache = new Map<string, PreviewResult>();

  constructor() {
    this.captureDir = path.join(os.homedir(), '.atlas', 'captures');
    this.ensureDirectoryExists();
    this.setupIPC();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await mkdir(this.captureDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  private setupIPC(): void {
    ipcMain.handle('capture-get-displays', async () => {
      return await this.getDisplays();
    });

    ipcMain.handle('capture-get-windows', async () => {
      return await this.getWindows();
    });

    ipcMain.handle('capture-start-region', async (event, options?: Partial<CaptureOptions>) => {
      return await this.startRegionCapture(options);
    });

    ipcMain.handle('capture-window', async (event, windowId: string, options?: Partial<CaptureOptions>) => {
      return await this.captureWindow(windowId, options);
    });

    ipcMain.handle('capture-full', async (event, options?: Partial<CaptureOptions>) => {
      return await this.captureFullScreen(options);
    });

    ipcMain.handle('capture-cancel', async () => {
      return await this.cancelCapture();
    });

    ipcMain.handle('capture-generate-preview', async (event, filePath: string, options?: PreviewOptions) => {
      return await this.generatePreview(filePath, options);
    });

    ipcMain.handle('capture-get-recent', async (event, limit: number = 20) => {
      return await this.getRecentCaptures(limit);
    });

    ipcMain.handle('capture-delete', async (event, captureId: string) => {
      return await this.deleteCapture(captureId);
    });
  }

  async getDisplays(): Promise<DisplayInfo[]> {
    const displays = screen.getAllDisplays();
    return displays.map(display => ({
      id: `display_${display.id}`,
      name: display.label || `Display ${display.id}`,
      bounds: display.bounds,
      scaleFactor: display.scaleFactor,
      isPrimary: display.id === screen.getPrimaryDisplay().id
    }));
  }

  async getWindows(): Promise<WindowInfo[]> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 150, height: 150 }
      });

      return sources
        .filter(source => source.id.startsWith('window:'))
        .map(source => ({
          id: source.id,
          title: source.name,
          bounds: {
            x: 0,
            y: 0,
            width: source.thumbnail.getSize().width,
            height: source.thumbnail.getSize().height
          },
          isVisible: true,
          isMinimized: false,
          ownerName: source.ownerName
        }));
    } catch (error) {
      console.error('Failed to get windows:', error);
      return [];
    }
  }

  async startRegionCapture(options?: Partial<CaptureOptions>): Promise<{ success: boolean; error?: CaptureError }> {
    if (this.isCapturing) {
      return { success: false, error: { code: 'CAPTURE_IN_PROGRESS', message: 'Capture already in progress', timestamp: new Date() } };
    }

    try {
      this.isCapturing = true;
      await this.showOverlay(options);
      return { success: true };
    } catch (error) {
      this.isCapturing = false;
      return { success: false, error: { code: 'OVERLAY_FAILED', message: error.message, timestamp: new Date() } };
    }
  }

  async captureWindow(windowId: string, options?: Partial<CaptureOptions>): Promise<CaptureResult | CaptureError> {
    try {
      this.isCapturing = true;

      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 0, height: 0 } // Get full size
      });

      const source = sources.find(s => s.id === windowId);
      if (!source) {
        const error: CaptureError = { code: 'WINDOW_NOT_FOUND', message: 'Window not found', timestamp: new Date() };
        this.isCapturing = false;
        return error;
      }

      // Get full size screenshot
      const fullSizeSource = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 9999, height: 9999 }
      });

      const fullSource = fullSizeSource.find(s => s.id === windowId);
      if (!fullSource) {
        const error: CaptureError = { code: 'WINDOW_CAPTURE_FAILED', message: 'Failed to capture window', timestamp: new Date() };
        this.isCapturing = false;
        return error;
      }

      const result = await this.saveCapture(fullSource.thumbnail.toPNG(), {
        type: 'window',
        format: options?.format || 'png',
        quality: options?.quality || 90,
        metadata: {
          deviceScaleFactor: screen.getPrimaryDisplay().scaleFactor,
          windowTitle: source.name,
          captureDuration: 0,
          cursorIncluded: options?.includeCursor || false
        }
      });

      this.isCapturing = false;
      return result;

    } catch (error) {
      this.isCapturing = false;
      return { code: 'WINDOW_CAPTURE_ERROR', message: error.message, timestamp: new Date() };
    }
  }

  async captureFullScreen(options?: Partial<CaptureOptions>): Promise<CaptureResult | CaptureError> {
    try {
      this.isCapturing = true;

      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.size;

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width, height }
      });

      const screenSource = sources.find(s => s.id.startsWith('screen:') && s.id.includes(primaryDisplay.id.toString()));
      if (!screenSource) {
        const error: CaptureError = { code: 'SCREEN_NOT_FOUND', message: 'Primary screen not found', timestamp: new Date() };
        this.isCapturing = false;
        return error;
      }

      const result = await this.saveCapture(screenSource.thumbnail.toPNG(), {
        type: 'full',
        format: options?.format || 'png',
        quality: options?.quality || 90,
        metadata: {
          deviceScaleFactor: primaryDisplay.scaleFactor,
          captureDuration: 0,
          cursorIncluded: options?.includeCursor || false
        }
      });

      this.isCapturing = false;
      return result;

    } catch (error) {
      this.isCapturing = false;
      return { code: 'SCREEN_CAPTURE_ERROR', message: error.message, timestamp: new Date() };
    }
  }

  async cancelCapture(): Promise<boolean> {
    if (this.overlayWindow) {
      this.overlayWindow.close();
      this.overlayWindow = null;
    }
    this.isCapturing = false;
    return true;
  }

  private async showOverlay(options?: Partial<CaptureOptions>): Promise<void> {
    const { BrowserWindow } = require('electron');

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;

    this.overlayWindow = new BrowserWindow({
      x: primaryDisplay.bounds.x,
      y: primaryDisplay.bounds.y,
      width,
      height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      fullscreenable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    });

    // Load overlay HTML
    this.overlayWindow.loadURL(`file://${path.join(__dirname, 'overlay.html')}`);

    // Handle region selection
    this.overlayWindow.webContents.on('ipc-message', async (event, channel, data) => {
      if (channel === 'region-selected') {
        const { x, y, width, height } = data;
        await this.captureRegion({ x, y, width, height }, options);
      } else if (channel === 'region-cancelled') {
        await this.cancelCapture();
      }
    });

    // Show overlay
    this.overlayWindow.show();
    this.overlayWindow.focus();
  }

  private async captureRegion(region: { x: number; y: number; width: number; height: number }, options?: Partial<CaptureOptions>): Promise<CaptureResult | CaptureError> {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const scaleFactor = primaryDisplay.scaleFactor;

      // Adjust coordinates for scale factor
      const scaledRegion = {
        x: region.x * scaleFactor,
        y: region.y * scaleFactor,
        width: region.width * scaleFactor,
        height: region.height * scaleFactor
      };

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: primaryDisplay.size.width * scaleFactor,
          height: primaryDisplay.size.height * scaleFactor
        }
      });

      const screenSource = sources.find(s => s.id.startsWith('screen:') && s.id.includes(primaryDisplay.id.toString()));
      if (!screenSource) {
        const error: CaptureError = { code: 'SCREEN_NOT_FOUND', message: 'Primary screen not found', timestamp: new Date() };
        return error;
      }

      // Crop the screenshot to the selected region
      const fullImage = screenSource.thumbnail;
      const croppedImage = fullImage.crop({
        x: scaledRegion.x,
        y: scaledRegion.y,
        width: scaledRegion.width,
        height: scaledRegion.height
      });

      const result = await this.saveCapture(croppedImage.toPNG(), {
        type: 'region',
        region,
        format: options?.format || 'png',
        quality: options?.quality || 90,
        metadata: {
          deviceScaleFactor: scaleFactor,
          captureDuration: 0,
          cursorIncluded: options?.includeCursor || false
        }
      });

      // Hide overlay
      if (this.overlayWindow) {
        this.overlayWindow.close();
        this.overlayWindow = null;
      }

      return result;

    } catch (error) {
      return { code: 'REGION_CAPTURE_ERROR', message: error.message, timestamp: new Date() };
    }
  }

  private async saveCapture(imageData: Buffer, options: {
    type: 'region' | 'window' | 'full';
    region?: { x: number; y: number; width: number; height: number };
    format: string;
    quality: number;
    metadata: any;
  }): Promise<CaptureResult> {
    const id = uuidv4();
    const timestamp = new Date();
    const fileName = `${timestamp.toISOString().replace(/[:.]/g, '-')}_${id}.${options.format}`;
    const filePath = path.join(this.captureDir, fileName);

    await writeFile(filePath, imageData);

    const stats = await fs.promises.stat(filePath);

    return {
      id,
      timestamp,
      type: options.type,
      filePath,
      fileSize: stats.size,
      format: options.format,
      width: 0, // Will be set based on image data
      height: 0,
      metadata: options.metadata
    };
  }

  async generatePreview(filePath: string, options?: PreviewOptions): Promise<PreviewResult | CaptureError> {
    try {
      // Check cache first
      const cacheKey = `${filePath}_${JSON.stringify(options)}`;
      const cached = this.previewCache.get(cacheKey);
      if (cached && options?.caching !== false) {
        return cached;
      }

      // For now, return a simple preview (in real implementation, use sharp or similar)
      const imageData = await fs.promises.readFile(filePath);
      const base64 = imageData.toString('base64');

      const preview: PreviewResult = {
        id: uuidv4(),
        originalId: path.basename(filePath, path.extname(filePath)),
        data: `data:image/${options?.format || 'png'};base64,${base64}`,
        format: options?.format || 'png',
        width: 200, // Placeholder
        height: 150, // Placeholder
        size: imageData.length,
        cached: false
      };

      // Cache the result
      if (options?.caching !== false) {
        this.previewCache.set(cacheKey, preview);
      }

      return preview;

    } catch (error) {
      return { code: 'PREVIEW_GENERATION_ERROR', message: error.message, timestamp: new Date() };
    }
  }

  async getRecentCaptures(limit: number = 20): Promise<CaptureResult[]> {
    try {
      const files = await fs.promises.readdir(this.captureDir);
      const captureFiles = files
        .filter(file => /\.(png|jpg|jpeg|webp)$/i.test(file))
        .map(file => path.join(this.captureDir, file));

      const captures: CaptureResult[] = [];

      for (const filePath of captureFiles.slice(0, limit)) {
        try {
          const stats = await fs.promises.stat(filePath);
          const fileName = path.basename(filePath, path.extname(filePath));

          captures.push({
            id: fileName,
            timestamp: stats.birthtime,
            type: 'full', // Default type
            filePath,
            fileSize: stats.size,
            format: path.extname(filePath).substring(1),
            width: 0,
            height: 0,
            metadata: {}
          });
        } catch (error) {
          // Skip files that can't be read
        }
      }

      return captures.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    } catch (error) {
      console.error('Failed to get recent captures:', error);
      return [];
    }
  }

  async deleteCapture(captureId: string): Promise<boolean> {
    try {
      // Find the file by ID (filename without extension)
      const files = await fs.promises.readdir(this.captureDir);
      const matchingFile = files.find(file => file.startsWith(captureId));

      if (matchingFile) {
        const filePath = path.join(this.captureDir, matchingFile);
        await fs.promises.unlink(filePath);

        // Clear from preview cache
        for (const [key, preview] of this.previewCache.entries()) {
          if (preview.originalId === captureId) {
            this.previewCache.delete(key);
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to delete capture:', error);
      return false;
    }
  }

  isOverlayVisible(): boolean {
    return this.overlayWindow !== null && this.overlayWindow.isVisible();
  }

  getCaptureDirectory(): string {
    return this.captureDir;
  }

  clearPreviewCache(): void {
    this.previewCache.clear();
  }

  getCacheStats(): {
    size: number;
    entries: number;
    memoryUsage: string;
  } {
    let totalSize = 0;
    for (const preview of this.previewCache.values()) {
      totalSize += preview.size;
    }

    return {
      size: this.previewCache.size,
      entries: this.previewCache.size,
      memoryUsage: `${(totalSize / 1024 / 1024).toFixed(2)} MB`
    };
  }
}