import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';

import {
  CaptureOptions,
  CaptureResult,
  CaptureError
} from './types/CaptureTypes';

export interface OverlayConfig {
  opacity: number;
  borderColor: string;
  backgroundColor: string;
  borderWidth: number;
  showInstructions: boolean;
  showDimensions: boolean;
  minSelectionSize: number;
  escapeCancels: boolean;
}

export class OverlayManager {
  private overlayWindow: BrowserWindow | null = null;
  private isActive = false;
  private config: Required<OverlayConfig>;
  private resolvePromise: ((result: CaptureResult | CaptureError) => void) | null = null;
  private rejectPromise: ((error: Error) => void) | null = null;

  constructor(config: Partial<OverlayConfig> = {}) {
    this.config = {
      opacity: 0.3,
      borderColor: '#007AFF',
      backgroundColor: 'rgba(0, 122, 255, 0.1)',
      borderWidth: 2,
      showInstructions: true,
      showDimensions: true,
      minSelectionSize: 10,
      escapeCancels: true,
      ...config
    };

    this.setupIPC();
  }

  private setupIPC(): void {
    ipcMain.handle('overlay-get-config', () => {
      return this.config;
    });

    ipcMain.handle('overlay-region-selected', async (event, region: any) => {
      await this.handleRegionSelected(region);
    });

    ipcMain.handle('overlay-region-cancelled', async () => {
      await this.handleRegionCancelled();
    });
  }

  async showOverlay(options?: Partial<CaptureOptions>): Promise<CaptureResult | CaptureError> {
    if (this.isActive) {
      return { code: 'OVERLAY_ACTIVE', message: 'Overlay already active', timestamp: new Date() };
    }

    try {
      this.isActive = true;

      // Create promise for result
      const resultPromise = new Promise<CaptureResult | CaptureError>((resolve, reject) => {
        this.resolvePromise = resolve;
        this.rejectPromise = reject;
      });

      // Create overlay window
      await this.createOverlayWindow();

      // Set timeout for capture
      const timeout = setTimeout(() => {
        if (this.isActive) {
          this.cancelCapture('Capture timeout');
        }
      }, 30000); // 30 second timeout

      // Wait for result
      const result = await resultPromise;
      clearTimeout(timeout);

      return result;

    } catch (error) {
      this.isActive = false;
      return { code: 'OVERLAY_ERROR', message: error.message, timestamp: new Date() };
    }
  }

  private async createOverlayWindow(): Promise<void> {
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
      focusable: true,
      hasShadow: false,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false
      }
    });

    // Load overlay HTML
    const overlayPath = path.join(__dirname, 'overlay.html');
    this.overlayWindow.loadURL(`file://${overlayPath}`);

    // Set up window state handlers
    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
      if (this.isActive) {
        this.cancelCapture('Window closed');
      }
    });

    this.overlayWindow.on('blur', () => {
      // Don't cancel on blur immediately - user might be interacting with other elements
      setTimeout(() => {
        if (this.overlayWindow && !this.overlayWindow.isFocused() && this.isActive) {
          this.cancelCapture('Window lost focus');
        }
      }, 100);
    });

    // Show overlay
    this.overlayWindow.show();
    this.overlayWindow.focus();

    // Prevent the overlay from being blocked by other windows
    this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  }

  private async handleRegionSelected(region: {
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<void> {
    if (!this.isActive || !this.resolvePromise) {
      return;
    }

    try {
      // Validate selection
      if (region.width < this.config.minSelectionSize || region.height < this.config.minSelectionSize) {
        this.cancelCapture(`Selection too small (minimum ${this.config.minSelectionSize}px)`);
        return;
      }

      // Hide overlay
      await this.hideOverlay();

      // Create capture result
      const result: CaptureResult = {
        id: `region_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        timestamp: new Date(),
        type: 'region',
        filePath: '', // Will be filled by capture service
        fileSize: 0,
        format: 'png',
        width: region.width,
        height: region.height,
        metadata: {
          deviceScaleFactor: screen.getPrimaryDisplay().scaleFactor,
          region,
          captureDuration: 0,
          cursorIncluded: false
        }
      };

      this.isActive = false;
      this.resolvePromise(result);

    } catch (error) {
      this.cancelCapture(`Region selection failed: ${error.message}`);
    }
  }

  private async handleRegionCancelled(): Promise<void> {
    this.cancelCapture('User cancelled');
  }

  private cancelCapture(reason: string): void {
    if (!this.isActive) {
      return;
    }

    this.hideOverlay();

    const error: CaptureError = {
      code: 'CAPTURE_CANCELLED',
      message: reason,
      timestamp: new Date()
    };

    this.isActive = false;

    if (this.resolvePromise) {
      this.resolvePromise(error);
    }
  }

  private async hideOverlay(): Promise<void> {
    if (this.overlayWindow) {
      try {
        this.overlayWindow.close();
      } catch (error) {
        console.warn('Failed to close overlay window:', error);
      }
      this.overlayWindow = null;
    }
  }

  isActiveOverlay(): boolean {
    return this.isActive && this.overlayWindow !== null;
  }

  getOverlayWindow(): BrowserWindow | null {
    return this.overlayWindow;
  }

  getConfig(): OverlayConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<OverlayConfig>): void {
    this.config = { ...this.config, ...config };

    // Send updated config to overlay if it's active
    if (this.overlayWindow && this.overlayWindow.webContents) {
      this.overlayWindow.webContents.send('overlay-config-updated', this.config);
    }
  }

  // Public methods for external control
  async forceCancel(): Promise<boolean> {
    if (this.isActive) {
      this.cancelCapture('Force cancelled');
      return true;
    }
    return false;
  }

  async bringToFront(): Promise<void> {
    if (this.overlayWindow) {
      this.overlayWindow.show();
      this.overlayWindow.focus();
      this.overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
  }

  // Validation methods
  validateRegion(region: { x: number; y: number; width: number; height: number }): boolean {
    return region.width >= this.config.minSelectionSize &&
           region.height >= this.config.minSelectionSize &&
           region.x >= 0 &&
           region.y >= 0;
  }

  // Safety checks
  ensureOverlayCleanup(): void {
    if (this.overlayWindow && !this.overlayWindow.isDestroyed()) {
      try {
        this.overlayWindow.close();
      } catch (error) {
        console.warn('Failed to cleanup overlay window:', error);
      }
    }
    this.overlayWindow = null;
    this.isActive = false;
    this.resolvePromise = null;
    this.rejectPromise = null;
  }
}