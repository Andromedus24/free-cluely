// Performance Monitor Implementation
// ================================

import { EventEmitter } from 'events';
import {
  PerformanceMetrics,
  PerformanceConfig,
  PerformanceSnapshot,
  PerformanceAlert,
  PerformanceReport,
  PerformanceThreshold,
  ObservabilityEventType
} from '../types';

/**
 * Enterprise-grade performance monitoring system
 */
export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceConfig;
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private alerts: PerformanceAlert[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private isRunning: boolean = false;
  private collectionTimer?: NodeJS.Timeout;
  private analysisTimer?: NodeJS.Timeout;
  private baselineMetrics: Map<string, PerformanceMetrics> = new Map();

  constructor(config: PerformanceConfig) {
    super();
    this.config = config;
    this.initializeThresholds();
  }

  /**
   * Start performance monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startCollection();
    this.startAnalysis();

    this.emit('started');
  }

  /**
   * Stop performance monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopCollection();
    this.stopAnalysis();

    this.emit('stopped');
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: PerformanceMetrics): void {
    if (!this.config.enabled) return;

    // Add timestamp if not provided
    const metricsWithTimestamp: PerformanceMetrics = {
      ...metrics,
      timestamp: metrics.timestamp || Date.now()
    };

    // Validate metrics
    if (!this.validateMetrics(metricsWithTimestamp)) {
      this.emit('error', new Error('Invalid performance metrics'));
      return;
    }

    // Store metrics
    const key = this.getMetricsKey(metricsWithTimestamp);
    const existingMetrics = this.metrics.get(key) || [];
    existingMetrics.push(metricsWithTimestamp);
    this.metrics.set(key, existingMetrics);

    // Apply retention policy
    this.applyRetentionPolicy(key, existingMetrics);

    // Check thresholds
    this.checkThresholds(metricsWithTimestamp);

    // Update baseline if needed
    this.updateBaseline(metricsWithTimestamp);

    // Emit metrics event
    this.emit('metricsRecorded', metricsWithTimestamp);
  }

  /**
   * Take performance snapshot
   */
  takeSnapshot(): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      metrics: this.getAllCurrentMetrics(),
      systemMetrics: this.collectSystemMetrics(),
      alerts: this.getCurrentAlerts(),
      summary: this.generateSnapshotSummary()
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.config.maxSnapshots);
    }

    this.emit('snapshotTaken', snapshot);

    return snapshot;
  }

  /**
   * Get performance report
   */
  getPerformanceReport(timeRange?: { start: number; end: number }): PerformanceReport {
    const startTime = timeRange?.start || Date.now() - 86400000; // Default 24h
    const endTime = timeRange?.end || Date.now();

    const report: PerformanceReport = {
      generatedAt: Date.now(),
      timeRange: { start: startTime, end: endTime },
      metrics: this.getAggregatedMetrics(startTime, endTime),
      alerts: this.getAlertsInRange(startTime, endTime),
      trends: this.analyzeTrends(startTime, endTime),
      bottlenecks: this.identifyBottlenecks(startTime, endTime),
      recommendations: this.generateRecommendations(),
      healthScore: this.calculateHealthScore(startTime, endTime)
    };

    return report;
  }

  /**
   * Add performance threshold
   */
  addThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.name, threshold);
    this.emit('thresholdAdded', threshold);
  }

  /**
   * Remove performance threshold
   */
  removeThreshold(name: string): void {
    const threshold = this.thresholds.get(name);
    if (threshold) {
      this.thresholds.delete(name);
      this.emit('thresholdRemoved', threshold);
    }
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): Map<string, PerformanceMetrics> {
    const currentMetrics = new Map<string, PerformanceMetrics>();

    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        currentMetrics.set(key, metrics[metrics.length - 1]);
      }
    }

    return currentMetrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(name: string, timeRange?: { start: number; end: number }): PerformanceMetrics[] {
    const key = this.normalizeMetricName(name);
    const metrics = this.metrics.get(key) || [];

    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(m =>
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  /**
   * Get performance trends
   */
  getTrends(name: string, timeRange?: { start: number; end: number }): {
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
    confidence: number;
  } {
    const metrics = this.getMetricsHistory(name, timeRange);

    if (metrics.length < 2) {
      return { direction: 'stable', change: 0, confidence: 0 };
    }

    const values = metrics.map(m => this.extractMetricValue(m, name));
    const trend = this.calculateTrend(values);

    return trend;
  }

  /**
   * Detect performance anomalies
   */
  detectAnomalies(name: string, timeRange?: { start: number; end: number }): Array<{
    timestamp: number;
    value: number;
    severity: number;
    description: string;
  }> {
    const metrics = this.getMetricsHistory(name, timeRange);
    const baseline = this.baselineMetrics.get(this.normalizeMetricName(name));

    if (!baseline || metrics.length === 0) {
      return [];
    }

    const anomalies: Array<{
      timestamp: number;
      value: number;
      severity: number;
      description: string;
    }> = [];

    const baselineValue = this.extractMetricValue(baseline, name);
    const threshold = this.config.anomalyThreshold || 2.0;

    for (const metric of metrics) {
      const value = this.extractMetricValue(metric, name);
      const deviation = Math.abs(value - baselineValue) / baselineValue;

      if (deviation > threshold) {
        anomalies.push({
          timestamp: metric.timestamp,
          value,
          severity: Math.min(1, deviation / (threshold * 2)),
          description: `${deviation.toFixed(2)}x deviation from baseline`
        });
      }
    }

    return anomalies;
  }

  /**
   * Get performance alerts
   */
  getAlerts(timeRange?: { start: number; end: number }): PerformanceAlert[] {
    if (!timeRange) {
      return [...this.alerts];
    }

    return this.alerts.filter(alert =>
      alert.timestamp >= timeRange.start && alert.timestamp <= timeRange.end
    );
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    const resolvedCount = this.alerts.filter(a => a.resolved).length;
    this.alerts = this.alerts.filter(a => !a.resolved);
    this.emit('alertsCleared', resolvedCount);
  }

  // Private methods
  private initializeThresholds(): void {
    // Default performance thresholds
    const defaultThresholds: PerformanceThreshold[] = [
      {
        name: 'response_time_p95',
        metric: 'response_time',
        operator: '>',
        value: 1000, // 1 second
        severity: 'warning',
        duration: 300000 // 5 minutes
      },
      {
        name: 'response_time_p99',
        metric: 'response_time',
        operator: '>',
        value: 2000, // 2 seconds
        severity: 'critical',
        duration: 300000 // 5 minutes
      },
      {
        name: 'error_rate',
        metric: 'error_rate',
        operator: '>',
        value: 0.05, // 5%
        severity: 'warning',
        duration: 300000 // 5 minutes
      },
      {
        name: 'cpu_usage',
        metric: 'cpu_usage',
        operator: '>',
        value: 0.8, // 80%
        severity: 'warning',
        duration: 300000 // 5 minutes
      },
      {
        name: 'memory_usage',
        metric: 'memory_usage',
        operator: '>',
        value: 0.85, // 85%
        severity: 'warning',
        duration: 300000 // 5 minutes
      },
      {
        name: 'throughput_low',
        metric: 'throughput',
        operator: '<',
        value: 10, // 10 requests per second
        severity: 'warning',
        duration: 300000 // 5 minutes
      }
    ];

    for (const threshold of defaultThresholds) {
      this.thresholds.set(threshold.name, threshold);
    }
  }

  private startCollection(): void {
    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval);
  }

  private stopCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
  }

  private startAnalysis(): void {
    this.analysisTimer = setInterval(() => {
      this.performAnalysis();
    }, this.config.analysisInterval);
  }

  private stopAnalysis(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }
  }

  private collectMetrics(): void {
    const systemMetrics = this.collectSystemMetrics();
    this.recordMetrics(systemMetrics);
  }

  private collectSystemMetrics(): PerformanceMetrics {
    return {
      timestamp: Date.now(),
      source: 'system',
      service: 'performance_monitor',
      cpu_usage: this.getCPUUsage(),
      memory_usage: this.getMemoryUsage(),
      disk_usage: this.getDiskUsage(),
      network_io: this.getNetworkIO(),
      process_count: this.getProcessCount(),
      load_average: this.getLoadAverage(),
      uptime: this.getUptime()
    };
  }

  private getCPUUsage(): number {
    // Mock CPU usage - in real implementation, use system libraries
    return Math.random() * 100;
  }

  private getMemoryUsage(): number {
    // Mock memory usage - in real implementation, use system libraries
    return Math.random() * 100;
  }

  private getDiskUsage(): number {
    // Mock disk usage - in real implementation, use system libraries
    return Math.random() * 100;
  }

  private getNetworkIO(): { bytes_in: number; bytes_out: number; packets_in: number; packets_out: number } {
    // Mock network I/O - in real implementation, use system libraries
    return {
      bytes_in: Math.floor(Math.random() * 1000000),
      bytes_out: Math.floor(Math.random() * 1000000),
      packets_in: Math.floor(Math.random() * 10000),
      packets_out: Math.floor(Math.random() * 10000)
    };
  }

  private getProcessCount(): number {
    // Mock process count - in real implementation, use system libraries
    return Math.floor(Math.random() * 500) + 50;
  }

  private getLoadAverage(): number {
    // Mock load average - in real implementation, use system libraries
    return Math.random() * 5;
  }

  private getUptime(): number {
    // Mock uptime - in real implementation, use system libraries
    return Date.now() - Math.floor(Math.random() * 86400000); // Up to 24 hours
  }

  private validateMetrics(metrics: PerformanceMetrics): boolean {
    return (
      metrics.source && typeof metrics.source === 'string' &&
      metrics.timestamp && typeof metrics.timestamp === 'number' &&
      (!metrics.cpu_usage || typeof metrics.cpu_usage === 'number') &&
      (!metrics.memory_usage || typeof metrics.memory_usage === 'number') &&
      (!metrics.disk_usage || typeof metrics.disk_usage === 'number') &&
      (!metrics.response_time || typeof metrics.response_time === 'number') &&
      (!metrics.throughput || typeof metrics.throughput === 'number') &&
      (!metrics.error_rate || typeof metrics.error_rate === 'number')
    );
  }

  private getMetricsKey(metrics: PerformanceMetrics): string {
    return `${metrics.source}:${metrics.service || 'default'}`;
  }

  private applyRetentionPolicy(key: string, metrics: PerformanceMetrics[]): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    // Remove old metrics
    const filtered = metrics.filter(m => m.timestamp > cutoffTime);

    if (filtered.length !== metrics.length) {
      this.metrics.set(key, filtered);
      this.emit('metricsExpired', { key, expired: metrics.length - filtered.length });
    }

    // Limit by count
    if (filtered.length > this.config.maxMetricsPerSource) {
      const pruned = filtered.slice(-this.config.maxMetricsPerSource);
      this.metrics.set(key, pruned);
      this.emit('metricsPruned', { key, pruned: filtered.length - pruned.length });
    }
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    for (const threshold of this.thresholds.values()) {
      if (this.checkThreshold(metrics, threshold)) {
        this.createAlert(metrics, threshold);
      }
    }
  }

  private checkThreshold(metrics: PerformanceMetrics, threshold: PerformanceThreshold): boolean {
    const value = this.extractMetricValue(metrics, threshold.metric);
    if (value === undefined) return false;

    switch (threshold.operator) {
      case '>':
        return value > threshold.value;
      case '>=':
        return value >= threshold.value;
      case '<':
        return value < threshold.value;
      case '<=':
        return value <= threshold.value;
      case '==':
        return value === threshold.value;
      case '!=':
        return value !== threshold.value;
      default:
        return false;
    }
  }

  private extractMetricValue(metrics: PerformanceMetrics, metricName: string): number | undefined {
    switch (metricName) {
      case 'cpu_usage':
        return metrics.cpu_usage;
      case 'memory_usage':
        return metrics.memory_usage;
      case 'disk_usage':
        return metrics.disk_usage;
      case 'response_time':
        return metrics.response_time;
      case 'throughput':
        return metrics.throughput;
      case 'error_rate':
        return metrics.error_rate;
      default:
        return undefined;
    }
  }

  private createAlert(metrics: PerformanceMetrics, threshold: PerformanceThreshold): void {
    const existingAlert = this.alerts.find(a =>
      a.thresholdName === threshold.name &&
      a.source === metrics.source &&
      !a.resolved
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.lastSeen = Date.now();
      existingAlert.count++;
      existingAlert.currentValue = this.extractMetricValue(metrics, threshold.metric)!;
    } else {
      // Create new alert
      const alert: PerformanceAlert = {
        id: `alert_${Date.now()}_${Math.random()}`,
        thresholdName: threshold.name,
        timestamp: Date.now(),
        lastSeen: Date.now(),
        source: metrics.source,
        service: metrics.service,
        severity: threshold.severity,
        metric: threshold.metric,
        thresholdValue: threshold.value,
        currentValue: this.extractMetricValue(metrics, threshold.metric)!,
        operator: threshold.operator,
        description: `${threshold.metric} ${threshold.operator} ${threshold.value}`,
        count: 1,
        resolved: false
      };

      this.alerts.push(alert);
      this.emit('alertCreated', alert);
    }
  }

  private updateBaseline(metrics: PerformanceMetrics): void {
    const key = this.getMetricsKey(metrics);
    const baseline = this.baselineMetrics.get(key);

    if (!baseline) {
      // Initialize baseline
      this.baselineMetrics.set(key, { ...metrics });
    } else {
      // Update baseline with exponential moving average
      const alpha = 0.1; // Smoothing factor
      const updatedBaseline = this.exponentialMovingAverage(baseline, metrics, alpha);
      this.baselineMetrics.set(key, updatedBaseline);
    }
  }

  private exponentialMovingAverage(
    baseline: PerformanceMetrics,
    current: PerformanceMetrics,
    alpha: number
  ): PerformanceMetrics {
    const result: PerformanceMetrics = { ...baseline, timestamp: current.timestamp };

    // Update numeric fields with exponential moving average
    const fields = ['cpu_usage', 'memory_usage', 'disk_usage', 'response_time', 'throughput', 'error_rate'];

    for (const field of fields) {
      const baselineValue = baseline[field as keyof PerformanceMetrics] as number;
      const currentValue = current[field as keyof PerformanceMetrics] as number;

      if (baselineValue !== undefined && currentValue !== undefined) {
        result[field as keyof PerformanceMetrics] = alpha * currentValue + (1 - alpha) * baselineValue;
      }
    }

    return result;
  }

  private performAnalysis(): void {
    // Take snapshot
    this.takeSnapshot();

    // Check for resolved alerts
    this.checkResolvedAlerts();

    // Emit analysis complete event
    this.emit('analysisComplete', {
      timestamp: Date.now(),
      metricsCount: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.length, 0),
      alertsCount: this.alerts.filter(a => !a.resolved).length,
      snapshotsCount: this.snapshots.length
    });
  }

  private checkResolvedAlerts(): void {
    const currentTime = Date.now();

    for (const alert of this.alerts) {
      if (!alert.resolved && currentTime - alert.lastSeen > this.config.alertResolutionTimeout) {
        alert.resolved = true;
        alert.resolvedAt = currentTime;
        this.emit('alertResolved', alert);
      }
    }
  }

  private getAllCurrentMetrics(): Map<string, PerformanceMetrics> {
    const currentMetrics = new Map<string, PerformanceMetrics>();

    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        currentMetrics.set(key, metrics[metrics.length - 1]);
      }
    }

    return currentMetrics;
  }

  private getCurrentAlerts(): PerformanceAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  private generateSnapshotSummary(): string {
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const totalMetrics = Array.from(this.metrics.values()).reduce((sum, m) => sum + m.length, 0);

    const summary = [];

    if (activeAlerts.length > 0) {
      const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
      const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');

      summary.push(`${activeAlerts.length} active alerts (${criticalAlerts.length} critical, ${warningAlerts.length} warning)`);
    }

    summary.push(`${totalMetrics} metrics collected`);
    summary.push(`${this.snapshots.length} snapshots stored`);

    return summary.join('. ');
  }

  private getAggregatedMetrics(startTime: number, endTime: number): Map<string, {
    count: number;
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  }> {
    const aggregated = new Map<string, {
      count: number;
      min: number;
      max: number;
      avg: number;
      p95: number;
      p99: number;
    }>();

    // Get all metrics in time range
    const metricsInRange: PerformanceMetrics[] = [];

    for (const metrics of this.metrics.values()) {
      const filtered = metrics.filter(m =>
        m.timestamp >= startTime && m.timestamp <= endTime
      );
      metricsInRange.push(...filtered);
    }

    // Aggregate by metric type
    const metricTypes = ['cpu_usage', 'memory_usage', 'disk_usage', 'response_time', 'throughput', 'error_rate'];

    for (const type of metricTypes) {
      const values = metricsInRange
        .map(m => m[type as keyof PerformanceMetrics] as number)
        .filter(v => v !== undefined);

      if (values.length > 0) {
        const sorted = values.slice().sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);

        aggregated.set(type, {
          count: values.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          avg: sum / values.length,
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        });
      }
    }

    return aggregated;
  }

  private getAlertsInRange(startTime: number, endTime: number): PerformanceAlert[] {
    return this.alerts.filter(a =>
      a.timestamp >= startTime && a.timestamp <= endTime
    );
  }

  private analyzeTrends(startTime: number, endTime: number): Array<{
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
    confidence: number;
  }> {
    const trends: Array<{
      metric: string;
      direction: 'increasing' | 'decreasing' | 'stable';
      change: number;
      confidence: number;
    }> = [];

    const metricTypes = ['cpu_usage', 'memory_usage', 'disk_usage', 'response_time', 'throughput', 'error_rate'];

    for (const type of metricTypes) {
      const trend = this.getTrends(type, { start: startTime, end: endTime });
      trends.push({
        metric: type,
        direction: trend.direction,
        change: trend.change,
        confidence: trend.confidence
      });
    }

    return trends;
  }

  private identifyBottlenecks(startTime: number, endTime: number): Array<{
    metric: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: number;
    description: string;
  }> {
    const bottlenecks: Array<{
      metric: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      impact: number;
      description: string;
    }> = [];

    const aggregated = this.getAggregatedMetrics(startTime, endTime);

    for (const [metric, stats] of aggregated.entries()) {
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let impact = 0;

      // Determine severity based on metric type and values
      switch (metric) {
        case 'cpu_usage':
        case 'memory_usage':
        case 'disk_usage':
          if (stats.avg > 90) {
            severity = 'critical';
            impact = 1.0;
          } else if (stats.avg > 80) {
            severity = 'high';
            impact = 0.8;
          } else if (stats.avg > 70) {
            severity = 'medium';
            impact = 0.6;
          } else if (stats.avg > 60) {
            severity = 'low';
            impact = 0.4;
          }
          break;

        case 'response_time':
          if (stats.p95 > 2000) {
            severity = 'critical';
            impact = 1.0;
          } else if (stats.p95 > 1000) {
            severity = 'high';
            impact = 0.8;
          } else if (stats.p95 > 500) {
            severity = 'medium';
            impact = 0.6;
          } else if (stats.p95 > 200) {
            severity = 'low';
            impact = 0.4;
          }
          break;

        case 'error_rate':
          if (stats.avg > 0.1) {
            severity = 'critical';
            impact = 1.0;
          } else if (stats.avg > 0.05) {
            severity = 'high';
            impact = 0.8;
          } else if (stats.avg > 0.02) {
            severity = 'medium';
            impact = 0.6;
          } else if (stats.avg > 0.01) {
            severity = 'low';
            impact = 0.4;
          }
          break;

        case 'throughput':
          // Low throughput is generally not a bottleneck unless it's too low
          if (stats.avg < 1) {
            severity = 'high';
            impact = 0.7;
          }
          break;
      }

      if (severity !== 'low') {
        bottlenecks.push({
          metric,
          severity,
          impact,
          description: `High ${metric}: ${stats.avg.toFixed(2)} (${severity} severity)`
        });
      }
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const recentAlerts = this.getAlerts(Date.now() - 3600000); // Last hour

    // Analyze recent alerts for patterns
    const cpuAlerts = recentAlerts.filter(a => a.metric === 'cpu_usage');
    const memoryAlerts = recentAlerts.filter(a => a.metric === 'memory_usage');
    const responseTimeAlerts = recentAlerts.filter(a => a.metric === 'response_time');
    const errorRateAlerts = recentAlerts.filter(a => a.metric === 'error_rate');

    if (cpuAlerts.length > 3) {
      recommendations.push('Consider scaling up CPU resources or optimizing CPU-intensive operations');
    }

    if (memoryAlerts.length > 3) {
      recommendations.push('Investigate memory leaks or increase memory allocation');
    }

    if (responseTimeAlerts.length > 3) {
      recommendations.push('Optimize slow queries, add caching, or consider load balancing');
    }

    if (errorRateAlerts.length > 3) {
      recommendations.push('Review error logs and implement better error handling');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable thresholds');
    }

    return recommendations;
  }

  private calculateHealthScore(startTime: number, endTime: number): number {
    const alertsInRange = this.getAlertsInRange(startTime, endTime);
    const bottlenecks = this.identifyBottlenecks(startTime, endTime);

    let score = 100; // Start with perfect score

    // Deduct points for alerts
    for (const alert of alertsInRange) {
      switch (alert.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'warning':
          score -= 10;
          break;
      }
    }

    // Deduct points for bottlenecks
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTrend(values: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
    confidence: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', change: 0, confidence: 0 };
    }

    // Calculate linear regression
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate correlation coefficient
    const meanX = sumX / n;
    const meanY = sumY / n;
    const ssX = values.reduce((sum, _, x) => sum + Math.pow(x - meanX, 2), 0);
    const ssY = values.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssXY = values.reduce((sum, y, x) => sum + (x - meanX) * (y - meanY), 0);

    const correlation = ssXY / Math.sqrt(ssX * ssY);
    const confidence = Math.abs(correlation);

    let direction: 'increasing' | 'decreasing' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    return {
      direction,
      change: slope,
      confidence
    };
  }

  private normalizeMetricName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
}