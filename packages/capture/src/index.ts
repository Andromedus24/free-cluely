// Main exports
export { ScreenshotCapture } from './ScreenshotCapture';
export { OverlayManager } from './OverlayManager';
export { PreviewGenerator } from './PreviewGenerator';
export { CaptureService } from './CaptureService';
export { IPCService, IPCRendererClient, createCaptureIPC } from './IPCService';
export { CapturePipeline } from './CapturePipeline';

// Type exports
export * from './types/CaptureTypes';

// Config types
export type {
  CaptureServiceConfig,
  OverlayConfig,
  PreviewCacheConfig,
  PipelineConfig
} from './CaptureService';

// Event types
export type { PipelineEvent } from './CapturePipeline';

// IPC types
export type { IPCRequest, IPCResponse, IPCContract } from './IPCService';

// Default configurations
export const DEFAULT_CAPTURE_CONFIG = {
  enableOverlay: true,
  defaultFormat: 'png' as const,
  defaultQuality: 90,
  maxCacheSize: 100,
  captureTimeout: 30000,
  enableAutoCleanup: true,
  cleanupIntervalDays: 30
};

export const DEFAULT_OVERLAY_CONFIG = {
  opacity: 0.3,
  borderColor: '#007AFF',
  backgroundColor: 'rgba(0, 122, 255, 0.1)',
  borderWidth: 2,
  showInstructions: true,
  showDimensions: true,
  minSelectionSize: 10,
  escapeCancels: true
};

export const DEFAULT_PREVIEW_CONFIG = {
  enabled: true,
  maxSize: 1000,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  compression: 80,
  storagePath: '.atlas/previews'
};

export const DEFAULT_PIPELINE_CONFIG = {
  enableJobCreation: true,
  enableArtifactStorage: true,
  enablePreviewGeneration: true,
  enableErrorHandling: true,
  defaultCaptureOptions: {
    format: 'png' as const,
    quality: 90,
    includeCursor: false
  },
  defaultPreviewOptions: {
    maxWidth: 200,
    maxHeight: 150,
    quality: 80,
    format: 'webp' as const,
    caching: true
  },
  captureTimeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Utility functions
export const createCaptureService = (config?: Partial<typeof DEFAULT_CAPTURE_CONFIG>) => {
  const { CaptureService } = require('./CaptureService');
  return new CaptureService(config);
};

export const createCapturePipeline = (
  captureService: any,
  jobStore?: any,
  config?: Partial<typeof DEFAULT_PIPELINE_CONFIG>
) => {
  const { CapturePipeline } = require('./CapturePipeline');
  return new CapturePipeline(captureService, jobStore, config);
};

// Version info
export const CAPTURE_VERSION = '1.0.0';

// Error codes
export const CAPTURE_ERROR_CODES = {
  OVERLAY_ACTIVE: 'OVERLAY_ACTIVE',
  OVERLAY_ERROR: 'OVERLAY_ERROR',
  WINDOW_NOT_FOUND: 'WINDOW_NOT_FOUND',
  WINDOW_CAPTURE_FAILED: 'WINDOW_CAPTURE_FAILED',
  SCREEN_NOT_FOUND: 'SCREEN_NOT_FOUND',
  SCREEN_CAPTURE_ERROR: 'SCREEN_CAPTURE_ERROR',
  REGION_CAPTURE_ERROR: 'REGION_CAPTURE_ERROR',
  PREVIEW_GENERATION_ERROR: 'PREVIEW_GENERATION_ERROR',
  CAPTURE_CANCELLED: 'CAPTURE_CANCELLED',
  CAPTURE_TIMEOUT: 'CAPTURE_TIMEOUT',
  IPC_ERROR: 'IPC_ERROR'
} as const;

// Validation helpers
export const validateCaptureOptions = (options: any): boolean => {
  if (!options || typeof options !== 'object') return false;

  if (options.type && !['region', 'window', 'full'].includes(options.type)) return false;

  if (options.format && !['png', 'jpg', 'webp'].includes(options.format)) return false;

  if (options.quality !== undefined && (options.quality < 1 || options.quality > 100)) return false;

  if (options.region) {
    const { x, y, width, height } = options.region;
    if ([x, y, width, height].some(val => typeof val !== 'number' || val < 0)) return false;
    if (width < 1 || height < 1) return false;
  }

  return true;
};

export const validatePreviewOptions = (options: any): boolean => {
  if (!options || typeof options !== 'object') return false;

  if (options.maxWidth !== undefined && (options.maxWidth < 1 || options.maxWidth > 4096)) return false;

  if (options.maxHeight !== undefined && (options.maxHeight < 1 || options.maxHeight > 4096)) return false;

  if (options.quality !== undefined && (options.quality < 1 || options.quality > 100)) return false;

  if (options.format && !['webp', 'png', 'jpg'].includes(options.format)) return false;

  return true;
};

// Platform detection
export const getPlatformInfo = () => {
  const os = require('os');
  return {
    platform: os.platform(),
    arch: os.arch(),
    version: os.release(),
    hostname: os.hostname()
  };
};

// File system utilities
export const ensureDirectoryExists = async (dirPath: string): Promise<void> => {
  const fs = require('fs');
  const path = require('path');

  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

export const getFileStats = async (filePath: string): Promise<{
  exists: boolean;
  size?: number;
  created?: Date;
  modified?: Date;
}> => {
  const fs = require('fs');

  try {
    const stats = await fs.promises.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false };
    }
    throw error;
  }
};

// Image utilities (placeholder for actual image processing)
export const getImageDimensions = async (filePath: string): Promise<{ width: number; height: number }> => {
  // In a real implementation, this would use a library like 'sharp' or 'jimp'
  // For now, return placeholder values
  return { width: 800, height: 600 };
};

export const convertImageFormat = async (
  inputPath: string,
  outputPath: string,
  format: 'png' | 'jpg' | 'webp',
  quality: number = 80
): Promise<void> => {
  // In a real implementation, this would use 'sharp' or similar
  // For now, just copy the file
  const fs = require('fs');
  await fs.promises.copyFile(inputPath, outputPath);
};