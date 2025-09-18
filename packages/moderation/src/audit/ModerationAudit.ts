import {
  IModerationAudit,
  ModerationFilters
} from '../types/ModerationTypes';

/**
 * Moderation Audit Service
 * Provides comprehensive audit logging for all moderation actions
 */
export class ModerationAudit implements IModerationAudit {
  private logs: AuditLog[] = [];
  private enabled = true;
  private maxLogSize = 10000;
  private sensitiveFields = ['password', 'apiKey', 'token', 'secret', 'key'];

  constructor(config?: {
    enabled?: boolean;
    maxLogSize?: number;
    sensitiveFields?: string[];
  }) {
    if (config) {
      this.enabled = config.enabled !== false;
      this.maxLogSize = config.maxLogSize || 10000;
      this.sensitiveFields = config.sensitiveFields || this.sensitiveFields;
    }
  }

  async logAction(action: string, data: Record<string, any>, userId?: string): Promise<void> {
    if (!this.enabled) return;

    const auditLog: AuditLog = {
      id: this.generateId(),
      action,
      data: this.sanitizeData(data),
      userId,
      timestamp: new Date(),
      metadata: {
        ip: this.getClientIP(),
        userAgent: this.getUserAgent(),
        sessionId: this.getSessionId()
      }
    };

    this.logs.push(auditLog);

    // Maintain log size limit
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${action}`, {
        userId,
        timestamp: auditLog.timestamp,
        data: auditLog.data
      });
    }
  }

  async getAuditLogs(filters: ModerationFilters): Promise<AuditLog[]> {
    let filteredLogs = [...this.logs];

    // Apply date range filter
    if (filters.dateRange) {
      filteredLogs = filteredLogs.filter(log =>
        log.timestamp >= filters.dateRange!.start &&
        log.timestamp <= filters.dateRange!.end
      );
    }

    // Apply user filter
    if (filters.userIds && filters.userIds.length > 0) {
      filteredLogs = filteredLogs.filter(log =>
        log.userId && filters.userIds!.includes(log.userId)
      );
    }

    // Apply action filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.action.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.data).toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return filteredLogs;
  }

  async getAuditStats(timeRange?: { start: Date; end: Date }): Promise<AuditStats> {
    const logsInRange = timeRange
      ? this.logs.filter(log =>
          log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
        )
      : [...this.logs];

    const actionCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    const hourlyActivity = new Map<number, number>();

    logsInRange.forEach(log => {
      // Count actions
      const actionCount = actionCounts.get(log.action) || 0;
      actionCounts.set(log.action, actionCount + 1);

      // Count user activity
      if (log.userId) {
        const userCount = userCounts.get(log.userId) || 0;
        userCounts.set(log.userId, userCount + 1);
      }

      // Count hourly activity
      const hour = log.timestamp.getHours();
      const hourCount = hourlyActivity.get(hour) || 0;
      hourlyActivity.set(hour, hourCount + 1);
    });

    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const hourlyActivityArray = Array.from(hourlyActivity.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    return {
      totalLogs: logsInRange.length,
      uniqueUsers: userCounts.size,
      uniqueActions: actionCounts.size,
      timeRange: timeRange || {
        start: new Date(Math.min(...this.logs.map(l => l.timestamp.getTime()))),
        end: new Date(Math.max(...this.logs.map(l => l.timestamp.getTime())))
      },
      topActions,
      topUsers,
      hourlyActivity: hourlyActivityArray
    };
  }

  async exportAuditLogs(
    filters: ModerationFilters,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const logs = await this.getAuditLogs(filters);

    switch (format) {
      case 'json':
        return JSON.stringify(logs, null, 2);

      case 'csv':
        return this.convertToCSV(logs);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async importAuditLogs(logs: AuditLog[]): Promise<void> {
    this.logs.push(...logs);

    // Remove duplicates based on ID
    const uniqueLogs = new Map<string, AuditLog>();
    this.logs.forEach(log => {
      uniqueLogs.set(log.id, log);
    });

    this.logs = Array.from(uniqueLogs.values());

    // Sort by timestamp
    this.logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async clearAuditLogs(olderThan?: Date): Promise<void> {
    if (olderThan) {
      this.logs = this.logs.filter(log => log.timestamp > olderThan);
    } else {
      this.logs.length = 0;
    }
  }

  // Security and Compliance Methods
  // ===============================

  async verifyAuditTrail(): Promise<AuditVerificationResult> {
    const now = new Date();
    const recentLogs = this.logs.filter(log =>
      now.getTime() - log.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const verification: AuditVerificationResult = {
      totalLogs: this.logs.length,
      recentLogs: recentLogs.length,
      gaps: [],
      inconsistencies: [],
      hasContinuousLogging: true,
      lastLogTimestamp: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null,
      firstLogTimestamp: this.logs.length > 0 ? this.logs[0].timestamp : null,
      verifiedAt: now
    };

    // Check for time gaps
    if (this.logs.length > 1) {
      for (let i = 1; i < this.logs.length; i++) {
        const prevLog = this.logs[i - 1];
        const currentLog = this.logs[i];
        const timeDiff = currentLog.timestamp.getTime() - prevLog.timestamp.getTime();

        // If gap is more than 1 hour, flag it
        if (timeDiff > 60 * 60 * 1000) {
          verification.gaps.push({
            startTime: prevLog.timestamp,
            endTime: currentLog.timestamp,
            duration: timeDiff,
            severity: timeDiff > 24 * 60 * 60 * 1000 ? 'critical' : 'warning'
          });
        }
      }
    }

    // Check for inconsistencies
    const criticalActions = ['policy_updated', 'rule_updated', 'config_updated'];
    criticalActions.forEach(action => {
      const actionLogs = this.logs.filter(log => log.action === action);
      if (actionLogs.length === 0) {
        verification.inconsistencies.push({
          type: 'missing_critical_action',
          action,
          message: `No logs found for critical action: ${action}`,
          severity: 'warning'
        });
      }
    });

    verification.hasContinuousLogging = verification.gaps.length === 0;

    return verification;
  }

  async generateComplianceReport(): Promise<ComplianceReport> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = this.logs.filter(log => log.timestamp >= thirtyDaysAgo);

    const complianceReport: ComplianceReport = {
      period: {
        start: thirtyDaysAgo,
        end: new Date()
      },
      totalActions: recentLogs.length,
      criticalActions: recentLogs.filter(log => this.isCriticalAction(log.action)).length,
      dataRetentionCompliance: this.checkDataRetentionCompliance(),
      accessControls: this.checkAccessControls(),
      encryptionStatus: this.checkEncryptionStatus(),
      recommendations: [],
      generatedAt: new Date()
    };

    // Generate recommendations
    if (complianceReport.criticalActions === 0) {
      complianceReport.recommendations.push({
        type: 'warning',
        message: 'No critical actions logged in the last 30 days',
        impact: 'May indicate missing audit coverage'
      });
    }

    if (!complianceReport.dataRetentionCompliant) {
      complianceReport.recommendations.push({
        type: 'critical',
        message: 'Data retention policy violations detected',
        impact: 'Non-compliance with data retention requirements'
      });
    }

    return complianceReport;
  }

  // Utility Methods
  // ===============

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };

    const sanitizeObject = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (this.sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  private getClientIP(): string {
    // In a real implementation, this would get the client IP from the request
    return '127.0.0.1';
  }

  private getUserAgent(): string {
    // In a real implementation, this would get the user agent from the request
    return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  }

  private getSessionId(): string {
    // In a real implementation, this would get the session ID from the request
    return 'session_' + Math.random().toString(36).substr(2, 9);
  }

  private convertToCSV(logs: AuditLog[]): string {
    const headers = ['id', 'action', 'userId', 'timestamp', 'metadata'];
    const rows = logs.map(log => [
      log.id,
      log.action,
      log.userId || '',
      log.timestamp.toISOString(),
      JSON.stringify(log.metadata)
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'policy_updated',
      'rule_updated',
      'config_updated',
      'user_banned',
      'content_removed',
      'data_exported',
      'security_breach'
    ];
    return criticalActions.includes(action);
  }

  private checkDataRetentionCompliance(): boolean {
    // In a real implementation, this would check against retention policies
    return true;
  }

  private checkAccessControls(): {
    enabled: boolean;
    roleBasedAccess: boolean;
    permissionLogging: boolean;
  } {
    // In a real implementation, this would verify access control mechanisms
    return {
      enabled: true,
      roleBasedAccess: true,
      permissionLogging: true
    };
  }

  private checkEncryptionStatus(): {
    atRest: boolean;
    inTransit: boolean;
    keyRotation: boolean;
  } {
    // In a real implementation, this would verify encryption status
    return {
      atRest: true,
      inTransit: true,
      keyRotation: true
    };
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public utility methods
  getLogCount(): number {
    return this.logs.length;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setMaxLogSize(size: number): void {
    this.maxLogSize = size;
    if (this.logs.length > size) {
      this.logs = this.logs.slice(-size);
    }
  }

  addSensitiveField(field: string): void {
    if (!this.sensitiveFields.includes(field)) {
      this.sensitiveFields.push(field);
    }
  }

  removeSensitiveField(field: string): void {
    const index = this.sensitiveFields.indexOf(field);
    if (index > -1) {
      this.sensitiveFields.splice(index, 1);
    }
  }
}

// Type Definitions
// ================

export interface AuditLog {
  id: string;
  action: string;
  data: Record<string, any>;
  userId?: string;
  timestamp: Date;
  metadata: {
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    [key: string]: any;
  };
}

export interface AuditStats {
  totalLogs: number;
  uniqueUsers: number;
  uniqueActions: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  topActions: Array<{
    action: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    count: number;
  }>;
  hourlyActivity: Array<{
    hour: number;
    count: number;
  }>;
}

export interface AuditVerificationResult {
  totalLogs: number;
  recentLogs: number;
  gaps: Array<{
    startTime: Date;
    endTime: Date;
    duration: number;
    severity: 'warning' | 'critical';
  }>;
  inconsistencies: Array<{
    type: string;
    action: string;
    message: string;
    severity: 'warning' | 'critical';
  }>;
  hasContinuousLogging: boolean;
  lastLogTimestamp: Date | null;
  firstLogTimestamp: Date | null;
  verifiedAt: Date;
}

export interface ComplianceReport {
  period: {
    start: Date;
    end: Date;
  };
  totalActions: number;
  criticalActions: number;
  dataRetentionCompliant: boolean;
  accessControls: {
    enabled: boolean;
    roleBasedAccess: boolean;
    permissionLogging: boolean;
  };
  encryptionStatus: {
    atRest: boolean;
    inTransit: boolean;
    keyRotation: boolean;
  };
  recommendations: Array<{
    type: 'info' | 'warning' | 'critical';
    message: string;
    impact?: string;
  }>;
  generatedAt: Date;
}