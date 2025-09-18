// LocalStorage Adapter Implementation
// ==================================

import {
  StorageAdapter,
  SettingsData,
  SettingsMetadata,
  EncryptionConfig
} from '../types';

export class LocalStorageAdapter implements StorageAdapter {
  private storageKey: string;
  private backupKey: string;
  private encryptionConfig?: EncryptionConfig;

  constructor(
    storageKey: string = 'atlas-settings',
    backupKey: string = 'atlas-settings-backup',
    encryptionConfig?: EncryptionConfig
  ) {
    this.storageKey = storageKey;
    this.backupKey = backupKey;
    this.encryptionConfig = encryptionConfig;
  }

  async load(): Promise<SettingsData> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        throw new Error('No settings found in localStorage');
      }

      const data = JSON.parse(stored);

      // Basic validation
      if (!data.version || !data.profile || !data.metadata) {
        throw new Error('Invalid settings format');
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to load settings from localStorage: ${error}`);
    }
  }

  async save(data: SettingsData): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      throw new Error(`Failed to save settings to localStorage: ${error}`);
    }
  }

  async delete(): Promise<void> {
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.backupKey);
    } catch (error) {
      throw new Error(`Failed to delete settings from localStorage: ${error}`);
    }
  }

  async exists(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored !== null;
    } catch (error) {
      return false;
    }
  }

  async backup(): Promise<string> {
    try {
      const data = await this.load();
      const backup = {
        timestamp: Date.now(),
        version: data.version,
        data: data,
        checksum: this.generateChecksum(data)
      };

      const serialized = JSON.stringify(backup);
      localStorage.setItem(this.backupKey, serialized);

      return serialized;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async restore(backup: string): Promise<void> {
    try {
      const backupData = JSON.parse(backup);

      // Validate backup structure
      if (!backupData.timestamp || !backupData.data) {
        throw new Error('Invalid backup format');
      }

      // Verify checksum
      if (backupData.checksum !== this.generateChecksum(backupData.data)) {
        throw new Error('Backup checksum verification failed');
      }

      await this.save(backupData.data);
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error}`);
    }
  }

  async getBackups(): Promise<Array<{ timestamp: number; version: string; size: number }>> {
    try {
      const backup = localStorage.getItem(this.backupKey);
      if (!backup) {
        return [];
      }

      const backupData = JSON.parse(backup);
      return [{
        timestamp: backupData.timestamp,
        version: backupData.version,
        size: backup.length
      }];
    } catch (error) {
      return [];
    }
  }

  async clearBackups(): Promise<void> {
    try {
      localStorage.removeItem(this.backupKey);
    } catch (error) {
      throw new Error(`Failed to clear backups: ${error}`);
    }
  }

  async getStorageInfo(): Promise<{
    used: number;
    total: number;
    available: number;
    items: number;
  }> {
    try {
      let totalSize = 0;
      let itemCount = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
            itemCount++;
          }
        }
      }

      // localStorage typically has 5MB limit
      const totalSizeBytes = totalSize * 2; // Approximate bytes (2 bytes per char)
      const totalLimit = 5 * 1024 * 1024; // 5MB

      return {
        used: totalSizeBytes,
        total: totalLimit,
        available: totalLimit - totalSizeBytes,
        items: itemCount
      };
    } catch (error) {
      throw new Error(`Failed to get storage info: ${error}`);
    }
  }

  private generateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // Utility methods for quota management
  async checkQuota(): Promise<{
    ok: boolean;
    used: number;
    available: number;
    percentage: number;
  }> {
    try {
      const info = await this.getStorageInfo();
      const percentage = (info.used / info.total) * 100;

      return {
        ok: percentage < 90, // Warning at 90%
        used: info.used,
        available: info.available,
        percentage
      };
    } catch (error) {
      return {
        ok: false,
        used: 0,
        available: 0,
        percentage: 100
      };
    }
  }

  async optimize(): Promise<void> {
    try {
      // Remove expired backups older than 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const backup = localStorage.getItem(this.backupKey);

      if (backup) {
        const backupData = JSON.parse(backup);
        if (backupData.timestamp < thirtyDaysAgo) {
          localStorage.removeItem(this.backupKey);
        }
      }

      // Compact storage by removing old or invalid items
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('atlas-') && key !== this.storageKey) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              JSON.parse(value); // Validate JSON
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Silently ignore optimization errors
    }
  }

  // Static utility methods
  static async isAvailable(): Promise<boolean> {
    try {
      const testKey = '__atlas_storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  static async getQuotaUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    try {
      let totalSize = 0;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        }
      }

      const totalSizeBytes = totalSize * 2;
      const totalLimit = 5 * 1024 * 1024; // 5MB
      const percentage = (totalSizeBytes / totalLimit) * 100;

      return {
        used: totalSizeBytes,
        total: totalLimit,
        percentage
      };
    } catch {
      return {
        used: 0,
        total: 5 * 1024 * 1024,
        percentage: 0
      };
    }
  }
}