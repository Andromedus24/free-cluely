// Main service export
export { ImageGenerationService } from './ImageGenerationService';

// Type exports
export type {
  // Core types
  ImageProvider,
  ImageModel,
  ImageSize,
  ImageQuality,
  ImageStyle,
  ImageGenerationCapability,
  ImagePricing,
  ModelPricing,
  RateLimit,
  ModelParameters,

  // Request/Response types
  EnhancedImageGenerationRequest,
  EnhancedImageGenerationResponse,
  ImageUpscaleRequest,
  ImageUpscaleResponse,
  ImageVariationRequest,
  ImageVariationResponse,

  // Service types
  ImageGenerationServiceOptions,
  ImageGenerationConfig,
  ImageGenerationEvent,
  ImageGenerationError,

  // Gallery types
  GalleryItem,
  GalleryQuery,
  GalleryResult,

  // Cost tracking types
  ImageGenerationCost,
  UsageStats,
  CostTrackingOptions,

  // Prompt optimization types
  PromptOptimizationOptions,
  PromptEnhancementResult,

  // Validation types
  ValidationResult,
  ValidationOptions,

  // Batch processing types
  BatchGenerationRequest,
  BatchGenerationResponse,

  // Storage and management types
  ImageStorageService,
  CostTrackingService,
  ProviderAdapterManager,
  ImageMetadata,
  ImageOutputFormat,
  UpscaleMethod,
  VariationParameters,
  ImageQualityAssessment,
  VariationOptions

} from './types/ImageGenerationTypes';

// Re-export commonly used interfaces from provider-adapters
export type {
  ProviderAdapter,
  ProviderConfig,
  CancellationToken,
  ImageGenerationRequest,
  ImageGenerationResponse
} from '@cluely/provider-adapters';

// Version info
export const version = '1.0.0';
export const name = '@cluely/image-generation';

// Utility functions
export const createImageGenerationService = (options?: ImageGenerationServiceOptions) => {
  return new ImageGenerationService(options);
};

// Default configurations
export const defaultProviders = ['openai', 'midjourney', 'stable-diffusion'];
export const defaultModels = {
  openai: 'dall-e-3',
  midjourney: 'midjourney-v6',
  'stable-diffusion': 'stable-diffusion-xl'
};

export const defaultSizes = [
  { width: 512, height: 512, aspectRatio: '1:1', label: '512x512' },
  { width: 1024, height: 1024, aspectRatio: '1:1', label: '1024x1024' },
  { width: 1792, height: 1024, aspectRatio: '16:9', label: '1792x1024' },
  { width: 1024, height: 1792, aspectRatio: '9:16', label: '1024x1792' }
];

export const defaultQualities = [
  { id: 'standard', name: 'Standard', description: 'Standard quality', resolutionMultiplier: 1 },
  { id: 'hd', name: 'HD', description: 'High definition quality', resolutionMultiplier: 1.5 },
  { id: 'ultra', name: 'Ultra', description: 'Ultra high quality', resolutionMultiplier: 2 }
];

export const defaultStyles = [
  { id: 'natural', name: 'Natural', description: 'Natural style', promptModifiers: [] },
  { id: 'vivid', name: 'Vivid', description: 'Vivid style', promptModifiers: ['vibrant', 'colorful'] },
  { id: 'realistic', name: 'Realistic', description: 'Realistic style', promptModifiers: ['photorealistic', 'detailed'] },
  { id: 'artistic', name: 'Artistic', description: 'Artistic style', promptModifiers: ['artistic', 'creative'] }
];

// Error codes
export const ImageGenerationErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  GENERATION_ERROR: 'GENERATION_ERROR',
  UPSCALE_ERROR: 'UPSCALE_ERROR',
  VARIATION_ERROR: 'VARIATION_ERROR',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  CANCELLED: 'CANCELLED',
  TIMEOUT: 'TIMEOUT'
} as const;

// Event types
export const ImageGenerationEventTypes = [
  'initialization_start',
  'initialization_complete',
  'initialization_error',
  'generation_start',
  'generation_complete',
  'generation_error',
  'upscale_start',
  'upscale_complete',
  'upscale_error',
  'variation_start',
  'variation_complete',
  'variation_error'
] as const;

// Helper functions
export const validateImagePrompt = (prompt: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!prompt || prompt.trim().length === 0) {
    errors.push('Prompt is required');
  }

  if (prompt.length > 4000) {
    errors.push('Prompt is too long (max 4000 characters)');
  }

  if (prompt.includes('<script>') || prompt.includes('javascript:')) {
    errors.push('Prompt contains potentially malicious content');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export const calculateImageAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const sanitizePrompt = (prompt: string): string => {
  return prompt
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript protocols
    .replace(/data:/gi, '') // Remove data URLs
    .trim();
};

// Configuration presets
export const getConfigPreset = (preset: 'balanced' | 'quality' | 'speed'): Partial<ImageGenerationConfig> => {
  switch (preset) {
    case 'quality':
      return {
        defaultQuality: { id: 'ultra', name: 'Ultra', description: 'Ultra high quality', resolutionMultiplier: 2 },
        promptOptimization: {
          enabled: true,
          enhanceStyle: true,
          improveDetails: true,
          addArtisticTerms: true,
          optimizeComposition: true
        }
      };
    case 'speed':
      return {
        defaultQuality: { id: 'standard', name: 'Standard', description: 'Standard quality', resolutionMultiplier: 1 },
        promptOptimization: {
          enabled: false
        }
      };
    case 'balanced':
    default:
      return {
        defaultQuality: { id: 'hd', name: 'HD', description: 'High definition quality', resolutionMultiplier: 1.5 },
        promptOptimization: {
          enabled: true,
          enhanceStyle: true,
          improveDetails: true,
          addArtisticTerms: false,
          optimizeComposition: false
        }
      };
  }
};