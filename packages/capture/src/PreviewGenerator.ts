import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { promisify } from 'util';

import {
  PreviewOptions,
  PreviewResult,
  CaptureError
} from './types/CaptureTypes';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

export interface PreviewCacheConfig {
  enabled: boolean;
  maxSize: number; // Maximum number of cached previews
  maxAge: number; // Maximum age in milliseconds
  storagePath: string;
  compression: number; // JPEG/WebP compression quality (0-100)
}

export class PreviewGenerator {
  private config: Required<PreviewCacheConfig>;
  private memoryCache = new Map<string, { preview: PreviewResult; timestamp: number }>();
  private diskCachePath: string;

  constructor(config: Partial<PreviewCacheConfig> = {}) {
    this.config = {
      enabled: true,
      maxSize: 1000,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      storagePath: path.join(process.cwd(), '.atlas', 'previews'),
      compression: 80,
      ...config
    };

    this.diskCachePath = this.config.storagePath;
    this.ensureCacheDirectory();
  }

  private async ensureCacheDirectory(): Promise<void> {
    try {
      await mkdir(this.diskCachePath, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  async generatePreview(
    originalPath: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    try {
      // Check if file exists
      await access(originalPath);

      // Generate cache key
      const cacheKey = this.generateCacheKey(originalPath, options);

      // Check memory cache first
      if (this.config.enabled) {
        const memoryCached = this.getFromMemoryCache(cacheKey);
        if (memoryCached) {
          return memoryCached;
        }

        // Check disk cache
        const diskCached = await this.getFromDiskCache(cacheKey);
        if (diskCached) {
          this.addToMemoryCache(cacheKey, diskCached);
          return diskCached;
        }
      }

      // Generate preview
      const preview = await this.createPreview(originalPath, options);

      // Cache the result if enabled
      if (this.config.enabled && options?.caching !== false) {
        await this.cachePreview(cacheKey, preview);
      }

      return preview;

    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Original file not found: ${originalPath}`);
      }
      throw new Error(`Preview generation failed: ${error.message}`);
    }
  }

  private async createPreview(
    originalPath: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    // Read original file
    const originalData = await readFile(originalPath);

    // In a real implementation, we would use a library like Sharp for image processing
    // For now, we'll create a simple base64 representation
    const originalStats = await fs.promises.stat(originalPath);
    const fileExt = path.extname(originalPath).toLowerCase().substring(1);

    // Calculate preview dimensions (max 200x150 by default)
    const maxWidth = options?.maxWidth || 200;
    const maxHeight = options?.maxHeight || 150;

    // For now, create a simple base64 preview
    // In production, this would involve actual image resizing and compression
    const base64Data = originalData.toString('base64');
    const previewFormat = options?.format || this.determineOptimalFormat(fileExt);

    const preview: PreviewResult = {
      id: `preview_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      originalId: path.basename(originalPath, fileExt),
      data: `data:image/${previewFormat};base64,${base64Data}`,
      format: previewFormat,
      width: Math.min(maxWidth, 800), // Placeholder
      height: Math.min(maxHeight, 600), // Placeholder
      size: Math.floor(originalData.length * 0.1), // Estimate 10% of original
      cached: false
    };

    return preview;
  }

  private determineOptimalFormat(originalFormat: string): string {
    switch (originalFormat) {
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'webp'; // Use WebP for better compression
      case 'webp':
        return 'webp';
      default:
        return 'png';
    }
  }

  private generateCacheKey(originalPath: string, options?: PreviewOptions): string {
    const fileStats = fs.statSync(originalPath);
    const input = `${originalPath}_${fileStats.size}_${fileStats.mtime.getTime()}_${JSON.stringify(options)}`;
    return createHash('sha256').update(input).digest('hex');
  }

  private getFromMemoryCache(cacheKey: string): PreviewResult | null {
    if (!this.config.enabled) {
      return null;
    }

    const cached = this.memoryCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if cache entry is expired
    if (Date.now() - cached.timestamp > this.config.maxAge) {
      this.memoryCache.delete(cacheKey);
      return null;
    }

    return cached.preview;
  }

  private async getFromDiskCache(cacheKey: string): Promise<PreviewResult | null> {
    if (!this.config.enabled) {
      return null;
    }

    const cachePath = path.join(this.diskCachePath, `${cacheKey}.json`);

    try {
      await access(cachePath);
      const cacheData = await readFile(cachePath, 'utf-8');
      const cached: { preview: PreviewResult; timestamp: number } = JSON.parse(cacheData);

      // Check if cache entry is expired
      if (Date.now() - cached.timestamp > this.config.maxAge) {
        await fs.promises.unlink(cachePath);
        return null;
      }

      return cached.preview;
    } catch (error) {
      // Cache file doesn't exist or is invalid
      return null;
    }
  }

  private async cachePreview(cacheKey: string, preview: PreviewResult): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Add to memory cache
    this.addToMemoryCache(cacheKey, preview);

    // Save to disk cache
    const cachePath = path.join(this.diskCachePath, `${cacheKey}.json`);
    const cacheData = {
      preview,
      timestamp: Date.now()
    };

    try {
      await writeFile(cachePath, JSON.stringify(cacheData, null, 2));
      this.cleanupDiskCache();
    } catch (error) {
      console.warn('Failed to cache preview to disk:', error);
    }
  }

  private addToMemoryCache(cacheKey: string, preview: PreviewResult): void {
    this.memoryCache.set(cacheKey, {
      preview,
      timestamp: Date.now()
    });

    // Clean up memory cache if it gets too large
    if (this.memoryCache.size > this.config.maxSize) {
      this.cleanupMemoryCache();
    }
  }

  private cleanupMemoryCache(): void {
    // Remove oldest entries until we're under the limit
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.length - Math.floor(this.config.maxSize * 0.8);
    for (let i = 0; i < entriesToRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private async cleanupDiskCache(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.diskCachePath);
      const cacheFiles: Array<{ file: string; path: string; stats: any }> = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.diskCachePath, file);
          const stats = await fs.promises.stat(filePath);
          cacheFiles.push({ file, path: filePath, stats });
        }
      }

      // Sort by age (oldest first)
      cacheFiles.sort((a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime());

      // Remove oldest files if we have too many
      const filesToRemove = cacheFiles.length - Math.floor(this.config.maxSize * 0.8);
      for (let i = 0; i < filesToRemove; i++) {
        try {
          await fs.promises.unlink(cacheFiles[i].path);
        } catch (error) {
          console.warn(`Failed to delete cache file ${cacheFiles[i].file}:`, error);
        }
      }

      // Remove expired files
      const now = Date.now();
      for (const cacheFile of cacheFiles) {
        if (now - cacheFile.stats.mtime.getTime() > this.config.maxAge) {
          try {
            await fs.promises.unlink(cacheFile.path);
          } catch (error) {
            console.warn(`Failed to delete expired cache file ${cacheFile.file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup disk cache:', error);
    }
  }

  async clearCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear disk cache
    try {
      const files = await fs.promises.readdir(this.diskCachePath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.diskCachePath, file);
          try {
            await fs.promises.unlink(filePath);
          } catch (error) {
            console.warn(`Failed to delete cache file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to clear disk cache:', error);
    }
  }

  getCacheStats(): {
    memoryCache: { size: number; entries: number };
    diskCache: { size: number; files: number };
    config: PreviewCacheConfig;
  } {
    let diskCacheSize = 0;
    let diskCacheFiles = 0;

    try {
      const files = fs.readdirSync(this.diskCachePath);
      diskCacheFiles = files.filter(f => f.endsWith('.json')).length;

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.diskCachePath, file);
          const stats = fs.statSync(filePath);
          diskCacheSize += stats.size;
        }
      }
    } catch (error) {
      // Cache directory doesn't exist or can't be read
    }

    return {
      memoryCache: {
        size: this.memoryCache.size,
        entries: this.memoryCache.size
      },
      diskCache: {
        size: diskCacheSize,
        files: diskCacheFiles
      },
      config: this.config
    };
  }

  updateConfig(config: Partial<PreviewCacheConfig>): void {
    this.config = { ...this.config, ...config };

    // Update disk cache path if changed
    if (config.storagePath && config.storagePath !== this.diskCachePath) {
      this.diskCachePath = config.storagePath;
      this.ensureCacheDirectory();
    }

    // Cleanup if cache size was reduced
    if (config.maxSize !== undefined && config.maxSize < this.config.maxSize) {
      this.cleanupMemoryCache();
      this.cleanupDiskCache();
    }
  }
}