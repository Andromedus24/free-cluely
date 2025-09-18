/**
 * Enhanced API utilities with comprehensive error handling and loading states
 */

import { errorHandlingService } from '@/services/error-handling';
import { logger } from '@/lib/logger';

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string | FormData;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  showLoading?: boolean;
  showError?: boolean;
  loadingKey?: string;
  context?: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
  ok: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Enhanced fetch function with error handling and retries
export async function fetchApi<T = any>(
  endpoint: string,
  config: ApiRequestConfig = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = 30000,
    retries = 2,
    retryDelay = 1000,
    showLoading = true,
    showError = true,
    loadingKey,
    context
  } = config;

  let lastError: Error | null = null;

  // Show loading state
  if (showLoading && loadingKey) {
    try {
      const loadingEvent = new CustomEvent('atlas-loading-start', { detail: { key: loadingKey } });
      window.dispatchEvent(loadingEvent);
    } catch (err) {
      logger.warn('api-utils', 'Failed to show loading', { error: err instanceof Error ? err.message : String(err) });
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add authorization header if available
      const token = getAuthToken();
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new ApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData,
          endpoint
        );

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw error;
        }

        throw error;
      }

      const data = await response.json();

      return {
        data,
        status: response.status,
        headers: response.headers,
        ok: response.ok
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort errors or if this is the last attempt
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new TimeoutError(
          `Request to ${endpoint} timed out after ${timeout}ms`,
          timeout
        );
        lastError = timeoutError;
        break;
      }

      if (attempt === retries) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }

  // Hide loading state
  if (showLoading && loadingKey) {
    try {
      const loadingEvent = new CustomEvent('atlas-loading-stop', { detail: { key: loadingKey } });
      window.dispatchEvent(loadingEvent);
    } catch (err) {
      logger.warn('api-utils', 'Failed to hide loading', { error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Handle the final error
  if (lastError) {
    const errorId = errorHandlingService.handleError(lastError, {
      type: 'server',
      component: context || 'api',
      context: { endpoint, method, attempt: retries + 1 }
    });

    if (showError) {
      // Dispatch error event for toast notification
      const errorEvent = new CustomEvent('atlas-error', {
        detail: {
          type: 'error',
          title: 'API Error',
          message: getErrorMessage(lastError),
          errorId,
          severity: 'high'
        }
      });

      window.dispatchEvent(errorEvent);
    }

    throw lastError;
  }

  // This should never happen, but TypeScript requires it
  throw new Error('Unexpected error in fetchApi');
}

// Helper functions
function getAuthToken(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('supabase-auth-token');
    }
  } catch (err) {
    logger.warn('api-utils', 'Failed to get auth token', { error: err instanceof Error ? err.message : String(err) });
  }
  return null;
}

function getErrorMessage(error: Error): string {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your internet connection.';
  }

  if (error instanceof TimeoutError) {
    return 'Request timed out. Please try again.';
  }

  return error.message || 'An unexpected error occurred.';
}

// API hooks for React
export function useApi<T = any>() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [data, setData] = React.useState<T | null>(null);

  const request = React.useCallback(async (
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchApi<T>(endpoint, config);
      setData(response.data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = React.useCallback((endpoint: string, config: Omit<ApiRequestConfig, 'method'> = {}) => {
    return request(endpoint, { ...config, method: 'GET' });
  }, [request]);

  const post = React.useCallback((endpoint: string, body?: Record<string, unknown> | string | FormData, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) => {
    return request(endpoint, { ...config, method: 'POST', body });
  }, [request]);

  const put = React.useCallback((endpoint: string, body?: Record<string, unknown> | string | FormData, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) => {
    return request(endpoint, { ...config, method: 'PUT', body });
  }, [request]);

  const del = React.useCallback((endpoint: string, config: Omit<ApiRequestConfig, 'method'> = {}) => {
    return request(endpoint, { ...config, method: 'DELETE' });
  }, [request]);

  const patch = React.useCallback((endpoint: string, body?: Record<string, unknown> | string | FormData, config: Omit<ApiRequestConfig, 'method' | 'body'> = {}) => {
    return request(endpoint, { ...config, method: 'PATCH', body });
  }, [request]);

  return {
    data,
    loading,
    error,
    request,
    get,
    post,
    put,
    del: delete: del,
    patch,
    clearError: () => setError(null),
    clearData: () => setData(null)
  };
}

// Hook for API queries (similar to React Query but simpler)
export function useApiQuery<T = any>(
  endpoint: string,
  config: ApiRequestConfig & {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  } = {}
) {
  const { enabled = true, refetchInterval, staleTime = 0, ...requestConfig } = config;
  const { request, loading, error, data, setData } = useApi<T>();

  const [lastFetch, setLastFetch] = React.useState(0);
  const [isStale, setIsStale] = React.useState(false);

  const fetch = React.useCallback(async () => {
    if (!enabled) return;

    try {
      const response = await request(endpoint, requestConfig);
      setLastFetch(Date.now());
      setIsStale(false);
      return response;
    } catch (err) {
      // Error is already handled by useApi
      throw err;
    }
  }, [enabled, endpoint, request, requestConfig]);

  // Check if data is stale
  React.useEffect(() => {
    if (staleTime > 0 && lastFetch > 0) {
      const timer = setTimeout(() => {
        setIsStale(true);
      }, staleTime);

      return () => clearTimeout(timer);
    }
  }, [lastFetch, staleTime]);

  // Initial fetch
  React.useEffect(() => {
    if (enabled && (!data || isStale)) {
      fetch();
    }
  }, [enabled, data, isStale, fetch]);

  // Refetch interval
  React.useEffect(() => {
    if (enabled && refetchInterval) {
      const interval = setInterval(fetch, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, refetchInterval, fetch]);

  return {
    data,
    loading,
    error,
    refetch: fetch,
    isStale
  };
}

// Hook for API mutations
export function useApiMutation<T = any, V = any>(
  endpoint: string,
  config: ApiRequestConfig & {
    method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    invalidateQueries?: string[];
  } = {}
) {
  const { method = 'POST', invalidateQueries = [], ...requestConfig } = config;
  const { request, loading, error } = useApi<T>();

  const mutate = React.useCallback(async (
    variables: V,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<T> => {
    try {
      const response = await request(endpoint, {
        ...requestConfig,
        method,
        body: variables
      });

      // Invalidate related queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(query => {
          const event = new CustomEvent('atlas-invalidate-query', { detail: { query } });
          window.dispatchEvent(event);
        });
      }

      options?.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      options?.onError?.(err as Error);
      throw err;
    }
  }, [endpoint, method, requestConfig, invalidateQueries, request]);

  return {
    mutate,
    loading,
    error
  };
}