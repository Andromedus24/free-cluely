// Observability Framework Types
// =============================

import { EventEmitter } from 'events';

/**
 * Core observability interfaces and types
 */

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'cancelled';
  tags: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Span for individual operations within a trace
 */
export interface Span {
  id: string;
  parentId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'success' | 'error' | 'cancelled';
  tags: Record<string, any>;
  logs: LogEntry[];
  metrics: Metric[];
  links: SpanLink[];
}

/**
 * Link between spans
 */
export interface SpanLink {
  traceId: string;
  spanId: string;
  relationship: 'child' | 'parent' | 'follows' | 'preceded';
}

/**
 * Log entry with structured data
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  source: string;
  traceId?: string;
  spanId?: string;
  metadata: Record<string, any>;
  error?: ErrorInfo;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Error information
 */
export interface ErrorInfo {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  context?: Record<string, any>;
}

/**
 * Metric data point
 */
export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  type: MetricType;
  tags: Record<string, string>;
  unit?: string;
}

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Histogram bucket
 */
export interface HistogramBucket {
  upperBound: number;
  count: number;
}

/**
 * Summary statistics
 */
export interface SummaryStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

/**
 * Alert configuration
 */
export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  actions: AlertAction[];
  cooldown: number;
  enabled: boolean;
  tags: Record<string, string>;
}

/**
 * Alert condition
 */
export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  threshold: number;
  duration?: number;
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
  groupBy?: string[];
}

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert action
 */
export interface AlertAction {
  type: 'webhook' | 'email' | 'slack' | 'pagerduty' | 'log';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Alert event
 */
export interface AlertEvent {
  id: string;
  alertId: string;
  timestamp: number;
  severity: AlertSeverity;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  resolved: boolean;
  resolvedAt?: number;
  metadata: Record<string, any>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  responseTime: SummaryStats;
  throughput: number;
  errorRate: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    cores: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
}

/**
 * System health status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: HealthCheck[];
  overallScore: number;
}

/**
 * Individual health check
 */
export interface HealthCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  metadata: Record<string, any>;
}

/**
 * Observability configuration
 */
export interface ObservabilityConfig {
  tracing: TracingConfig;
  metrics: MetricsConfig;
  logging: LoggingConfig;
  alerting: AlertingConfig;
  dashboards: DashboardConfig;
  exporters: ExporterConfig[];
}

/**
 * Tracing configuration
 */
export interface TracingConfig {
  enabled: boolean;
  sampleRate: number;
  maxSpansPerTrace: number;
  maxTraceAge: number;
  includeStackTrace: boolean;
  includeMetadata: boolean;
  propagationFormat: 'w3c' | 'b3' | 'jaeger';
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number;
  retentionPeriod: number;
  aggregationInterval: number;
  defaultBuckets: number[];
  defaultPercentiles: number[];
  maxMetrics: number;
  enableCompression: true;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  enabled: boolean;
  level: LogLevel;
  format: 'json' | 'text' | 'pretty';
  maxLogSize: number;
  retentionDays: number;
  enableStructuredLogging: boolean;
  enableSampling: boolean;
  sampleRate: number;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  evaluationInterval: number;
  cooldownPeriod: number;
  maxActiveAlerts: number;
  enableNotificationThrottling: boolean;
  notificationChannels: NotificationChannel[];
}

/**
 * Notification channel
 */
export interface NotificationChannel {
  id: string;
  name: string;
  type: 'webhook' | 'email' | 'slack' | 'pagerduty';
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  enabled: boolean;
  refreshInterval: number;
  maxPanels: number;
  enableRealtimeUpdates: boolean;
  enableExport: boolean;
  enableSharing: boolean;
}

/**
 * Exporter configuration
 */
export interface ExporterConfig {
  type: 'prometheus' | 'jaeger' | 'elasticsearch' | 'datadog' | 'custom';
  enabled: boolean;
  config: Record<string, any>;
  endpoints: string[];
  headers?: Record<string, string>;
  auth?: AuthConfig;
}

/**
 * Authentication configuration
 */
export interface AuthConfig {
  type: 'bearer' | 'basic' | 'api-key' | 'oauth';
  credentials: Record<string, any>;
}

/**
 * Observability service interface
 */
export interface IObservabilityService extends EventEmitter {
  // Tracing
  startTrace(operation: string, tags?: Record<string, any>): TraceContext;
  finishTrace(traceId: string, status?: TraceContext['status'], tags?: Record<string, any>): void;
  startSpan(operation: string, traceId?: string, parentId?: string): Span;
  finishSpan(spanId: string, status?: Span['status'], tags?: Record<string, any>): void;

  // Metrics
  recordMetric(metric: Metric): void;
  incrementCounter(name: string, value?: number, tags?: Record<string, string>): void;
  setGauge(name: string, value: number, tags?: Record<string, string>): void;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): void;

  // Logging
  log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: ErrorInfo): void;
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void;

  // Alerting
  createAlert(config: AlertConfig): Promise<void>;
  updateAlert(id: string, config: Partial<AlertConfig>): Promise<void>;
  deleteAlert(id: string): Promise<void>;
  getAlerts(): AlertConfig[];
  getAlertHistory(limit?: number): AlertEvent[];

  // Health & Performance
  getHealth(): Promise<HealthStatus>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;

  // Query & Export
  queryMetrics(query: string): Promise<Metric[]>;
  queryTraces(filter: TraceFilter): Promise<TraceContext[]>;
  queryLogs(filter: LogFilter): Promise<LogEntry[]>;
  exportData(format: 'json' | 'csv' | 'parquet', filter?: ExportFilter): Promise<string>;

  // Management
  start(): Promise<void>;
  stop(): Promise<void>;
  getConfig(): ObservabilityConfig;
  updateConfig(config: Partial<ObservabilityConfig>): Promise<void>;
}

/**
 * Trace filter
 */
export interface TraceFilter {
  operation?: string;
  status?: TraceContext['status'];
  startTime?: number;
  endTime?: number;
  tags?: Record<string, any>;
  limit?: number;
}

/**
 * Log filter
 */
export interface LogFilter {
  level?: LogLevel;
  source?: string;
  startTime?: number;
  endTime?: number;
  message?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, any>;
  limit?: number;
}

/**
 * Export filter
 */
export interface ExportFilter {
  startTime?: number;
  endTime?: number;
  includeMetrics?: boolean;
  includeLogs?: boolean;
  includeTraces?: boolean;
  includeAlerts?: boolean;
}

/**
 * Observability event types
 */
export type ObservabilityEventType =
  | 'traceStarted'
  | 'traceFinished'
  | 'spanStarted'
  | 'spanFinished'
  | 'metricRecorded'
  | 'logRecorded'
  | 'alertTriggered'
  | 'alertResolved'
  | 'healthCheck'
  | 'performanceMetrics'
  | 'exportStarted'
  | 'exportFinished'
  | 'configUpdated'
  | 'error';

/**
 * Observability event handler
 */
export interface ObservabilityEventHandler {
  (event: ObservabilityEventType, data?: any): void;
}