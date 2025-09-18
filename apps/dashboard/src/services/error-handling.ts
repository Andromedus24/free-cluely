/**
 * Global Error Handling Service for Atlas Dashboard
 * Provides centralized error management, logging, and user feedback
 */

export interface ErrorLog {
  id: string;
  timestamp: Date;
  type: 'client' | 'server' | 'network' | 'auth' | 'validation' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  component?: string;
  action?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  context?: Record<string, any>;
  handled: boolean;
}

export interface ErrorHandlingConfig {
  enabled: boolean;
  logToConsole: boolean;
  logToService: boolean;
  showUserNotifications: boolean;
  enableErrorReporting: boolean;
  maxErrors: number;
  reportEndpoint?: string;
  ignoredErrors: string[];
  environment: 'development' | 'staging' | 'production';
}

class ErrorHandlingService {
  private config: ErrorHandlingConfig;
  private errorLogs: ErrorLog[] = [];
  private errorCallbacks: ((error: ErrorLog) => void)[] = [];

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    this.config = {
      enabled: true,
      logToConsole: true,
      logToService: false,
      showUserNotifications: true,
      enableErrorReporting: false,
      maxErrors: 1000,
      ignoredErrors: [],
      environment: process.env.NODE_ENV as any || 'development',
      ...config
    };

    this.initializeGlobalHandlers();
  }

  private initializeGlobalHandlers() {
    // Global unhandled error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          type: 'client',
          severity: 'high',
          component: 'global',
          context: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        });
      });

      // Global unhandled promise rejection handler
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
          type: 'client',
          severity: 'high',
          component: 'promise',
          context: { promise: true }
        });
      });
    }
  }

  public handleError(
    error: Error | string,
    options: {
      type?: ErrorLog['type'];
      severity?: ErrorLog['severity'];
      component?: string;
      action?: string;
      context?: Record<string, any>;
      silent?: boolean;
    } = {}
  ): string {
    if (!this.config.enabled) {
      return '';
    }

    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorId = this.generateErrorId();

    // Check if error should be ignored
    if (this.shouldIgnoreError(errorObj.message)) {
      return errorId;
    }

    const errorLog: ErrorLog = {
      id: errorId,
      timestamp: new Date(),
      type: options.type || this.categorizeError(errorObj),
      severity: options.severity || this.calculateSeverity(errorObj),
      message: errorObj.message,
      stack: errorObj.stack,
      component: options.component,
      action: options.action,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userId: this.getCurrentUserId(),
      context: options.context,
      handled: false
    };

    // Add to logs
    this.addErrorLog(errorLog);

    // Log to console
    if (this.config.logToConsole) {
      this.logToConsole(errorLog);
    }

    // Send to error service
    if (this.config.logToService) {
      this.sendToErrorService(errorLog);
    }

    // Show user notification
    if (this.config.showUserNotifications && !options.silent) {
      this.showUserNotification(errorLog);
    }

    // Call error callbacks
    this.notifyErrorCallbacks(errorLog);

    return errorId;
  }

  private categorizeError(error: Error): ErrorLog['type'] {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return 'network';
    }

    if (message.includes('auth') || message.includes('unauthorized') || message.includes('permission')) {
      return 'auth';
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }

    if (message.includes('server') || message.includes('500') || message.includes('502')) {
      return 'server';
    }

    return 'client';
  }

  private calculateSeverity(error: Error): ErrorLog['severity'] {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal') || message.includes('security')) {
      return 'critical';
    }

    if (message.includes('failed') || message.includes('error') || message.includes('exception')) {
      return 'high';
    }

    if (message.includes('warning') || message.includes('deprecated')) {
      return 'medium';
    }

    return 'low';
  }

  private shouldIgnoreError(message: string): boolean {
    return this.config.ignoredErrors.some(ignored =>
      message.toLowerCase().includes(ignored.toLowerCase())
    );
  }

  private addErrorLog(errorLog: ErrorLog) {
    this.errorLogs.push(errorLog);

    // Maintain max size
    if (this.errorLogs.length > this.config.maxErrors) {
      this.errorLogs = this.errorLogs.slice(-this.config.maxErrors);
    }
  }

  private logToConsole(errorLog: ErrorLog) {
    const logMethod = this.getConsoleMethod(errorLog.severity);

    logMethod(`[${errorLog.severity.toUpperCase()}] ${errorLog.message}`, {
      id: errorLog.id,
      type: errorLog.type,
      component: errorLog.component,
      timestamp: errorLog.timestamp,
      context: errorLog.context,
      stack: errorLog.stack
    });
  }

  private getConsoleMethod(severity: ErrorLog['severity']): Console['log'] {
    switch (severity) {
      case 'critical':
      case 'high':
        return console.error;
      case 'medium':
        return console.warn;
      default:
        return console.log;
    }
  }

  private async sendToErrorService(errorLog: ErrorLog) {
    if (!this.config.reportEndpoint) {
      return;
    }

    try {
      const response = await fetch(this.config.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorLog),
      });

      if (!response.ok) {
        console.warn('Failed to send error to service:', await response.text());
      }
    } catch (err) {
      console.warn('Error sending error to service:', err);
    }
  }

  private showUserNotification(errorLog: ErrorLog) {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Dispatch custom event for toast system
      const event = new CustomEvent('atlas-error', {
        detail: {
          type: 'error',
          title: this.getUserTitle(errorLog),
          message: this.getUserMessage(errorLog),
          errorId: errorLog.id,
          severity: errorLog.severity,
          persistent: errorLog.severity === 'critical'
        }
      });

      window.dispatchEvent(event);
    } catch (err) {
      console.warn('Failed to show user notification:', err);
    }
  }

  private getUserTitle(errorLog: ErrorLog): string {
    switch (errorLog.severity) {
      case 'critical':
        return 'Critical Error';
      case 'high':
        return 'Error';
      case 'medium':
        return 'Warning';
      default:
        return 'Notice';
    }
  }

  private getUserMessage(errorLog: ErrorLog): string {
    if (this.config.environment === 'development') {
      return errorLog.message;
    }

    switch (errorLog.type) {
      case 'network':
        return 'Network connection error. Please check your internet connection.';
      case 'auth':
        return 'Authentication error. Please log in again.';
      case 'validation':
        return 'Invalid input. Please check your data and try again.';
      case 'server':
        return 'Server error. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  private notifyErrorCallbacks(errorLog: ErrorLog) {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(errorLog);
      } catch (err) {
        console.warn('Error in error callback:', err);
      }
    });
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      if (typeof window !== 'undefined' && (window as any).atlasUser) {
        return (window as any).atlasUser.id;
      }

      if (typeof localStorage !== 'undefined') {
        const user = localStorage.getItem('atlas-user');
        if (user) {
          return JSON.parse(user).id;
        }
      }
    } catch (err) {
      // Ignore errors when getting user ID
    }

    return undefined;
  }

  // Public API
  public onError(callback: (error: ErrorLog) => void): () => void {
    this.errorCallbacks.push(callback);

    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  public getErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public clearErrorLogs(): void {
    this.errorLogs = [];
  }

  public updateConfig(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public reportUserFeedback(errorId: string, feedback: string): void {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.context = {
        ...errorLog.context,
        userFeedback: feedback,
        feedbackTimestamp: new Date().toISOString()
      };

      // Send updated error to service
      if (this.config.logToService) {
        this.sendToErrorService(errorLog);
      }
    }
  }

  // Utility methods
  public handleAuthError(error: Error): string {
    return this.handleError(error, {
      type: 'auth',
      severity: 'high',
      component: 'authentication'
    });
  }

  public handleNetworkError(error: Error): string {
    return this.handleError(error, {
      type: 'network',
      severity: 'medium',
      component: 'network'
    });
  }

  public handleValidationError(error: Error, field?: string): string {
    return this.handleError(error, {
      type: 'validation',
      severity: 'medium',
      component: 'validation',
      context: { field }
    });
  }

  public handleApiError(error: Error, endpoint?: string): string {
    return this.handleError(error, {
      type: 'server',
      severity: 'high',
      component: 'api',
      context: { endpoint }
    });
  }
}

// Global instance
export const errorHandlingService = new ErrorHandlingService();

// React hook for error handling
export function useErrorHandling() {
  const [errorLogs, setErrorLogs] = React.useState<ErrorLog[]>([]);

  React.useEffect(() => {
    const unsubscribe = errorHandlingService.onError((errorLog) => {
      setErrorLogs(prev => [...prev, errorLog]);
    });

    return unsubscribe;
  }, []);

  const handleError = React.useCallback((
    error: Error | string,
    options?: Parameters<typeof errorHandlingService.handleError>[1]
  ) => {
    return errorHandlingService.handleError(error, options);
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrorLogs([]);
    errorHandlingService.clearErrorLogs();
  }, []);

  return {
    errorLogs,
    handleError,
    clearErrors,
    handleAuthError: errorHandlingService.handleAuthError.bind(errorHandlingService),
    handleNetworkError: errorHandlingService.handleNetworkError.bind(errorHandlingService),
    handleValidationError: errorHandlingService.handleValidationError.bind(errorHandlingService),
    handleApiError: errorHandlingService.handleApiError.bind(errorHandlingService)
  };
}

// Higher-order component for error handling
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  errorOptions?: Parameters<typeof errorHandlingService.handleError>[1]
): React.ComponentType<P> {
  return function WithErrorHandling(props: P) {
    const { handleError } = useErrorHandling();

    const wrappedComponent = React.useMemo(() => {
      return React.createElement(Component, props);
    }, [props]);

    return (
      <ErrorBoundary
        onError={(error, errorInfo) => {
          handleError(error, {
            ...errorOptions,
            component: Component.displayName || Component.name || 'Unknown',
            context: { ...errorOptions?.context, errorInfo }
          });
        }}
      >
        {wrappedComponent}
      </ErrorBoundary>
    );
  };
}