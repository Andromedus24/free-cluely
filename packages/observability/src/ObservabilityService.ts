// Observability Service Implementation
// ===================================

import { EventEmitter } from 'events';
import {
  IObservabilityService,
  ObservabilityConfig,
  TraceContext,
  Span,
  Metric,
  LogEntry,
  LogLevel,
  ErrorInfo,
  AlertConfig,
  AlertEvent,
  HealthStatus,
  HealthCheck,
  PerformanceMetrics,
  SummaryStats,
  TraceFilter,
  LogFilter,
  ExportFilter,
  ObservabilityEventType,
  ObservabilityEventHandler
} from './types';

/**
 * Core observability service implementation
 */
export class ObservabilityService extends EventEmitter implements IObservabilityService {
  private config: ObservabilityConfig;
  private traces: Map<string, TraceContext> = new Map();
  private spans: Map<string, Span> = new Map();
  private metrics: Metric[] = [];
  private logs: LogEntry[] = [];
  private alerts: Map<string, AlertConfig> = new Map();
  private alertHistory: AlertEvent[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private isRunning: boolean = false;
  private metricAggregations: Map<string, any> = new Map();
  private alertTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: ObservabilityConfig) {
    super();
    this.config = { ...config };
    this.setupEventHandlers();
  }

  // Lifecycle Management
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startMetricsCollection();
    this.startHealthChecks();
    this.startAlertEvaluation();

    this.emit('started');
    this.info('Observability service started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopMetricsCollection();
    this.stopHealthChecks();
    this.stopAlertEvaluation();

    this.emit('stopped');
    this.info('Observability service stopped');
  }

  getConfig(): ObservabilityConfig {
    return { ...this.config };
  }

  async updateConfig(config: Partial<ObservabilityConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Restart services if needed
    if (this.isRunning) {
      if (config.metrics) {
        this.stopMetricsCollection();
        this.startMetricsCollection();
      }
      if (config.alerting) {
        this.stopAlertEvaluation();
        this.startAlertEvaluation();
      }
    }

    this.emit('configUpdated', { oldConfig, newConfig: this.config });
  }

  // Tracing
  startTrace(operation: string, tags: Record<string, any> = {}): TraceContext {
    const traceId = this.generateId();
    const spanId = this.generateId();

    const trace: TraceContext = {
      traceId,
      spanId,
      operation,
      startTime: Date.now(),
      status: 'pending',
      tags,
      metadata: {}
    };

    this.traces.set(traceId, trace);
    this.emit('traceStarted', trace);
    return trace;
  }

  finishTrace(traceId: string, status: TraceContext['status'] = 'success', tags: Record<string, any> = {}): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;
    trace.tags = { ...trace.tags, ...tags };

    this.traces.set(traceId, trace);
    this.emit('traceFinished', trace);
  }

  startSpan(operation: string, traceId?: string, parentId?: string): Span {
    const spanId = this.generateId();

    const span: Span = {
      id: spanId,
      parentId,
      operation,
      startTime: Date.now(),
      status: 'pending',
      tags: {},
      logs: [],
      metrics: [],
      links: []
    };

    this.spans.set(spanId, span);
    this.emit('spanStarted', span);
    return span;
  }

  finishSpan(spanId: string, status: Span['status'] = 'success', tags: Record<string, any> = {}): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    span.tags = { ...span.tags, ...tags };

    this.spans.set(spanId, span);
    this.emit('spanFinished', span);
  }

  // Metrics
  recordMetric(metric: Metric): void {
    this.metrics.push(metric);
    this.aggregateMetric(metric);
    this.emit('metricRecorded', metric);
  }

  incrementCounter(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'counter',
      tags
    });
  }

  setGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'gauge',
      tags
    });
  }

  recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.recordMetric({
      name,
      value,
      timestamp: Date.now(),
      type: 'histogram',
      tags
    });
  }

  // Logging
  log(level: LogLevel, message: string, metadata: Record<string, any> = {}, error?: ErrorInfo): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      source: 'observability',
      metadata,
      error
    };

    this.logs.push(entry);
    this.emit('logRecorded', entry);

    // Trigger alerts for error-level logs
    if (level === 'error' || level === 'fatal') {
      this.checkErrorAlerts(entry);
    }
  }

  debug(message: string, metadata: Record<string, any> = {}): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata: Record<string, any> = {}): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata: Record<string, any> = {}): void {
    this.log('warn', message, metadata);
  }

  error(message: string, error?: Error, metadata: Record<string, any> = {}): void {
    const errorInfo = error ? this.formatError(error) : undefined;
    this.log('error', message, metadata, errorInfo);
  }

  fatal(message: string, error?: Error, metadata: Record<string, any> = {}): void {
    const errorInfo = error ? this.formatError(error) : undefined;
    this.log('fatal', message, metadata, errorInfo);
  }

  // Alerting
  async createAlert(config: AlertConfig): Promise<void> {
    this.alerts.set(config.id, config);
    this.scheduleAlertEvaluation(config.id);
    this.info(`Alert created: ${config.name}`);
  }

  async updateAlert(id: string, config: Partial<AlertConfig>): Promise<void> {
    const existing = this.alerts.get(id);
    if (!existing) {
      throw new Error(`Alert not found: ${id}`);
    }

    const updated = { ...existing, ...config };
    this.alerts.set(id, updated);

    // Reschedule alert evaluation
    this.unscheduleAlertEvaluation(id);
    if (updated.enabled) {
      this.scheduleAlertEvaluation(id);
    }

    this.info(`Alert updated: ${id}`);
  }

  async deleteAlert(id: string): Promise<void> {
    this.alerts.delete(id);
    this.unscheduleAlertEvaluation(id);
    this.info(`Alert deleted: ${id}`);
  }

  getAlerts(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }

  getAlertHistory(limit: number = 100): AlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  // Health & Performance
  async getHealth(): Promise<HealthStatus> {
    const checks = await this.runHealthChecks();
    const overallScore = this.calculateHealthScore(checks);
    const status = this.determineHealthStatus(overallScore);

    return {
      status,
      timestamp: Date.now(),
      checks,
      overallScore
    };
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);

    return {
      responseTime: this.calculateResponseTimes(recentMetrics),
      throughput: this.calculateThroughput(recentMetrics),
      errorRate: this.calculateErrorRate(recentMetrics),
      memory: await this.getMemoryMetrics(),
      cpu: await this.getCPUMetrics(),
      disk: await this.getDiskMetrics(),
      network: await this.getNetworkMetrics()
    };
  }

  // Query & Export
  async queryMetrics(query: string): Promise<Metric[]> {
    // Simple query parser (in production, use a proper query language)
    const conditions = this.parseQuery(query);
    return this.metrics.filter(metric => this.matchMetric(metric, conditions));
  }

  async queryTraces(filter: TraceFilter): Promise<TraceContext[]> {
    return Array.from(this.traces.values()).filter(trace =>
      this.matchTrace(trace, filter)
    );
  }

  async queryLogs(filter: LogFilter): Promise<LogEntry[]> {
    return this.logs.filter(log => this.matchLog(log, filter));
  }

  async exportData(format: 'json' | 'csv' | 'parquet', filter: ExportFilter = {}): Promise<string> {
    const data = this.prepareExportData(filter);

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'parquet':
        return this.convertToParquet(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private Methods
  private setupEventHandlers(): void {
    this.on('error', (error) => {
      console.error('Observability service error:', error);
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  private formatError(error: Error): ErrorInfo {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as any).code
    };
  }

  private aggregateMetric(metric: Metric): void {
    const key = `${metric.name}:${JSON.stringify(metric.tags)}`;
    const existing = this.metricAggregations.get(key) || {
      count: 0,
      sum: 0,
      min: Infinity,
      max: -Infinity,
      values: []
    };

    existing.count++;
    existing.sum += metric.value;
    existing.min = Math.min(existing.min, metric.value);
    existing.max = Math.max(existing.max, metric.value);
    existing.values.push(metric.value);

    // Keep only recent values for percentile calculation
    if (existing.values.length > 1000) {
      existing.values = existing.values.slice(-1000);
    }

    this.metricAggregations.set(key, existing);
  }

  private checkErrorAlerts(entry: LogEntry): void {
    // Check for error rate alerts
    const recentErrors = this.logs.filter(log =>
      log.level === 'error' &&
      log.timestamp > Date.now() - 60000
    );

    if (recentErrors.length > 10) {
      this.triggerAlert({
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: `High error rate detected: ${recentErrors.length} errors in the last minute`,
        severity: 'critical' as const,
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 10
        },
        actions: [],
        cooldown: 300000,
        enabled: true,
        tags: {}
      });
    }
  }

  private scheduleAlertEvaluation(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || !alert.enabled) return;

    const timer = setInterval(() => {
      this.evaluateAlert(alert);
    }, this.config.alerting.evaluationInterval);

    this.alertTimers.set(alertId, timer);
  }

  private unscheduleAlertEvaluation(alertId: string): void {
    const timer = this.alertTimers.get(alertId);
    if (timer) {
      clearInterval(timer);
      this.alertTimers.delete(alertId);
    }
  }

  private evaluateAlert(alert: AlertConfig): void {
    // Implement alert evaluation logic
    // This is a simplified version - in production, you'd need more sophisticated evaluation
    const metrics = this.metrics.filter(m => m.name === alert.condition.metric);
    const value = metrics[metrics.length - 1]?.value || 0;

    const triggered = this.evaluateCondition(value, alert.condition);

    if (triggered) {
      this.triggerAlert(alert);
    }
  }

  private evaluateCondition(value: number, condition: AlertConfig['condition']): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'eq': return value === condition.threshold;
      case 'ne': return value !== condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lte': return value <= condition.threshold;
      default: return false;
    }
  }

  private triggerAlert(alert: AlertConfig): void {
    const event: AlertEvent = {
      id: this.generateId(),
      alertId: alert.id,
      timestamp: Date.now(),
      severity: alert.severity,
      message: alert.description,
      metric: alert.condition.metric,
      value: 0, // Would be calculated based on condition
      threshold: alert.condition.threshold,
      resolved: false,
      metadata: {}
    };

    this.alertHistory.push(event);
    this.emit('alertTriggered', event);

    // Execute alert actions
    alert.actions.forEach(action => {
      if (action.enabled) {
        this.executeAlertAction(action, event);
      }
    });
  }

  private executeAlertAction(action: AlertConfig['actions'][0], event: AlertEvent): void {
    // Implement alert action execution
    switch (action.type) {
      case 'log':
        this.info('Alert triggered', { event });
        break;
      case 'webhook':
        // Send webhook notification
        break;
      // Add other action types
    }
  }

  private startMetricsCollection(): void {
    // Start periodic metrics collection
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metrics.collectionInterval);
  }

  private stopMetricsCollection(): void {
    // Stop metrics collection timers
  }

  private startHealthChecks(): void {
    // Start periodic health checks
    setInterval(() => {
      this.runHealthChecks();
    }, 30000); // Every 30 seconds
  }

  private stopHealthChecks(): void {
    // Stop health check timers
  }

  private startAlertEvaluation(): void {
    // Start alert evaluation for all enabled alerts
    this.alerts.forEach((alert, id) => {
      if (alert.enabled) {
        this.scheduleAlertEvaluation(id);
      }
    });
  }

  private stopAlertEvaluation(): void {
    // Stop all alert evaluation timers
    this.alertTimers.forEach(timer => clearInterval(timer));
    this.alertTimers.clear();
  }

  private collectSystemMetrics(): void {
    // Collect system metrics
    this.setGauge('system.memory.used', process.memoryUsage().heapUsed);
    this.setGauge('system.memory.total', process.memoryUsage().heapTotal);
    this.setGauge('system.uptime', process.uptime());
  }

  private async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];

    // Memory health check
    const memoryUsage = process.memoryUsage();
    const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    checks.push({
      id: 'memory',
      name: 'Memory Usage',
      status: memoryPercentage < 90 ? 'pass' : memoryPercentage < 95 ? 'warn' : 'fail',
      duration: 1,
      message: `${memoryPercentage.toFixed(1)}% memory usage`,
      metadata: { used: memoryUsage.heapUsed, total: memoryUsage.heapTotal }
    });

    // Add more health checks as needed
    return checks;
  }

  private calculateHealthScore(checks: HealthCheck[]): number {
    let score = 100;
    checks.forEach(check => {
      if (check.status === 'fail') score -= 25;
      else if (check.status === 'warn') score -= 10;
    });
    return Math.max(0, score);
  }

  private determineHealthStatus(score: number): HealthStatus['status'] {
    if (score >= 90) return 'healthy';
    if (score >= 70) return 'degraded';
    return 'unhealthy';
  }

  private calculateResponseTimes(metrics: Metric[]): SummaryStats {
    // Calculate response time statistics from metrics
    const responseTimes = metrics
      .filter(m => m.name.includes('response_time'))
      .map(m => m.value);

    return this.calculateSummaryStats(responseTimes);
  }

  private calculateThroughput(metrics: Metric[]): number {
    // Calculate operations per second
    const operations = metrics.filter(m => m.name.includes('operations')).length;
    return operations / 3600; // per second over 1 hour
  }

  private calculateErrorRate(metrics: Metric[]): number {
    const errors = metrics.filter(m => m.name.includes('error')).length;
    const total = metrics.length;
    return total > 0 ? errors / total : 0;
  }

  private async getMemoryMetrics(): Promise<{ used: number; total: number; percentage: number }> {
    const memory = process.memoryUsage();
    return {
      used: memory.heapUsed,
      total: memory.heapTotal,
      percentage: (memory.heapUsed / memory.heapTotal) * 100
    };
  }

  private async getCPUMetrics(): Promise<{ usage: number; cores: number }> {
    // Get CPU metrics (simplified)
    return {
      usage: 0, // Would need a proper CPU monitoring library
      cores: require('os').cpus().length
    };
  }

  private async getDiskMetrics(): Promise<{ used: number; total: number; percentage: number }> {
    // Get disk metrics (simplified)
    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }

  private async getNetworkMetrics(): Promise<{ bytesIn: number; bytesOut: number; connections: number }> {
    // Get network metrics (simplified)
    return {
      bytesIn: 0,
      bytesOut: 0,
      connections: 0
    };
  }

  private calculateSummaryStats(values: number[]): SummaryStats {
    if (values.length === 0) {
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

    values.sort((a, b) => a - b);
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

  private parseQuery(query: string): any {
    // Simple query parsing (in production, use a proper query parser)
    return {};
  }

  private matchMetric(metric: Metric, conditions: any): boolean {
    // Match metric against conditions
    return true;
  }

  private matchTrace(trace: TraceContext, filter: TraceFilter): boolean {
    // Match trace against filter
    return true;
  }

  private matchLog(log: LogEntry, filter: LogFilter): boolean {
    // Match log against filter
    return true;
  }

  private prepareExportData(filter: ExportFilter): any {
    const data: any = {};

    if (filter.includeMetrics !== false) {
      data.metrics = this.metrics;
    }

    if (filter.includeLogs !== false) {
      data.logs = this.logs;
    }

    if (filter.includeTraces !== false) {
      data.traces = Array.from(this.traces.values());
    }

    if (filter.includeAlerts !== false) {
      data.alerts = Array.from(this.alerts.values());
      data.alertHistory = this.alertHistory;
    }

    return data;
  }

  private convertToCSV(data: any): string {
    // Convert data to CSV format
    return JSON.stringify(data);
  }

  private convertToParquet(data: any): string {
    // Convert data to Parquet format (would need a parquet library)
    return JSON.stringify(data);
  }
}