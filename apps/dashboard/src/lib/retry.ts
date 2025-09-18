/**
 * Retry Mechanism Utility
 * Provides configurable retry logic for failed operations with exponential backoff
 */

import { logger } from '@/lib/logger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any, delay: number) => void;
  onFailed?: (error: any, attempts: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
  totalDelay: number;
}

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: true,
      ...config,
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const mergedConfig = { ...this.config, ...config };
    let lastError: any;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= mergedConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        logger.info('Retry operation succeeded', {
          attempt,
          totalDelay,
          operation: operation.name || 'anonymous',
        });

        return {
          success: true,
          data: result,
          attempts: attempt,
          totalDelay,
        };
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (!this.shouldRetry(error, mergedConfig, attempt)) {
          logger.warn('Retry operation failed - no more retries', {
            error,
            attempt,
            maxAttempts: mergedConfig.maxAttempts,
          });

          if (mergedConfig.onFailed) {
            mergedConfig.onFailed(error, attempt);
          }

          return {
            success: false,
            error,
            attempts: attempt,
            totalDelay,
          };
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, mergedConfig);
        totalDelay += delay;

        logger.warn('Retry operation failed - retrying', {
          error,
          attempt,
          maxAttempts: mergedConfig.maxAttempts,
          delay,
          totalDelay,
        });

        if (mergedConfig.onRetry) {
          mergedConfig.onRetry(attempt, error, delay);
        }

        // Wait before retry
        await this.delay(delay);
      }
    }

    // This should never be reached due to the loop logic
    return {
      success: false,
      error: lastError,
      attempts: this.config.maxAttempts,
      totalDelay,
    };
  }

  private shouldRetry(error: any, config: RetryConfig, attempt: number): boolean {
    // Check if we've exceeded max attempts
    if (attempt >= config.maxAttempts) {
      return false;
    }

    // Use custom retry condition if provided
    if (config.retryCondition) {
      return config.retryCondition(error);
    }

    // Default retry conditions
    return this.isRetryableError(error);
  }

  private isRetryableError(error: any): boolean {
    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // HTTP status codes that should be retried
    if (error.status) {
      const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
      return retryableStatusCodes.includes(error.status);
    }

    // Timeouts
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // Rate limiting
    if (error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
      return true;
    }

    // Database connection errors
    if (error.code?.startsWith('ECONN') || error.message?.includes('connection')) {
      return true;
    }

    return false;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    const delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitter = delay * 0.1; // 10% jitter
      return delay + Math.random() * jitter;
    }

    return delay;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods for common retry scenarios
  async withNetworkRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const networkConfig: Partial<RetryConfig> = {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      retryCondition: (error) => {
        return error instanceof TypeError ||
               error.status >= 500 ||
               error.code === 'ECONNABORTED' ||
               error.code === 'ETIMEDOUT';
      },
      ...config,
    };

    return this.execute(operation, networkConfig);
  }

  async withDatabaseRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const dbConfig: Partial<RetryConfig> = {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 5000,
      retryCondition: (error) => {
        return error.code?.startsWith('ECONN') ||
               error.message?.includes('connection') ||
               error.message?.includes('timeout') ||
               error.code === 'ECONNRESET';
      },
      ...config,
    };

    return this.execute(operation, dbConfig);
  }

  async withRateLimitRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const rateLimitConfig: Partial<RetryConfig> = {
      maxAttempts: 5,
      baseDelay: 5000,
      maxDelay: 60000,
      retryCondition: (error) => {
        return error.status === 429 ||
               error.message?.includes('rate limit') ||
               error.message?.includes('too many requests');
      },
      ...config,
    };

    return this.execute(operation, rateLimitConfig);
  }
}

// Hook for retry functionality
export function useRetry() {
  const retryManager = new RetryManager();

  const retry = async <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> => {
    const result = await retryManager.execute(operation, config);

    if (!result.success) {
      throw result.error;
    }

    return result.data!;
  };

  const retryWithFallback = async <T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> => {
    const result = await retryManager.execute(operation, config);

    if (result.success) {
      return result.data!;
    }

    logger.info('Operation failed, using fallback', { error: result.error });
    return fallback();
  };

  return { retry, retryWithFallback, retryManager };
}

// Decorator for retry functionality
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  config?: Partial<RetryConfig>
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any[]) {
      const retryManager = new RetryManager(config);
      const result = await retryManager.execute(() => originalMethod.apply(this, args), config);

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    } as any;

    return descriptor;
  };
}

// Async function wrapper with retry
export function createRetryableFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: Partial<RetryConfig>
): T {
  const retryManager = new RetryManager(config);

  return (async (...args: any[]) => {
    const result = await retryManager.execute(() => fn(...args), config);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }) as T;
}

// Default instance
export const retryManager = new RetryManager();

export default RetryManager;