import { Plugin, PluginBus, ConfigManager, Logger, PluginError, VisionRequest, VisionResponse, CancellationToken } from '@free-cluely/shared';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

interface VisionPluginConfig {
  geminiApiKey?: string;
  defaultModel: string;
  maxImageSize: number;
  enableOCR: boolean;
  enableTextExtraction: boolean;
  enableObjectDetection: boolean;
  retryAttempts: number;
  timeoutMs: number;
}

interface AnalysisResult {
  text?: string;
  objects?: Array<{
    label: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  analysis?: {
    summary: string;
    keyPoints: string[];
    sentiment?: string;
    categories: string[];
  };
  ocrText?: string;
  metadata: {
    processingTime: number;
    model: string;
    imageSize: {
      width: number;
      height: number;
    };
    format: string;
  };
}

export class VisionPlugin implements Plugin {
  name = 'vision-plugin';
  version = '1.0.0';
  permissions = ['screen', 'network'];

  private config: VisionPluginConfig;
  private logger: Logger;
  private bus: PluginBus;
  private genAI: GoogleGenerativeAI | null = null;
  private ocrWorker: any = null;
  private isInitialized = false;

  constructor(config: Partial<VisionPluginConfig> = {}) {
    this.config = {
      defaultModel: 'gemini-pro-vision',
      maxImageSize: 10 * 1024 * 1024, // 10MB
      enableOCR: true,
      enableTextExtraction: true,
      enableObjectDetection: true,
      retryAttempts: 3,
      timeoutMs: 30000,
      ...config
    };
  }

  async initialize(bus: PluginBus, configManager: ConfigManager, logger: Logger): Promise<void> {
    this.bus = bus;
    this.logger = logger;

    try {
      // Load configuration
      const pluginConfig = configManager.get('vision') as VisionPluginConfig;
      if (pluginConfig) {
        this.config = { ...this.config, ...pluginConfig };
      }

      // Initialize Gemini AI
      if (this.config.geminiApiKey) {
        this.genAI = new GoogleGenerativeAI(this.config.geminiApiKey);
        this.logger.info('Initialized Gemini AI for vision analysis');
      } else {
        this.logger.warn('No Gemini API key provided. Vision analysis will be limited.');
      }

      // Initialize OCR worker if enabled
      if (this.config.enableOCR) {
        try {
          this.ocrWorker = await createWorker();
          await this.ocrWorker.loadLanguage('eng');
          await this.ocrWorker.initialize('eng');
          this.logger.info('Initialized OCR worker');
        } catch (error) {
          this.logger.error('Failed to initialize OCR worker:', error);
          this.config.enableOCR = false;
        }
      }

      // Register plugin methods
      this.registerPluginMethods();

      this.isInitialized = true;
      this.logger.info('VisionPlugin initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize VisionPlugin:', error);
      throw new PluginError('INITIALIZATION_FAILED', 'Failed to initialize vision plugin');
    }
  }

  private registerPluginMethods(): void {
    // Register IPC handlers
    this.bus.on('vision:analyzeImage', async (data: VisionRequest) => {
      try {
        const result = await this.analyzeImage(data);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Failed to analyze image:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('vision:extractText', async (data: { image: string | Buffer }) => {
      try {
        const result = await this.extractText(data.image);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Failed to extract text:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('vision:detectObjects', async (data: { image: string | Buffer }) => {
      try {
        const result = await this.detectObjects(data.image);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Failed to detect objects:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('vision:processScreenshot', async (data: { image: string | Buffer; type: string }) => {
      try {
        const result = await this.processScreenshot(data.image, data.type);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Failed to process screenshot:', error);
        return { success: false, error: error.message };
      }
    });
  }

  async analyzeImage(request: VisionRequest, cancellationToken?: CancellationToken): Promise<VisionResponse> {
    const startTime = Date.now();

    try {
      cancellationToken?.throwIfCancelled();

      // Prepare image
      const imageBuffer = await this.prepareImage(request.image);
      const imageMetadata = await this.getImageMetadata(imageBuffer);

      cancellationToken?.throwIfCancelled();

      // Perform analysis based on available services
      const result: AnalysisResult = {
        metadata: {
          processingTime: 0,
          model: this.config.defaultModel,
          imageSize: imageMetadata.size,
          format: imageMetadata.format
        }
      };

      // OCR text extraction
      if (this.config.enableOCR && this.ocrWorker) {
        try {
          const ocrResult = await this.performOCR(imageBuffer);
          result.ocrText = ocrResult.text;
        } catch (error) {
          this.logger.warn('OCR failed:', error);
        }
      }

      cancellationToken?.throwIfCancelled();

      // Gemini vision analysis
      if (this.genAI) {
        try {
          const analysisResult = await this.performGeminiAnalysis(imageBuffer, request.prompt);
          result.analysis = analysisResult;
        } catch (error) {
          this.logger.warn('Gemini analysis failed:', error);
        }
      }

      cancellationToken?.throwIfCancelled();

      // Basic text extraction from image
      if (this.config.enableTextExtraction && !result.ocrText) {
        try {
          const textResult = await this.extractBasicText(imageBuffer);
          result.text = textResult;
        } catch (error) {
          this.logger.warn('Text extraction failed:', error);
        }
      }

      result.metadata.processingTime = Date.now() - startTime;

      return {
        text: result.analysis?.summary || result.text || result.ocrText || '',
        json: {
          analysis: result.analysis,
          ocrText: result.ocrText,
          metadata: result.metadata
        },
        confidence: this.calculateConfidence(result),
        timestamp: Date.now()
      };

    } catch (error) {
      if (error instanceof Error && error.message === 'CANCELLED') {
        throw new PluginError('CANCELLED', 'Image analysis was cancelled');
      }
      throw new PluginError('ANALYSIS_FAILED', `Failed to analyze image: ${error.message}`);
    }
  }

  private async prepareImage(image: string | Buffer): Promise<Buffer> {
    let buffer: Buffer;

    if (typeof image === 'string') {
      if (image.startsWith('data:')) {
        // Base64 data URL
        const base64Data = image.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        // File path
        const fs = await import('fs');
        buffer = fs.readFileSync(image);
      }
    } else {
      buffer = image;
    }

    // Resize image if too large
    const metadata = await sharp(buffer).metadata();
    if (metadata.size && metadata.size > this.config.maxImageSize) {
      const scale = Math.sqrt(this.config.maxImageSize / metadata.size);
      const newWidth = Math.floor((metadata.width || 0) * scale);
      const newHeight = Math.floor((metadata.height || 0) * scale);

      buffer = await sharp(buffer)
        .resize(newWidth, newHeight, { fit: 'inside' })
        .jpeg({ quality: 85 })
        .toBuffer();
    }

    return buffer;
  }

  private async getImageMetadata(buffer: Buffer): Promise<{
    size: { width: number; height: number };
    format: string;
  }> {
    const metadata = await sharp(buffer).metadata();
    return {
      size: {
        width: metadata.width || 0,
        height: metadata.height || 0
      },
      format: metadata.format || 'unknown'
    };
  }

  private async performOCR(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    if (!this.ocrWorker) {
      throw new Error('OCR worker not initialized');
    }

    // Implement retry logic for OCR
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('OCR timeout')), this.config.timeoutMs);
        });

        const result = await Promise.race([
          this.ocrWorker.recognize(imageBuffer),
          timeoutPromise
        ]) as any;

        return {
          text: result.data.text,
          confidence: result.data.confidence
        };

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`OCR attempt ${attempt} failed:`, error);

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new PluginError('OCR_FAILED', `OCR failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  private async performGeminiAnalysis(imageBuffer: Buffer, prompt?: string): Promise<{
    summary: string;
    keyPoints: string[];
    sentiment?: string;
    categories: string[];
  }> {
    if (!this.genAI) {
      throw new Error('Gemini AI not initialized');
    }

    const model = this.genAI.getGenerativeModel({ model: this.config.defaultModel });

    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: 'image/jpeg'
      }
    };

    const defaultPrompt = prompt || 'Analyze this image and provide a comprehensive summary including key elements, text content, and any notable features. Structure your response as JSON with summary, keyPoints, sentiment, and categories fields.';

    // Implement retry logic with exponential backoff
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.config.timeoutMs);
        });

        const result = await Promise.race([
          model.generateContent([defaultPrompt, imagePart]),
          timeoutPromise
        ]) as any;

        const response = await result.response;
        const text = response.text();

        // Parse structured response
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (error) {
          this.logger.warn('Failed to parse Gemini JSON response:', error);
        }

        // Fallback to text analysis
        return {
          summary: text,
          keyPoints: [],
          categories: ['general'],
          sentiment: 'neutral'
        };

      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Gemini analysis attempt ${attempt} failed:`, error);

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new PluginError('GEMINI_ANALYSIS_FAILED', `Failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
  }

  private async extractBasicText(imageBuffer: Buffer): Promise<string> {
    // This is a placeholder for basic text extraction
    // In a real implementation, you might use a more sophisticated OCR library
    return '';
  }

  private async detectObjects(imageBuffer: Buffer): Promise<Array<{
    label: string;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  }>> {
    // This is a placeholder for object detection
    // In a real implementation, you might use TensorFlow.js or similar
    return [];
  }

  private async processScreenshot(image: string | Buffer, type: string): Promise<AnalysisResult> {
    const prompt = this.getScreenshotPrompt(type);
    const request: VisionRequest = {
      image,
      prompt,
      format: 'json'
    };

    const visionResponse = await this.analyzeImage(request);

    return {
      analysis: visionResponse.json?.analysis,
      ocrText: visionResponse.json?.ocrText,
      metadata: visionResponse.json?.metadata
    };
  }

  private getScreenshotPrompt(type: string): string {
    const prompts = {
      problem: 'Analyze this screenshot for any errors, bugs, or problems. Identify specific issues and provide suggestions for fixes.',
      debug: 'Analyze this screenshot for debugging purposes. Identify relevant code, error messages, or system information.',
      general: 'Analyze this screenshot and provide a comprehensive description of what you see.'
    };

    return prompts[type as keyof typeof prompts] || prompts.general;
  }

  private calculateConfidence(result: AnalysisResult): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on available data
    if (result.analysis) confidence += 0.3;
    if (result.ocrText) confidence += 0.2;
    if (result.text) confidence += 0.1;
    if (result.objects && result.objects.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  async extractText(image: string | Buffer): Promise<string> {
    const buffer = await this.prepareImage(image);

    if (this.config.enableOCR && this.ocrWorker) {
      const result = await this.performOCR(buffer);
      return result.text;
    }

    return await this.extractBasicText(buffer);
  }

  async destroy(): Promise<void> {
    this.logger.info('Destroying VisionPlugin');

    // Cleanup OCR worker
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }

    this.isInitialized = false;
    this.logger.info('VisionPlugin destroyed');
  }
}