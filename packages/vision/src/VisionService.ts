import { EventEmitter } from 'events';
import { createWorker } from 'tesseract.js';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

import {
  VisionRequest,
  VisionResult,
  VisionOptions,
  VisionError,
  OCRResult,
  ContentAnalysis,
  StructuredData,
  StructuredTemplate,
  VisionServiceConfig,
  VisionIPCContract
} from './types/VisionTypes';
import { VisionPromptService, VisionPromptConfig } from './VisionPromptService';
import { StructuredExtractionService, ExtractionConfig } from './StructuredExtractionService';
import { ImageProcessingService, ImageProcessingConfig } from './ImageProcessingService';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export interface VisionServiceDependencies {
  jobStore?: any; // JobStore instance for storing results
  captureService?: any; // CaptureService for accessing screenshots
  logger?: any; // Logger instance
  providers?: Map<string, any>; // LLM providers for analysis
}

export class VisionService extends EventEmitter {
  private config: Required<VisionServiceConfig>;
  private worker: any = null;
  private isInitialized = false;
  private cache = new Map<string, VisionResult>();
  private dependencies: VisionServiceDependencies;
  private promptService: VisionPromptService;
  private extractionService: StructuredExtractionService;
  private imageProcessingService: ImageProcessingService;

  constructor(
    dependencies: VisionServiceDependencies = {},
    config: Partial<VisionServiceConfig> = {}
  ) {
    super();
    this.dependencies = dependencies;

    this.config = {
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
      fallbackToOCR: true,
      ...config
    };

    // Initialize prompt service if providers are available
    this.promptService = new VisionPromptService(
      this.dependencies.providers || new Map(),
      {
        defaultProvider: 'openai',
        maxAnalysisTime: this.config.timeout,
        enableContextualAnalysis: true,
        enableMultiModalAnalysis: true,
        enableStructuredExtraction: this.config.enableStructuredExtraction
      }
    );

    // Initialize structured extraction service
    this.extractionService = new StructuredExtractionService({
      enableValidation: true,
      enableAutoCorrection: true,
      enableConfidenceScoring: true,
      enableFallbackExtraction: true,
      maxExtractionTime: this.config.timeout,
      confidenceThreshold: this.config.confidenceThreshold / 100,
      contextWindowSize: 100,
      similarityThreshold: 0.8
    });

    // Initialize image processing service
    this.imageProcessingService = new ImageProcessingService({
      maxImageSize: this.config.maxImageSize,
      maxDimensions: { width: 4096, height: 4096 },
      compressionQuality: 85,
      enableResizing: true,
      enableCompression: true,
      enableCaching: true,
      processingTimeout: this.config.timeout,
      fallbackToOCR: this.config.fallbackToOCR,
      ocrMaxSize: Math.min(this.config.maxImageSize * 0.5, 5 * 1024 * 1024) // 50% of max or 5MB
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.emit('progress', { stage: 'initialization', status: 'starting' });

      // Initialize Tesseract worker if OCR is enabled
      if (this.config.enableOCR) {
        this.emit('progress', { stage: 'initialization', status: 'initializing-ocr' });
        this.worker = await createWorker({
          langPath: path.join(__dirname, '..', 'tesseract-data'),
          logger: (m: any) => {
            if (this.dependencies.logger) {
              this.dependencies.logger.debug('Tesseract:', m);
            }
          }
        });

        // Load default language
        await this.worker.loadLanguage(this.config.defaultLanguage);
        await this.worker.initialize(this.config.defaultLanguage);
      }

      // Initialize prompt service for LLM-based analysis
      if (this.config.enableAnalysis && this.dependencies.providers && this.dependencies.providers.size > 0) {
        this.emit('progress', { stage: 'initialization', status: 'initializing-prompt-service' });
        await this.promptService.initialize();
      }

      // Ensure cache directory exists
      if (this.config.cacheResults) {
        const cacheDir = path.join(process.cwd(), '.atlas', 'vision-cache');
        await mkdir(cacheDir, { recursive: true });
      }

      this.isInitialized = true;
      this.emit('progress', { stage: 'initialization', status: 'completed' });
    } catch (error) {
      this.emit('error', { stage: 'initialization', error: error.message });
      throw new Error(`Failed to initialize VisionService: ${error.message}`);
    }
  }

  async analyze(request: VisionRequest): Promise<VisionResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.emit('progress', { stage: 'analysis', status: 'starting', requestId: request.id });

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      if (this.config.cacheResults) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.emit('progress', { stage: 'analysis', status: 'cache-hit', requestId: request.id });
          return cached;
        }
      }

      // Validate request
      this.validateRequest(request);

      // Process image data with handling for large images
      const imageProcessRequest = {
        id: `img_${request.id}`,
        imageData: request.imageData,
        options: {
          enableOCR: request.type !== 'analysis' && request.type !== 'structured_extraction',
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 85
        }
      };

      const imageProcessResult = await this.withTimeout(
        this.imageProcessingService.processImage(imageProcessRequest),
        this.config.timeout
      );

      if (!imageProcessResult.success) {
        throw new Error(`Image processing failed: ${imageProcessResult.error?.message}`);
      }

      const imageData = imageProcessResult.processedImage!.data;
      this.emit('progress', { stage: 'analysis', status: 'image-processed', requestId: request.id,
        processingMethod: imageProcessResult.metadata?.processingMethod,
        processingSteps: imageProcessResult.processingSteps });

      let result: VisionResult;

      // Prepare analysis options with image processing metadata
      const analysisOptions = {
        ...request.options,
        metadata: {
          ...request.options?.metadata,
          imageProcessing: imageProcessResult.metadata,
          originalImage: imageProcessResult.originalImage,
          ocrResult: imageProcessResult.ocrResult
        }
      };

      // Handle different analysis types
      switch (request.type) {
        case 'ocr':
          result = await this.performOCR(request.id, imageData, analysisOptions);
          break;
        case 'analysis':
          result = await this.performAnalysis(request.id, imageData, analysisOptions);
          break;
        case 'structured_extraction':
          result = await this.performStructuredExtraction(request.id, imageData, analysisOptions);
          break;
        default:
          throw new Error(`Unknown analysis type: ${request.type}`);
      }

      result.processingTime = Date.now() - startTime;
      result.timestamp = new Date();

      // Cache result if successful
      if (result.success && this.config.cacheResults) {
        await this.saveToCache(cacheKey, result);
      }

      this.emit('progress', { stage: 'analysis', status: 'completed', requestId: request.id, processingTime: result.processingTime });

      return result;

    } catch (error) {
      const errorResult: VisionResult = {
        id: request.id,
        type: request.type,
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error.message,
          timestamp: new Date()
        },
        processingTime: Date.now() - startTime,
        timestamp: new Date()
      };

      this.emit('error', { stage: 'analysis', error: error.message, requestId: request.id });

      return errorResult;
    }
  }

  private async performOCR(id: string, imageData: Buffer, options?: VisionOptions): Promise<VisionResult> {
    if (!this.config.enableOCR || !this.worker) {
      throw new Error('OCR is not enabled');
    }

    this.emit('progress', { stage: 'ocr', status: 'starting', requestId: id });

    try {
      // Check if we already have OCR results from image processing
      let existingOCRResult = null;
      if (options && options.metadata?.ocrResult) {
        existingOCRResult = options.metadata.ocrResult;
        this.emit('progress', { stage: 'ocr', status: 'using-existing-result', requestId: id });
      }

      // Prepare image for OCR
      const optimizedImage = await this.optimizeImageForOCR(imageData);
      this.emit('progress', { stage: 'ocr', status: 'image-optimized', requestId: id });

      // Set language if specified
      const language = options?.language || this.config.defaultLanguage;
      if (language !== this.config.defaultLanguage) {
        await this.worker.loadLanguage(language);
        await this.worker.initialize(language);
      }

      // Set OCR parameters for better accuracy
      const ocrParameters = {
        ...options,
        tessedit_pageseg_mode: options?.enablePageSegmentation !== false ? 1 : 6, // Auto vs single block
        tessedit_ocr_engine_mode: 3, // Default LSTM engine
        preserve_interword_spaces: '1',
        tessedit_char_whitelist: options?.charWhitelist,
        tessedit_char_blacklist: options?.charBlacklist,
        logger: (m: any) => {
          if (this.dependencies.logger) {
            this.dependencies.logger.debug('OCR Progress:', m);
          }
          this.emit('progress', {
            stage: 'ocr',
            status: 'processing',
            requestId: id,
            progress: m.progress,
            statusMessage: m.status
          });
        }
      };

      // Perform OCR with retry logic (unless we have existing results)
      let ocrResult;
      if (existingOCRResult) {
        ocrResult = { data: existingOCRResult };
        this.emit('progress', { stage: 'ocr', status: 'skipped-ocr-processing', requestId: id });
      } else {
        ocrResult = await this.withRetry(async () => {
          return await this.worker.recognize(optimizedImage, ocrParameters);
        });
      }

      // Post-process OCR results
      const processedText = this.postProcessOCRText(ocrResult.data.text);
      const textBlocks = this.parseOCRBlocks(ocrResult.data);
      const confidence = this.calculateOverallConfidence(ocrResult.data);

      // Extract additional metadata
      const wordConfidence = this.extractWordConfidence(ocrResult.data);
      const layoutInfo = this.analyzeLayout(textBlocks);

      const result: VisionResult = {
        id,
        type: 'ocr',
        success: confidence >= (options?.confidenceThreshold || this.config.confidenceThreshold),
        text: processedText,
        confidence,
        processingTime: 0, // Will be set by caller
        timestamp: new Date(),
        metadata: {
          language,
          blocks: textBlocks.length,
          words: ocrResult.data.words.length,
          confidence,
          wordConfidence,
          layoutInfo,
          originalText: ocrResult.data.text,
          processingParams: ocrParameters,
          ...options
        }
      };

      this.emit('progress', { stage: 'ocr', status: 'completed', requestId: id, confidence });

      return result;

    } catch (error) {
      this.emit('error', { stage: 'ocr', error: error.message, requestId: id });
      throw error;
    }
  }

  private async performAnalysis(id: string, imageData: Buffer, options?: VisionOptions): Promise<VisionResult> {
    if (!this.config.enableAnalysis) {
      throw new Error('Content analysis is not enabled');
    }

    this.emit('progress', { stage: 'analysis', status: 'starting', requestId: id });

    try {
      let ocrResult: VisionResult;
      let hasExistingOCR = false;

      // Check if we already have OCR results from image processing
      if (options?.metadata?.ocrResult) {
        hasExistingOCR = true;
        this.emit('progress', { stage: 'analysis', status: 'using-existing-ocr', requestId: id });

        // Create OCR result from existing data
        ocrResult = {
          id,
          type: 'ocr',
          success: true,
          text: options.metadata.ocrResult.text || '',
          confidence: options.metadata.ocrResult.confidence || 0,
          processingTime: 0,
          timestamp: new Date(),
          metadata: {
            language: 'eng',
            blocks: options.metadata.ocrResult.blocks?.length || 0,
            words: options.metadata.ocrResult.words?.length || 0,
            confidence: options.metadata.ocrResult.confidence || 0,
            ...options.metadata,
            processingMethod: options.metadata.imageProcessing?.processingMethod || 'existing'
          }
        };
      } else {
        // Perform OCR as base
        ocrResult = await this.performOCR(id, imageData, {
          ...options,
          confidenceThreshold: 50 // Lower threshold for analysis
        });
      }

      if (!ocrResult.success && !this.config.fallbackToOCR) {
        throw new Error('OCR failed and fallback is disabled');
      }

      // Analyze content using LLM providers
      const contentAnalysis: ContentAnalysis = await this.analyzeContentWithLLM(
        ocrResult.text || '',
        hasExistingOCR ? null : imageData, // Only pass image if we don't have existing OCR
        options
      );

      const result: VisionResult = {
        id,
        type: 'analysis',
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        analysis: contentAnalysis,
        processingTime: 0, // Will be set by caller
        timestamp: new Date(),
        metadata: {
          ...ocrResult.metadata,
          contentType: contentAnalysis.contentType,
          topics: contentAnalysis.topics.length,
          usedExistingOCR: hasExistingOCR,
          imageProcessing: options?.metadata?.imageProcessing
        }
      };

      this.emit('progress', { stage: 'analysis', status: 'completed', requestId: id });

      return result;

    } catch (error) {
      this.emit('error', { stage: 'analysis', error: error.message, requestId: id });
      throw error;
    }
  }

  private async performStructuredExtraction(id: string, imageData: Buffer, options?: VisionOptions): Promise<VisionResult> {
    if (!this.config.enableStructuredExtraction) {
      throw new Error('Structured extraction is not enabled');
    }

    if (!options?.templates || options.templates.length === 0) {
      throw new Error('No templates provided for structured extraction');
    }

    this.emit('progress', { stage: 'structured', status: 'starting', requestId: id });

    try {
      let ocrResult: VisionResult;
      let hasExistingOCR = false;

      // Check if we already have OCR results from image processing
      if (options?.metadata?.ocrResult) {
        hasExistingOCR = true;
        this.emit('progress', { stage: 'structured', status: 'using-existing-ocr', requestId: id });

        // Create OCR result from existing data
        ocrResult = {
          id,
          type: 'ocr',
          success: true,
          text: options.metadata.ocrResult.text || '',
          confidence: options.metadata.ocrResult.confidence || 0,
          processingTime: 0,
          timestamp: new Date(),
          metadata: {
            language: 'eng',
            blocks: options.metadata.ocrResult.blocks?.length || 0,
            words: options.metadata.ocrResult.words?.length || 0,
            confidence: options.metadata.ocrResult.confidence || 0,
            ...options.metadata,
            processingMethod: options.metadata.imageProcessing?.processingMethod || 'existing'
          }
        };
      } else {
        // Perform OCR as base
        ocrResult = await this.performOCR(id, imageData, {
          ...options,
          confidenceThreshold: 60
        });
      }

      if (!ocrResult.success && !this.config.fallbackToOCR) {
        throw new Error('OCR failed and fallback is disabled');
      }

      // Extract structured data using templates
      const structuredData = await this.extractStructuredData(
        ocrResult.text || '',
        options.templates,
        options
      );

      const result: VisionResult = {
        id,
        type: 'structured_extraction',
        success: structuredData.confidence >= (options?.confidenceThreshold || this.config.confidenceThreshold),
        text: ocrResult.text,
        confidence: structuredData.confidence,
        structured: structuredData,
        processingTime: 0, // Will be set by caller
        timestamp: new Date(),
        metadata: {
          ...ocrResult.metadata,
          templateId: structuredData.templateId,
          extractedFields: Object.keys(structuredData.fields).length,
          unmatchedItems: structuredData.unmatched.length,
          usedExistingOCR: hasExistingOCR,
          imageProcessing: options?.metadata?.imageProcessing
        }
      };

      this.emit('progress', { stage: 'structured', status: 'completed', requestId: id });

      return result;

    } catch (error) {
      this.emit('error', { stage: 'structured', error: error.message, requestId: id });
      throw error;
    }
  }

  private async analyzeContentWithLLM(text: string, imageData: Buffer, options?: VisionOptions): Promise<ContentAnalysis> {
    // Use the prompt service for LLM-based analysis
    if (!this.dependencies.providers || this.dependencies.providers.size === 0) {
      // Fallback to heuristic analysis if no providers available
      return this.fallbackHeuristicAnalysis(text);
    }

    try {
      const promptRequest = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text,
        imageData,
        analysisType: 'general' as const,
        provider: options?.provider,
        options,
        context: options?.context
      };

      const result = await this.promptService.analyzeContent(promptRequest);

      if (result.success && result.analysis) {
        return result.analysis;
      } else {
        console.warn('LLM analysis failed, falling back to heuristic analysis:', result.error?.message);
        return this.fallbackHeuristicAnalysis(text);
      }

    } catch (error) {
      console.warn('Error during LLM analysis, falling back to heuristic analysis:', error.message);
      return this.fallbackHeuristicAnalysis(text);
    }
  }

  private fallbackHeuristicAnalysis(text: string): ContentAnalysis {
    // Simple heuristic analysis for fallback
    const lines = text.split('\n').filter(line => line.trim());
    const words = text.split(/\s+/).filter(word => word.length > 0);

    let contentType: ContentAnalysis['contentType'] = 'text';

    // Heuristic content type detection
    if (text.includes('function') || text.includes('class') || text.includes('{') || text.includes('}')) {
      contentType = 'code';
    } else if (text.includes('---') || text.includes('===') || lines.length > 10) {
      contentType = 'document';
    } else if (words.length < 20 && lines.length < 5) {
      contentType = 'screenshot';
    } else if (text.includes('Name:') || text.includes('Email:') || text.includes('Phone:')) {
      contentType = 'form';
    }

    // Extract key elements (simple heuristic)
    const keyElements = this.extractKeyElements(text);

    return {
      contentType,
      summary: `Document contains ${lines.length} lines and ${words.length} words`,
      keyElements,
      topics: this.extractTopics(text),
      extractedData: {
        lineCount: lines.length,
        wordCount: words.length,
        hasCode: contentType === 'code',
        hasStructure: lines.some(line => line.includes('---') || line.includes('==='))
      }
    };
  }

  private async extractStructuredData(text: string, templates: StructuredTemplate[], options?: VisionOptions): Promise<StructuredData> {
    if (templates.length === 0) {
      throw new Error('No templates provided for structured extraction');
    }

    try {
      // Use the best template based on content matching
      const bestTemplate = this.findBestTemplate(text, templates);

      const extractionRequest = {
        id: `extraction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text,
        template: bestTemplate,
        options: {
          provider: options?.provider,
          enableValidation: true,
          enableAutoCorrection: true,
          confidenceThreshold: (options?.confidenceThreshold || this.config.confidenceThreshold) / 100
        },
        context: options?.context
      };

      const result = await this.extractionService.extractStructuredData(extractionRequest);

      if (result.success && result.data) {
        return result.data;
      } else {
        // Fallback to simple extraction
        return this.fallbackStructuredExtraction(text, bestTemplate);
      }

    } catch (error) {
      console.warn('Structured extraction failed, using fallback:', error.message);
      const fallbackTemplate = templates[0];
      return this.fallbackStructuredExtraction(text, fallbackTemplate);
    }
  }

  private findBestTemplate(text: string, templates: StructuredTemplate[]): StructuredTemplate {
    let bestTemplate = templates[0];
    let bestScore = 0;

    for (const template of templates) {
      let score = 0;
      const lowerText = text.toLowerCase();

      // Score based on template fields
      for (const field of template.fields) {
        const fieldName = field.name.toLowerCase();
        const fieldDesc = field.description?.toLowerCase() || '';

        if (lowerText.includes(fieldName) || lowerText.includes(fieldDesc)) {
          score += 10;
        }

        // Additional scoring based on field types and text patterns
        switch (field.type) {
          case 'email':
            if (lowerText.includes('@') && lowerText.includes('.com')) score += 5;
            break;
          case 'phone':
            if (/\d{3}[\s-]?\d{3}[\s-]?\d{4}/.test(text)) score += 5;
            break;
          case 'date':
            if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text)) score += 3;
            break;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }

    return bestTemplate;
  }

  private fallbackStructuredExtraction(text: string, template: StructuredTemplate): StructuredData {
    const fields: Record<string, any> = {};

    // Simple regex-based extraction as fallback
    for (const field of template.fields) {
      try {
        let value = null;
        let confidence = 0.5;

        switch (field.type) {
          case 'email':
            const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
            if (emailMatch) {
              value = emailMatch[1];
              confidence = 0.9;
            }
            break;
          case 'phone':
            const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
            if (phoneMatch) {
              value = phoneMatch[1];
              confidence = 0.8;
            }
            break;
          case 'name':
            const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
            if (nameMatch) {
              value = nameMatch[1];
              confidence = 0.7;
            }
            break;
          default:
            // Look for field name in text
            const fieldIndex = text.toLowerCase().indexOf(field.name.toLowerCase());
            if (fieldIndex !== -1) {
              const afterField = text.substring(fieldIndex + field.name.length);
              const valueMatch = afterField.match(/[:\s]+([^\n\r]+)/);
              if (valueMatch) {
                value = valueMatch[1].trim();
                confidence = 0.6;
              }
            }
        }

        if (value) {
          fields[field.id] = {
            value,
            confidence,
            extractedFrom: 'fallback',
            validation: this.validateFieldValue(value, field)
          };
        }
      } catch (error) {
        // Skip field on error
      }
    }

    return {
      templateId: template.id,
      confidence: Object.keys(fields).length > 0 ? 0.6 : 0.1,
      fields,
      unmatched: this.findUnmatchedText(text, fields, template)
    };
  }

  private findUnmatchedText(text: string, fields: Record<string, any>, template: any): string[] {
    // Simple implementation: find text that doesn't match any extracted fields
    const extractedValues = Object.values(fields).map(f => f.value?.toString() || '');
    const unmatched: string[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !extractedValues.some(value => value.includes(trimmed))) {
        unmatched.push(trimmed);
      }
    }

    return unmatched.slice(0, 10); // Limit to 10 unmatched items
  }

  private extractKeyElements(text: string): string[] {
    const elements: string[] = [];

    // Extract potential headings (all caps or title case)
    const lines = text.split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && (trimmed === trimmed.toUpperCase() || /^[A-Z][a-z]+ [A-Z][a-z]+/.test(trimmed))) {
        elements.push(trimmed);
      }
    });

    // Extract potential code blocks
    const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
    elements.push(...codeBlocks);

    return elements.slice(0, 10); // Limit to 10 elements
  }

  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // Simple keyword-based topic extraction
    const topicKeywords = {
      'technical': ['code', 'function', 'class', 'api', 'database', 'server'],
      'business': ['meeting', 'project', 'deadline', 'client', 'revenue'],
      'personal': ['personal', 'private', 'family', 'home', 'health'],
      'documentation': ['readme', 'documentation', 'guide', 'manual', 'instructions']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }

  private parseOCRBlocks(data: any): any[] {
    // Parse Tesseract OCR blocks into our format
    const blocks: any[] = [];

    if (data.blocks) {
      data.blocks.forEach((block: any) => {
        const blockData = {
          text: block.text,
          confidence: block.confidence,
          boundingBox: {
            x: block.bbox.x0,
            y: block.bbox.y0,
            width: block.bbox.x1 - block.bbox.x0,
            height: block.bbox.y1 - block.bbox.y0
          },
          lines: block.lines.map((line: any) => ({
            text: line.text,
            confidence: line.confidence,
            boundingBox: {
              x: line.bbox.x0,
              y: line.bbox.y0,
              width: line.bbox.x1 - line.bbox.x0,
              height: line.bbox.y1 - line.bbox.y0
            },
            words: line.words.map((word: any) => ({
              text: word.text,
              confidence: word.confidence,
              boundingBox: {
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0
              }
            }))
          }))
        };
        blocks.push(blockData);
      });
    }

    return blocks;
  }

  private async prepareImageData(imageData: Buffer | string): Promise<Buffer> {
    if (Buffer.isBuffer(imageData)) {
      return imageData;
    }

    if (typeof imageData === 'string') {
      // Handle base64 string
      if (imageData.startsWith('data:image')) {
        const base64Data = imageData.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      }

      // Handle file path
      if (fs.existsSync(imageData)) {
        return await readFile(imageData);
      }
    }

    throw new Error('Invalid image data format');
  }

  private validateRequest(request: VisionRequest): void {
    if (!request.id || typeof request.id !== 'string') {
      throw new Error('Request ID is required');
    }

    if (!request.type || !['ocr', 'analysis', 'structured_extraction'].includes(request.type)) {
      throw new Error('Invalid analysis type');
    }

    if (!request.imageData) {
      throw new Error('Image data is required');
    }
  }

  private generateCacheKey(request: VisionRequest): string {
    const hash = require('crypto').createHash('sha256');
    hash.update(request.id);
    hash.update(request.type);

    if (Buffer.isBuffer(request.imageData)) {
      hash.update(request.imageData);
    } else {
      hash.update(request.imageData.toString());
    }

    if (request.options) {
      hash.update(JSON.stringify(request.options));
    }

    return hash.digest('hex');
  }

  private getFromCache(key: string): VisionResult | null {
    if (!this.config.cacheResults) {
      return null;
    }

    const cached = this.cache.get(key);
    if (cached) {
      // Check TTL
      if (Date.now() - cached.timestamp.getTime() > this.config.cacheTTL) {
        this.cache.delete(key);
        return null;
      }
      return cached;
    }

    return null;
  }

  private async saveToCache(key: string, result: VisionResult): Promise<void> {
    if (!this.config.cacheResults) {
      return;
    }

    this.cache.set(key, result);

    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  private async optimizeImageForOCR(imageData: Buffer): Promise<Buffer> {
    // In a real implementation, this would use image processing libraries like Sharp
    // For now, return the original data, but here's what would be done:

    // 1. Convert to grayscale for better text recognition
    // 2. Apply noise reduction
    // 3. Adjust contrast and brightness
    // 4. Remove skew/deskew the image
    // 5. Resize to optimal DPI (300 DPI is ideal for OCR)
    // 6. Apply thresholding for better text clarity

    return imageData;
  }

  private postProcessOCRText(text: string): string {
    if (!text) return '';

    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR errors
      .replace(/\|/g, 'I')          // Pipe to capital I
      .replace(/0/g, 'O')           // Zero to capital O (context dependent)
      .replace(/1/g, 'l')           // One to lowercase L (context dependent)
      .replace(/\[\]/g, '[]')        // Fix bracket spacing
      .replace(/\(\)/g, '()')        // Fix parenthesis spacing
      // Remove empty lines and normalize line endings
      .replace(/\n\s*\n/g, '\n\n')
      .replace(/\r\n/g, '\n')
      // Clean up quotes
      .replace(/''/g, '"')
      .replace(/``/g, '"')
      .trim();
  }

  private calculateOverallConfidence(data: any): number {
    if (!data.confidence) return 0;

    // Calculate weighted confidence based on words and blocks
    let totalConfidence = 0;
    let confidenceCount = 0;

    // Include word-level confidence
    if (data.words && data.words.length > 0) {
      const wordConfidence = data.words.reduce((sum: number, word: any) => sum + (word.confidence || 0), 0);
      totalConfidence += wordConfidence / data.words.length * 0.7; // 70% weight
      confidenceCount++;
    }

    // Include block-level confidence
    if (data.blocks && data.blocks.length > 0) {
      const blockConfidence = data.blocks.reduce((sum: number, block: any) => sum + (block.confidence || 0), 0);
      totalConfidence += blockConfidence / data.blocks.length * 0.3; // 30% weight
      confidenceCount++;
    }

    // Fallback to overall confidence
    if (confidenceCount === 0) {
      return data.confidence;
    }

    return Math.round(totalConfidence);
  }

  private extractWordConfidence(data: any): { average: number; min: number; max: number; distribution: number[] } {
    if (!data.words || data.words.length === 0) {
      return { average: 0, min: 0, max: 0, distribution: [] };
    }

    const confidences = data.words.map((word: any) => word.confidence || 0);
    const average = confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length;
    const min = Math.min(...confidences);
    const max = Math.max(...confidences);

    // Create confidence distribution (0-10, 10-20, ..., 90-100)
    const distribution = new Array(10).fill(0);
    confidences.forEach(conf => {
      const bucket = Math.min(Math.floor(conf / 10), 9);
      distribution[bucket]++;
    });

    return {
      average: Math.round(average),
      min,
      max,
      distribution
    };
  }

  private analyzeLayout(blocks: any[]): { columns: number; rows: number; density: number; isTable: boolean } {
    if (blocks.length === 0) {
      return { columns: 0, rows: 0, density: 0, isTable: false };
    }

    // Analyze block positions to determine layout
    const xPositions = blocks.map(block => block.boundingBox?.x || 0).filter(x => x > 0);
    const yPositions = blocks.map(block => block.boundingBox?.y || 0).filter(y => y > 0);

    // Estimate columns based on x-position clustering
    const uniqueXPositions = [...new Set(xPositions.map(x => Math.round(x / 50) * 50))];
    const columns = uniqueXPositions.length;

    // Estimate rows based on y-position clustering
    const uniqueYPositions = [...new Set(yPositions.map(y => Math.round(y / 30) * 30))];
    const rows = uniqueYPositions.length;

    // Calculate text density
    const totalText = blocks.reduce((sum, block) => sum + (block.text?.length || 0), 0);
    const density = totalText / (columns * rows || 1);

    // Simple table detection heuristic
    const isTable = columns > 1 && rows > 1 && density > 10;

    return {
      columns,
      rows,
      density: Math.round(density),
      isTable
    };
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.config.maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
      })
    ]);
  }

  async getCapabilities(): Promise<{ ocr: boolean; analysis: boolean; structured: boolean; languages: string[] }> {
    return {
      ocr: this.config.enableOCR,
      analysis: this.config.enableAnalysis,
      structured: this.config.enableStructuredExtraction,
      languages: [this.config.defaultLanguage] // In real implementation, query available languages
    };
  }

  async clearCache(): Promise<boolean> {
    this.cache.clear();
    return true;
  }

  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }

    this.cache.clear();
    this.isInitialized = false;
  }

  getConfig(): VisionServiceConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<VisionServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private validateFieldValue(value: any, field: any): { valid: boolean; message?: string } {
    if (field.required && (value === null || value === undefined || value === '')) {
      return { valid: false, message: `${field.name} is required` };
    }

    switch (field.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { valid: false, message: 'Invalid email format' };
        }
        break;
      case 'url':
        if (value) {
          try {
            new URL(value);
          } catch {
            return { valid: false, message: 'Invalid URL format' };
          }
        }
        break;
      case 'number':
        if (value && isNaN(Number(value))) {
          return { valid: false, message: 'Invalid number format' };
        }
        break;
    }

    return { valid: true };
  }
}