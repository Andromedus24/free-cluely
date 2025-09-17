import { Plugin, PluginBus, ConfigManager, Logger, PluginError, LLMRequest, LLMResponse, CancellationToken } from '@free-cluely/shared';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Ollama } from 'ollama';
import { EventEmitter } from 'eventemitter3';

interface LLMPluginConfig {
  defaultProvider: 'gemini' | 'ollama';
  gemini: {
    apiKey?: string;
    model: string;
    baseUrl?: string;
  };
  ollama: {
    host: string;
    model: string;
    timeout: number;
  };
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  retryAttempts: number;
  streaming: boolean;
}

interface Provider {
  name: string;
  isAvailable: boolean;
  generateCompletion(request: LLMRequest, cancellationToken?: CancellationToken): Promise<LLMResponse>;
  generateStreamingCompletion(request: LLMRequest, cancellationToken?: CancellationToken): AsyncIterable<LLMResponse>;
}

class GeminiProvider implements Provider {
  name = 'gemini';
  isAvailable = false;
  private genAI: GoogleGenerativeAI;
  private model: string;
  private logger: Logger;

  constructor(apiKey: string, model: string, logger: Logger) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
    this.logger = logger;
    this.isAvailable = true;
  }

  async generateCompletion(request: LLMRequest, cancellationToken?: CancellationToken): Promise<LLMResponse> {
    try {
      cancellationToken?.throwIfCancelled();

      const model = this.genAI.getGenerativeModel({ model: this.model });

      const geminiMessages = request.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const result = await model.generateContent(geminiMessages);
      const response = await result.response;
      const text = response.text();

      return {
        content: text,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        },
        timestamp: Date.now()
      };

    } catch (error) {
      if (error instanceof Error && error.message === 'CANCELLED') {
        throw new PluginError('CANCELLED', 'Generation was cancelled');
      }
      throw new PluginError('GEMINI_GENERATION_FAILED', `Gemini generation failed: ${error.message}`);
    }
  }

  async *generateStreamingCompletion(request: LLMRequest, cancellationToken?: CancellationToken): AsyncIterable<LLMResponse> {
    try {
      cancellationToken?.throwIfCancelled();

      const model = this.genAI.getGenerativeModel({ model: this.model });

      const geminiMessages = request.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const result = await model.generateContentStream(geminiMessages);

      for await (const chunk of result.stream) {
        cancellationToken?.throwIfCancelled();

        const chunkText = chunk.text();
        if (chunkText) {
          yield {
            content: chunkText,
            timestamp: Date.now()
          };
        }
      }

    } catch (error) {
      if (error instanceof Error && error.message === 'CANCELLED') {
        throw new PluginError('CANCELLED', 'Generation was cancelled');
      }
      throw new PluginError('GEMINI_STREAMING_FAILED', `Gemini streaming failed: ${error.message}`);
    }
  }
}

class OllamaProvider implements Provider {
  name = 'ollama';
  isAvailable = false;
  private ollama: Ollama;
  private model: string;
  private timeout: number;
  private logger: Logger;

  constructor(host: string, model: string, timeout: number, logger: Logger) {
    this.ollama = new Ollama({ host });
    this.model = model;
    this.timeout = timeout;
    this.logger = logger;
    this.isAvailable = true;
  }

  async generateCompletion(request: LLMRequest, cancellationToken?: CancellationToken): Promise<LLMResponse> {
    try {
      cancellationToken?.throwIfCancelled();

      const response = await this.ollama.chat({
        model: this.model,
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens
        }
      });

      return {
        content: response.message.content,
        usage: {
          promptTokens: response.prompt_eval_count || 0,
          completionTokens: response.eval_count || 0,
          totalTokens: (response.prompt_eval_count || 0) + (response.eval_count || 0)
        },
        timestamp: Date.now()
      };

    } catch (error) {
      if (error instanceof Error && error.message === 'CANCELLED') {
        throw new PluginError('CANCELLED', 'Generation was cancelled');
      }
      throw new PluginError('OLLAMA_GENERATION_FAILED', `Ollama generation failed: ${error.message}`);
    }
  }

  async *generateStreamingCompletion(request: LLMRequest, cancellationToken?: CancellationToken): AsyncIterable<LLMResponse> {
    try {
      cancellationToken?.throwIfCancelled();

      const response = await this.ollama.chat({
        model: this.model,
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens
        },
        stream: true
      });

      for await (const chunk of response) {
        cancellationToken?.throwIfCancelled();

        if (chunk.message && chunk.message.content) {
          yield {
            content: chunk.message.content,
            timestamp: Date.now()
          };
        }
      }

    } catch (error) {
      if (error instanceof Error && error.message === 'CANCELLED') {
        throw new PluginError('CANCELLED', 'Generation was cancelled');
      }
      throw new PluginError('OLLAMA_STREAMING_FAILED', `Ollama streaming failed: ${error.message}`);
    }
  }
}

export class LLMPlugin implements Plugin {
  name = 'llm-plugin';
  version = '1.0.0';
  permissions = ['network'];

  private config: LLMPluginConfig;
  private logger: Logger;
  private bus: PluginBus;
  private providers: Map<string, Provider> = new Map();
  private eventEmitter = new EventEmitter();
  private isInitialized = false;

  constructor(config: Partial<LLMPluginConfig> = {}) {
    this.config = {
      defaultProvider: 'gemini',
      gemini: {
        model: 'gemini-pro',
        baseUrl: undefined
      },
      ollama: {
        host: 'http://localhost:11434',
        model: 'llama3.2',
        timeout: 30000
      },
      maxTokens: 2048,
      temperature: 0.7,
      timeoutMs: 30000,
      retryAttempts: 3,
      streaming: true,
      ...config
    };
  }

  async initialize(bus: PluginBus, configManager: ConfigManager, logger: Logger): Promise<void> {
    this.bus = bus;
    this.logger = logger;

    try {
      // Load configuration
      const pluginConfig = configManager.get('llm') as LLMPluginConfig;
      if (pluginConfig) {
        this.config = { ...this.config, ...pluginConfig };
      }

      // Initialize providers
      await this.initializeProviders();

      // Register plugin methods
      this.registerPluginMethods();

      this.isInitialized = true;
      this.logger.info('LLMPlugin initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize LLMPlugin:', error);
      throw new PluginError('INITIALIZATION_FAILED', 'Failed to initialize LLM plugin');
    }
  }

  private async initializeProviders(): Promise<void> {
    // Initialize Gemini provider
    if (this.config.gemini.apiKey) {
      try {
        const geminiProvider = new GeminiProvider(
          this.config.gemini.apiKey,
          this.config.gemini.model,
          this.logger
        );
        this.providers.set('gemini', geminiProvider);
        this.logger.info('Gemini provider initialized');
      } catch (error) {
        this.logger.error('Failed to initialize Gemini provider:', error);
      }
    } else {
      this.logger.warn('Gemini API key not provided. Gemini provider will not be available.');
    }

    // Initialize Ollama provider
    try {
      const ollamaProvider = new OllamaProvider(
        this.config.ollama.host,
        this.config.ollama.model,
        this.config.ollama.timeout,
        this.logger
      );
      this.providers.set('ollama', ollamaProvider);
      this.logger.info('Ollama provider initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Ollama provider:', error);
    }

    // Set default provider
    if (!this.providers.has(this.config.defaultProvider)) {
      const availableProviders = Array.from(this.providers.keys());
      if (availableProviders.length > 0) {
        this.config.defaultProvider = availableProviders[0] as 'gemini' | 'ollama';
        this.logger.warn(`Default provider not available, using ${this.config.defaultProvider}`);
      } else {
        throw new PluginError('NO_PROVIDERS_AVAILABLE', 'No LLM providers available');
      }
    }
  }

  private registerPluginMethods(): void {
    // Register IPC handlers
    this.bus.on('llm:generateCompletion', async (data: LLMRequest) => {
      try {
        const result = await this.generateCompletion(data);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Failed to generate completion:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('llm:generateStreamingCompletion', async (data: LLMRequest) => {
      try {
        const stream = this.generateStreamingCompletion(data);
        return { success: true, data: { stream: true } };
      } catch (error) {
        this.logger.error('Failed to generate streaming completion:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('llm:getProviders', async () => {
      const providers = Array.from(this.providers.entries()).map(([name, provider]) => ({
        name,
        isAvailable: provider.isAvailable
      }));
      return { success: true, data: { providers, default: this.config.defaultProvider } };
    });

    this.bus.on('llm:setProvider', async (data: { provider: string }) => {
      try {
        await this.setProvider(data.provider);
        return { success: true };
      } catch (error) {
        this.logger.error('Failed to set provider:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('llm:getConfig', async () => {
      return { success: true, data: this.getConfig() };
    });

    this.bus.on('llm:setConfig', async (data: Partial<LLMPluginConfig>) => {
      try {
        await this.setConfig(data);
        return { success: true };
      } catch (error) {
        this.logger.error('Failed to set config:', error);
        return { success: false, error: error.message };
      }
    });

    // Register for screenshot pipeline events
    this.bus.on('screenshot:analyzed', async (data: { screenshotId: string; analysis: any }) => {
      await this.handleScreenshotAnalysis(data);
    });
  }

  async generateCompletion(request: LLMRequest, cancellationToken?: CancellationToken): Promise<LLMResponse> {
    if (!this.isInitialized) {
      throw new PluginError('NOT_INITIALIZED', 'LLM plugin not initialized');
    }

    const provider = this.providers.get(this.config.defaultProvider);
    if (!provider || !provider.isAvailable) {
      throw new PluginError('PROVIDER_NOT_AVAILABLE', `Provider ${this.config.defaultProvider} not available`);
    }

    // Apply default values
    const enhancedRequest: LLMRequest = {
      messages: request.messages,
      temperature: request.temperature ?? this.config.temperature,
      maxTokens: request.maxTokens ?? this.config.maxTokens,
      stream: false
    };

    try {
      const result = await this.withRetry(
        () => provider.generateCompletion(enhancedRequest, cancellationToken),
        this.config.retryAttempts
      );

      this.eventEmitter.emit('completion', { request: enhancedRequest, response: result });
      return result;

    } catch (error) {
      this.logger.error('Failed to generate completion:', error);
      throw error;
    }
  }

  async *generateStreamingCompletion(request: LLMRequest, cancellationToken?: CancellationToken): AsyncIterable<LLMResponse> {
    if (!this.isInitialized) {
      throw new PluginError('NOT_INITIALIZED', 'LLM plugin not initialized');
    }

    const provider = this.providers.get(this.config.defaultProvider);
    if (!provider || !provider.isAvailable) {
      throw new PluginError('PROVIDER_NOT_AVAILABLE', `Provider ${this.config.defaultProvider} not available`);
    }

    // Apply default values
    const enhancedRequest: LLMRequest = {
      messages: request.messages,
      temperature: request.temperature ?? this.config.temperature,
      maxTokens: request.maxTokens ?? this.config.maxTokens,
      stream: true
    };

    try {
      const stream = this.withRetry(
        () => provider.generateStreamingCompletion(enhancedRequest, cancellationToken),
        this.config.retryAttempts
      );

      for await (const chunk of stream) {
        this.eventEmitter.emit('streamingChunk', { request: enhancedRequest, chunk });
        yield chunk;
      }

      this.eventEmitter.emit('streamingComplete', { request: enhancedRequest });

    } catch (error) {
      this.logger.error('Failed to generate streaming completion:', error);
      throw error;
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, maxAttempts: number): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`LLM operation attempt ${attempt} failed:`, error);

        if (attempt < maxAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  async setProvider(provider: string): Promise<void> {
    if (!this.providers.has(provider)) {
      throw new PluginError('INVALID_PROVIDER', `Provider ${provider} not available`);
    }

    this.config.defaultProvider = provider as 'gemini' | 'ollama';
    this.logger.info(`LLM provider set to ${provider}`);
    this.eventEmitter.emit('providerChanged', { provider });
  }

  async setConfig(config: Partial<LLMPluginConfig>): Promise<void> {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Reinitialize providers if needed
    if (
      config.gemini?.apiKey !== oldConfig.gemini.apiKey ||
      config.gemini?.model !== oldConfig.gemini.model ||
      config.ollama?.host !== oldConfig.ollama.host ||
      config.ollama?.model !== oldConfig.ollama.model
    ) {
      await this.initializeProviders();
    }

    this.logger.info('LLM configuration updated');
    this.eventEmitter.emit('configChanged', { config: this.config });
  }

  getConfig(): LLMPluginConfig {
    return { ...this.config };
  }

  getProviders(): Array<{ name: string; isAvailable: boolean }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      isAvailable: provider.isAvailable
    }));
  }

  private async handleScreenshotAnalysis(data: { screenshotId: string; analysis: any }): Promise<void> {
    try {
      // Handle screenshot analysis results
      this.logger.info('Processing screenshot analysis:', data.screenshotId);

      // Create a contextual prompt based on the analysis
      const prompt = `I've analyzed a screenshot and found the following:\n\n${JSON.stringify(data.analysis, null, 2)}\n\nPlease provide a helpful response based on this analysis.`;

      const request: LLMRequest = {
        messages: [
          {
            role: 'user',
            content: prompt,
            timestamp: Date.now()
          }
        ],
        temperature: 0.7
      };

      const response = await this.generateCompletion(request);
      this.logger.info('Generated response for screenshot analysis');

      // Emit the response for other plugins to handle
      this.bus.emit('llm:screenshotResponse', {
        screenshotId: data.screenshotId,
        response
      });

    } catch (error) {
      this.logger.error('Failed to handle screenshot analysis:', error);
    }
  }

  on(event: string, listener: Function): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: Function): void {
    this.eventEmitter.off(event, listener);
  }

  async destroy(): Promise<void> {
    this.logger.info('Destroying LLMPlugin');

    // Clean up providers
    this.providers.clear();

    // Remove all event listeners
    this.eventEmitter.removeAllListeners();

    this.isInitialized = false;
    this.logger.info('LLMPlugin destroyed');
  }
}