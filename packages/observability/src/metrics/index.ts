// Metrics Package Exports
// =====================

export { MetricsCollector } from './MetricsCollector';
export type {
  MetricsQuery,
  AggregationState,
  MetricCollector,
  MetricAggregator,
  MetricsExporter
} from './MetricsCollector';

/**
 * Factory Functions
 */

/**
 * Create metrics collector with default configuration
 */
export function createMetricsCollector(config?: Partial<import('../types').MetricsConfig>): MetricsCollector {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().metrics;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new MetricsCollector(finalConfig);
}

/**
 * Create production metrics collector
 */
export function createProductionMetricsCollector(config?: Partial<import('../types').MetricsConfig>): MetricsCollector {
  const { createProductionObservabilityConfig } = require('../index');
  const defaultConfig = createProductionObservabilityConfig().metrics;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new MetricsCollector(finalConfig);
}

/**
 * Create development metrics collector
 */
export function createDevelopmentMetricsCollector(config?: Partial<import('../types').MetricsConfig>): MetricsCollector {
  const { createDevelopmentObservabilityConfig } = require('../index');
  const defaultConfig = createDevelopmentObservabilityConfig().metrics;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new MetricsCollector(finalConfig);
}

/**
 * Common metric names
 */
export const MetricNames = {
  // System Metrics
  SYSTEM_CPU_USAGE: 'system.cpu.usage',
  SYSTEM_MEMORY_USAGE: 'system.memory.usage',
  SYSTEM_DISK_USAGE: 'system.disk.usage',
  SYSTEM_NETWORK_IN: 'system.network.bytes_in',
  SYSTEM_NETWORK_OUT: 'system.network.bytes_out',
  SYSTEM_LOAD_AVG: 'system.load_average',
  SYSTEM_UPTIME: 'system.uptime',

  // Process Metrics
  PROCESS_CPU_USAGE: 'process.cpu.usage',
  PROCESS_MEMORY_USAGE: 'process.memory.usage',
  PROCESS_MEMORY_HEAP: 'process.memory.heap',
  PROCESS_MEMORY_EXTERNAL: 'process.memory.external',
  PROCESS_UPTIME: 'process.uptime',
  PROCESS_HANDLES: 'process.handles',
  PROCESS_THREADS: 'process.threads',

  // HTTP Metrics
  HTTP_REQUESTS_TOTAL: 'http.requests.total',
  HTTP_REQUESTS_ACTIVE: 'http.requests.active',
  HTTP_RESPONSE_TIME: 'http.response_time',
  HTTP_RESPONSE_SIZE: 'http.response_size',
  HTTP_REQUEST_SIZE: 'http.request_size',
  HTTP_ERRORS_TOTAL: 'http.errors.total',
  HTTP_REDIRECTS_TOTAL: 'http.redirects.total',

  // Database Metrics
  DB_CONNECTIONS_ACTIVE: 'db.connections.active',
  DB_CONNECTIONS_IDLE: 'db.connections.idle',
  DB_CONNECTIONS_TOTAL: 'db.connections.total',
  DB_QUERY_TIME: 'db.query.time',
  DB_QUERY_ERRORS: 'db.query.errors',
  DB_TRANSACTIONS_TOTAL: 'db.transactions.total',
  DB_TRANSACTIONS_ACTIVE: 'db.transactions.active',

  // Cache Metrics
  CACHE_HITS: 'cache.hits',
  CACHE_MISSES: 'cache.misses',
 _CACHE_HIT_RATE: 'cache.hit_rate',
  CACHE_SIZE: 'cache.size',
  CACHE_EVICTIONS: 'cache.evictions',
  CACHE_EXPIRATIONS: 'cache.expirations',

  // Queue Metrics
  QUEUE_SIZE: 'queue.size',
  QUEUE_PROCESSED: 'queue.processed',
  QUEUE_FAILED: 'queue.failed',
  QUEUE_PROCESSING_TIME: 'queue.processing_time',
  QUEUE_WAIT_TIME: 'queue.wait_time',

  // Business Metrics
  BUSINESS_USERS_ACTIVE: 'business.users.active',
  BUSINESS_USERS_TOTAL: 'business.users.total',
  BUSINESS_SESSIONS_ACTIVE: 'business.sessions.active',
  BUSINESS_TRANSACTIONS_TOTAL: 'business.transactions.total',
  BUSINESS_TRANSACTIONS_VALUE: 'business.transactions.value',
  BUSINESS_CONVERSION_RATE: 'business.conversion_rate',

  // Application Metrics
  APP_STARTUP_TIME: 'app.startup.time',
  APP_ERRORS_TOTAL: 'app.errors.total',
  APP_WARNINGS_TOTAL: 'app.warnings.total',
  APP_LOGS_TOTAL: 'app.logs.total',
  APP_MEMORY_LEAK: 'app.memory.leak',

  // Performance Metrics
  PERF_RESPONSE_TIME_P50: 'perf.response_time.p50',
  PERF_RESPONSE_TIME_P95: 'perf.response_time.p95',
  PERF_RESPONSE_TIME_P99: 'perf.response_time.p99',
  PERF_THROUGHPUT: 'perf.throughput',
  PERF_ERROR_RATE: 'perf.error_rate',
  PERF_AVAILABILITY: 'perf.availability',

  // Custom Metrics
  CUSTOM_GAUGE: 'custom.gauge',
  CUSTOM_COUNTER: 'custom.counter',
  CUSTOM_HISTOGRAM: 'custom.histogram',
  CUSTOM_SUMMARY: 'custom.summary'
};

/**
 * Common metric tags
 */
export const MetricTags = {
  // Environment
  ENVIRONMENT: 'environment',
  REGION: 'region',
  ZONE: 'zone',
  INSTANCE: 'instance',
  HOST: 'host',
  POD: 'pod',
  CONTAINER: 'container',

  // Application
  APP_NAME: 'app.name',
  APP_VERSION: 'app.version',
  APP_COMPONENT: 'app.component',
  APP_LAYER: 'app.layer',

  // Business
  BUSINESS_UNIT: 'business.unit',
  PRODUCT: 'product',
  SERVICE: 'service',
  TEAM: 'team',

  // HTTP
  HTTP_METHOD: 'http.method',
  HTTP_STATUS: 'http.status',
  HTTP_PATH: 'http.path',
  HTTP_ROUTE: 'http.route',
  HTTP_ENDPOINT: 'http.endpoint',

  // Database
  DB_NAME: 'db.name',
  DB_TABLE: 'db.table',
  DB_OPERATION: 'db.operation',
  DB_TYPE: 'db.type',

  // User
  USER_ID: 'user.id',
  USER_TYPE: 'user.type',
  USER_ROLE: 'user.role',
  USER_TIER: 'user.tier',

  // Error
  ERROR_TYPE: 'error.type',
  ERROR_CODE: 'error.code',
  ERROR_CATEGORY: 'error.category',

  // Performance
  PERCENTILE: 'percentile',
  WINDOW: 'window',
  AGGREGATION: 'aggregation'
};

/**
 * Metric utility functions
 */

/**
 * Create metric with common tags
 */
export function createMetric(
  name: string,
  value: number,
  type: import('../types').MetricType,
  tags: Record<string, string> = {}
): import('../types').Metric {
  return {
    name,
    value,
    timestamp: Date.now(),
    type,
    tags
  };
}

/**
 * Create gauge metric
 */
export function createGauge(name: string, value: number, tags: Record<string, string> = {}): import('../types').Metric {
  return createMetric(name, value, 'gauge', tags);
}

/**
 * Create counter metric
 */
export function createCounter(name: string, value: number, tags: Record<string, string> = {}): import('../types').Metric {
  return createMetric(name, value, 'counter', tags);
}

/**
 * Create histogram metric
 */
export function createHistogram(name: string, value: number, tags: Record<string, string> = {}): import('../types').Metric {
  return createMetric(name, value, 'histogram', tags);
}

/**
 * Create summary metric
 */
export function createSummary(name: string, value: number, tags: Record<string, string> = {}): import('../types').Metric {
  return createMetric(name, value, 'summary', tags);
}

/**
 * Add common tags to metric
 */
export function addCommonTags(
  metric: import('../types').Metric,
  commonTags: Record<string, string>
): import('../types').Metric {
  return {
    ...metric,
    tags: { ...commonTags, ...metric.tags }
  };
}

/**
 * Validate metric name
 */
export function validateMetricName(name: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for valid characters (alphanumeric, underscore, dot, colon)
  if (!/^[a-zA-Z0-9_:][a-zA-Z0-9_:.-]*$/.test(name)) {
    errors.push('Metric name must contain only alphanumeric characters, underscores, dots, and colons');
  }

  // Check length
  if (name.length > 200) {
    errors.push('Metric name must be less than 200 characters');
  }

  // Check for reserved prefixes
  if (name.startsWith('__')) {
    errors.push('Metric name cannot start with double underscore');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate metric tags
 */
export function validateMetricTags(tags: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [key, value] of Object.entries(tags)) {
    // Validate tag key
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      errors.push(`Invalid tag key: ${key}`);
    }

    // Validate tag value
    if (typeof value !== 'string') {
      errors.push(`Tag value must be string for key: ${key}`);
    }

    // Check length
    if (key.length > 100) {
      errors.push(`Tag key too long: ${key}`);
    }

    if (value.length > 200) {
      errors.push(`Tag value too long for key: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate metric statistics
 */
export function calculateMetricStats(metrics: import('../types').Metric[]): {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
} {
  if (metrics.length === 0) {
    return {
      count: 0,
      sum: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p95: 0,
      p99: 0,
      stdDev: 0
    };
  }

  const values = metrics.map(m => m.value).sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / values.length;
  const median = values[Math.floor(values.length / 2)];
  const p95 = values[Math.floor(values.length * 0.95)];
  const p99 = values[Math.floor(values.length * 0.99)];

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: values.length,
    sum,
    min: values[0],
    max: values[values.length - 1],
    mean,
    median,
    p95,
    p99,
    stdDev
  };
}

/**
 * Generate metric key for aggregation
 */
export function generateMetricKey(name: string, tags: Record<string, string>): string {
  const sortedTags = Object.entries(tags)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');

  return sortedTags ? `${name}{${sortedTags}}` : name;
}

/**
 * Parse metric key
 */
export function parseMetricKey(key: string): { name: string; tags: Record<string, string> } {
  const match = key.match(/^([^{}]+)(?:\{(.*)\})?$/);
  if (!match) {
    return { name: key, tags: {} };
  }

  const [, name, tagsStr] = match;
  const tags: Record<string, string> = {};

  if (tagsStr) {
    tagsStr.split(',').forEach(tag => {
      const [key, value] = tag.split('=');
      if (key && value) {
        tags[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    });
  }

  return { name, tags };
}

/**
 * Create metric buckets for histogram
 */
export function createHistogramBuckets(min: number, max: number, count: number): number[] {
  const buckets: number[] = [];
  const step = (max - min) / (count - 1);

  for (let i = 0; i < count - 1; i++) {
    buckets.push(min + (step * i));
  }
  buckets.push(max);

  return buckets;
}

/**
 * Calculate rate from counter metrics
 */
export function calculateRate(metrics: import('../types').Metric[], windowMs: number = 60000): number {
  if (metrics.length < 2) {
    return 0;
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  const windowMetrics = metrics.filter(m => m.timestamp >= windowStart && m.timestamp <= now);
  if (windowMetrics.length < 2) {
    return 0;
  }

  const first = windowMetrics[0];
  const last = windowMetrics[windowMetrics.length - 1];
  const timeDiff = last.timestamp - first.timestamp;

  if (timeDiff === 0) {
    return 0;
  }

  return (last.value - first.value) / (timeDiff / 1000); // per second
}

/**
 * Create moving average
 */
export function createMovingAverage(metrics: import('../types').Metric[], windowSize: number): number[] {
  if (metrics.length === 0) {
    return [];
  }

  const averages: number[] = [];
  const values = metrics.map(m => m.value);

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    averages.push(average);
  }

  return averages;
}