import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

import {
  StructuredTemplate,
  TemplateField,
  ExtractionRule,
  ValidationRule,
  StructuredData,
  BoundingBox,
  TextBlock
} from './types/VisionTypes';

export interface ExtractionConfig {
  enableValidation: boolean;
  enableAutoCorrection: boolean;
  enableConfidenceScoring: boolean;
  enableFallbackExtraction: boolean;
  maxExtractionTime: number;
  confidenceThreshold: number;
  contextWindowSize: number;
  similarityThreshold: number;
}

export interface ExtractionRequest {
  id: string;
  text: string;
  template: StructuredTemplate;
  blocks?: TextBlock[];
  options?: {
    provider?: string;
    enableValidation?: boolean;
    enableAutoCorrection?: boolean;
    confidenceThreshold?: number;
  };
  context?: {
    previousExtractions?: StructuredData[];
    domain?: string;
    userPreferences?: any;
  };
}

export interface ExtractionResult {
  id: string;
  success: boolean;
  data?: StructuredData;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  processingTime: number;
  metadata?: {
    extractionMethod: 'regex' | 'position' | 'ml' | 'keyword' | 'hybrid';
    fieldsExtracted: number;
    validationResults: Record<string, boolean>;
    confidenceScores: Record<string, number>;
    fallbackUsed: boolean;
  };
}

export class StructuredExtractionService extends EventEmitter {
  private config: Required<ExtractionConfig>;

  constructor(config: Partial<ExtractionConfig> = {}) {
    super();

    this.config = {
      enableValidation: true,
      enableAutoCorrection: true,
      enableConfidenceScoring: true,
      enableFallbackExtraction: true,
      maxExtractionTime: 30000,
      confidenceThreshold: 0.7,
      contextWindowSize: 100,
      similarityThreshold: 0.8,
      ...config
    };
  }

  async extractStructuredData(request: ExtractionRequest): Promise<ExtractionResult> {
    const startTime = Date.now();
    this.emit('progress', { stage: 'extraction', status: 'starting', requestId: request.id });

    try {
      // Validate template
      this.validateTemplate(request.template);

      // Preprocess text for extraction
      const processedText = this.preprocessText(request.text);
      this.emit('progress', { stage: 'extraction', status: 'text-preprocessed', requestId: request.id });

      // Extract fields using multiple methods
      const extractedFields = await this.extractFields(processedText, request.template, request.blocks);
      this.emit('progress', { stage: 'extraction', status: 'fields-extracted', requestId: request.id, fieldsCount: Object.keys(extractedFields).length });

      // Apply validation if enabled
      const validatedFields = this.config.enableValidation && request.options?.enableValidation !== false
        ? await this.validateFields(extractedFields, request.template)
        : extractedFields;

      // Apply auto-correction if enabled
      const correctedFields = this.config.enableAutoCorrection && request.options?.enableAutoCorrection !== false
        ? await this.autoCorrectFields(validatedFields, request.template)
        : validatedFields;

      // Calculate overall confidence
      const overallConfidence = this.calculateOverallConfidence(correctedFields);

      // Build final structured data
      const structuredData: StructuredData = {
        templateId: request.template.id,
        confidence: overallConfidence,
        fields: correctedFields,
        unmatched: this.findUnmatchedText(processedText, correctedFields, request.template)
      };

      // Check if result meets confidence threshold
      const threshold = request.options?.confidenceThreshold || this.config.confidenceThreshold;
      const success = overallConfidence >= threshold;

      const result: ExtractionResult = {
        id: request.id,
        success,
        data: structuredData,
        processingTime: Date.now() - startTime,
        metadata: {
          extractionMethod: this.determineExtractionMethod(correctedFields),
          fieldsExtracted: Object.keys(correctedFields).length,
          validationResults: this.getValidationResults(correctedFields),
          confidenceScores: this.getConfidenceScores(correctedFields),
          fallbackUsed: false
        }
      };

      this.emit('progress', { stage: 'extraction', status: 'completed', requestId: request.id, success, confidence: overallConfidence });

      return result;

    } catch (error) {
      const errorResult: ExtractionResult = {
        id: request.id,
        success: false,
        error: {
          code: 'EXTRACTION_ERROR',
          message: error.message,
          timestamp: new Date()
        },
        processingTime: Date.now() - startTime
      };

      this.emit('error', { stage: 'extraction', error: error.message, requestId: request.id });

      return errorResult;
    }
  }

  private validateTemplate(template: StructuredTemplate): void {
    if (!template.id || typeof template.id !== 'string') {
      throw new Error('Template ID is required');
    }

    if (!template.name || typeof template.name !== 'string') {
      throw new Error('Template name is required');
    }

    if (!template.fields || !Array.isArray(template.fields) || template.fields.length === 0) {
      throw new Error('Template must have at least one field');
    }

    // Validate fields
    template.fields.forEach((field, index) => {
      if (!field.id || typeof field.id !== 'string') {
        throw new Error(`Field ${index} must have an ID`);
      }

      if (!field.name || typeof field.name !== 'string') {
        throw new Error(`Field ${index} must have a name`);
      }

      if (!field.type || !['text', 'number', 'date', 'email', 'url', 'select'].includes(field.type)) {
        throw new Error(`Field ${index} has invalid type: ${field.type}`);
      }

      if (!field.extraction || typeof field.extraction !== 'object') {
        throw new Error(`Field ${index} must have extraction rules`);
      }

      if (!field.extraction.method || !['regex', 'position', 'ml', 'keyword'].includes(field.extraction.method)) {
        throw new Error(`Field ${index} has invalid extraction method: ${field.extraction.method}`);
      }

      if (field.extraction.confidence === undefined ||
          field.extraction.confidence < 0 || field.extraction.confidence > 1) {
        throw new Error(`Field ${index} must have confidence between 0 and 1`);
      }
    });

    // Validate validation rules if provided
    if (template.validation) {
      template.validation.forEach((rule, index) => {
        if (!rule.field || typeof rule.field !== 'string') {
          throw new Error(`Validation rule ${index} must specify a field`);
        }

        if (!rule.type || !['required', 'format', 'range', 'custom'].includes(rule.type)) {
          throw new Error(`Validation rule ${index} has invalid type: ${rule.type}`);
        }
      });
    }
  }

  private preprocessText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with regex
      .replace(/[^\w\s\-\.\@\:\/\#\(\)]/g, ' ')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove empty lines
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  private async extractFields(text: string, template: StructuredTemplate, blocks?: TextBlock[]): Promise<Record<string, any>> {
    const fields: Record<string, any> = {};

    for (const field of template.fields) {
      try {
        const extractionResult = await this.extractField(text, field, blocks);
        if (extractionResult.value !== null) {
          fields[field.id] = extractionResult;
        }
      } catch (error) {
        this.emit('warning', { stage: 'field-extraction', field: field.id, error: error.message });
      }
    }

    return fields;
  }

  private async extractField(text: string, field: TemplateField, blocks?: TextBlock[]): Promise<{ value: any; confidence: number; extractedFrom: string }> {
    const extractionRule = field.extraction;

    switch (extractionRule.method) {
      case 'regex':
        return this.extractWithRegex(text, field, extractionRule);
      case 'position':
        return this.extractWithPosition(text, field, extractionRule, blocks);
      case 'keyword':
        return this.extractWithKeywords(text, field, extractionRule);
      case 'ml':
        return this.extractWithML(text, field, extractionRule);
      default:
        throw new Error(`Unknown extraction method: ${extractionRule.method}`);
    }
  }

  private extractWithRegex(text: string, field: TemplateField, rule: ExtractionRule): { value: any; confidence: number; extractedFrom: string } {
    if (!rule.pattern) {
      throw new Error('Regex extraction requires a pattern');
    }

    try {
      const regex = new RegExp(rule.pattern, 'gi');
      const matches = text.match(regex);

      if (!matches || matches.length === 0) {
        return { value: null, confidence: 0, extractedFrom: 'regex' };
      }

      // Convert and validate the extracted value
      const rawValue = matches[0]; // Use first match
      const convertedValue = this.convertFieldValue(rawValue, field.type);
      const validation = this.validateFieldValue(convertedValue, field);

      return {
        value: convertedValue,
        confidence: validation.valid ? rule.confidence : rule.confidence * 0.5,
        extractedFrom: 'regex'
      };

    } catch (error) {
      throw new Error(`Regex extraction failed for field ${field.id}: ${error.message}`);
    }
  }

  private extractWithPosition(text: string, field: TemplateField, rule: ExtractionRule, blocks?: TextBlock[]): { value: any; confidence: number; extractedFrom: string } {
    if (!rule.position && !blocks) {
      throw new Error('Position extraction requires either position coordinates or text blocks');
    }

    try {
      let extractedText = '';

      if (rule.position) {
        // Use predefined position
        const { x, y, width, height } = rule.position;
        // In a real implementation, this would use the actual image coordinates
        // For now, extract text from the approximate area
        const lines = text.split('\n');
        const startLine = Math.floor(y / 30); // Approximate line height
        const endLine = Math.floor((y + height) / 30);

        extractedText = lines
          .slice(startLine, endLine + 1)
          .map(line => line.substring(Math.floor(x / 10), Math.floor((x + width) / 10)))
          .join(' ')
          .trim();
      } else if (blocks) {
        // Use text blocks to find field by relative position
        extractedText = this.extractFromBlocks(blocks, field);
      }

      if (!extractedText) {
        return { value: null, confidence: 0, extractedFrom: 'position' };
      }

      const convertedValue = this.convertFieldValue(extractedText, field.type);
      const validation = this.validateFieldValue(convertedValue, field);

      return {
        value: convertedValue,
        confidence: validation.valid ? rule.confidence : rule.confidence * 0.7,
        extractedFrom: 'position'
      };

    } catch (error) {
      throw new Error(`Position extraction failed for field ${field.id}: ${error.message}`);
    }
  }

  private extractWithKeywords(text: string, field: TemplateField, rule: ExtractionRule): { value: any; confidence: number; extractedFrom: string } {
    if (!rule.keywords || rule.keywords.length === 0) {
      throw new Error('Keyword extraction requires keywords');
    }

    try {
      let extractedText = '';
      let bestMatch = '';
      let bestConfidence = 0;

      for (const keyword of rule.keywords) {
        const keywordLower = keyword.toLowerCase();
        const textLower = text.toLowerCase();

        const index = textLower.indexOf(keywordLower);
        if (index !== -1) {
          // Extract text around the keyword
          const contextStart = Math.max(0, index - this.config.contextWindowSize);
          const contextEnd = Math.min(text.length, index + keyword.length + this.config.contextWindowSize);
          const context = text.substring(contextStart, contextEnd);

          // Look for value after the keyword
          const afterKeyword = context.substring(context.indexOf(keyword) + keyword.length);
          const valueMatch = afterKeyword.match(/[:\s]+([^\n\r]+)/);

          if (valueMatch) {
            const candidate = valueMatch[1].trim();
            if (candidate.length > bestMatch.length) {
              bestMatch = candidate;
              bestConfidence = rule.confidence;
            }
          }
        }
      }

      if (!bestMatch) {
        return { value: null, confidence: 0, extractedFrom: 'keyword' };
      }

      const convertedValue = this.convertFieldValue(bestMatch, field.type);
      const validation = this.validateFieldValue(convertedValue, field);

      return {
        value: convertedValue,
        confidence: validation.valid ? bestConfidence : bestConfidence * 0.6,
        extractedFrom: 'keyword'
      };

    } catch (error) {
      throw new Error(`Keyword extraction failed for field ${field.id}: ${error.message}`);
    }
  }

  private extractWithML(text: string, field: TemplateField, rule: ExtractionRule): { value: any; confidence: number; extractedFrom: string } {
    // Placeholder for ML-based extraction
    // In a real implementation, this would use machine learning models
    // For now, use keyword-based extraction as fallback

    try {
      // Simple heuristic extraction based on field name and context
      const fieldName = field.name.toLowerCase();
      const textLower = text.toLowerCase();

      let extractedText = '';

      // Look for patterns based on field type
      switch (field.type) {
        case 'email':
          const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          extractedText = emailMatch ? emailMatch[1] : '';
          break;
        case 'phone':
          const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
          extractedText = phoneMatch ? phoneMatch[1] : '';
          break;
        case 'date':
          const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
          extractedText = dateMatch ? dateMatch[1] : '';
          break;
        default:
          // Look for field name in text
          const fieldIndex = textLower.indexOf(fieldName);
          if (fieldIndex !== -1) {
            const afterField = text.substring(fieldIndex + fieldName.length);
            const valueMatch = afterField.match(/[:\s]+([^\n\r]+)/);
            extractedText = valueMatch ? valueMatch[1].trim() : '';
          }
      }

      if (!extractedText) {
        return { value: null, confidence: 0, extractedFrom: 'ml' };
      }

      const convertedValue = this.convertFieldValue(extractedText, field.type);
      const validation = this.validateFieldValue(convertedValue, field);

      return {
        value: convertedValue,
        confidence: validation.valid ? rule.confidence * 0.8 : rule.confidence * 0.4,
        extractedFrom: 'ml'
      };

    } catch (error) {
      throw new Error(`ML extraction failed for field ${field.id}: ${error.message}`);
    }
  }

  private extractFromBlocks(blocks: TextBlock[], field: TemplateField): string {
    // Extract text from blocks based on field name proximity
    const fieldName = field.name.toLowerCase();

    for (const block of blocks) {
      if (block.text.toLowerCase().includes(fieldName)) {
        // Look for value in nearby blocks or same block
        return block.text.replace(new RegExp(fieldName, 'gi'), '').replace(/[:\s]+/, '').trim();
      }
    }

    return '';
  }

  private convertFieldValue(value: string, type: string): any {
    if (!value) return null;

    try {
      switch (type) {
        case 'text':
          return value.trim();
        case 'number':
          return parseFloat(value.replace(/[^\d.-]/g, ''));
        case 'date':
          return new Date(value).toISOString();
        case 'email':
          return value.toLowerCase().trim();
        case 'url':
          return value.trim();
        case 'select':
          return value.trim();
        default:
          return value.trim();
      }
    } catch (error) {
      return value.trim();
    }
  }

  private validateFieldValue(value: any, field: TemplateField): { valid: boolean; message?: string } {
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

  private async validateFields(fields: Record<string, any>, template: StructuredTemplate): Promise<Record<string, any>> {
    const validatedFields = { ...fields };

    for (const field of template.fields) {
      if (validatedFields[field.id]) {
        const validation = this.validateFieldValue(validatedFields[field.id].value, field);
        validatedFields[field.id].validation = validation;
      }
    }

    return validatedFields;
  }

  private async autoCorrectFields(fields: Record<string, any>, template: StructuredTemplate): Promise<Record<string, any>> {
    const correctedFields = { ...fields };

    for (const field of template.fields) {
      if (correctedFields[field.id] && !correctedFields[field.id].validation?.valid) {
        // Attempt auto-correction
        const corrected = this.attemptAutoCorrection(correctedFields[field.id].value, field);
        if (corrected !== null) {
          correctedFields[field.id].value = corrected;
          correctedFields[field.id].autoCorrected = true;
          correctedFields[field.id].validation = this.validateFieldValue(corrected, field);
        }
      }
    }

    return correctedFields;
  }

  private attemptAutoCorrection(value: any, field: TemplateField): any {
    if (!value) return null;

    switch (field.type) {
      case 'email':
        // Common email corrections
        return value
          .replace(/\.con$/, '.com')
          .replace(/\.comm$/, '.com')
          .replace(/,com$/, '.com')
          .replace(/@\s+/, '@')
          .replace(/\s+@/, '@');

      case 'phone':
        // Phone number normalization
        return value.replace(/[^\d+]/g, '');

      case 'date':
        // Date format correction
        try {
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date.toISOString();
        } catch {
          return null;
        }

      default:
        return value;
    }
  }

  private calculateOverallConfidence(fields: Record<string, any>): number {
    const fieldValues = Object.values(fields);
    if (fieldValues.length === 0) return 0;

    const totalConfidence = fieldValues.reduce((sum, field) => sum + (field.confidence || 0), 0);
    const validFields = fieldValues.filter(field => field.validation?.valid !== false).length;

    return Math.min(1, (totalConfidence / fieldValues.length) * (validFields / fieldValues.length));
  }

  private findUnmatchedText(text: string, fields: Record<string, any>, template: StructuredTemplate): string[] {
    let unmatchedText = text;

    // Remove matched field values from text
    Object.values(fields).forEach(field => {
      if (field.value) {
        const valueStr = String(field.value);
        unmatchedText = unmatchedText.replace(new RegExp(valueStr, 'gi'), '');
      }
    });

    // Remove field names and common labels
    template.fields.forEach(field => {
      unmatchedText = unmatchedText.replace(new RegExp(field.name, 'gi'), '');
    });

    // Clean up and split into meaningful chunks
    return unmatchedText
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 2)
      .slice(0, 20); // Limit to 20 unmatched words
  }

  private determineExtractionMethod(fields: Record<string, any>): string {
    const methods = Object.values(fields).map(field => field.extractedFrom);
    const uniqueMethods = [...new Set(methods)];

    if (uniqueMethods.length === 1) return uniqueMethods[0];
    if (uniqueMethods.length > 1) return 'hybrid';
    return 'unknown';
  }

  private getValidationResults(fields: Record<string, any>): Record<string, boolean> {
    const results: Record<string, boolean> = {};
    Object.entries(fields).forEach(([fieldId, field]) => {
      results[fieldId] = field.validation?.valid !== false;
    });
    return results;
  }

  private getConfidenceScores(fields: Record<string, any>): Record<string, number> {
    const scores: Record<string, number> = {};
    Object.entries(fields).forEach(([fieldId, field]) => {
      scores[fieldId] = field.confidence || 0;
    });
    return scores;
  }

  updateConfig(config: Partial<ExtractionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ExtractionConfig {
    return { ...this.config };
  }
}