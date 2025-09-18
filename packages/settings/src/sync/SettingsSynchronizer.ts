// Settings Synchronizer Implementation
// ==================================

import { EventEmitter } from 'events';
import { SettingsData, SyncAdapter, SyncConflict, SyncStats, SettingsEvent } from '../types';
import { deepMergeSettings } from '../index';

interface SyncOperation {
  id: string;
  type: 'push' | 'pull' | 'merge';
  timestamp: number;
  data: SettingsData;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
  retryCount: number;
}

interface SyncQueueItem {
  id: string;
  operation: SyncOperation;
  priority: number;
  scheduledAt: number;
}

export interface SettingsSynchronizerConfig {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'merge';
  maxRetries: number;
  retryDelay: number; // milliseconds
  batchSize: number;
  timeout: number; // milliseconds
  enableCompression: boolean;
  enableEncryption: boolean;
  offlineSupport: boolean;
  syncOnStart: boolean;
  syncOnResume: boolean;
  syncOnNetworkChange: boolean;
}

export class SettingsSynchronizer extends EventEmitter {
  private config: SettingsSynchronizerConfig;
  private adapters: Map<string, SyncAdapter> = new Map();
  private operationQueue: SyncQueueItem[] = [];
  private activeOperations: Map<string, SyncOperation> = new Map();
  private syncStats: SyncStats = {
    lastSync: null,
    lastSuccess: null,
    lastFailure: null,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    conflictsResolved: 0,
    bytesTransferred: 0,
    averageSyncTime: 0
  };
  private isOnline: boolean = true;
  private syncTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false;

  constructor(config: Partial<SettingsSynchronizerConfig> = {}) {
    super();

    this.config = {
      autoSync: true,
      syncInterval: 300000, // 5 minutes
      conflictResolution: 'local-wins',
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      batchSize: 10,
      timeout: 30000, // 30 seconds
      enableCompression: true,
      enableEncryption: false,
      offlineSupport: true,
      syncOnStart: true,
      syncOnResume: true,
      syncOnNetworkChange: true,
      ...config
    };

    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }

    // Listen for page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.config.syncOnResume) {
          this.triggerSync();
        }
      });
    }
  }

  // Adapter management
  addAdapter(name: string, adapter: SyncAdapter): void {
    this.adapters.set(name, adapter);
    this.emit('adapter-added', { name, adapter });
  }

  removeAdapter(name: string): void {
    const adapter = this.adapters.get(name);
    if (adapter) {
      this.adapters.delete(name);
      this.emit('adapter-removed', { name, adapter });
    }
  }

  getAdapter(name: string): SyncAdapter | undefined {
    return this.adapters.get(name);
  }

  getAllAdapters(): Map<string, SyncAdapter> {
    return new Map(this.adapters);
  }

  // Synchronization methods
  async sync(settingsData: SettingsData, adapterNames?: string[]): Promise<SyncStats> {
    const targetAdapters = adapterNames
      ? adapterNames.map(name => this.adapters.get(name)).filter(Boolean) as SyncAdapter[]
      : Array.from(this.adapters.values());

    if (targetAdapters.length === 0) {
      throw new Error('No sync adapters available');
    }

    const operationId = this.generateOperationId();
    const startTime = Date.now();

    const operation: SyncOperation = {
      id: operationId,
      type: 'push',
      timestamp: startTime,
      data: settingsData,
      status: 'in-progress',
      retryCount: 0
    };

    this.activeOperations.set(operationId, operation);
    this.emit('sync-started', { operationId, operation });

    try {
      // Perform sync with all adapters
      const syncPromises = targetAdapters.map(adapter => this.syncWithAdapter(adapter, settingsData, operationId));
      const results = await Promise.allSettled(syncPromises);

      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      const successes = results.filter(result => result.status === 'fulfilled');

      // Update stats
      this.syncStats.totalSyncs++;
      this.syncStats.lastSync = Date.now();

      if (failures.length === 0) {
        this.syncStats.successfulSyncs++;
        this.syncStats.lastSuccess = Date.now();
        operation.status = 'completed';
        this.emit('sync-completed', { operationId, operation, results });
      } else {
        this.syncStats.failedSyncs++;
        this.syncStats.lastFailure = Date.now();
        operation.status = 'failed';
        operation.error = `${failures.length} adapter(s) failed to sync`;
        this.emit('sync-failed', { operationId, operation, errors: failures });
      }

      // Calculate average sync time
      const syncTime = Date.now() - startTime;
      this.syncStats.averageSyncTime = this.syncStats.averageSyncTime > 0
        ? (this.syncStats.averageSyncTime + syncTime) / 2
        : syncTime;

      return { ...this.syncStats };
    } catch (error) {
      this.syncStats.failedSyncs++;
      this.syncStats.lastFailure = Date.now();
      operation.status = 'failed';
      operation.error = (error as Error).message;
      this.emit('sync-failed', { operationId, operation, error });
      throw error;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  private async syncWithAdapter(adapter: SyncAdapter, data: SettingsData, operationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Sync operation timed out'));
      }, this.config.timeout);

      adapter.sync(data, operationId)
        .then(() => {
          clearTimeout(timeoutId);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  async pull(adapterNames?: string[]): Promise<SettingsData> {
    const targetAdapters = adapterNames
      ? adapterNames.map(name => this.adapters.get(name)).filter(Boolean) as SyncAdapter[]
      : Array.from(this.adapters.values());

    if (targetAdapters.length === 0) {
      throw new Error('No sync adapters available');
    }

    const operationId = this.generateOperationId();
    const startTime = Date.now();

    const operation: SyncOperation = {
      id: operationId,
      type: 'pull',
      timestamp: startTime,
      data: {},
      status: 'in-progress',
      retryCount: 0
    };

    this.activeOperations.set(operationId, operation);
    this.emit('pull-started', { operationId, operation });

    try {
      // Pull data from all adapters
      const pullPromises = targetAdapters.map(adapter => adapter.pull(operationId));
      const results = await Promise.allSettled(pullPromises);

      // Merge results
      const mergedData: SettingsData = {};
      let hasData = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          deepMergeSettings(mergedData, result.value);
          hasData = true;
        }
      });

      if (!hasData) {
        throw new Error('No data received from any adapter');
      }

      operation.data = mergedData;
      operation.status = 'completed';
      this.emit('pull-completed', { operationId, operation, data: mergedData });

      return mergedData;
    } catch (error) {
      operation.status = 'failed';
      operation.error = (error as Error).message;
      this.emit('pull-failed', { operationId, operation, error });
      throw error;
    } finally {
      this.activeOperations.delete(operationId);
    }
  }

  async resolveConflicts(conflicts: SyncConflict[]): Promise<SyncConflict[]> {
    const resolvedConflicts: SyncConflict[] = [];

    for (const conflict of conflicts) {
      try {
        let resolvedValue: any;

        switch (this.config.conflictResolution) {
          case 'local-wins':
            resolvedValue = conflict.localValue;
            break;
          case 'remote-wins':
            resolvedValue = conflict.remoteValue;
            break;
          case 'merge':
            resolvedValue = this.mergeValues(conflict.localValue, conflict.remoteValue);
            break;
          case 'manual':
            // For manual resolution, we'll emit an event and wait for external resolution
            this.emit('conflict-detected', conflict);
            resolvedConflict.push(conflict);
            continue;
          default:
            resolvedValue = conflict.localValue;
        }

        const resolvedConflict: SyncConflict = {
          ...conflict,
          resolvedValue,
          resolvedAt: Date.now(),
          resolutionStrategy: this.config.conflictResolution
        };

        resolvedConflicts.push(resolvedConflict);
        this.syncStats.conflictsResolved++;
      } catch (error) {
        this.emit('conflict-resolution-failed', { conflict, error });
      }
    }

    return resolvedConflicts;
  }

  private mergeValues(local: any, remote: any): any {
    if (typeof local === 'object' && typeof remote === 'object' &&
        local !== null && remote !== null && !Array.isArray(local) && !Array.isArray(remote)) {
      return deepMergeSettings(local, remote);
    }
    return local; // Default to local for primitive types
  }

  // Queue management
  private addToQueue(operation: SyncOperation, priority: number = 0): void {
    const queueItem: SyncQueueItem = {
      id: this.generateOperationId(),
      operation,
      priority,
      scheduledAt: Date.now()
    };

    this.operationQueue.push(queueItem);
    this.operationQueue.sort((a, b) => b.priority - a.priority);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.operationQueue.splice(0, this.config.batchSize);

      for (const item of batch) {
        try {
          await this.processOperation(item.operation);
        } catch (error) {
          if (item.operation.retryCount < this.config.maxRetries) {
            // Retry with exponential backoff
            item.operation.retryCount++;
            item.scheduledAt = Date.now() + (this.config.retryDelay * Math.pow(2, item.operation.retryCount));
            this.operationQueue.push(item);
          } else {
            item.operation.status = 'failed';
            item.operation.error = (error as Error).message;
            this.emit('operation-failed', { operation: item.operation, error });
          }
        }
      }
    } finally {
      this.isProcessing = false;

      if (this.operationQueue.length > 0) {
        // Process next batch
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'in-progress';
    this.emit('operation-started', { operation });

    try {
      switch (operation.type) {
        case 'push':
          await this.sync(operation.data);
          break;
        case 'pull':
          await this.pull();
          break;
        case 'merge':
          // Merge operations are handled during conflict resolution
          break;
      }

      operation.status = 'completed';
      this.emit('operation-completed', { operation });
    } catch (error) {
      operation.status = 'failed';
      operation.error = (error as Error).message;
      throw error;
    }
  }

  // Auto-sync management
  startAutoSync(): void {
    if (this.syncTimer) {
      this.stopAutoSync();
    }

    if (this.config.autoSync) {
      this.syncTimer = setInterval(() => {
        this.triggerSync();
      }, this.config.syncInterval);

      if (this.config.syncOnStart) {
        this.triggerSync();
      }
    }
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  triggerSync(): void {
    if (this.isOnline || !this.config.offlineSupport) {
      this.emit('sync-triggered', { timestamp: Date.now() });
    }
  }

  // Network status handlers
  private handleOnline(): void {
    this.isOnline = true;
    this.emit('online');

    if (this.config.syncOnNetworkChange) {
      this.triggerSync();
    }
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.emit('offline');
  }

  // Utility methods
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats(): SyncStats {
    return { ...this.syncStats };
  }

  getQueueStatus(): { pending: number; active: number; failed: number } {
    const pending = this.operationQueue.length;
    const active = this.activeOperations.size;
    const failed = this.operationQueue.filter(item => item.operation.status === 'failed').length;

    return { pending, active, failed };
  }

  isSynchronizing(): boolean {
    return this.activeOperations.size > 0 || this.isProcessing;
  }

  getOperationHistory(limit: number = 50): SyncOperation[] {
    const allOperations = [
      ...Array.from(this.activeOperations.values()),
      ...this.operationQueue.map(item => item.operation)
    ];

    return allOperations
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Configuration methods
  updateConfig(newConfig: Partial<SettingsSynchronizerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Restart auto-sync if configuration changed
    if (oldConfig.autoSync !== this.config.autoSync ||
        oldConfig.syncInterval !== this.config.syncInterval) {
      this.startAutoSync();
    }

    this.emit('config-updated', { oldConfig, newConfig: this.config });
  }

  getConfig(): SettingsSynchronizerConfig {
    return { ...this.config };
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSync();
    this.removeAllListeners();
    this.adapters.clear();
    this.operationQueue = [];
    this.activeOperations.clear();
  }
}