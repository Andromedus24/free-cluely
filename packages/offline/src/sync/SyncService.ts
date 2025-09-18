// Synchronization Service
// =======================

import { EventEmitter } from 'events';
import { ISyncService, SyncResult, SyncStatus, SyncHealth, SyncHistory, OfflineOperation } from '../types';
import { IStorageService } from '../storage/StorageService';

/**
 * Sync Service Configuration
 */
export interface SyncServiceConfig {
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  enableRealtimeSync: boolean;
  enableDeltaSync: boolean;
  enableCompression: boolean;
  timeout: number;
  syncEndpoints: Record<string, string>;
  headers?: Record<string, string>;
  enableConflictDetection: boolean;
  enableSelectiveSync: boolean;
  prioritySync: string[];
  enableOfflineMode: boolean;
  enableOptimisticUpdates: boolean;
  enableBackgroundSync: boolean;
  syncStrategies: Record<string, SyncStrategy>;
}

/**
 * Sync Strategy
 */
export interface SyncStrategy {
  type: 'full' | 'delta' | 'incremental' | 'batch';
  priority: 'low' | 'medium' | 'high';
  conditions: SyncCondition[];
  conflictResolution: 'local_wins' | 'server_wins' | 'merge' | 'manual';
  retryPolicy: RetryPolicy;
}

/**
 * Sync Condition
 */
export interface SyncCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: any;
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

/**
 * Sync Service Implementation
 */
export class SyncService extends EventEmitter implements ISyncService {
  private config: SyncServiceConfig;
  private storage: IStorageService;
  private syncQueue: OfflineOperation[] = [];
  private syncHistory: SyncHistory[] = [];
  private syncStatus: SyncStatus;
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private networkInfo: any = null;

  constructor(config: SyncServiceConfig, storage: IStorageService) {
    super();
    this.config = config;
    this.storage = storage;

    this.syncStatus = {
      isSyncing: false,
      lastSyncTime: null,
      nextSyncTime: null,
      pendingOperations: 0,
      failedOperations: 0,
      syncQueue: []
    };

    // Initialize network info if available
    if ('connection' in navigator) {
      this.networkInfo = (navigator as any).connection;
      this.setupNetworkListeners();
    }
  }

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load pending operations from storage
      await this.loadPendingOperations();

      // Load sync history
      await this.loadSyncHistory();

      // Setup sync interval
      if (this.config.enableBackgroundSync && this.config.syncInterval > 0) {
        this.syncInterval = setInterval(() => this.backgroundSync(), this.config.syncInterval);
      }

      this.isInitialized = true;
      this.emit('initialized');

      // Initial sync if online
      if (navigator.onLine) {
        await this.syncPendingOperations();
      }

    } catch (error) {
      this.emit('syncError', error);
      throw error;
    }
  }

  /**
   * Setup network listeners
   */
  private setupNetworkListeners(): void {
    this.networkInfo.addEventListener('change', () => {
      this.handleNetworkChange();
    });

    window.addEventListener('online', () => {
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.handleOffline();
    });
  }

  /**
   * Handle network change
   */
  private handleNetworkChange(): void {
    this.emit('networkChange', {
      online: navigator.onLine,
      effectiveType: this.networkInfo?.effectiveType,
      downlink: this.networkInfo?.downlink,
      rtt: this.networkInfo?.rtt
    });

    // Adjust sync behavior based on network conditions
    if (this.networkInfo?.effectiveType === 'slow-2g' || this.networkInfo?.effectiveType === '2g') {
      this.adjustSyncForPoorNetwork();
    }
  }

  /**
   * Handle online status
   */
  private async handleOnline(): Promise<void> {
    this.emit('online');

    // Start sync when coming back online
    if (this.config.enableBackgroundSync) {
      await this.syncPendingOperations();
    }
  }

  /**
   * Handle offline status
   */
  private handleOffline(): void {
    this.emit('offline');
    this.stopSyncInterval();
  }

  /**
   * Sync pending operations
   */
  async syncPendingOperations(): Promise<SyncResult> {
    if (this.isSyncing || !navigator.onLine) {
      return {
        success: false,
        operationsSynced: 0,
        operationsFailed: 0,
        bytesSynced: 0,
        duration: 0,
        conflicts: [],
        errors: [new Error('Cannot sync while offline or already syncing')],
        timestamp: new Date()
      };
    }

    const startTime = Date.now();
    this.isSyncing = true;
    this.syncStatus.isSyncing = true;

    try {
      this.emit('syncStart');

      // Get operations to sync
      const operationsToSync = await this.getOperationsToSync();

      if (operationsToSync.length === 0) {
        this.isSyncing = false;
        this.syncStatus.isSyncing = false;
        this.emit('syncComplete', {
          success: true,
          operationsSynced: 0,
          duration: Date.now() - startTime
        });
        return {
          success: true,
          operationsSynced: 0,
          operationsFailed: 0,
          bytesSynced: 0,
          duration: Date.now() - startTime,
          conflicts: [],
          errors: [],
          timestamp: new Date()
        };
      }

      // Sync operations
      const result = await this.syncOperations(operationsToSync);

      // Update sync status
      this.syncStatus.isSyncing = false;
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.nextSyncTime = new Date(Date.now() + this.config.syncInterval);
      this.syncStatus.pendingOperations = this.syncQueue.length;
      this.syncStatus.failedOperations = this.syncQueue.filter(op => op.status === 'failed').length;

      // Record sync history
      await this.recordSyncHistory(result);

      this.isSyncing = false;
      this.emit('syncComplete', result);

      return result;

    } catch (error) {
      this.isSyncing = false;
      this.syncStatus.isSyncing = false;
      this.emit('syncError', error);

      return {
        success: false,
        operationsSynced: 0,
        operationsFailed: this.syncQueue.length,
        bytesSynced: 0,
        duration: Date.now() - startTime,
        conflicts: [],
        errors: [error],
        timestamp: new Date()
      };
    }
  }

  /**
   * Sync all data
   */
  async syncAll(): Promise<SyncResult> {
    return this.syncPendingOperations();
  }

  /**
   * Sync specific entity
   */
  async syncEntity(entity: string, entityId: string): Promise<SyncResult> {
    const operations = this.syncQueue.filter(op =>
      op.entity === entity && op.entityId === entityId
    );

    if (operations.length === 0) {
      return {
        success: true,
        operationsSynced: 0,
        operationsFailed: 0,
        bytesSynced: 0,
        duration: 0,
        conflicts: [],
        errors: [],
        timestamp: new Date()
      };
    }

    return this.syncOperations(operations);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return { ...this.syncStatus };
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<SyncHealth> {
    const issues: any[] = [];
    const recommendations: string[] = [];

    // Check if there are failed operations
    const failedOps = this.syncQueue.filter(op => op.status === 'failed');
    if (failedOps.length > 0) {
      issues.push({
        id: 'failed_operations',
        type: 'error',
        severity: 'high',
        message: `${failedOps.length} operations failed to sync`,
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Review and retry failed operations');
    }

    // Check sync queue size
    if (this.syncQueue.length > 100) {
      issues.push({
        id: 'large_sync_queue',
        type: 'warning',
        severity: 'medium',
        message: `Large sync queue: ${this.syncQueue.length} operations`,
        timestamp: new Date(),
        resolved: false
      });
      recommendations.push('Consider increasing sync frequency or batch size');
    }

    // Check network conditions
    if (!navigator.onLine) {
      issues.push({
        id: 'offline',
        type: 'info',
        severity: 'low',
        message: 'Currently offline',
        timestamp: new Date(),
        resolved: false
      });
    }

    // Check last sync time
    if (this.syncStatus.lastSyncTime) {
      const timeSinceLastSync = Date.now() - this.syncStatus.lastSyncTime.getTime();
      if (timeSinceLastSync > 24 * 60 * 60 * 1000) { // 24 hours
        issues.push({
          id: 'stale_sync',
          type: 'warning',
          severity: 'medium',
          message: 'Data has not been synced in over 24 hours',
          timestamp: new Date(),
          resolved: false
        });
        recommendations.push('Ensure regular sync intervals are maintained');
      }
    }

    // Determine overall health
    let health: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (issues.some(issue => issue.severity === 'high')) {
      health = 'critical';
    } else if (issues.some(issue => issue.severity === 'medium')) {
      health = 'degraded';
    }

    return {
      health,
      lastCheckTime: new Date(),
      issues,
      recommendations
    };
  }

  /**
   * Pause sync
   */
  async pauseSync(): Promise<void> {
    this.stopSyncInterval();
    this.emit('syncPaused');
  }

  /**
   * Resume sync
   */
  async resumeSync(): Promise<void> {
    if (this.config.enableBackgroundSync) {
      this.startSyncInterval();
    }
    this.emit('syncResumed');
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<SyncResult> {
    return this.syncAll();
  }

  /**
   * Get sync history
   */
  async getSyncHistory(): Promise<SyncHistory[]> {
    return [...this.syncHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear sync history
   */
  async clearSyncHistory(): Promise<void> {
    this.syncHistory = [];
    await this.saveSyncHistory();
    this.emit('syncHistoryCleared');
  }

  /**
   * Background sync
   */
  private async backgroundSync(): Promise<void> {
    if (!this.config.enableBackgroundSync || this.isSyncing) {
      return;
    }

    try {
      await this.syncPendingOperations();
    } catch (error) {
      this.emit('backgroundSyncError', error);
    }
  }

  /**
   * Get operations to sync
   */
  private async getOperationsToSync(): Promise<OfflineOperation[]> {
    // Filter operations based on priority and conditions
    let operations = [...this.syncQueue];

    // Filter by priority sync if enabled
    if (this.config.enableSelectiveSync && this.config.prioritySync.length > 0) {
      operations = operations.filter(op =>
        this.config.prioritySync.includes(op.entity)
      );
    }

    // Sort by priority and timestamp
    operations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp.getTime() - b.timestamp.getTime();
    });

    // Apply batch size limit
    return operations.slice(0, this.config.batchSize);
  }

  /**
   * Sync operations
   */
  private async syncOperations(operations: OfflineOperation[]): Promise<SyncResult> {
    const startTime = Date.now();
    let operationsSynced = 0;
    let operationsFailed = 0;
    let bytesSynced = 0;
    const conflicts: any[] = [];
    const errors: Error[] = [];

    // Process operations in batches
    for (const operation of operations) {
      try {
        const result = await this.syncOperation(operation);

        if (result.success) {
          operationsSynced++;
          bytesSynced += result.bytesTransferred || 0;
          this.removeFromSyncQueue(operation.id);
        } else {
          operationsFailed++;
          if (result.conflict) {
            conflicts.push(result.conflict);
          }
          if (result.error) {
            errors.push(result.error);
          }
          this.updateOperationStatus(operation.id, 'failed', result.error?.message);
        }

      } catch (error) {
        operationsFailed++;
        errors.push(error);
        this.updateOperationStatus(operation.id, 'failed', error.message);
      }
    }

    // Save updated sync queue
    await this.savePendingOperations();

    return {
      success: operationsFailed === 0,
      operationsSynced,
      operationsFailed,
      bytesSynced,
      duration: Date.now() - startTime,
      conflicts,
      errors,
      timestamp: new Date()
    };
  }

  /**
   * Sync individual operation
   */
  private async syncOperation(operation: OfflineOperation): Promise<{
    success: boolean;
    bytesTransferred?: number;
    conflict?: any;
    error?: Error;
  }> {
    const endpoint = this.config.syncEndpoints[operation.entity];
    if (!endpoint) {
      return {
        success: false,
        error: new Error(`No sync endpoint configured for entity: ${operation.entity}`)
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      ...this.config.headers
    };

    const payload = {
      id: operation.entityId,
      type: operation.type,
      data: operation.data,
      timestamp: operation.timestamp.toISOString(),
      metadata: operation.metadata
    };

    try {
      // Apply compression if enabled
      let body = JSON.stringify(payload);
      let bytesTransferred = body.length;

      if (this.config.enableCompression) {
        // In a real implementation, apply compression here
        // body = compress(body);
      }

      const response = await fetch(endpoint, {
        method: operation.type === 'delete' ? 'DELETE' : 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Check for conflicts
      if (result.conflict) {
        return {
          success: false,
          conflict: result.conflict,
          bytesTransferred
        };
      }

      return {
        success: true,
        bytesTransferred
      };

    } catch (error) {
      // Handle retry logic
      if (operation.retryCount < this.config.maxRetries) {
        operation.retryCount++;
        this.updateOperationStatus(operation.id, 'retrying');

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, operation.retryCount - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.syncOperation(operation);
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Load pending operations
   */
  private async loadPendingOperations(): Promise<void> {
    try {
      const operations = await this.storage.loadPendingOperations();
      this.syncQueue = operations.map(op => ({
        ...op,
        timestamp: new Date(op.timestamp)
      }));
      this.syncStatus.pendingOperations = this.syncQueue.length;
    } catch (error) {
      this.emit('loadOperationsError', error);
    }
  }

  /**
   * Save pending operations
   */
  private async savePendingOperations(): Promise<void> {
    try {
      await this.storage.savePendingOperations(this.syncQueue);
    } catch (error) {
      this.emit('saveOperationsError', error);
    }
  }

  /**
   * Load sync history
   */
  private async loadSyncHistory(): Promise<void> {
    try {
      const history = await this.storage.load<any[]>('sync_history');
      this.syncHistory = history.map(h => ({
        ...h,
        timestamp: new Date(h.timestamp)
      }));
    } catch (error) {
      // Sync history might not exist, that's okay
    }
  }

  /**
   * Save sync history
   */
  private async saveSyncHistory(): Promise<void> {
    try {
      await this.storage.save('sync_history', this.syncHistory);
    } catch (error) {
      this.emit('saveHistoryError', error);
    }
  }

  /**
   * Record sync history
   */
  private async recordSyncHistory(result: SyncResult): Promise<void> {
    const historyEntry: SyncHistory = {
      id: `sync_${Date.now()}`,
      timestamp: result.timestamp,
      duration: result.duration,
      operationsSynced: result.operationsSynced,
      operationsFailed: result.operationsFailed,
      bytesSynced: result.bytesSynced,
      success: result.success,
      errors: result.errors.map(e => e.message)
    };

    this.syncHistory.push(historyEntry);

    // Keep only last 100 sync history entries
    if (this.syncHistory.length > 100) {
      this.syncHistory = this.syncHistory.slice(-100);
    }

    await this.saveSyncHistory();
  }

  /**
   * Add operation to sync queue
   */
  public addOperation(operation: OfflineOperation): void {
    this.syncQueue.push(operation);
    this.syncStatus.pendingOperations = this.syncQueue.length;
    this.savePendingOperations();
    this.emit('operationAdded', operation);
  }

  /**
   * Remove operation from sync queue
   */
  private removeFromSyncQueue(operationId: string): void {
    this.syncQueue = this.syncQueue.filter(op => op.id !== operationId);
    this.syncStatus.pendingOperations = this.syncQueue.length;
    this.emit('operationRemoved', operationId);
  }

  /**
   * Update operation status
   */
  private updateOperationStatus(operationId: string, status: string, error?: string): void {
    const operation = this.syncQueue.find(op => op.id === operationId);
    if (operation) {
      operation.status = status as any;
      operation.error = error;
      this.emit('operationStatusUpdated', operation);
    }
  }

  /**
   * Adjust sync for poor network conditions
   */
  private adjustSyncForPoorNetwork(): void {
    // Reduce batch size for poor network
    this.config.batchSize = Math.max(1, Math.floor(this.config.batchSize / 2));

    // Increase timeout
    this.config.timeout = Math.min(60000, this.config.timeout * 2);

    // Reduce retry frequency
    this.config.retryDelay = Math.min(30000, this.config.retryDelay * 2);
  }

  /**
   * Start sync interval
   */
  private startSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.config.enableBackgroundSync && this.config.syncInterval > 0) {
      this.syncInterval = setInterval(() => this.backgroundSync(), this.config.syncInterval);
    }
  }

  /**
   * Stop sync interval
   */
  private stopSyncInterval(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Destroy sync service
   */
  async destroy(): Promise<void> {
    this.stopSyncInterval();

    if (this.networkInfo) {
      this.networkInfo.removeEventListener('change', () => this.handleNetworkChange());
    }

    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());

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