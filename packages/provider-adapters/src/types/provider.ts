export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  stream?: boolean;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  id: string;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface VisionRequest {
  image: string | Buffer; // base64 or Buffer
  prompt?: string;
  model?: string;
  detail?: 'low' | 'high' | 'auto';
  metadata?: Record<string, any>;
}

export interface VisionResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ImageGenerationRequest {
  prompt: string;
  model?: string;
  n?: number;
  quality?: 'standard' | 'hd';
  size?: string;
  style?: 'vivid' | 'natural';
  responseFormat?: 'url' | 'b64_json';
  user?: string;
  metadata?: Record<string, any>;
}

export interface ImageGenerationResponse {
  id: string;
  images: Array<{
    url?: string;
    b64_json?: string;
    revisedPrompt?: string;
  }>;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  capabilities: string[];
  contextLength: number;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsImages: boolean;
  pricing?: {
    input: number; // per 1K tokens
    output: number; // per 1K tokens
    images?: {
      low: number;
      high: number;
    };
  };
  parameters?: Record<string, any>;
}

export interface TestConnectionRequest {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  metadata?: Record<string, any>;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  latency?: number;
  models?: ModelInfo[];
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: string[];
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retry?: RetryConfig;
  models?: string[];
  defaultModel?: string;
  metadata?: Record<string, any>;
}

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
  action?: 'block' | 'review' | 'allow';
  metadata?: Record<string, any>;
}

export interface CancellationToken {
  isCancelled: boolean;
  cancel(): void;
  onCancelled(callback: () => void): void;
}

// Main Provider Adapter Interface
export interface ProviderAdapter {
  readonly provider: string;
  readonly name: string;
  readonly version: string;
  readonly capabilities: string[];

  // Core methods
  chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse>;
  streamChat(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    cancellationToken?: CancellationToken
  ): Promise<ChatResponse>;

  // Vision methods
  visionAnalyze(request: VisionRequest, cancellationToken?: CancellationToken): Promise<VisionResponse>;

  // Image generation methods
  imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse>;

  // Management methods
  listModels(config?: ProviderConfig): Promise<ModelInfo[]>;
  testConnection(config: TestConnectionRequest): Promise<TestConnectionResponse>;

  // Configuration
  validateConfig(config: ProviderConfig): { valid: boolean; errors: string[] };
  getDefaultConfig(): Partial<ProviderConfig>;

  // Optional hooks
  onBeforeRequest?(request: any, config: ProviderConfig): Promise<any>;
  onAfterResponse?(response: any, config: ProviderConfig): Promise<any>;
  onError?(error: Error, config: ProviderConfig): void;

  // Utility methods
  supportsCapability(capability: string): boolean;
  getAvailableModels(): Promise<ModelInfo[]>;
}

export interface ProviderRegistry {
  register(adapter: ProviderAdapter): void;
  unregister(provider: string): void;
  get(provider: string): ProviderAdapter | undefined;
  list(): ProviderAdapter[];
  find(capabilities: string[]): ProviderAdapter[];
}

export interface ProviderManager {
  registry: ProviderRegistry;
  currentProvider: string;
  config: Record<string, ProviderConfig>;

  setProvider(provider: string, config: ProviderConfig): Promise<void>;
  getProvider(): ProviderAdapter;
  chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse>;
  streamChat(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    cancellationToken?: CancellationToken
  ): Promise<ChatResponse>;
  visionAnalyze(request: VisionRequest, cancellationToken?: CancellationToken): Promise<VisionResponse>;
  imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse>;
  testConnection(provider: string, config: TestConnectionRequest): Promise<TestConnectionResponse>;
  listModels(provider?: string): Promise<ModelInfo[]>;
}