import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import {
  Plugin,
  PluginBus,
  ConfigManager,
  Logger,
  VisionRequest,
  VisionResponse,
  VisionService as IVisionService,
  PluginError
} from '@free-cluely/shared';

export class VisionServicePlugin implements Plugin, IVisionService {
  name = 'vision-service';
  version = '1.0.0';
  description = 'AI-powered image analysis and text extraction';
  author = 'Free-Cluely Team';
  permissions = ['screen', 'network'];

  private config?: ConfigManager;
  private logger?: Logger;
  private isActive = false;
  private tesseractWorker?: any;

  async initialize(bus: PluginBus, config: ConfigManager, logger: Logger): Promise<void> {
    this.config = config;
    this.logger = logger;
    
    try {
      await this.initializeTesseract();
      this.setupMessageHandlers(bus);
      this.isActive = true;
      
      this.logger.info('Vision Service plugin initialized successfully', { plugin: this.name });
    } catch (error) {
      this.logger.error(`Failed to initialize Vision Service: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async destroy(): Promise<void> {
    this.isActive = false;
    
    try {
      await this.cleanupTesseract();
      this.logger.info('Vision Service plugin destroyed', { plugin: this.name });
    } catch (error) {
      this.logger.error(`Error destroying Vision Service: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
    }
  }

  private async initializeTesseract(): Promise<void> {
    try {
      this.tesseractWorker = await createWorker({
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            this.logger?.debug('Tesseract progress', { plugin: this.name, progress: m.progress });
          }
        }
      });
      
      await this.tesseractWorker.loadLanguage('eng');
      await this.tesseractWorker.initialize('eng');
      
      this.logger?.debug('Tesseract OCR initialized', { plugin: this.name });
    } catch (error) {
      throw new PluginError(`Failed to initialize Tesseract: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  private async cleanupTesseract(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = undefined;
    }
  }

  private setupMessageHandlers(bus: PluginBus): void {
    bus.onMessage(async (message) => {
      if (message.plugin === this.name) {
        try {
          const response = await this.handleMessage(message);
          bus.handleResponse(response);
        } catch (error) {
          const errorResponse = {
            id: message.id,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            plugin: this.name,
            timestamp: Date.now()
          };
          bus.handleResponse(errorResponse);
        }
      }
    });
  }

  private async handleMessage(message: any): Promise<any> {
    if (!this.isActive) {
      throw new PluginError('Plugin is not active', this.name);
    }

    const request: VisionRequest = message.payload;
    
    switch (request.format) {
      case 'text':
        return await this.extractText(request.image);
      case 'json':
        return await this.analyze(request.image, request.prompt);
      default:
        throw new PluginError(`Unsupported format: ${request.format}`, this.name);
    }
  }

  async analyze(request: { image: string | Buffer; prompt?: string }): Promise<{ text: string; confidence: number; json?: Record<string, unknown> }> {
    try {
      // Convert image to Buffer if it's a base64 string
      const imageBuffer = await this.getImageBuffer(request.image);
      
      // Extract text using OCR
      const extractedText = await this.performOCR(imageBuffer);
      
      // If prompt is provided, try to structure the response as JSON
      let jsonData: Record<string, unknown> | undefined;
      
      if (request.prompt) {
        try {
          jsonData = await this.extractStructuredData(extractedText.text, request.prompt);
        } catch (error) {
          this.logger?.warn(`Failed to extract structured data: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
        }
      }
      
      return {
        text: extractedText.text,
        confidence: extractedText.confidence,
        json: jsonData
      };
    } catch (error) {
      this.logger?.error(`Vision analysis failed: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async extractText(image: string | Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const imageBuffer = await this.getImageBuffer(image);
      return await this.performOCR(imageBuffer);
    } catch (error) {
      this.logger?.error(`Text extraction failed: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  private async getImageBuffer(image: string | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(image)) {
      return image;
    }
    
    // Handle base64 string
    if (typeof image === 'string') {
      if (image.startsWith('data:image/')) {
        // Remove data URL prefix
        const base64Data = image.split(',')[1];
        return Buffer.from(base64Data, 'base64');
      } else {
        // Assume it's base64 encoded
        return Buffer.from(image, 'base64');
      }
    }
    
    throw new PluginError('Invalid image format', this.name);
  }

  private async performOCR(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    if (!this.tesseractWorker) {
      throw new PluginError('Tesseract worker not initialized', this.name);
    }

    try {
      // Preprocess image for better OCR results
      const processedImage = await this.preprocessImage(imageBuffer);
      
      // Perform OCR
      const result = await this.tesseractWorker.recognize(processedImage);
      
      // Calculate overall confidence
      const confidence = result.data.confidence / 100;
      
      this.logger?.debug('OCR completed', { 
        plugin: this.name, 
        textLength: result.data.text.length,
        confidence 
      });
      
      return {
        text: result.data.text.trim(),
        confidence
      };
    } catch (error) {
      throw new PluginError(`OCR failed: ${error instanceof Error ? error.message : String(error)}`, this.name);
    }
  }

  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Convert to grayscale and enhance contrast for better OCR
      const processedImage = await sharp(imageBuffer)
        .grayscale()
        .normalise()
        .sharpen()
        .toBuffer();
      
      return processedImage;
    } catch (error) {
      this.logger?.warn(`Image preprocessing failed, using original: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return imageBuffer;
    }
  }

  private async extractStructuredData(text: string, prompt: string): Promise<Record<string, unknown>> {
    try {
      // Simple structured data extraction based on prompt
      const lowerPrompt = prompt.toLowerCase();
      const lowerText = text.toLowerCase();
      
      const result: Record<string, unknown> = {};
      
      // Extract based on common patterns
      if (lowerPrompt.includes('email')) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = text.match(emailRegex);
        if (emails) {
          result.emails = emails;
        }
      }
      
      if (lowerPrompt.includes('phone') || lowerPrompt.includes('number')) {
        const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
        const phones = text.match(phoneRegex);
        if (phones) {
          result.phoneNumbers = phones;
        }
      }
      
      if (lowerPrompt.includes('url') || lowerPrompt.includes('link')) {
        const urlRegex = /https?:\/\/[^\s]+/g;
        const urls = text.match(urlRegex);
        if (urls) {
          result.urls = urls;
        }
      }
      
      if (lowerPrompt.includes('date') || lowerPrompt.includes('time')) {
        const dateRegex = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/g;
        const dates = text.match(dateRegex);
        if (dates) {
          result.dates = dates;
        }
      }
      
      if (lowerPrompt.includes('price') || lowerPrompt.includes('cost') || lowerPrompt.includes('amount')) {
        const priceRegex = /\$?\d+(?:,\d{3})*(?:\.\d{2})?/g;
        const prices = text.match(priceRegex);
        if (prices) {
          result.prices = prices;
        }
      }
      
      // If no specific extraction was done, return the full text
      if (Object.keys(result).length === 0) {
        result.fullText = text;
      }
      
      return result;
    } catch (error) {
      this.logger?.warn(`Structured data extraction failed: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      return { fullText: text };
    }
  }

  // Additional utility methods
  async detectTextRegions(image: string | Buffer): Promise<Array<{ x: number; y: number; width: number; height: number; text: string }>> {
    try {
      const imageBuffer = await this.getImageBuffer(image);
      
      if (!this.tesseractWorker) {
        throw new PluginError('Tesseract worker not initialized', this.name);
      }
      
      const result = await this.tesseractWorker.recognize(imageBuffer);
      
      // Extract word-level data with bounding boxes
      const words = result.data.words.map((word: any) => ({
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
        text: word.text,
        confidence: word.confidence
      }));
      
      return words;
    } catch (error) {
      this.logger?.error(`Text region detection failed: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async extractTableData(image: string | Buffer): Promise<Array<Array<string>>> {
    try {
      const imageBuffer = await this.getImageBuffer(image);
      
      if (!this.tesseractWorker) {
        throw new PluginError('Tesseract worker not initialized', this.name);
      }
      
      const result = await this.tesseractWorker.recognize(imageBuffer);
      
      // Simple table extraction based on line breaks and consistent spacing
      const lines = result.data.text.split('\n').filter(line => line.trim());
      const tableData: Array<Array<string>> = [];
      
      for (const line of lines) {
        // Split by tabs or multiple spaces to simulate columns
        const columns = line.split(/\t| {2,}/).filter(col => col.trim());
        tableData.push(columns);
      }
      
      return tableData;
    } catch (error) {
      this.logger?.error(`Table data extraction failed: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async getImageMetadata(image: string | Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    hasAlpha: boolean;
    channels: number;
  }> {
    try {
      const imageBuffer = await this.getImageBuffer(image);
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        hasAlpha: metadata.hasAlpha || false,
        channels: metadata.channels || 3
      };
    } catch (error) {
      this.logger?.error(`Image metadata extraction failed: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }

  async optimizeImage(image: string | Buffer, options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}): Promise<Buffer> {
    try {
      const imageBuffer = await this.getImageBuffer(image);
      
      let pipeline = sharp(imageBuffer);
      
      // Resize if dimensions are specified
      if (options.maxWidth || options.maxHeight) {
        pipeline = pipeline.resize({
          width: options.maxWidth,
          height: options.maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      // Apply format and quality settings
      if (options.format === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: options.quality || 80 });
      } else if (options.format === 'png') {
        pipeline = pipeline.png({ quality: options.quality || 80 });
      } else if (options.format === 'webp') {
        pipeline = pipeline.webp({ quality: options.quality || 80 });
      }
      
      return await pipeline.toBuffer();
    } catch (error) {
      this.logger?.error(`Image optimization failed: ${error instanceof Error ? error.message : String(error)}`, { plugin: this.name });
      throw error;
    }
  }
}