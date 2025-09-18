'use client';

import React from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Loading spinner component
export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

export function LoadingSpinner({
  size = 'md',
  className = '',
  variant = 'default'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const variantClasses = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary'
  };

  return (
    <Loader2
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
}

// Loading button component
export interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  loadingText?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function LoadingButton({
  isLoading,
  children,
  disabled,
  loadingText,
  variant = 'default',
  size = 'default',
  className = '',
  onClick,
  type = 'button'
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      className={cn('relative', className)}
      onClick={onClick}
      type={type}
    >
      {isLoading && (
        <LoadingSpinner
          size="sm"
          className="mr-2"
        />
      )}
      {isLoading ? loadingText || 'Loading...' : children}
    </Button>
  );
}

// Loading card component
export interface LoadingCardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  lines?: number;
}

export function LoadingCard({
  title,
  subtitle,
  className = '',
  lines = 3
}: LoadingCardProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {title && (
            <div className="h-6 bg-muted rounded animate-pulse w-3/4" />
          )}
          {subtitle && (
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          )}
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-4 bg-muted rounded animate-pulse',
                i === lines - 1 ? 'w-5/6' : 'w-full'
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton component
export interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
  animate?: boolean;
}

export function LoadingSkeleton({
  lines = 1,
  className = '',
  animate = true
}: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-muted rounded',
            animate && 'animate-pulse',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// Loading overlay component
export interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  children,
  className = ''
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" variant="primary" />
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Page loading component
export interface PageLoadingProps {
  message?: string;
  className?: string;
}

export function PageLoading({
  message = 'Loading page...',
  className = ''
}: PageLoadingProps) {
  return (
    <div className={cn('min-h-screen flex items-center justify-center', className)}>
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="xl" variant="primary" />
        <p className="text-lg text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Content loading component
export interface ContentLoadingProps {
  isLoading: boolean;
  error?: Error | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}

export function ContentLoading({
  isLoading,
  error,
  isEmpty = false,
  emptyMessage = 'No data available',
  errorMessage = 'Failed to load content',
  onRetry,
  children,
  loadingComponent,
  emptyComponent,
  errorComponent
}: ContentLoadingProps) {
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (error) {
    return (
      errorComponent || (
        <div className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium mb-2">{errorMessage}</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      )
    );
  }

  if (isEmpty) {
    return (
      emptyComponent || (
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-lg text-muted-foreground">{emptyMessage}</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}

// Loading provider context
interface LoadingContextType {
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  isLoading: (key: string) => boolean;
  getActiveLoadings: () => string[];
}

const LoadingContext = React.createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingStates, setLoadingStates] = React.useState<Set<string>>(new Set());

  const startLoading = React.useCallback((key: string) => {
    setLoadingStates(prev => new Set(prev).add(key));
  }, []);

  const stopLoading = React.useCallback((key: string) => {
    setLoadingStates(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  const isLoading = React.useCallback((key: string) => {
    return loadingStates.has(key);
  }, [loadingStates]);

  const getActiveLoadings = React.useCallback(() => {
    return Array.from(loadingStates);
  }, [loadingStates]);

  return (
    <LoadingContext.Provider value={{
      startLoading,
      stopLoading,
      isLoading,
      getActiveLoadings
    }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = React.useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Hook for managing loading states
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: {
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
    loadingKey?: string;
  } = {}
) {
  const { startLoading, stopLoading } = useLoading();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [data, setData] = React.useState<T | null>(null);

  const execute = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (options.loadingKey) {
        startLoading(options.loadingKey);
      }

      const result = await operation();
      setData(result);

      if (options.onSuccess) {
        options.onSuccess(result);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      if (options.onError) {
        options.onError(error);
      }

      throw error;
    } finally {
      setLoading(false);

      if (options.loadingKey) {
        stopLoading(options.loadingKey);
      }
    }
  }, [operation, options, startLoading, stopLoading]);

  return {
    execute,
    loading,
    error,
    data,
    reset: () => {
      setLoading(false);
      setError(null);
      setData(null);
    }
  };
}