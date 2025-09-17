import { ProviderManager } from '../ProviderManager';
import { ProviderRegistry } from '../ProviderRegistry';
import { OpenAIAdapter } from '../providers/OpenAIAdapter';
import { AnthropicAdapter } from '../providers/AnthropicAdapter';
import { GeminiAdapter } from '../providers/GeminiAdapter';
import { OllamaAdapter } from '../providers/OllamaAdapter';
import { ProviderConfig, ChatRequest, ChatResponse, VisionRequest, VisionResponse, ImageGenerationRequest, ImageGenerationResponse, ModelInfo, CancellationToken } from '../types/provider';

export class ProviderService {
  private static instance: ProviderService;
  private providerManager: ProviderManager;
  private registry: ProviderRegistry;

  private constructor() {
    this.registry = new ProviderRegistry();
    this.providerManager = new ProviderManager(this.registry);
    this.initializeProviders();
  }

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  private initializeProviders(): void {
    // Register all available providers
    this.registry.register(new OpenAIAdapter());
    this.registry.register(new AnthropicAdapter());
    this.registry.register(new GeminiAdapter());
    this.registry.register(new OllamaAdapter());

    console.log('Provider service initialized with providers:', this.registry.getProviders());
  }

  // Provider management
  async setProvider(provider: string, config: ProviderConfig): Promise<void> {
    return this.providerManager.setProvider(provider, config);
  }

  getCurrentProvider(): string {
    return this.providerManager.currentProvider;
  }

  getAvailableProviders(): string[] {
    return this.providerManager.getAvailableProviders();
  }

  getProviderInfo(provider: string) {
    return this.providerManager.getProviderInfo(provider);
  }

  // Chat operations
  async chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse> {
    return this.providerManager.chat(request, cancellationToken);
  }

  async streamChat(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    cancellationToken?: CancellationToken
  ): Promise<ChatResponse> {
    return this.providerManager.streamChat(request, onChunk, cancellationToken);
  }

  // Vision operations
  async visionAnalyze(request: VisionRequest, cancellationToken?: CancellationToken): Promise<VisionResponse> {
    return this.providerManager.visionAnalyze(request, cancellationToken);
  }

  // Image generation operations
  async imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse> {
    return this.providerManager.imageGenerate(request, cancellationToken);
  }

  // Model operations
  async listModels(provider?: string): Promise<ModelInfo[]> {
    return this.providerManager.listModels(provider);
  }

  // Connection testing
  async testConnection(provider: string, config: any): Promise<any> {
    return this.providerManager.testConnection(provider, config);
  }

  async testAllConnections(): Promise<Record<string, any>> {
    return this.providerManager.testAllConnections();
  }

  // Configuration management
  updateConfig(provider: string, updates: Partial<ProviderConfig>): void {
    this.providerManager.updateConfig(provider, updates);
  }

  getConfig(provider?: string): ProviderConfig | undefined {
    return this.providerManager.getConfig(provider);
  }

  exportConfig(): Record<string, ProviderConfig> {
    return this.providerManager.exportConfig();
  }

  importConfig(config: Record<string, ProviderConfig>): void {
    this.providerManager.importConfig(config);
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.providerManager.healthCheck();
  }

  // Statistics
  getStats(): any {
    return this.providerManager.getStats();
  }

  // Capability checking
  supportsCapability(capability: string, provider?: string): boolean {
    return this.providerManager.supportsCapability(capability, provider);
  }

  // Event handling
  on(event: string, callback: (data: any) => void): void {
    this.providerManager.on(event, callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.providerManager.off(event, callback);
  }

  // Provider discovery
  findProvidersByCapabilities(capabilities: string[]): string[] {
    return this.providerManager.findProvidersByCapabilities(capabilities);
  }

  // Utility methods
  getProviderManager(): ProviderManager {
    return this.providerManager;
  }

  getRegistry(): ProviderRegistry {
    return this.registry;
  }
}