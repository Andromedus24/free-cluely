'use client';

import React, { useEffect } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingProvider } from '@/components/ui/loading-states';
import { ToastSystem } from '@/components/ui/toast-system';
import { errorHandlingService } from '@/services/error-handling';
import { useToast } from '@/components/ui/toast-system';

interface ErrorHandlingProviderProps {
  children: React.ReactNode;
}

export function ErrorHandlingProvider({ children }: ErrorHandlingProviderProps) {
  const { showError, showWarning, showInfo } = useToast();

  // Set up global error listeners
  useEffect(() => {
    const handleAtlasError = (event: CustomEvent) => {
      const { type, title, message, errorId, severity, persistent } = event.detail;

      switch (type) {
        case 'error':
          showError(title, message, {
            persistent,
            actions: [
              {
                label: 'Report Issue',
                onClick: () => reportError(errorId),
                variant: 'outline'
              }
            ]
          });
          break;
        case 'warning':
          showWarning(title, message);
          break;
        case 'info':
          showInfo(title, message);
          break;
      }
    };

    const handleAtlasToast = (event: CustomEvent) => {
      const { type, title, message, ...options } = event.detail;

      switch (type) {
        case 'success':
          // You can import showSuccess if needed
          break;
        case 'error':
          showError(title, message, options);
          break;
        case 'warning':
          showWarning(title, message, options);
          break;
        case 'info':
          showInfo(title, message, options);
          break;
      }
    };

    window.addEventListener('atlas-error', handleAtlasError as EventListener);
    window.addEventListener('atlas-toast', handleAtlasToast as EventListener);

    return () => {
      window.removeEventListener('atlas-error', handleAtlasError as EventListener);
      window.removeEventListener('atlas-toast', handleAtlasToast as EventListener);
    };
  }, [showError, showWarning, showInfo]);

  const reportError = (errorId: string) => {
    errorHandlingService.reportUserFeedback(errorId, 'User reported via error notification');

    // Show feedback to user
    showInfo('Error Reported', 'Thank you for helping us improve the application.');
  };

  return (
    <ErrorBoundary context="application">
      <LoadingProvider>
        <ToastSystem>
          {children}
        </ToastSystem>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

// Hook for accessing error handling functionality
export function useGlobalErrorHandling() {
  const { showError, showWarning, showInfo, showSuccess } = useToast();

  const handleError = React.useCallback((
    error: Error | string,
    options?: {
      type?: 'error' | 'warning' | 'info';
      title?: string;
      message?: string;
      silent?: boolean;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      component?: string;
      action?: string;
      context?: Record<string, any>;
    }
  ) => {
    const errorId = errorHandlingService.handleError(error, options);

    if (!options?.silent) {
      const title = options?.title || 'Error';
      const message = options?.message || (error instanceof Error ? error.message : String(error));

      switch (options?.type || 'error') {
        case 'error':
          showError(title, message, {
            persistent: options?.severity === 'critical',
            actions: [
              {
                label: 'Report Issue',
                onClick: () => errorHandlingService.reportUserFeedback(errorId, 'User reported via hook'),
                variant: 'outline'
              }
            ]
          });
          break;
        case 'warning':
          showWarning(title, message);
          break;
        case 'info':
          showInfo(title, message);
          break;
      }
    }

    return errorId;
  }, [showError, showWarning, showInfo]);

  const showSuccessToast = React.useCallback((
    title: string,
    message: string,
    options?: Parameters<typeof showSuccess>[2]
  ) => {
    // This would need to be implemented in the toast system
    // For now, we'll use info
    showInfo(title, message, options);
  }, [showInfo]);

  return {
    handleError,
    showSuccess: showSuccessToast,
    showError,
    showWarning,
    showInfo,
    errorLogs: errorHandlingService.getErrorLogs(),
    clearErrors: () => errorHandlingService.clearErrorLogs(),
    reportUserFeedback: errorHandlingService.reportUserFeedback.bind(errorHandlingService)
  };
}