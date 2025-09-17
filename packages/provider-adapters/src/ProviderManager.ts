import { EventEmitter } from 'eventemitter3';
import {
  ProviderAdapter,
  ProviderManager as IProviderManager,
  ProviderConfig,
  TestConnectionRequest,
  TestConnectionResponse,
  ChatRequest,
  ChatResponse,
  VisionRequest,
  VisionResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ModelInfo,
  CancellationToken
} from './types/provider';
import { ProviderRegistry } from './ProviderRegistry';

interface ManagerEvents {
  provider_changed: { from: string; to: string };
  provider_error: { provider: string; error: Error };
  config_updated: { provider: string; config: ProviderConfig };
  connection_tested: { provider: string; result: TestConnectionResponse };
}

export class ProviderManager extends EventEmitter<ManagerEvents> implements IProviderManager {
  public registry: ProviderRegistry;
  public currentProvider: string;
  public config: Record<string, ProviderConfig> = {};

  constructor(registry?: ProviderRegistry) {
    super();
    this.registry = registry || new ProviderRegistry();
    this.currentProvider = '';
  }

  async setProvider(provider: string, config: ProviderConfig): Promise<void> {
    const adapter = this.registry.get(provider);
    if (!adapter) {
      throw new Error(`Provider '${provider}' not found in registry`);
    }

    // Validate configuration
    const validation = adapter.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid configuration for ${provider}: ${validation.errors.join(', ')}`);
    }

    // Test connection before switching
    try {
      const testResult = await adapter.testConnection({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.defaultModel
      });

      if (!testResult.success) {
        throw new Error(`Connection test failed: ${testResult.message}`);
      }

      // Store configuration
      this.config[provider] = config;

      // Switch provider
      const previousProvider = this.currentProvider;
      this.currentProvider = provider;

      // Update adapter configuration
      (adapter as any).updateConfig?.(config);

      this.emit('provider_changed', { from: previousProvider, to: provider });
      this.emit('config_updated', { provider, config });
      this.emit('connection_tested', { provider, result: testResult });

      console.log(`Switched to provider: ${provider}`);
    } catch (error) {
      this.emit('provider_error', { provider, error: error as Error });
      throw error;
    }
  }

  getProvider(): ProviderAdapter {
    const adapter = this.registry.get(this.currentProvider);
    if (!adapter) {
      throw new Error(`No provider set or provider '${this.currentProvider}' not found`);
    }
    return adapter;
  }

  async chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse> {
    try {
      const adapter = this.getProvider();
      return await adapter.chat(request, cancellationToken);
    } catch (error) {
      this.emit('provider_error', { provider: this.currentProvider, error: error as Error });
      throw error;
    }
  }

  async streamChat(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    cancellationToken?: CancellationToken
  ): Promise<ChatResponse> {
    try {
      const adapter = this.getProvider();
      return await adapter.streamChat(request, onChunk, cancellationToken);
    } catch (error) {
      this.emit('provider_error', { provider: this.currentProvider, error: error as Error });
      throw error;
    }
  }

  async visionAnalyze(request: VisionRequest, cancellationToken?: CancellationToken): Promise<VisionResponse> {
    try {
      const adapter = this.getProvider();
      if (!adapter.supportsCapability('vision')) {
        throw new Error(`Provider '${this.currentProvider}' does not support vision analysis`);
      }
      return await adapter.visionAnalyze(request, cancellationToken);
    } catch (error) {
      this.emit('provider_error', { provider: this.currentProvider, error: error as Error });
      throw error;
    }
  }

  async imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse> {
    try {
      const adapter = this.getProvider();
      if (!adapter.supportsCapability('image-generation')) {
        throw new Error(`Provider '${this.currentProvider}' does not support image generation`);
      }
      return await adapter.imageGenerate(request, cancellationToken);
    } catch (error) {
      this.emit('provider_error', { provider: this.currentProvider, error: error as Error });
      throw error;
    }
  }

  async testConnection(provider: string, config: TestConnectionRequest): Promise<TestConnectionResponse> {
    const adapter = this.registry.get(provider);
    if (!adapter) {
      throw new Error(`Provider '${provider}' not found in registry`);
    }

    try {
      const result = await adapter.testConnection(config);
      this.emit('connection_tested', { provider, result });
      return result;
    } catch (error) {
      this.emit('provider_error', { provider, error: error as Error });
      throw error;
    }
  }

  async listModels(provider?: string): Promise<ModelInfo[]> {
    const targetProvider = provider || this.currentProvider;
    const adapter = this.registry.get(targetProvider);

    if (!adapter) {
      throw new Error(`Provider '${targetProvider}' not found in registry`);
    }

    try {
      return await adapter.listModels(this.config[targetProvider]);
    } catch (error) {
      this.emit('provider_error', { provider: targetProvider, error: error as Error });
      throw error;
    }
  }

  // Configuration management
  updateConfig(provider: string, updates: Partial<ProviderConfig>): void {
    if (!this.config[provider]) {
      throw new Error(`No configuration found for provider '${provider}'`);
    }

    this.config[provider] = { ...this.config[provider], ...updates };
    this.emit('config_updated', { provider, config: this.config[provider] });

    // Update adapter if it's the current provider
    if (provider === this.currentProvider) {
      const adapter = this.getProvider();
      (adapter as any).updateConfig?.(this.config[provider]);
    }
  }

  getConfig(provider?: string): ProviderConfig | undefined {
    const targetProvider = provider || this.currentProvider;
    return this.config[targetProvider];
  }

  // Provider management
  getAvailableProviders(): string[] {
    return this.registry.getProviders();
  }

  getProviderInfo(provider: string): { name: string; version: string; capabilities: string[] } | undefined {
    const adapter = this.registry.get(provider);
    if (!adapter) return undefined;

    return {
      name: adapter.name,
      version: adapter.version,
      capabilities: adapter.capabilities
    };
  }

  // Capability checking
  supportsCapability(capability: string, provider?: string): boolean {
    const targetProvider = provider || this.currentProvider;
    const adapter = this.registry.get(targetProvider);
    return adapter?.supportsCapability(capability) || false;
  }

  // Find providers by capabilities
  findProvidersByCapabilities(capabilities: string[]): string[] {
    const adapters = this.registry.find(capabilities);
    return adapters.map(adapter => adapter.provider);
  }

  // Batch operations
  async testAllConnections(): Promise<Record<string, TestConnectionResponse>> {
    const results: Record<string, TestConnectionResponse> = {};

    for (const provider of this.getAvailableProviders()) {
      const config = this.config[provider];
      if (config) {
        try {
          results[provider] = await this.testConnection(provider, {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            model: config.defaultModel
          });
        } catch (error) {
          results[provider] = {
            success: false,
            message: error instanceof Error ? error.message : String(error)
          };
        }
      }
    }

    return results;
  }

  // Health check
  async healthCheck(): Promise<{
    healthy: boolean;
    currentProvider: string;
    providers: Record<string, { healthy: boolean; message?: string }>;
  }> {
    const healthStatus: Record<string, { healthy: boolean; message?: string }> = {};
    let overallHealthy = true;

    for (const provider of this.getAvailableProviders()) {
      const config = this.config[provider];
      if (config) {
        try {
          const result = await this.testConnection(provider, {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            model: config.defaultModel
          });
          healthStatus[provider] = {
            healthy: result.success,
            message: result.success ? 'Connected' : result.message
          };
          if (!result.success && provider === this.currentProvider) {
            overallHealthy = false;
          }
        } catch (error) {
          healthStatus[provider] = {
            healthy: false,
            message: error instanceof Error ? error.message : String(error)
          };
          if (provider === this.currentProvider) {
            overallHealthy = false;
          }
        }
      } else {
        healthStatus[provider] = {
          healthy: false,
          message: 'No configuration available'
        };
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      currentProvider: this.currentProvider,
      providers: healthStatus
    };
  }

  // Configuration export/import
  exportConfig(): Record<string, ProviderConfig> {
    // Remove sensitive data before export
    const exported: Record<string, ProviderConfig> = {};

    for (const [provider, config] of Object.entries(this.config)) {
      exported[provider] = {
        ...config,
        apiKey: '[REDACTED]' // Don't export actual API keys
      };
    }

    return exported;
  }

  importConfig(config: Record<string, ProviderConfig>): void {
    for (const [provider, providerConfig] of Object.entries(config)) {
      // Skip redacted configurations
      if (providerConfig.apiKey === '[REDACTED]') continue;

      const adapter = this.registry.get(provider);
      if (adapter) {
        const validation = adapter.validateConfig(providerConfig);
        if (validation.valid) {
          this.config[provider] = providerConfig;
          console.log(`Imported configuration for provider: ${provider}`);
        } else {
          console.warn(`Invalid configuration for ${provider}: ${validation.errors.join(', ')}`);
        }
      }
    }
  }

  // Statistics and metrics
  getStats(): {
    totalProviders: number;
    configuredProviders: number;
    currentProvider: string;
    capabilities: Record<string, string[]>;
  } {
    const providers = this.getAvailableProviders();
    const configured = Object.keys(this.config).length;

    const capabilities: Record<string, string[]> = {};
    for (const provider of providers) {
      const adapter = this.registry.get(provider);
      if (adapter) {
        capabilities[provider] = adapter.capabilities;
      }
    }

    return {
      totalProviders: providers.length,
      configuredProviders: configured,
      currentProvider: this.currentProvider,
      capabilities
    };
  }
}