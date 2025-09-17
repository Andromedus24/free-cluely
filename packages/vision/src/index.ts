// Main exports
export { VisionService } from './VisionService';
export { VisionIPCService, VisionIPCRendererClient, createVisionIPC } from './VisionIPCService';
export { VisionPromptService, VisionPromptConfig } from './VisionPromptService';
export { StructuredExtractionService, ExtractionConfig } from './StructuredExtractionService';
export { ImageProcessingService } from './ImageProcessingService';

// Type exports
export * from './types/VisionTypes';

// Config types
export type {
  VisionServiceConfig,
  StructuredTemplate,
  TemplateField,
  ExtractionRule,
  ValidationRule,
  ImageProcessingConfig,
  ImageProcessRequest,
  ImageProcessResult
} from './types/VisionTypes';

// Default configurations
export const DEFAULT_VISION_CONFIG = {
  enableOCR: true,
  enableAnalysis: true,
  enableStructuredExtraction: true,
  defaultLanguage: 'eng',
  confidenceThreshold: 70,
  maxImageSize: 10 * 1024 * 1024, // 10MB
  timeout: 30000,
  cacheResults: true,
  cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxRetries: 3,
  fallbackToOCR: true
};

export const DEFAULT_OCR_CONFIG = {
  language: 'eng',
  confidenceThreshold: 70,
  preprocessImage: true,
  enableAutoRotation: true,
  enablePageSegmentation: true
};

export const DEFAULT_ANALYSIS_CONFIG = {
  enableContentAnalysis: true,
  enableTopicExtraction: true,
  enableEntityRecognition: true,
  enableSentimentAnalysis: true,
  maxAnalysisTime: 10000,
  promptTemplate: `Analyze the following text extracted from an image and provide:
1. Content type (document, code, form, screenshot, etc.)
2. Brief summary
3. Key elements or important information
4. Main topics
5. Any structured data that can be extracted

Text: {text}`
};

export const DEFAULT_STRUCTURED_CONFIG = {
  enableValidation: true,
  enableAutoCorrection: true,
  fallbackToUnmatched: true,
  confidenceThreshold: 0.7,
  validationRules: [
    {
      field: 'email',
      type: 'format',
      pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
    },
    {
      field: 'phone',
      type: 'format',
      pattern: '^\\+?\\d{1,3}[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}$'
    }
  ]
};

// Utility functions
export const createVisionService = (dependencies?: any, config?: Partial<typeof DEFAULT_VISION_CONFIG>) => {
  const { VisionService } = require('./VisionService');
  return new VisionService(dependencies, config);
};

// Validation helpers
export const validateVisionRequest = (request: any): boolean => {
  if (!request || typeof request !== 'object') return false;

  if (!request.id || typeof request.id !== 'string') return false;

  if (!request.type || !['ocr', 'analysis', 'structured_extraction'].includes(request.type)) return false;

  if (!request.imageData) return false;

  // Validate image data
  if (!Buffer.isBuffer(request.imageData) && typeof request.imageData !== 'string') return false;

  // Validate options if provided
  if (request.options) {
    if (typeof request.options !== 'object') return false;

    if (request.options.confidenceThreshold !== undefined &&
        (request.options.confidenceThreshold < 0 || request.options.confidenceThreshold > 100)) return false;

    if (request.options.timeout !== undefined && request.options.timeout < 0) return false;

    if (request.options.maxRetries !== undefined &&
        (request.options.maxRetries < 0 || request.options.maxRetries > 10)) return false;
  }

  return true;
};

export const validateVisionOptions = (options: any): boolean => {
  if (!options || typeof options !== 'object') return true; // Options are optional

  if (options.language !== undefined && typeof options.language !== 'string') return false;

  if (options.confidenceThreshold !== undefined &&
      (options.confidenceThreshold < 0 || options.confidenceThreshold > 100)) return false;

  if (options.timeout !== undefined && options.timeout < 0) return false;

  if (options.maxRetries !== undefined &&
      (options.maxRetries < 0 || options.maxRetries > 10)) return false;

  if (options.templates !== undefined && !Array.isArray(options.templates)) return false;

  return true;
};

export const validateStructuredTemplate = (template: any): boolean => {
  if (!template || typeof template !== 'object') return false;

  if (!template.id || typeof template.id !== 'string') return false;

  if (!template.name || typeof template.name !== 'string') return false;

  if (!template.fields || !Array.isArray(template.fields)) return false;

  // Validate fields
  for (const field of template.fields) {
    if (!field.id || typeof field.id !== 'string') return false;

    if (!field.name || typeof field.name !== 'string') return false;

    if (!field.type || !['text', 'number', 'date', 'email', 'url', 'select'].includes(field.type)) return false;

    if (typeof field.required !== 'boolean') return false;

    if (!field.extraction || typeof field.extraction !== 'object') return false;

    if (!field.extraction.method || !['regex', 'position', 'ml', 'keyword'].includes(field.extraction.method)) return false;

    if (field.extraction.confidence === undefined ||
        field.extraction.confidence < 0 || field.extraction.confidence > 1) return false;
  }

  // Validate validation rules if provided
  if (template.validation && !Array.isArray(template.validation)) return false;

  if (template.validation) {
    for (const rule of template.validation) {
      if (!rule.field || typeof rule.field !== 'string') return false;

      if (!rule.type || !['required', 'format', 'range', 'custom'].includes(rule.type)) return false;
    }
  }

  return true;
};

// Image preprocessing utilities
export const preprocessImage = async (imageData: Buffer): Promise<Buffer> => {
  // In a real implementation, this would use image processing libraries
  // For now, return the original data
  return imageData;
};

export const optimizeImageForOCR = async (imageData: Buffer): Promise<Buffer> => {
  // In a real implementation, this would:
  // 1. Convert to grayscale
  // 2. Apply noise reduction
  // 3. Adjust contrast
  // 4. Resize to optimal dimensions
  // For now, return the original data
  return imageData;
};

// Text processing utilities
export const cleanOCRText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/\|/g, 'I')   // Common OCR error
    .replace(/0/g, 'O')    // Common OCR error (context dependent)
    .trim();
};

export const extractTextConfidence = (ocrResult: any): number => {
  if (!ocrResult || !ocrResult.data) return 0;
  return ocrResult.data.confidence || 0;
};

// Template matching utilities
export const findBestTemplate = (text: string, templates: any[]): any => {
  // Simple scoring based on keyword matching
  let bestTemplate = templates[0];
  let bestScore = 0;

  for (const template of templates) {
    let score = 0;
    const lowerText = text.toLowerCase();

    // Score based on template keywords or field descriptions
    for (const field of template.fields) {
      const fieldName = field.name.toLowerCase();
      const fieldDesc = field.description?.toLowerCase() || '';

      if (lowerText.includes(fieldName) || lowerText.includes(fieldDesc)) {
        score += 10;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestTemplate = template;
    }
  }

  return bestTemplate;
};

// Error handling utilities
export const createVisionError = (code: string, message: string, details?: any): any => {
  return {
    code,
    message,
    details,
    timestamp: new Date()
  };
};

export const isVisionError = (error: any): boolean => {
  return error && error.code && error.message && error.timestamp;
};

export const getVisionErrorMessage = (error: any): string => {
  if (!isVisionError(error)) return 'Unknown vision error';
  return error.message;
};

// Performance monitoring
export const createVisionPerformanceTracker = () => {
  const operations = new Map<string, { startTime: number; endTime?: number; stages: any[] }>();

  return {
    start: (operationId: string, stage?: string) => {
      operations.set(operationId, {
        startTime: Date.now(),
        stages: stage ? [{ stage, startTime: Date.now() }] : []
      });
    },

    end: (operationId: string) => {
      const op = operations.get(operationId);
      if (op) {
        op.endTime = Date.now();
        return {
          duration: op.endTime - op.startTime,
          stages: op.stages
        };
      }
      return null;
    },

    addStage: (operationId: string, stage: string) => {
      const op = operations.get(operationId);
      if (op) {
        op.stages.push({ stage, startTime: Date.now() });
      }
    },

    getStats: () => {
      const stats: any = {};
      operations.forEach((op, id) => {
        stats[id] = {
          duration: op.endTime ? op.endTime - op.startTime : Date.now() - op.startTime,
          completed: !!op.endTime,
          stages: op.stages.length
        };
      });
      return stats;
    }
  };
};

// Version info
export const VISION_VERSION = '1.0.0';

// Error codes
export const VISION_ERROR_CODES = {
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR',
  OCR_NOT_ENABLED: 'OCR_NOT_ENABLED',
  ANALYSIS_NOT_ENABLED: 'ANALYSIS_NOT_ENABLED',
  STRUCTURED_NOT_ENABLED: 'STRUCTURED_NOT_ENABLED',
  INVALID_IMAGE_DATA: 'INVALID_IMAGE_DATA',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  OCR_FAILED: 'OCR_FAILED',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  IPC_ERROR: 'IPC_ERROR'
} as const;