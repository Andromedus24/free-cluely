'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast-system';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log error to console
    console.error('Error Boundary caught an error:', {
      error,
      errorInfo,
      context: this.props.context,
      errorId: this.state.errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Show toast notification
    try {
      const { showError } = useToast();
      showError(
        'Application Error',
        `An error occurred in ${this.props.context || 'the application'}. Please refresh or try again.`,
        {
          persistent: false,
          actions: [
            {
              label: 'Report Issue',
              onClick: () => this.reportError(error, errorInfo),
              variant: 'outline'
            }
          ]
        }
      );
    } catch (toastError) {
      console.error('Failed to show error toast:', toastError);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, this would send error details to your error tracking service
    const errorReport = {
      id: this.state.errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('Error Report:', errorReport);

    // Show user feedback
    try {
      const { showSuccess } = useToast();
      showSuccess('Error Reported', 'Thank you for helping us improve the application.');
    } catch (toastError) {
      console.error('Failed to show success toast:', toastError);
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                <span>Something went wrong</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Error ID:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {this.state.errorId}
                  </Badge>
                </div>

                {this.props.context && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Context:</span>
                    <Badge variant="secondary">{this.props.context}</Badge>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-sm font-medium">Error Message:</span>
                  <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                    <code className="text-sm text-destructive break-all">
                      {this.state.error?.message || 'Unknown error occurred'}
                    </code>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </Button>

                <Button
                  onClick={this.handleReload}
                  variant="default"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reload Page</span>
                </Button>

                <Button
                  onClick={this.handleGoHome}
                  variant="ghost"
                  className="flex items-center space-x-2"
                >
                  <Home className="h-4 w-4" />
                  <span>Go Home</span>
                </Button>
              </div>

              {/* Report Error */}
              <div className="pt-4 border-t">
                <Button
                  onClick={() => this.reportError(this.state.error!, this.state.errorInfo!)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Report This Error
                </Button>
              </div>

              {/* Developer Info */}
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <div className="pt-4 border-t">
                  <details className="space-y-2">
                    <summary className="text-sm font-medium cursor-pointer">
                      Developer Information
                    </summary>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Component Stack:</span>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                      {this.state.error?.stack && (
                        <div>
                          <span className="text-sm font-medium">Error Stack:</span>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook-based error boundary for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<ErrorInfo | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
    setErrorInfo(null);
  }, []);

  const captureError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    setError(error);
    setErrorInfo(errorInfo || null);

    console.error('Error captured by hook:', {
      error,
      errorInfo
    });
  }, []);

  return {
    error,
    errorInfo,
    resetError,
    captureError
  };
}