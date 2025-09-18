// Metrics Collector Implementation
// ===============================

import { EventEmitter } from 'events';
import {
  Metric,
  MetricType,
  SummaryStats,
  MetricsConfig,
  ObservabilityEventType
} from '../types';

/**
 * Enterprise-grade metrics collection system
 */
export class MetricsCollector extends EventEmitter {
  private config: MetricsConfig;
  private metrics: Map<string, Metric[]> = new Map();
  private aggregations: Map<string, AggregationState> = new Map();
  private collectors: Map<string, MetricCollector> = new Map();
  private aggregators: Map<string, MetricAggregator> = new Map();
  private exporters: Map<string, MetricsExporter> = new Map();
  private isRunning: boolean = false;
  private collectionTimer?: NodeJS.Timeout;
  private aggregationTimer?: NodeJS.Timeout;

  constructor(config: MetricsConfig) {
    super();
    this.config = config;
    this.initializeCollectors();
    this.initializeAggregators();
    this.initializeExporters();
  }

  /**
   * Start metrics collection
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startCollection();
    this.startAggregation();

    this.emit('started');
  }

  /**
   * Stop metrics collection
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopCollection();
    this.stopAggregation();

    this.emit('stopped');
  }

  /**
   * Record a metric
   */
  record(metric: Metric): void {
    if (!this.config.enabled) return;

    // Apply retention policy
    this.cleanupOldMetrics();

    // Store metric
    const key = this.getMetricKey(metric);
    const metrics = this.metrics.get(key) || [];
    metrics.push(metric);
    this.metrics.set(key, metrics);

    // Update aggregation
    this.updateAggregation(metric);

    // Emit event
    this.emit('metricRecorded', metric);

    // Check if we need to prune metrics
    if (metrics.length > this.config.maxMetrics) {
      this.pruneMetrics(key);
    }
  }

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, tags: Record<string, string> = {}): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      type: 'counter',
      tags
    });
  }

  /**
   * Set a gauge value
   */
  set(name: string, value: number, tags: Record<string, string> = {}): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      type: 'gauge',
      tags
    });
  }

  /**
   * Record a histogram value
   */
  histogram(name: string, value: number, tags: Record<string, string> = {}): void {
    this.record({
      name,
      value,
      timestamp: Date.now(),
      type: 'histogram',
      tags
    });
  }

  /**
   * Get metrics by name and tags
   */
  getMetrics(name: string, tags?: Record<string, string>): Metric[] {
    const key = this.getMetricKey({ name, tags: tags || {} });
    return this.metrics.get(key) || [];
  }

  /**
   * Get aggregated metrics
   */
  getAggregatedMetrics(name: string, tags?: Record<string, string>): AggregationState | null {
    const key = this.getMetricKey({ name, tags: tags || {} });
    return this.aggregations.get(key) || null;
  }

  /**
   * Get all metrics summary
   */
  getMetricsSummary(): {
    totalMetrics: number;
    metricsByName: Record<string, number>;
    metricsByType: Record<MetricType, number>;
    oldestMetric: number | null;
    newestMetric: number | null;
  } {
    const totalMetrics = Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0);

    const metricsByName: Record<string, number> = {};
    const metricsByType: Record<MetricType, number> = {
      counter: 0,
      gauge: 0,
      histogram: 0,
      summary: 0
    };

    let oldestMetric: number | null = null;
    let newestMetric: number | null = null;

    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        // Count by name
        metricsByName[metric.name] = (metricsByName[metric.name] || 0) + 1;

        // Count by type
        metricsByType[metric.type]++;

        // Track timestamps
        if (!oldestMetric || metric.timestamp < oldestMetric) {
          oldestMetric = metric.timestamp;
        }
        if (!newestMetric || metric.timestamp > newestMetric) {
          newestMetric = metric.timestamp;
        }
      }
    }

    return {
      totalMetrics,
      metricsByName,
      metricsByType,
      oldestMetric,
      newestMetric
    };
  }

  /**
   * Query metrics with filters
   */
  queryMetrics(query: MetricsQuery): Metric[] {
    let results: Metric[] = [];

    // Get all metrics matching the name pattern
    for (const [key, metrics] of this.metrics.entries()) {
      const { name } = this.parseMetricKey(key);

      if (this.matchesPattern(name, query.namePattern)) {
        results.push(...metrics);
      }
    }

    // Apply filters
    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    if (query.tags) {
      results = results.filter(m => this.matchTags(m.tags, query.tags!));
    }

    if (query.startTime) {
      results = results.filter(m => m.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter(m => m.timestamp <= query.endTime!);
    }

    // Sort by timestamp
    results.sort((a, b) => a.timestamp - b.timestamp);

    // Apply limit
    if (query.limit) {
      results = results.slice(-query.limit);
    }

    return results;
  }

  /**
   * Get percentile values for histogram metrics
   */
  getPercentiles(name: string, tags: Record<string, string>, percentiles: number[]): Record<number, number> {
    const metrics = this.getMetrics(name, tags).filter(m => m.type === 'histogram');
    if (metrics.length === 0) return {};

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const result: Record<number, number> = {};

    percentiles.forEach(p => {
      const index = Math.floor((p / 100) * values.length);
      result[p] = values[Math.min(index, values.length - 1)];
    });

    return result;
  }

  /**
   * Get rate for counter metrics
   */
  getRate(name: string, tags: Record<string, string>, windowMs: number = 60000): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    const metrics = this.getMetrics(name, tags).filter(m =>
      m.type === 'counter' && m.timestamp >= windowStart && m.timestamp <= now
    );

    if (metrics.length < 2) return 0;

    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    const timeDiff = last.timestamp - first.timestamp;

    if (timeDiff === 0) return 0;

    return (last.value - first.value) / (timeDiff / 1000); // per second
  }

  /**
   * Create a derived metric
   */
  createDerivedMetric(
    name: string,
    expression: string,
    sourceMetrics: string[],
    tags: Record<string, string> = {}
  ): void {
    const collector = new DerivedMetricCollector(name, expression, sourceMetrics, tags);
    this.collectors.set(`derived:${name}`, collector);
  }

  /**
   * Add a custom collector
   */
  addCollector(name: string, collector: MetricCollector): void {
    this.collectors.set(name, collector);
  }

  /**
   * Remove a collector
   */
  removeCollector(name: string): void {
    this.collectors.delete(name);
  }

  /**
   * Export metrics
   */
  async exportMetrics(format: 'json' | 'prometheus' | 'influx' = 'json'): Promise<string> {
    const exporter = this.exporters.get(format);
    if (!exporter) {
      throw new Error(`Exporter not found for format: ${format}`);
    }

    return await exporter.export(this.getAllMetrics());
  }

  // Private methods
  private initializeCollectors(): void {
    // System metrics collector
    this.collectors.set('system', new SystemMetricsCollector());

    // Process metrics collector
    this.collectors.set('process', new ProcessMetricsCollector());

    // Memory metrics collector
    this.collectors.set('memory', new MemoryMetricsCollector());

    // HTTP metrics collector
    this.collectors.set('http', new HTTPMetricsCollector());

    // Database metrics collector
    this.collectors.set('database', new DatabaseMetricsCollector());

    // Custom business metrics collector
    this.collectors.set('business', new BusinessMetricsCollector());
  }

  private initializeAggregators(): void {
    // Counter aggregator
    this.aggregators.set('counter', new CounterAggregator());

    // Gauge aggregator
    this.aggregators.set('gauge', new GaugeAggregator());

    // Histogram aggregator
    this.aggregators.set('histogram', new HistogramAggregator());

    // Summary aggregator
    this.aggregators.set('summary', new SummaryAggregator());
  }

  private initializeExporters(): void {
    // JSON exporter
    this.exporters.set('json', new JSONMetricsExporter());

    // Prometheus exporter
    this.exporters.set('prometheus', new PrometheusMetricsExporter());

    // InfluxDB exporter
    this.exporters.set('influx', new InfluxMetricsExporter());
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

  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval);
  }

  private stopAggregation(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = undefined;
    }
  }

  private collectMetrics(): void {
    for (const collector of this.collectors.values()) {
      try {
        const metrics = collector.collect();
        metrics.forEach(metric => this.record(metric));
      } catch (error) {
        this.emit('error', new Error(`Failed to collect metrics from ${collector.constructor.name}: ${error}`));
      }
    }
  }

  private aggregateMetrics(): void {
    for (const [key, aggregation] of this.aggregations.entries()) {
      try {
        const aggregator = this.aggregators.get(aggregation.type);
        if (aggregator) {
          const metrics = this.metrics.get(key) || [];
          const updated = aggregator.aggregate(metrics, aggregation);
          this.aggregations.set(key, updated);
        }
      } catch (error) {
        this.emit('error', new Error(`Failed to aggregate metrics for ${key}: ${error}`));
      }
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    for (const [key, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(key, filtered);
    }
  }

  private pruneMetrics(key: string): void {
    const metrics = this.metrics.get(key) || [];
    if (metrics.length > this.config.maxMetrics) {
      // Keep the most recent metrics
      const pruned = metrics.slice(-this.config.maxMetrics);
      this.metrics.set(key, pruned);
    }
  }

  private getMetricKey(metric: Pick<Metric, 'name' | 'tags'>): string {
    const tagString = Object.entries(metric.tags || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${metric.name}${tagString ? `{${tagString}}` : ''}`;
  }

  private parseMetricKey(key: string): { name: string; tags: Record<string, string> } {
    const match = key.match(/^([^{}]+)(?:\{(.*)\})?$/);
    if (!match) return { name: key, tags: {} };

    const [, name, tagsStr] = match;
    const tags: Record<string, string> = {};

    if (tagsStr) {
      tagsStr.split(',').forEach(tag => {
        const [key, value] = tag.split('=');
        if (key && value) {
          tags[key.trim()] = value.trim();
        }
      });
    }

    return { name, tags };
  }

  private updateAggregation(metric: Metric): void {
    const key = this.getMetricKey(metric);
    let aggregation = this.aggregations.get(key);

    if (!aggregation) {
      aggregation = {
        type: metric.type,
        count: 0,
        sum: 0,
        min: Infinity,
        max: -Infinity,
        values: [],
        lastUpdated: Date.now(),
        windowStart: Date.now(),
        windowEnd: Date.now() + this.config.aggregationInterval
      };
    }

    aggregation.count++;
    aggregation.sum += metric.value;
    aggregation.min = Math.min(aggregation.min, metric.value);
    aggregation.max = Math.max(aggregation.max, metric.value);
    aggregation.values.push(metric.value);
    aggregation.lastUpdated = Date.now();

    // Keep only recent values for histogram/summary
    if (metric.type === 'histogram' || metric.type === 'summary') {
      if (aggregation.values.length > 1000) {
        aggregation.values = aggregation.values.slice(-1000);
      }
    }

    this.aggregations.set(key, aggregation);
  }

  private matchesPattern(text: string, pattern: string): boolean {
    if (!pattern) return true;
    if (pattern === '*') return true;

    // Simple glob pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(text);
  }

  private matchTags(metricTags: Record<string, string>, queryTags: Record<string, string>): boolean {
    for (const [key, value] of Object.entries(queryTags)) {
      if (metricTags[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private getAllMetrics(): Metric[] {
    const allMetrics: Metric[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }
    return allMetrics;
  }
}

// Supporting interfaces and classes
export interface MetricsQuery {
  namePattern?: string;
  type?: MetricType;
  tags?: Record<string, string>;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface AggregationState {
  type: MetricType;
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[];
  lastUpdated: number;
  windowStart: number;
  windowEnd: number;
}

export interface MetricCollector {
  collect(): Metric[];
}

export interface MetricAggregator {
  aggregate(metrics: Metric[], state: AggregationState): AggregationState;
}

export interface MetricsExporter {
  export(metrics: Metric[]): Promise<string>;
}

// Implementations would go here...
class SystemMetricsCollector implements MetricCollector {
  collect(): Metric[] {
    // Implementation for system metrics
    return [];
  }
}

class ProcessMetricsCollector implements MetricCollector {
  collect(): Metric[] {
    // Implementation for process metrics
    return [];
  }
}

class MemoryMetricsCollector implements MetricCollector {
  collect(): Metric[] {
    // Implementation for memory metrics
    return [];
  }
}

class HTTPMetricsCollector implements MetricCollector {
  collect(): Metric[] {
    // Implementation for HTTP metrics
    return [];
  }
}

class DatabaseMetricsCollector implements MetricCollector {
  collect(): Metric[] {
    // Implementation for database metrics
    return [];
  }
}

class BusinessMetricsCollector implements MetricCollector {
  collect(): Metric[] {
    // Implementation for business metrics
    return [];
  }
}

class DerivedMetricCollector implements MetricCollector {
  constructor(
    private name: string,
    private expression: string,
    private sourceMetrics: string[],
    private tags: Record<string, string>
  ) {}

  collect(): Metric[] {
    // Implementation for derived metrics
    return [];
  }
}

class CounterAggregator implements MetricAggregator {
  aggregate(metrics: Metric[], state: AggregationState): AggregationState {
    return state;
  }
}

class GaugeAggregator implements MetricAggregator {
  aggregate(metrics: Metric[], state: AggregationState): AggregationState {
    return state;
  }
}

class HistogramAggregator implements MetricAggregator {
  aggregate(metrics: Metric[], state: AggregationState): AggregationState {
    return state;
  }
}

class SummaryAggregator implements MetricAggregator {
  aggregate(metrics: Metric[], state: AggregationState): AggregationState {
    return state;
  }
}

class JSONMetricsExporter implements MetricsExporter {
  async export(metrics: Metric[]): Promise<string> {
    return JSON.stringify(metrics, null, 2);
  }
}

class PrometheusMetricsExporter implements MetricsExporter {
  async export(metrics: Metric[]): Promise<string> {
    // Implementation for Prometheus format
    return '';
  }
}

class InfluxMetricsExporter implements MetricsExporter {
  async export(metrics: Metric[]): Promise<string> {
    // Implementation for InfluxDB format
    return '';
  }
}