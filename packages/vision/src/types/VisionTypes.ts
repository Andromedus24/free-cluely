export interface VisionRequest {
  id: string;
  type: 'ocr' | 'analysis' | 'structured_extraction';
  imageData: Buffer | string; // Buffer or base64 string
  options?: VisionOptions;
  metadata?: Record<string, any>;
}

export interface VisionOptions {
  language?: string;
  extractText?: boolean;
  analyzeContent?: boolean;
  extractStructured?: boolean;
  confidenceThreshold?: number;
  templates?: StructuredTemplate[];
  maxRetries?: number;
  timeout?: number;
  metadata?: {
    imageProcessing?: any;
    originalImage?: any;
    ocrResult?: any;
    [key: string]: any;
  };
  provider?: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  context?: any;
  enablePageSegmentation?: boolean;
  charWhitelist?: string;
  charBlacklist?: string;
}

export interface VisionResult {
  id: string;
  type: 'ocr' | 'analysis' | 'structured_extraction';
  success: boolean;
  text?: string;
  confidence?: number;
  structured?: StructuredData;
  analysis?: ContentAnalysis;
  error?: VisionError;
  processingTime: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface VisionError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: TextBlock[];
  language?: string;
}

export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  lines: TextLine[];
}

export interface TextLine {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  words: TextWord[];
}

export interface TextWord {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContentAnalysis {
  contentType: 'text' | 'code' | 'diagram' | 'form' | 'screenshot' | 'document' | 'structured';
  summary: string;
  keyElements: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics: string[];
  extractedData?: Record<string, any>;
}

export interface StructuredTemplate {
  id: string;
  name: string;
  description: string;
  fields: TemplateField[];
  validation?: ValidationRule[];
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'email' | 'url' | 'select' | 'phone' | 'name';
  required: boolean;
  description?: string;
  extraction: ExtractionRule;
}

export interface ExtractionRule {
  method: 'regex' | 'position' | 'ml' | 'keyword' | 'hybrid';
  pattern?: string;
  position?: BoundingBox;
  keywords?: string[];
  confidence: number;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  pattern?: string;
  min?: number;
  max?: number;
  custom?: string; // validation function name
}

export interface StructuredData {
  templateId: string;
  confidence: number;
  fields: Record<string, {
    value: any;
    confidence: number;
    extractedFrom: string;
    validation?: {
      valid: boolean;
      message?: string;
    };
  }>;
  unmatched: string[];
}

export interface ImageProcessingConfig {
  maxImageSize: number; // Maximum image size in bytes
  maxDimensions: { width: number; height: number }; // Maximum dimensions
  compressionQuality: number; // JPEG/WebP quality (0-100)
  enableResizing: boolean;
  enableCompression: boolean;
  enableCaching: boolean;
  cacheDir: string;
  maxCacheAge: number; // Cache age in milliseconds
  processingTimeout: number; // Maximum processing time per image
  fallbackToOCR: boolean;
  ocrMaxSize: number; // Maximum size for OCR processing
}

export interface ImageProcessRequest {
  id: string;
  imageData: Buffer | string;
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    enableOCR?: boolean;
    skipProcessing?: boolean;
  };
}

export interface ImageProcessResult {
  id: string;
  success: boolean;
  processedImage?: {
    data: Buffer;
    format: string;
    width: number;
    height: number;
    size: number;
    hash: string;
  };
  originalImage?: {
    format: string;
    width: number;
    height: number;
    size: number;
    hash: string;
  };
  ocrResult?: any;
  processingTime: number;
  processingSteps: string[];
  warnings?: string[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    compressionRatio?: number;
    resizeRatio?: number;
    processingMethod: 'original' | 'resized' | 'compressed' | 'ocr-fallback';
    cached: boolean;
  };
}

export interface VisionServiceConfig {
  enableOCR: boolean;
  enableAnalysis: boolean;
  enableStructuredExtraction: boolean;
  defaultLanguage: string;
  confidenceThreshold: number;
  maxImageSize: number; // in bytes
  timeout: number;
  cacheResults: boolean;
  cacheTTL: number; // in milliseconds
  maxRetries: number;
  fallbackToOCR: boolean;
}

export interface VisionIPCContract {
  'vision-analyze': { input: VisionRequest; output: VisionResult };
  'vision-ocr': { input: { imageData: Buffer | string; options?: Omit<VisionOptions, 'analyzeContent' | 'extractStructured'> }; output: VisionResult };
  'vision-extract-structured': { input: { imageData: Buffer | string; templateId: string; options?: VisionOptions }; output: VisionResult };
  'vision-get-templates': { input: void; output: StructuredTemplate[] };
  'vision-get-capabilities': { input: void; output: { ocr: boolean; analysis: boolean; structured: boolean; languages: string[] } };
  'vision-clear-cache': { input: void; output: boolean };
}