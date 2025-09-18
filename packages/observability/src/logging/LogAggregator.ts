// Log Aggregator Implementation
// =============================

import { EventEmitter } from 'events';
import {
  LogEntry,
  LogLevel,
  LogQuery,
  LogAggregationConfig,
  LogStats,
  LogExportFormat,
  ObservabilityEventType
} from '../types';

/**
 * Enterprise-grade log aggregation and analysis system
 */
export class LogAggregator extends EventEmitter {
  private config: LogAggregationConfig;
  private logs: Map<string, LogEntry[]> = new Map();
  private indexes: Map<string, Set<string>> = new Map();
  private buffers: Map<string, LogEntry[]> = new Map();
  private isRunning: boolean = false;
  private flushTimer?: NodeJS.Timeout;
  private analysisTimer?: NodeJS.Timeout;
  private stats: LogStats;

  constructor(config: LogAggregationConfig) {
    super();
    this.config = config;
    this.stats = this.initializeStats();
    this.initializeIndexes();
  }

  /**
   * Start log aggregation
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startFlushTimer();
    this.startAnalysisTimer();

    this.emit('started');
  }

  /**
   * Stop log aggregation
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopFlushTimer();
    this.stopAnalysisTimer();
    this.flushAllBuffers();

    this.emit('stopped');
  }

  /**
   * Add a log entry
   */
  addLog(entry: LogEntry): void {
    if (!this.config.enabled) return;

    // Add timestamp if not provided
    const logEntry: LogEntry = {
      ...entry,
      timestamp: entry.timestamp || Date.now()
    };

    // Validate log entry
    if (!this.validateLogEntry(logEntry)) {
      this.emit('error', new Error('Invalid log entry'));
      return;
    }

    // Update stats
    this.updateStats(logEntry);

    // Add to buffer for batching
    this.addToBuffer(logEntry);

    // Add to indexes
    this.addToIndexes(logEntry);

    // Emit log event
    this.emit('logAdded', logEntry);
  }

  /**
   * Query logs with filters
   */
  queryLogs(query: LogQuery): LogEntry[] {
    let results: LogEntry[] = [];

    // Get all logs from time range
    const timeFilteredLogs = this.getTimeFilteredLogs(query.startTime, query.endTime);

    // Apply filters
    for (const log of timeFilteredLogs) {
      if (this.matchesQuery(log, query)) {
        results.push(log);
      }
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
   * Aggregate logs by various criteria
   */
  aggregateLogs(query: LogQuery, groupBy: string[]): Record<string, LogEntry[]> {
    const logs = this.queryLogs(query);
    const aggregated: Record<string, LogEntry[]> = {};

    for (const log of logs) {
      const key = this.getGroupingKey(log, groupBy);
      if (!aggregated[key]) {
        aggregated[key] = [];
      }
      aggregated[key].push(log);
    }

    return aggregated;
  }

  /**
   * Get log statistics
   */
  getLogStats(): LogStats {
    return { ...this.stats };
  }

  /**
   * Export logs in various formats
   */
  async exportLogs(query: LogQuery, format: LogExportFormat = 'json'): Promise<string> {
    const logs = this.queryLogs(query);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);
      case 'csv':
        return this.exportToCSV(logs);
      case 'ndjson':
        return logs.map(log => JSON.stringify(log)).join('\n');
      case 'text':
        return this.exportToText(logs);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Search logs with full-text search
   */
  searchLogs(searchTerm: string, query?: LogQuery): LogEntry[] {
    const baseQuery = query || {};
    const logs = this.queryLogs(baseQuery);
    const term = searchTerm.toLowerCase();

    return logs.filter(log =>
      log.message.toLowerCase().includes(term) ||
      log.source.toLowerCase().includes(term) ||
      Object.entries(log.metadata || {}).some(([key, value]) =>
        key.toLowerCase().includes(term) ||
        String(value).toLowerCase().includes(term)
      )
    );
  }

  /**
   * Get log patterns and anomalies
   */
  analyzePatterns(query: LogQuery): {
    patterns: Array<{ pattern: string; count: number; frequency: number }>;
    anomalies: Array<{ log: LogEntry; anomalyScore: number; reason: string }>;
    trends: Array<{ timestamp: number; level: LogLevel; count: number }>;
  } {
    const logs = this.queryLogs(query);

    // Extract patterns from log messages
    const patterns = this.extractPatterns(logs);

    // Detect anomalies
    const anomalies = this.detectAnomalies(logs);

    // Analyze trends over time
    const trends = this.analyzeTrends(logs);

    return { patterns, anomalies, trends };
  }

  /**
   * Get logs by correlation ID
   */
  getLogsByCorrelationId(correlationId: string): LogEntry[] {
    const correlationKey = `correlation:${correlationId}`;
    const logIds = this.indexes.get(correlationKey) || new Set();

    return Array.from(logIds)
      .map(id => this.findLogById(id))
      .filter((log): log is LogEntry => log !== undefined);
  }

  /**
   * Create log correlation groups
   */
  correlateLogs(query: LogQuery, timeWindowMs: number = 5000): Array<{ id: string; logs: LogEntry[] }> {
    const logs = this.queryLogs(query);
    const groups: Array<{ id: string; logs: LogEntry[] }> = [];

    // Group logs by time proximity and common attributes
    for (const log of logs) {
      let addedToGroup = false;

      for (const group of groups) {
        const groupLog = group.logs[0];
        const timeDiff = Math.abs(log.timestamp - groupLog.timestamp);

        if (timeDiff <= timeWindowMs && this.hasCommonAttributes(log, groupLog)) {
          group.logs.push(log);
          addedToGroup = true;
          break;
        }
      }

      if (!addedToGroup) {
        groups.push({
          id: `correlation_${Date.now()}_${Math.random()}`,
          logs: [log]
        });
      }
    }

    return groups.filter(group => group.logs.length > 1);
  }

  /**
   * Flush log buffers
   */
  flushBuffers(): void {
    for (const [source, buffer] of this.buffers.entries()) {
      if (buffer.length > 0) {
        this.processBuffer(source, buffer);
        buffer.length = 0; // Clear buffer
      }
    }
  }

  // Private methods
  private initializeStats(): LogStats {
    return {
      totalLogs: 0,
      logsByLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
      logsBySource: {},
      logsByService: {},
      averageRate: 0,
      peakRate: 0,
      bufferSize: 0,
      lastFlushTime: Date.now(),
      earliestLogTime: null,
      latestLogTime: null
    };
  }

  private initializeIndexes(): void {
    // Initialize index types
    this.indexes.set('level', new Set());
    this.indexes.set('source', new Set());
    this.indexes.set('service', new Set());
    this.indexes.set('correlation', new Set());
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushBuffers();
      this.stats.lastFlushTime = Date.now();
    }, this.config.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private startAnalysisTimer(): void {
    this.analysisTimer = setInterval(() => {
      this.performAnalysis();
    }, this.config.analysisInterval);
  }

  private stopAnalysisTimer(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }
  }

  private validateLogEntry(entry: LogEntry): boolean {
    return (
      entry.level && Object.values(LogLevel).includes(entry.level) &&
      entry.message && typeof entry.message === 'string' &&
      entry.source && typeof entry.source === 'string' &&
      entry.timestamp && typeof entry.timestamp === 'number'
    );
  }

  private updateStats(entry: LogEntry): void {
    this.stats.totalLogs++;
    this.stats.logsByLevel[entry.level]++;
    this.stats.logsBySource[entry.source] = (this.stats.logsBySource[entry.source] || 0) + 1;

    if (entry.service) {
      this.stats.logsByService[entry.service] = (this.stats.logsByService[entry.service] || 0) + 1;
    }

    if (!this.stats.earliestLogTime || entry.timestamp < this.stats.earliestLogTime) {
      this.stats.earliestLogTime = entry.timestamp;
    }

    if (!this.stats.latestLogTime || entry.timestamp > this.stats.latestLogTime) {
      this.stats.latestLogTime = entry.timestamp;
    }

    // Calculate rates
    const now = Date.now();
    const timeWindow = now - this.stats.lastFlushTime;
    if (timeWindow > 0) {
      this.stats.averageRate = this.stats.totalLogs / (timeWindow / 1000);
      this.stats.peakRate = Math.max(this.stats.peakRate, this.stats.averageRate);
    }
  }

  private addToBuffer(entry: LogEntry): void {
    const source = entry.source || 'unknown';
    let buffer = this.buffers.get(source);

    if (!buffer) {
      buffer = [];
      this.buffers.set(source, buffer);
    }

    buffer.push(entry);
    this.stats.bufferSize++;

    // Flush buffer if it exceeds threshold
    if (buffer.length >= this.config.bufferSize) {
      this.processBuffer(source, buffer);
      buffer.length = 0;
    }
  }

  private addToIndexes(entry: LogEntry): void {
    const logId = `${entry.timestamp}_${Math.random()}`;

    // Index by level
    this.indexes.get('level')?.add(`${entry.level}:${logId}`);

    // Index by source
    this.indexes.get('source')?.add(`${entry.source}:${logId}`);

    // Index by service
    if (entry.service) {
      this.indexes.get('service')?.add(`${entry.service}:${logId}`);
    }

    // Index by correlation ID
    if (entry.correlationId) {
      this.indexes.get('correlation')?.add(`${entry.correlationId}:${logId}`);
    }
  }

  private processBuffer(source: string, buffer: LogEntry[]): void {
    let storageKey = this.logs.get(source);

    if (!storageKey) {
      storageKey = [];
      this.logs.set(source, storageKey);
    }

    storageKey.push(...buffer);
    this.stats.bufferSize -= buffer.length;

    // Apply retention policy
    this.applyRetentionPolicy(source, storageKey);

    this.emit('bufferFlushed', { source, count: buffer.length });
  }

  private applyRetentionPolicy(source: string, logs: LogEntry[]): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    // Remove old logs
    const filtered = logs.filter(log => log.timestamp > cutoffTime);

    if (filtered.length !== logs.length) {
      this.logs.set(source, filtered);
      this.emit('logsExpired', { source, expired: logs.length - filtered.length });
    }

    // Limit by count
    if (filtered.length > this.config.maxLogsPerSource) {
      const pruned = filtered.slice(-this.config.maxLogsPerSource);
      this.logs.set(source, pruned);
      this.emit('logsPruned', { source, pruned: filtered.length - pruned.length });
    }
  }

  private getTimeFilteredLogs(startTime?: number, endTime?: number): LogEntry[] {
    let results: LogEntry[] = [];

    for (const logs of this.logs.values()) {
      let filtered = logs;

      if (startTime) {
        filtered = filtered.filter(log => log.timestamp >= startTime);
      }

      if (endTime) {
        filtered = filtered.filter(log => log.timestamp <= endTime);
      }

      results.push(...filtered);
    }

    return results;
  }

  private matchesQuery(log: LogEntry, query: LogQuery): boolean {
    // Level filter
    if (query.levels && query.levels.length > 0) {
      if (!query.levels.includes(log.level)) {
        return false;
      }
    }

    // Source filter
    if (query.sources && query.sources.length > 0) {
      if (!query.sources.includes(log.source)) {
        return false;
      }
    }

    // Service filter
    if (query.services && query.services.length > 0) {
      if (!log.service || !query.services.includes(log.service)) {
        return false;
      }
    }

    // Message filter
    if (query.messagePattern) {
      const pattern = new RegExp(query.messagePattern, 'i');
      if (!pattern.test(log.message)) {
        return false;
      }
    }

    // Metadata filter
    if (query.metadata) {
      for (const [key, value] of Object.entries(query.metadata)) {
        if (log.metadata?.[key] !== value) {
          return false;
        }
      }
    }

    // Correlation ID filter
    if (query.correlationId && log.correlationId !== query.correlationId) {
      return false;
    }

    return true;
  }

  private getGroupingKey(log: LogEntry, groupBy: string[]): string {
    const values = groupBy.map(field => {
      switch (field) {
        case 'level':
          return log.level;
        case 'source':
          return log.source;
        case 'service':
          return log.service || 'unknown';
        case 'hour':
          return new Date(log.timestamp).getHours();
        case 'day':
          return new Date(log.timestamp).getDate();
        default:
          return log.metadata?.[field] || 'unknown';
      }
    });

    return values.join('|');
  }

  private exportToCSV(logs: LogEntry[]): string {
    const headers = ['timestamp', 'level', 'source', 'service', 'message', 'metadata'];
    const rows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.timestamp,
        log.level,
        `"${log.source.replace(/"/g, '""')}"`,
        `"${(log.service || '').replace(/"/g, '""')}"`,
        `"${log.message.replace(/"/g, '""')}"`,
        `"${JSON.stringify(log.metadata || {}).replace(/"/g, '""')}"`
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  private exportToText(logs: LogEntry[]): string {
    return logs.map(log => {
      const date = new Date(log.timestamp).toISOString();
      const service = log.service ? `[${log.service}]` : '';
      return `${date} [${log.level.toUpperCase()}] ${service} ${log.source}: ${log.message}`;
    }).join('\n');
  }

  private extractPatterns(logs: LogEntry[]): Array<{ pattern: string; count: number; frequency: number }> {
    const patterns: Map<string, number> = new Map();

    for (const log of logs) {
      // Simple pattern extraction - replace numbers and timestamps
      const pattern = log.message
        .replace(/\d+/g, '<NUM>')
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d+Z/g, '<TIMESTAMP>')
        .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, '<UUID>');

      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    }

    return Array.from(patterns.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        frequency: count / logs.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 patterns
  }

  private detectAnomalies(logs: LogEntry[]): Array<{ log: LogEntry; anomalyScore: number; reason: string }> {
    const anomalies: Array<{ log: LogEntry; anomalyScore: number; reason: string }> = [];

    // Detect error spikes
    const errorLogs = logs.filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.FATAL);
    const errorRate = errorLogs.length / logs.length;

    if (errorRate > 0.1) { // More than 10% errors
      anomalies.push(...errorLogs.map(log => ({
        log,
        anomalyScore: errorRate,
        reason: 'High error rate detected'
      })));
    }

    // Detect unusual log sources
    const sourceCounts = new Map<string, number>();
    for (const log of logs) {
      sourceCounts.set(log.source, (sourceCounts.get(log.source) || 0) + 1);
    }

    const avgCount = logs.length / sourceCounts.size;
    for (const [source, count] of sourceCounts.entries()) {
      if (count > avgCount * 5) { // 5x more logs than average
        const sourceLogs = logs.filter(log => log.source === source);
        anomalies.push(...sourceLogs.map(log => ({
          log,
          anomalyScore: count / avgCount,
          reason: `Unusually high log volume from source: ${source}`
        })));
      }
    }

    return anomalies;
  }

  private analyzeTrends(logs: LogEntry[]): Array<{ timestamp: number; level: LogLevel; count: number }> {
    const trends: Array<{ timestamp: number; level: LogLevel; count: number }> = [];
    const timeWindows = this.getTimeWindows(logs);

    for (const window of timeWindows) {
      for (const level of Object.values(LogLevel)) {
        const count = logs.filter(log =>
          log.level === level &&
          log.timestamp >= window.start &&
          log.timestamp < window.end
        ).length;

        if (count > 0) {
          trends.push({
            timestamp: window.start,
            level,
            count
          });
        }
      }
    }

    return trends;
  }

  private getTimeWindows(logs: LogEntry[]): Array<{ start: number; end: number }> {
    if (logs.length === 0) return [];

    const minTime = Math.min(...logs.map(log => log.timestamp));
    const maxTime = Math.max(...logs.map(log => log.timestamp));
    const windowSize = Math.max(60000, (maxTime - minTime) / 10); // 10 windows or 1 minute minimum

    const windows: Array<{ start: number; end: number }> = [];
    for (let start = minTime; start < maxTime; start += windowSize) {
      windows.push({
        start,
        end: start + windowSize
      });
    }

    return windows;
  }

  private hasCommonAttributes(log1: LogEntry, log2: LogEntry): boolean {
    return (
      log1.service === log2.service ||
      log1.source === log2.source ||
      log1.correlationId === log2.correlationId ||
      log1.traceId === log2.traceId
    );
  }

  private findLogById(id: string): LogEntry | undefined {
    for (const logs of this.logs.values()) {
      const log = logs.find(l => `${l.timestamp}_${Math.random()}` === id);
      if (log) return log;
    }
    return undefined;
  }

  private performAnalysis(): void {
    const recentQuery: LogQuery = {
      startTime: Date.now() - 3600000, // Last hour
      endTime: Date.now()
    };

    const analysis = this.analyzePatterns(recentQuery);

    this.emit('analysisComplete', {
      timestamp: Date.now(),
      analysis
    });
  }

  private flushAllBuffers(): void {
    for (const [source, buffer] of this.buffers.entries()) {
      if (buffer.length > 0) {
        this.processBuffer(source, buffer);
        buffer.length = 0;
      }
    }
  }
}