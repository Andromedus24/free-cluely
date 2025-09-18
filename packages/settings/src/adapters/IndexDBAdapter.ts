// IndexedDB Adapter Implementation
// =================================

import {
  StorageAdapter,
  SettingsData,
  SettingsMetadata,
  EncryptionConfig
} from '../types';

interface IndexedDBConfig {
  databaseName: string;
  version: number;
  storeName: string;
  keyPath: string;
  encryptionConfig?: EncryptionConfig;
}

export class IndexedDBAdapter implements StorageAdapter {
  private config: IndexedDBConfig;
  private db: IDBDatabase | null = null;

  constructor(config: Partial<IndexedDBConfig> = {}) {
    this.config = {
      databaseName: config.databaseName || 'AtlasSettings',
      version: config.version || 1,
      storeName: config.storeName || 'settings',
      keyPath: config.keyPath || 'id',
      encryptionConfig: config.encryptionConfig
    };
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.databaseName, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create settings store
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: this.config.keyPath,
            autoIncrement: true
          });

          // Create indexes for better performance
          store.createIndex('timestamp', 'metadata.updatedAt', { unique: false });
          store.createIndex('version', 'version', { unique: false });
          store.createIndex('checksum', 'metadata.checksum', { unique: false });
        }

        // Create backups store
        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', {
            keyPath: 'id',
            autoIncrement: true
          });
          backupStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async load(): Promise<SettingsData> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get('current');

      request.onerror = () => {
        reject(new Error(`Failed to load settings: ${request.error}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error('No settings found'));
          return;
        }

        if (!result.data) {
          reject(new Error('Invalid settings format'));
          return;
        }

        resolve(result.data);
      };
    });
  }

  async save(data: SettingsData): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);

      const record = {
        id: 'current',
        data: data,
        timestamp: Date.now(),
        version: data.version,
        checksum: this.generateChecksum(data)
      };

      const request = store.put(record);

      request.onerror = () => {
        reject(new Error(`Failed to save settings: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async delete(): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.delete('current');

      request.onerror = () => {
        reject(new Error(`Failed to delete settings: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async exists(): Promise<boolean> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.get('current');

      request.onerror = () => {
        resolve(false);
      };

      request.onsuccess = () => {
        resolve(!!request.result);
      };
    });
  }

  async backup(): Promise<string> {
    await this.ensureDB();

    const data = await this.load();
    const backup = {
      id: `backup_${Date.now()}`,
      timestamp: Date.now(),
      version: data.version,
      data: data,
      checksum: this.generateChecksum(data)
    };

    // Save to backups store
    await this.saveBackup(backup);

    return JSON.stringify(backup);
  }

  async restore(backup: string): Promise<void> {
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
  }

  async getBackups(): Promise<Array<{ id: string; timestamp: number; version: string; size: number }>> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readonly');
      const store = transaction.objectStore('backups');
      const request = store.getAll();

      request.onerror = () => {
        reject(new Error(`Failed to get backups: ${request.error}`));
      };

      request.onsuccess = () => {
        const backups = request.result.map((backup: any) => ({
          id: backup.id,
          timestamp: backup.timestamp,
          version: backup.version,
          size: JSON.stringify(backup).length
        }));

        // Sort by timestamp (newest first)
        backups.sort((a, b) => b.timestamp - a.timestamp);

        resolve(backups);
      };
    });
  }

  async clearBackups(): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear backups: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async deleteBackup(backupId: string): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.delete(backupId);

      request.onerror = () => {
        reject(new Error(`Failed to delete backup: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  async getStorageInfo(): Promise<{
    used: number;
    total: number;
    available: number;
    items: number;
  }> {
    await this.ensureDB();

    // Estimate IndexedDB usage (this is approximate)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          total: estimate.quota || 0,
          available: (estimate.quota || 0) - (estimate.usage || 0),
          items: await this.getItemCount()
        };
      } catch (error) {
        // Fallback to manual estimation
      }
    }

    // Fallback estimation
    return {
      used: await this.estimateUsage(),
      total: 50 * 1024 * 1024, // 50MB typical limit
      available: 0,
      items: await this.getItemCount()
    };
  }

  async optimize(): Promise<void> {
    await this.ensureDB();

    // Remove old backups (keep only last 10)
    const backups = await this.getBackups();
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      for (const backup of toDelete) {
        await this.deleteBackup(backup.id);
      }
    }

    // Compact the database if supported
    if (this.db && 'close' in this.db) {
      this.db.close();
      await this.initialize();
    }
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }
  }

  private async saveBackup(backup: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['backups'], 'readwrite');
      const store = transaction.objectStore('backups');
      const request = store.add(backup);

      request.onerror = () => {
        reject(new Error(`Failed to save backup: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  private async getItemCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.count();

      request.onerror = () => {
        reject(new Error(`Failed to count items: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  private async estimateUsage(): Promise<number> {
    try {
      // Get all records and estimate their size
      const transaction = this.db!.transaction([this.config.storeName], 'readonly');
      const store = transaction.objectStore(this.config.storeName);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error(`Failed to estimate usage: ${request.error}`));
        };

        request.onsuccess = () => {
          const items = request.result;
          const totalSize = items.reduce((size: number, item: any) => {
            return size + JSON.stringify(item).length * 2; // Approximate bytes
          }, 0);
          resolve(totalSize);
        };
      });
    } catch (error) {
      return 0;
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

  // Static utility methods
  static async isAvailable(): Promise<boolean> {
    try {
      return 'indexedDB' in window;
    } catch {
      return false;
    }
  }

  static async getDatabaseInfo(databaseName: string): Promise<{
    name: string;
    version: number;
    objectStoreNames: string[];
  }> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        const db = request.result;
        const info = {
          name: db.name,
          version: db.version,
          objectStoreNames: Array.from(db.objectStoreNames)
        };
        db.close();
        resolve(info);
      };
    });
  }

  static async deleteDatabase(databaseName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);

      request.onerror = () => {
        reject(new Error(`Failed to delete database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}