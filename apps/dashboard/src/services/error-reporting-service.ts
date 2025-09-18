/**
 * Error Reporting Service
 * Handles error collection, aggregation, and reporting to external services
 */

import { logger } from '@/lib/logger';

export interface ErrorReport {
  id: string;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  context?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'react' | 'network' | 'runtime' | 'security' | 'performance';
  metadata?: Record<string, unknown>;
}

export interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  batchSize: number;
  flushInterval: number;
  maxReportsPerSession: number;
  includeBreadcrumbs: boolean;
  includeEnvironment: boolean;
  samplingRate: number;
}

export interface Breadcrumb {
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  data?: Record<string, unknown>;
}

export class ErrorReportingService {
  private config: ErrorReportingConfig;
  private reports: ErrorReport[] = [];
  private breadcrumbs: Breadcrumb[] = [];
  private sessionStartTime: number;
  private flushTimer: NodeJS.Timeout | null = null;
  private reportCount = 0;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: true,
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      maxReportsPerSession: 100,
      includeBreadcrumbs: true,
      includeEnvironment: true,
      samplingRate: 1.0,
      ...config,
    };

    this.sessionStartTime = Date.now();
    this.initialize();
  }

  private initialize(): void {
    if (!this.config.enabled) return;

    // Set up automatic flushing
    this.startFlushTimer();

    // Set up global error handlers
    this.setupGlobalHandlers();

    // Set up breadcrumb collection
    this.setupBreadcrumbCollection();

    logger.info('Error reporting service initialized', { config: this.config });
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof Error) {
        this.reportError({
          name: 'UnhandledPromiseRejection',
          message: event.reason.message,
          stack: event.reason.stack,
          category: 'runtime',
          severity: 'high',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          id: this.generateErrorId(),
        });
      }
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.reportError({
        name: event.error?.name || 'UncaughtError',
        message: event.error?.message || event.message,
        stack: event.error?.stack,
        category: 'runtime',
        severity: 'critical',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        id: this.generateErrorId(),
      });
    });
  }

  private setupBreadcrumbCollection(): void {
    // Capture console logs as breadcrumbs
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };

    console.log = (...args) => {
      this.addBreadcrumb('info', 'console.log', args.join(' '));
      originalConsole.log.apply(console, args);
    };

    console.warn = (...args) => {
      this.addBreadcrumb('warn', 'console.warn', args.join(' '));
      originalConsole.warn.apply(console, args);
    };

    console.error = (...args) => {
      this.addBreadcrumb('error', 'console.error', args.join(' '));
      originalConsole.error.apply(console, args);
    };

    // Capture network errors
    window.addEventListener('error', (event) => {
      if (event.target && 'src' in event.target) {
        this.addBreadcrumb('error', 'network', `Failed to load: ${(event.target as any).src}`);
      }
    }, true);
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addBreadcrumb(level: Breadcrumb['level'], category: string, message: string, data?: Record<string, unknown>): void {
    if (!this.config.includeBreadcrumbs) return;

    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }
  }

  reportError(report: Partial<ErrorReport>): void {
    if (!this.config.enabled) return;

    // Apply sampling rate
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    // Check session limit
    if (this.reportCount >= this.config.maxReportsPerSession) {
      logger.warn('Error reporting limit reached for session');
      return;
    }

    const errorReport: ErrorReport = {
      id: report.id || this.generateErrorId(),
      name: report.name || 'UnknownError',
      message: report.message || 'Unknown error occurred',
      stack: report.stack,
      componentStack: report.componentStack,
      context: report.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: report.timestamp || new Date().toISOString(),
      severity: report.severity || 'medium',
      category: report.category || 'runtime',
      metadata: {
        ...report.metadata,
        breadcrumbs: this.config.includeBreadcrumbs ? this.breadcrumbs : undefined,
        sessionDuration: Date.now() - this.sessionStartTime,
        reportCount: this.reportCount + 1,
      },
    };

    this.reports.push(errorReport);
    this.reportCount++;

    // Log locally
    logger.error('Error reported', errorReport);

    // Check if we should flush immediately
    if (this.reports.length >= this.config.batchSize) {
      this.flush();
    }

    // For critical errors, flush immediately
    if (errorReport.severity === 'critical') {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (!this.config.enabled || this.reports.length === 0) {
      return;
    }

    const reportsToSend = [...this.reports];
    this.reports = [];

    try {
      // Send to external endpoint if configured
      if (this.config.endpoint) {
        await this.sendToExternalService(reportsToSend);
      }

      // Store in localStorage for debugging
      this.storeLocally(reportsToSend);

      logger.info(`Flushed ${reportsToSend.length} error reports`);
    } catch (error) {
      logger.error('Failed to flush error reports', error);

      // Re-queue failed reports
      this.reports.unshift(...reportsToSend);
    }
  }

  private async sendToExternalService(reports: ErrorReport[]): Promise<void> {
    if (!this.config.endpoint) return;

    const payload = {
      reports,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
        environment: process.env.NODE_ENV,
      },
    };

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private storeLocally(reports: ErrorReport[]): void {
    try {
      const storedReports = this.getStoredReports();
      const newReports = [...storedReports, ...reports];

      // Keep only the last 1000 reports
      const limitedReports = newReports.slice(-1000);

      localStorage.setItem('atlas-error-reports', JSON.stringify(limitedReports));
    } catch (error) {
      logger.error('Failed to store error reports locally', error);
    }
  }

  private getStoredReports(): ErrorReport[] {
    try {
      const stored = localStorage.getItem('atlas-error-reports');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  getStoredErrorReports(): ErrorReport[] {
    return this.getStoredReports();
  }

  clearStoredReports(): void {
    localStorage.removeItem('atlas-error-reports');
  }

  getErrorStats(): {
    totalReports: number;
    reportsByCategory: Record<string, number>;
    reportsBySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const storedReports = this.getStoredReports();

    const reportsByCategory = storedReports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reportsBySeverity = storedReports.reduce((acc, report) => {
      acc[report.severity] = (acc[report.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recentErrors = storedReports
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalReports: storedReports.length,
      reportsByCategory,
      reportsBySeverity,
      recentErrors,
    };
  }

  getSessionStats(): {
    sessionDuration: number;
    reportCount: number;
    breadcrumbCount: number;
    memoryUsage?: {
      used: number;
      total: number;
      limit: number;
    };
  } {
    const memoryUsage = (performance as any).memory
      ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        }
      : undefined;

    return {
      sessionDuration: Date.now() - this.sessionStartTime,
      reportCount: this.reportCount,
      breadcrumbCount: this.breadcrumbs.length,
      memoryUsage,
    };
  }

  addManualBreadcrumb(message: string, data?: Record<string, unknown>): void {
    this.addBreadcrumb('info', 'manual', message, data);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining reports
    this.flush();

    logger.info('Error reporting service destroyed');
  }
}

// Singleton instance
export const errorReportingService = new ErrorReportingService();

// Hook for error reporting
export function useErrorReporting() {
  const reportError = (error: Error | string, options?: {
    severity?: ErrorReport['severity'];
    category?: ErrorReport['category'];
    metadata?: Record<string, unknown>;
  }) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    errorReportingService.reportError({
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
      severity: options?.severity || 'medium',
      category: options?.category || 'runtime',
      metadata: options?.metadata,
    });
  };

  const addBreadcrumb = (message: string, data?: Record<string, unknown>) => {
    errorReportingService.addManualBreadcrumb(message, data);
  };

  return { reportError, addBreadcrumb };
}

export default ErrorReportingService;