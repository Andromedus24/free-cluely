import { ScreenshotCapture } from './ScreenshotCapture';
import {
  CaptureOptions,
  CaptureResult,
  PreviewOptions,
  PreviewResult,
  CaptureError,
  DisplayInfo,
  WindowInfo
} from './types/CaptureTypes';

export interface CaptureServiceConfig {
  enableOverlay: boolean;
  defaultFormat: 'png' | 'jpg' | 'webp';
  defaultQuality: number;
  maxCacheSize: number;
  captureTimeout: number;
  enableAutoCleanup: boolean;
  cleanupIntervalDays: number;
}

export class CaptureService {
  private capture: ScreenshotCapture;
  private config: Required<CaptureServiceConfig>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CaptureServiceConfig> = {}) {
    this.capture = new ScreenshotCapture();
    this.config = {
      enableOverlay: true,
      defaultFormat: 'png',
      defaultQuality: 90,
      maxCacheSize: 100,
      captureTimeout: 30000,
      enableAutoCleanup: true,
      cleanupIntervalDays: 30,
      ...config
    };

    if (this.config.enableAutoCleanup) {
      this.startCleanupTask();
    }
  }

  async getDisplays(): Promise<DisplayInfo[]> {
    return await this.capture.getDisplays();
  }

  async getWindows(): Promise<WindowInfo[]> {
    return await this.capture.getWindows();
  }

  async captureRegion(options?: Partial<CaptureOptions>): Promise<CaptureResult> {
    if (!this.config.enableOverlay) {
      throw new Error('Region capture requires overlay to be enabled');
    }

    const result = await this.capture.startRegionCapture({
      type: 'region',
      format: options?.format || this.config.defaultFormat,
      quality: options?.quality || this.config.defaultQuality,
      ...options
    });

    if ('error' in result) {
      throw new Error(`Capture failed: ${result.error.message}`);
    }

    // For region capture, we need to wait for the overlay to complete
    // In a real implementation, we'd use a promise or event emitter
    throw new Error('Region capture completed via overlay - check recent captures');
  }

  async captureWindow(windowId: string, options?: Partial<CaptureOptions>): Promise<CaptureResult> {
    const result = await this.capture.captureWindow(windowId, {
      type: 'window',
      format: options?.format || this.config.defaultFormat,
      quality: options?.quality || this.config.defaultQuality,
      ...options
    });

    if ('error' in result) {
      throw new Error(`Window capture failed: ${result.error.message}`);
    }

    return result;
  }

  async captureFullScreen(options?: Partial<CaptureOptions>): Promise<CaptureResult> {
    const result = await this.capture.captureFullScreen({
      type: 'full',
      format: options?.format || this.config.defaultFormat,
      quality: options?.quality || this.config.defaultQuality,
      ...options
    });

    if ('error' in result) {
      throw new Error(`Full screen capture failed: ${result.error.message}`);
    }

    return result;
  }

  async generatePreview(filePath: string, options?: PreviewOptions): Promise<PreviewResult> {
    const result = await this.capture.generatePreview(filePath, {
      maxWidth: 200,
      maxHeight: 150,
      quality: 80,
      format: 'webp',
      caching: true,
      ...options
    });

    if ('error' in result) {
      throw new Error(`Preview generation failed: ${result.error.message}`);
    }

    return result;
  }

  async getRecentCaptures(limit: number = 20): Promise<CaptureResult[]> {
    return await this.capture.getRecentCaptures(limit);
  }

  async deleteCapture(captureId: string): Promise<boolean> {
    return await this.capture.deleteCapture(captureId);
  }

  async cancelCapture(): Promise<boolean> {
    return await this.capture.cancelCapture();
  }

  isOverlayVisible(): boolean {
    return this.capture.isOverlayVisible();
  }

  getCaptureDirectory(): string {
    return this.capture.getCaptureDirectory();
  }

  getCacheStats(): {
    size: number;
    entries: number;
    memoryUsage: string;
  } {
    return this.capture.getCacheStats();
  }

  clearPreviewCache(): void {
    this.capture.clearPreviewCache();
  }

  async cleanupOldCaptures(): Promise<number> {
    const captures = await this.capture.getRecentCaptures(1000);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.cleanupIntervalDays);

    let deletedCount = 0;

    for (const capture of captures) {
      if (capture.timestamp < cutoffDate) {
        const success = await this.capture.deleteCapture(capture.id);
        if (success) {
          deletedCount++;
        }
      }
    }

    return deletedCount;
  }

  private startCleanupTask(): void {
    // Run cleanup daily at 3 AM
    const scheduleNextCleanup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(3, 0, 0, 0);

      const delay = tomorrow.getTime() - now.getTime();

      setTimeout(async () => {
        try {
          await this.cleanupOldCaptures();
          console.log('Capture cleanup completed');
        } catch (error) {
          console.error('Capture cleanup failed:', error);
        }
        scheduleNextCleanup();
      }, delay);
    };

    scheduleNextCleanup();
  }

  public stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  public getConfig(): CaptureServiceConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<CaptureServiceConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart cleanup task if needed
    if (config.enableAutoCleanup !== undefined) {
      this.stopCleanupTask();
      if (this.config.enableAutoCleanup) {
        this.startCleanupTask();
      }
    }
  }
}