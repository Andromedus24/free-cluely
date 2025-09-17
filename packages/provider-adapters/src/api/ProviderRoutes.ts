import { Router, Request, Response } from 'express';
import { ProviderManager } from '../ProviderManager';
import { ProviderRegistry } from '../ProviderRegistry';
import { OpenAIAdapter } from '../providers/OpenAIAdapter';
import { AnthropicAdapter } from '../providers/AnthropicAdapter';
import { GeminiAdapter } from '../providers/GeminiAdapter';
import { OllamaAdapter } from '../providers/OllamaAdapter';
import { ProviderConfig, TestConnectionRequest } from '../types/provider';

export class ProviderRoutes {
  private router: Router;
  private providerManager: ProviderManager;
  private registry: ProviderRegistry;

  constructor() {
    this.router = Router();
    this.registry = new ProviderRegistry();
    this.providerManager = new ProviderManager(this.registry);

    // Initialize with default providers
    this.initializeProviders();

    this.setupRoutes();
  }

  private initializeProviders(): void {
    // Register all available providers
    this.registry.register(new OpenAIAdapter());
    this.registry.register(new AnthropicAdapter());
    this.registry.register(new GeminiAdapter());
    this.registry.register(new OllamaAdapter());
  }

  private setupRoutes(): void {
    // Get all available providers
    this.router.get('/providers', this.getProviders.bind(this));

    // Get current provider
    this.router.get('/providers/current', this.getCurrentProvider.bind(this));

    // Set current provider
    this.router.post('/providers/current', this.setCurrentProvider.bind(this));

    // Test connection for a provider
    this.router.post('/providers/:provider/test', this.testConnection.bind(this));

    // Get provider configuration
    this.router.get('/providers/:provider/config', this.getProviderConfig.bind(this));

    // Update provider configuration
    this.router.put('/providers/:provider/config', this.updateProviderConfig.bind(this));

    // Get provider models
    this.router.get('/providers/:provider/models', this.getProviderModels.bind(this));

    // Get provider capabilities
    this.router.get('/providers/:provider/capabilities', this.getProviderCapabilities.bind(this));

    // Test all configured providers
    this.router.post('/providers/test-all', this.testAllConnections.bind(this));

    // Health check
    this.router.get('/providers/health', this.healthCheck.bind(this));
  }

  private async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = this.providerManager.getAvailableProviders();
      const currentProvider = this.providerManager.currentProvider;

      const providerDetails = providers.map(provider => ({
        id: provider,
        name: this.getProviderName(provider),
        current: provider === currentProvider,
        configured: !!this.providerManager.getConfig(provider),
        capabilities: this.providerManager.getProviderInfo(provider)?.capabilities || []
      }));

      res.json({
        providers: providerDetails,
        current: currentProvider
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get providers',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async getCurrentProvider(req: Request, res: Response): Promise<void> {
    try {
      const currentProvider = this.providerManager.currentProvider;
      const config = this.providerManager.getConfig();
      const info = this.providerManager.getProviderInfo(currentProvider);

      if (!currentProvider) {
        res.status(404).json({ error: 'No provider currently set' });
        return;
      }

      res.json({
        provider: currentProvider,
        name: info?.name,
        version: info?.version,
        capabilities: info?.capabilities,
        configured: !!config
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get current provider',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async setCurrentProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider, config } = req.body;

      if (!provider) {
        res.status(400).json({ error: 'Provider is required' });
        return;
      }

      if (!config) {
        res.status(400).json({ error: 'Configuration is required' });
        return;
      }

      await this.providerManager.setProvider(provider, config);

      res.json({
        success: true,
        message: `Successfully switched to provider: ${provider}`,
        provider
      });
    } catch (error) {
      res.status(400).json({
        error: 'Failed to set provider',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const testRequest: TestConnectionRequest = req.body;

      if (!testRequest.apiKey) {
        res.status(400).json({ error: 'API key is required' });
        return;
      }

      const result = await this.providerManager.testConnection(provider, testRequest);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to test connection',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async getProviderConfig(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const config = this.providerManager.getConfig(provider);

      if (!config) {
        res.status(404).json({ error: `No configuration found for provider: ${provider}` });
        return;
      }

      // Don't expose sensitive data
      const safeConfig = {
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        defaultModel: config.defaultModel,
        models: config.models,
        retry: config.retry,
        metadata: config.metadata
      };

      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get provider configuration',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async updateProviderConfig(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const updates = req.body;

      this.providerManager.updateConfig(provider, updates);

      res.json({
        success: true,
        message: `Configuration updated for provider: ${provider}`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update provider configuration',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async getProviderModels(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const models = await this.providerManager.listModels(provider);

      res.json({
        provider,
        models,
        count: models.length
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get provider models',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async getProviderCapabilities(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const info = this.providerManager.getProviderInfo(provider);

      if (!info) {
        res.status(404).json({ error: `Provider not found: ${provider}` });
        return;
      }

      res.json({
        provider,
        name: info.name,
        version: info.version,
        capabilities: info.capabilities
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get provider capabilities',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async testAllConnections(req: Request, res: Response): Promise<void> {
    try {
      const results = await this.providerManager.testAllConnections();

      res.json({
        results,
        summary: {
          total: Object.keys(results).length,
          successful: Object.values(results).filter(r => r.success).length,
          failed: Object.values(results).filter(r => !r.success).length
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to test all connections',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.providerManager.healthCheck();

      res.json(health);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to perform health check',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private getProviderName(providerId: string): string {
    const info = this.providerManager.getProviderInfo(providerId);
    return info?.name || providerId;
  }

  public getRouter(): Router {
    return this.router;
  }

  public getProviderManager(): ProviderManager {
    return this.providerManager;
  }
}