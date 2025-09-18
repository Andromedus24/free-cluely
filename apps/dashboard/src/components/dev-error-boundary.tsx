'use client';

import React, { useState } from 'react';
import { Bug, Copy, ExternalLink, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { logger } from '@/lib/logger';

interface DevErrorBoundaryProps {
  children: React.ReactNode;
  context?: string;
}

interface DevErrorInfo {
  error: Error;
  errorInfo: React.ErrorInfo;
  timestamp: string;
  componentStack: string;
  errorId: string;
}

export function DevErrorBoundary({ children, context }: DevErrorBoundaryProps) {
  const [error, setError] = useState<DevErrorInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const componentDidCatch = (error: Error, errorInfo: React.ErrorInfo) => {
    const errorId = `dev_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const devErrorInfo: DevErrorInfo = {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      componentStack: errorInfo.componentStack,
      errorId,
    };

    setError(devErrorInfo);

    logger.error('Development Error Boundary caught error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo,
      errorId,
      context,
    });
  };

  const handleReset = () => {
    setError(null);
  };

  const handleCopyError = () => {
    if (!error) return;

    const errorReport = `
Development Error Report
======================

Error ID: ${error.errorId}
Context: ${context || 'Unknown'}
Timestamp: ${error.timestamp}

Error: ${error.error.name}: ${error.error.message}

Stack Trace:
${error.error.stack}

Component Stack:
${error.componentStack}

Environment:
- Node Environment: ${process.env.NODE_ENV}
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}
- Screen Size: ${window.innerWidth}x${window.innerHeight}

Additional Context:
${context ? `Context: ${context}` : 'None provided'}
    `.trim();

    navigator.clipboard.writeText(errorReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenInNewTab = () => {
    if (!error) return;

    const errorData = {
      error: {
        name: error.error.name,
        message: error.error.message,
        stack: error.error.stack,
      },
      errorInfo: error.errorInfo,
      timestamp: error.timestamp,
      context,
    };

    const errorPage = `
<!DOCTYPE html>
<html>
<head>
    <title>Error Details - ${error.errorId}</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
        .error { color: #ff6b6b; }
        .stack { color: #ffd93d; }
        .context { color: #6bcf7f; }
        pre { background: #2d2d2d; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .header { border-bottom: 2px solid #444; padding-bottom: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Error Details</h1>
        <p><strong>Error ID:</strong> ${error.errorId}</p>
        <p><strong>Time:</strong> ${error.timestamp}</p>
        <p><strong>Context:</strong> ${context || 'Unknown'}</p>
    </div>

    <div class="error">
        <h2>Error</h2>
        <pre>${error.error.name}: ${error.error.message}</pre>
    </div>

    <div class="stack">
        <h2>Stack Trace</h2>
        <pre>${error.error.stack}</pre>
    </div>

    <div class="context">
        <h2>Component Stack</h2>
        <pre>${error.componentStack}</pre>
    </div>
</body>
</html>
    `;

    const blob = new Blob([errorPage], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden">
          <CardHeader className="bg-destructive/10 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bug className="w-6 h-6 text-destructive" />
                <div>
                  <CardTitle className="text-lg">Development Error Caught</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Error ID: <Badge variant="outline" className="font-mono text-xs">{error.errorId}</Badge>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
                <Button size="sm" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="max-h-[60vh] overflow-y-auto">
              {/* Error Summary */}
              <div className="p-6 border-b">
                <div className="grid gap-4">
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Error Details</h3>
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="font-mono text-sm">
                        <span className="text-destructive">{error.error.name}:</span> {error.error.message}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm mb-2">Context</h3>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm">{context || 'No context provided'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Time: {new Date(error.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyError}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      {copied ? 'Copied!' : 'Copy Error'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenInNewTab}
                      className="flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              </div>

              {/* Expandable Details */}
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-4 h-auto">
                    <span className="font-semibold text-sm">Technical Details</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 p-4 border-t">
                  {/* Stack Trace */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Stack Trace</h4>
                    <Textarea
                      value={error.error.stack || 'No stack trace available'}
                      readOnly
                      className="min-h-[200px] font-mono text-xs"
                    />
                  </div>

                  {/* Component Stack */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Component Stack</h4>
                    <Textarea
                      value={error.componentStack}
                      readOnly
                      className="min-h-[150px] font-mono text-xs"
                    />
                  </div>

                  {/* Environment Info */}
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Environment</h4>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Node Environment:</span>
                          <span className="ml-2">{process.env.NODE_ENV}</span>
                        </div>
                        <div>
                          <span className="font-medium">Screen Size:</span>
                          <span className="ml-2">{window.innerWidth}x{window.innerHeight}</span>
                        </div>
                        <div>
                          <span className="font-medium">User Agent:</span>
                          <span className="ml-2 text-xs">{navigator.userAgent.split(' ')[0]}</span>
                        </div>
                        <div>
                          <span className="font-medium">URL:</span>
                          <span className="ml-2 text-xs truncate block">{window.location.href}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook for development error handling
export function useDevErrorBoundary() {
  const reportError = (error: Error, context?: string) => {
    logger.error('Manual error report', { error, context });

    // In development, you might want to show the error boundary
    if (process.env.NODE_ENV === 'development') {
      // This would typically involve setting state to show the error boundary
      console.error('Development Error:', error, { context });
    }
  };

  const reportWarning = (message: string, context?: string) => {
    logger.warn('Development warning', { message, context });

    if (process.env.NODE_ENV === 'development') {
      console.warn('Development Warning:', message, { context });
    }
  };

  return { reportError, reportWarning };
}

// Component for development-only error testing
export function DevErrorTester() {
  const { reportError, reportWarning } = useDevErrorBoundary();

  const handleTestError = () => {
    reportError(new Error('This is a test error'), 'DevErrorTester');
  };

  const handleTestAsyncError = async () => {
    try {
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('This is a test async error')), 100);
      });
    } catch (error) {
      reportError(error as Error, 'DevErrorTester-Async');
    }
  };

  const handleTestWarning = () => {
    reportWarning('This is a test warning', 'DevErrorTester');
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm">Development Error Testing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button size="sm" variant="outline" onClick={handleTestError} className="w-full">
          Test Sync Error
        </Button>
        <Button size="sm" variant="outline" onClick={handleTestAsyncError} className="w-full">
          Test Async Error
        </Button>
        <Button size="sm" variant="outline" onClick={handleTestWarning} className="w-full">
          Test Warning
        </Button>
      </CardContent>
    </Card>
  );
}

export default DevErrorBoundary;