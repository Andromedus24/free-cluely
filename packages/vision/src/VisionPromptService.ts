import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import {
  ContentAnalysis,
  StructuredData,
  VisionOptions,
  StructuredTemplate
} from './types/VisionTypes';

// Import provider adapters (these should be available from the providers package)
interface ProviderAdapter {
  chat(params: any): Promise<any>;
  streamChat(params: any): AsyncIterable<any>;
  visionAnalyze(params: any): Promise<any>;
}

export interface VisionPromptConfig {
  defaultProvider: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  maxAnalysisTime: number;
  enableContextualAnalysis: boolean;
  enableMultiModalAnalysis: boolean;
  enableStructuredExtraction: boolean;
  promptTemplates: {
    analysis: string;
    codeAnalysis: string;
    documentAnalysis: string;
    formAnalysis: string;
    screenshotAnalysis: string;
    structuredExtraction: string;
  };
}

export interface VisionPromptRequest {
  id: string;
  text: string;
  imageData?: Buffer;
  analysisType: 'general' | 'code' | 'document' | 'form' | 'screenshot' | 'structured';
  provider?: 'openai' | 'anthropic' | 'gemini' | 'ollama';
  options?: VisionOptions;
  template?: StructuredTemplate;
  context?: {
    previousAnalyses?: ContentAnalysis[];
    userPreferences?: any;
    domain?: string;
  };
}

export interface VisionPromptResult {
  id: string;
  success: boolean;
  analysis?: ContentAnalysis;
  structuredData?: StructuredData;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processingTime: number;
  provider: string;
  metadata?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    model?: string;
  };
}

export class VisionPromptService extends EventEmitter {
  private config: Required<VisionPromptConfig>;
  private providers: Map<string, ProviderAdapter>;
  private isInitialized = false;

  constructor(
    providers: Map<string, ProviderAdapter>,
    config: Partial<VisionPromptConfig> = {}
  ) {
    super();
    this.providers = providers;

    this.config = {
      defaultProvider: 'openai',
      maxAnalysisTime: 30000,
      enableContextualAnalysis: true,
      enableMultiModalAnalysis: true,
      enableStructuredExtraction: true,
      promptTemplates: {
        analysis: this.getDefaultAnalysisPrompt(),
        codeAnalysis: this.getCodeAnalysisPrompt(),
        documentAnalysis: this.getDocumentAnalysisPrompt(),
        formAnalysis: this.getFormAnalysisPrompt(),
        screenshotAnalysis: this.getScreenshotAnalysisPrompt(),
        structuredExtraction: this.getStructuredExtractionPrompt()
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.emit('progress', { stage: 'initialization', status: 'starting' });

    try {
      // Validate that we have at least one provider
      if (this.providers.size === 0) {
        throw new Error('No providers available for vision analysis');
      }

      // Check if default provider is available
      if (!this.providers.has(this.config.defaultProvider)) {
        console.warn(`Default provider ${this.config.defaultProvider} not available, using first available`);
        this.config.defaultProvider = this.providers.keys().next().value as string;
      }

      this.isInitialized = true;
      this.emit('progress', { stage: 'initialization', status: 'completed' });
    } catch (error) {
      this.emit('error', { stage: 'initialization', error: error.message });
      throw error;
    }
  }

  async analyzeContent(request: VisionPromptRequest): Promise<VisionPromptResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    this.emit('progress', { stage: 'analysis', status: 'starting', requestId: request.id });

    try {
      // Select provider
      const provider = request.provider || this.config.defaultProvider;
      const adapter = this.providers.get(provider);

      if (!adapter) {
        throw new Error(`Provider ${provider} not available`);
      }

      // Determine analysis type
      const analysisType = this.determineAnalysisType(request);
      this.emit('progress', { stage: 'analysis', status: 'type-determined', requestId: request.id, analysisType });

      // Build prompt
      const prompt = this.buildPrompt(request, analysisType);
      this.emit('progress', { stage: 'analysis', status: 'prompt-built', requestId: request.id });

      // Execute analysis
      let result: VisionPromptResult;

      if (this.config.enableMultiModalAnalysis && request.imageData) {
        result = await this.performMultiModalAnalysis(adapter, request, prompt, analysisType);
      } else {
        result = await this.performTextAnalysis(adapter, request, prompt, analysisType);
      }

      result.processingTime = Date.now() - startTime;
      result.provider = provider;

      this.emit('progress', { stage: 'analysis', status: 'completed', requestId: request.id, processingTime: result.processingTime });

      return result;

    } catch (error) {
      const errorResult: VisionPromptResult = {
        id: request.id,
        success: false,
        error: {
          code: 'ANALYSIS_ERROR',
          message: error.message,
          timestamp: new Date()
        },
        processingTime: Date.now() - startTime,
        provider: request.provider || this.config.defaultProvider
      };

      this.emit('error', { stage: 'analysis', error: error.message, requestId: request.id });

      return errorResult;
    }
  }

  private determineAnalysisType(request: VisionPromptRequest): string {
    if (request.analysisType !== 'general') {
      return request.analysisType;
    }

    // Auto-detect analysis type based on content
    const text = request.text.toLowerCase();

    // Code detection
    if (text.includes('function') || text.includes('class') || text.includes('{') || text.includes('}') ||
        text.includes('def ') || text.includes('import ') || text.includes('from ')) {
      return 'code';
    }

    // Form detection
    if (text.includes('name:') || text.includes('email:') || text.includes('phone:') || text.includes('address:')) {
      return 'form';
    }

    // Document detection
    if (text.includes('chapter') || text.includes('section') || text.includes('page') || text.length > 500) {
      return 'document';
    }

    // Screenshot detection (short text, potentially UI elements)
    if (text.length < 200 && (text.includes('button') || text.includes('menu') || text.includes('window'))) {
      return 'screenshot';
    }

    return 'general';
  }

  private buildPrompt(request: VisionPromptRequest, analysisType: string): string {
    let template = this.config.promptTemplates.analysis;

    // Select specific template based on analysis type
    switch (analysisType) {
      case 'code':
        template = this.config.promptTemplates.codeAnalysis;
        break;
      case 'document':
        template = this.config.promptTemplates.documentAnalysis;
        break;
      case 'form':
        template = this.config.promptTemplates.formAnalysis;
        break;
      case 'screenshot':
        template = this.config.promptTemplates.screenshotAnalysis;
        break;
      case 'structured':
        template = this.config.promptTemplates.structuredExtraction;
        break;
    }

    // Add context if available
    let contextPrompt = '';
    if (request.context && this.config.enableContextualAnalysis) {
      if (request.context.domain) {
        contextPrompt += `\nDomain Context: ${request.context.domain}`;
      }
      if (request.context.previousAnalyses && request.context.previousAnalyses.length > 0) {
        contextPrompt += `\nPrevious Analyses: ${request.context.previousAnalyses.length} similar analyses found`;
      }
    }

    // Add template context for structured extraction
    if (analysisType === 'structured' && request.template) {
      template += `\n\nTemplate: ${JSON.stringify(request.template, null, 2)}`;
    }

    // Replace placeholders
    return template
      .replace('{text}', request.text)
      .replace('{context}', contextPrompt)
      .replace('{analysisType}', analysisType);
  }

  private async performMultiModalAnalysis(
    adapter: ProviderAdapter,
    request: VisionPromptRequest,
    prompt: string,
    analysisType: string
  ): Promise<VisionPromptResult> {
    this.emit('progress', { stage: 'analysis', status: 'multimodal-starting', requestId: request.id });

    try {
      // Convert image to base64 for multimodal analysis
      const imageBase64 = request.imageData!.toString('base64');
      const imageDataUrl = `data:image/png;base64,${imageBase64}`;

      const analysisParams = {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageDataUrl } }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      };

      // Use provider-specific multimodal analysis
      const response = await adapter.visionAnalyze(analysisParams);
      const analysis = this.parseAnalysisResponse(response, analysisType, request);

      return {
        id: request.id,
        success: true,
        analysis,
        processingTime: 0, // Will be set by caller
        provider: request.provider || this.config.defaultProvider,
        metadata: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
          model: response.model
        }
      };

    } catch (error) {
      // Fallback to text-only analysis
      this.emit('progress', { stage: 'analysis', status: 'multimodal-failed', requestId: request.id, fallback: 'text' });
      return await this.performTextAnalysis(adapter, request, prompt, analysisType);
    }
  }

  private async performTextAnalysis(
    adapter: ProviderAdapter,
    request: VisionPromptRequest,
    prompt: string,
    analysisType: string
  ): Promise<VisionPromptResult> {
    this.emit('progress', { stage: 'analysis', status: 'text-starting', requestId: request.id });

    const chatParams = {
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing text extracted from images. Provide detailed, accurate analysis in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    };

    const response = await adapter.chat(chatParams);
    const analysis = this.parseAnalysisResponse(response, analysisType, request);

    return {
      id: request.id,
      success: true,
      analysis,
      processingTime: 0, // Will be set by caller
      provider: request.provider || this.config.defaultProvider,
      metadata: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        model: response.model
      }
    };
  }

  private parseAnalysisResponse(response: any, analysisType: string, request: VisionPromptRequest): ContentAnalysis {
    try {
      // Parse JSON response
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in response');
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        // Fallback: try to extract structured data from text
        parsed = this.extractAnalysisFromText(content, analysisType);
      }

      // For structured extraction, parse as structured data
      if (analysisType === 'structured' && request.template) {
        const structuredData = this.parseStructuredData(parsed, request.template);
        return {
          contentType: 'structured',
          summary: structuredData.fields ? `Extracted ${Object.keys(structuredData.fields).length} fields` : 'No fields extracted',
          keyElements: Object.keys(structuredData.fields || {}),
          topics: [],
          extractedData: structuredData
        };
      }

      // Map to ContentAnalysis format
      return {
        contentType: parsed.contentType || this.mapAnalysisTypeToContentType(analysisType),
        summary: parsed.summary || 'No summary provided',
        keyElements: parsed.keyElements || [],
        sentiment: parsed.sentiment,
        topics: parsed.topics || [],
        extractedData: {
          ...parsed.extractedData,
          analysisType,
          confidence: parsed.confidence || 0.8
        }
      };

    } catch (error) {
      // Return basic analysis if parsing fails
      return {
        contentType: this.mapAnalysisTypeToContentType(analysisType),
        summary: 'Analysis completed but response parsing failed',
        keyElements: [],
        topics: [],
        extractedData: {
          parseError: error.message,
          rawResponse: response.choices?.[0]?.message?.content
        }
      };
    }
  }

  private parseStructuredData(parsed: any, template: StructuredTemplate): StructuredData {
    const fields: Record<string, any> = {};

    // Extract fields based on template
    template.fields.forEach(field => {
      const fieldValue = parsed.fields?.[field.id] || parsed[field.name.toLowerCase()];
      if (fieldValue !== undefined) {
        fields[field.id] = {
          value: fieldValue,
          confidence: parsed.confidence?.[field.id] || 0.8,
          extractedFrom: 'llm',
          validation: this.validateFieldValue(fieldValue, field)
        };
      }
    });

    return {
      templateId: template.id,
      confidence: parsed.overallConfidence || 0.8,
      fields,
      unmatched: parsed.unmatched || []
    };
  }

  private validateFieldValue(value: any, field: any): { valid: boolean; message?: string } {
    // Basic validation based on field type
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          valid: emailRegex.test(value),
          message: emailRegex.test(value) ? undefined : 'Invalid email format'
        };
      case 'url':
        try {
          new URL(value);
          return { valid: true };
        } catch {
          return { valid: false, message: 'Invalid URL format' };
        }
      case 'number':
        return {
          valid: !isNaN(Number(value)),
          message: isNaN(Number(value)) ? 'Not a valid number' : undefined
        };
      default:
        return { valid: true };
    }
  }

  private extractAnalysisFromText(text: string, analysisType: string): any {
    // Basic text extraction when JSON parsing fails
    const lines = text.split('\n').filter(line => line.trim());
    const summary = lines.find(line => line.toLowerCase().includes('summary')) || lines[0] || 'No summary';

    return {
      contentType: this.mapAnalysisTypeToContentType(analysisType),
      summary: summary.replace(/^summary:\s*/i, '').trim(),
      keyElements: lines.filter(line => line.includes(':') || line.includes('-')).slice(0, 5),
      topics: [],
      extractedData: {
        parseMethod: 'text-extraction',
        lineCount: lines.length
      }
    };
  }

  private mapAnalysisTypeToContentType(analysisType: string): ContentAnalysis['contentType'] {
    const mapping: Record<string, ContentAnalysis['contentType']> = {
      'code': 'code',
      'document': 'document',
      'form': 'form',
      'screenshot': 'screenshot',
      'structured': 'document',
      'general': 'text'
    };

    return mapping[analysisType] || 'text';
  }

  // Default prompt templates
  private getDefaultAnalysisPrompt(): string {
    return `Analyze the following text extracted from an image and provide a comprehensive analysis:

{text}

Please provide the analysis in JSON format with the following structure:
{
  "contentType": "document|code|form|screenshot|text",
  "summary": "Brief summary of the content",
  "keyElements": ["key point 1", "key point 2", ...],
  "sentiment": "positive|neutral|negative",
  "topics": ["topic1", "topic2", ...],
  "extractedData": {
    "additional context": "any relevant extracted information"
  },
  "confidence": 0.8
}

Focus on accuracy and provide specific details about the content type and key information.`;
  }

  private getCodeAnalysisPrompt(): string {
    return `Analyze the following code extracted from an image:

{text}

Provide a technical analysis in JSON format:
{
  "contentType": "code",
  "summary": "What this code does",
  "keyElements": ["function name", "algorithm", "pattern", ...],
  "language": "programming language",
  "complexity": "simple|moderate|complex",
  "topics": ["programming", "algorithms", ...],
  "extractedData": {
    "functions": ["func1", "func2"],
    "imports": ["module1", "module2"],
    "estimatedLOC": 25
  },
  "confidence": 0.8
}

Focus on code structure, functionality, and technical details.`;
  }

  private getDocumentAnalysisPrompt(): string {
    return `Analyze the following document text extracted from an image:

{text}

Provide document analysis in JSON format:
{
  "contentType": "document",
  "summary": "Document overview and main points",
  "keyElements": ["section1", "heading2", "key point", ...],
  "documentType": "report|article|manual|letter|other",
  "topics": ["topic1", "topic2", ...],
  "extractedData": {
    "sections": ["introduction", "methodology", ...],
    "estimatedPages": 1,
    "readingTime": "2 minutes"
  },
  "confidence": 0.8
}

Focus on document structure, main themes, and important information.`;
  }

  private getFormAnalysisPrompt(): string {
    return `Analyze the following form data extracted from an image:

{text}

Extract form information in JSON format:
{
  "contentType": "form",
  "summary": "Form type and purpose",
  "keyElements": ["field1", "field2", ...],
  "formType": "application|survey|registration|other",
  "topics": ["personal info", "contact details", ...],
  "extractedData": {
    "fields": {
      "name": "extracted name",
      "email": "extracted email",
      "phone": "extracted phone"
    },
    "requiredFields": ["name", "email"],
    "formSections": ["personal", "contact"]
  },
  "confidence": 0.8
}

Focus on extracting specific form fields and their values accurately.`;
  }

  private getScreenshotAnalysisPrompt(): string {
    return `Analyze the following screenshot text extracted from an image:

{text}

Provide screenshot analysis in JSON format:
{
  "contentType": "screenshot",
  "summary": "What this screenshot shows",
  "keyElements": ["button text", "menu item", "error message", ...],
  "interfaceType": "web|desktop|mobile|unknown",
  "topics": ["ui", "error", "settings", ...],
  "extractedData": {
    "uiElements": ["button", "input field", "menu"],
    "interactionType": "form|dialog|dashboard",
    "hasError": false
  },
  "confidence": 0.8
}

Focus on UI elements, interface type, and user context.`;
  }

  private getStructuredExtractionPrompt(): string {
    return `Extract structured data from the following text according to the template:

{text}

Return data in JSON format matching the template structure:
{
  "templateId": "template_id",
  "overallConfidence": 0.8,
  "fields": {
    "field1": {
      "value": "extracted value",
      "confidence": 0.9
    },
    "field2": {
      "value": "extracted value",
      "confidence": 0.7
    }
  },
  "unmatched": ["text that couldn't be matched"],
  "confidence": 0.8
}

Focus on accurate extraction of template fields with confidence scores.`;
  }

  updateConfig(config: Partial<VisionPromptConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): VisionPromptConfig {
    return { ...this.config };
  }
}