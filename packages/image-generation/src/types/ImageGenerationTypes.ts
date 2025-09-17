import { ProviderAdapter, ProviderConfig, CancellationToken, ImageGenerationRequest, ImageGenerationResponse } from '@cluely/provider-adapters';

export interface ImageProvider {
  id: string;
  name: string;
  description: string;
  supportedModels: ImageModel[];
  capabilities: ImageGenerationCapability[];
  pricing: ImagePricing;
  rateLimits: RateLimit;
  config: ProviderConfig;
}

export interface ImageModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  capabilities: ImageGenerationCapability[];
  supportedSizes: ImageSize[];
  supportedQualities: ImageQuality[];
  supportedStyles: ImageStyle[];
  maxImages: number;
  pricing: ModelPricing;
  parameters: ModelParameters;
}

export interface ImageSize {
  width: number;
  height: number;
  aspectRatio: string;
  label: string;
}

export interface ImageQuality {
  id: 'standard' | 'hd' | 'ultra';
  name: string;
  description: string;
  resolutionMultiplier: number;
}

export interface ImageStyle {
  id: string;
  name: string;
  description: string;
  promptModifiers: string[];
}

export interface ImagePricing {
  basePrice: number;
  perImage: number;
  qualityMultipliers: Record<string, number>;
  sizeMultipliers: Record<string, number>;
  currency: string;
}

export interface ModelPricing {
  input: number;
  output: number;
  images: {
    standard: number;
    hd: number;
    ultra: number;
  };
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  concurrentRequests: number;
}

export interface ModelParameters {
  temperature?: number;
  topP?: number;
  topK?: number;
  guidanceScale?: number;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  negativePrompt?: string;
}

export interface ImageGenerationCapability {
  id: string;
  name: string;
  description: string;
}

export interface EnhancedImageGenerationRequest extends ImageGenerationRequest {
  provider?: string;
  model?: string;
  size?: string | ImageSize;
  quality?: ImageQuality | string;
  style?: ImageStyle | string;
  negativePrompt?: string;
  seed?: number;
  guidanceScale?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  promptOptimization?: PromptOptimizationOptions;
  costTracking?: CostTrackingOptions;
  outputFormat?: ImageOutputFormat;
  metadata?: ImageMetadata;
}

export interface PromptOptimizationOptions {
  enabled: boolean;
  enhanceStyle: boolean;
  improveDetails: boolean;
  addArtisticTerms: boolean;
  optimizeComposition: boolean;
  customInstructions?: string;
}

export interface CostTrackingOptions {
  enabled: boolean;
  budgetLimit?: number;
  costCenter?: string;
  tags?: string[];
}

export interface ImageOutputFormat {
  format: 'url' | 'b64_json' | 'file';
  compression?: number;
  quality?: number;
  resolution?: number;
}

export interface ImageMetadata {
  id?: string;
  sessionId?: string;
  userId?: string;
  project?: string;
  tags?: string[];
  description?: string;
  source?: 'api' | 'ui' | 'plugin';
  workflow?: string;
  timestamp?: Date;
}

export interface EnhancedImageGenerationResponse extends ImageGenerationResponse {
  cost?: ImageGenerationCost;
  metadata?: ImageMetadata;
  processingTime?: number;
  quality?: ImageQualityAssessment;
  variations?: VariationOptions;
}

export interface ImageGenerationCost {
  totalCost: number;
  breakdown: {
    base: number;
    qualityMultiplier: number;
    sizeMultiplier: number;
    styleMultiplier: number;
    additionalFeatures: number;
  };
  currency: string;
  budgetRemaining?: number;
  costCenter?: string;
}

export interface ImageQualityAssessment {
  score: number;
  factors: {
    clarity: number;
    composition: number;
    colorHarmony: number;
    detail: number;
    creativity: number;
  };
  feedback?: string;
  recommendations?: string[];
}

export interface VariationOptions {
  available: boolean;
  count: number;
  parameters: VariationParameters;
}

export interface VariationParameters {
  strength?: number;
  seed?: number;
  prompt?: string;
  negativePrompt?: string;
  style?: string;
}

export interface ImageUpscaleRequest {
  image: string | Buffer;
  targetSize: ImageSize;
  upscaleMethod: UpscaleMethod;
  quality?: ImageQuality;
  metadata?: ImageMetadata;
  cancellationToken?: CancellationToken;
}

export interface UpscaleMethod {
  id: string;
  name: string;
  description: string;
  maxUpscaleFactor: number;
  qualityPreservation: number;
  processingTime: string;
}

export interface ImageUpscaleResponse {
  success: boolean;
  image?: {
    url?: string;
    b64_json?: string;
    format: string;
    size: ImageSize;
  };
  error?: string;
  cost?: ImageGenerationCost;
  processingTime?: number;
  quality?: ImageQualityAssessment;
  metadata?: ImageMetadata;
}

export interface ImageVariationRequest {
  image: string | Buffer;
  prompt?: string;
  negativePrompt?: string;
  variations: number;
  similarity: number;
  style?: string;
  metadata?: ImageMetadata;
  cancellationToken?: CancellationToken;
}

export interface ImageVariationResponse {
  success: boolean;
  images?: Array<{
    url?: string;
    b64_json?: string;
    format: string;
    similarity: number;
  }>;
  error?: string;
  cost?: ImageGenerationCost;
  processingTime?: number;
  metadata?: ImageMetadata;
}

export interface GalleryItem {
  id: string;
  url?: string;
  b64_json?: string;
  thumbnail?: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  provider: string;
  size: ImageSize;
  quality: ImageQuality;
  style: ImageStyle;
  cost: ImageGenerationCost;
  metadata: ImageMetadata;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  variations?: string[];
  favorites: boolean;
  quality?: ImageQualityAssessment;
}

export interface GalleryQuery {
  query?: string;
  provider?: string;
  model?: string;
  style?: string;
  quality?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  costRange?: {
    min: number;
    max: number;
  };
  sortBy?: 'date' | 'cost' | 'quality' | 'favorites';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface GalleryResult {
  items: GalleryItem[];
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  query: GalleryQuery;
}

export interface UsageStats {
  totalRequests: number;
  totalCost: number;
  totalImages: number;
  byProvider: Record<string, {
    requests: number;
    cost: number;
    images: number;
  }>;
  byModel: Record<string, {
    requests: number;
    cost: number;
    images: number;
  }>;
  byDate: Record<string, {
    requests: number;
    cost: number;
    images: number;
  }>;
  currentBudget?: {
    limit: number;
    used: number;
    remaining: number;
  };
}

export interface ImageGenerationEvent {
  type: 'generation_start' | 'generation_complete' | 'generation_error' | 'upscale_start' | 'upscale_complete' | 'variation_start' | 'variation_complete';
  timestamp: Date;
  requestId: string;
  provider: string;
  model: string;
  prompt?: string;
  cost?: ImageGenerationCost;
  error?: string;
  metadata?: ImageMetadata;
}

export interface ImageGenerationConfig {
  defaultProvider: string;
  defaultModel: string;
  defaultSize: ImageSize;
  defaultQuality: ImageQuality;
  defaultStyle: ImageStyle;
  promptOptimization: PromptOptimizationOptions;
  costTracking: CostTrackingOptions;
  outputFormat: ImageOutputFormat;
  gallery: {
    enabled: boolean;
    autoSave: boolean;
    maxItems: number;
    retentionDays: number;
  };
  rateLimits: {
    enabled: boolean;
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  monitoring: {
    enabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    events: string[];
  };
}

export interface ProviderAdapterManager {
  registerAdapter(adapter: ProviderAdapter): void;
  getAdapter(provider: string): ProviderAdapter | undefined;
  listAdapters(): ProviderAdapter[];
  getAvailableProviders(): ImageProvider[];
  getProviderModels(provider: string): ImageModel[];
  validateProviderConfig(provider: string, config: ProviderConfig): Promise<{ valid: boolean; errors: string[] }>;
}

export interface ImageStorageService {
  saveImage(image: string | Buffer, metadata: ImageMetadata): Promise<string>;
  loadImage(id: string): Promise<string | Buffer>;
  deleteImage(id: string): Promise<boolean>;
  listImages(query: GalleryQuery): Promise<GalleryResult>;
  updateMetadata(id: string, metadata: Partial<ImageMetadata>): Promise<boolean>;
}

export interface CostTrackingService {
  trackCost(cost: ImageGenerationCost, metadata: ImageMetadata): Promise<void>;
  getUsageStats(filter?: { dateRange?: { start: Date; end: Date }; provider?: string; model?: string }): Promise<UsageStats>;
  checkBudget(limit: number): Promise<{ allowed: boolean; remaining: number; usage: number }>;
  setBudget(limit: number, costCenter?: string): Promise<void>;
}

export interface ImageGenerationError extends Error {
  code: string;
  provider?: string;
  model?: string;
  requestId?: string;
  details?: Record<string, any>;
  retryable: boolean;
}

export interface ValidationOptions {
  validatePrompt: boolean;
  validateSize: boolean;
  validateQuality: boolean;
  validateBudget: boolean;
  validateRateLimit: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ImageGenerationServiceOptions {
  config?: Partial<ImageGenerationConfig>;
  storage?: ImageStorageService;
  costTracking?: CostTrackingService;
  eventHandlers?: Record<string, (event: ImageGenerationEvent) => void>;
  validator?: (request: EnhancedImageGenerationRequest) => Promise<ValidationResult>;
}

export interface PromptEnhancementResult {
  enhancedPrompt: string;
  improvements: string[];
  confidence: number;
  suggestions: string[];
}

export interface BatchGenerationRequest {
  requests: EnhancedImageGenerationRequest[];
  parallel?: boolean;
  maxConcurrency?: number;
  cancellationToken?: CancellationToken;
}

export interface BatchGenerationResponse {
  results: Array<{
    success: boolean;
    response?: EnhancedImageGenerationResponse;
    error?: ImageGenerationError;
  }>;
  totalCost: ImageGenerationCost;
  processingTime: number;
  metadata?: ImageMetadata;
}