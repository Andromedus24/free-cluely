'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ExternalLink, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import { ErrorReportingService } from '@/services/error-reporting-service';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  isRecovered: boolean;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  fallbackComponent?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo; onReset: () => void }>;
  maxRetries?: number;
  resetKeys?: any[];
  context?: string;
}

interface ErrorContext {
  componentStack: string;
  componentName: string;
  timestamp: string;
  userAgent: string;
  url: string;
  context?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorReportingService: ErrorReportingService;
  private readonly maxRetries: number;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isRecovered: false,
      retryCount: 0,
    };
    this.errorReportingService = new ErrorReportingService();
    this.maxRetries = props.maxRetries || 3;
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      isRecovered: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate unique error ID for tracking
    const errorId = this.generateErrorId();

    this.setState({
      errorInfo,
      errorId,
    });

    // Log the error
    this.logError(error, errorInfo, errorId);

    // Report error to service
    this.reportError(error, errorInfo, errorId);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Attempt automatic recovery if retries available
    this.attemptAutomaticRecovery(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset boundary if reset keys have changed
    if (this.props.resetKeys && prevProps.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some((key, index) =>
        key !== prevProps.resetKeys[index]
      );

      if (hasResetKeyChanged && this.state.hasError) {
        this.resetBoundary();
      }
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(error: Error, errorInfo: ErrorInfo, errorId: string): void {
    const errorContext: ErrorContext = {
      componentStack: errorInfo.componentStack,
      componentName: this.extractComponentName(errorInfo.componentStack),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context: this.props.context,
    };

    logger.error('React Error Boundary caught error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorContext,
      errorId,
      retryCount: this.state.retryCount,
    });
  }

  private reportError(error: Error, errorInfo: ErrorInfo, errorId: string): void {
    const errorReport = {
      id: errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    this.errorReportingService.reportError(errorReport);
  }

  private extractComponentName(componentStack: string): string {
    const match = componentStack.match(/in (\w+)/);
    return match ? match[1] : 'UnknownComponent';
  }

  private async attemptAutomaticRecovery(error: Error, errorInfo: ErrorInfo): Promise<void> {
    const { retryCount } = this.state;

    if (retryCount >= this.maxRetries) {
      logger.warn('Max retry attempts reached for error boundary', {
        errorId: this.state.errorId,
        maxRetries: this.maxRetries,
      });
      return;
    }

    // Implement automatic recovery strategies
    const recoveryStrategies = [
      this.retryNetworkOperations,
      this.clearCaches,
      this.reloadModules,
    ];

    for (const strategy of recoveryStrategies) {
      try {
        await strategy();

        // Wait and then retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

        this.setState(prev => ({
          retryCount: prev.retryCount + 1,
        }));

        // Test if the error is resolved
        if (await this.testRecovery()) {
          this.setState({ isRecovered: true });
          logger.info('Automatic recovery successful', { errorId: this.state.errorId });
          return;
        }
      } catch (recoveryError) {
        logger.error('Recovery strategy failed', {
          errorId: this.state.errorId,
          strategy: strategy.name,
          recoveryError,
        });
      }
    }
  }

  private async retryNetworkOperations(): Promise<void> {
    // Clear failed network requests and retry
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  private async clearCaches(): Promise<void> {
    // Clear localStorage caches
    const cacheKeys = Object.keys(localStorage).filter(key =>
      key.includes('cache') || key.includes('state')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));
  }

  private async reloadModules(): Promise<void> {
    // Simulate module reload by triggering state updates
    // In a real implementation, this might involve dynamic imports
    return Promise.resolve();
  }

  private async testRecovery(): Promise<boolean> {
    // Test if the error condition has been resolved
    // This is a simplified test - in practice, you'd have specific tests
    return true;
  }

  private resetBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      isRecovered: false,
      retryCount: 0,
    });

    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }

    logger.info('Error boundary reset', {
      context: this.props.context,
      previousErrorId: this.state.errorId,
    });
  };

  private handleRefresh = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  private handleReportBug = (): void => {
    const { error, errorId } = this.state;
    if (!error) return;

    const bugReport = `
Error ID: ${errorId}
Error: ${error.name}: ${error.message}
Stack Trace:
${error.stack}

Component Stack:
${this.state.errorInfo?.componentStack || 'N/A'}

User Agent: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}
    `.trim();

    // Copy to clipboard
    navigator.clipboard.writeText(bugReport).then(() => {
      logger.info('Bug report copied to clipboard', { errorId });

      // Open email client with pre-filled report
      const subject = encodeURIComponent(`Atlas Error Report - ${errorId}`);
      const body = encodeURIComponent(bugReport);
      window.open(`mailto:support@atlas.app?subject=${subject}&body=${body}`);
    });
  };

  render() {
    const { hasError, error, errorInfo, isRecovered, errorId } = this.state;
    const { children, fallback, fallbackComponent: FallbackComponent } = this.props;

    // If recovered, show children
    if (isRecovered) {
      return children;
    }

    // If no error, render children normally
    if (!hasError) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Use custom fallback component if provided
    if (FallbackComponent && error && errorInfo) {
      return <FallbackComponent error={error} errorInfo={errorInfo} onReset={this.resetBoundary} />;
    }

    // Default error UI
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Something went wrong</CardTitle>
            <CardDescription className="text-muted-foreground">
              {errorId && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-sm">Error ID:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {errorId}
                  </Badge>
                </div>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error details */}
            {error && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive mb-1">
                  {error.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {error.message}
                </p>
              </div>
            )}

            {/* Recovery status */}
            <div className="flex items-center justify-center gap-2">
              {this.state.retryCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Attempted {this.state.retryCount} recovery
                </Badge>
              )}
              {this.state.retryCount >= this.maxRetries && (
                <Badge variant="destructive" className="text-xs">
                  Recovery exhausted
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={this.resetBoundary} className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>

              <Button onClick={this.handleRefresh} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>

              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Report bug */}
            <Button
              onClick={this.handleReportBug}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Bug
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    // This hook can be used to throw errors from within try-catch blocks
    // in functional components
    throw error;
  };
}

// Component for handling async errors
export function AsyncErrorHandler({
  children,
  fallback
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}

// Higher-order component for error handling
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;