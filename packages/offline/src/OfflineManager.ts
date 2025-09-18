// Offline Manager - Core Architecture
// ===================================

import { EventEmitter } from 'events';
import { IStorageService } from '../storage/StorageService';
import { ISyncService } from '../sync/SyncService';
import { IConflictResolver } from '../conflict/ConflictResolver';
import { IOfflineUI } from '../ui/OfflineUI';
import { IQueueService } from '../queue/QueueService';
import { IAnalyticsService } from '../analytics/AnalyticsService';

/**
 * Offline Manager Configuration
 */
export interface OfflineManagerConfig {
  enableOfflineMode: boolean;
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableBackgroundSync: boolean;
  enableConflictResolution: boolean;
  enableCompression: boolean;
  maxStorageSize: number;
  cacheStrategy: 'memory' | 'indexeddb' | 'both';
  offlineTimeout: number;
  enableOptimisticUpdates: boolean;
  enableRealtimeSync: boolean;
  syncBatchSize: number;
  enableDataEncryption: boolean;
  enableSelectiveSync: boolean;
  prioritySync: string[];
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  enableTelemetry: boolean;
  enableDiagnostics: boolean;
}

/**
 * Offline Status
 */
export interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  hasConflicts: boolean;
  lastSyncTime: Date | null;
  nextSyncTime: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  batteryStatus: 'charging' | 'discharging' | 'critical';
  storageStatus: 'normal' | 'low' | 'critical';
  syncHealth: 'healthy' | 'degraded' | 'critical';
}

/**
 * Offline Statistics
 */
export interface OfflineStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageSyncTime: number;
  lastSyncDuration: number;
  dataSynced: number;
  conflictsResolved: number;
  pendingOperations: number;
  cacheHits: number;
  cacheMisses: number;
  storageUsed: number;
  storageAvailable: number;
  batteryLevel: number;
  networkLatency: number;
}

/**
 * Offline Operation
 */
export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync';
  entity: string;
  entityId: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  error?: string;
  dependencies?: string[];
  metadata?: any;
}

/**
 * Offline Manager
 */
export class OfflineManager extends EventEmitter {
  private config: OfflineManagerConfig;
  private storage: IStorageService;
  private sync: ISyncService;
  private conflictResolver: IConflictResolver;
  private ui: IOfflineUI;
  private queue: IQueueService;
  private analytics: IAnalyticsService;

  private status: OfflineStatus;
  private stats: OfflineStats;
  private operations: Map<string, OfflineOperation> = new Map();
  private syncInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(
    config: OfflineManagerConfig,
    storage: IStorageService,
    sync: ISyncService,
    conflictResolver: IConflictResolver,
    ui: IOfflineUI,
    queue: IQueueService,
    analytics: IAnalyticsService
  ) {
    super();
    this.config = config;
    this.storage = storage;
    this.sync = sync;
    this.conflictResolver = conflictResolver;
    this.ui = ui;
    this.queue = queue;
    this.analytics = analytics;

    this.status = {
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      isSyncing: false,
      hasPendingChanges: false,
      hasConflicts: false,
      lastSyncTime: null,
      nextSyncTime: null,
      connectionQuality: 'excellent',
      batteryStatus: 'discharging',
      storageStatus: 'normal',
      syncHealth: 'healthy'
    };

    this.stats = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageSyncTime: 0,
      lastSyncDuration: 0,
      dataSynced: 0,
      conflictsResolved: 0,
      pendingOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      storageUsed: 0,
      storageAvailable: 0,
      batteryLevel: 100,
      networkLatency: 0
    };
  }

  /**
   * Initialize offline manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize storage
      await this.storage.initialize();

      // Load pending operations
      await this.loadPendingOperations();

      // Setup event listeners
      this.setupEventListeners();

      // Initialize sync service
      await this.sync.initialize();

      // Initialize conflict resolver
      await this.conflictResolver.initialize();

      // Initialize UI
      await this.ui.initialize();

      // Initialize queue service
      await this.queue.initialize();

      // Initialize analytics
      await this.analytics.initialize();

      // Start background processes
      this.startBackgroundProcesses();

      this.isInitialized = true;
      this.emit('initialized');

      // Check initial status
      await this.checkStatus();

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Network status
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        battery.addEventListener('chargingchange', () => this.updateBatteryStatus(battery));
        battery.addEventListener('levelchange', () => this.updateBatteryStatus(battery));
      });
    }

    // Storage events
    this.storage.on('storageError', (error) => this.handleStorageError(error));
    this.storage.on('storageFull', () => this.handleStorageFull());

    // Sync events
    this.sync.on('syncStart', () => this.handleSyncStart());
    this.sync.on('syncComplete', (data) => this.handleSyncComplete(data));
    this.sync.on('syncError', (error) => this.handleSyncError(error));

    // Conflict events
    this.conflictResolver.on('conflictDetected', (conflict) => this.handleConflictDetected(conflict));
    this.conflictResolver.on('conflictResolved', (resolution) => this.handleConflictResolved(resolution));

    // Queue events
    this.queue.on('operationQueued', (operation) => this.handleOperationQueued(operation));
    this.queue.on('operationCompleted', (operation) => this.handleOperationCompleted(operation));
    this.queue.on('operationFailed', (operation, error) => this.handleOperationFailed(operation, error));

    // UI events
    this.ui.on('retryOperation', (operationId) => this.retryOperation(operationId));
    this.ui.on('cancelOperation', (operationId) => this.cancelOperation(operationId));
    this.ui.on('manualSync', () => this.manualSync());
    this.ui.on('clearConflicts', () => this.clearConflicts());
  }

  /**
   * Start background processes
   */
  private startBackgroundProcesses(): void {
    if (this.config.enableBackgroundSync) {
      this.syncInterval = setInterval(() => this.backgroundSync(), this.config.syncInterval);
    }

    if (this.config.enableHealthChecks) {
      this.healthCheckInterval = setInterval(() => this.healthCheck(), this.config.healthCheckInterval);
    }
  }

  /**
   * Stop background processes
   */
  private stopBackgroundProcesses(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Handle online status
   */
  private async handleOnline(): Promise<void> {
    this.status.isOnline = true;
    this.status.isOffline = false;
    this.updateConnectionQuality();
    this.emit('online');

    // Sync pending operations when coming back online
    if (this.config.enableBackgroundSync) {
      await this.backgroundSync();
    }
  }

  /**
   * Handle offline status
   */
  private async handleOffline(): Promise<void> {
    this.status.isOnline = false;
    this.status.isOffline = true;
    this.status.connectionQuality = 'offline';
    this.emit('offline');

    // Notify UI
    await this.ui.showOfflineNotification();
  }

  /**
   * Handle sync start
   */
  private async handleSyncStart(): Promise<void> {
    this.status.isSyncing = true;
    this.emit('syncStart');
    await this.ui.showSyncProgress();
  }

  /**
   * Handle sync complete
   */
  private async handleSyncComplete(data: any): Promise<void> {
    this.status.isSyncing = false;
    this.status.lastSyncTime = new Date();
    this.status.nextSyncTime = new Date(Date.now() + this.config.syncInterval);

    // Update stats
    this.stats.lastSyncDuration = data.duration;
    this.stats.dataSynced += data.bytesSynced;
    this.stats.averageSyncTime = this.calculateAverageSyncTime();

    this.emit('syncComplete', data);
    await this.ui.hideSyncProgress();
  }

  /**
   * Handle sync error
   */
  private async handleSyncError(error: Error): Promise<void> {
    this.status.isSyncing = false;
    this.status.syncHealth = 'degraded';
    this.emit('syncError', error);
    await this.ui.showSyncError(error);
  }

  /**
   * Handle conflict detected
   */
  private async handleConflictDetected(conflict: any): Promise<void> {
    this.status.hasConflicts = true;
    this.emit('conflictDetected', conflict);
    await this.ui.showConflictDialog(conflict);
  }

  /**
   * Handle conflict resolved
   */
  private async handleConflictResolved(resolution: any): Promise<void> {
    this.stats.conflictsResolved++;
    if (this.conflictResolver.getConflicts().length === 0) {
      this.status.hasConflicts = false;
    }
    this.emit('conflictResolved', resolution);
    await this.ui.hideConflictDialog();
  }

  /**
   * Handle operation queued
   */
  private async handleOperationQueued(operation: OfflineOperation): Promise<void> {
    this.operations.set(operation.id, operation);
    this.status.hasPendingChanges = true;
    this.stats.pendingOperations++;
    this.emit('operationQueued', operation);
    await this.ui.updatePendingOperations(this.stats.pendingOperations);
  }

  /**
   * Handle operation completed
   */
  private async handleOperationCompleted(operation: OfflineOperation): Promise<void> {
    this.operations.delete(operation.id);
    this.stats.pendingOperations--;
    this.stats.successfulOperations++;

    if (this.operations.size === 0) {
      this.status.hasPendingChanges = false;
    }

    this.emit('operationCompleted', operation);
    await this.ui.updatePendingOperations(this.stats.pendingOperations);
  }

  /**
   * Handle operation failed
   */
  private async handleOperationFailed(operation: OfflineOperation, error: Error): Promise<void> {
    this.stats.failedOperations++;
    this.emit('operationFailed', operation, error);

    // Auto-retry if configured
    if (operation.retryCount < operation.maxRetries) {
      await this.retryOperation(operation.id);
    } else {
      await this.ui.showOperationError(operation, error);
    }
  }

  /**
   * Handle storage error
   */
  private async handleStorageError(error: Error): Promise<void> {
    this.emit('storageError', error);
    await this.ui.showStorageError(error);
  }

  /**
   * Handle storage full
   */
  private async handleStorageFull(): Promise<void> {
    this.status.storageStatus = 'critical';
    this.emit('storageFull');
    await this.ui.showStorageFullWarning();
  }

  /**
   * Update battery status
   */
  private async updateBatteryStatus(battery: any): Promise<void> {
    this.stats.batteryLevel = battery.level * 100;
    this.status.batteryStatus = battery.charging ? 'charging' :
                               battery.level < 0.2 ? 'critical' : 'discharging';

    // Adjust sync behavior based on battery
    if (this.status.batteryStatus === 'critical' && this.config.enableBackgroundSync) {
      this.stopBackgroundProcesses();
    } else if (this.status.batteryStatus !== 'critical' && !this.syncInterval) {
      this.startBackgroundProcesses();
    }
  }

  /**
   * Update connection quality
   */
  private async updateConnectionQuality(): Promise<void> {
    if (!navigator.onLine) {
      this.status.connectionQuality = 'offline';
      return;
    }

    // Simple connection quality assessment
    try {
      const startTime = Date.now();
      await fetch('/ping', { method: 'HEAD', cache: 'no-cache' });
      const latency = Date.now() - startTime;
      this.stats.networkLatency = latency;

      if (latency < 100) {
        this.status.connectionQuality = 'excellent';
      } else if (latency < 500) {
        this.status.connectionQuality = 'good';
      } else {
        this.status.connectionQuality = 'poor';
      }
    } catch (error) {
      this.status.connectionQuality = 'poor';
    }
  }

  /**
   * Background sync
   */
  private async backgroundSync(): Promise<void> {
    if (!this.status.isOnline || this.status.isSyncing) return;

    // Check battery and storage status
    if (this.status.batteryStatus === 'critical' || this.status.storageStatus === 'critical') {
      return;
    }

    try {
      await this.sync.syncPendingOperations();
    } catch (error) {
      this.emit('backgroundSyncError', error);
    }
  }

  /**
   * Manual sync
   */
  public async manualSync(): Promise<void> {
    if (!this.status.isOnline) {
      await this.ui.showOfflineError();
      return;
    }

    try {
      await this.sync.syncAll();
    } catch (error) {
      this.emit('manualSyncError', error);
      await this.ui.showSyncError(error);
    }
  }

  /**
   * Retry operation
   */
  public async retryOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.retryCount++;
    operation.status = 'retrying';

    try {
      await this.queue.retryOperation(operationId);
    } catch (error) {
      this.emit('retryOperationError', operation, error);
    }
  }

  /**
   * Cancel operation
   */
  public async cancelOperation(operationId: string): Promise<void> {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    operation.status = 'failed';
    operation.error = 'Cancelled by user';

    try {
      await this.queue.cancelOperation(operationId);
    } catch (error) {
      this.emit('cancelOperationError', operation, error);
    }
  }

  /**
   * Clear conflicts
   */
  public async clearConflicts(): Promise<void> {
    try {
      await this.conflictResolver.clearConflicts();
      this.status.hasConflicts = false;
      this.emit('conflictsCleared');
    } catch (error) {
      this.emit('clearConflictsError', error);
    }
  }

  /**
   * Health check
   */
  private async healthCheck(): Promise<void> {
    try {
      // Check storage status
      const storageInfo = await this.storage.getStorageInfo();
      this.stats.storageUsed = storageInfo.used;
      this.stats.storageAvailable = storageInfo.available;

      if (storageInfo.available < this.config.maxStorageSize * 0.1) {
        this.status.storageStatus = 'critical';
      } else if (storageInfo.available < this.config.maxStorageSize * 0.3) {
        this.status.storageStatus = 'low';
      } else {
        this.status.storageStatus = 'normal';
      }

      // Check sync health
      const syncHealth = await this.sync.getHealthStatus();
      this.status.syncHealth = syncHealth.health;

      // Update connection quality
      await this.updateConnectionQuality();

      this.emit('healthCheckComplete', {
        status: this.status,
        stats: this.stats
      });

    } catch (error) {
      this.emit('healthCheckError', error);
    }
  }

  /**
   * Check current status
   */
  public async checkStatus(): Promise<OfflineStatus> {
    await this.updateConnectionQuality();
    return this.status;
  }

  /**
   * Get statistics
   */
  public getStats(): OfflineStats {
    return { ...this.stats };
  }

  /**
   * Get pending operations
   */
  public getPendingOperations(): OfflineOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Load pending operations
   */
  private async loadPendingOperations(): Promise<void> {
    try {
      const savedOperations = await this.storage.loadPendingOperations();
      savedOperations.forEach((operation: OfflineOperation) => {
        this.operations.set(operation.id, operation);
      });

      this.status.hasPendingChanges = savedOperations.length > 0;
      this.stats.pendingOperations = savedOperations.length;
    } catch (error) {
      this.emit('loadOperationsError', error);
    }
  }

  /**
   * Calculate average sync time
   */
  private calculateAverageSyncTime(): number {
    // This would be calculated from historical sync data
    return this.stats.lastSyncDuration;
  }

  /**
   * Enable offline mode
   */
  public async enableOfflineMode(): Promise<void> {
    this.config.enableOfflineMode = true;
    this.emit('offlineModeEnabled');
    await this.ui.showOfflineModeEnabled();
  }

  /**
   * Disable offline mode
   */
  public async disableOfflineMode(): Promise<void> {
    this.config.enableOfflineMode = false;
    this.emit('offlineModeDisabled');
    await this.ui.showOfflineModeDisabled();
  }

  /**
   * Configure settings
   */
  public async configure(settings: Partial<OfflineManagerConfig>): Promise<void> {
    this.config = { ...this.config, ...settings };

    // Restart background processes if needed
    if (this.config.enableBackgroundSync && !this.syncInterval) {
      this.startBackgroundProcesses();
    } else if (!this.config.enableBackgroundSync && this.syncInterval) {
      this.stopBackgroundProcesses();
    }

    this.emit('configurationChanged', this.config);
  }

  /**
   * Get configuration
   */
  public getConfig(): OfflineManagerConfig {
    return { ...this.config };
  }

  /**
   * Destroy offline manager
   */
  public async destroy(): Promise<void> {
    this.stopBackgroundProcesses();

    // Remove event listeners
    window.removeEventListener('online', () => this.handleOnline());
    window.removeEventListener('offline', () => this.handleOffline());

    // Cleanup services
    await this.storage.destroy();
    await this.sync.destroy();
    await this.conflictResolver.destroy();
    await this.ui.destroy();
    await this.queue.destroy();
    await this.analytics.destroy();

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