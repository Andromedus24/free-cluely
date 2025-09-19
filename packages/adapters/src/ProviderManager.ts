import {
  ProviderAdapter,
  OpenAIAdapter,
  AnthropicAdapter,
  GeminiAdapter,
  OllamaAdapter,
  ProviderInfo,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  VisionRequest,
  VisionResponse,
  ImageGenerateRequest,
  ImageGenerateResponse,
  ProviderError,
  ModerationService,
  createModeratedAdapter
} from '@free-cluely/shared';

export interface ProviderConfig {
  type: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  apiKey?: string;
  host?: string;
  baseURL?: string;
  organization?: string;
  enabled: boolean;
  name: string;
  priority: number;
  timeout?: number;
  maxRetries?: number;
}

export interface ProviderManagerConfig {
  providers: ProviderConfig[];
  moderation: {
    enabled: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    block_harmful_content: boolean;
    block_pii: boolean;
    block_sensitive_info: boolean;
  };
  defaultProvider: string;
  failoverEnabled: boolean;
  retryAttempts: number;
}

export class ProviderManager {
  private adapters: Map<string, ProviderAdapter> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();
  private moderationService: ModerationService;
  private config: ProviderManagerConfig;

  constructor(config: ProviderManagerConfig) {
    this.config = config;
    this.moderationService = new ModerationService(config.moderation);
    this.initializeProviders();
  }

  private initializeProviders(): void {
    for (const providerConfig of this.config.providers) {
      if (!providerConfig.enabled) continue;

      try {
        const adapter = this.createAdapter(providerConfig);
        const moderatedAdapter = this.config.moderation.enabled
          ? createModeratedAdapter(adapter, this.moderationService)
          : adapter;

        this.adapters.set(providerConfig.name, moderatedAdapter);
        this.configs.set(providerConfig.name, providerConfig);
      } catch (error) {
        console.error(`Failed to initialize provider ${providerConfig.name}:`, error);
      }
    }
  }

  private createAdapter(config: ProviderConfig): ProviderAdapter {
    switch (config.type) {
      case 'openai':
        if (!config.apiKey) {
          throw new Error('OpenAI adapter requires apiKey');
        }
        return new OpenAIAdapter({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          organization: config.organization,
          timeout: config.timeout,
          maxRetries: config.maxRetries
        });

      case 'anthropic':
        if (!config.apiKey) {
          throw new Error('Anthropic adapter requires apiKey');
        }
        return new AnthropicAdapter({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          timeout: config.timeout,
          maxRetries: config.maxRetries
        });

      case 'gemini':
        if (!config.apiKey) {
          throw new Error('Gemini adapter requires apiKey');
        }
        return new GeminiAdapter({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
          timeout: config.timeout,
          maxRetries: config.maxRetries
        });

      case 'ollama':
        return new OllamaAdapter({
          host: config.host,
          timeout: config.timeout,
          maxRetries: config.maxRetries
        });

      default:
        throw new Error(`Unknown provider type: ${config.type}`);
    }
  }

  async chat(request: ChatRequest, providerName?: string): Promise<ChatResponse> {
    const adapter = this.getAdapter(providerName);
    return adapter.chat(request);
  }

  async *streamChat(request: ChatRequest, providerName?: string): AsyncIterable<ChatStreamChunk> {
    const adapter = this.getAdapter(providerName);
    yield* adapter.streamChat(request);
  }

  async visionAnalyze(request: VisionRequest, providerName?: string): Promise<VisionResponse> {
    const adapter = this.getAdapter(providerName);
    return adapter.visionAnalyze(request);
  }

  async imageGenerate(request: ImageGenerateRequest, providerName?: string): Promise<ImageGenerateResponse> {
    const adapter = this.getAdapter(providerName);
    return adapter.imageGenerate(request);
  }

  async testConnection(providerName?: string): Promise<boolean> {
    const adapter = this.getAdapter(providerName);
    return adapter.testConnection();
  }

  async testAllConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.testConnection();
      } catch (error) {
        results[name] = false;
      }
    }

    return results;
  }

  getProviderInfo(providerName?: string): ProviderInfo {
    const adapter = this.getAdapter(providerName);
    return adapter.getProviderInfo();
  }

  getAllProviderInfo(): Record<string, ProviderInfo> {
    const results: Record<string, ProviderInfo> = {};

    for (const [name, adapter] of this.adapters) {
      results[name] = adapter.getProviderInfo();
    }

    return results;
  }

  async listModels(providerName?: string): Promise<string[]> {
    const adapter = this.getAdapter(providerName);
    return adapter.listModels();
  }

  getAvailableProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  getProviderConfig(providerName: string): ProviderConfig | undefined {
    return this.configs.get(providerName);
  }

  updateProviderConfig(providerName: string, config: Partial<ProviderConfig>): void {
    const existingConfig = this.configs.get(providerName);
    if (!existingConfig) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const updatedConfig = { ...existingConfig, ...config };
    this.configs.set(providerName, updatedConfig);

    // Reinitialize the adapter if configuration changed significantly
    if (this.shouldReinitialize(config)) {
      this.removeProvider(providerName);
      if (updatedConfig.enabled) {
        try {
          const adapter = this.createAdapter(updatedConfig);
          const moderatedAdapter = this.config.moderation.enabled
            ? createModeratedAdapter(adapter, this.moderationService)
            : adapter;

          this.adapters.set(providerName, moderatedAdapter);
        } catch (error) {
          console.error(`Failed to reinitialize provider ${providerName}:`, error);
        }
      }
    }
  }

  addProvider(config: ProviderConfig): void {
    if (this.adapters.has(config.name)) {
      throw new Error(`Provider ${config.name} already exists`);
    }

    try {
      const adapter = this.createAdapter(config);
      const moderatedAdapter = this.config.moderation.enabled
        ? createModeratedAdapter(adapter, this.moderationService)
        : adapter;

      this.adapters.set(config.name, moderatedAdapter);
      this.configs.set(config.name, config);
    } catch (error) {
      console.error(`Failed to add provider ${config.name}:`, error);
      throw error;
    }
  }

  removeProvider(providerName: string): void {
    this.adapters.delete(providerName);
    this.configs.delete(providerName);
  }

  updateModerationPolicy(policy: Partial<ProviderManagerConfig['moderation']>): void {
    this.config.moderation = { ...this.config.moderation, ...policy };
    this.moderationService.updatePolicy(this.config.moderation);

    // Recreate all adapters with new moderation settings
    this.adapters.clear();
    this.initializeProviders();
  }

  getModerationPolicy(): ProviderManagerConfig['moderation'] {
    return { ...this.config.moderation };
  }

  private getAdapter(providerName?: string): ProviderAdapter {
    const name = providerName || this.config.defaultProvider;
    const adapter = this.adapters.get(name);

    if (!adapter) {
      throw new ProviderError(`Provider ${name} not found`, 'provider_manager', 'PROVIDER_NOT_FOUND');
    }

    return adapter;
  }

  private shouldReinitialize(configChanges: Partial<ProviderConfig>): boolean {
    const reinitKeys = ['type', 'apiKey', 'host', 'baseURL', 'organization', 'enabled'];
    return reinitKeys.some(key => key in configChanges);
  }

  // API endpoint handlers
  getProviderEndpoints() {
    return {
      // List all providers
      'GET /api/providers': async () => {
        const providers = this.getAllProviderInfo();
        const configs = Array.from(this.configs.values());
        const statuses = await this.testAllConnections();

        return {
          providers: Object.entries(providers).map(([name, info]) => ({
            name,
            config: configs.find(c => c.name === name),
            info,
            status: statuses[name],
            enabled: this.adapters.has(name)
          }))
        };
      },

      // Test specific provider connection
      'POST /api/providers/:name/test': async (params: { name: string }) => {
        const result = await this.testConnection(params.name);
        return { name: params.name, connected: result };
      },

      // Test all provider connections
      'POST /api/providers/test-all': async () => {
        return await this.testAllConnections();
      },

      // Update provider configuration
      'PUT /api/providers/:name': async (params: { name: string }, body: Partial<ProviderConfig>) => {
        this.updateProviderConfig(params.name, body);
        return { success: true, name: params.name };
      },

      // Add new provider
      'POST /api/providers': async (body: ProviderConfig) => {
        this.addProvider(body);
        return { success: true, name: body.name };
      },

      // Remove provider
      'DELETE /api/providers/:name': async (params: { name: string }) => {
        this.removeProvider(params.name);
        return { success: true, name: params.name };
      },

      // List models for provider
      'GET /api/providers/:name/models': async (params: { name: string }) => {
        const models = await this.listModels(params.name);
        return { name: params.name, models };
      },

      // Get provider info
      'GET /api/providers/:name': async (params: { name: string }) => {
        const info = this.getProviderInfo(params.name);
        const config = this.getProviderConfig(params.name);
        const status = await this.testConnection(params.name);

        return {
          name: params.name,
          config,
          info,
          status,
          enabled: this.adapters.has(params.name)
        };
      },

      // Update moderation policy
      'PUT /api/moderation': async (body: Partial<ProviderManagerConfig['moderation']>) => {
        this.updateModerationPolicy(body);
        return { success: true, policy: this.getModerationPolicy() };
      },

      // Get moderation policy
      'GET /api/moderation': async () => {
        return this.getModerationPolicy();
      }
    };
  }

  // Helper method to integrate with Express or similar web frameworks
  createRouteHandler() {
    const endpoints = this.getProviderEndpoints();

    return async (method: string, path: string, params?: any, body?: any) => {
      const endpointKey = `${method.toUpperCase()} ${path}`;
      const handler = endpoints[endpointKey as keyof typeof endpoints];

      if (!handler) {
        throw new Error(`Endpoint not found: ${endpointKey}`);
      }

      return await handler(params, body);
    };
  }
}