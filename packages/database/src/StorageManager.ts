import { promises as fs, existsSync, mkdirSync, Stats } from 'fs';
import { join, dirname, basename } from 'path';
import { DatabaseError } from './types';

export interface StorageQuota {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  byType: { [type: string]: number };
  percentageUsed: number;
}

export interface StoragePathConfig {
  basePath: string;
  artifactsPath: string;
  tempPath: string;
  backupsPath: string;
  logsPath: string;
  cachePath: string;
}

export interface StorageQuotaConfig {
  maxTotalStorage: number; // in bytes
  maxArtifactStorage: number; // in bytes
  maxTempStorage: number; // in bytes
  maxSingleFileSize: number; // in bytes
  cleanupThreshold: number; // percentage (0-100)
  warnThreshold: number; // percentage (0-100)
}

export interface StorageManagerConfig {
  paths: Partial<StoragePathConfig>;
  quotas: StorageQuotaConfig;
  enableAutoCleanup: boolean;
  cleanupInterval: number; // in hours
}

export class StorageManager {
  private config: StorageManagerConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private quotaCache: StorageQuota | null = null;
  private lastQuotaUpdate: number = 0;
  private readonly quotaCacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<StorageManagerConfig> = {}) {
    this.config = {
      paths: {
        basePath: './storage',
        artifactsPath: './storage/artifacts',
        tempPath: './storage/temp',
        backupsPath: './storage/backups',
        logsPath: './storage/logs',
        cachePath: './storage/cache',
        ...config.paths
      },
      quotas: {
        maxTotalStorage: 10 * 1024 * 1024 * 1024, // 10GB
        maxArtifactStorage: 8 * 1024 * 1024 * 1024, // 8GB
        maxTempStorage: 1 * 1024 * 1024 * 1024, // 1GB
        maxSingleFileSize: 100 * 1024 * 1024, // 100MB
        cleanupThreshold: 90, // 90%
        warnThreshold: 80, // 80%
        ...config.quotas
      },
      enableAutoCleanup: true,
      cleanupInterval: 24,
      ...config
    };

    this.initializeStorage();
  }

  private initializeStorage(): void {
    try {
      // Ensure all directories exist
      const paths = Object.values(this.config.paths);
      for (const path of paths) {
        if (!existsSync(path)) {
          mkdirSync(path, { recursive: true });
        }
      }

      // Start auto cleanup if enabled
      if (this.config.enableAutoCleanup) {
        this.startAutoCleanup();
      }

      console.log('Storage manager initialized with config:', {
        paths: this.config.paths,
        quotas: {
          maxTotalStorage: this.formatBytes(this.config.quotas.maxTotalStorage),
          maxArtifactStorage: this.formatBytes(this.config.quotas.maxArtifactStorage),
          maxTempStorage: this.formatBytes(this.config.quotas.maxTempStorage),
          maxSingleFileSize: this.formatBytes(this.config.quotas.maxSingleFileSize),
          cleanupThreshold: `${this.config.quotas.cleanupThreshold}%`,
          warnThreshold: `${this.config.quotas.warnThreshold}%`
        },
        enableAutoCleanup: this.config.enableAutoCleanup
      });
    } catch (error) {
      throw new DatabaseError('Failed to initialize storage manager', error as Error);
    }
  }

  private startAutoCleanup(): void {
    const intervalMs = this.config.cleanupInterval * 60 * 60 * 1000;
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupIfNeeded();
      } catch (error) {
        console.error('Auto cleanup failed:', error);
      }
    }, intervalMs);
  }

  private async cleanupIfNeeded(): Promise<void> {
    const quota = await this.getStorageQuota();

    if (quota.percentageUsed >= this.config.quotas.cleanupThreshold) {
      console.log(`Storage usage at ${quota.percentageUsed}%, running cleanup...`);
      await this.runCleanup();
    }
  }

  // Quota Management
  async getStorageQuota(): Promise<StorageQuota> {
    const now = Date.now();

    // Return cached quota if still valid
    if (this.quotaCache && (now - this.lastQuotaUpdate) < this.quotaCacheTTL) {
      return this.quotaCache;
    }

    try {
      const stats = await this.calculateStorageStats();

      const quota: StorageQuota = {
        totalBytes: this.config.quotas.maxTotalStorage,
        usedBytes: stats.totalSize,
        availableBytes: Math.max(0, this.config.quotas.maxTotalStorage - stats.totalSize),
        byType: stats.byType,
        percentageUsed: Math.round((stats.totalSize / this.config.quotas.maxTotalStorage) * 100)
      };

      // Cache the result
      this.quotaCache = quota;
      this.lastQuotaUpdate = now;

      return quota;
    } catch (error) {
      throw new DatabaseError('Failed to get storage quota', error as Error);
    }
  }

  private async calculateStorageStats(): Promise<{
    totalSize: number;
    byType: { [type: string]: number };
  }> {
    const stats = {
      totalSize: 0,
      byType: {} as { [type: string]: number }
    };

    try {
      // Calculate size for each storage type
      const typePaths = {
        artifacts: this.config.paths.artifactsPath!,
        temp: this.config.paths.tempPath!,
        backups: this.config.paths.backupsPath!,
        logs: this.config.paths.logsPath!,
        cache: this.config.paths.cachePath!
      };

      for (const [type, path] of Object.entries(typePaths)) {
        if (existsSync(path)) {
          const size = await this.getDirectorySize(path);
          stats.byType[type] = size;
          stats.totalSize += size;
        }
      }
    } catch (error) {
      console.error('Failed to calculate storage stats:', error);
    }

    return stats;
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          totalSize += await this.getDirectorySize(fullPath);
        } else {
          try {
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;
          } catch (error) {
            console.warn(`Failed to stat file: ${fullPath}`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to get directory size: ${dirPath}`, error);
    }

    return totalSize;
  }

  // Storage Validation
  async validateStorageAvailable(size: number, type: 'artifact' | 'temp' | 'backup' = 'artifact'): Promise<{
    valid: boolean;
    error?: string;
    quota?: StorageQuota;
  }> {
    try {
      const quota = await this.getStorageQuota();

      // Check total storage
      if (quota.usedBytes + size > quota.totalBytes) {
        return {
          valid: false,
          error: `Insufficient total storage. Required: ${this.formatBytes(size)}, Available: ${this.formatBytes(quota.availableBytes)}`,
          quota
        };
      }

      // Check type-specific limits
      let typeLimit: number;
      let currentTypeUsage: number;

      switch (type) {
        case 'artifact':
          typeLimit = this.config.quotas.maxArtifactStorage;
          currentTypeUsage = quota.byType.artifacts || 0;
          break;
        case 'temp':
          typeLimit = this.config.quotas.maxTempStorage;
          currentTypeUsage = quota.byType.temp || 0;
          break;
        default:
          typeLimit = this.config.quotas.maxTotalStorage;
          currentTypeUsage = quota.usedBytes;
      }

      if (currentTypeUsage + size > typeLimit) {
        return {
          valid: false,
          error: `Insufficient ${type} storage. Required: ${this.formatBytes(size)}, Limit: ${this.formatBytes(typeLimit)}`,
          quota
        };
      }

      // Check single file size
      if (size > this.config.quotas.maxSingleFileSize) {
        return {
          valid: false,
          error: `File size exceeds maximum allowed size. Required: ${this.formatBytes(size)}, Maximum: ${this.formatBytes(this.config.quotas.maxSingleFileSize)}`,
          quota
        };
      }

      // Check warning threshold
      const projectedUsage = ((quota.usedBytes + size) / quota.totalBytes) * 100;
      if (projectedUsage >= this.config.quotas.warnThreshold) {
        console.warn(`Storage usage will reach ${projectedUsage.toFixed(1)}% after this operation`);
      }

      return { valid: true, quota };
    } catch (error) {
      throw new DatabaseError('Failed to validate storage', error as Error);
    }
  }

  // File Operations
  async storeFile(
    data: Buffer,
    fileName: string,
    type: 'artifact' | 'temp' | 'backup' | 'log' | 'cache' = 'artifact'
  ): Promise<{ filePath: string; size: number; storedAt: Date }> {
    try {
      // Validate storage availability
      const validation = await this.validateStorageAvailable(data.length, type);
      if (!validation.valid) {
        throw new DatabaseError(validation.error);
      }

      // Generate file path
      const filePath = this.generateFilePath(fileName, type);

      // Ensure directory exists
      await this.ensureDirectoryExists(filePath);

      // Write file
      await fs.writeFile(filePath, data);

      // Invalidate quota cache
      this.quotaCache = null;

      return {
        filePath,
        size: data.length,
        storedAt: new Date()
      };
    } catch (error) {
      throw new DatabaseError('Failed to store file', error as Error);
    }
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (!existsSync(filePath)) {
        return false;
      }

      await fs.unlink(filePath);

      // Invalidate quota cache
      this.quotaCache = null;

      return true;
    } catch (error) {
      console.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<boolean> {
    try {
      if (!existsSync(sourcePath)) {
        return false;
      }

      await this.ensureDirectoryExists(targetPath);
      await fs.rename(sourcePath, targetPath);

      // Invalidate quota cache
      this.quotaCache = null;

      return true;
    } catch (error) {
      console.error(`Failed to move file: ${sourcePath} -> ${targetPath}`, error);
      return false;
    }
  }

  async copyFile(sourcePath: string, targetPath: string): Promise<boolean> {
    try {
      if (!existsSync(sourcePath)) {
        return false;
      }

      // Validate storage availability
      const stats = await fs.stat(sourcePath);
      const validation = await this.validateStorageAvailable(stats.size);
      if (!validation.valid) {
        throw new DatabaseError(validation.error);
      }

      await this.ensureDirectoryExists(targetPath);
      await fs.copyFile(sourcePath, targetPath);

      // Invalidate quota cache
      this.quotaCache = null;

      return true;
    } catch (error) {
      console.error(`Failed to copy file: ${sourcePath} -> ${targetPath}`, error);
      return false;
    }
  }

  // Cleanup Operations
  async runCleanup(): Promise<{
    deletedFiles: number;
    freedSpace: number;
    byType: { [type: string]: { deleted: number; freed: number } };
  }> {
    const results = {
      deletedFiles: 0,
      freedSpace: 0,
      byType: {} as { [type: string]: { deleted: number; freed: number } }
    };

    try {
      console.log('Running storage cleanup...');

      // Clean up temporary files (older than 24 hours)
      const tempResult = await this.cleanupTempFiles();
      results.deletedFiles += tempResult.deletedFiles;
      results.freedSpace += tempResult.freedSpace;
      results.byType.temp = tempResult;

      // Clean up cache files (older than 7 days)
      const cacheResult = await this.cleanupCacheFiles();
      results.deletedFiles += cacheResult.deletedFiles;
      results.freedSpace += cacheResult.freedSpace;
      results.byType.cache = cacheResult;

      // Clean up old log files (older than 30 days)
      const logResult = await this.cleanupLogFiles();
      results.deletedFiles += logResult.deletedFiles;
      results.freedSpace += logResult.freedSpace;
      results.byType.logs = logResult;

      // Clean up old backups (keep last 5)
      const backupResult = await this.cleanupBackupFiles();
      results.deletedFiles += backupResult.deletedFiles;
      results.freedSpace += backupResult.freedSpace;
      results.byType.backups = backupResult;

      // Invalidate quota cache
      this.quotaCache = null;

      console.log('Storage cleanup completed:', {
        deletedFiles: results.deletedFiles,
        freedSpace: this.formatBytes(results.freedSpace),
        byType: Object.entries(results.byType).reduce((acc, [type, stats]) => {
          acc[type] = {
            deleted: stats.deleted,
            freed: this.formatBytes(stats.freed)
          };
          return acc;
        }, {} as any)
      });

      return results;
    } catch (error) {
      throw new DatabaseError('Failed to run cleanup', error as Error);
    }
  }

  private async cleanupTempFiles(): Promise<{ deletedFiles: number; freedSpace: number }> {
    return this.cleanupFilesByAge(
      this.config.paths.tempPath!,
      24 * 60 * 60 * 1000, // 24 hours
      'temporary files'
    );
  }

  private async cleanupCacheFiles(): Promise<{ deletedFiles: number; freedSpace: number }> {
    return this.cleanupFilesByAge(
      this.config.paths.cachePath!,
      7 * 24 * 60 * 60 * 1000, // 7 days
      'cache files'
    );
  }

  private async cleanupLogFiles(): Promise<{ deletedFiles: number; freedSpace: number }> {
    return this.cleanupFilesByAge(
      this.config.paths.logsPath!,
      30 * 24 * 60 * 60 * 1000, // 30 days
      'log files'
    );
  }

  private async cleanupBackupFiles(): Promise<{ deletedFiles: number; freedSpace: number }> {
    try {
      if (!existsSync(this.config.paths.backupsPath!)) {
        return { deletedFiles: 0, freedSpace: 0 };
      }

      const files = await fs.readdir(this.config.paths.backupsPath!);
      const backupFiles = files
        .map(file => join(this.config.paths.backupsPath!, file))
        .filter(file => {
          try {
            return existsSync(file) && fs.statSync(file).isFile();
          } catch {
            return false;
          }
        })
        .sort((a, b) => {
          const statA = fs.statSync(a);
          const statB = fs.statSync(b);
          return statB.mtimeMs - statA.mtimeMs; // Sort by modification time (newest first)
        });

      // Keep the last 5 backups
      const filesToDelete = backupFiles.slice(5);
      let deletedFiles = 0;
      let freedSpace = 0;

      for (const file of filesToDelete) {
        try {
          const stats = await fs.stat(file);
          await fs.unlink(file);
          deletedFiles++;
          freedSpace += stats.size;
        } catch (error) {
          console.warn(`Failed to delete backup file: ${file}`, error);
        }
      }

      return { deletedFiles, freedSpace };
    } catch (error) {
      console.error('Failed to cleanup backup files:', error);
      return { deletedFiles: 0, freedSpace: 0 };
    }
  }

  private async cleanupFilesByAge(
    dirPath: string,
    maxAge: number,
    fileType: string
  ): Promise<{ deletedFiles: number; freedSpace: number }> {
    try {
      if (!existsSync(dirPath)) {
        return { deletedFiles: 0, freedSpace: 0 };
      }

      const files = await this.getFilesOlderThan(dirPath, maxAge);
      let deletedFiles = 0;
      let freedSpace = 0;

      for (const file of files) {
        try {
          const stats = await fs.stat(file);
          await fs.unlink(file);
          deletedFiles++;
          freedSpace += stats.size;
        } catch (error) {
          console.warn(`Failed to delete ${fileType}: ${file}`, error);
        }
      }

      return { deletedFiles, freedSpace };
    } catch (error) {
      console.error(`Failed to cleanup ${fileType}:`, error);
      return { deletedFiles: 0, freedSpace: 0 };
    }
  }

  private async getFilesOlderThan(dirPath: string, maxAge: number): Promise<string[]> {
    const oldFiles: string[] = [];
    const cutoffTime = Date.now() - maxAge;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          oldFiles.push(...await this.getFilesOlderThan(fullPath, maxAge));
        } else {
          try {
            const stats = await fs.stat(fullPath);
            if (stats.mtimeMs < cutoffTime) {
              oldFiles.push(fullPath);
            }
          } catch (error) {
            console.warn(`Failed to stat file: ${fullPath}`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to get files older than ${maxAge}ms in ${dirPath}:`, error);
    }

    return oldFiles;
  }

  // Utility Methods
  private generateFilePath(fileName: string, type: string): string {
    const baseDir = this.config.paths[`${type}Path` as keyof StoragePathConfig] as string;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return join(baseDir, `${timestamp}_${sanitizedName}`);
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Public API
  async getStoragePaths(): StoragePathConfig {
    return { ...this.config.paths };
  }

  async updateQuotaConfig(newConfig: Partial<StorageQuotaConfig>): Promise<void> {
    this.config.quotas = { ...this.config.quotas, ...newConfig };
    this.quotaCache = null; // Invalidate cache
    console.log('Storage quota config updated:', newConfig);
  }

  async getStorageHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    quota: StorageQuota;
    recommendations: string[];
  }> {
    try {
      const quota = await this.getStorageQuota();

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      let message = 'Storage is healthy';
      const recommendations: string[] = [];

      if (quota.percentageUsed >= this.config.quotas.cleanupThreshold) {
        status = 'critical';
        message = `Storage usage is critical at ${quota.percentageUsed}%`;
        recommendations.push('Run immediate cleanup to free up space');
        recommendations.push('Consider increasing storage quota');
      } else if (quota.percentageUsed >= this.config.quotas.warnThreshold) {
        status = 'warning';
        message = `Storage usage is high at ${quota.percentageUsed}%`;
        recommendations.push('Consider running cleanup soon');
        recommendations.push('Monitor storage usage closely');
      }

      // Check individual storage types
      for (const [type, usage] of Object.entries(quota.byType)) {
        const typeLimit = this.config.quotas[`max${type.charAt(0).toUpperCase() + type.slice(1)}Storage` as keyof StorageQuotaConfig] as number;
        if (typeLimit && usage > typeLimit * 0.8) {
          recommendations.push(`${type} storage usage is high (${this.formatBytes(usage)} / ${this.formatBytes(typeLimit)})`);
        }
      }

      return {
        status,
        message,
        quota,
        recommendations
      };
    } catch (error) {
      throw new DatabaseError('Failed to get storage health', error as Error);
    }
  }

  // Cleanup
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  async close(): Promise<void> {
    this.stopAutoCleanup();
    await this.runCleanup(); // Final cleanup
  }
}