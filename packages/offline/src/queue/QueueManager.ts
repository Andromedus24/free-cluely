// Queue Manager
// =============

import { EventEmitter } from 'events';
import { BackgroundSyncQueue, QueueConfig, QueueItem, QueueMetrics, QueueStatistics } from './BackgroundSyncQueue';
import { OfflineOperation } from '../types';
import { IStorageService } from '../storage/StorageService';
import { ISyncService } from '../sync/SyncService';

/**
 * Queue Manager Configuration
 */
export interface QueueManagerConfig extends QueueConfig {
  enableAutoScaling: boolean;
  scalingConfig: ScalingConfig;
  enableHealthChecks: boolean;
  healthCheckConfig: HealthCheckConfig;
  enableAlerting: boolean;
  alertingConfig: AlertingConfig;
  enableLoadBalancing: boolean;
  loadBalancingConfig: LoadBalancingConfig;
  enablePrioritization: boolean;
  prioritizationConfig: PrioritizationConfig;
  enableBatchOptimization: boolean;
  batchOptimizationConfig: BatchOptimizationConfig;
  enableResourceManagement: boolean;
  resourceManagementConfig: ResourceManagementConfig;
}

/**
 * Scaling Configuration
 */
export interface ScalingConfig {
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  targetUtilization: number;
  adaptiveScaling: boolean;
}

/**
 * Health Check Configuration
 */
export interface HealthCheckConfig {
  interval: number;
  timeout: number;
  retries: number;
  checks: HealthCheck[];
}

/**
 * Health Check
 */
export interface HealthCheck {
  id: string;
  name: string;
  type: 'memory' | 'storage' | 'network' | 'queue' | 'sync';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'alert' | 'scale' | 'pause' | 'clear' | 'restart';
}

/**
 * Alerting Configuration
 */
export interface AlertingConfig {
  channels: AlertChannel[];
  rules: AlertRule[];
  suppressions: AlertSuppression[];
}

/**
 * Alert Channel
 */
export interface AlertChannel {
  id: string;
  name: string;
  type: 'console' | 'email' | 'webhook' | 'slack' | 'discord';
  config: any;
  enabled: boolean;
}

/**
 * Alert Rule
 */
export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  actions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number;
  enabled: boolean;
}

/**
 * Alert Condition
 */
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration?: number;
}

/**
 * Alert Suppression
 */
export interface AlertSuppression {
  id: string;
  name: string;
  condition: string;
  duration: number;
  enabled: boolean;
}

/**
 * Load Balancing Configuration
 */
export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'least_loaded' | 'weighted' | 'custom';
  workers: WorkerConfig[];
  healthCheckInterval: number;
  failoverEnabled: boolean;
}

/**
 * Worker Configuration
 */
export interface WorkerConfig {
  id: string;
  name: string;
  capacity: number;
  weight: number;
  enabled: boolean;
  tags: string[];
}

/**
 * Prioritization Configuration
 */
export interface PrioritizationConfig {
  strategy: 'static' | 'dynamic' | 'ml_based';
  rules: PrioritizationRule[];
  mlConfig?: MLConfig;
}

/**
 * Prioritization Rule
 */
export interface PrioritizationRule {
  id: string;
  name: string;
  condition: string;
  priority: QueuePriority;
  weight: number;
  enabled: boolean;
}

/**
 * ML Configuration
 */
export interface MLConfig {
  model: string;
  features: string[];
  trainingInterval: number;
  predictionThreshold: number;
}

/**
 * Batch Optimization Configuration
 */
export interface BatchOptimizationConfig {
  enabled: boolean;
  maxSize: number;
  timeout: number;
  strategies: BatchStrategy[];
}

/**
 * Batch Strategy
 */
export interface BatchStrategy {
  id: string;
  name: string;
  condition: string;
  action: 'merge' | 'split' | 'reorder' | 'prioritize';
  config: any;
}

/**
 * Resource Management Configuration
 */
export interface ResourceManagementConfig {
  enabled: boolean;
  memory: ResourceLimit;
  storage: ResourceLimit;
  network: ResourceLimit;
  cpu: ResourceLimit;
  cleanupPolicy: CleanupPolicy;
}

/**
 * Resource Limit
 */
export interface ResourceLimit {
  max: number;
  warning: number;
  critical: number;
  action: 'alert' | 'throttle' | 'pause' | 'clear';
}

/**
 * Cleanup Policy
 */
export interface CleanupPolicy {
  enabled: boolean;
  interval: number;
  maxAge: number;
  maxSize: number;
  criteria: CleanupCriteria[];
}

/**
 * Cleanup Criteria
 */
export interface CleanupCriteria {
  type: 'completed' | 'failed' | 'old' | 'large';
  condition: string;
  action: 'remove' | 'archive' | 'compress';
}

/**
 * Queue Priority (re-export)
 */
type QueuePriority = 'critical' | 'high' | 'medium' | 'low' | 'background';

/**
 * Alert
 */
export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: any;
}

/**
 * Health Status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  score: number;
  recommendations: string[];
}

/**
 * Health Check Result
 */
export interface HealthCheckResult {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

/**
 * Scaling Event
 */
export interface ScalingEvent {
  id: string;
  type: 'scale_up' | 'scale_down';
  fromWorkers: number;
  toWorkers: number;
  reason: string;
  timestamp: Date;
  success: boolean;
}

/**
 * Queue Manager
 */
export class QueueManager extends EventEmitter {
  private config: QueueManagerConfig;
  private storage: IStorageService;
  private syncService: ISyncService;
  private queue: BackgroundSyncQueue;
  private initialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private scalingInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private alerts: Alert[] = [];
  private scalingEvents: ScalingEvent[] = [];
  private healthStatus: HealthStatus;
  private workers: Worker[] = [];
  private resourceMonitor: ResourceMonitor;
  private prioritizationEngine: PrioritizationEngine;
  private batchOptimizer: BatchOptimizer;

  constructor(config: QueueManagerConfig, storage: IStorageService, syncService: ISyncService) {
    super();
    this.config = config;
    this.storage = storage;
    this.syncService = syncService;

    // Initialize background queue
    this.queue = new BackgroundSyncQueue(config, storage, syncService);

    // Initialize components
    this.healthStatus = this.initializeHealthStatus();
    this.resourceMonitor = new ResourceMonitor(config.resourceManagementConfig);
    this.prioritizationEngine = new PrioritizationEngine(config.prioritizationConfig);
    this.batchOptimizer = new BatchOptimizer(config.batchOptimizationConfig);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize queue manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize background queue
      await this.queue.initialize();

      // Initialize workers if load balancing is enabled
      if (this.config.enableLoadBalancing) {
        await this.initializeWorkers();
      }

      // Initialize resource monitoring
      await this.resourceMonitor.initialize();

      // Initialize prioritization engine
      await this.prioritizationEngine.initialize();

      // Initialize batch optimizer
      await this.batchOptimizer.initialize();

      // Setup health checks
      if (this.config.enableHealthChecks) {
        this.setupHealthChecks();
      }

      // Setup auto-scaling
      if (this.config.enableAutoScaling) {
        this.setupAutoScaling();
      }

      // Setup metrics collection
      this.setupMetricsCollection();

      // Load persisted state
      await this.loadPersistedState();

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
    // Apply prioritization if enabled
    if (this.config.enablePrioritization) {
      const prioritizedOptions = await this.prioritizationEngine.prioritize(operation, options);
      options = { ...options, ...prioritizedOptions };
    }

    // Apply batch optimization if enabled
    if (this.config.enableBatchOptimization) {
      const batchResult = await this.batchOptimizer.optimize([operation], options);
      if (batchResult.optimized) {
        // Handle batch optimization result
        return await this.handleBatchOptimization(batchResult);
      }
    }

    // Add to queue
    return await this.queue.enqueue(operation, options);
  }

  /**
   * Remove operation from queue
   */
  async dequeue(operationId: string): Promise<boolean> {
    return await this.queue.dequeue(operationId);
  }

  /**
   * Retry failed operation
   */
  async retry(operationId: string): Promise<boolean> {
    return await this.queue.retry(operationId);
  }

  /**
   * Cancel operation
   */
  async cancel(operationId: string): Promise<boolean> {
    return await this.queue.cancel(operationId);
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return this.queue.getQueueStatus();
  }

  /**
   * Get queue statistics
   */
  getStatistics(): QueueStatistics {
    return this.queue.getStatistics();
  }

  /**
   * Get health status
   */
  getHealthStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get alerts
   */
  getAlerts(): Alert[] {
    return [...this.alerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get scaling events
   */
  getScalingEvents(): ScalingEvent[] {
    return [...this.scalingEvents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear queue
   */
  async clearQueue(options: any = {}): Promise<number> {
    return await this.queue.clearQueue(options);
  }

  /**
   * Scale workers
   */
  async scaleWorkers(targetCount: number): Promise<boolean> {
    if (!this.config.enableLoadBalancing) {
      return false;
    }

    const currentCount = this.workers.filter(w => w.enabled).length;
    if (currentCount === targetCount) {
      return true;
    }

    const scalingEvent: ScalingEvent = {
      id: this.generateId(),
      type: targetCount > currentCount ? 'scale_up' : 'scale_down',
      fromWorkers: currentCount,
      toWorkers: targetCount,
      reason: 'manual',
      timestamp: new Date(),
      success: false
    };

    try {
      if (targetCount > currentCount) {
        // Scale up
        for (let i = currentCount; i < targetCount; i++) {
          const worker = this.workers.find(w => !w.enabled);
          if (worker) {
            await worker.enable();
          }
        }
      } else {
        // Scale down
        const enabledWorkers = this.workers.filter(w => w.enabled);
        for (let i = currentCount; i > targetCount; i--) {
          const worker = enabledWorkers[i - 1];
          if (worker) {
            await worker.disable();
          }
        }
      }

      scalingEvent.success = true;
      this.scalingEvents.push(scalingEvent);
      this.emit('scaled', scalingEvent);

      return true;

    } catch (error) {
      scalingEvent.success = false;
      this.scalingEvents.push(scalingEvent);
      this.emit('scalingError', error);
      return false;
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.emit('alertResolved', alert);
    return true;
  }

  /**
   * Run health check
   */
  async runHealthCheck(): Promise<HealthStatus> {
    const results: HealthCheckResult[] = [];

    // Run all health checks
    for (const check of this.config.healthCheckConfig.checks) {
      const result = await this.runIndividualHealthCheck(check);
      results.push(result);
    }

    // Calculate overall health status
    const failedChecks = results.filter(r => r.status === 'fail');
    const warningChecks = results.filter(r => r.status === 'warn');
    const score = results.filter(r => r.status === 'pass').length / results.length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warningChecks.length > 0) {
      status = 'degraded';
    }

    const recommendations = this.generateHealthRecommendations(results);

    this.healthStatus = {
      status,
      checks: results,
      score,
      recommendations
    };

    // Emit health status change
    this.emit('healthStatusChanged', this.healthStatus);

    return this.healthStatus;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to queue events
    this.queue.on('enqueued', (item: QueueItem) => {
      this.emit('operationEnqueued', item);
      this.checkResourceLimits();
    });

    this.queue.on('completed', (item: QueueItem, result: any) => {
      this.emit('operationCompleted', item, result);
      this.updateWorkerLoad();
    });

    this.queue.on('failed', (item: QueueItem, error: Error) => {
      this.emit('operationFailed', item, error);
      this.checkErrorThresholds(error);
    });

    this.queue.on('processingError', (error: Error) => {
      this.emit('processingError', error);
      this.createAlert('processing_error', 'Processing Error', error.message, 'high');
    });

    // Listen to resource events
    this.resourceMonitor.on('resourceWarning', (resource: string, usage: number) => {
      this.emit('resourceWarning', resource, usage);
      this.createAlert('resource_warning', 'Resource Warning', `${resource} usage at ${usage}%`, 'medium');
    });

    this.resourceMonitor.on('resourceCritical', (resource: string, usage: number) => {
      this.emit('resourceCritical', resource, usage);
      this.createAlert('resource_critical', 'Resource Critical', `${resource} usage at ${usage}%`, 'critical');
    });

    // Listen to system events
    window.addEventListener('online', () => this.handleNetworkChange());
    window.addEventListener('offline', () => this.handleNetworkChange());
  }

  /**
   * Setup health checks
   */
  private setupHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.runHealthCheck();
    }, this.config.healthCheckConfig.interval);
  }

  /**
   * Setup auto-scaling
   */
  private setupAutoScaling(): void {
    this.scalingInterval = setInterval(async () => {
      await this.checkAutoScaling();
    }, 60000); // Check every minute
  }

  /**
   * Setup metrics collection
   */
  private setupMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000); // Collect every 30 seconds
  }

  /**
   * Initialize workers
   */
  private async initializeWorkers(): Promise<void> {
    const { workers } = this.config.loadBalancingConfig;

    for (const workerConfig of workers) {
      const worker = new Worker(workerConfig, this.queue);
      await worker.initialize();
      this.workers.push(worker);
    }
  }

  /**
   * Run individual health check
   */
  private async runIndividualHealthCheck(check: HealthCheck): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let value = 0;
    let status: 'pass' | 'fail' | 'warn' = 'pass';
    let message = '';

    try {
      switch (check.type) {
        case 'memory':
          value = await this.getMemoryUsage();
          break;
        case 'storage':
          value = await this.getStorageUsage();
          break;
        case 'network':
          value = await this.getNetworkLatency();
          break;
        case 'queue':
          value = this.getQueueUtilization();
          break;
        case 'sync':
          value = await this.getSyncHealth();
          break;
      }

      // Determine status based on threshold
      if (value > check.threshold) {
        status = 'fail';
        message = `${check.name} exceeded threshold: ${value} > ${check.threshold}`;
      } else if (value > check.threshold * 0.8) {
        status = 'warn';
        message = `${check.name} approaching threshold: ${value} / ${check.threshold}`;
      } else {
        message = `${check.name} is healthy: ${value}`;
      }

      return {
        id: check.id,
        name: check.name,
        status,
        value,
        threshold: check.threshold,
        message,
        timestamp: new Date()
      };

    } catch (error) {
      return {
        id: check.id,
        name: check.name,
        status: 'fail',
        value: 0,
        threshold: check.threshold,
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Check auto-scaling
   */
  private async checkAutoScaling(): Promise<void> {
    if (!this.config.enableAutoScaling) {
      return;
    }

    const { scalingConfig } = this.config;
    const currentWorkers = this.workers.filter(w => w.enabled).length;
    const queueStatus = this.queue.getQueueStatus();

    // Calculate utilization
    const utilization = queueStatus.metrics.queueUtilization;

    // Check scale up conditions
    if (utilization > scalingConfig.scaleUpThreshold && currentWorkers < scalingConfig.maxWorkers) {
      const targetWorkers = Math.min(currentWorkers + 1, scalingConfig.maxWorkers);
      await this.scaleWorkers(targetWorkers);
    }

    // Check scale down conditions
    else if (utilization < scalingConfig.scaleDownThreshold && currentWorkers > scalingConfig.minWorkers) {
      const targetWorkers = Math.max(currentWorkers - 1, scalingConfig.minWorkers);
      await this.scaleWorkers(targetWorkers);
    }
  }

  /**
   * Check resource limits
   */
  private checkResourceLimits(): void {
    const queueStatus = this.queue.getQueueStatus();

    // Check memory limits
    if (queueStatus.metrics.memoryUsage > this.config.resourceManagementConfig.memory.warning) {
      this.resourceMonitor.checkResource('memory', queueStatus.metrics.memoryUsage);
    }

    // Check queue size limits
    if (queueStatus.size > this.config.maxQueueSize * 0.8) {
      this.createAlert('queue_size_warning', 'Queue Size Warning',
        `Queue size is ${queueStatus.size} / ${this.config.maxQueueSize}`, 'medium');
    }
  }

  /**
   * Check error thresholds
   */
  private checkErrorThresholds(error: Error): void {
    const queueStatus = this.queue.getQueueStatus();
    const errorRate = queueStatus.metrics.errorRate;

    // Check error rate threshold
    if (errorRate > 0.1) { // 10% error rate
      this.createAlert('high_error_rate', 'High Error Rate',
        `Error rate is ${(errorRate * 100).toFixed(2)}%`, 'high');
    }
  }

  /**
   * Handle network change
   */
  private handleNetworkChange(): void {
    const online = navigator.onLine;
    this.emit('networkStatusChanged', online);

    if (online) {
      // Trigger queue processing when coming back online
      this.createAlert('network_restored', 'Network Restored',
        'Network connection restored', 'low');
    } else {
      // Alert about network loss
      this.createAlert('network_lost', 'Network Lost',
        'Network connection lost', 'medium');
    }
  }

  /**
   * Create alert
   */
  private createAlert(ruleId: string, title: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const alert: Alert = {
      id: this.generateId(),
      ruleId,
      title,
      message,
      severity,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);

    // Send alert to configured channels
    this.sendAlert(alert);

    // Emit alert event
    this.emit('alertCreated', alert);
  }

  /**
   * Send alert to channels
   */
  private sendAlert(alert: Alert): void {
    for (const channel of this.config.alertingConfig.channels) {
      if (channel.enabled) {
        this.sendToChannel(channel, alert);
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private sendToChannel(channel: AlertChannel, alert: Alert): void {
    switch (channel.type) {
      case 'console':
        console.log(`[${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);
        break;
      case 'webhook':
        // Send to webhook
        this.sendToWebhook(channel.config.url, alert);
        break;
      // Add other channel types as needed
    }
  }

  /**
   * Send to webhook
   */
  private async sendToWebhook(url: string, alert: Alert): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Handle batch optimization
   */
  private async handleBatchOptimization(batchResult: any): Promise<string> {
    // Handle the optimized batch result
    // This would depend on the specific optimization strategy
    return 'batch_optimized';
  }

  /**
   * Update worker load
   */
  private updateWorkerLoad(): void {
    if (!this.config.enableLoadBalancing) {
      return;
    }

    // Update worker load balancing
    this.workers.forEach(worker => worker.updateLoad());
  }

  /**
   * Collect metrics
   */
  private collectMetrics(): void {
    const queueStatus = this.queue.getQueueStatus();
    const statistics = this.queue.getStatistics();

    // Emit metrics event
    this.emit('metricsCollected', {
      queue: queueStatus,
      statistics,
      health: this.healthStatus,
      alerts: this.alerts.length,
      workers: this.workers.length
    });
  }

  /**
   * Generate health recommendations
   */
  private generateHealthRecommendations(results: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    for (const result of results) {
      if (result.status === 'fail') {
        switch (result.id) {
          case 'memory':
            recommendations.push('Consider increasing memory limits or clearing old data');
            break;
          case 'storage':
            recommendations.push('Consider increasing storage limits or implementing cleanup policies');
            break;
          case 'network':
            recommendations.push('Check network connectivity and consider offline mode');
            break;
          case 'queue':
            recommendations.push('Consider increasing queue capacity or scaling workers');
            break;
          case 'sync':
            recommendations.push('Check sync service configuration and connectivity');
            break;
        }
      }
    }

    return recommendations;
  }

  /**
   * Load persisted state
   */
  private async loadPersistedState(): Promise<void> {
    try {
      // Load alerts
      const persistedAlerts = await this.storage.load<Alert[]>('queue_alerts');
      if (persistedAlerts) {
        this.alerts = persistedAlerts.map(alert => ({
          ...alert,
          timestamp: new Date(alert.timestamp),
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined
        }));
      }

      // Load scaling events
      const persistedScaling = await this.storage.load<ScalingEvent[]>('scaling_events');
      if (persistedScaling) {
        this.scalingEvents = persistedScaling.map(event => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  }

  /**
   * Get storage usage
   */
  private async getStorageUsage(): Promise<number> {
    if ('storage' in navigator && 'estimate' in (navigator as any).storage) {
      try {
        const estimate = await (navigator as any).storage.estimate();
        return (estimate.usage / estimate.quota) * 100;
      } catch (error) {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Get network latency
   */
  private async getNetworkLatency(): Promise<number> {
    if (!navigator.onLine) {
      return 100; // High latency when offline
    }

    // Simple latency test
    const start = Date.now();
    try {
      await fetch('/ping', { method: 'HEAD' });
      return Date.now() - start;
    } catch (error) {
      return 100; // High latency on error
    }
  }

  /**
   * Get queue utilization
   */
  private getQueueUtilization(): number {
    const queueStatus = this.queue.getQueueStatus();
    return queueStatus.metrics.queueUtilization * 100;
  }

  /**
   * Get sync health
   */
  private async getSyncHealth(): Promise<number> {
    try {
      const healthStatus = await this.syncService.getHealthStatus();
      // Convert health status to numeric value
      switch (healthStatus.health) {
        case 'healthy': return 100;
        case 'degraded': return 50;
        case 'critical': return 0;
        default: return 50;
      }
    } catch (error) {
      return 0;
    }
  }

  /**
   * Initialize health status
   */
  private initializeHealthStatus(): HealthStatus {
    return {
      status: 'healthy',
      checks: [],
      score: 1,
      recommendations: []
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `qm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy queue manager
   */
  async destroy(): Promise<void> {
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Destroy components
    await this.queue.destroy();
    await this.resourceMonitor.destroy();
    await this.prioritizationEngine.destroy();
    await this.batchOptimizer.destroy();

    // Destroy workers
    for (const worker of this.workers) {
      await worker.destroy();
    }

    this.initialized = false;
    this.emit('destroyed');
  }
}

/**
 * Worker Class
 */
class Worker extends EventEmitter {
  private config: WorkerConfig;
  private queue: BackgroundSyncQueue;
  private enabled = false;
  private load = 0;

  constructor(config: WorkerConfig, queue: BackgroundSyncQueue) {
    super();
    this.config = config;
    this.queue = queue;
  }

  async initialize(): Promise<void> {
    // Initialize worker
    this.enabled = this.config.enabled;
    this.emit('initialized');
  }

  async enable(): Promise<void> {
    this.enabled = true;
    this.emit('enabled');
  }

  async disable(): Promise<void> {
    this.enabled = false;
    this.emit('disabled');
  }

  updateLoad(): void {
    // Update worker load based on queue metrics
    const queueStatus = this.queue.getQueueStatus();
    this.load = queueStatus.metrics.queueUtilization;
  }

  async destroy(): Promise<void> {
    this.enabled = false;
    this.emit('destroyed');
  }
}

/**
 * Resource Monitor Class
 */
class ResourceMonitor extends EventEmitter {
  private config: ResourceManagementConfig;
  private interval: NodeJS.Timeout | null = null;

  constructor(config: ResourceManagementConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.config.enabled) {
      this.setupResourceMonitoring();
    }
  }

  private setupResourceMonitoring(): void {
    this.interval = setInterval(() => {
      this.checkAllResources();
    }, 30000); // Check every 30 seconds
  }

  private checkAllResources(): void {
    // Check memory
    this.checkResource('memory', this.getMemoryUsage());

    // Check storage
    this.checkResource('storage', this.getStorageUsage());

    // Add other resource checks as needed
  }

  checkResource(resource: string, usage: number): void {
    const limit = this.config[resource as keyof ResourceManagementConfig] as ResourceLimit;

    if (usage > limit.critical) {
      this.emit('resourceCritical', resource, usage);
    } else if (usage > limit.warning) {
      this.emit('resourceWarning', resource, usage);
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return 0;
  }

  private getStorageUsage(): number {
    // Estimate storage usage
    return Math.random() * 100; // Placeholder
  }

  async destroy(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

/**
 * Prioritization Engine Class
 */
class PrioritizationEngine extends EventEmitter {
  private config: PrioritizationConfig;

  constructor(config: PrioritizationConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize prioritization engine
    this.emit('initialized');
  }

  async prioritize(operation: OfflineOperation, options: any): Promise<any> {
    // Apply prioritization rules
    for (const rule of this.config.rules) {
      if (rule.enabled && this.evaluateCondition(rule.condition, operation)) {
        return {
          priority: rule.priority,
          weight: rule.weight
        };
      }
    }

    return options;
  }

  private evaluateCondition(condition: string, operation: OfflineOperation): boolean {
    // Simple condition evaluation (would be more sophisticated in production)
    try {
      // This is a placeholder - in production, you'd have a proper condition evaluator
      return eval(condition);
    } catch (error) {
      return false;
    }
  }

  async destroy(): Promise<void> {
    // Clean up prioritization engine
  }
}

/**
 * Batch Optimizer Class
 */
class BatchOptimizer extends EventEmitter {
  private config: BatchOptimizationConfig;

  constructor(config: BatchOptimizationConfig) {
    super();
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize batch optimizer
    this.emit('initialized');
  }

  async optimize(operations: OfflineOperation[], options: any): Promise<any> {
    if (!this.config.enabled) {
      return { optimized: false };
    }

    // Apply batch optimization strategies
    for (const strategy of this.config.strategies) {
      if (this.evaluateBatchCondition(strategy.condition, operations)) {
        return {
          optimized: true,
          strategy: strategy.id,
          action: strategy.action,
          config: strategy.config
        };
      }
    }

    return { optimized: false };
  }

  private evaluateBatchCondition(condition: string, operations: OfflineOperation[]): boolean {
    // Simple condition evaluation (would be more sophisticated in production)
    try {
      return eval(condition);
    } catch (error) {
      return false;
    }
  }

  async destroy(): Promise<void> {
    // Clean up batch optimizer
  }
}