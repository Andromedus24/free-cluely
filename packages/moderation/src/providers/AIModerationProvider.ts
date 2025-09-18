import {
  IModerationAIProvider,
  ModerationAnalysis,
  ModerationCategory,
  ModerationSeverity,
  ModerationAction,
  ModerationContentType,
  ModerationConfidence
} from '../types/ModerationTypes';

/**
 * AI-powered Moderation Provider
 * Integrates with external AI services for advanced content analysis
 */
export class AIModerationProvider implements IModerationAIProvider {
  private readonly name: string;
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly model: string;
  private rateLimit: number;
  private lastRequest: number = 0;

  constructor(config: {
    name: string;
    apiKey: string;
    endpoint: string;
    model?: string;
    rateLimit?: number;
  }) {
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.model = config.model || 'default';
    this.rateLimit = config.rateLimit || 60; // requests per minute
  }

  async analyzeText(text: string): Promise<ModerationAnalysis> {
    await this.checkRateLimit();

    try {
      const response = await this.makeAPIRequest({
        content: text,
        type: 'text',
        model: this.model
      });

      return this.parseTextAnalysisResponse(response, text);

    } catch (error) {
      throw new Error(`AI text analysis failed: ${error.message}`);
    }
  }

  async analyzeImage(imageData: Buffer | string): Promise<ModerationAnalysis> {
    await this.checkRateLimit();

    try {
      const response = await this.makeAPIRequest({
        content: typeof imageData === 'string' ? imageData : imageData.toString('base64'),
        type: 'image',
        model: this.model
      });

      return this.parseImageAnalysisResponse(response, imageData);

    } catch (error) {
      throw new Error(`AI image analysis failed: ${error.message}`);
    }
  }

  async analyzeVideo(videoData: Buffer | string): Promise<ModerationAnalysis> {
    await this.checkRateLimit();

    try {
      const response = await this.makeAPIRequest({
        content: typeof videoData === 'string' ? videoData : videoData.toString('base64'),
        type: 'video',
        model: this.model
      });

      return this.parseVideoAnalysisResponse(response, videoData);

    } catch (error) {
      throw new Error(`AI video analysis failed: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  async getCapabilities(): Promise<{
    text: boolean;
    image: boolean;
    video: boolean;
    audio: boolean;
  }> {
    try {
      const response = await fetch(`${this.endpoint}/capabilities`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          text: data.text || false,
          image: data.image || false,
          video: data.video || false,
          audio: data.audio || false
        };
      }
    } catch (error) {
      // Fallback to default capabilities
    }

    return {
      text: true,
      image: true,
      video: false,
      audio: false
    };
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    const minInterval = 60000 / this.rateLimit; // ms between requests

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequest = Date.now();
  }

  private async makeAPIRequest(data: any): Promise<any> {
    const response = await fetch(`${this.endpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private parseTextAnalysisResponse(response: any, originalText: string): ModerationAnalysis {
    const analysis: ModerationAnalysis = {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: ModerationContentType.TEXT,
      category: this.mapCategory(response.category || 'custom'),
      severity: this.mapSeverity(response.severity || 'low'),
      confidence: {
        score: response.confidence || 0.5,
        confidence: this.mapConfidenceLevel(response.confidence || 0.5)
      },
      action: this.mapAction(response.action || 'allow'),
      status: 'completed' as any,
      score: response.score || 0.5,
      flags: this.parseFlags(response.flags || []),
      suggestions: response.suggestions || [],
      metadata: {
        provider: this.name,
        model: this.model,
        rawResponse: response,
        textLength: originalText.length,
        wordCount: originalText.split(/\s+/).length
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: response.processingTime || 0
    };

    return analysis;
  }

  private parseImageAnalysisResponse(response: any, originalImage: Buffer | string): ModerationAnalysis {
    const analysis: ModerationAnalysis = {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: ModerationContentType.IMAGE,
      category: this.mapCategory(response.category || 'custom'),
      severity: this.mapSeverity(response.severity || 'low'),
      confidence: {
        score: response.confidence || 0.5,
        confidence: this.mapConfidenceLevel(response.confidence || 0.5)
      },
      action: this.mapAction(response.action || 'allow'),
      status: 'completed' as any,
      score: response.score || 0.5,
      flags: this.parseFlags(response.flags || []),
      suggestions: response.suggestions || [],
      metadata: {
        provider: this.name,
        model: this.model,
        rawResponse: response,
        imageSize: typeof originalImage === 'string' ? 'url' : `${originalImage.length} bytes`,
        detectedObjects: response.detectedObjects || [],
        explicitContent: response.explicitContent || false
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: response.processingTime || 0
    };

    return analysis;
  }

  private parseVideoAnalysisResponse(response: any, originalVideo: Buffer | string): ModerationAnalysis {
    const analysis: ModerationAnalysis = {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: ModerationContentType.VIDEO,
      category: this.mapCategory(response.category || 'custom'),
      severity: this.mapSeverity(response.severity || 'low'),
      confidence: {
        score: response.confidence || 0.5,
        confidence: this.mapConfidenceLevel(response.confidence || 0.5)
      },
      action: this.mapAction(response.action || 'allow'),
      status: 'completed' as any,
      score: response.score || 0.5,
      flags: this.parseFlags(response.flags || []),
      suggestions: response.suggestions || [],
      metadata: {
        provider: this.name,
        model: this.model,
        rawResponse: response,
        videoSize: typeof originalVideo === 'string' ? 'url' : `${originalVideo.length} bytes`,
        duration: response.duration || 0,
        framesAnalyzed: response.framesAnalyzed || 0
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: response.processingTime || 0
    };

    return analysis;
  }

  private parseFlags(flags: any[]): any[] {
    return flags.map(flag => ({
      id: this.generateId(),
      type: flag.type || 'ai_detected',
      category: this.mapCategory(flag.category || 'custom'),
      severity: this.mapSeverity(flag.severity || 'low'),
      message: flag.message || 'AI detected content issue',
      evidence: flag.evidence || [],
      confidence: {
        score: flag.confidence || 0.5,
        confidence: this.mapConfidenceLevel(flag.confidence || 0.5)
      },
      metadata: {
        aiProvider: this.name,
        rawFlag: flag
      }
    }));
  }

  private mapCategory(category: string): ModerationCategory {
    const categoryMap: Record<string, ModerationCategory> = {
      'hate': ModerationCategory.HATE_SPEECH,
      'harassment': ModerationCategory.HARASSMENT,
      'spam': ModerationCategory.SPAM,
      'misinformation': ModerationCategory.MISINFORMATION,
      'violence': ModerationCategory.VIOLENCE,
      'adult': ModerationCategory.ADULT_CONTENT,
      'copyright': ModerationCategory.COPYRIGHT_VIOLATION,
      'personal': ModerationCategory.PERSONAL_INFO,
      'threat': ModerationCategory.THREATS,
      'self_harm': ModerationCategory.SELF_HARM,
      'illegal': ModerationCategory.ILLEGAL_CONTENT,
      'political': ModerationCategory.POLITICAL,
      'religious': ModerationCategory.RELIGIOUS,
      'explicit': ModerationCategory.ADULT_CONTENT,
      'toxic': ModerationCategory.HARASSMENT,
      'custom': ModerationCategory.CUSTOM
    };

    return categoryMap[category.toLowerCase()] || ModerationCategory.CUSTOM;
  }

  private mapSeverity(severity: string): ModerationSeverity {
    const severityMap: Record<string, ModerationSeverity> = {
      'low': ModerationSeverity.LOW,
      'medium': ModerationSeverity.MEDIUM,
      'high': ModerationSeverity.HIGH,
      'critical': ModerationSeverity.CRITICAL,
      'minor': ModerationSeverity.LOW,
      'moderate': ModerationSeverity.MEDIUM,
      'severe': ModerationSeverity.HIGH,
      'extreme': ModerationSeverity.CRITICAL
    };

    return severityMap[severity.toLowerCase()] || ModerationSeverity.LOW;
  }

  private mapAction(action: string): ModerationAction {
    const actionMap: Record<string, ModerationAction> = {
      'allow': ModerationAction.ALLOW,
      'flag': ModerationAction.FLAG,
      'review': ModerationAction.REVIEW,
      'block': ModerationAction.BLOCK,
      'remove': ModerationAction.REMOVE,
      'quarantine': ModerationAction.QUARANTINE,
      'escalate': ModerationAction.ESCALATE
    };

    return actionMap[action.toLowerCase()] || ModerationAction.ALLOW;
  }

  private mapConfidenceLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  private generateId(): string {
    return `ai_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * OpenAI Moderation Provider
 * Specialized provider for OpenAI's moderation API
 */
export class OpenAIModerationProvider extends AIModerationProvider {
  constructor(apiKey: string) {
    super({
      name: 'openai',
      apiKey,
      endpoint: 'https://api.openai.com/v1/moderations',
      model: 'text-moderation-latest',
      rateLimit: 60
    });
  }

  protected async makeAPIRequest(data: any): Promise<any> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: data.content,
        model: this.model
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API request failed: ${response.status} - ${errorText}`);
    }

    const openaiResponse = await response.json();

    // Transform OpenAI response to standard format
    return this.transformOpenAIResponse(openaiResponse);
  }

  private transformOpenAIResponse(openaiResponse: any): any {
    const results = openaiResponse.results?.[0] || {};
    const categories = results.categories || {};
    const scores = results.category_scores || {};

    // Find highest scoring category
    let highestCategory = 'custom';
    let highestScore = 0;

    for (const [category, score] of Object.entries(scores)) {
      if (typeof score === 'number' && score > highestScore && categories[category]) {
        highestScore = score;
        highestCategory = category;
      }
    }

    return {
      category: highestCategory,
      severity: highestScore > 0.8 ? 'critical' : highestScore > 0.6 ? 'high' : highestScore > 0.4 ? 'medium' : 'low',
      confidence: highestScore,
      score: highestScore,
      action: results.flagged ? 'flag' : 'allow',
      flags: results.flagged ? [{
        type: 'openai_moderation',
        category: this.mapCategory(highestCategory),
        severity: this.mapSeverity(highestScore > 0.8 ? 'critical' : highestScore > 0.6 ? 'high' : highestScore > 0.4 ? 'medium' : 'low'),
        message: 'OpenAI moderation flagged this content',
        evidence: Object.entries(categories).filter(([_, flagged]) => flagged).map(([cat, _]) => cat),
        confidence: { score: highestScore, confidence: this.mapConfidenceLevel(highestScore) }
      }] : [],
      suggestions: results.flagged ? ['Content flagged by OpenAI moderation - review recommended'] : ['Content appears safe'],
      processingTime: 0,
      flagged: results.flagged,
      categories: categories,
      category_scores: scores
    };
  }
}

/**
 * Google Perspective API Provider
 * Specialized provider for Google's Perspective API
 */
export class PerspectiveModerationProvider extends AIModerationProvider {
  constructor(apiKey: string) {
    super({
      name: 'perspective',
      apiKey,
      endpoint: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
      rateLimit: 30
    });
  }

  protected async makeAPIRequest(data: any): Promise<any> {
    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comment: {
          text: data.content
        },
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          IDENTITY_ATTACK: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {}
        },
        languages: ['en']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perspective API request failed: ${response.status} - ${errorText}`);
    }

    const perspectiveResponse = await response.json();
    return this.transformPerspectiveResponse(perspectiveResponse);
  }

  private transformPerspectiveResponse(response: any): any {
    const attributes = response.attributeScores || {};

    // Calculate overall toxicity
    const toxicity = attributes.TOXICITY?.summaryScore?.value || 0;
    const severeToxicity = attributes.SEVERE_TOXICITY?.summaryScore?.value || 0;
    const identityAttack = attributes.IDENTITY_ATTACK?.summaryScore?.value || 0;
    const insult = attributes.INSULT?.summaryScore?.value || 0;
    const profanity = attributes.PROFANITY?.summaryScore?.value || 0;
    const threat = attributes.THREAT?.summaryScore?.value || 0;

    const maxScore = Math.max(toxicity, severeToxicity, identityAttack, insult, profanity, threat);

    return {
      category: maxScore > 0.7 ? 'harassment' : maxScore > 0.4 ? 'custom' : 'custom',
      severity: maxScore > 0.8 ? 'critical' : maxScore > 0.6 ? 'high' : maxScore > 0.4 ? 'medium' : 'low',
      confidence: maxScore,
      score: maxScore,
      action: maxScore > 0.7 ? 'flag' : 'allow',
      flags: maxScore > 0.4 ? [{
        type: 'perspective_analysis',
        category: maxScore > 0.7 ? ModerationCategory.HARASSMENT : ModerationCategory.CUSTOM,
        severity: this.mapSeverity(maxScore > 0.8 ? 'critical' : maxScore > 0.6 ? 'high' : maxScore > 0.4 ? 'medium' : 'low'),
        message: 'Perspective API detected potentially toxic content',
        evidence: [
          `Toxicity: ${(toxicity * 100).toFixed(1)}%`,
          `Severe Toxicity: ${(severeToxicity * 100).toFixed(1)}%`,
          `Identity Attack: ${(identityAttack * 100).toFixed(1)}%`,
          `Insult: ${(insult * 100).toFixed(1)}%`,
          `Profanity: ${(profanity * 100).toFixed(1)}%`,
          `Threat: ${(threat * 100).toFixed(1)}%`
        ],
        confidence: { score: maxScore, confidence: this.mapConfidenceLevel(maxScore) }
      }] : [],
      suggestions: maxScore > 0.4 ? ['Content flagged by Perspective API - review recommended'] : ['Content appears safe'],
      processingTime: 0,
      attributeScores: attributes
    };
  }
}