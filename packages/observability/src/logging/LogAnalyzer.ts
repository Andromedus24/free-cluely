// Log Analyzer Implementation
// =========================

import { EventEmitter } from 'events';
import {
  LogEntry,
  LogLevel,
  LogQuery,
  AnalysisResult,
  PatternMatch,
  AnomalyDetection,
  TrendAnalysis,
  CorrelationAnalysis,
  ObservabilityEventType
} from '../types';

/**
 * Advanced log analysis with machine learning capabilities
 */
export class LogAnalyzer extends EventEmitter {
  private config: {
    enabled: boolean;
    analysisInterval: number;
    patternWindowSize: number;
    anomalyThreshold: number;
    correlationWindowSize: number;
    minPatternSupport: number;
    maxPatternLength: number;
  };

  private patterns: Map<string, PatternMatch> = new Map();
  private anomalies: AnomalyDetection[] = [];
  private trends: Map<string, TrendAnalysis> = new Map();
  private correlations: CorrelationAnalysis[] = [];
  private isRunning: boolean = false;
  private analysisTimer?: NodeJS.Timeout;

  constructor(config?: Partial<typeof LogAnalyzer.prototype.config>) {
    super();
    this.config = {
      enabled: true,
      analysisInterval: 60000, // 1 minute
      patternWindowSize: 1000,
      anomalyThreshold: 0.1,
      correlationWindowSize: 300000, // 5 minutes
      minPatternSupport: 5,
      maxPatternLength: 100,
      ...config
    };
  }

  /**
   * Start log analysis
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startAnalysisTimer();

    this.emit('started');
  }

  /**
   * Stop log analysis
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopAnalysisTimer();

    this.emit('stopped');
  }

  /**
   * Analyze logs and extract insights
   */
  async analyzeLogs(logs: LogEntry[]): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Pattern extraction
    const patterns = await this.extractPatterns(logs);

    // Anomaly detection
    const anomalies = await this.detectAnomalies(logs);

    // Trend analysis
    const trends = await this.analyzeTrends(logs);

    // Correlation analysis
    const correlations = await this.analyzeCorrelations(logs);

    // Error analysis
    const errorAnalysis = await this.analyzeErrors(logs);

    // Performance analysis
    const performanceAnalysis = await this.analyzePerformance(logs);

    const result: AnalysisResult = {
      timestamp: startTime,
      logCount: logs.length,
      patterns,
      anomalies,
      trends,
      correlations,
      errorAnalysis,
      performanceAnalysis,
      summary: this.generateSummary(patterns, anomalies, trends, correlations),
      recommendations: this.generateRecommendations(patterns, anomalies, trends)
    };

    this.emit('analysisComplete', result);

    return result;
  }

  /**
   * Extract recurring patterns from logs
   */
  private async extractPatterns(logs: LogEntry[]): Promise<PatternMatch[]> {
    const patterns: Map<string, PatternMatch> = new Map();

    // Group logs by source and level
    const groupedLogs = this.groupLogs(logs);

    for (const [groupKey, groupLogs] of groupedLogs.entries()) {
      // Extract token patterns
      const tokenPatterns = this.extractTokenPatterns(groupLogs);

      // Extract sequence patterns
      const sequencePatterns = this.extractSequencePatterns(groupLogs);

      // Extract frequency patterns
      const frequencyPatterns = this.extractFrequencyPatterns(groupLogs);

      // Merge and rank patterns
      const allPatterns = [...tokenPatterns, ...sequencePatterns, ...frequencyPatterns];

      for (const pattern of allPatterns) {
        const key = `${groupKey}_${pattern.pattern}`;
        const existing = patterns.get(key);

        if (!existing || pattern.confidence > existing.confidence) {
          patterns.set(key, pattern);
        }
      }
    }

    // Filter by minimum support
    const filteredPatterns = Array.from(patterns.values())
      .filter(p => p.support >= this.config.minPatternSupport)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Top 50 patterns

    this.patterns = new Map(filteredPatterns.map(p => [p.pattern, p]));

    return filteredPatterns;
  }

  /**
   * Detect anomalies in log patterns
   */
  private async detectAnomalies(logs: LogEntry[]): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    // Statistical anomalies
    const statisticalAnomalies = this.detectStatisticalAnomalies(logs);
    anomalies.push(...statisticalAnomalies);

    // Pattern anomalies
    const patternAnomalies = this.detectPatternAnomalies(logs);
    anomalies.push(...patternAnomalies);

    // Temporal anomalies
    const temporalAnomalies = this.detectTemporalAnomalies(logs);
    anomalies.push(...temporalAnomalies);

    // Error anomalies
    const errorAnomalies = this.detectErrorAnomalies(logs);
    anomalies.push(...errorAnomalies);

    // Volume anomalies
    const volumeAnomalies = this.detectVolumeAnomalies(logs);
    anomalies.push(...volumeAnomalies);

    this.anomalies = anomalies;

    return anomalies;
  }

  /**
   * Analyze trends in log data
   */
  private async analyzeTrends(logs: LogEntry[]): Promise<TrendAnalysis[]> {
    const trends: TrendAnalysis[] = [];

    // Time-based trends
    const timeTrends = this.analyzeTimeTrends(logs);
    trends.push(...timeTrends);

    // Level-based trends
    const levelTrends = this.analyzeLevelTrends(logs);
    trends.push(...levelTrends);

    // Source-based trends
    const sourceTrends = this.analyzeSourceTrends(logs);
    trends.push(...sourceTrends);

    // Error rate trends
    const errorTrends = this.analyzeErrorTrends(logs);
    trends.push(...errorTrends);

    // Performance trends
    const performanceTrends = this.analyzePerformanceTrends(logs);
    trends.push(...performanceTrends);

    this.trends = new Map(trends.map(t => [t.metric, t]));

    return trends;
  }

  /**
   * Analyze correlations between log events
   */
  private async analyzeCorrelations(logs: LogEntry[]): Promise<CorrelationAnalysis[]> {
    const correlations: CorrelationAnalysis[] = [];

    // Temporal correlations
    const temporalCorrelations = this.analyzeTemporalCorrelations(logs);
    correlations.push(...temporalCorrelations);

    // Error correlations
    const errorCorrelations = this.analyzeErrorCorrelations(logs);
    correlations.push(...errorCorrelations);

    // Performance correlations
    const performanceCorrelations = this.analyzePerformanceCorrelations(logs);
    correlations.push(...performanceCorrelations);

    // Service correlations
    const serviceCorrelations = this.analyzeServiceCorrelations(logs);
    correlations.push(...serviceCorrelations);

    this.correlations = correlations;

    return correlations;
  }

  /**
   * Analyze error patterns and causes
   */
  private async analyzeErrors(logs: LogEntry[]): Promise<{
    errorRate: number;
    errorTypes: Map<string, number>;
    errorTrends: Array<{ timestamp: number; rate: number }>;
    errorClusters: Array<{ center: LogEntry; members: LogEntry[]; similarity: number }>;
    rootCauses: Array<{ cause: string; confidence: number; evidence: string[] }>;
  }> {
    const errorLogs = logs.filter(log =>
      log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );

    const errorRate = errorLogs.length / logs.length;

    // Error type analysis
    const errorTypes = new Map<string, number>();
    for (const log of errorLogs) {
      const errorType = this.extractErrorType(log);
      errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
    }

    // Error trends over time
    const errorTrends = this.calculateErrorTrends(errorLogs);

    // Error clustering
    const errorClusters = this.clusterErrors(errorLogs);

    // Root cause analysis
    const rootCauses = this.analyzeRootCauses(errorLogs, logs);

    return {
      errorRate,
      errorTypes,
      errorTrends,
      errorClusters,
      rootCauses
    };
  }

  /**
   * Analyze performance metrics from logs
   */
  private async analyzePerformance(logs: LogEntry[]): Promise<{
    responseTimes: { min: number; max: number; avg: number; p95: number; p99: number };
    throughput: number;
    errorRate: number;
    bottlenecks: Array<{ service: string; operation: string; impact: number }>;
    performanceTrends: Array<{ timestamp: number; metric: string; value: number }>;
  }> {
    const performanceLogs = logs.filter(log =>
      log.metadata?.duration || log.metadata?.response_time
    );

    // Extract response times
    const responseTimes = performanceLogs
      .map(log => log.metadata?.duration || log.metadata?.response_time || 0)
      .filter(time => time > 0);

    const stats = this.calculateStats(responseTimes);

    // Calculate throughput
    const timeWindow = Math.max(...logs.map(log => log.timestamp)) - Math.min(...logs.map(log => log.timestamp));
    const throughput = logs.length / (timeWindow / 1000); // logs per second

    // Calculate error rate
    const errorCount = logs.filter(log => log.level === LogLevel.ERROR || log.level === LogLevel.FATAL).length;
    const errorRate = errorCount / logs.length;

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(logs);

    // Performance trends
    const performanceTrends = this.calculatePerformanceTrends(logs);

    return {
      responseTimes: stats,
      throughput,
      errorRate,
      bottlenecks,
      performanceTrends
    };
  }

  // Helper methods
  private groupLogs(logs: LogEntry[]): Map<string, LogEntry[]> {
    const groups = new Map<string, LogEntry[]>();

    for (const log of logs) {
      const key = `${log.source}_${log.level}_${log.service || 'default'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(log);
    }

    return groups;
  }

  private extractTokenPatterns(logs: LogEntry[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];

    for (const log of logs) {
      // Tokenize message
      const tokens = this.tokenizeMessage(log.message);

      // Extract n-grams
      const ngrams = this.extractNGrams(tokens, 3);

      for (const ngram of ngrams) {
        const key = ngram.join(' ');
        const existing = patterns.find(p => p.pattern === key);

        if (existing) {
          existing.support++;
          existing.examples.push(log);
        } else {
          patterns.push({
            pattern: key,
            type: 'token',
            support: 1,
            confidence: this.calculatePatternConfidence([log]),
            examples: [log],
            metadata: { ngram: true, size: ngram.length }
          });
        }
      }
    }

    return patterns;
  }

  private extractSequencePatterns(logs: LogEntry[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const sequences = this.findSequences(logs, 5); // Find sequences of 5 logs

    for (const sequence of sequences) {
      const pattern = sequence.map(log => log.level).join('->');
      const existing = patterns.find(p => p.pattern === pattern);

      if (existing) {
        existing.support++;
        existing.examples.push(...sequence);
      } else {
        patterns.push({
          pattern,
          type: 'sequence',
          support: 1,
          confidence: this.calculatePatternConfidence(sequence),
          examples: [...sequence],
          metadata: { sequence: true, length: sequence.length }
        });
      }
    }

    return patterns;
  }

  private extractFrequencyPatterns(logs: LogEntry[]): PatternMatch[] {
    const patterns: PatternMatch[] = [];
    const frequencies = this.calculateLogFrequencies(logs);

    for (const [source, frequency] of frequencies.entries()) {
      const avgFrequency = Array.from(frequencies.values()).reduce((a, b) => a + b, 0) / frequencies.size;
      const ratio = frequency / avgFrequency;

      if (ratio > 2 || ratio < 0.5) {
        patterns.push({
          pattern: `frequency_${source}`,
          type: 'frequency',
          support: Math.floor(frequency),
          confidence: Math.min(1, Math.abs(ratio - 1)),
          examples: logs.filter(log => log.source === source),
          metadata: { frequency, ratio, source }
        });
      }
    }

    return patterns;
  }

  private tokenizeMessage(message: string): string[] {
    return message
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  private extractNGrams(tokens: string[], n: number): string[][] {
    const ngrams: string[][] = [];

    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n));
    }

    return ngrams;
  }

  private findSequences(logs: LogEntry[], minLength: number): LogEntry[][] {
    const sequences: LogEntry[][] = [];
    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i <= sortedLogs.length - minLength; i++) {
      const sequence = sortedLogs.slice(i, i + minLength);
      sequences.push(sequence);
    }

    return sequences;
  }

  private calculatePatternConfidence(logs: LogEntry[]): number {
    // Simple confidence calculation based on pattern consistency
    if (logs.length === 0) return 0;

    const timeGaps = [];
    for (let i = 1; i < logs.length; i++) {
      timeGaps.push(logs[i].timestamp - logs[i - 1].timestamp);
    }

    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    const variance = timeGaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / timeGaps.length;
    const stdDev = Math.sqrt(variance);

    // Higher confidence for more consistent timing
    return Math.max(0, 1 - (stdDev / avgGap));
  }

  private calculateLogFrequencies(logs: LogEntry[]): Map<string, number> {
    const frequencies = new Map<string, number>();

    for (const log of logs) {
      frequencies.set(log.source, (frequencies.get(log.source) || 0) + 1);
    }

    return frequencies;
  }

  private detectStatisticalAnomalies(logs: LogEntry[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Calculate baseline statistics
    const baseline = this.calculateBaselineStats(logs);

    // Detect deviations from baseline
    for (const log of logs) {
      if (this.isStatisticalOutlier(log, baseline)) {
        anomalies.push({
          timestamp: log.timestamp,
          type: 'statistical',
          severity: this.calculateAnomalySeverity(log, baseline),
          description: 'Statistical outlier detected',
          log,
          metadata: {
            deviation: this.calculateDeviation(log, baseline),
            baseline
          }
        });
      }
    }

    return anomalies;
  }

  private detectPatternAnomalies(logs: LogEntry[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Compare against known patterns
    for (const log of logs) {
      const matchesPattern = this.matchesKnownPatterns(log);

      if (!matchesPattern) {
        anomalies.push({
          timestamp: log.timestamp,
          type: 'pattern',
          severity: 0.7,
          description: 'Unusual log pattern detected',
          log,
          metadata: {
            patternBreak: true,
            knownPatterns: Array.from(this.patterns.keys())
          }
        });
      }
    }

    return anomalies;
  }

  private detectTemporalAnomalies(logs: LogEntry[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Detect unusual timing patterns
    const timeWindows = this.createTimeWindows(logs, 60000); // 1-minute windows

    for (const window of timeWindows) {
      if (window.logs.length > this.config.anomalyThreshold * timeWindows.length) {
        anomalies.push({
          timestamp: window.start,
          type: 'temporal',
          severity: 0.8,
          description: 'Unusual log volume in time window',
          metadata: {
            windowSize: 60000,
            logCount: window.logs.length,
            expectedCount: timeWindows.length / timeWindows.length
          }
        });
      }
    }

    return anomalies;
  }

  private detectErrorAnomalies(logs: LogEntry[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Detect error spikes
    const errorLogs = logs.filter(log =>
      log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );

    const errorWindows = this.createTimeWindows(errorLogs, 300000); // 5-minute windows

    for (const window of errorWindows) {
      const errorRate = window.logs.length / window.logs.length;

      if (errorRate > this.config.anomalyThreshold) {
        anomalies.push({
          timestamp: window.start,
          type: 'error',
          severity: 0.9,
          description: 'High error rate detected',
          metadata: {
            errorRate,
            windowSize: 300000,
            errorCount: window.logs.length
          }
        });
      }
    }

    return anomalies;
  }

  private detectVolumeAnomalies(logs: LogEntry[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];

    // Detect unusual log volumes
    const volumes = this.calculateLogVolumes(logs, 300000); // 5-minute windows
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    for (let i = 0; i < volumes.length; i++) {
      const volume = volumes[i];
      const ratio = volume / avgVolume;

      if (ratio > 3) { // 3x average volume
        anomalies.push({
          timestamp: Date.now() - (volumes.length - i) * 300000,
          type: 'volume',
          severity: Math.min(1, ratio / 5),
          description: 'Unusual log volume detected',
          metadata: {
            volume,
            averageVolume: avgVolume,
            ratio
          }
        });
      }
    }

    return anomalies;
  }

  private calculateBaselineStats(logs: LogEntry[]): {
    avgLevel: number;
    avgLength: number;
    avgMetadataSize: number;
  } {
    const levels = logs.map(log => Object.values(LogLevel).indexOf(log.level));
    const lengths = logs.map(log => log.message.length);
    const metadataSizes = logs.map(log => JSON.stringify(log.metadata || {}).length);

    return {
      avgLevel: levels.reduce((a, b) => a + b, 0) / levels.length,
      avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
      avgMetadataSize: metadataSizes.reduce((a, b) => a + b, 0) / metadataSizes.length
    };
  }

  private isStatisticalOutlier(log: LogEntry, baseline: any): boolean {
    const levelDeviation = Math.abs(Object.values(LogLevel).indexOf(log.level) - baseline.avgLevel);
    const lengthDeviation = Math.abs(log.message.length - baseline.avgLength);
    const metadataDeviation = Math.abs(JSON.stringify(log.metadata || {}).length - baseline.avgMetadataSize);

    return (
      levelDeviation > 2 ||
      lengthDeviation > baseline.avgLength * 0.5 ||
      metadataDeviation > baseline.avgMetadataSize * 0.5
    );
  }

  private calculateAnomalySeverity(log: LogEntry, baseline: any): number {
    const levelScore = Math.abs(Object.values(LogLevel).indexOf(log.level) - baseline.avgLevel) / 4;
    const lengthScore = Math.abs(log.message.length - baseline.avgLength) / baseline.avgLength;
    const metadataScore = Math.abs(JSON.stringify(log.metadata || {}).length - baseline.avgMetadataSize) / baseline.avgMetadataSize;

    return Math.min(1, (levelScore + lengthScore + metadataScore) / 3);
  }

  private calculateDeviation(log: LogEntry, baseline: any): number {
    const levelDeviation = Math.abs(Object.values(LogLevel).indexOf(log.level) - baseline.avgLevel);
    const lengthDeviation = Math.abs(log.message.length - baseline.avgLength);
    const metadataDeviation = Math.abs(JSON.stringify(log.metadata || {}).length - baseline.avgMetadataSize);

    return levelDeviation + lengthDeviation + metadataDeviation;
  }

  private matchesKnownPatterns(log: LogEntry): boolean {
    const message = log.message.toLowerCase();

    for (const pattern of this.patterns.keys()) {
      if (message.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  private createTimeWindows(logs: LogEntry[], windowSize: number): Array<{ start: number; end: number; logs: LogEntry[] }> {
    const windows: Array<{ start: number; end: number; logs: LogEntry[] }> = [];

    if (logs.length === 0) return windows;

    const minTime = Math.min(...logs.map(log => log.timestamp));
    const maxTime = Math.max(...logs.map(log => log.timestamp));

    for (let start = minTime; start < maxTime; start += windowSize) {
      const end = start + windowSize;
      const windowLogs = logs.filter(log => log.timestamp >= start && log.timestamp < end);

      windows.push({ start, end, logs: windowLogs });
    }

    return windows;
  }

  private calculateLogVolumes(logs: LogEntry[], windowSize: number): number[] {
    const windows = this.createTimeWindows(logs, windowSize);
    return windows.map(window => window.logs.length);
  }

  private analyzeTimeTrends(logs: LogEntry[]): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const timeWindows = this.createTimeWindows(logs, 3600000); // 1-hour windows

    for (const window of timeWindows) {
      const windowTrend: TrendAnalysis = {
        metric: 'log_volume',
        timestamp: window.start,
        value: window.logs.length,
        direction: 'stable',
        change: 0,
        confidence: 0.8,
        metadata: {
          windowSize: 3600000,
          logCount: window.logs.length
        }
      };

      trends.push(windowTrend);
    }

    return trends;
  }

  private analyzeLevelTrends(logs: LogEntry[]): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const levels = Object.values(LogLevel);

    for (const level of levels) {
      const levelLogs = logs.filter(log => log.level === level);
      const timeWindows = this.createTimeWindows(levelLogs, 3600000); // 1-hour windows

      for (const window of timeWindows) {
        trends.push({
          metric: `level_${level}`,
          timestamp: window.start,
          value: window.logs.length,
          direction: 'stable',
          change: 0,
          confidence: 0.8,
          metadata: {
            level,
            windowSize: 3600000
          }
        });
      }
    }

    return trends;
  }

  private analyzeSourceTrends(logs: LogEntry[]): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const sources = [...new Set(logs.map(log => log.source))];

    for (const source of sources) {
      const sourceLogs = logs.filter(log => log.source === source);
      const timeWindows = this.createTimeWindows(sourceLogs, 3600000); // 1-hour windows

      for (const window of timeWindows) {
        trends.push({
          metric: `source_${source}`,
          timestamp: window.start,
          value: window.logs.length,
          direction: 'stable',
          change: 0,
          confidence: 0.8,
          metadata: {
            source,
            windowSize: 3600000
          }
        });
      }
    }

    return trends;
  }

  private analyzeErrorTrends(logs: LogEntry[]): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const errorLogs = logs.filter(log =>
      log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );

    const timeWindows = this.createTimeWindows(errorLogs, 3600000); // 1-hour windows

    for (const window of timeWindows) {
      const errorRate = window.logs.length / Math.max(1,
        logs.filter(log =>
          log.timestamp >= window.start && log.timestamp < window.end
        ).length
      );

      trends.push({
        metric: 'error_rate',
        timestamp: window.start,
        value: errorRate,
        direction: 'stable',
        change: 0,
        confidence: 0.9,
        metadata: {
          errorRate,
          windowSize: 3600000
        }
      });
    }

    return trends;
  }

  private analyzePerformanceTrends(logs: LogEntry[]): TrendAnalysis[] {
    const trends: TrendAnalysis[] = [];
    const performanceLogs = logs.filter(log =>
      log.metadata?.duration || log.metadata?.response_time
    );

    const timeWindows = this.createTimeWindows(performanceLogs, 3600000); // 1-hour windows

    for (const window of timeWindows) {
      const responseTimes = window.logs
        .map(log => log.metadata?.duration || log.metadata?.response_time || 0)
        .filter(time => time > 0);

      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        trends.push({
          metric: 'response_time',
          timestamp: window.start,
          value: avgResponseTime,
          direction: 'stable',
          change: 0,
          confidence: 0.8,
          metadata: {
            avgResponseTime,
            windowSize: 3600000
          }
        });
      }
    }

    return trends;
  }

  private analyzeTemporalCorrelations(logs: LogEntry[]): CorrelationAnalysis[] {
    const correlations: CorrelationAnalysis[] = [];

    // Find temporal patterns between error and normal logs
    const errorLogs = logs.filter(log =>
      log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );

    for (const errorLog of errorLogs) {
      const nearbyLogs = logs.filter(log =>
        Math.abs(log.timestamp - errorLog.timestamp) <= this.config.correlationWindowSize &&
        log !== errorLog
      );

      if (nearbyLogs.length > 0) {
        correlations.push({
          type: 'temporal',
          strength: this.calculateCorrelationStrength(errorLog, nearbyLogs),
          description: 'Temporal correlation with nearby events',
          primaryEvent: errorLog,
          correlatedEvents: nearbyLogs,
          metadata: {
            timeWindow: this.config.correlationWindowSize,
            eventCount: nearbyLogs.length
          }
        });
      }
    }

    return correlations;
  }

  private analyzeErrorCorrelations(logs: LogEntry[]): CorrelationAnalysis[] {
    const correlations: CorrelationAnalysis[] = [];

    // Find correlations between different types of errors
    const errorLogs = logs.filter(log =>
      log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );

    const errorTypes = new Map<string, LogEntry[]>();
    for (const log of errorLogs) {
      const errorType = this.extractErrorType(log);
      if (!errorTypes.has(errorType)) {
        errorTypes.set(errorType, []);
      }
      errorTypes.get(errorType)!.push(log);
    }

    // Check for temporal correlations between error types
    for (const [type1, logs1] of errorTypes.entries()) {
      for (const [type2, logs2] of errorTypes.entries()) {
        if (type1 !== type2) {
          const correlatedPairs = this.findCorrelatedPairs(logs1, logs2);

          if (correlatedPairs.length > 0) {
            correlations.push({
              type: 'error',
              strength: correlatedPairs.length / Math.min(logs1.length, logs2.length),
              description: `Correlation between ${type1} and ${type2} errors`,
              primaryEvents: logs1,
              correlatedEvents: logs2,
              metadata: {
                errorType1: type1,
                errorType2: type2,
                correlatedPairs: correlatedPairs.length
              }
            });
          }
        }
      }
    }

    return correlations;
  }

  private analyzePerformanceCorrelations(logs: LogEntry[]): CorrelationAnalysis[] {
    const correlations: CorrelationAnalysis[] = [];

    // Find correlations between performance degradation and errors
    const performanceLogs = logs.filter(log =>
      log.metadata?.duration || log.metadata?.response_time
    );

    const errorLogs = logs.filter(log =>
      log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );

    // Find slow response times followed by errors
    const slowLogs = performanceLogs.filter(log =>
      (log.metadata?.duration || log.metadata?.response_time || 0) > 1000 // > 1s
    );

    for (const slowLog of slowLogs) {
      const subsequentErrors = errorLogs.filter(log =>
        log.timestamp > slowLog.timestamp &&
        log.timestamp <= slowLog.timestamp + this.config.correlationWindowSize
      );

      if (subsequentErrors.length > 0) {
        correlations.push({
          type: 'performance',
          strength: subsequentErrors.length / errorLogs.length,
          description: 'Performance degradation followed by errors',
          primaryEvent: slowLog,
          correlatedEvents: subsequentErrors,
          metadata: {
            responseTime: slowLog.metadata?.duration || slowLog.metadata?.response_time,
            subsequentErrors: subsequentErrors.length
          }
        });
      }
    }

    return correlations;
  }

  private analyzeServiceCorrelations(logs: LogEntry[]): CorrelationAnalysis[] {
    const correlations: CorrelationAnalysis[] = [];

    // Find correlations between services
    const services = [...new Set(logs.map(log => log.service).filter(Boolean))];

    for (const service1 of services) {
      for (const service2 of services) {
        if (service1 !== service2) {
          const service1Logs = logs.filter(log => log.service === service1);
          const service2Logs = logs.filter(log => log.service === service2);

          const correlatedPairs = this.findCorrelatedPairs(service1Logs, service2Logs);

          if (correlatedPairs.length > 0) {
            correlations.push({
              type: 'service',
              strength: correlatedPairs.length / Math.min(service1Logs.length, service2Logs.length),
              description: `Correlation between ${service1} and ${service2}`,
              primaryEvents: service1Logs,
              correlatedEvents: service2Logs,
              metadata: {
                service1,
                service2,
                correlatedPairs: correlatedPairs.length
              }
            });
          }
        }
      }
    }

    return correlations;
  }

  private extractErrorType(log: LogEntry): string {
    const message = log.message.toLowerCase();

    if (message.includes('timeout')) return 'timeout';
    if (message.includes('connection')) return 'connection';
    if (message.includes('authentication')) return 'authentication';
    if (message.includes('authorization')) return 'authorization';
    if (message.includes('not found')) return 'not_found';
    if (message.includes('validation')) return 'validation';
    if (message.includes('database')) return 'database';
    if (message.includes('memory')) return 'memory';
    if (message.includes('disk')) return 'disk';
    if (message.includes('network')) return 'network';

    return 'unknown';
  }

  private calculateErrorTrends(errorLogs: LogEntry[]): Array<{ timestamp: number; rate: number }> {
    const trends: Array<{ timestamp: number; rate: number }> = [];
    const timeWindows = this.createTimeWindows(errorLogs, 300000); // 5-minute windows

    for (const window of timeWindows) {
      trends.push({
        timestamp: window.start,
        rate: window.logs.length
      });
    }

    return trends;
  }

  private clusterErrors(errorLogs: LogEntry[]): Array<{ center: LogEntry; members: LogEntry[]; similarity: number }> {
    const clusters: Array<{ center: LogEntry; members: LogEntry[]; similarity: number }> = [];

    // Simple clustering based on message similarity
    for (const errorLog of errorLogs) {
      let bestCluster = null;
      let bestSimilarity = 0;

      for (const cluster of clusters) {
        const similarity = this.calculateMessageSimilarity(errorLog.message, cluster.center.message);
        if (similarity > bestSimilarity && similarity > 0.7) {
          bestSimilarity = similarity;
          bestCluster = cluster;
        }
      }

      if (bestCluster) {
        bestCluster.members.push(errorLog);
      } else {
        clusters.push({
          center: errorLog,
          members: [errorLog],
          similarity: 1.0
        });
      }
    }

    return clusters;
  }

  private analyzeRootCauses(errorLogs: LogEntry[], allLogs: LogEntry[]): Array<{ cause: string; confidence: number; evidence: string[] }> {
    const rootCauses: Array<{ cause: string; confidence: number; evidence: string[] }> = [];

    // Analyze common patterns in error logs
    const errorPatterns = this.extractErrorPatterns(errorLogs);

    for (const pattern of errorPatterns) {
      const confidence = this.calculateRootCauseConfidence(pattern, errorLogs, allLogs);
      const evidence = this.findEvidence(pattern, allLogs);

      if (confidence > 0.5) {
        rootCauses.push({
          cause: pattern.description,
          confidence,
          evidence
        });
      }
    }

    return rootCauses;
  }

  private extractErrorPatterns(errorLogs: LogEntry[]): Array<{ description: string; pattern: string }> {
    const patterns: Array<{ description: string; pattern: string }> = [];

    // Common error patterns
    patterns.push({ description: 'Database connection issues', pattern: 'database|connection|pool|timeout' });
    patterns.push({ description: 'Memory issues', pattern: 'memory|heap|out.*of.*memory|oom' });
    patterns.push({ description: 'Network issues', pattern: 'network|connection.*reset|socket|timeout' });
    patterns.push({ description: 'Authentication issues', pattern: 'auth|authentication|unauthorized|forbidden' });
    patterns.push({ description: 'File system issues', pattern: 'file|disk|permission|not.*found' });

    return patterns;
  }

  private calculateRootCauseConfidence(
    pattern: { description: string; pattern: string },
    errorLogs: LogEntry[],
    allLogs: LogEntry[]
  ): number {
    const regex = new RegExp(pattern.pattern, 'i');
    const matchingErrors = errorLogs.filter(log => regex.test(log.message));
    const matchingAll = allLogs.filter(log => regex.test(log.message));

    const errorRatio = matchingErrors.length / errorLogs.length;
    const overallRatio = matchingAll.length / allLogs.length;
    const concentration = errorRatio / overallRatio;

    return Math.min(1, concentration);
  }

  private findEvidence(pattern: { description: string; pattern: string }, allLogs: LogEntry[]): string[] {
    const regex = new RegExp(pattern.pattern, 'i');
    const evidence: string[] = [];

    for (const log of allLogs) {
      if (regex.test(log.message)) {
        evidence.push(log.message);
      }
    }

    return evidence.slice(0, 10); // Top 10 evidence pieces
  }

  private calculateStats(values: number[]): {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p95: 0, p99: 0 };
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  private identifyBottlenecks(logs: LogEntry[]): Array<{ service: string; operation: string; impact: number }> {
    const bottlenecks: Array<{ service: string; operation: string; impact: number }> = [];

    const performanceLogs = logs.filter(log =>
      log.metadata?.duration || log.metadata?.response_time
    );

    // Group by service and operation
    const groups = new Map<string, { logs: LogEntry[]; totalTime: number; count: number }>();

    for (const log of performanceLogs) {
      const service = log.service || 'unknown';
      const operation = log.metadata?.operation || 'unknown';
      const key = `${service}:${operation}`;
      const duration = log.metadata?.duration || log.metadata?.response_time || 0;

      if (!groups.has(key)) {
        groups.set(key, { logs: [], totalTime: 0, count: 0 });
      }

      const group = groups.get(key)!;
      group.logs.push(log);
      group.totalTime += duration;
      group.count++;
    }

    // Calculate average response times and identify bottlenecks
    const avgTimes = Array.from(groups.entries()).map(([key, group]) => ({
      key,
      avgTime: group.totalTime / group.count,
      count: group.count,
      logs: group.logs
    }));

    // Identify bottlenecks (above 95th percentile)
    const times = avgTimes.map(t => t.avgTime);
    const p95 = this.calculatePercentile(times, 95);

    for (const item of avgTimes) {
      if (item.avgTime > p95) {
        const [service, operation] = item.key.split(':');
        bottlenecks.push({
          service,
          operation,
          impact: item.avgTime / p95
        });
      }
    }

    return bottlenecks;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  private calculatePerformanceTrends(logs: LogEntry[]): Array<{ timestamp: number; metric: string; value: number }> {
    const trends: Array<{ timestamp: number; metric: string; value: number }> = [];

    const performanceLogs = logs.filter(log =>
      log.metadata?.duration || log.metadata?.response_time
    );

    const timeWindows = this.createTimeWindows(performanceLogs, 300000); // 5-minute windows

    for (const window of timeWindows) {
      const responseTimes = window.logs
        .map(log => log.metadata?.duration || log.metadata?.response_time || 0)
        .filter(time => time > 0);

      if (responseTimes.length > 0) {
        const avgTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

        trends.push({
          timestamp: window.start,
          metric: 'avg_response_time',
          value: avgTime
        });

        trends.push({
          timestamp: window.start,
          metric: 'max_response_time',
          value: Math.max(...responseTimes)
        });

        trends.push({
          timestamp: window.start,
          metric: 'p95_response_time',
          value: this.calculatePercentile(responseTimes, 95)
        });
      }
    }

    return trends;
  }

  private findCorrelatedPairs(logs1: LogEntry[], logs2: LogEntry[]): Array<{ log1: LogEntry; log2: LogEntry }> {
    const pairs: Array<{ log1: LogEntry; log2: LogEntry }> = [];

    for (const log1 of logs1) {
      for (const log2 of logs2) {
        const timeDiff = Math.abs(log1.timestamp - log2.timestamp);
        if (timeDiff <= this.config.correlationWindowSize) {
          pairs.push({ log1, log2 });
        }
      }
    }

    return pairs;
  }

  private calculateCorrelationStrength(log1: LogEntry, logs2: LogEntry[]): number {
    let totalStrength = 0;

    for (const log2 of logs2) {
      const timeDiff = Math.abs(log1.timestamp - log2.timestamp);
      const timeSimilarity = 1 - (timeDiff / this.config.correlationWindowSize);
      const messageSimilarity = this.calculateMessageSimilarity(log1.message, log2.message);

      totalStrength += (timeSimilarity + messageSimilarity) / 2;
    }

    return totalStrength / logs2.length;
  }

  private calculateMessageSimilarity(message1: string, message2: string): number {
    const tokens1 = this.tokenizeMessage(message1);
    const tokens2 = this.tokenizeMessage(message2);

    const intersection = tokens1.filter(token => tokens2.includes(token));
    const union = [...new Set([...tokens1, ...tokens2])];

    return union.length > 0 ? intersection.length / union.length : 0;
  }

  private generateSummary(
    patterns: PatternMatch[],
    anomalies: AnomalyDetection[],
    trends: TrendAnalysis[],
    correlations: CorrelationAnalysis[]
  ): string {
    const summary = [];

    if (patterns.length > 0) {
      summary.push(`Found ${patterns.length} significant patterns`);
    }

    if (anomalies.length > 0) {
      const severeAnomalies = anomalies.filter(a => a.severity > 0.7);
      summary.push(`Detected ${severeAnomalies.length} severe anomalies`);
    }

    if (trends.length > 0) {
      const increasingTrends = trends.filter(t => t.direction === 'increasing');
      summary.push(`${increasingTrends.length} metrics showing increasing trends`);
    }

    if (correlations.length > 0) {
      const strongCorrelations = correlations.filter(c => c.strength > 0.7);
      summary.push(`Found ${strongCorrelations.length} strong correlations`);
    }

    return summary.join('. ') || 'No significant patterns detected';
  }

  private generateRecommendations(
    patterns: PatternMatch[],
    anomalies: AnomalyDetection[],
    trends: TrendAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze error patterns
    const errorPatterns = patterns.filter(p => p.pattern.toLowerCase().includes('error'));
    if (errorPatterns.length > 3) {
      recommendations.push('Investigate recurring error patterns for systemic issues');
    }

    // Analyze anomalies
    const severeAnomalies = anomalies.filter(a => a.severity > 0.8);
    if (severeAnomalies.length > 0) {
      recommendations.push('Address high-severity anomalies immediately');
    }

    // Analyze performance trends
    const perfTrends = trends.filter(t => t.metric.includes('response_time') && t.direction === 'increasing');
    if (perfTrends.length > 0) {
      recommendations.push('Monitor increasing response times for performance degradation');
    }

    // Analyze error trends
    const errorTrends = trends.filter(t => t.metric.includes('error_rate') && t.direction === 'increasing');
    if (errorTrends.length > 0) {
      recommendations.push('Investigate increasing error rates and implement monitoring');
    }

    return recommendations;
  }

  private startAnalysisTimer(): void {
    this.analysisTimer = setInterval(() => {
      this.emit('analysisScheduled');
    }, this.config.analysisInterval);
  }

  private stopAnalysisTimer(): void {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = undefined;
    }
  }
}