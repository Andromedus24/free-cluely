import { ProviderAdapter, ProviderConfig, TestConnectionRequest, TestConnectionResponse, CancellationToken, RetryConfig } from '../types/provider';
import { ModerationService } from '../moderation/ModerationService';

export abstract class BaseAdapter implements ProviderAdapter {
  abstract readonly provider: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: string[];

  protected config!: ProviderConfig;
  protected moderationService: ModerationService;
  protected defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN']
  };

  // Abstract methods that must be implemented by concrete adapters
  abstract chat(request: any, cancellationToken?: CancellationToken): Promise<any>;
  abstract streamChat(
    request: any,
    onChunk: (chunk: string) => void,
    cancellationToken?: CancellationToken
  ): Promise<any>;
  abstract visionAnalyze(request: any, cancellationToken?: CancellationToken): Promise<any>;
  abstract imageGenerate(request: any, cancellationToken?: CancellationToken): Promise<any>;
  abstract listModels(config?: ProviderConfig): Promise<any>;
  abstract testConnection(config: TestConnectionRequest): Promise<TestConnectionResponse>;
  abstract validateConfig(config: ProviderConfig): { valid: boolean; errors: string[] };
  abstract getDefaultConfig(): Partial<ProviderConfig>;

  // Default implementations
  supportsCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  async getAvailableModels(): Promise<any[]> {
    return this.listModels(this.config);
  }

  // Utility methods
  protected createCancellationToken(): CancellationToken {
    let cancelled = false;
    const callbacks: (() => void)[] = [];

    return {
      get isCancelled() { return cancelled; },
      cancel() {
        if (!cancelled) {
          cancelled = true;
          callbacks.forEach(cb => cb());
        }
      },
      onCancelled(callback: () => void) {
        callbacks.push(callback);
      }
    };
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.defaultRetryConfig,
    cancellationToken?: CancellationToken
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      if (cancellationToken?.isCancelled) {
        throw new Error('Operation cancelled');
      }

      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        const isRetryable = config.retryableErrors.some(errCode =>
          error.message.includes(errCode) || error.name?.includes(errCode)
        );

        if (attempt === config.maxAttempts || !isRetryable) {
          throw error;
        }

        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateRequiredFields(config: ProviderConfig, required: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of required) {
      if (!config[field as keyof ProviderConfig]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  protected async preprocessRequest(request: any): Promise<any> {
    // Apply moderation checks before sending request
    if (this.moderationService) {
      if (request.messages) {
        // Chat request
        const moderationResult = await this.moderationService.moderateChatRequest(request);
        if (!moderationResult.allowed) {
          throw new Error(`Request blocked by moderation: ${moderationResult.result?.reason}`);
        }
        return moderationResult.redactedRequest || request;
      } else if (request.prompt) {
        // Vision request
        const moderationResult = await this.moderationService.moderateVisionRequest(request);
        if (!moderationResult.allowed) {
          throw new Error(`Request blocked by moderation: ${moderationResult.result?.reason}`);
        }
        return moderationResult.redactedRequest || request;
      }
    }
    return request;
  }

  protected async postprocessResponse(response: any): Promise<any> {
    // Override in subclasses to add response postprocessing
    return response;
  }

  protected handleError(error: Error, context?: string): void {
    console.error(`[${this.provider}] Error${context ? ` in ${context}` : ''}:`, error);
  }

  // Configuration methods
  updateConfig(config: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...config };
    // Initialize moderation service if not already initialized
    if (!this.moderationService) {
      this.moderationService = new ModerationService();
    }
  }

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  // HTTP utility methods
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    config: { timeout?: number; retries?: RetryConfig } = {}
  ): Promise<Response> {
    const { timeout = 30000, retries } = config;

    return this.withRetry(
      () => this.fetchWithTimeout(url, options, timeout),
      retries || this.defaultRetryConfig
    );
  }

  // Headers utility
  protected getDefaultHeaders(additional: Record<string, string> = {}): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': `Atlas/${this.name}/${this.version}`,
      ...additional
    };
  }

  // Response handling
  protected async handleResponse(response: Response): Promise<any> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  // Validation helpers
  protected validateApiKey(apiKey: string, pattern?: RegExp): { valid: boolean; error?: string } {
    if (!apiKey || apiKey.trim() === '') {
      return { valid: false, error: 'API key is required' };
    }

    if (pattern && !pattern.test(apiKey)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    return { valid: true };
  }

  protected validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  // Rate limiting helpers
  protected createRateLimiter(requestsPerMinute: number) {
    const requests: number[] = [];
    const interval = 60 * 1000; // 1 minute

    return async function(): Promise<void> {
      const now = Date.now();
      const oneMinuteAgo = now - interval;

      // Remove old requests
      while (requests.length > 0 && requests[0] < oneMinuteAgo) {
        requests.shift();
      }

      // Check if we've exceeded the rate limit
      if (requests.length >= requestsPerMinute) {
        const nextAvailableTime = requests[0] + interval;
        const delay = nextAvailableTime - now;
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      requests.push(now);
    };
  }

  // Content moderation helpers
  protected async moderateContent(content: string): Promise<{ allowed: boolean; reason?: string }> {
    // Basic content moderation - can be overridden in subclasses
    const flaggedPatterns = [
      /password/i,
      /secret/i,
      /api[_\s]?key/i,
      /token/i,
      /credit[_\s]?card/i,
      /ssn/i,
      /social[_\s]?security/i
    ];

    for (const pattern of flaggedPatterns) {
      if (pattern.test(content)) {
        return {
          allowed: false,
          reason: `Content contains potentially sensitive information: ${pattern.source}`
        };
      }
    }

    return { allowed: true };
  }

  // Utility for processing image data
  protected async processImageData(image: string | Buffer): Promise<{ format: string; data: string }> {
    let data: string;
    let format = 'unknown';

    if (Buffer.isBuffer(image)) {
      data = image.toString('base64');
      // Simple format detection based on buffer headers
      if (image.toString('hex', 0, 4) === '89504e47') format = 'png';
      else if (image.toString('hex', 0, 4) === 'ffd8ffe0') format = 'jpeg';
      else if (image.toString('hex', 0, 4) === '52494646') format = 'webp';
    } else if (typeof image === 'string') {
      if (image.startsWith('data:')) {
        const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          format = match[1].split('/')[1];
          data = match[2];
        } else {
          throw new Error('Invalid data URL format');
        }
      } else {
        // Assume base64 string
        data = image;
        format = 'base64';
      }
    } else {
      throw new Error('Invalid image data type');
    }

    return { format, data };
  }

  // Logging helper
  protected log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.provider.toUpperCase()}] [${level.toUpperCase()}] ${message}`;

    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}