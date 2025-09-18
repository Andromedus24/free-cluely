'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { ErrorReportingService } from '@/services/error-reporting-service';
import { retryManager } from '@/lib/retry';

interface ErrorContext {
  reportError: (error: Error | string, options?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    category?: 'react' | 'network' | 'runtime' | 'security' | 'performance';
    context?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  reportWarning: (message: string, context?: string) => void;
  reportInfo: (message: string, context?: string) => void;
  addBreadcrumb: (message: string, data?: Record<string, unknown>) => void;
  getErrorStats: () => {
    totalReports: number;
    reportsByCategory: Record<string, number>;
    reportsBySeverity: Record<string, number>;
    recentErrors: Array<{
      id: string;
      name: string;
      message: string;
      timestamp: string;
      severity: string;
    }>;
  };
  clearErrorReports: () => void;
  isOnline: boolean;
  networkErrors: number;
  resetNetworkErrors: () => void;
}

const ErrorContext = createContext<ErrorContext | undefined>(undefined);

interface ErrorHandlingProviderProps {
  children: React.ReactNode;
}

export function ErrorHandlingProvider({ children }: ErrorHandlingProviderProps) {
  const [errorReportingService] = useState(() => new ErrorReportingService());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkErrors, setNetworkErrors] = useState(0);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logger.info('Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      logger.warn('Network connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global error handling
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

      reportError(error, {
        severity: 'high',
        category: 'runtime',
        context: 'unhandled-promise-rejection',
      });

      // Prevent default browser behavior
      event.preventDefault();
    };

    const handleGlobalError = (event: ErrorEvent) => {
      const error = event.error instanceof Error ? event.error : new Error(event.message);

      reportError(error, {
        severity: 'critical',
        category: 'runtime',
        context: 'global-error',
      });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  const reportError = useCallback((
    error: Error | string,
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'react' | 'network' | 'runtime' | 'security' | 'performance';
      context?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Track network errors
    if (options.category === 'network') {
      setNetworkErrors(prev => prev + 1);
    }

    errorReportingService.reportError({
      name: errorObj.name,
      message: errorObj.message,
      stack: errorObj.stack,
      severity: options.severity || 'medium',
      category: options.category || 'runtime',
      context: options.context,
      metadata: {
        ...options.metadata,
        isOnline,
        networkErrors,
      },
    });
  }, [errorReportingService, isOnline, networkErrors]);

  const reportWarning = useCallback((message: string, context?: string) => {
    logger.warn(message, { context });
    errorReportingService.addManualBreadcrumb(message, { level: 'warning', context });
  }, [errorReportingService]);

  const reportInfo = useCallback((message: string, context?: string) => {
    logger.info(message, { context });
    errorReportingService.addManualBreadcrumb(message, { level: 'info', context });
  }, [errorReportingService]);

  const addBreadcrumb = useCallback((message: string, data?: Record<string, unknown>) => {
    errorReportingService.addManualBreadcrumb(message, data);
  }, [errorReportingService]);

  const getErrorStats = useCallback(() => {
    const stats = errorReportingService.getErrorStats();
    return {
      totalReports: stats.totalReports,
      reportsByCategory: stats.reportsByCategory,
      reportsBySeverity: stats.reportsBySeverity,
      recentErrors: stats.recentErrors.map(error => ({
        id: error.id,
        name: error.name,
        message: error.message,
        timestamp: error.timestamp,
        severity: error.severity,
      })),
    };
  }, [errorReportingService]);

  const clearErrorReports = useCallback(() => {
    errorReportingService.clearStoredReports();
    setNetworkErrors(0);
  }, [errorReportingService]);

  const resetNetworkErrors = useCallback(() => {
    setNetworkErrors(0);
  }, []);

  const value: ErrorContext = {
    reportError,
    reportWarning,
    reportInfo,
    addBreadcrumb,
    getErrorStats,
    clearErrorReports,
    isOnline,
    networkErrors,
    resetNetworkErrors,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorHandling() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorHandling must be used within an ErrorHandlingProvider');
  }
  return context;
}

// Hook for handling async operations with automatic error reporting
export function useAsyncErrorHandler<T>(
  operation: () => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    retry?: boolean;
    maxRetries?: number;
    context?: string;
  } = {}
) {
  const { reportError } = useErrorHandling();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      let result: T;

      if (options.retry) {
        const retryResult = await retryManager.execute(operation, {
          maxAttempts: options.maxRetries || 3,
          onRetry: (attempt, error, delay) => {
            logger.info('Retrying operation', { attempt, error, delay, context: options.context });
          },
        });

        if (!retryResult.success) {
          throw retryResult.error;
        }

        result = retryResult.data;
      } else {
        result = await operation();
      }

      setData(result);
      setIsLoading(false);

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      setError(errorObj);
      setIsLoading(false);

      reportError(errorObj, {
        severity: 'medium',
        category: 'async',
        context: options.context,
      });

      if (options.onError) {
        options.onError(errorObj);
      }

      return null;
    }
  }, [operation, options, reportError]);

  return {
    data,
    error,
    isLoading,
    execute,
    reset: () => {
      setData(null);
      setError(null);
      setIsLoading(false);
    },
  };
}

// Component for handling async operations with error boundaries
export function AsyncErrorHandler({
  children,
  fallback,
  context,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  context?: string;
}) {
  const { reportError } = useErrorHandling();

  const handleAsyncError = useCallback((error: Error) => {
    reportError(error, {
      severity: 'medium',
      category: 'async',
      context,
    });
  }, [reportError, context]);

  return (
    <React.Suspense fallback={fallback || <div>Loading...</div>}>
      <React.ErrorBoundary fallback={fallback} onError={handleAsyncError}>
        {children}
      </React.ErrorBoundary>
    </React.Suspense>
  );
}

export default ErrorHandlingProvider;