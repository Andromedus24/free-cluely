// Queue Package Exports
// =====================

export { BackgroundSyncQueue } from './BackgroundSyncQueue';
export { QueueManager } from './QueueManager';

export type {
  QueueConfig,
  QueuePriority,
  QueueStrategy,
  ProcessingMode,
  RetryPolicy,
  RetryCondition,
  ThrottleConfig,
  QueueMetrics,
  QueueItem,
  ProcessingContext,
  SystemResources,
  QueueStatistics,
  QueueManagerConfig,
  ScalingConfig,
  HealthCheckConfig,
  HealthCheck,
  AlertingConfig,
  AlertChannel,
  AlertRule,
  AlertCondition,
  AlertSuppression,
  LoadBalancingConfig,
  WorkerConfig,
  PrioritizationConfig,
  PrioritizationRule,
  MLConfig,
  BatchOptimizationConfig,
  BatchStrategy,
  ResourceManagementConfig,
  ResourceLimit,
  CleanupPolicy,
  CleanupCriteria,
  Alert,
  HealthStatus,
  HealthCheckResult,
  ScalingEvent
} from './BackgroundSyncQueue';

/**
 * Queue Factory Functions
 */

/**
 * Create default queue configuration
 */
export function createDefaultQueueConfig(): QueueConfig {
  return {
    maxQueueSize: 10000,
    processingMode: 'batch',
    queueStrategy: 'priority',
    batchSize: 50,
    processingInterval: 30000,
    retryPolicy: {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryConditions: [
        { type: 'network_error', maxRetries: 3 },
        { type: 'timeout', maxRetries: 2 },
        { type: 'server_error', maxRetries: 3 },
        { type: 'rate_limit', maxRetries: 5 },
        { type: 'conflict', maxRetries: 2 }
      ]
    },
    priorityWeights: {
      critical: 10,
      high: 8,
      medium: 5,
      low: 2,
      background: 1
    },
    enableCompression: true,
    enableDeduplication: true,
    enableDependencyTracking: true,
    enableThrottling: true,
    throttleConfig: {
      maxOperationsPerSecond: 100,
      maxConcurrentOperations: 10,
      burstSize: 50,
      windowSize: 1000,
      adaptiveThrottling: true,
      networkAwareThrottling: true
    },
    memoryLimit: 100 * 1024 * 1024, // 100MB
    persistenceEnabled: true,
    enableMetrics: true,
    enableNotifications: true
  };
}

/**
 * Create performance queue configuration
 */
export function createPerformanceQueueConfig(): QueueConfig {
  return {
    maxQueueSize: 50000,
    processingMode: 'immediate',
    queueStrategy: 'weighted',
    batchSize: 100,
    processingInterval: 10000,
    retryPolicy: {
      maxRetries: 5,
      initialDelay: 500,
      maxDelay: 60000,
      backoffMultiplier: 1.5,
      jitter: true,
      retryConditions: [
        { type: 'network_error', maxRetries: 5 },
        { type: 'timeout', maxRetries: 3 },
        { type: 'server_error', maxRetries: 4 },
        { type: 'rate_limit', maxRetries: 8 },
        { type: 'conflict', maxRetries: 3 }
      ]
    },
    priorityWeights: {
      critical: 15,
      high: 12,
      medium: 8,
      low: 4,
      background: 1
    },
    enableCompression: true,
    enableDeduplication: true,
    enableDependencyTracking: true,
    enableThrottling: true,
    throttleConfig: {
      maxOperationsPerSecond: 200,
      maxConcurrentOperations: 20,
      burstSize: 100,
      windowSize: 1000,
      adaptiveThrottling: true,
      networkAwareThrottling: true
    },
    memoryLimit: 200 * 1024 * 1024, // 200MB
    persistenceEnabled: true,
    enableMetrics: true,
    enableNotifications: true
  };
}

/**
 * Create conservative queue configuration
 */
export function createConservativeQueueConfig(): QueueConfig {
  return {
    maxQueueSize: 1000,
    processingMode: 'scheduled',
    queueStrategy: 'fifo',
    batchSize: 10,
    processingInterval: 60000,
    retryPolicy: {
      maxRetries: 2,
      initialDelay: 5000,
      maxDelay: 60000,
      backoffMultiplier: 3,
      jitter: true,
      retryConditions: [
        { type: 'network_error', maxRetries: 2 },
        { type: 'timeout', maxRetries: 1 },
        { type: 'server_error', maxRetries: 2 }
      ]
    },
    priorityWeights: {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      background: 1
    },
    enableCompression: false,
    enableDeduplication: true,
    enableDependencyTracking: false,
    enableThrottling: true,
    throttleConfig: {
      maxOperationsPerSecond: 10,
      maxConcurrentOperations: 2,
      burstSize: 5,
      windowSize: 1000,
      adaptiveThrottling: false,
      networkAwareThrottling: true
    },
    memoryLimit: 50 * 1024 * 1024, // 50MB
    persistenceEnabled: true,
    enableMetrics: false,
    enableNotifications: false
  };
}

/**
 * Create queue manager configuration
 */
export function createQueueManagerConfig(
  queueConfig: QueueConfig = createDefaultQueueConfig()
): QueueManagerConfig {
  return {
    ...queueConfig,
    enableAutoScaling: true,
    scalingConfig: {
      minWorkers: 1,
      maxWorkers: 5,
      scaleUpThreshold: 0.8,
      scaleDownThreshold: 0.2,
      scaleUpCooldown: 300000, // 5 minutes
      scaleDownCooldown: 600000, // 10 minutes
      targetUtilization: 0.6,
      adaptiveScaling: true
    },
    enableHealthChecks: true,
    healthCheckConfig: {
      interval: 30000,
      timeout: 5000,
      retries: 3,
      checks: [
        {
          id: 'memory',
          name: 'Memory Usage',
          type: 'memory',
          threshold: 80,
          severity: 'high',
          action: 'alert'
        },
        {
          id: 'storage',
          name: 'Storage Usage',
          type: 'storage',
          threshold: 85,
          severity: 'medium',
          action: 'alert'
        },
        {
          id: 'network',
          name: 'Network Latency',
          type: 'network',
          threshold: 5000,
          severity: 'medium',
          action: 'alert'
        },
        {
          id: 'queue',
          name: 'Queue Utilization',
          type: 'queue',
          threshold: 90,
          severity: 'high',
          action: 'scale'
        },
        {
          id: 'sync',
          name: 'Sync Health',
          type: 'sync',
          threshold: 50,
          severity: 'critical',
          action: 'alert'
        }
      ]
    },
    enableAlerting: true,
    alertingConfig: {
      channels: [
        {
          id: 'console',
          name: 'Console',
          type: 'console',
          config: {},
          enabled: true
        }
      ],
      rules: [
        {
          id: 'high_memory',
          name: 'High Memory Usage',
          condition: {
            metric: 'memoryUsage',
            operator: 'gt',
            value: 90,
            duration: 300000
          },
          actions: ['console'],
          severity: 'high',
          cooldown: 300000,
          enabled: true
        },
        {
          id: 'high_error_rate',
          name: 'High Error Rate',
          condition: {
            metric: 'errorRate',
            operator: 'gt',
            value: 0.1,
            duration: 300000
          },
          actions: ['console'],
          severity: 'high',
          cooldown: 300000,
          enabled: true
        }
      ],
      suppressions: []
    },
    enableLoadBalancing: false,
    loadBalancingConfig: {
      strategy: 'round_robin',
      workers: [],
      healthCheckInterval: 30000,
      failoverEnabled: true
    },
    enablePrioritization: true,
    prioritizationConfig: {
      strategy: 'static',
      rules: [
        {
          id: 'urgent_operations',
          name: 'Urgent Operations',
          condition: "operation.priority === 'critical'",
          priority: 'critical',
          weight: 10,
          enabled: true
        },
        {
          id: 'user_initiated',
          name: 'User Initiated',
          condition: "operation.metadata?.userInitiated === true",
          priority: 'high',
          weight: 8,
          enabled: true
        },
        {
          id: 'background_sync',
          name: 'Background Sync',
          condition: "operation.type === 'sync'",
          priority: 'background',
          weight: 1,
          enabled: true
        }
      ]
    },
    enableBatchOptimization: true,
    batchOptimizationConfig: {
      enabled: true,
      maxSize: 100,
      timeout: 5000,
      strategies: [
        {
          id: 'merge_similar',
          name: 'Merge Similar Operations',
          condition: "operations.length > 10 && operations.every(op => op.type === 'update')",
          action: 'merge',
          config: {}
        }
      ]
    },
    enableResourceManagement: true,
    resourceManagementConfig: {
      enabled: true,
      memory: {
        max: 90,
        warning: 70,
        critical: 85,
        action: 'alert'
      },
      storage: {
        max: 95,
        warning: 80,
        critical: 90,
        action: 'alert'
      },
      network: {
        max: 100,
        warning: 80,
        critical: 90,
        action: 'throttle'
      },
      cpu: {
        max: 90,
        warning: 70,
        critical: 85,
        action: 'throttle'
      },
      cleanupPolicy: {
        enabled: true,
        interval: 3600000, // 1 hour
        maxAge: 86400000, // 24 hours
        maxSize: 1000,
        criteria: [
          {
            type: 'completed',
            condition: "age > 86400000",
            action: 'remove'
          },
          {
            type: 'failed',
            condition: "retryCount >= 3",
            action: 'remove'
          }
        ]
      }
    }
  };
}

/**
 * Create background sync queue
 */
export function createBackgroundSyncQueue(
  config: QueueConfig = createDefaultQueueConfig(),
  storage: IStorageService,
  syncService: ISyncService
): BackgroundSyncQueue {
  return new BackgroundSyncQueue(config, storage, syncService);
}

/**
 * Create queue manager
 */
export function createQueueManager(
  config: QueueManagerConfig = createQueueManagerConfig(),
  storage: IStorageService,
  syncService: ISyncService
): QueueManager {
  return new QueueManager(config, storage, syncService);
}

/**
 * Queue Utilities
 */

/**
 * Validate queue configuration
 */
export function validateQueueConfig(config: QueueConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxQueueSize <= 0) {
    errors.push('maxQueueSize must be greater than 0');
  }

  if (config.batchSize <= 0 || config.batchSize > config.maxQueueSize) {
    errors.push('batchSize must be between 1 and maxQueueSize');
  }

  if (config.processingInterval <= 0) {
    errors.push('processingInterval must be greater than 0');
  }

  if (config.retryPolicy.maxRetries < 0) {
    errors.push('maxRetries must be greater than or equal to 0');
  }

  if (config.retryPolicy.initialDelay <= 0) {
    errors.push('initialDelay must be greater than 0');
  }

  if (config.throttleConfig.maxOperationsPerSecond <= 0) {
    errors.push('maxOperationsPerSecond must be greater than 0');
  }

  if (config.throttleConfig.maxConcurrentOperations <= 0) {
    errors.push('maxConcurrentOperations must be greater than 0');
  }

  if (config.memoryLimit <= 0) {
    errors.push('memoryLimit must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate queue performance metrics
 */
export function calculateQueuePerformance(queue: BackgroundSyncQueue): {
  efficiency: number;
  throughput: number;
  reliability: number;
  latency: number;
  overall: number;
} {
  const status = queue.getQueueStatus();
  const metrics = status.metrics;

  // Calculate efficiency (how well the queue is processing)
  const efficiency = metrics.totalOperations > 0 ?
    (metrics.completedOperations / metrics.totalOperations) : 1;

  // Calculate throughput (operations per second)
  const throughput = metrics.throughput;

  // Calculate reliability (success rate)
  const reliability = metrics.totalOperations > 0 ?
    (1 - metrics.errorRate) : 1;

  // Calculate latency (average processing time)
  const latency = metrics.averageProcessingTime;

  // Calculate overall score
  const overall = (efficiency * 0.3 + throughput * 0.2 + reliability * 0.3 + (1 - latency / 10000) * 0.2);

  return {
    efficiency,
    throughput,
    reliability,
    latency,
    overall
  };
}

/**
 * Generate queue recommendations
 */
export function generateQueueRecommendations(queue: BackgroundSyncQueue): string[] {
  const recommendations: string[] = [];
  const status = queue.getQueueStatus();
  const metrics = status.metrics;

  // Queue size recommendations
  if (metrics.queueUtilization > 0.9) {
    recommendations.push('Consider increasing maxQueueSize or adding more workers');
  }

  // Error rate recommendations
  if (metrics.errorRate > 0.1) {
    recommendations.push('High error rate detected - check sync service and network connectivity');
  }

  // Processing time recommendations
  if (metrics.averageProcessingTime > 5000) {
    recommendations.push('High processing time - consider optimizing operations or increasing batchSize');
  }

  // Memory usage recommendations
  if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
    recommendations.push('High memory usage - consider enabling compression or reducing queue size');
  }

  // Throughput recommendations
  if (metrics.throughput < 10) {
    recommendations.push('Low throughput - consider reducing processingInterval or increasing batch size');
  }

  return recommendations;
}

/**
 * Queue Event Types
 */
export type QueueEventType =
  | 'initialized'
  | 'destroyed'
  | 'enqueued'
  | 'dequeued'
  | 'completed'
  | 'failed'
  | 'retried'
  | 'cancelled'
  | 'processingStarted'
  | 'processingCompleted'
  | 'processingError'
  | 'retryScheduled'
  | 'cleared'
  | 'lowMemory'
  | 'networkChange'
  | 'metricsCollected'
  | 'alertCreated'
  | 'alertResolved'
  | 'healthStatusChanged'
  | 'scaled'
  | 'scalingError'
  | 'resourceWarning'
  | 'resourceCritical';

/**
 * Queue Event Handler
 */
export interface QueueEventHandler {
  (event: QueueEventType, data?: any): void;
}

/**
 * Setup queue event handlers
 */
export function setupQueueEventHandlers(
  queue: BackgroundSyncQueue | QueueManager,
  handlers: Record<QueueEventType, QueueEventHandler>
): () => void {
  const eventListeners: { event: QueueEventType; handler: QueueEventHandler }[] = [];

  for (const [eventType, handler] of Object.entries(handlers)) {
    const listener = (data?: any) => handler(eventType as QueueEventType, data);
    queue.on(eventType, listener);
    eventListeners.push({ event: eventType as QueueEventType, handler: listener });
  }

  // Return cleanup function
  return () => {
    eventListeners.forEach(({ event, handler }) => {
      queue.off(event, handler);
    });
  };
}

/**
 * Import required interfaces
 */
import { IStorageService } from '../storage/StorageService';
import { ISyncService } from '../sync/SyncService';