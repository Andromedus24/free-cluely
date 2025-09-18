// Performance Package Exports
// ==========================

export { PerformanceMonitor } from './PerformanceMonitor';
export { ProfilingService } from './ProfilingService';
export type {
  PerformanceMetrics,
  PerformanceConfig,
  PerformanceSnapshot,
  PerformanceAlert,
  PerformanceReport,
  PerformanceThreshold,
  ProfileData,
  ProfileConfig,
  ProfileSession,
  ProfileReport,
  ProfileType,
  HotSpot,
  CallGraph,
  MemoryProfile,
  CPUProfile
} from '../types';

/**
 * Factory Functions
 */

/**
 * Create performance monitor with default configuration
 */
export function createPerformanceMonitor(config?: Partial<import('../types').PerformanceConfig>): PerformanceMonitor {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().performance;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new PerformanceMonitor(finalConfig);
}

/**
 * Create production performance monitor
 */
export function createProductionPerformanceMonitor(config?: Partial<import('../types').PerformanceConfig>): PerformanceMonitor {
  const { createProductionObservabilityConfig } = require('../index');
  const defaultConfig = createProductionObservabilityConfig().performance;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new PerformanceMonitor(finalConfig);
}

/**
 * Create development performance monitor
 */
export function createDevelopmentPerformanceMonitor(config?: Partial<import('../types').PerformanceConfig>): PerformanceMonitor {
  const { createDevelopmentObservabilityConfig } = require('../index');
  const defaultConfig = createDevelopmentObservabilityConfig().performance;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new PerformanceMonitor(finalConfig);
}

/**
 * Create profiling service with default configuration
 */
export function createProfilingService(config?: Partial<import('../types').ProfileConfig>): ProfilingService {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().profiling;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new ProfilingService(finalConfig);
}

/**
 * Performance profile types
 */
export const ProfileTypes = {
  CPU: 'cpu',
  MEMORY: 'memory',
  HEAP: 'heap',
  EXECUTION: 'execution',
  CUSTOM: 'custom',
  IO: 'io',
  NETWORK: 'network',
  DATABASE: 'database'
} as const;

/**
 * Performance metrics
 */
export const PerformanceMetrics = {
  // CPU Metrics
  CPU_USAGE: 'cpu_usage',
  CPU_TIME: 'cpu_time',
  CPU_USER: 'cpu_user',
  CPU_SYSTEM: 'cpu_system',
  CPU_IDLE: 'cpu_idle',
  CPU_IOWAIT: 'cpu_iowait',
  CPU_STEAL: 'cpu_steal',
  CPU_NICE: 'cpu_nice',

  // Memory Metrics
  MEMORY_USAGE: 'memory_usage',
  MEMORY_TOTAL: 'memory_total',
  MEMORY_FREE: 'memory_free',
  MEMORY_USED: 'memory_used',
  MEMORY_AVAILABLE: 'memory_available',
  MEMORY_BUFFERS: 'memory_buffers',
  MEMORY_CACHED: 'memory_cached',
  MEMORY_SHARED: 'memory_shared',
  MEMORY_SLAB: 'memory_slab',

  // Heap Metrics
  HEAP_SIZE: 'heap_size',
  HEAP_USED: 'heap_used',
  HEAP_FREE: 'heap_free',
  HEAP_LIMIT: 'heap_limit',
  HEAP_TOTAL: 'heap_total',
  HEAP_EXTERNAL: 'heap_external',
  HEAP_NATIVE: 'heap_native',
  HEAP_CODE: 'heap_code',
  HEAP_MAP: 'heap_map',
  HEAP_LARGE_OBJECT: 'heap_large_object',

  // Disk Metrics
  DISK_USAGE: 'disk_usage',
  DISK_TOTAL: 'disk_total',
  DISK_FREE: 'disk_free',
  DISK_USED: 'disk_used',
  DISK_READS: 'disk_reads',
  DISK_WRITES: 'disk_writes',
  DISK_READ_BYTES: 'disk_read_bytes',
  DISK_WRITE_BYTES: 'disk_write_bytes',
  DISK_READ_TIME: 'disk_read_time',
  DISK_WRITE_TIME: 'disk_write_time',

  // Network Metrics
  NETWORK_BYTES_IN: 'network_bytes_in',
  NETWORK_BYTES_OUT: 'network_bytes_out',
  NETWORK_PACKETS_IN: 'network_packets_in',
  NETWORK_PACKETS_OUT: 'network_packets_out',
  NETWORK_ERRORS_IN: 'network_errors_in',
  NETWORK_ERRORS_OUT: 'network_errors_out',
  NETWORK_DROPS_IN: 'network_drops_in',
  NETWORK_DROPS_OUT: 'network_drops_out',
  NETWORK_CONNECTIONS: 'network_connections',

  // Process Metrics
  PROCESS_COUNT: 'process_count',
  PROCESS_CPU_TIME: 'process_cpu_time',
  PROCESS_MEMORY: 'process_memory',
  PROCESS_THREADS: 'process_threads',
  PROCESS_FDS: 'process_fds',
  PROCESS_UPTIME: 'process_uptime',

  // Response Time Metrics
  RESPONSE_TIME: 'response_time',
  RESPONSE_TIME_MIN: 'response_time_min',
  RESPONSE_TIME_MAX: 'response_time_max',
  RESPONSE_TIME_AVG: 'response_time_avg',
  RESPONSE_TIME_P50: 'response_time_p50',
  RESPONSE_TIME_P95: 'response_time_p95',
  RESPONSE_TIME_P99: 'response_time_p99',
  RESPONSE_TIME_P999: 'response_time_p999',

  // Throughput Metrics
  THROUGHPUT: 'throughput',
  THROUGHPUT_MIN: 'throughput_min',
  THROUGHPUT_MAX: 'throughput_max',
  THROUGHPUT_AVG: 'throughput_avg',
  REQUESTS_PER_SECOND: 'requests_per_second',
  OPERATIONS_PER_SECOND: 'operations_per_second',

  // Error Metrics
  ERROR_RATE: 'error_rate',
  ERROR_COUNT: 'error_count',
  ERROR_RATE_4XX: 'error_rate_4xx',
  ERROR_RATE_5XX: 'error_rate_5xx',
  TIMEOUT_RATE: 'timeout_rate',
  TIMEOUT_COUNT: 'timeout_count',

  // Business Metrics
  BUSINESS_TRANSACTIONS: 'business_transactions',
  BUSINESS_REVENUE: 'business_revenue',
  BUSINESS_USERS: 'business_users',
  BUSINESS_CONVERSION_RATE: 'business_conversion_rate',

  // Custom Metrics
  CUSTOM_METRIC_PREFIX: 'custom_'
};

/**
 * Performance thresholds
 */
export const PerformanceThresholds = {
  // Response Time Thresholds (ms)
  RESPONSE_TIME_EXCELLENT: 100,
  RESPONSE_TIME_GOOD: 500,
  RESPONSE_TIME_FAIR: 1000,
  RESPONSE_TIME_POOR: 2000,
  RESPONSE_TIME_CRITICAL: 5000,

  // Throughput Thresholds (requests/sec)
  THROUGHPUT_LOW: 10,
  THROUGHPUT_MEDIUM: 100,
  THROUGHPUT_HIGH: 1000,
  THROUGHPUT_VERY_HIGH: 10000,

  // Error Rate Thresholds (%)
  ERROR_RATE_EXCELLENT: 0.1,
  ERROR_RATE_GOOD: 1.0,
  ERROR_RATE_FAIR: 5.0,
  ERROR_RATE_POOR: 10.0,
  ERROR_RATE_CRITICAL: 25.0,

  // CPU Usage Thresholds (%)
  CPU_USAGE_LOW: 20,
  CPU_USAGE_MEDIUM: 50,
  CPU_USAGE_HIGH: 70,
  CPU_USAGE_CRITICAL: 85,
  CPU_USAGE_DANGER: 95,

  // Memory Usage Thresholds (%)
  MEMORY_USAGE_LOW: 30,
  MEMORY_USAGE_MEDIUM: 60,
  MEMORY_USAGE_HIGH: 80,
  MEMORY_USAGE_CRITICAL: 90,
  MEMORY_USAGE_DANGER: 95,

  // Disk Usage Thresholds (%)
  DISK_USAGE_LOW: 50,
  DISK_USAGE_MEDIUM: 70,
  DISK_USAGE_HIGH: 85,
  DISK_USAGE_CRITICAL: 90,
  DISK_USAGE_DANGER: 95,

  // Availability Thresholds (%)
  AVAILABILITY_EXCELLENT: 99.9,
  AVAILABILITY_GOOD: 99.5,
  AVAILABILITY_FAIR: 99.0,
  AVAILABILITY_POOR: 95.0,
  AVAILABILITY_CRITICAL: 90.0
};

/**
 * Performance alert levels
 */
export const PerformanceAlertLevels = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
  EMERGENCY: 'emergency'
} as const;

/**
 * Performance status codes
 */
export const PerformanceStatusCodes = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNSTABLE: 'unstable',
  CRITICAL: 'critical',
  UNKNOWN: 'unknown'
} as const;

/**
 * Utility Functions
 */

/**
 * Create performance metrics
 */
export function createPerformanceMetrics(
  source: string,
  metrics: Partial<PerformanceMetrics>
): PerformanceMetrics {
  return {
    timestamp: Date.now(),
    source,
    service: metrics.service,
    cpu_usage: metrics.cpu_usage,
    memory_usage: metrics.memory_usage,
    disk_usage: metrics.disk_usage,
    response_time: metrics.response_time,
    throughput: metrics.throughput,
    error_rate: metrics.error_rate,
    network_io: metrics.network_io,
    process_count: metrics.process_count,
    load_average: metrics.load_average,
    uptime: metrics.uptime
  };
}

/**
 * Create performance threshold
 */
export function createPerformanceThreshold(
  name: string,
  metric: string,
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=',
  value: number,
  severity: 'info' | 'warning' | 'critical' | 'emergency',
  duration?: number
): PerformanceThreshold {
  return {
    name,
    metric,
    operator,
    value,
    severity,
    duration: duration || 300000 // Default 5 minutes
  };
}

/**
 * Calculate performance score
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): {
  overall: number;
  cpu: number;
  memory: number;
  disk: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
} {
  const cpu = calculateComponentScore(metrics.cpu_usage, 100, true);
  const memory = calculateComponentScore(metrics.memory_usage, 100, true);
  const disk = calculateComponentScore(metrics.disk_usage, 100, true);
  const responseTime = calculateComponentScore(
    metrics.response_time || 0,
    PerformanceThresholds.RESPONSE_TIME_CRITICAL,
    false
  );
  const throughput = calculateComponentScore(
    metrics.throughput || 0,
    PerformanceThresholds.THROUGHPUT_HIGH,
    true
  );
  const errorRate = calculateComponentScore(
    metrics.error_rate || 0,
    PerformanceThresholds.ERROR_RATE_CRITICAL / 100,
    false
  );

  const overall = (cpu + memory + disk + responseTime + throughput + errorRate) / 6;

  return {
    overall,
    cpu,
    memory,
    disk,
    responseTime,
    throughput,
    errorRate
  };
}

/**
 * Calculate component score
 */
function calculateComponentScore(
  value: number,
  threshold: number,
  lowerIsBetter: boolean
): number {
  if (lowerIsBetter) {
    return Math.max(0, 100 - (value / threshold) * 100);
  } else {
    return Math.min(100, (value / threshold) * 100);
  }
}

/**
 * Get performance status
 */
export function getPerformanceStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}

/**
 * Format performance metrics
 */
export function formatPerformanceMetrics(
  metrics: PerformanceMetrics,
  format: 'json' | 'text' | 'csv' = 'json'
): string {
  switch (format) {
    case 'json':
      return JSON.stringify(metrics, null, 2);

    case 'text':
      const lines = [
        `Performance Metrics for ${metrics.service || metrics.source}`,
        `Timestamp: ${new Date(metrics.timestamp).toISOString()}`,
        `CPU Usage: ${metrics.cpu_usage?.toFixed(2) || 'N/A'}%`,
        `Memory Usage: ${metrics.memory_usage?.toFixed(2) || 'N/A'}%`,
        `Disk Usage: ${metrics.disk_usage?.toFixed(2) || 'N/A'}%`,
        `Response Time: ${metrics.response_time?.toFixed(2) || 'N/A'}ms`,
        `Throughput: ${metrics.throughput?.toFixed(2) || 'N/A'}/s`,
        `Error Rate: ${(metrics.error_rate! * 100)?.toFixed(2) || 'N/A'}%`
      ];
      return lines.join('\n');

    case 'csv':
      const headers = Object.keys(metrics).join(',');
      const values = Object.values(metrics).map(v => {
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      }).join(',');
      return `${headers}\n${values}`;

    default:
      return JSON.stringify(metrics, null, 2);
  }
}

/**
 * Validate performance metrics
 */
export function validatePerformanceMetrics(metrics: PerformanceMetrics): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!metrics.source || typeof metrics.source !== 'string') {
    errors.push('Source is required and must be a string');
  }

  if (!metrics.timestamp || typeof metrics.timestamp !== 'number') {
    errors.push('Timestamp is required and must be a number');
  }

  if (metrics.cpu_usage !== undefined && (typeof metrics.cpu_usage !== 'number' || metrics.cpu_usage < 0 || metrics.cpu_usage > 100)) {
    errors.push('CPU usage must be a number between 0 and 100');
  }

  if (metrics.memory_usage !== undefined && (typeof metrics.memory_usage !== 'number' || metrics.memory_usage < 0 || metrics.memory_usage > 100)) {
    errors.push('Memory usage must be a number between 0 and 100');
  }

  if (metrics.disk_usage !== undefined && (typeof metrics.disk_usage !== 'number' || metrics.disk_usage < 0 || metrics.disk_usage > 100)) {
    errors.push('Disk usage must be a number between 0 and 100');
  }

  if (metrics.response_time !== undefined && (typeof metrics.response_time !== 'number' || metrics.response_time < 0)) {
    errors.push('Response time must be a positive number');
  }

  if (metrics.throughput !== undefined && (typeof metrics.throughput !== 'number' || metrics.throughput < 0)) {
    errors.push('Throughput must be a positive number');
  }

  if (metrics.error_rate !== undefined && (typeof metrics.error_rate !== 'number' || metrics.error_rate < 0 || metrics.error_rate > 1)) {
    errors.push('Error rate must be a number between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate moving average
 */
export function calculateMovingAverage(
  values: number[],
  windowSize: number
): number[] {
  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const average = window.reduce((sum, val) => sum + val, 0) / window.length;
    result.push(average);
  }

  return result;
}

/**
 * Calculate exponential moving average
 */
export function calculateExponentialMovingAverage(
  values: number[],
  alpha: number = 0.1
): number[] {
  if (values.length === 0) return [];

  const result: number[] = [values[0]];

  for (let i = 1; i < values.length; i++) {
    const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
    result.push(ema);
  }

  return result;
}

/**
 * Detect performance anomalies
 */
export function detectPerformanceAnomalies(
  metrics: PerformanceMetrics[],
  threshold: number = 2.0
): Array<{
  timestamp: number;
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: number;
}> {
  const anomalies: Array<{
    timestamp: number;
    metric: string;
    value: number;
    expected: number;
    deviation: number;
    severity: number;
  }> = [];

  // Calculate baseline (moving average)
  const baseline = calculateMovingAverage(
    metrics.map(m => m.cpu_usage || 0),
    10
  );

  // Check each metric for anomalies
  const metricFields = ['cpu_usage', 'memory_usage', 'disk_usage', 'response_time', 'throughput', 'error_rate'];

  for (const field of metricFields) {
    const values = metrics.map(m => m[field as keyof PerformanceMetrics] as number).filter(v => v !== undefined);

    if (values.length === 0) continue;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    for (let i = 0; i < metrics.length; i++) {
      const value = metrics[i][field as keyof PerformanceMetrics] as number;
      if (value === undefined) continue;

      const deviation = Math.abs(value - mean);
      const zScore = deviation / stdDev;

      if (zScore > threshold) {
        anomalies.push({
          timestamp: metrics[i].timestamp,
          metric: field,
          value,
          expected: mean,
          deviation,
          severity: Math.min(1, zScore / (threshold * 2))
        });
      }
    }
  }

  return anomalies;
}

/**
 * Generate performance recommendations
 */
export function generatePerformanceRecommendations(
  metrics: PerformanceMetrics[],
  anomalies: Array<{
    metric: string;
    value: number;
    severity: number;
  }>
): string[] {
  const recommendations: string[] = [];

  // Analyze CPU usage
  const cpuMetrics = metrics.map(m => m.cpu_usage).filter(v => v !== undefined);
  if (cpuMetrics.length > 0) {
    const avgCpu = cpuMetrics.reduce((a, b) => a + b, 0) / cpuMetrics.length;
    if (avgCpu > 80) {
      recommendations.push('Consider optimizing CPU-intensive operations or scaling horizontally');
    }
  }

  // Analyze memory usage
  const memoryMetrics = metrics.map(m => m.memory_usage).filter(v => v !== undefined);
  if (memoryMetrics.length > 0) {
    const avgMemory = memoryMetrics.reduce((a, b) => a + b, 0) / memoryMetrics.length;
    if (avgMemory > 85) {
      recommendations.push('Investigate memory usage patterns and potential memory leaks');
    }
  }

  // Analyze response time
  const responseTimeMetrics = metrics.map(m => m.response_time).filter(v => v !== undefined);
  if (responseTimeMetrics.length > 0) {
    const avgResponseTime = responseTimeMetrics.reduce((a, b) => a + b, 0) / responseTimeMetrics.length;
    if (avgResponseTime > 1000) {
      recommendations.push('Optimize slow operations and consider implementing caching');
    }
  }

  // Analyze error rate
  const errorRateMetrics = metrics.map(m => m.error_rate).filter(v => v !== undefined);
  if (errorRateMetrics.length > 0) {
    const avgErrorRate = errorRateMetrics.reduce((a, b) => a + b, 0) / errorRateMetrics.length;
    if (avgErrorRate > 0.05) {
      recommendations.push('Review error logs and implement better error handling');
    }
  }

  // Analyze anomalies
  const severeAnomalies = anomalies.filter(a => a.severity > 0.7);
  if (severeAnomalies.length > 0) {
    recommendations.push(`Address ${severeAnomalies.length} severe performance anomalies detected`);
  }

  if (recommendations.length === 0) {
    recommendations.push('Performance metrics are within acceptable ranges');
  }

  return recommendations;
}