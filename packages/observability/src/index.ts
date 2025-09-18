// Observability Package Exports
// =============================

export { ObservabilityService } from './ObservabilityService';

export type {
  // Core Types
  IObservabilityService,
  ObservabilityConfig,
  TraceContext,
  Span,
  SpanLink,
  LogEntry,
  LogLevel,
  ErrorInfo,
  Metric,
  MetricType,
  HistogramBucket,
  SummaryStats,
  AlertConfig,
  AlertCondition,
  AlertSeverity,
  AlertAction,
  AlertEvent,
  PerformanceMetrics,
  HealthStatus,
  HealthCheck,
  ObservabilityEventType,
  ObservabilityEventHandler,

  // Configuration Types
  TracingConfig,
  MetricsConfig,
  LoggingConfig,
  AlertingConfig,
  NotificationChannel,
  DashboardConfig,
  ExporterConfig,
  AuthConfig,

  // Filter Types
  TraceFilter,
  LogFilter,
  ExportFilter
} from './types';

/**
 * Factory Functions
 */

/**
 * Create default observability configuration
 */
export function createDefaultObservabilityConfig(): ObservabilityConfig {
  return {
    tracing: {
      enabled: true,
      sampleRate: 1.0,
      maxSpansPerTrace: 1000,
      maxTraceAge: 24 * 60 * 60 * 1000, // 24 hours
      includeStackTrace: true,
      includeMetadata: true,
      propagationFormat: 'w3c'
    },
    metrics: {
      enabled: true,
      collectionInterval: 10000, // 10 seconds
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      aggregationInterval: 60000, // 1 minute
      defaultBuckets: [0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 100, 250, 500, 1000],
      defaultPercentiles: [0.5, 0.75, 0.9, 0.95, 0.99],
      maxMetrics: 100000,
      enableCompression: true
    },
    logging: {
      enabled: true,
      level: 'info',
      format: 'json',
      maxLogSize: 10 * 1024 * 1024, // 10MB
      retentionDays: 30,
      enableStructuredLogging: true,
      enableSampling: false,
      sampleRate: 1.0
    },
    alerting: {
      enabled: true,
      evaluationInterval: 60000, // 1 minute
      cooldownPeriod: 300000, // 5 minutes
      maxActiveAlerts: 1000,
      enableNotificationThrottling: true,
      notificationChannels: [
        {
          id: 'console',
          name: 'Console',
          type: 'log',
          config: {},
          enabled: true
        }
      ]
    },
    dashboards: {
      enabled: true,
      refreshInterval: 30000, // 30 seconds
      maxPanels: 50,
      enableRealtimeUpdates: true,
      enableExport: true,
      enableSharing: true
    },
    exporters: [
      {
        type: 'prometheus',
        enabled: true,
        config: { port: 9090 },
        endpoints: ['/metrics'],
        headers: {}
      }
    ]
  };
}

/**
 * Create production observability configuration
 */
export function createProductionObservabilityConfig(): ObservabilityConfig {
  const config = createDefaultObservabilityConfig();

  return {
    ...config,
    tracing: {
      ...config.tracing,
      sampleRate: 0.1, // Sample 10% of traces in production
      maxSpansPerTrace: 500
    },
    metrics: {
      ...config.metrics,
      retentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
      collectionInterval: 15000 // 15 seconds
    },
    logging: {
      ...config.logging,
      level: 'warn',
      retentionDays: 90,
      enableSampling: true,
      sampleRate: 0.5
    },
    alerting: {
      ...config.alerting,
      notificationChannels: [
        ...config.alerting.notificationChannels,
        {
          id: 'slack',
          name: 'Slack',
          type: 'slack',
          config: { webhook: process.env.SLACK_WEBHOOK_URL },
          enabled: true
        },
        {
          id: 'pagerduty',
          name: 'PagerDuty',
          type: 'pagerduty',
          config: { serviceKey: process.env.PAGERDUTY_SERVICE_KEY },
          enabled: true
        }
      ]
    },
    exporters: [
      {
        type: 'datadog',
        enabled: true,
        config: {
          apiKey: process.env.DATADOG_API_KEY,
          site: process.env.DATADOG_SITE || 'datadoghq.com'
        },
        endpoints: ['https://api.datadoghq.com'],
        headers: {}
      },
      {
        type: 'jaeger',
        enabled: true,
        config: { serviceName: 'atlas-observability' },
        endpoints: ['http://localhost:14268/api/traces'],
        headers: {}
      }
    ]
  };
}

/**
 * Create development observability configuration
 */
export function createDevelopmentObservabilityConfig(): ObservabilityConfig {
  const config = createDefaultObservabilityConfig();

  return {
    ...config,
    tracing: {
      ...config.tracing,
      sampleRate: 1.0, // Sample all traces in development
      includeStackTrace: true
    },
    logging: {
      ...config.logging,
      level: 'debug',
      format: 'pretty',
      retentionDays: 7,
      enableSampling: false
    },
    alerting: {
      ...config.alerting,
      enabled: false // Disable alerts in development
    },
    exporters: [
      {
        type: 'prometheus',
        enabled: true,
        config: { port: 9090 },
        endpoints: ['/metrics'],
        headers: {}
      }
    ]
  };
}

/**
 * Create observability service
 */
export function createObservabilityService(
  config: ObservabilityConfig = createDefaultObservabilityConfig()
): ObservabilityService {
  return new ObservabilityService(config);
}

/**
 * Utility Functions
 */

/**
 * Create a default alert configuration
 */
export function createDefaultAlertConfig(
  name: string,
  metric: string,
  threshold: number,
  operator: AlertConfig['condition']['operator'] = 'gt'
): AlertConfig {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    description: `Alert when ${metric} ${operator} ${threshold}`,
    condition: {
      metric,
      operator,
      threshold
    },
    severity: 'warning',
    actions: [],
    cooldown: 300000, // 5 minutes
    enabled: true,
    tags: {}
  };
}

/**
 * Create a critical alert configuration
 */
export function createCriticalAlertConfig(
  name: string,
  metric: string,
  threshold: number,
  operator: AlertConfig['condition']['operator'] = 'gt'
): AlertConfig {
  return {
    ...createDefaultAlertConfig(name, metric, threshold, operator),
    severity: 'critical',
    cooldown: 60000 // 1 minute for critical alerts
  };
}

/**
 * Create performance monitoring alerts
 */
export function createPerformanceAlerts(): AlertConfig[] {
  return [
    createCriticalAlertConfig('High Response Time', 'response_time_p95', 1000),
    createCriticalAlertConfig('High Error Rate', 'error_rate', 0.05),
    createDefaultAlertConfig('Low Throughput', 'throughput', 10, 'lt'),
    createCriticalAlertConfig('High Memory Usage', 'memory_usage_percent', 90),
    createDefaultAlertConfig('High CPU Usage', 'cpu_usage_percent', 80)
  ];
}

/**
 * Validate observability configuration
 */
export function validateObservabilityConfig(config: ObservabilityConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate tracing config
  if (config.tracing.enabled) {
    if (config.tracing.sampleRate < 0 || config.tracing.sampleRate > 1) {
      errors.push('tracing.sampleRate must be between 0 and 1');
    }
    if (config.tracing.maxSpansPerTrace <= 0) {
      errors.push('tracing.maxSpansPerTrace must be greater than 0');
    }
    if (config.tracing.maxTraceAge <= 0) {
      errors.push('tracing.maxTraceAge must be greater than 0');
    }
  }

  // Validate metrics config
  if (config.metrics.enabled) {
    if (config.metrics.collectionInterval <= 0) {
      errors.push('metrics.collectionInterval must be greater than 0');
    }
    if (config.metrics.retentionPeriod <= 0) {
      errors.push('metrics.retentionPeriod must be greater than 0');
    }
    if (config.metrics.maxMetrics <= 0) {
      errors.push('metrics.maxMetrics must be greater than 0');
    }
  }

  // Validate logging config
  if (config.logging.enabled) {
    if (!['debug', 'info', 'warn', 'error', 'fatal'].includes(config.logging.level)) {
      errors.push('logging.level must be a valid log level');
    }
    if (config.logging.maxLogSize <= 0) {
      errors.push('logging.maxLogSize must be greater than 0');
    }
    if (config.logging.retentionDays <= 0) {
      errors.push('logging.retentionDays must be greater than 0');
    }
  }

  // Validate alerting config
  if (config.alerting.enabled) {
    if (config.alerting.evaluationInterval <= 0) {
      errors.push('alerting.evaluationInterval must be greater than 0');
    }
    if (config.alerting.cooldownPeriod <= 0) {
      errors.push('alerting.cooldownPeriod must be greater than 0');
    }
    if (config.alerting.maxActiveAlerts <= 0) {
      errors.push('alerting.maxActiveAlerts must be greater than 0');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create system health checks
 */
export function createSystemHealthChecks(): HealthCheck[] {
  return [
    {
      id: 'memory',
      name: 'Memory Usage',
      status: 'pass',
      duration: 0,
      message: 'Memory usage within normal limits',
      metadata: {}
    },
    {
      id: 'disk',
      name: 'Disk Space',
      status: 'pass',
      duration: 0,
      message: 'Disk space sufficient',
      metadata: {}
    },
    {
      id: 'database',
      name: 'Database Connection',
      status: 'pass',
      duration: 0,
      message: 'Database connection healthy',
      metadata: {}
    },
    {
      id: 'api',
      name: 'API Endpoints',
      status: 'pass',
      duration: 0,
      message: 'API endpoints responding',
      metadata: {}
    }
  ];
}

/**
 * Create default performance metrics
 */
export function createDefaultPerformanceMetrics(): PerformanceMetrics {
  return {
    responseTime: {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p95: 0,
      p99: 0,
      stdDev: 0
    },
    throughput: 0,
    errorRate: 0,
    memory: {
      used: 0,
      total: 0,
      percentage: 0
    },
    cpu: {
      usage: 0,
      cores: 0
    },
    disk: {
      used: 0,
      total: 0,
      percentage: 0
    },
    network: {
      bytesIn: 0,
      bytesOut: 0,
      connections: 0
    }
  };
}