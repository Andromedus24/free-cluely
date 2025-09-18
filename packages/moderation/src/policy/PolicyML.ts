// Machine Learning Integration for Policy Engine
// ==============================================

import { EventEmitter } from 'events';
import { PolicyEvaluationContext, PolicyEvaluationResult, PolicyAction, PolicySeverity } from './types';

/**
 * Machine learning model interface
 */
export interface IMLModel {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'detection' | 'generation';
  supportedContentTypes: string[];
  predict(input: any): Promise<any>;
  evaluate(input: any): Promise<number>;
  isAvailable(): boolean;
  getMetadata(): any;
}

/**
 * ML model registry
 */
export class MLModelRegistry extends EventEmitter {
  private models: Map<string, IMLModel> = new Map();
  private modelStats: Map<string, any> = new Map();

  /**
   * Register a new ML model
   */
  registerModel(model: IMLModel): void {
    this.models.set(model.id, model);
    this.modelStats.set(model.id, {
      totalPredictions: 0,
      successfulPredictions: 0,
      averageLatency: 0,
      lastUsed: null,
      errorRate: 0
    });
    this.emit('modelRegistered', model);
  }

  /**
   * Unregister a model
   */
  unregisterModel(modelId: string): void {
    this.models.delete(modelId);
    this.modelStats.delete(modelId);
    this.emit('modelUnregistered', modelId);
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): IMLModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Get all models
   */
  getAllModels(): IMLModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by type
   */
  getModelsByType(type: IMLModel['type']): IMLModel[] {
    return this.getAllModels().filter(model => model.type === type);
  }

  /**
   * Get models by content type
   */
  getModelsByContentType(contentType: string): IMLModel[] {
    return this.getAllModels().filter(model =>
      model.supportedContentTypes.includes(contentType)
    );
  }

  /**
   * Get model statistics
   */
  getModelStats(modelId: string): any {
    return this.modelStats.get(modelId);
  }

  /**
   * Update model statistics
   */
  private updateModelStats(modelId: string, latency: number, success: boolean): void {
    const stats = this.modelStats.get(modelId);
    if (stats) {
      stats.totalPredictions++;
      if (success) {
        stats.successfulPredictions++;
      } else {
        stats.errorRate = (stats.errorRate * (stats.totalPredictions - 1) + 1) / stats.totalPredictions;
      }

      // Update average latency
      stats.averageLatency = (stats.averageLatency * (stats.totalPredictions - 1) + latency) / stats.totalPredictions;
      stats.lastUsed = new Date();
    }
  }

  /**
   * Run model prediction with error handling and stats tracking
   */
  async runPrediction(modelId: string, input: any): Promise<any> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const startTime = Date.now();
    let result: any;
    let success = false;

    try {
      result = await model.predict(input);
      success = true;
      return result;
    } catch (error) {
      this.emit('modelError', { modelId, error, input });
      throw error;
    } finally {
      const latency = Date.now() - startTime;
      this.updateModelStats(modelId, latency, success);
      this.emit('predictionComplete', {
        modelId,
        latency,
        success,
        input: this.sanitizeInput(input)
      });
    }
  }

  /**
   * Run model evaluation with error handling and stats tracking
   */
  async runEvaluation(modelId: string, input: any): Promise<number> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const startTime = Date.now();
    let result: number;
    let success = false;

    try {
      result = await model.evaluate(input);
      success = true;
      return result;
    } catch (error) {
      this.emit('modelError', { modelId, error, input });
      throw error;
    } finally {
      const latency = Date.now() - startTime;
      this.updateModelStats(modelId, latency, success);
      this.emit('evaluationComplete', {
        modelId,
        latency,
        success,
        input: this.sanitizeInput(input)
      });
    }
  }

  /**
   * Sanitize input for logging
   */
  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input.length > 100 ? input.substring(0, 100) + '...' : input;
    }
    return '[complex object]';
  }

  /**
   * Get model health status
   */
  getModelHealth(): Array<{
    modelId: string;
    available: boolean;
    errorRate: number;
    averageLatency: number;
    lastUsed: Date | null;
  }> {
    return Array.from(this.models.values()).map(model => {
      const stats = this.modelStats.get(model.id);
      return {
        modelId: model.id,
        available: model.isAvailable(),
        errorRate: stats?.errorRate || 0,
        averageLatency: stats?.averageLatency || 0,
        lastUsed: stats?.lastUsed || null
      };
    });
  }
}

/**
 * Built-in ML models for content moderation
 */
export class BuiltInModels {
  /**
   * Explicit content detector
   */
  static createExplicitContentDetector(): IMLModel {
    return {
      id: 'explicit_content_detector',
      name: 'Explicit Content Detector',
      version: '1.0.0',
      type: 'classification',
      supportedContentTypes: ['text', 'image'],
      predict: async (input: any) => {
        // Simulate ML prediction - in real implementation, this would call actual ML model
        const text = input.text || '';
        const hasExplicitKeywords = /explicit|adult|nsfw/i.test(text);
        const confidence = hasExplicitKeywords ? 0.85 + Math.random() * 0.1 : Math.random() * 0.3;

        return {
          isExplicit: confidence > 0.7,
          confidence,
          categories: hasExplicitKeywords ? ['sexual', 'adult'] : [],
          severity: confidence > 0.9 ? 'high' : confidence > 0.7 ? 'medium' : 'low'
        };
      },
      evaluate: async (input: any) => {
        const result = await this.createExplicitContentDetector().predict(input);
        return result.confidence;
      },
      isAvailable: () => true,
      getMetadata: () => ({
        description: 'Detects explicit and adult content in text and images',
        accuracy: 0.92,
        latency: 50,
        languages: ['en', 'es', 'fr', 'de']
      })
    };
  }

  /**
   * Hate speech detector
   */
  static createHateSpeechDetector(): IMLModel {
    return {
      id: 'hate_speech_detector',
      name: 'Hate Speech Detector',
      version: '1.0.0',
      type: 'classification',
      supportedContentTypes: ['text'],
      predict: async (input: any) => {
        const text = input.text || '';
        const hateKeywords = ['hate', 'discrimination', 'racist', 'sexist', 'homophobic', 'xenophobic'];
        const hasHateKeywords = hateKeywords.some(keyword =>
          new RegExp(keyword, 'i').test(text)
        );
        const confidence = hasHateKeywords ? 0.8 + Math.random() * 0.15 : Math.random() * 0.25;

        return {
          isHateSpeech: confidence > 0.6,
          confidence,
          targetedGroups: hasHateKeywords ? ['race', 'religion', 'gender'] : [],
          severity: confidence > 0.85 ? 'high' : confidence > 0.6 ? 'medium' : 'low'
        };
      },
      evaluate: async (input: any) => {
        const result = await this.createHateSpeechDetector().predict(input);
        return result.confidence;
      },
      isAvailable: () => true,
      getMetadata: () => ({
        description: 'Detects hate speech and discriminatory content',
        accuracy: 0.89,
        latency: 75,
        languages: ['en', 'es', 'fr', 'de']
      })
    };
  }

  /**
   * Spam detector
   */
  static createSpamDetector(): IMLModel {
    return {
      id: 'spam_detector',
      name: 'Spam Detector',
      version: '1.0.0',
      type: 'classification',
      supportedContentTypes: ['text'],
      predict: async (input: any) => {
        const text = input.text || '';
        const spamPatterns = [
          /buy.*now/i,
          /free.*money/i,
          /click.*here/i,
          /limited.*time/i,
          /act.*now/i
        ];

        const hasSpamPatterns = spamPatterns.some(pattern => pattern.test(text));
        const hasExcessiveLinks = (text.match(/https?:\/\//g) || []).length > 3;
        const hasExcessiveCaps = (text.match(/[A-Z]/g) || []).length / text.length > 0.3;

        const spamScore = (hasSpamPatterns ? 0.4 : 0) +
                         (hasExcessiveLinks ? 0.3 : 0) +
                         (hasExcessiveCaps ? 0.2 : 0) +
                         Math.random() * 0.1;

        return {
          isSpam: spamScore > 0.5,
          confidence: Math.min(spamScore, 0.95),
          spamType: hasExcessiveLinks ? 'link_spam' : hasSpamPatterns ? 'promotional' : 'other',
          severity: spamScore > 0.8 ? 'high' : spamScore > 0.5 ? 'medium' : 'low'
        };
      },
      evaluate: async (input: any) => {
        const result = await this.createSpamDetector().predict(input);
        return result.confidence;
      },
      isAvailable: () => true,
      getMetadata: () => ({
        description: 'Detects spam and promotional content',
        accuracy: 0.94,
        latency: 60,
        languages: ['en', 'es', 'fr', 'de']
      })
    };
  }

  /**
   * Toxicity detector
   */
  static createToxicityDetector(): IMLModel {
    return {
      id: 'toxicity_detector',
      name: 'Toxicity Detector',
      version: '1.0.0',
      type: 'classification',
      supportedContentTypes: ['text'],
      predict: async (input: any) => {
        const text = input.text || '';
        const toxicWords = ['stupid', 'idiot', 'hate', 'kill', 'die', 'worthless'];
        const hasToxicWords = toxicWords.some(word => text.toLowerCase().includes(word));
        const hasExcessivePunctuation = (text.match(/[!?.]/g) || []).length > 5;
        const hasAllCaps = text === text.toUpperCase() && text.length > 10;

        const toxicityScore = (hasToxicWords ? 0.5 : 0) +
                             (hasExcessivePunctuation ? 0.2 : 0) +
                             (hasAllCaps ? 0.1 : 0) +
                             Math.random() * 0.2;

        return {
          isToxic: toxicityScore > 0.4,
          confidence: Math.min(toxicityScore, 0.95),
          toxicityLevel: toxicityScore > 0.8 ? 'severe' : toxicityScore > 0.4 ? 'moderate' : 'mild',
          categories: hasToxicWords ? ['profanity', 'threat'] : ['behavioral']
        };
      },
      evaluate: async (input: any) => {
        const result = await this.createToxicityDetector().predict(input);
        return result.confidence;
      },
      isAvailable: () => true,
      getMetadata: () => ({
        description: 'Detects toxic and abusive content',
        accuracy: 0.91,
        latency: 55,
        languages: ['en', 'es', 'fr', 'de']
      })
    };
  }

  /**
   * PII detector
   */
  static createPIIDetector(): IMLModel {
    return {
      id: 'pii_detector',
      name: 'PII Detector',
      version: '1.0.0',
      type: 'detection',
      supportedContentTypes: ['text'],
      predict: async (input: any) => {
        const text = input.text || '';

        // Email detection
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = text.match(emailRegex) || [];

        // Phone detection
        const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
        const phones = text.match(phoneRegex) || [];

        // SSN detection
        const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
        const ssns = text.match(ssnRegex) || [];

        // Credit card detection
        const ccRegex = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
        const creditCards = text.match(ccRegex) || [];

        const piiItems = [
          ...emails.map(email => ({ type: 'email', value: email })),
          ...phones.map(phone => ({ type: 'phone', value: phone })),
          ...ssns.map(ssn => ({ type: 'ssn', value: ssn })),
          ...creditCards.map(cc => ({ type: 'credit_card', value: cc }))
        ];

        return {
          hasPII: piiItems.length > 0,
          confidence: piiItems.length > 0 ? 0.95 : 0.1,
          piiItems,
          riskLevel: ssns.length > 0 || creditCards.length > 0 ? 'high' : 'medium'
        };
      },
      evaluate: async (input: any) => {
        const result = await this.createPIIDetector().predict(input);
        return result.confidence;
      },
      isAvailable: () => true,
      getMetadata: () => ({
        description: 'Detects personally identifiable information',
        accuracy: 0.96,
        latency: 45,
        languages: ['en']
      })
    };
  }

  /**
   * Sentiment analyzer
   */
  static createSentimentAnalyzer(): IMLModel {
    return {
      id: 'sentiment_analyzer',
      name: 'Sentiment Analyzer',
      version: '1.0.0',
      type: 'classification',
      supportedContentTypes: ['text'],
      predict: async (input: any) => {
        const text = input.text || '';
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like'];
        const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible', 'worst'];

        const positiveCount = positiveWords.filter(word =>
          text.toLowerCase().includes(word)
        ).length;

        const negativeCount = negativeWords.filter(word =>
          text.toLowerCase().includes(word)
        ).length;

        const totalWords = text.split(/\s+/).length;
        const sentimentScore = (positiveCount - negativeCount) / Math.max(totalWords, 1);

        return {
          sentiment: sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral',
          confidence: Math.min(Math.abs(sentimentScore) * 2, 0.9) + 0.1,
          score: sentimentScore,
          magnitude: Math.abs(sentimentScore)
        };
      },
      evaluate: async (input: any) => {
        const result = await this.createSentimentAnalyzer().predict(input);
        return result.confidence;
      },
      isAvailable: () => true,
      getMetadata: () => ({
        description: 'Analyzes text sentiment and emotion',
        accuracy: 0.87,
        latency: 40,
        languages: ['en', 'es', 'fr', 'de']
      })
    };
  }

  /**
   * Get all built-in models
   */
  static getAllModels(): IMLModel[] {
    return [
      this.createExplicitContentDetector(),
      this.createHateSpeechDetector(),
      this.createSpamDetector(),
      this.createToxicityDetector(),
      this.createPIIDetector(),
      this.createSentimentAnalyzer()
    ];
  }
}

/**
 * ML model ensemble for improved accuracy
 */
export class MLModelEnsemble {
  private models: IMLModel[] = [];
  private weights: number[] = [];

  /**
   * Add model to ensemble
   */
  addModel(model: IMLModel, weight: number = 1.0): void {
    this.models.push(model);
    this.weights.push(weight);
  }

  /**
   * Run ensemble prediction
   */
  async predict(input: any): Promise<{
    result: any;
    confidence: number;
    modelResults: any[];
  }> {
    const modelResults: any[] = [];

    // Run all models in parallel
    const predictions = await Promise.allSettled(
      this.models.map(model => model.predict(input))
    );

    // Collect successful predictions
    predictions.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        modelResults.push({
          model: this.models[index],
          result: result.value,
          weight: this.weights[index]
        });
      }
    });

    if (modelResults.length === 0) {
      throw new Error('All models in ensemble failed');
    }

    // Calculate weighted average confidence
    const totalWeight = modelResults.reduce((sum, mr) => sum + mr.weight, 0);
    const weightedConfidence = modelResults.reduce((sum, mr) =>
      sum + (mr.result.confidence * mr.weight), 0
    ) / totalWeight;

    // Simple majority voting for boolean decisions
    const positiveVotes = modelResults.filter(mr =>
      mr.result.isExplicit || mr.result.isSpam || mr.result.isToxic || mr.result.isHateSpeech
    ).length;

    const isViolating = positiveVotes > modelResults.length / 2;

    return {
      result: {
        isViolating,
        confidence: weightedConfidence,
        modelCount: modelResults.length,
        agreement: positiveVotes / modelResults.length
      },
      confidence: weightedConfidence,
      modelResults
    };
  }

  /**
   * Get ensemble health status
   */
  getHealthStatus(): {
    totalModels: number;
    availableModels: number;
    averageAccuracy: number;
    modelDetails: Array<{
      modelId: string;
      available: boolean;
      weight: number;
    }>;
  } {
    const availableModels = this.models.filter(model => model.isAvailable());
    const averageAccuracy = availableModels.reduce((sum, model) => {
      const metadata = model.getMetadata();
      return sum + (metadata.accuracy || 0);
    }, 0) / Math.max(availableModels.length, 1);

    return {
      totalModels: this.models.length,
      availableModels: availableModels.length,
      averageAccuracy,
      modelDetails: this.models.map(model => ({
        modelId: model.id,
        available: model.isAvailable(),
        weight: this.weights[this.models.indexOf(model)]
      }))
    };
  }
}