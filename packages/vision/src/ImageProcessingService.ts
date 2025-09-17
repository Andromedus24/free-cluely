import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

// Import types from VisionTypes
import type {
  ImageProcessingConfig,
  ImageProcessRequest,
  ImageProcessResult
} from './types/VisionTypes';

export class ImageProcessingService extends EventEmitter {
  private config: Required<ImageProcessingConfig>;
  private cache = new Map<string, { result: ImageProcessResult; timestamp: number }>();

  constructor(config: Partial<ImageProcessingConfig> = {}) {
    super();

    this.config = {
      maxImageSize: 10 * 1024 * 1024, // 10MB
      maxDimensions: { width: 4096, height: 4096 },
      compressionQuality: 85,
      enableResizing: true,
      enableCompression: true,
      enableCaching: true,
      cacheDir: path.join(process.cwd(), '.atlas', 'image-cache'),
      maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
      processingTimeout: 30000,
      fallbackToOCR: true,
      ocrMaxSize: 5 * 1024 * 1024, // 5MB for OCR
      ...config
    };

    this.ensureCacheDirectory();
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await mkdir(this.config.cacheDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async processImage(request: ImageProcessRequest): Promise<ImageProcessResult> {
    const startTime = Date.now();
    this.emit('progress', { stage: 'processing', status: 'starting', requestId: request.id });

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (this.config.enableCaching) {
        const cached = await this.getFromCache(cacheKey);
        if (cached) {
          this.emit('progress', { stage: 'processing', status: 'cache-hit', requestId: request.id });
          return { ...cached, processingTime: Date.now() - startTime };
        }
      }

      // Load and validate image
      const imageData = await this.loadImageData(request.imageData);
      this.emit('progress', { stage: 'processing', status: 'image-loaded', requestId: request.id });

      const originalInfo = await this.getImageInfo(imageData);
      this.emit('progress', { stage: 'processing', status: 'image-analyzed', requestId: request.id, ...originalInfo });

      const processingSteps: string[] = [];
      let finalImage = imageData;
      let finalFormat = originalInfo.format;
      let finalInfo = originalInfo;

      // Check if image needs processing
      if (request.options?.skipProcessing) {
        processingSteps.push('skip-processing');
      } else {
        // Check if image is too large
        if (originalInfo.size > this.config.maxImageSize) {
          this.emit('warning', { stage: 'processing', warning: 'Image exceeds maximum size', requestId: request.id });
          processingSteps.push('size-warning');
        }

        // Resize if necessary
        if (this.config.enableResizing && this.needsResizing(originalInfo, request.options)) {
          this.emit('progress', { stage: 'processing', status: 'resizing', requestId: request.id });
          const resizeResult = await this.resizeImage(imageData, originalInfo, request.options);
          finalImage = resizeResult.data;
          finalFormat = resizeResult.format;
          finalInfo = resizeResult.info;
          processingSteps.push('resized');
        }

        // Compress if necessary
        if (this.config.enableCompression && this.needsCompression(originalInfo, request.options)) {
          this.emit('progress', { stage: 'processing', status: 'compressing', requestId: request.id });
          const compressResult = await this.compressImage(finalImage, finalFormat, request.options);
          finalImage = compressResult.data;
          finalInfo = compressResult.info;
          processingSteps.push('compressed');
        }
      }

      // Generate image hash
      const imageHash = this.generateHash(finalImage);

      // OCR processing if requested
      let ocrResult;
      if (request.options?.enableOCR !== false) {
        // Check if we should fallback to OCR-only mode
        if (this.shouldFallbackToOCR(originalInfo, finalInfo)) {
          this.emit('progress', { stage: 'processing', status: 'ocr-fallback', requestId: request.id });
          processingSteps.push('ocr-fallback');
          ocrResult = await this.performOCROnly(imageData); // Use original for better OCR quality
        } else if (finalInfo.size <= this.config.ocrMaxSize) {
          this.emit('progress', { stage: 'processing', status: 'ocr-starting', requestId: request.id });
          processingSteps.push('ocr');
          ocrResult = await this.performOCR(finalImage);
        } else {
          this.emit('warning', { stage: 'processing', warning: 'Image too large for OCR', requestId: request.id });
          processingSteps.push('ocr-skipped');
        }
      }

      // Build result
      const result: ImageProcessResult = {
        id: request.id,
        success: true,
        processedImage: {
          data: finalImage,
          format: finalFormat,
          width: finalInfo.width,
          height: finalInfo.height,
          size: finalInfo.size,
          hash: imageHash
        },
        originalImage: {
          format: originalInfo.format,
          width: originalInfo.width,
          height: originalInfo.height,
          size: originalInfo.size,
          hash: originalInfo.hash
        },
        ocrResult,
        processingTime: Date.now() - startTime,
        processingSteps,
        metadata: {
          compressionRatio: originalInfo.size > 0 ? finalInfo.size / originalInfo.size : 1,
          resizeRatio: this.calculateResizeRatio(originalInfo, finalInfo),
          processingMethod: this.determineProcessingMethod(processingSteps),
          cached: false
        }
      };

      // Cache result if successful
      if (result.success && this.config.enableCaching) {
        await this.saveToCache(cacheKey, result);
      }

      this.emit('progress', { stage: 'processing', status: 'completed', requestId: request.id, processingTime: result.processingTime });

      return result;

    } catch (error) {
      const errorResult: ImageProcessResult = {
        id: request.id,
        success: false,
        processingTime: Date.now() - startTime,
        processingSteps: [],
        error: {
          code: 'IMAGE_PROCESSING_ERROR',
          message: (error as Error).message,
          details: error
        }
      };

      this.emit('error', { stage: 'processing', error: (error as Error).message, requestId: request.id });

      return errorResult;
    }
  }

  private async loadImageData(imageData: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(imageData)) {
      return imageData;
    }

    if (typeof imageData === 'string') {
      // Handle base64 string
      if (imageData.startsWith('data:image')) {
        const base64Data = imageData.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }

      // Handle file path
      if (fs.existsSync(imageData)) {
        return await readFile(imageData);
      }
    }

    throw new Error('Invalid image data format');
  }

  private async getImageInfo(imageData: Buffer): Promise<{ format: string; width: number; height: number; size: number; hash: string }> {
    // In a real implementation, this would use libraries like 'sharp' or 'image-size'
    // For now, return placeholder values based on buffer analysis

    const size = imageData.length;
    const hash = this.generateHash(imageData);

    // Simple format detection based on magic numbers
    let format = 'unknown';
    if (imageData.length > 2) {
      const firstBytes = imageData.subarray(0, 4).toString('hex');
      if (firstBytes.startsWith('89504e47')) format = 'png';
      else if (firstBytes.startsWith('ffd8ff')) format = 'jpeg';
      else if (firstBytes.startsWith('52494646')) format = 'webp';
    }

    // Placeholder dimensions - in real implementation, use image analysis
    const dimensions = this.estimateDimensions(imageData);

    return {
      format,
      width: dimensions.width,
      height: dimensions.height,
      size,
      hash
    };
  }

  private estimateDimensions(imageData: Buffer): { width: number; height: number } {
    // Very rough estimation based on file size
    const size = imageData.length;

    // Assume average compression ratio and estimate dimensions
    const estimatedPixels = size * 3; // Assume 3:1 compression ratio
    const aspectRatio = 16 / 9; // Common aspect ratio

    const height = Math.sqrt(estimatedPixels / aspectRatio);
    const width = height * aspectRatio;

    // Clamp to reasonable values
    return {
      width: Math.min(Math.max(Math.round(width), 100), 4096),
      height: Math.min(Math.max(Math.round(height), 100), 4096)
    };
  }

  private needsResizing(imageInfo: any, options?: ImageProcessRequest['options']): boolean {
    if (!this.config.enableResizing) return false;

    const maxWidth = options?.maxWidth || this.config.maxDimensions.width;
    const maxHeight = options?.maxHeight || this.config.maxDimensions.height;

    return imageInfo.width > maxWidth || imageInfo.height > maxHeight;
  }

  private needsCompression(imageInfo: any, options?: ImageProcessRequest['options']): boolean {
    if (!this.config.enableCompression) return false;

    return imageInfo.size > this.config.maxImageSize * 0.5; // Compress if larger than 50% of max size
  }

  private async resizeImage(imageData: Buffer, imageInfo: any, options?: ImageProcessRequest['options']): Promise<{ data: Buffer; format: string; info: any }> {
    // In a real implementation, this would use 'sharp' or similar library
    // For now, return the original data with updated metadata

    const maxWidth = options?.maxWidth || this.config.maxDimensions.width;
    const maxHeight = options?.maxHeight || this.config.maxDimensions.height;

    // Calculate new dimensions maintaining aspect ratio
    const aspectRatio = imageInfo.width / imageInfo.height;
    let newWidth = imageInfo.width;
    let newHeight = imageInfo.height;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    // For now, just return original with updated dimensions
    // In production, this would actually resize the image
    return {
      data: imageData,
      format: imageInfo.format,
      info: {
        ...imageInfo,
        width: Math.round(newWidth),
        height: Math.round(newHeight),
        size: imageData.length // Would be different after actual resize
      }
    };
  }

  private async compressImage(imageData: Buffer, format: string, options?: ImageProcessRequest['options']): Promise<{ data: Buffer; info: any }> {
    // In a real implementation, this would use 'sharp' or similar for compression
    // For now, return the original data

    const quality = options?.quality || this.config.compressionQuality;
    const outputFormat = options?.format || format;

    // For now, just return original with potentially updated format
    return {
      data: imageData,
      info: {
        format: outputFormat,
        size: imageData.length // Would be different after actual compression
      }
    };
  }

  private shouldFallbackToOCR(originalInfo: any, finalInfo: any): boolean {
    if (!this.config.fallbackToOCR) return false;

    // Fallback to OCR if:
    // 1. Processing failed to reduce size significantly
    // 2. Image is still too large for normal processing
    // 3. Image format is not ideal for processing

    const sizeReduction = originalInfo.size / finalInfo.size;
    const stillTooLarge = finalInfo.size > this.config.maxImageSize * 0.8;
    const poorFormat = ['tiff', 'bmp', 'gif'].includes(finalInfo.format.toLowerCase());

    return (stillTooLarge && sizeReduction < 2) || poorFormat;
  }

  private async performOCR(imageData: Buffer): Promise<any> {
    // Placeholder for OCR processing
    // In a real implementation, this would integrate with Tesseract or similar

    return {
      text: 'OCR result would go here',
      confidence: 0.85,
      blocks: [],
      words: []
    };
  }

  private async performOCROnly(imageData: Buffer): Promise<any> {
    // OCR-only processing for fallback scenarios
    // This might use different OCR settings or preprocessing

    return {
      text: 'OCR-only fallback result',
      confidence: 0.75,
      blocks: [],
      words: [],
      fallbackMode: true
    };
  }

  private generateCacheKey(request: ImageProcessRequest): string {
    const hash = createHash('sha256');
    hash.update(request.id);

    if (Buffer.isBuffer(request.imageData)) {
      hash.update(request.imageData);
    } else {
      hash.update(request.imageData.toString());
    }

    if (request.options) {
      hash.update(JSON.stringify(request.options));
    }

    return hash.digest('hex');
  }

  private async getFromCache(key: string): Promise<ImageProcessResult | null> {
    if (!this.config.enableCaching) {
      return null;
    }

    const cached = this.cache.get(key);
    if (cached) {
      // Check if cache entry is expired
      if (Date.now() - cached.timestamp > this.config.maxCacheAge) {
        this.cache.delete(key);
        return null;
      }
      return cached.result;
    }

    // Check disk cache
    return this.getFromDiskCache(key);
  }

  private async getFromDiskCache(key: string): Promise<ImageProcessResult | null> {
    try {
      const cacheFile = path.join(this.config.cacheDir, `${key}.json`);
      await fs.promises.access(cacheFile);
      const cacheData = await readFile(cacheFile, 'utf-8');
      const cached: { result: ImageProcessResult; timestamp: number } = JSON.parse(cacheData);

      // Check if cache entry is expired
      if (Date.now() - cached.timestamp > this.config.maxCacheAge) {
        await fs.promises.unlink(cacheFile);
        return null;
      }

      return cached.result;
    } catch (error) {
      return null;
    }
  }

  private async saveToCache(key: string, result: ImageProcessResult): Promise<void> {
    if (!this.config.enableCaching) {
      return;
    }

    // Add to memory cache
    this.cache.set(key, { result, timestamp: Date.now() });

    // Save to disk cache
    try {
      const cacheFile = path.join(this.config.cacheDir, `${key}.json`);
      const cacheData = {
        result,
        timestamp: Date.now()
      };
      await writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
      this.cleanupDiskCache();
    } catch (error) {
      console.warn('Failed to cache image processing result:', error);
    }
  }

  private async cleanupDiskCache(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.config.cacheDir);
      const cacheFiles: Array<{ file: string; path: string; stats: any }> = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.cacheDir, file);
          const stats = await fs.promises.stat(filePath);
          cacheFiles.push({ file, path: filePath, stats });
        }
      }

      // Remove expired files
      const now = Date.now();
      for (const cacheFile of cacheFiles) {
        if (now - cacheFile.stats.mtime.getTime() > this.config.maxCacheAge) {
          try {
            await fs.promises.unlink(cacheFile.path);
          } catch (error) {
            console.warn(`Failed to delete expired cache file ${cacheFile.file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup image cache:', error);
    }
  }

  private calculateResizeRatio(original: any, final: any): number {
    const originalPixels = original.width * original.height;
    const finalPixels = final.width * final.height;
    return finalPixels / originalPixels;
  }

  private determineProcessingMethod(steps: string[]): 'original' | 'resized' | 'compressed' | 'ocr-fallback' {
    if (steps.includes('ocr-fallback')) return 'ocr-fallback';
    if (steps.includes('compressed')) return 'compressed';
    if (steps.includes('resized')) return 'resized';
    return 'original';
  }

  private generateHash(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  async clearCache(): Promise<boolean> {
    this.cache.clear();

    try {
      const files = await fs.promises.readdir(this.config.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.cacheDir, file);
          await fs.promises.unlink(filePath);
        }
      }
      return true;
    } catch (error) {
      console.warn('Failed to clear image cache:', error);
      return false;
    }
  }

  getCacheStats(): {
    memoryCache: { size: number; entries: number };
    diskCache: { size: number; files: number };
    config: ImageProcessingConfig;
  } {
    let diskCacheSize = 0;
    let diskCacheFiles = 0;

    try {
      const files = fs.readdirSync(this.config.cacheDir);
      diskCacheFiles = files.filter(f => f.endsWith('.json')).length;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.config.cacheDir, file);
          const stats = fs.statSync(filePath);
          diskCacheSize += stats.size;
        }
      }
    } catch (error) {
      // Cache directory doesn't exist or can't be read
    }

    return {
      memoryCache: {
        size: this.cache.size,
        entries: this.cache.size
      },
      diskCache: {
        size: diskCacheSize,
        files: diskCacheFiles
      },
      config: this.config
    };
  }

  updateConfig(config: Partial<ImageProcessingConfig>): void {
    this.config = { ...this.config, ...config };

    // Update cache directory if changed
    if (config.cacheDir && config.cacheDir !== this.config.cacheDir) {
      this.ensureCacheDirectory();
    }
  }

  getConfig(): ImageProcessingConfig {
    return { ...this.config };
  }
}