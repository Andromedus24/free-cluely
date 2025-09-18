// File System Sync Adapter Implementation
// =======================================

import { SyncAdapter, SettingsData, SyncAdapterConfig } from '../../types';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface FileSystemSyncAdapterConfig extends SyncAdapterConfig {
  basePath: string;
  fileName?: string;
  backupPath?: string;
  autoCreatePath?: boolean;
  fileFormat?: 'json' | 'yaml' | 'env';
  compression?: boolean;
  encryption?: boolean;
  watchChanges?: boolean;
  hashAlgorithm?: string;
}

export interface FileSystemMetadata {
  path: string;
  size: number;
  modified: number;
  created: number;
  hash: string;
  format: string;
  compressed: boolean;
  encrypted: boolean;
}

export class FileSystemSyncAdapter implements SyncAdapter {
  private config: FileSystemSyncAdapterConfig;
  private isWatching: boolean = false;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private cache: Map<string, { data: SettingsData; metadata: FileSystemMetadata; timestamp: number }> = new Map();

  constructor(config: FileSystemSyncAdapterConfig) {
    this.config = {
      fileName: 'settings.json',
      autoCreatePath: true,
      fileFormat: 'json',
      compression: false,
      encryption: false,
      watchChanges: true,
      hashAlgorithm: 'sha256',
      ...config
    };

    this.initializeFileSystem();
  }

  private async initializeFileSystem(): Promise<void> {
    try {
      // Ensure base path exists
      if (this.config.autoCreatePath) {
        await fs.mkdir(this.config.basePath, { recursive: true });
      }

      // Set up file watching if enabled
      if (this.config.watchChanges) {
        await this.startWatching();
      }
    } catch (error) {
      throw new Error(`Failed to initialize file system adapter: ${(error as Error).message}`);
    }
  }

  private async startWatching(): Promise<void> {
    if (this.isWatching) return;

    const filePath = this.getFilePath();

    try {
      // Ensure file exists before watching
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, create it
        await this.writeData({}, filePath);
      }

      const watcher = fs.watch(filePath, { persistent: false }, (eventType) => {
        if (eventType === 'change') {
          this.handleFileChange(filePath);
        }
      });

      this.watchers.set(filePath, watcher);
      this.isWatching = true;
    } catch (error) {
      console.warn('Failed to watch file changes:', error);
    }
  }

  private stopWatching(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.isWatching = false;
  }

  private handleFileChange(filePath: string): void {
    // Clear cache for this file
    this.cache.delete(filePath);

    // Emit change event if this adapter has event emitter capability
    if (typeof this.emit === 'function') {
      this.emit('file-changed', { path: filePath, timestamp: Date.now() });
    }
  }

  private getFilePath(): string {
    return path.join(this.config.basePath, this.config.fileName!);
  }

  private async writeData(data: SettingsData, filePath: string): Promise<void> {
    let content = this.serializeData(data);

    // Apply compression if enabled
    if (this.config.compression) {
      content = await this.compress(content);
    }

    // Apply encryption if enabled
    if (this.config.encryption) {
      content = await this.encrypt(content);
    }

    // Write to file
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async readData(filePath: string): Promise<SettingsData> {
    let content = await fs.readFile(filePath, 'utf-8');

    // Apply decryption if enabled
    if (this.config.encryption) {
      content = await this.decrypt(content);
    }

    // Apply decompression if enabled
    if (this.config.compression) {
      content = await this.decompress(content);
    }

    return this.deserializeData(content);
  }

  private serializeData(data: SettingsData): string {
    switch (this.config.fileFormat) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'yaml':
        // For now, use JSON format for YAML (would need yaml library)
        return JSON.stringify(data, null, 2);
      case 'env':
        return this.serializeToEnv(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private deserializeData(content: string): SettingsData {
    switch (this.config.fileFormat) {
      case 'json':
        return JSON.parse(content);
      case 'yaml':
        // For now, use JSON format for YAML (would need yaml library)
        return JSON.parse(content);
      case 'env':
        return this.deserializeFromEnv(content);
      default:
        return JSON.parse(content);
    }
  }

  private serializeToEnv(data: SettingsData): string {
    const lines: string[] = [];

    const flattenObject = (obj: any, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flattenObject(value, fullKey);
        } else {
          const stringValue = String(value).replace(/"/g, '\\"');
          lines.push(`${fullKey}="${stringValue}"`);
        }
      }
    };

    flattenObject(data);
    return lines.join('\n');
  }

  private deserializeFromEnv(content: string): SettingsData {
    const result: any = {};
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = match[2].replace(/^"|"$/g, '').replace(/\\"/g, '"');

        // Parse nested keys (e.g., 'profile_name' -> profile.name)
        const parts = key.split('_');
        let current = result;

        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }

        // Try to parse as different types
        if (value === 'true' || value === 'false') {
          current[parts[parts.length - 1]] = value === 'true';
        } else (!isNaN(Number(value))) {
          current[parts[parts.length - 1]] = Number(value);
        } else {
          current[parts[parts.length - 1]] = value;
        }
      }
    }

    return result;
  }

  private async compress(content: string): Promise<string> {
    // Simple compression simulation
    // In a real implementation, you'd use zlib or similar
    return `compressed:${Buffer.from(content).toString('base64')}`;
  }

  private async decompress(content: string): Promise<string> {
    if (content.startsWith('compressed:')) {
      return Buffer.from(content.slice(11), 'base64').toString('utf-8');
    }
    return content;
  }

  private async encrypt(content: string): Promise<string> {
    // Simple encryption simulation
    // In a real implementation, you'd use crypto.createCipher
    return `encrypted:${content}`;
  }

  private async decrypt(content: string): Promise<string> {
    if (content.startsWith('encrypted:')) {
      return content.slice(10);
    }
    return content;
  }

  private async calculateHash(content: string): Promise<string> {
    return crypto.createHash(this.config.hashAlgorithm!).update(content).digest('hex');
  }

  private async getFileMetadata(filePath: string): Promise<FileSystemMetadata> {
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const hash = await this.calculateHash(content);

    return {
      path: filePath,
      size: stats.size,
      modified: stats.mtime.getTime(),
      created: stats.birthtime.getTime(),
      hash,
      format: this.config.fileFormat!,
      compressed: !!this.config.compression,
      encrypted: !!this.config.encryption
    };
  }

  async sync(data: SettingsData, operationId?: string): Promise<void> {
    const filePath = this.getFilePath();
    const backupPath = this.config.backupPath;

    try {
      // Create backup if needed
      if (backupPath) {
        try {
          const backupFileName = `${path.basename(filePath)}.backup.${Date.now()}`;
          const backupFilePath = path.join(backupPath, backupFileName);
          await fs.mkdir(backupPath, { recursive: true });
          await fs.copyFile(filePath, backupFilePath);
        } catch (error) {
          console.warn('Failed to create backup:', error);
        }
      }

      // Write the data
      await this.writeData(data, filePath);

      // Update cache
      const metadata = await this.getFileMetadata(filePath);
      this.cache.set(filePath, {
        data,
        metadata,
        timestamp: Date.now()
      });

      // Emit sync event
      if (typeof this.emit === 'function') {
        this.emit('sync-completed', { operationId, filePath, metadata });
      }
    } catch (error) {
      if (typeof this.emit === 'function') {
        this.emit('sync-failed', { operationId, filePath, error: (error as Error).message });
      }
      throw new Error(`File system sync failed: ${(error as Error).message}`);
    }
  }

  async pull(operationId?: string): Promise<SettingsData> {
    const filePath = this.getFilePath();

    try {
      // Check cache first
      const cached = this.cache.get(filePath);
      if (cached && Date.now() - cached.timestamp < 30000) { // 30 second cache
        return cached.data;
      }

      // Read from file
      const data = await this.readData(filePath);
      const metadata = await this.getFileMetadata(filePath);

      // Update cache
      this.cache.set(filePath, {
        data,
        metadata,
        timestamp: Date.now()
      });

      // Emit pull event
      if (typeof this.emit === 'function') {
        this.emit('pull-completed', { operationId, filePath, metadata });
      }

      return data;
    } catch (error) {
      // If file doesn't exist, return empty object
      if ((error as any).code === 'ENOENT') {
        return {};
      }

      if (typeof this.emit === 'function') {
        this.emit('pull-failed', { operationId, filePath, error: (error as Error).message });
      }
      throw new Error(`File system pull failed: ${(error as Error).message}`);
    }
  }

  async getConflictResolution(localData: SettingsData, remoteData: SettingsData): Promise<SettingsData> {
    const filePath = this.getFilePath();

    try {
      const fileStats = await fs.stat(filePath);
      const cached = this.cache.get(filePath);

      if (cached && cached.metadata.modified > fileStats.mtime.getTime()) {
        // Local cache is newer
        return localData;
      } else if (cached && cached.metadata.modified < fileStats.mtime.getTime()) {
        // File is newer
        return remoteData;
      } else {
        // Same timestamp, merge
        return this.mergeData(localData, remoteData);
      }
    } catch {
      // Can't determine, use local
      return localData;
    }
  }

  async getMetadata(): Promise<any> {
    const filePath = this.getFilePath();

    try {
      const metadata = await this.getFileMetadata(filePath);
      const cached = this.cache.get(filePath);

      return {
        ...metadata,
        cached: !!cached,
        lastCacheUpdate: cached?.timestamp,
        watching: this.isWatching,
        watchers: Array.from(this.watchers.keys())
      };
    } catch (error) {
      return {
        error: (error as Error).message,
        path: filePath,
        watching: this.isWatching
      };
    }
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async testConnection(): Promise<boolean> {
    const filePath = this.getFilePath();

    try {
      // Test write
      const testData = { test: Date.now() };
      await this.writeData(testData, filePath);

      // Test read
      const readData = await this.readData(filePath);

      // Clean up
      if (readData.test === testData.test) {
        await fs.unlink(filePath);
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  private mergeData(local: SettingsData, remote: SettingsData): SettingsData {
    // Simple merge strategy
    return {
      ...remote,
      ...local,
      // For nested objects, merge recursively
      ...(local.metadata && remote.metadata && {
        metadata: {
          ...remote.metadata,
          ...local.metadata,
          updatedAt: Math.max(local.metadata.updatedAt || 0, remote.metadata.updatedAt || 0)
        }
      })
    };
  }

  // Configuration methods
  updateConfig(newConfig: Partial<FileSystemSyncAdapterConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Restart watching if configuration changed
    if (oldConfig.watchChanges !== this.config.watchChanges ||
        oldConfig.basePath !== this.config.basePath ||
        oldConfig.fileName !== this.config.fileName) {
      this.stopWatching();
      if (this.config.watchChanges) {
        this.startWatching();
      }
    }
  }

  getConfig(): FileSystemSyncAdapterConfig {
    return { ...this.config };
  }

  getStatus(): { watching: boolean; cacheSize: number; filePaths: string[] } {
    return {
      watching: this.isWatching,
      cacheSize: this.cache.size,
      filePaths: Array.from(this.cache.keys())
    };
  }

  // Cleanup
  destroy(): void {
    this.stopWatching();
    this.cache.clear();
  }
}