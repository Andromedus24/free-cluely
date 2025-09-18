'use client';

import React, { useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { retryManager } from '@/lib/retry';
import { logger } from '@/lib/logger';
import { ErrorReportingService } from '@/services/error-reporting-service';

interface AsyncOperationState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

interface AsyncErrorBoundaryProps<T> {
  operation: () => Promise<T>;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryConfig?: {
    maxAttempts?: number;
    baseDelay?: number;
    condition?: (error: Error) => boolean;
  };
  deps?: any[];
  context?: string;
}

export function AsyncErrorBoundary<T>({
  operation,
  fallback,
  loadingFallback,
  errorFallback,
  onSuccess,
  onError,
  retryConfig,
  deps = [],
  context = 'async-operation'
}: AsyncErrorBoundaryProps<T>) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    error: null,
    isLoading: true,
    isRetrying: false,
    retryCount: 0,
  });

  const [errorReportingService] = useState(() => new ErrorReportingService());

  const executeOperation = useCallback(async (isRetry = false): Promise<void> => {
    if (isRetry) {
      setState(prev => ({ ...prev, isRetrying: true, error: null }));
    } else {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const result = await operation();

      setState(prev => ({
        ...prev,
        data: result,
        error: null,
        isLoading: false,
        isRetrying: false,
      }));

      if (onSuccess) {
        onSuccess(result);
      }

      logger.info('Async operation completed successfully', { context });
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      setState(prev => ({
        ...prev,
        error: errorObj,
        isLoading: false,
        isRetrying: false,
      }));

      if (onError) {
        onError(errorObj);
      }

      // Report error
      errorReportingService.reportError({
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack,
        category: 'async',
        severity: 'medium',
        context,
      });

      logger.error('Async operation failed', { error: errorObj, context });
    }
  }, [operation, onSuccess, onError, context, errorReportingService]);

  const handleRetry = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));

    try {
      await retryManager.execute(
        executeOperation,
        {
          maxAttempts: retryConfig?.maxAttempts || 3,
          baseDelay: retryConfig?.baseDelay || 1000,
          retryCondition: retryConfig?.condition,
          onRetry: (attempt, error, delay) => {
            logger.info('Retrying async operation', { attempt, error, delay, context });
          },
        }
      );
    } catch (error) {
      logger.error('Retry attempts exhausted for async operation', { error, context });
    }
  }, [executeOperation, retryConfig, context]);

  React.useEffect(() => {
    executeOperation(false);
  }, deps);

  // Render logic
  if (state.isLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>;
    }

    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }

    const isRetryable = state.retryCount < (retryConfig?.maxAttempts || 3);
    const shouldRetry = !retryConfig?.condition || retryConfig.condition(state.error);

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Operation Failed
          </CardTitle>
          <CardDescription>
            {context && (
              <Badge variant="outline" className="text-xs">
                {context}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive mb-1">
              {state.error.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {state.error.message}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {state.retryCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {state.retryCount} attempt{state.retryCount !== 1 ? 's' : ''} made
              </Badge>
            )}
            {!isRetryable && (
              <Badge variant="destructive" className="text-xs">
                Retry limit reached
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            {isRetryable && shouldRetry && (
              <Button
                onClick={handleRetry}
                disabled={state.isRetrying}
                variant="outline"
              >
                {state.isRetrying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => executeOperation(false)}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Fresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.data && fallback) {
    return <>{fallback}</>;
  }

  return <>{state.data}</>;
}

// Hook for managing async operations with error handling
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    retryConfig?: AsyncErrorBoundaryProps<T>['retryConfig'];
    context?: string;
  } = {}
) {
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
  });

  const [errorReportingService] = useState(() => new ErrorReportingService());

  const execute = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await operation();

      setState(prev => ({
        ...prev,
        data: result,
        error: null,
        isLoading: false,
      }));

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      logger.info('Async operation completed successfully', { context: options.context });
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));

      setState(prev => ({
        ...prev,
        error: errorObj,
        isLoading: false,
      }));

      if (options.onError) {
        options.onError(errorObj);
      }

      errorReportingService.reportError({
        name: errorObj.name,
        message: errorObj.message,
        stack: errorObj.stack,
        category: 'async',
        severity: 'medium',
        context: options.context,
      });

      logger.error('Async operation failed', { error: errorObj, context: options.context });
      return null;
    }
  }, [operation, options, errorReportingService]);

  const retry = useCallback(async (): Promise<T | null> => {
    setState(prev => ({ ...prev, retryCount: prev.retryCount + 1 }));

    try {
      return await retryManager.execute(
        execute,
        {
          maxAttempts: options.retryConfig?.maxAttempts || 3,
          baseDelay: options.retryConfig?.baseDelay || 1000,
          retryCondition: options.retryConfig?.condition,
        }
      );
    } catch (error) {
      logger.error('Retry attempts exhausted for async operation', { error, context: options.context });
      return null;
    }
  }, [execute, options.retryConfig, options.context]);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isRetrying: state.isRetrying,
    retryCount: state.retryCount,
    execute,
    retry,
    reset,
  };
}

// Component for wrapping async operations in components
export function AsyncOperation<T>({
  children,
  operation,
  loading,
  error,
  context
}: {
  children: (data: T) => React.ReactNode;
  operation: () => Promise<T>;
  loading?: React.ReactNode;
  error?: (error: Error, retry: () => void) => React.ReactNode;
  context?: string;
}) {
  const { data, error: operationError, isLoading, retry } = useAsyncOperation(operation, { context });

  if (isLoading) {
    return <>{loading || <div className="p-4 text-center">Loading...</div>}</>;
  }

  if (operationError) {
    return <>{error ? error(operationError, retry) : (
      <div className="p-4 text-center text-destructive">
        <p>Error: {operationError.message}</p>
        <Button onClick={retry} className="mt-2">Retry</Button>
      </div>
    )}</>;
  }

  return data ? <>{children(data)}</> : null;
}

export default AsyncErrorBoundary;