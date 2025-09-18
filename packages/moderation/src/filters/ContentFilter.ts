import {
  ModerationAnalysis,
  ModerationAction,
  ModerationCategory,
  ModerationSeverity,
  ModerationContentType,
  ModerationConfidence
} from '../types/ModerationTypes';

/**
 * Content Filter Interface
 * Defines the contract for all content filtering implementations
 */
export interface IContentFilter {
  name: string;
  version: string;
  description: string;

  /**
   * Filter content and return analysis
   */
  filter(content: any, type: ModerationContentType): Promise<ModerationAnalysis>;

  /**
   * Check if filter can handle specific content type
   */
  canHandle(type: ModerationContentType): boolean;

  /**
   * Get filter capabilities
   */
  getCapabilities(): ContentFilterCapabilities;

  /**
   * Configure filter settings
   */
  configure(settings: Record<string, any>): Promise<void>;

  /**
   * Get current configuration
   */
  getConfiguration(): Record<string, any>;
}

/**
 * Content Filter Capabilities
 */
export interface ContentFilterCapabilities {
  supportedTypes: ModerationContentType[];
  realtime: boolean;
  confidence: number; // 0-1
  languages: string[];
  customRules: boolean;
  learning: boolean;
}

/**
 * Base Content Filter
 * Provides common functionality for all filters
 */
export abstract class BaseContentFilter implements IContentFilter {
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly description: string;

  protected enabled = true;
  protected settings: Record<string, any> = {};

  abstract filter(content: any, type: ModerationContentType): Promise<ModerationAnalysis>;
  abstract canHandle(type: ModerationContentType): boolean;
  abstract getCapabilities(): ContentFilterCapabilities;

  async configure(settings: Record<string, any>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    this.enabled = settings.enabled !== false;
  }

  getConfiguration(): Record<string, any> {
    return {
      ...this.settings,
      enabled: this.enabled,
      name: this.name,
      version: this.version
    };
  }

  protected createAnalysis(
    content: any,
    type: ModerationContentType,
    category: ModerationCategory,
    severity: ModerationSeverity,
    confidence: ModerationConfidence,
    flags: any[] = [],
    metadata: Record<string, any> = {}
  ): ModerationAnalysis {
    return {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: type,
      category,
      severity,
      confidence,
      action: this.determineAction(severity, confidence.score),
      status: 'completed' as any,
      score: this.calculateScore(flags, confidence.score),
      flags,
      suggestions: this.generateSuggestions(flags, severity),
      metadata: {
        filter: this.name,
        version: this.version,
        ...metadata
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: 0
    };
  }

  protected determineAction(severity: ModerationSeverity, confidence: number): ModerationAction {
    if (severity === ModerationSeverity.CRITICAL && confidence > 0.8) {
      return ModerationAction.BLOCK;
    }
    if (severity === ModerationSeverity.HIGH && confidence > 0.7) {
      return ModerationAction.FLAG;
    }
    if (severity === ModerationSeverity.MEDIUM && confidence > 0.6) {
      return ModerationAction.FLAG;
    }
    if (confidence > 0.8) {
      return ModerationAction.REVIEW;
    }
    return ModerationAction.ALLOW;
  }

  protected calculateScore(flags: any[], baseConfidence: number): number {
    if (flags.length === 0) return baseConfidence;

    const flagWeights = {
      critical: 1.0,
      high: 0.8,
      medium: 0.6,
      low: 0.3
    };

    const totalWeight = flags.reduce((sum, flag) => {
      const weight = flagWeights[flag.severity] || 0.5;
      return sum + (weight * flag.confidence.score);
    }, 0);

    return Math.min(totalWeight / flags.length, 1);
  }

  protected generateSuggestions(flags: any[], severity: ModerationSeverity): string[] {
    const suggestions: string[] = [];

    if (flags.length === 0) {
      suggestions.push('Content appears safe');
      return suggestions;
    }

    if (severity === ModerationSeverity.CRITICAL) {
      suggestions.push('Critical content detected - immediate action required');
    }

    if (severity === ModerationSeverity.HIGH) {
      suggestions.push('High-risk content - review recommended');
    }

    if (flags.some(f => f.category === ModerationCategory.PERSONAL_INFO)) {
      suggestions.push('Personal information detected - consider redaction');
    }

    if (flags.some(f => f.category === ModerationCategory.SPAM)) {
      suggestions.push('Spam-like content detected - verify authenticity');
    }

    return suggestions;
  }

  protected generateId(): string {
    return `filter_${this.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Text Content Filter
 * Specialized filter for text content analysis
 */
export class TextContentFilter extends BaseContentFilter {
  readonly name = 'text_filter';
  readonly version = '1.0.0';
  readonly description = 'Advanced text content filtering with keyword, pattern, and AI analysis';

  private keywordFilters: Map<string, KeywordFilter> = new Map();
  private patternFilters: PatternFilter[] = [];
  private languageDetector: LanguageDetector;

  constructor() {
    super();
    this.initializeDefaultFilters();
    this.languageDetector = new LanguageDetector();
  }

  async filter(content: string, type: ModerationContentType): Promise<ModerationAnalysis> {
    if (!this.enabled || type !== ModerationContentType.TEXT) {
      return this.createSafeAnalysis(content, type);
    }

    const startTime = Date.now();
    const flags: any[] = [];
    const text = content.toLowerCase();

    // Language detection
    const detectedLanguage = this.languageDetector.detect(text);

    // Keyword filtering
    const keywordFlags = this.applyKeywordFilters(text);
    flags.push(...keywordFlags);

    // Pattern filtering
    const patternFlags = this.applyPatternFilters(text);
    flags.push(...patternFlags);

    // Contextual analysis
    const contextualFlags = this.analyzeContext(text);
    flags.push(...contextualFlags);

    // Determine overall severity and category
    const { category, severity } = this.determineOverallCategoryAndSeverity(flags);

    const analysis = this.createAnalysis(
      content,
      type,
      category,
      severity,
      this.calculateOverallConfidence(flags),
      flags,
      {
        language: detectedLanguage,
        wordCount: text.split(/\s+/).length,
        charCount: text.length,
        processingTime: Date.now() - startTime
      }
    );

    analysis.processingTime = Date.now() - startTime;
    return analysis;
  }

  canHandle(type: ModerationContentType): boolean {
    return type === ModerationContentType.TEXT;
  }

  getCapabilities(): ContentFilterCapabilities {
    return {
      supportedTypes: [ModerationContentType.TEXT],
      realtime: true,
      confidence: 0.85,
      languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'],
      customRules: true,
      learning: false
    };
  }

  private initializeDefaultFilters(): void {
    // Initialize keyword filters for different categories
    this.keywordFilters.set('hate_speech', {
      category: ModerationCategory.HATE_SPEECH,
      keywords: ['hate', 'discrimination', 'racist', 'sexist', 'homophobic', 'xenophobic'],
      variants: ['h8', 'discriminate', 'racial'],
      severity: ModerationSeverity.HIGH,
      weight: 0.9
    });

    this.keywordFilters.set('harassment', {
      category: ModerationCategory.HARASSMENT,
      keywords: ['harass', 'bully', 'stalk', 'abuse', 'threaten', 'intimidate'],
      variants: ['bullyying', 'harrass'],
      severity: ModerationSeverity.HIGH,
      weight: 0.85
    });

    this.keywordFilters.set('violence', {
      category: ModerationCategory.VIOLENCE,
      keywords: ['kill', 'murder', 'violence', 'attack', 'hurt', 'assault', 'weapon'],
      variants: ['kll', 'murdr'],
      severity: ModerationSeverity.CRITICAL,
      weight: 0.95
    });

    this.keywordFilters.set('spam', {
      category: ModerationCategory.SPAM,
      keywords: ['click here', 'free money', 'winner', 'congratulations', 'limited time', 'act now'],
      variants: ['clickhere', 'free$'],
      severity: ModerationSeverity.MEDIUM,
      weight: 0.6
    });

    this.keywordFilters.set('adult', {
      category: ModerationCategory.ADULT_CONTENT,
      keywords: ['porn', 'adult', 'nsfw', 'explicit', 'sexual', 'xxx'],
      variants: ['pron', 'addult'],
      severity: ModerationSeverity.HIGH,
      weight: 0.8
    });

    // Initialize pattern filters
    this.patternFilters = [
      {
        name: 'email_pattern',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        category: ModerationCategory.PERSONAL_INFO,
        severity: ModerationSeverity.MEDIUM,
        description: 'Email addresses'
      },
      {
        name: 'phone_pattern',
        pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        category: ModerationCategory.PERSONAL_INFO,
        severity: ModerationSeverity.MEDIUM,
        description: 'Phone numbers'
      },
      {
        name: 'url_pattern',
        pattern: /https?:\/\/[^\s]+/g,
        category: ModerationCategory.SPAM,
        severity: ModerationSeverity.LOW,
        description: 'URLs'
      },
      {
        name: 'ssn_pattern',
        pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,
        category: ModerationCategory.PERSONAL_INFO,
        severity: ModerationSeverity.HIGH,
        description: 'Social Security Numbers'
      }
    ];
  }

  private applyKeywordFilters(text: string): any[] {
    const flags: any[] = [];

    for (const [filterName, filter] of this.keywordFilters) {
      const matches: string[] = [];

      // Check main keywords
      for (const keyword of filter.keywords) {
        if (text.includes(keyword)) {
          matches.push(keyword);
        }
      }

      // Check variants
      for (const variant of filter.variants) {
        if (text.includes(variant)) {
          matches.push(variant);
        }
      }

      if (matches.length > 0) {
        flags.push({
          id: this.generateId(),
          type: 'keyword',
          category: filter.category,
          severity: this.calculateKeywordSeverity(filter, matches.length),
          message: `Detected ${filterName} keywords: ${matches.join(', ')}`,
          evidence: matches,
          confidence: {
            score: Math.min(matches.length * filter.weight * 0.3, 0.9),
            confidence: matches.length > 2 ? 'high' : matches.length > 1 ? 'medium' : 'low'
          }
        });
      }
    }

    return flags;
  }

  private applyPatternFilters(text: string): any[] {
    const flags: any[] = [];

    for (const pattern of this.patternFilters) {
      const matches = text.match(pattern.pattern);
      if (matches && matches.length > 0) {
        flags.push({
          id: this.generateId(),
          type: 'pattern',
          category: pattern.category,
          severity: pattern.severity,
          message: `${pattern.description} detected: ${matches.length} matches`,
          evidence: matches.slice(0, 10), // Limit evidence
          confidence: {
            score: Math.min(matches.length * 0.2, 0.8),
            confidence: matches.length > 5 ? 'high' : matches.length > 2 ? 'medium' : 'low'
          }
        });
      }
    }

    return flags;
  }

  private analyzeContext(text: string): any[] {
    const flags: any[] = [];
    const words = text.split(/\s+/);

    // Excessive capitalization detection
    const allCapsWords = words.filter(word => word.length > 3 && word === word.toUpperCase());
    if (allCapsWords.length > words.length * 0.3) {
      flags.push({
        id: this.generateId(),
        type: 'context',
        category: ModerationCategory.HARASSMENT,
        severity: ModerationSeverity.LOW,
        message: 'Excessive use of capital letters detected',
        evidence: allCapsWords.slice(0, 5),
        confidence: {
          score: 0.6,
          confidence: 'medium'
        }
      });
    }

    // Repetitive characters detection
    const repetitivePattern = /(.)\1{3,}/g;
    const repetitiveMatches = text.match(repetitivePattern);
    if (repetitiveMatches && repetitiveMatches.length > 3) {
      flags.push({
        id: this.generateId(),
        type: 'context',
        category: ModerationCategory.SPAM,
        severity: ModerationSeverity.LOW,
        message: 'Repetitive character patterns detected',
        evidence: repetitiveMatches.slice(0, 5),
        confidence: {
          score: 0.7,
          confidence: 'medium'
        }
      });
    }

    return flags;
  }

  private determineOverallCategoryAndSeverity(flags: any[]): { category: ModerationCategory; severity: ModerationSeverity } {
    if (flags.length === 0) {
      return { category: ModerationCategory.CUSTOM, severity: ModerationSeverity.LOW };
    }

    const categoryCounts = new Map<ModerationCategory, number>();
    const severityCounts = new Map<ModerationSeverity, number>();

    flags.forEach(flag => {
      const catCount = categoryCounts.get(flag.category) || 0;
      categoryCounts.set(flag.category, catCount + 1);

      const sevCount = severityCounts.get(flag.severity) || 0;
      severityCounts.set(flag.severity, sevCount + 1);
    });

    // Find most common category
    let maxCategoryCount = 0;
    let dominantCategory = ModerationCategory.CUSTOM;
    for (const [category, count] of categoryCounts) {
      if (count > maxCategoryCount) {
        maxCategoryCount = count;
        dominantCategory = category;
      }
    }

    // Find highest severity
    let highestSeverity = ModerationSeverity.LOW;
    const severityOrder = [ModerationSeverity.CRITICAL, ModerationSeverity.HIGH, ModerationSeverity.MEDIUM, ModerationSeverity.LOW];
    for (const severity of severityOrder) {
      if (severityCounts.has(severity)) {
        highestSeverity = severity;
        break;
      }
    }

    return { category: dominantCategory, severity: highestSeverity };
  }

  private calculateOverallConfidence(flags: any[]): ModerationConfidence {
    if (flags.length === 0) {
      return { score: 1, confidence: 'high' };
    }

    const avgConfidence = flags.reduce((sum, flag) => sum + flag.confidence.score, 0) / flags.length;
    const confidenceLevel = avgConfidence >= 0.8 ? 'high' : avgConfidence >= 0.6 ? 'medium' : 'low';

    return { score: avgConfidence, confidence: confidenceLevel };
  }

  private calculateKeywordSeverity(filter: KeywordFilter, matchCount: number): ModerationSeverity {
    let severity = filter.severity;

    // Escalate severity based on match count
    if (matchCount > 5) {
      if (severity === ModerationSeverity.LOW) severity = ModerationSeverity.MEDIUM;
      if (severity === ModerationSeverity.MEDIUM) severity = ModerationSeverity.HIGH;
      if (severity === ModerationSeverity.HIGH) severity = ModerationSeverity.CRITICAL;
    }

    return severity;
  }

  private createSafeAnalysis(content: string, type: ModerationContentType): ModerationAnalysis {
    return this.createAnalysis(
      content,
      type,
      ModerationCategory.CUSTOM,
      ModerationSeverity.LOW,
      { score: 1, confidence: 'high' },
      [],
      { safe: true, filterDisabled: !this.enabled }
    );
  }
}

// Supporting Types and Classes
// ===========================

interface KeywordFilter {
  category: ModerationCategory;
  keywords: string[];
  variants: string[];
  severity: ModerationSeverity;
  weight: number;
}

interface PatternFilter {
  name: string;
  pattern: RegExp;
  category: ModerationCategory;
  severity: ModerationSeverity;
  description: string;
}

class LanguageDetector {
  private languagePatterns: Map<string, RegExp[]> = new Map([
    ['en', [/\bthe\b/g, /\band\b/g, /\bor\b/g]],
    ['es', [/\bel\b/g, /\bla\b/g, /\ben\b/g]],
    ['fr', [/\ble\b/g, /\bla\b/g, /\bet\b/g]],
    ['de', [/\bder\b/g, /\bdie\b/g, /\bdas\b/g]]
  ]);

  detect(text: string): string {
    let maxScore = 0;
    let detectedLanguage = 'en';

    for (const [lang, patterns] of this.languagePatterns) {
      let score = 0;
      for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches) {
          score += matches.length;
        }
      }

      if (score > maxScore) {
        maxScore = score;
        detectedLanguage = lang;
      }
    }

    return detectedLanguage;
  }
}