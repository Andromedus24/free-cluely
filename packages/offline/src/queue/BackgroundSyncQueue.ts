// Background Sync and Queue Service
// ================================

import { EventEmitter } from 'events';
import { OfflineOperation } from '../types';
import { IStorageService } from '../storage/StorageService';
import { ISyncService } from '../sync/SyncService';

/**
 * Queue Priority
 */
export type QueuePriority = 'critical' | 'high' | 'medium' | 'low' | 'background';

/**
 * Queue Strategy
 */
export type QueueStrategy = 'fifo' | 'lifo' | 'priority' | 'weighted' | 'round_robin';

/**
 * Queue Processing Mode
 */
export type ProcessingMode = 'immediate' | 'batch' | 'scheduled' | 'event_driven';

/**
 * Queue Configuration
 */
export interface QueueConfig {
  maxQueueSize: number;
  processingMode: ProcessingMode;
  queueStrategy: QueueStrategy;
  batchSize: number;
  processingInterval: number;
  retryPolicy: RetryPolicy;
  priorityWeights: Record<QueuePriority, number>;
  enableCompression: boolean;
  enableDeduplication: boolean;
  enableDependencyTracking: boolean;
  enableThrottling: boolean;
  throttleConfig: ThrottleConfig;
  memoryLimit: number;
  persistenceEnabled: boolean;
  enableMetrics: boolean;
  enableNotifications: boolean;
}

/**
 * Retry Policy
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryConditions: RetryCondition[];
}

/**
 * Retry Condition
 */
export interface RetryCondition {
  type: 'network_error' | 'timeout' | 'server_error' | 'rate_limit' | 'conflict';
  maxRetries: number;
  customCondition?: (error: Error) => boolean;
}

/**
 * Throttle Configuration
 */
export interface ThrottleConfig {
  maxOperationsPerSecond: number;
  maxConcurrentOperations: number;
  burstSize: number;
  windowSize: number;
  adaptiveThrottling: boolean;
  networkAwareThrottling: boolean;
}

/**
 * Queue Metrics
 */
export interface QueueMetrics {
  totalOperations: number;
  pendingOperations: number;
  processingOperations: number;
  completedOperations: number;
  failedOperations: number;
  retryOperations: number;
  averageProcessingTime: number;
  averageWaitTime: number;
  throughput: number;
  errorRate: number;
  queueUtilization: number;
  memoryUsage: number;
  networkUtilization: number;
  lastProcessed: Date | null;
  nextProcessingTime: Date | null;
}

/**
 * Queue Item
 */
export interface QueueItem {
  id: string;
  operation: OfflineOperation;
  priority: QueuePriority;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'throttled';
  retryCount: number;
  maxRetries: number;
  dependencies: string[];
  estimatedSize: number;
  weight: number;
  nextAttempt: Date | null;
  lastAttempt: Date | null;
  error?: string;
  metadata?: any;
  processingStarted?: Date;
  processingDuration?: number;
  result?: any;
}

/**
 * Processing Context
 */
export interface ProcessingContext {
  queueItem: QueueItem;
  networkInfo: any;
  systemResources: SystemResources;
  retryCount: number;
  startTime: Date;
}

/**
 * System Resources
 */
export interface SystemResources {
  memory: {
    used: number;
    available: number;
    total: number;
  };
  storage: {
    used: number;
    available: number;
    total: number;
  };
  network: {
    online: boolean;
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  battery: {
    level: number;
    charging: boolean;
  };
}

/**
 * Queue Statistics
 */
export interface QueueStatistics {
  byPriority: Record<QueuePriority, {
    count: number;
    avgProcessingTime: number;
    successRate: number;
  }>;
  byType: Record<string, {
    count: number;
    avgProcessingTime: number;
    successRate: number;
  }>;
  byHour: Array<{
    hour: number;
    operations: number;
    successRate: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
    lastOccurrence: Date;
  }>;
  performance: {
    p50ProcessingTime: number;
    p95ProcessingTime: number;
    p99ProcessingTime: number;
    throughputTrend: 'increasing' | 'stable' | 'decreasing';
  };
}

/**
 * Background Sync and Queue Service
 */
export class BackgroundSyncQueue extends EventEmitter {
  private config: QueueConfig;
  private storage: IStorageService;
  private syncService: ISyncService;
  private queue: QueueItem[] = [];
  private processing = false;
  private initialized = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private metrics: QueueMetrics;
  private statistics: QueueStatistics;
  private throttleState: ThrottleState;
  private systemResources: SystemResources;
  private networkInfo: any;

  constructor(config: QueueConfig, storage: IStorageService, syncService: ISyncService) {
    super();
    this.config = config;
    this.storage = storage;
    this.syncService = syncService;

    // Initialize metrics
    this.metrics = this.initializeMetrics();
    this.statistics = this.initializeStatistics();
    this.throttleState = this.initializeThrottleState();
    this.systemResources = this.initializeSystemResources();

    // Setup network monitoring
    this.setupNetworkMonitoring();
    this.setupSystemResourceMonitoring();
  }

  /**
   * Initialize queue service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load persisted queue if enabled
      if (this.config.persistenceEnabled) {
        await this.loadPersistedQueue();
      }

      // Setup processing intervals
      this.setupProcessingIntervals();

      // Initialize background sync
      await this.initializeBackgroundSync();

      this.initialized = true;
      this.emit('initialized');

    } catch (error) {
      this.emit('initializationError', error);
      throw error;
    }
  }

  /**
   * Add operation to queue
   */
  async enqueue(
    operation: OfflineOperation,
    options: {
      priority?: QueuePriority;
      dependencies?: string[];
      metadata?: any;
    } = {}
  ): Promise<string> {
    const {
      priority = 'medium',
      dependencies = [],
      metadata = {}
    } = options;

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Queue is full');
    }

    // Check for duplicates if enabled
    if (this.config.enableDeduplication) {
      const duplicate = this.findDuplicate(operation);
      if (duplicate) {
        return duplicate.id;
      }
    }

    // Create queue item
    const queueItem: QueueItem = {
      id: this.generateId(),
      operation,
      priority,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0,
      maxRetries: this.config.retryPolicy.maxRetries,
      dependencies,
      estimatedSize: this.estimateOperationSize(operation),
      weight: this.config.priorityWeights[priority],
      nextAttempt: null,
      lastAttempt: null,
      metadata
    };

    // Add to queue
    this.queue.push(queueItem);
    this.updateMetrics();

    // Persist if enabled
    if (this.config.persistenceEnabled) {
      await this.persistQueue();
    }

    // Trigger processing if in immediate mode
    if (this.config.processingMode === 'immediate' && !this.processing) {
      this.processQueue();
    }

    this.emit('enqueued', queueItem);
    return queueItem.id;
  }

  /**
   * Remove operation from queue
   */
  async dequeue(operationId: string): Promise<boolean> {
    const index = this.queue.findIndex(item => item.id === operationId);
    if (index === -1) {
      return false;
    }

    const item = this.queue[index];

    // Check if item is currently processing
    if (item.status === 'processing') {
      throw new Error('Cannot remove item that is currently processing');
    }

    this.queue.splice(index, 1);
    this.updateMetrics();

    // Persist if enabled
    if (this.config.persistenceEnabled) {
      await this.persistQueue();
    }

    this.emit('dequeued', item);
    return true;
  }

  /**
   * Retry failed operation
   */
  async retry(operationId: string): Promise<boolean> {
    const item = this.queue.find(item => item.id === operationId);
    if (!item) {
      return false;
    }

    if (item.status !== 'failed' && item.status !== 'retrying') {
      return false;
    }

    // Check retry limit
    if (item.retryCount >= item.maxRetries) {
      return false;
    }

    // Reset item for retry
    item.status = 'pending';
    item.retryCount++;
    item.nextAttempt = new Date(Date.now() + this.calculateRetryDelay(item.retryCount));
    item.error = undefined;

    this.updateMetrics();

    // Persist if enabled
    if (this.config.persistenceEnabled) {
      await this.persistQueue();
    }

    this.emit('retried', item);
    return true;
  }

  /**
   * Cancel operation
   */
  async cancel(operationId: string): Promise<boolean> {
    const item = this.queue.find(item => item.id === operationId);
    if (!item) {
      return false;
    }

    if (item.status === 'completed') {
      return false;
    }

    item.status = 'failed';
    item.error = 'Cancelled by user';

    this.updateMetrics();

    // Persist if enabled
    if (this.config.persistenceEnabled) {
      await this.persistQueue();
    }

    this.emit('cancelled', item);
    return true;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    size: number;
    processing: boolean;
    metrics: QueueMetrics;
    nextProcessingTime: Date | null;
  } {
    return {
      size: this.queue.length,
      processing: this.processing,
      metrics: { ...this.metrics },
      nextProcessingTime: this.getNextProcessingTime()
    };
  }

  /**
   * Get queue statistics
   */
  getStatistics(): QueueStatistics {
    return { ...this.statistics };
  }

  /**
   * Get operations by status
   */
  getOperationsByStatus(status: QueueItem['status']): QueueItem[] {
    return this.queue.filter(item => item.status === status);
  }

  /**
   * Clear queue
   */
  async clearQueue(options: {
    completedOnly?: boolean;
    failedOnly?: boolean;
    olderThan?: Date;
  } = {}): Promise<number> {
    const { completedOnly = false, failedOnly = false, olderThan } = options;

    let itemsToRemove: QueueItem[] = [];

    if (completedOnly) {
      itemsToRemove = this.queue.filter(item => item.status === 'completed');
    } else if (failedOnly) {
      itemsToRemove = this.queue.filter(item => item.status === 'failed');
    } else if (olderThan) {
      itemsToRemove = this.queue.filter(item => item.timestamp < olderThan);
    } else {
      itemsToRemove = [...this.queue];
    }

    const removedCount = itemsToRemove.length;

    // Remove items
    itemsToRemove.forEach(item => {
      const index = this.queue.indexOf(item);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
    });

    this.updateMetrics();

    // Persist if enabled
    if (this.config.persistenceEnabled) {
      await this.persistQueue();
    }

    this.emit('cleared', { removedCount, criteria: options });
    return removedCount;
  }

  /**
   * Process queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;
    this.emit('processingStarted');

    try {
      // Get items to process
      const itemsToProcess = this.getItemsToProcess();

      if (itemsToProcess.length === 0) {
        this.processing = false;
        this.emit('processingCompleted');
        return;
      }

      // Process items in batches
      for (const item of itemsToProcess) {
        await this.processItem(item);
      }

      this.processing = false;
      this.emit('processingCompleted');

    } catch (error) {
      this.processing = false;
      this.emit('processingError', error);
    }
  }

  /**
   * Process individual item
   */
  private async processItem(item: QueueItem): Promise<void> {
    // Update item status
    item.status = 'processing';
    item.processingStarted = new Date();
    item.lastAttempt = new Date();

    // Update metrics
    this.metrics.processingOperations++;
    this.updateMetrics();

    try {
      // Create processing context
      const context: ProcessingContext = {
        queueItem: item,
        networkInfo: this.networkInfo,
        systemResources: this.systemResources,
        retryCount: item.retryCount,
        startTime: new Date()
      };

      // Process the operation
      const result = await this.processOperation(item.operation, context);

      // Update item with result
      item.status = 'completed';
      item.result = result;
      item.processingDuration = Date.now() - item.processingStarted.getTime();

      // Update metrics
      this.metrics.completedOperations++;
      this.metrics.processingOperations--;

      // Update statistics
      this.updateStatistics(item, true);

      this.emit('completed', item, result);

    } catch (error) {
      // Handle error
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
      item.processingDuration = item.processingStarted ?
        Date.now() - item.processingStarted.getTime() : 0;

      // Update metrics
      this.metrics.failedOperations++;
      this.metrics.processingOperations--;

      // Check if retry is possible
      if (this.shouldRetry(item, error)) {
        await this.scheduleRetry(item);
      }

      // Update statistics
      this.updateStatistics(item, false);

      this.emit('failed', item, error);
    }

    // Update metrics
    this.updateMetrics();

    // Persist if enabled
    if (this.config.persistenceEnabled) {
      await this.persistQueue();
    }
  }

  /**
   * Process operation
   */
  private async processOperation(
    operation: OfflineOperation,
    context: ProcessingContext
  ): Promise<any> {
    // Check dependencies
    if (this.config.enableDependencyTracking) {
      await this.checkDependencies(context.queueItem);
    }

    // Check throttling
    if (this.config.enableThrottling) {
      await this.checkThrottling(context.queueItem);
    }

    // Apply compression if enabled
    let processedOperation = operation;
    if (this.config.enableCompression) {
      processedOperation = await this.compressOperation(operation);
    }

    // Process via sync service
    const result = await this.syncService.syncEntity(
      processedOperation.entity,
      processedOperation.entityId
    );

    return result;
  }

  /**
   * Get items to process
   */
  private getItemsToProcess(): QueueItem[] {
    let items = this.queue.filter(item => item.status === 'pending');

    // Filter by dependencies
    if (this.config.enableDependencyTracking) {
      items = items.filter(item => this.areDependenciesSatisfied(item));
    }

    // Sort by strategy
    items = this.sortByStrategy(items);

    // Apply batch size limit
    return items.slice(0, this.config.batchSize);
  }

  /**
   * Sort items by strategy
   */
  private sortByStrategy(items: QueueItem[]): QueueItem[] {
    switch (this.config.queueStrategy) {
      case 'fifo':
        return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      case 'lifo':
        return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      case 'priority':
        return items.sort((a, b) => {
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1, background: 0 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return a.timestamp.getTime() - b.timestamp.getTime();
        });

      case 'weighted':
        return items.sort((a, b) => {
          const weightDiff = b.weight - a.weight;
          if (weightDiff !== 0) return weightDiff;
          return a.timestamp.getTime() - b.timestamp.getTime();
        });

      case 'round_robin':
        return items.sort((a, b) => {
          const typeDiff = a.operation.type.localeCompare(b.operation.type);
          if (typeDiff !== 0) return typeDiff;
          return a.timestamp.getTime() - b.timestamp.getTime();
        });

      default:
        return items;
    }
  }

  /**
   * Check if dependencies are satisfied
   */
  private areDependenciesSatisfied(item: QueueItem): boolean {
    return item.dependencies.every(depId => {
      const depItem = this.queue.find(i => i.id === depId);
      return depItem && depItem.status === 'completed';
    });
  }

  /**
   * Check dependencies
   */
  private async checkDependencies(item: QueueItem): Promise<void> {
    for (const depId of item.dependencies) {
      const depItem = this.queue.find(i => i.id === depId);
      if (!depItem || depItem.status !== 'completed') {
        throw new Error(`Dependency not satisfied: ${depId}`);
      }
    }
  }

  /**
   * Check throttling
   */
  private async checkThrottling(item: QueueItem): Promise<void> {
    if (!this.config.enableThrottling) {
      return;
    }

    const now = Date.now();

    // Check rate limits
    if (this.throttleState.operationCount >= this.config.throttleConfig.maxOperationsPerSecond) {
      const timeSinceReset = now - this.throttleState.windowStartTime;
      if (timeSinceReset < this.config.throttleConfig.windowSize) {
        const waitTime = this.config.throttleConfig.windowSize - timeSinceReset;
        throw new Error(`Rate limit exceeded. Wait ${waitTime}ms`);
      } else {
        // Reset window
        this.throttleState.operationCount = 0;
        this.throttleState.windowStartTime = now;
      }
    }

    // Check concurrent operations
    if (this.throttleState.concurrentOperations >= this.config.throttleConfig.maxConcurrentOperations) {
      throw new Error('Maximum concurrent operations reached');
    }

    // Update throttle state
    this.throttleState.operationCount++;
    this.throttleState.concurrentOperations++;
  }

  /**
   * Should retry operation
   */
  private shouldRetry(item: QueueItem, error: Error): boolean {
    if (item.retryCount >= item.maxRetries) {
      return false;
    }

    // Check retry conditions
    for (const condition of this.config.retryPolicy.retryConditions) {
      if (this.matchesRetryCondition(error, condition)) {
        return item.retryCount < condition.maxRetries;
      }
    }

    return false;
  }

  /**
   * Matches retry condition
   */
  private matchesRetryCondition(error: Error, condition: RetryCondition): boolean {
    if (condition.customCondition) {
      return condition.customCondition(error);
    }

    switch (condition.type) {
      case 'network_error':
        return error.message.includes('network') || error.message.includes('offline');

      case 'timeout':
        return error.message.includes('timeout') || error.message.includes('ETIMEDOUT');

      case 'server_error':
        return error.message.includes('500') || error.message.includes('502') || error.message.includes('503');

      case 'rate_limit':
        return error.message.includes('429') || error.message.includes('rate limit');

      case 'conflict':
        return error.message.includes('conflict') || error.message.includes('409');

      default:
        return false;
    }
  }

  /**
   * Schedule retry
   */
  private async scheduleRetry(item: QueueItem): Promise<void> {
    item.status = 'retrying';
    item.retryCount++;

    const delay = this.calculateRetryDelay(item.retryCount);
    item.nextAttempt = new Date(Date.now() + delay);

    // Schedule retry
    setTimeout(() => {
      if (item.status === 'retrying') {
        item.status = 'pending';
        this.emit('retryScheduled', item);
      }
    }, delay);

    this.emit('retryScheduled', item);
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(retryCount: number): number {
    const { initialDelay, maxDelay, backoffMultiplier, jitter } = this.config.retryPolicy;

    let delay = initialDelay * Math.pow(backoffMultiplier, retryCount - 1);
    delay = Math.min(delay, maxDelay);

    // Add jitter if enabled
    if (jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return delay;
  }

  /**
   * Setup processing intervals
   */
  private setupProcessingIntervals(): void {
    if (this.config.processingMode === 'batch' || this.config.processingMode === 'scheduled') {
      this.processingInterval = setInterval(() => {
        if (!this.processing) {
          this.processQueue();
        }
      }, this.config.processingInterval);
    }

    // Setup metrics collection
    if (this.config.enableMetrics) {
      this.metricsInterval = setInterval(() => {
        this.collectMetrics();
      }, 60000); // Collect metrics every minute
    }
  }

  /**
   * Initialize background sync
   */
  private async initializeBackgroundSync(): Promise<void> {
    // Start initial processing
    if (this.config.processingMode === 'immediate') {
      this.processQueue();
    }

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for network changes
    window.addEventListener('online', () => {
      if (this.config.processingMode === 'event_driven') {
        this.processQueue();
      }
    });

    // Listen for system events
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.config.processingMode === 'event_driven') {
        this.processQueue();
      }
    });

    // Listen for low memory
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          this.handleLowMemory();
        }
      }, 30000);
    }
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    if ('connection' in navigator) {
      this.networkInfo = (navigator as any).connection;
      this.networkInfo.addEventListener('change', () => {
        this.handleNetworkChange();
      });
    }

    window.addEventListener('online', () => this.handleNetworkChange());
    window.addEventListener('offline', () => this.handleNetworkChange());
  }

  /**
   * Setup system resource monitoring
   */
  private setupSystemResourceMonitoring(): void {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.systemResources.memory = {
          used: memory.usedJSHeapSize,
          available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
          total: memory.jsHeapSizeLimit
        };
      }, 5000);
    }

    // Monitor battery status
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.systemResources.battery = {
          level: battery.level,
          charging: battery.charging
        };

        battery.addEventListener('levelchange', () => {
          this.systemResources.battery.level = battery.level;
        });

        battery.addEventListener('chargingchange', () => {
          this.systemResources.battery.charging = battery.charging;
        });
      });
    }

    // Monitor storage
    if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
      setInterval(async () => {
        try {
          const estimate = await (navigator as any).storage.estimate();
          this.systemResources.storage = {
            used: estimate.usage,
            available: estimate.quota - estimate.usage,
            total: estimate.quota
          };
        } catch (error) {
          // Storage estimation not available
        }
      }, 30000);
    }
  }

  /**
   * Handle network change
   */
  private handleNetworkChange(): void {
    this.systemResources.network = {
      online: navigator.onLine,
      effectiveType: this.networkInfo?.effectiveType || 'unknown',
      downlink: this.networkInfo?.downlink || 0,
      rtt: this.networkInfo?.rtt || 0
    };

    this.emit('networkChange', this.systemResources.network);

    // Trigger processing if online and in event-driven mode
    if (navigator.onLine && this.config.processingMode === 'event_driven') {
      this.processQueue();
    }
  }

  /**
   * Handle low memory
   */
  private handleLowMemory(): void {
    this.emit('lowMemory', this.systemResources.memory);

    // Clear completed items older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.clearQueue({ completedOnly: true, olderThan: oneHourAgo });
  }

  /**
   * Update metrics
   */
  private updateMetrics(): void {
    this.metrics.totalOperations = this.queue.length;
    this.metrics.pendingOperations = this.queue.filter(item => item.status === 'pending').length;
    this.metrics.failedOperations = this.queue.filter(item => item.status === 'failed').length;
    this.metrics.retryOperations = this.queue.filter(item => item.status === 'retrying').length;
    this.metrics.queueUtilization = this.queue.length / this.config.maxQueueSize;
    this.metrics.memoryUsage = this.systemResources.memory.used;
    this.metrics.networkUtilization = this.networkInfo?.downlink || 0;
  }

  /**
   * Update statistics
   */
  private updateStatistics(item: QueueItem, success: boolean): void {
    // Update by priority
    const priorityStats = this.statistics.byPriority[item.priority];
    priorityStats.count++;
    if (success) {
      priorityStats.successRate = (priorityStats.successRate * (priorityStats.count - 1) + 1) / priorityStats.count;
    } else {
      priorityStats.successRate = (priorityStats.successRate * (priorityStats.count - 1)) / priorityStats.count;
    }

    // Update by type
    const typeStats = this.statistics.byType[item.operation.type];
    if (!typeStats) {
      this.statistics.byType[item.operation.type] = {
        count: 1,
        avgProcessingTime: item.processingDuration || 0,
        successRate: success ? 1 : 0
      };
    } else {
      typeStats.count++;
      typeStats.avgProcessingTime = (typeStats.avgProcessingTime * (typeStats.count - 1) + (item.processingDuration || 0)) / typeStats.count;
      typeStats.successRate = success ?
        (typeStats.successRate * (typeStats.count - 1) + 1) / typeStats.count :
        (typeStats.successRate * (typeStats.count - 1)) / typeStats.count;
    }

    // Update by hour
    const hour = new Date().getHours();
    const hourStats = this.statistics.byHour[hour];
    if (hourStats) {
      hourStats.operations++;
      hourStats.successRate = success ?
        (hourStats.successRate * (hourStats.operations - 1) + 1) / hourStats.operations :
        (hourStats.successRate * (hourStats.operations - 1)) / hourStats.operations;
    }

    // Update top errors
    if (!success && item.error) {
      const existingError = this.statistics.topErrors.find(e => e.error === item.error);
      if (existingError) {
        existingError.count++;
        existingError.lastOccurrence = new Date();
      } else {
        this.statistics.topErrors.push({
          error: item.error,
          count: 1,
          lastOccurrence: new Date()
        });
      }

      // Keep only top 10 errors
      this.statistics.topErrors.sort((a, b) => b.count - a.count);
      this.statistics.topErrors = this.statistics.topErrors.slice(0, 10);
    }

    // Update performance metrics
    if (item.processingDuration) {
      this.updatePerformanceMetrics(item.processingDuration, success);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processingTime: number, success: boolean): void {
    // This would maintain rolling averages and percentiles
    // For now, we'll update the current metrics
    this.metrics.averageProcessingTime = processingTime;
  }

  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    // Calculate throughput
    const now = Date.now();
    const timeWindow = 60000; // 1 minute

    const recentOperations = this.queue.filter(item =>
      item.processingStarted && (now - item.processingStarted.getTime()) <= timeWindow
    );

    this.metrics.throughput = recentOperations.length;
    this.metrics.errorRate = this.metrics.failedOperations / Math.max(this.metrics.totalOperations, 1);

    // Update last processed time
    const lastCompleted = this.queue
      .filter(item => item.status === 'completed')
      .sort((a, b) => b.processingStarted!.getTime() - a.processingStarted!.getTime())[0];

    this.metrics.lastProcessed = lastCompleted?.processingStarted || null;

    // Calculate next processing time
    this.metrics.nextProcessingTime = this.getNextProcessingTime();

    this.emit('metricsCollected', this.metrics);
  }

  /**
   * Get next processing time
   */
  private getNextProcessingTime(): Date | null {
    if (this.config.processingMode === 'immediate') {
      return new Date();
    }

    const nextPending = this.queue
      .filter(item => item.status === 'pending')
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];

    return nextPending?.timestamp || null;
  }

  /**
   * Load persisted queue
   */
  private async loadPersistedQueue(): Promise<void> {
    try {
      const persisted = await this.storage.load<QueueItem[]>('background_queue');
      if (persisted) {
        this.queue = persisted.map(item => ({
          ...item,
          timestamp: new Date(item.timestamp),
          processingStarted: item.processingStarted ? new Date(item.processingStarted) : undefined,
          nextAttempt: item.nextAttempt ? new Date(item.nextAttempt) : null,
          lastAttempt: item.lastAttempt ? new Date(item.lastAttempt) : null
        }));
      }
    } catch (error) {
      this.emit('loadQueueError', error);
    }
  }

  /**
   * Persist queue
   */
  private async persistQueue(): Promise<void> {
    try {
      await this.storage.save('background_queue', this.queue);
    } catch (error) {
      this.emit('persistQueueError', error);
    }
  }

  /**
   * Find duplicate operation
   */
  private findDuplicate(operation: OfflineOperation): QueueItem | undefined {
    return this.queue.find(item =>
      item.operation.entity === operation.entity &&
      item.operation.entityId === operation.entityId &&
      item.operation.type === operation.type &&
      item.status !== 'completed'
    );
  }

  /**
   * Estimate operation size
   */
  private estimateOperationSize(operation: OfflineOperation): number {
    return JSON.stringify(operation).length;
  }

  /**
   * Compress operation
   */
  private async compressOperation(operation: OfflineOperation): Promise<OfflineOperation> {
    // In a real implementation, apply compression here
    return operation;
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): QueueMetrics {
    return {
      totalOperations: 0,
      pendingOperations: 0,
      processingOperations: 0,
      completedOperations: 0,
      failedOperations: 0,
      retryOperations: 0,
      averageProcessingTime: 0,
      averageWaitTime: 0,
      throughput: 0,
      errorRate: 0,
      queueUtilization: 0,
      memoryUsage: 0,
      networkUtilization: 0,
      lastProcessed: null,
      nextProcessingTime: null
    };
  }

  /**
   * Initialize statistics
   */
  private initializeStatistics(): QueueStatistics {
    return {
      byPriority: {
        critical: { count: 0, avgProcessingTime: 0, successRate: 0 },
        high: { count: 0, avgProcessingTime: 0, successRate: 0 },
        medium: { count: 0, avgProcessingTime: 0, successRate: 0 },
        low: { count: 0, avgProcessingTime: 0, successRate: 0 },
        background: { count: 0, avgProcessingTime: 0, successRate: 0 }
      },
      byType: {},
      byHour: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        operations: 0,
        successRate: 0
      })),
      topErrors: [],
      performance: {
        p50ProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
        throughputTrend: 'stable'
      }
    };
  }

  /**
   * Initialize throttle state
   */
  private initializeThrottleState(): ThrottleState {
    return {
      operationCount: 0,
      concurrentOperations: 0,
      windowStartTime: Date.now(),
      lastOperationTime: 0
    };
  }

  /**
   * Initialize system resources
   */
  private initializeSystemResources(): SystemResources {
    return {
      memory: { used: 0, available: 0, total: 0 },
      storage: { used: 0, available: 0, total: 0 },
      network: {
        online: navigator.onLine,
        effectiveType: 'unknown',
        downlink: 0,
        rtt: 0
      },
      battery: { level: 1, charging: true }
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy queue service
   */
  async destroy(): Promise<void> {
    // Clear intervals
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Persist final state
    if (this.config.persistenceEnabled) {
      await this.persistQueue();
    }

    this.initialized = false;
    this.emit('destroyed');
  }
}

/**
 * Throttle State
 */
interface ThrottleState {
  operationCount: number;
  concurrentOperations: number;
  windowStartTime: number;
  lastOperationTime: number;
}