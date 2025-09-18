// Local Data Storage Service
// =========================

import { EventEmitter } from 'events';
import { IStorageService, StorageInfo } from '../types';

/**
 * Storage Service Configuration
 */
export interface StorageServiceConfig {
  storageType: 'indexeddb' | 'localstorage' | 'memory';
  databaseName?: string;
  version?: number;
  enableCompression?: boolean;
  enableEncryption?: boolean;
  encryptionKey?: string;
  maxSize?: number;
  ttl?: number;
  cleanupInterval?: number;
  enableWAL?: boolean;
  enableCache?: boolean;
  cacheSize?: number;
}

/**
 * Storage Service Implementation
 */
export class StorageService extends EventEmitter implements IStorageService {
  private config: StorageServiceConfig;
  private db: IDBDatabase | null = null;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: StorageServiceConfig) {
    super();
    this.config = {
      storageType: 'indexeddb',
      databaseName: 'atlas_offline_db',
      version: 1,
      enableCompression: true,
      enableEncryption: false,
      maxSize: 100 * 1024 * 1024, // 100MB
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      enableWAL: true,
      enableCache: true,
      cacheSize: 1000,
      ...config
    };
  }

  /**
   * Initialize storage service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      switch (this.config.storageType) {
        case 'indexeddb':
          await this.initializeIndexedDB();
          break;
        case 'localstorage':
          await this.initializeLocalStorage();
          break;
        case 'memory':
          await this.initializeMemoryStorage();
          break;
        default:
          throw new Error(`Unsupported storage type: ${this.config.storageType}`);
      }

      // Start cleanup process
      if (this.config.cleanupInterval) {
        this.cleanupInterval = setInterval(() => this.cleanup(), this.config.cleanupInterval);
      }

      this.isInitialized = true;
      this.emit('initialized');

    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Initialize IndexedDB storage
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.databaseName!, this.config.version!);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Setup event handlers
        this.db.onversionchange = () => {
          this.db?.close();
          this.emit('versionChange');
        };

        this.db.onclose = () => {
          this.emit('databaseClosed');
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('data')) {
          const dataStore = db.createObjectStore('data', { keyPath: 'key' });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
          dataStore.createIndex('ttl', 'ttl', { unique: false });
        }

        if (!db.objectStoreNames.contains('operations')) {
          const operationsStore = db.createObjectStore('operations', { keyPath: 'id' });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          operationsStore.createIndex('status', 'status', { unique: false });
          operationsStore.createIndex('entity', 'entity', { unique: false });
        }

        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('ttl', 'ttl', { unique: false });
        }
      };
    });
  }

  /**
   * Initialize localStorage fallback
   */
  private async initializeLocalStorage(): Promise<void> {
    // Check if localStorage is available
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
    } catch (error) {
      throw new Error('localStorage is not available');
    }

    // Initialize metadata
    const metadata = this.loadLocalStorageMetadata();
    if (!metadata.version) {
      this.saveLocalStorageMetadata({
        version: 1,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
    }
  }

  /**
   * Initialize memory storage
   */
  private async initializeMemoryStorage(): Promise<void> {
    // Memory storage doesn't require initialization
    // Data is stored in memory and will be lost on refresh
  }

  /**
   * Save data to storage
   */
  async save<T>(key: string, data: T): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      const timestamp = Date.now();
      let processedData = data;

      // Compress data if enabled
      if (this.config.enableCompression) {
        processedData = await this.compress(data);
      }

      // Encrypt data if enabled
      if (this.config.enableEncryption && this.config.encryptionKey) {
        processedData = await this.encrypt(processedData, this.config.encryptionKey);
      }

      const storageItem = {
        key,
        data: processedData,
        timestamp,
        ttl: timestamp + (this.config.ttl || 0)
      };

      switch (this.config.storageType) {
        case 'indexeddb':
          await this.saveToIndexedDB(storageItem);
          break;
        case 'localstorage':
          await this.saveToLocalStorage(key, storageItem);
          break;
        case 'memory':
          await this.saveToMemory(key, storageItem);
          break;
      }

      // Update cache if enabled
      if (this.config.enableCache) {
        this.updateCache(key, data, timestamp);
      }

      // Check storage limits
      await this.checkStorageLimits();

      this.emit('dataSaved', { key, timestamp });

    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Load data from storage
   */
  async load<T>(key: string): Promise<T | null> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      // Check cache first
      if (this.config.enableCache) {
        const cached = this.getFromCache<T>(key);
        if (cached) {
          return cached;
        }
      }

      let storageItem: any;

      switch (this.config.storageType) {
        case 'indexeddb':
          storageItem = await this.loadFromIndexedDB(key);
          break;
        case 'localstorage':
          storageItem = await this.loadFromLocalStorage(key);
          break;
        case 'memory':
          storageItem = await this.loadFromMemory(key);
          break;
      }

      if (!storageItem) {
        return null;
      }

      // Check TTL
      if (storageItem.ttl && Date.now() > storageItem.ttl) {
        await this.delete(key);
        return null;
      }

      let data = storageItem.data;

      // Decrypt data if enabled
      if (this.config.enableEncryption && this.config.encryptionKey) {
        data = await this.decrypt(data, this.config.encryptionKey);
      }

      // Decompress data if enabled
      if (this.config.enableCompression) {
        data = await this.decompress(data);
      }

      // Update cache
      if (this.config.enableCache) {
        this.updateCache(key, data, storageItem.timestamp);
      }

      this.emit('dataLoaded', { key, timestamp: storageItem.timestamp });

      return data;

    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Delete data from storage
   */
  async delete(key: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      switch (this.config.storageType) {
        case 'indexeddb':
          await this.deleteFromIndexedDB(key);
          break;
        case 'localstorage':
          await this.deleteFromLocalStorage(key);
          break;
        case 'memory':
          await this.deleteFromMemory(key);
          break;
      }

      // Remove from cache
      this.cache.delete(key);

      this.emit('dataDeleted', { key });

    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Clear all data from storage
   */
  async clear(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      switch (this.config.storageType) {
        case 'indexeddb':
          await this.clearIndexedDB();
          break;
        case 'localstorage':
          await this.clearLocalStorage();
          break;
        case 'memory':
          await this.clearMemory();
          break;
      }

      // Clear cache
      this.cache.clear();

      this.emit('storageCleared');

    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Check if key exists in storage
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      switch (this.config.storageType) {
        case 'indexeddb':
          return await this.existsInIndexedDB(key);
        case 'localstorage':
          return await this.existsInLocalStorage(key);
        case 'memory':
          return await this.existsInMemory(key);
      }
    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Get storage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      let total = 0;
      let used = 0;
      let quota = 0;

      switch (this.config.storageType) {
        case 'indexeddb':
          ({ total, used, quota } = await this.getIndexedDBInfo());
          break;
        case 'localstorage':
          ({ total, used, quota } = await this.getLocalStorageInfo());
          break;
        case 'memory':
          ({ total, used, quota } = await this.getMemoryInfo());
          break;
      }

      const available = quota - used;
      const usage = quota > 0 ? used / quota : 0;

      return {
        total,
        used,
        available,
        quota,
        usage
      };

    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Load pending operations
   */
  async loadPendingOperations(): Promise<any[]> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      switch (this.config.storageType) {
        case 'indexeddb':
          return await this.loadOperationsFromIndexedDB();
        case 'localstorage':
          return await this.loadOperationsFromLocalStorage();
        case 'memory':
          return await this.loadOperationsFromMemory();
      }
    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Save pending operations
   */
  async savePendingOperations(operations: any[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Storage service not initialized');
    }

    try {
      switch (this.config.storageType) {
        case 'indexeddb':
          await this.saveOperationsToIndexedDB(operations);
          break;
        case 'localstorage':
          await this.saveOperationsToLocalStorage(operations);
          break;
        case 'memory':
          await this.saveOperationsToMemory(operations);
          break;
      }
    } catch (error) {
      this.emit('storageError', error);
      throw error;
    }
  }

  /**
   * Compress data
   */
  async compress(data: any): Promise<string> {
    // Simple compression using JSON and base64
    // In a real implementation, use a proper compression library
    const json = JSON.stringify(data);
    return btoa(json);
  }

  /**
   * Decompress data
   */
  async decompress(compressed: string): Promise<any> {
    // Simple decompression
    const json = atob(compressed);
    return JSON.parse(json);
  }

  /**
   * Encrypt data
   */
  async encrypt(data: any, key: string): Promise<string> {
    // Simple encryption (in production, use proper crypto)
    const json = JSON.stringify(data);
    return btoa(encodeURIComponent(json));
  }

  /**
   * Decrypt data
   */
  async decrypt(encrypted: string, key: string): Promise<any> {
    // Simple decryption
    const json = decodeURIComponent(atob(encrypted));
    return JSON.parse(json);
  }

  // IndexedDB helper methods
  private async saveToIndexedDB(item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromIndexedDB(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async existsInIndexedDB(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.getKey(key);

      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getIndexedDBInfo(): Promise<{ total: number; used: number; quota: number }> {
    // Estimate storage usage
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['data'], 'readonly');
      const store = transaction.objectStore('data');
      const request = store.getAll();

      request.onsuccess = () => {
        const dataSize = JSON.stringify(request.result).length;
        resolve({
          total: this.config.maxSize || 100 * 1024 * 1024,
          used: dataSize,
          quota: this.config.maxSize || 100 * 1024 * 1024
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async loadOperationsFromIndexedDB(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveOperationsToIndexedDB(operations: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');

      // Clear existing operations
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // Add new operations
        operations.forEach((op) => {
          store.add(op);
        });
        resolve();
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  // LocalStorage helper methods
  private async saveToLocalStorage(key: string, item: any): Promise<void> {
    localStorage.setItem(key, JSON.stringify(item));
  }

  private async loadFromLocalStorage(key: string): Promise<any> {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  private async deleteFromLocalStorage(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  private async clearLocalStorage(): Promise<void> {
    localStorage.clear();
  }

  private async existsInLocalStorage(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }

  private async getLocalStorageInfo(): Promise<{ total: number; used: number; quota: number }> {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length;
      }
    }

    return {
      total: 5 * 1024 * 1024, // 5MB typical localStorage limit
      used,
      quota: 5 * 1024 * 1024
    };
  }

  private async loadOperationsFromLocalStorage(): Promise<any[]> {
    const operations = localStorage.getItem('pending_operations');
    return operations ? JSON.parse(operations) : [];
  }

  private async saveOperationsToLocalStorage(operations: any[]): Promise<void> {
    localStorage.setItem('pending_operations', JSON.stringify(operations));
  }

  private loadLocalStorageMetadata(): any {
    const metadata = localStorage.getItem('storage_metadata');
    return metadata ? JSON.parse(metadata) : {};
  }

  private saveLocalStorageMetadata(metadata: any): void {
    localStorage.setItem('storage_metadata', JSON.stringify(metadata));
  }

  // Memory storage helper methods
  private memoryStorage: Map<string, any> = new Map();
  private memoryOperations: any[] = [];

  private async saveToMemory(key: string, item: any): Promise<void> {
    this.memoryStorage.set(key, item);
  }

  private async loadFromMemory(key: string): Promise<any> {
    return this.memoryStorage.get(key) || null;
  }

  private async deleteFromMemory(key: string): Promise<void> {
    this.memoryStorage.delete(key);
  }

  private async clearMemory(): Promise<void> {
    this.memoryStorage.clear();
  }

  private async existsInMemory(key: string): Promise<boolean> {
    return this.memoryStorage.has(key);
  }

  private async getMemoryInfo(): Promise<{ total: number; used: number; quota: number }> {
    const used = JSON.stringify(Array.from(this.memoryStorage.values())).length;
    return {
      total: 100 * 1024 * 1024, // 100MB memory limit
      used,
      quota: 100 * 1024 * 1024
    };
  }

  private async loadOperationsFromMemory(): Promise<any[]> {
    return [...this.memoryOperations];
  }

  private async saveOperationsToMemory(operations: any[]): Promise<void> {
    this.memoryOperations = [...operations];
  }

  // Cache helper methods
  private updateCache(key: string, data: any, timestamp: number): void {
    // Simple LRU cache eviction
    if (this.cache.size >= (this.config.cacheSize || 1000)) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp,
      ttl: timestamp + (this.config.ttl || 0)
    });
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (cached.ttl && Date.now() > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Utility methods
  private async checkStorageLimits(): Promise<void> {
    const info = await this.getStorageInfo();

    if (info.usage > 0.9) {
      this.emit('storageFull');

      // Auto-cleanup old data
      await this.cleanup();
    }
  }

  private async cleanup(): Promise<void> {
    try {
      const now = Date.now();

      switch (this.config.storageType) {
        case 'indexeddb':
          await this.cleanupIndexedDB(now);
          break;
        case 'localstorage':
          await this.cleanupLocalStorage(now);
          break;
        case 'memory':
          await this.cleanupMemory(now);
          break;
      }

      // Cleanup cache
      this.cleanupCache(now);

      this.emit('cleanupComplete');

    } catch (error) {
      this.emit('cleanupError', error);
    }
  }

  private async cleanupIndexedDB(now: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      const index = store.index('ttl');
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async cleanupLocalStorage(now: number): Promise<void> {
    const keysToRemove: string[] = [];

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key !== 'storage_metadata') {
        try {
          const item = JSON.parse(localStorage.getItem(key)!);
          if (item.ttl && now > item.ttl) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Invalid JSON, remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  private async cleanupMemory(now: number): Promise<void> {
    for (let [key, item] of this.memoryStorage.entries()) {
      if (item.ttl && now > item.ttl) {
        this.memoryStorage.delete(key);
      }
    }
  }

  private cleanupCache(now: number): void {
    for (let [key, item] of this.cache.entries()) {
      if (item.ttl && now > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy storage service
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    if (this.db) {
      this.db.close();
      this.db = null;
    }

    this.cache.clear();
    this.memoryStorage.clear();
    this.memoryOperations = [];

    this.isInitialized = false;
    this.emit('destroyed');
  }

  /**
   * Check if initialized
   */
  public isInitializedCheck(): boolean {
    return this.isInitialized;
  }
}