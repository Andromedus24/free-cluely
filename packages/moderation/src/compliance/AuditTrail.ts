import { EventEmitter } from 'events';
import { IModerationStorage } from '../storage/ModerationStorage';
import { Logger } from '@atlas/logger';

/**
 * Audit Log Entry
 * Represents a single audit log entry with full context
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  result: 'success' | 'failure' | 'error';
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit Trail Configuration
 * Configuration for audit trail behavior
 */
export interface AuditTrailConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  retentionDays: number;
  enableEncryption: boolean;
  enableCompression: boolean;
  batchSize: number;
  flushInterval: number;
  includeSensitiveData: boolean;
  customFields?: string[];
}

/**
 * Audit Trail Interface
 * Provides comprehensive audit trail functionality
 */
export interface IAuditTrail {
  /**
   * Log an action with context
   */
  logAction(action: string, details: any, options?: LogOptions): Promise<void>;

  /**
   * Get audit logs with filtering
   */
  getLogs(filters: LogFilters): Promise<AuditLogEntry[]>;

  /**
   * Get audit log by ID
   */
  getLog(id: string): Promise<AuditLogEntry | null>;

  /**
   * Search audit logs
   */
  searchLogs(query: SearchQuery): Promise<AuditLogEntry[]>;

  /**
   * Export audit logs
   */
  exportLogs(options: ExportOptions): Promise<ExportResult>;

  /**
   * Purge old audit logs
   */
  purgeLogs(olderThan: Date): Promise<number>;

  /**
   * Get audit statistics
   */
  getStatistics(timeRange?: TimeRange): Promise<AuditStatistics>;

  /**
   * Validate audit trail integrity
   */
  validateIntegrity(): Promise<IntegrityResult>;
}

export interface LogOptions {
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  result?: 'success' | 'failure' | 'error';
  error?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface LogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  result?: 'success' | 'failure' | 'error';
  ipAddress?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'action' | 'userId';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery {
  text: string;
  fields?: string[];
  filters?: LogFilters;
  timeRange?: TimeRange;
  useRegex?: boolean;
  caseSensitive?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  filters?: LogFilters;
  timeRange?: TimeRange;
  includeSensitive?: boolean;
  compression?: boolean;
  encryption?: boolean;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  checksum?: string;
  error?: string;
}

export interface AuditStatistics {
  totalLogs: number;
  uniqueUsers: number;
  uniqueActions: number;
  uniqueResources: number;
  successRate: number;
  failureRate: number;
  errorRate: number;
  topActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  topUsers: Array<{
    userId: string;
    count: number;
    percentage: number;
  }>;
  topResources: Array<{
    resourceType: string;
    count: number;
    percentage: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    count: number;
  }>;
  dailyActivity: Array<{
    date: string;
    count: number;
  }>;
  timeRange: TimeRange;
}

export interface IntegrityResult {
  valid: boolean;
  totalLogs: number;
  corruptedLogs: number;
  missingLogs: number;
  checksumValid: boolean;
  issues: IntegrityIssue[];
  recommendations: string[];
}

export interface IntegrityIssue {
  type: 'corruption' | 'missing' | 'tampering' | 'inconsistent';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedLogs: string[];
  recommendation: string;
}

/**
 * Audit Trail Implementation
 * Provides enterprise-grade audit trail with security and compliance features
 */
export class AuditTrail extends EventEmitter implements IAuditTrail {
  private readonly logger: Logger;
  private readonly storage: IModerationStorage;
  private readonly config: AuditTrailConfig;
  private readonly pendingLogs: AuditLogEntry[];
  private flushTimeout: NodeJS.Timeout | null;
  private readonly encryptionKey?: string;

  constructor(
    storage: IModerationStorage,
    config?: Partial<AuditTrailConfig>
  ) {
    super();
    this.logger = new Logger('AuditTrail');
    this.storage = storage;
    this.pendingLogs = [];
    this.flushTimeout = null;

    // Default configuration
    this.config = {
      enabled: true,
      logLevel: 'info',
      retentionDays: 365,
      enableEncryption: false,
      enableCompression: true,
      batchSize: 100,
      flushInterval: 5000, // 5 seconds
      includeSensitiveData: false,
      ...config
    };

    // Initialize encryption if enabled
    if (this.config.enableEncryption) {
      this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    // Start automatic flushing
    this.startAutoFlush();

    // Initialize audit trail
    this.initialize();
  }

  /**
   * Log an action with context
   */
  async logAction(action: string, details: any, options?: LogOptions): Promise<void> {
    try {
      if (!this.config.enabled) {
        return;
      }

      // Create audit log entry
      const entry: AuditLogEntry = {
        id: this.generateLogId(),
        timestamp: new Date(),
        userId: options?.userId || 'system',
        action,
        resourceType: options?.resourceType || 'general',
        resourceId: options?.resourceId,
        details: this.sanitizeDetails(details),
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        sessionId: options?.sessionId,
        result: options?.result || 'success',
        error: options?.error,
        metadata: {
          ...options?.metadata,
          priority: options?.priority || 'medium',
          logLevel: this.config.logLevel
        }
      };

      // Add to pending logs
      this.pendingLogs.push(entry);

      // Flush if batch size reached
      if (this.pendingLogs.length >= this.config.batchSize) {
        await this.flushLogs();
      }

      // Emit event for real-time monitoring
      this.emit('logEntry', entry);

    } catch (error) {
      this.logger.error('Failed to log audit action', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getLogs(filters: LogFilters): Promise<AuditLogEntry[]> {
    try {
      return await this.storage.getAuditLogs(filters);
    } catch (error) {
      this.logger.error('Failed to get audit logs', error);
      throw error;
    }
  }

  /**
   * Get audit log by ID
   */
  async getLog(id: string): Promise<AuditLogEntry | null> {
    try {
      return await this.storage.getAuditLog(id);
    } catch (error) {
      this.logger.error('Failed to get audit log', error);
      throw error;
    }
  }

  /**
   * Search audit logs
   */
  async searchLogs(query: SearchQuery): Promise<AuditLogEntry[]> {
    try {
      // Build search filters
      const filters: LogFilters = {
        ...query.filters,
        limit: query.filters?.limit || 100
      };

      // Get candidate logs
      const candidateLogs = await this.storage.getAuditLogs(filters);

      // Apply text search
      const matchingLogs = candidateLogs.filter(log => {
        const searchText = query.text.toLowerCase();
        const searchFields = query.fields || ['action', 'details', 'resourceType'];

        return searchFields.some(field => {
          const value = this.getNestedValue(log, field);
          if (typeof value === 'string') {
            if (query.caseSensitive) {
              return query.useRegex
                ? new RegExp(query.text).test(value)
                : value.includes(query.text);
            } else {
              return query.useRegex
                ? new RegExp(query.text, 'i').test(value)
                : value.toLowerCase().includes(searchText);
            }
          }
          return false;
        });
      });

      // Apply time range filter
      if (query.timeRange) {
        return matchingLogs.filter(log =>
          log.timestamp >= query.timeRange!.start &&
          log.timestamp <= query.timeRange!.end
        );
      }

      return matchingLogs;
    } catch (error) {
      this.logger.error('Failed to search audit logs', error);
      throw error;
    }
  }

  /**
   * Export audit logs
   */
  async exportLogs(options: ExportOptions): Promise<ExportResult> {
    try {
      const exportId = this.generateExportId();
      const timeRange = options.timeRange || this.getDefaultTimeRange();

      // Get logs to export
      const logs = await this.getLogs({
        ...options.filters,
        startDate: timeRange.start,
        endDate: timeRange.end
      });

      // Sanitize logs if sensitive data should be excluded
      const exportLogs = options.includeSensitive
        ? logs
        : logs.map(log => this.sanitizeLogEntry(log));

      // Generate export based on format
      let downloadUrl: string | undefined;
      let fileSize: number | undefined;
      let checksum: string | undefined;

      switch (options.format) {
        case 'json':
          const jsonData = JSON.stringify(exportLogs, null, 2);
          const processedJson = options.compression
            ? await this.compressData(jsonData)
            : jsonData;
          const finalJson = options.encryption && this.encryptionKey
            ? await this.encryptData(processedJson, this.encryptionKey)
            : processedJson;
          downloadUrl = await this.storage.storeExport(exportId, finalJson, 'application/json');
          fileSize = Buffer.byteLength(finalJson, 'utf8');
          checksum = this.calculateChecksum(finalJson);
          break;

        case 'csv':
          const csvData = await this.convertToCSV(exportLogs);
          const processedCsv = options.compression
            ? await this.compressData(csvData)
            : csvData;
          const finalCsv = options.encryption && this.encryptionKey
            ? await this.encryptData(processedCsv, this.encryptionKey)
            : processedCsv;
          downloadUrl = await this.storage.storeExport(exportId, finalCsv, 'text/csv');
          fileSize = Buffer.byteLength(finalCsv, 'utf8');
          checksum = this.calculateChecksum(finalCsv);
          break;

        case 'xlsx':
          const xlsxData = await this.convertToXLSX(exportLogs);
          const processedXlsx = options.compression
            ? await this.compressData(xlsxData)
            : xlsxData;
          const finalXlsx = options.encryption && this.encryptionKey
            ? await this.encryptData(processedXlsx, this.encryptionKey)
            : processedXlsx;
          downloadUrl = await this.storage.storeExport(exportId, finalXlsx, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          fileSize = Buffer.byteLength(finalXlsx);
          checksum = this.calculateChecksum(finalXlsx);
          break;

        case 'pdf':
          const pdfData = await this.convertToPDF(exportLogs);
          const processedPdf = options.compression
            ? await this.compressData(pdfData)
            : pdfData;
          const finalPdf = options.encryption && this.encryptionKey
            ? await this.encryptData(processedPdf, this.encryptionKey)
            : processedPdf;
          downloadUrl = await this.storage.storeExport(exportId, finalPdf, 'application/pdf');
          fileSize = Buffer.byteLength(finalPdf);
          checksum = this.calculateChecksum(finalPdf);
          break;
      }

      // Log export action
      await this.logAction('audit_logs_exported', {
        exportId,
        format: options.format,
        recordCount: logs.length,
        fileSize,
        timeRange,
        includeSensitive: options.includeSensitive,
        compression: options.compression,
        encryption: options.encryption
      });

      return {
        success: true,
        downloadUrl,
        fileSize,
        recordCount: logs.length,
        checksum
      };
    } catch (error) {
      this.logger.error('Failed to export audit logs', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Purge old audit logs
   */
  async purgeLogs(olderThan: Date): Promise<number> {
    try {
      const purgedCount = await this.storage.purgeAuditLogs(olderThan);

      // Log purge action
      await this.logAction('audit_logs_purged', {
        olderThan,
        purgedCount
      });

      this.emit('logsPurged', { olderThan, purgedCount });

      return purgedCount;
    } catch (error) {
      this.logger.error('Failed to purge audit logs', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(timeRange?: TimeRange): Promise<AuditStatistics> {
    try {
      const effectiveTimeRange = timeRange || this.getDefaultTimeRange();

      // Get logs in time range
      const logs = await this.getLogs({
        startDate: effectiveTimeRange.start,
        endDate: effectiveTimeRange.end
      });

      // Calculate basic statistics
      const totalLogs = logs.length;
      const uniqueUsers = new Set(logs.map(log => log.userId)).size;
      const uniqueActions = new Set(logs.map(log => log.action)).size;
      const uniqueResources = new Set(logs.map(log => log.resourceType)).size;

      const successCount = logs.filter(log => log.result === 'success').length;
      const failureCount = logs.filter(log => log.result === 'failure').length;
      const errorCount = logs.filter(log => log.result === 'error').length;

      const successRate = totalLogs > 0 ? successCount / totalLogs : 0;
      const failureRate = totalLogs > 0 ? failureCount / totalLogs : 0;
      const errorRate = totalLogs > 0 ? errorCount / totalLogs : 0;

      // Calculate top actions
      const actionCounts = this.calculateCounts(logs.map(log => log.action));
      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([action, count]) => ({
          action,
          count,
          percentage: totalLogs > 0 ? (count / totalLogs) * 100 : 0
        }));

      // Calculate top users
      const userCounts = this.calculateCounts(logs.map(log => log.userId));
      const topUsers = Object.entries(userCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([userId, count]) => ({
          userId,
          count,
          percentage: totalLogs > 0 ? (count / totalLogs) * 100 : 0
        }));

      // Calculate top resources
      const resourceCounts = this.calculateCounts(logs.map(log => log.resourceType));
      const topResources = Object.entries(resourceCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([resourceType, count]) => ({
          resourceType,
          count,
          percentage: totalLogs > 0 ? (count / totalLogs) * 100 : 0
        }));

      // Calculate hourly activity
      const hourlyActivity = this.calculateHourlyActivity(logs);

      // Calculate daily activity
      const dailyActivity = this.calculateDailyActivity(logs);

      return {
        totalLogs,
        uniqueUsers,
        uniqueActions,
        uniqueResources,
        successRate,
        failureRate,
        errorRate,
        topActions,
        topUsers,
        topResources,
        hourlyActivity,
        dailyActivity,
        timeRange: effectiveTimeRange
      };
    } catch (error) {
      this.logger.error('Failed to get audit statistics', error);
      throw error;
    }
  }

  /**
   * Validate audit trail integrity
   */
  async validateIntegrity(): Promise<IntegrityResult> {
    try {
      // Get all logs
      const allLogs = await this.getLogs({});

      const issues: IntegrityIssue[] = [];
      let corruptedLogs = 0;
      let missingLogs = 0;

      // Check for corrupted logs
      for (const log of allLogs) {
        if (!this.validateLogEntry(log)) {
          corruptedLogs++;
          issues.push({
            type: 'corruption',
            severity: 'high',
            description: `Corrupted log entry: ${log.id}`,
            affectedLogs: [log.id],
            recommendation: 'Restore from backup or investigate corruption cause'
          });
        }
      }

      // Check for sequence gaps (simplified)
      const logIds = allLogs.map(log => log.id).sort();
      for (let i = 1; i < logIds.length; i++) {
        const prevId = parseInt(logIds[i - 1].split('_')[1]);
        const currentId = parseInt(logIds[i].split('_')[1]);

        if (currentId - prevId > 1) {
          missingLogs += currentId - prevId - 1;
          issues.push({
            type: 'missing',
            severity: 'medium',
            description: `Sequence gap detected between ${logIds[i - 1]} and ${logIds[i]}`,
            affectedLogs: [logIds[i - 1], logIds[i]],
            recommendation: 'Investigate potential log tampering or system issues'
          });
        }
      }

      // Calculate checksum validation
      const checksumValid = await this.validateChecksum(allLogs);

      // Generate recommendations
      const recommendations: string[] = [];
      if (corruptedLogs > 0) {
        recommendations.push('Implement regular backup procedures for audit logs');
      }
      if (missingLogs > 0) {
        recommendations.push('Review system security and access controls');
      }
      if (!checksumValid) {
        recommendations.push('Implement cryptographic signing for audit logs');
      }

      return {
        valid: issues.length === 0,
        totalLogs: allLogs.length,
        corruptedLogs,
        missingLogs,
        checksumValid,
        issues,
        recommendations
      };
    } catch (error) {
      this.logger.error('Failed to validate audit trail integrity', error);
      throw error;
    }
  }

  /**
   * Initialize audit trail
   */
  private async initialize(): Promise<void> {
    try {
      // Create necessary tables/indices if they don't exist
      await this.storage.initializeAuditTrail();

      // Log initialization
      await this.logAction('audit_trail_initialized', {
        config: this.config,
        version: '1.0.0'
      });

      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize audit trail', error);
      throw error;
    }
  }

  /**
   * Start automatic log flushing
   */
  private startAutoFlush(): void {
    if (this.flushTimeout) {
      clearInterval(this.flushTimeout);
    }

    this.flushTimeout = setInterval(async () => {
      try {
        await this.flushLogs();
      } catch (error) {
        this.logger.error('Failed to auto-flush audit logs', error);
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush pending logs to storage
   */
  private async flushLogs(): Promise<void> {
    try {
      if (this.pendingLogs.length === 0) {
        return;
      }

      const logsToFlush = [...this.pendingLogs];
      this.pendingLogs.length = 0;

      // Process logs (encryption, compression if enabled)
      const processedLogs = await Promise.all(
        logsToFlush.map(log => this.processLogEntry(log))
      );

      // Store logs
      await this.storage.storeAuditLogs(processedLogs);

      // Emit flush event
      this.emit('logsFlushed', { count: processedLogs.length });

    } catch (error) {
      this.logger.error('Failed to flush audit logs', error);
      // Re-add failed logs to pending
      this.pendingLogs.unshift(...logsToFlush);
      throw error;
    }
  }

  /**
   * Process a single log entry (encryption, compression)
   */
  private async processLogEntry(log: AuditLogEntry): Promise<AuditLogEntry> {
    let processedLog = { ...log };

    // Encrypt sensitive fields if enabled
    if (this.config.enableEncryption && this.encryptionKey) {
      processedLog.details = await this.encryptData(
        JSON.stringify(processedLog.details),
        this.encryptionKey
      );
    }

    // Compress if enabled
    if (this.config.enableCompression) {
      processedLog.details = await this.compressData(
        typeof processedLog.details === 'string'
          ? processedLog.details
          : JSON.stringify(processedLog.details)
      );
    }

    return processedLog;
  }

  /**
   * Sanitize log details to remove sensitive information
   */
  private sanitizeDetails(details: any): any {
    if (!this.config.includeSensitiveData) {
      const sensitiveFields = [
        'password', 'token', 'key', 'secret', 'credit_card', 'ssn',
        'email', 'phone', 'address', 'ip_address', 'user_agent'
      ];

      const sanitized = JSON.parse(JSON.stringify(details));
      this.removeSensitiveFields(sanitized, sensitiveFields);
      return sanitized;
    }

    return details;
  }

  /**
   * Remove sensitive fields from object recursively
   */
  private removeSensitiveFields(obj: any, sensitiveFields: string[]): void {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        this.removeSensitiveFields(obj[key], sensitiveFields);
      }
    }
  }

  /**
   * Sanitize log entry for export
   */
  private sanitizeLogEntry(log: AuditLogEntry): AuditLogEntry {
    return {
      ...log,
      details: this.sanitizeDetails(log.details),
      ipAddress: log.ipAddress ? this.maskIpAddress(log.ipAddress) : undefined,
      userAgent: log.userAgent ? this.maskUserAgent(log.userAgent) : undefined,
      sessionId: log.sessionId ? '[REDACTED]' : undefined
    };
  }

  /**
   * Mask IP address for privacy
   */
  private maskIpAddress(ip: string): string {
    if (ip.includes(':')) {
      // IPv6
      const parts = ip.split(':');
      return parts.slice(0, 4).join(':') + '::xxxx';
    } else {
      // IPv4
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }

  /**
   * Mask user agent for privacy
   */
  private maskUserAgent(userAgent: string): string {
    // Keep browser name and major version only
    const matches = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/(\d+)/);
    if (matches) {
      return `${matches[1]} ${matches[2]}.x`;
    }
    return '[BROWSER]';
  }

  /**
   * Calculate counts from array
   */
  private calculateCounts(items: string[]): Record<string, number> {
    return items.reduce((counts, item) => {
      counts[item] = (counts[item] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Calculate hourly activity
   */
  private calculateHourlyActivity(logs: AuditLogEntry[]): Array<{ hour: number; count: number }> {
    const hourlyCounts = new Array(24).fill(0);

    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      hourlyCounts[hour]++;
    });

    return hourlyCounts.map((count, hour) => ({ hour, count }));
  }

  /**
   * Calculate daily activity
   */
  private calculateDailyActivity(logs: AuditLogEntry[]): Array<{ date: string; count: number }> {
    const dailyCounts: Record<string, number> = {};

    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Validate log entry integrity
   */
  private validateLogEntry(log: AuditLogEntry): boolean {
    return (
      log.id &&
      log.timestamp &&
      log.userId &&
      log.action &&
      log.resourceType &&
      log.result &&
      typeof log.details === 'object'
    );
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get default time range
   */
  private getDefaultTimeRange(): TimeRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7); // 7 days default
    return { start, end };
  }

  /**
   * Generate unique IDs
   */
  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility methods for data processing
   */
  private async compressData(data: string): Promise<string> {
    // Simplified compression - in real implementation, use zlib or similar
    return data;
  }

  private async encryptData(data: string, key: string): Promise<string> {
    // Simplified encryption - in real implementation, use crypto module
    return data;
  }

  private calculateChecksum(data: string): string {
    // Simplified checksum - in real implementation, use crypto module
    return Buffer.from(data).toString('base64').slice(0, 16);
  }

  private async validateChecksum(logs: AuditLogEntry[]): Promise<boolean> {
    // Simplified validation - in real implementation, verify cryptographic signatures
    return true;
  }

  private async convertToCSV(logs: AuditLogEntry[]): Promise<string> {
    const headers = ['id', 'timestamp', 'userId', 'action', 'resourceType', 'resourceId', 'result'];
    const rows = logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      log.userId,
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.result
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private async convertToXLSX(logs: AuditLogEntry[]): Promise<Buffer> {
    // Simplified XLSX conversion - in real implementation, use exceljs or similar
    const csvData = await this.convertToCSV(logs);
    return Buffer.from(csvData);
  }

  private async convertToPDF(logs: AuditLogEntry[]): Promise<Buffer> {
    // Simplified PDF conversion - in real implementation, use pdfkit or similar
    const jsonData = JSON.stringify(logs, null, 2);
    return Buffer.from(jsonData);
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    // Flush any remaining logs
    await this.flushLogs();

    // Stop auto flush
    if (this.flushTimeout) {
      clearInterval(this.flushTimeout);
      this.flushTimeout = null;
    }

    // Remove all listeners
    this.removeAllListeners();

    // Log destruction
    try {
      await this.logAction('audit_trail_destroyed', { timestamp: new Date() });
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
}