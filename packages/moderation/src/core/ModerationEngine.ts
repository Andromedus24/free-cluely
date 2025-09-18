import {
  IModerationEngine,
  ModerationAnalysis,
  ModerationRule,
  ModerationRuleCondition,
  ModerationAction,
  ModerationConfidence,
  ModerationFlag,
  ModerationCategory,
  ModerationSeverity
} from '../types/ModerationTypes';

/**
 * Moderation Engine
 * Core logic for processing content and applying moderation rules
 */
export class ModerationEngine implements IModerationEngine {
  private readonly categoryWeights: Map<ModerationCategory, number> = new Map([
    [ModerationCategory.HATE_SPEECH, 0.9],
    [ModerationCategory.HARASSMENT, 0.85],
    [ModerationCategory.VIOLENCE, 0.95],
    [ModerationCategory.THREATS, 0.9],
    [ModerationCategory.SELF_HARM, 0.9],
    [ModerationCategory.ILLEGAL_CONTENT, 0.95],
    [ModerationCategory.ADULT_CONTENT, 0.7],
    [ModerationCategory.SPAM, 0.6],
    [ModerationCategory.MISINFORMATION, 0.5],
    [ModerationCategory.COPYRIGHT_VIOLATION, 0.6],
    [ModerationCategory.PERSONAL_INFO, 0.7],
    [ModerationCategory.POLITICAL, 0.3],
    [ModerationCategory.RELIGIOUS, 0.3],
    [ModerationCategory.CUSTOM, 0.4]
  ]);

  private readonly severityWeights: Map<ModerationSeverity, number> = new Map([
    [ModerationSeverity.LOW, 0.2],
    [ModerationSeverity.MEDIUM, 0.5],
    [ModerationSeverity.HIGH, 0.8],
    [ModerationSeverity.CRITICAL, 1.0]
  ]);

  async processContent(content: any, type: string): Promise<ModerationAnalysis> {
    const analysis: ModerationAnalysis = {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: type as any,
      category: ModerationCategory.CUSTOM,
      severity: ModerationSeverity.LOW,
      confidence: { score: 0, confidence: 'low' },
      action: ModerationAction.ALLOW,
      status: 'pending' as any,
      score: 0,
      flags: [],
      suggestions: [],
      metadata: {
        processedBy: 'moderation_engine',
        timestamp: new Date().toISOString()
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: 0
    };

    const startTime = Date.now();

    try {
      // Content-specific analysis
      switch (type) {
        case 'text':
          await this.analyzeTextContent(content, analysis);
          break;
        case 'image':
          await this.analyzeImageContent(content, analysis);
          break;
        case 'video':
          await this.analyzeVideoContent(content, analysis);
          break;
        case 'audio':
          await this.analyzeAudioContent(content, analysis);
          break;
        default:
          await this.analyzeGenericContent(content, analysis);
      }

      analysis.processingTime = Date.now() - startTime;
      analysis.processedAt = new Date();

    } catch (error) {
      analysis.metadata.error = error.message;
      analysis.suggestions.push('Content analysis failed - manual review recommended');
    }

    return analysis;
  }

  async applyRules(content: any, rules: ModerationRule[]): Promise<ModerationAnalysis> {
    const analysis: ModerationAnalysis = {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: 'custom' as any,
      category: ModerationCategory.CUSTOM,
      severity: ModerationSeverity.LOW,
      confidence: { score: 0, confidence: 'low' },
      action: ModerationAction.ALLOW,
      status: 'pending' as any,
      score: 0,
      flags: [],
      suggestions: [],
      metadata: {
        processedBy: 'rule_engine',
        timestamp: new Date().toISOString()
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: 0
    };

    const startTime = Date.now();

    try {
      for (const rule of rules) {
        if (rule.enabled && await this.evaluateRule(content, rule)) {
          await this.applyRuleToAnalysis(analysis, rule);
        }
      }

      analysis.processingTime = Date.now() - startTime;
      analysis.processedAt = new Date();

    } catch (error) {
      analysis.metadata.error = error.message;
      analysis.suggestions.push('Rule evaluation failed - manual review recommended');
    }

    return analysis;
  }

  async evaluateCondition(content: any, condition: ModerationRuleCondition): Promise<boolean> {
    try {
      const fieldValue = this.getNestedValue(content, condition.field);

      switch (condition.operator) {
        case 'equals':
          return this.equals(fieldValue, condition.value, condition.caseSensitive);

        case 'contains':
          return this.contains(fieldValue, condition.value, condition.caseSensitive);

        case 'matches':
          return this.matches(fieldValue, condition.value, condition.caseSensitive);

        case 'gt':
          return this.greaterThan(fieldValue, condition.value);

        case 'lt':
          return this.lessThan(fieldValue, condition.value);

        case 'gte':
          return this.greaterThanOrEqual(fieldValue, condition.value);

        case 'lte':
          return this.lessThanOrEqual(fieldValue, condition.value);

        case 'in':
          return this.includes(fieldValue, condition.value);

        case 'not_in':
          return !this.includes(fieldValue, condition.value);

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  calculateScore(analysis: ModerationAnalysis): number {
    if (analysis.flags.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    for (const flag of analysis.flags) {
      const categoryWeight = this.categoryWeights.get(flag.category) || 0.5;
      const severityWeight = this.severityWeights.get(flag.severity) || 0.5;
      const confidenceWeight = flag.confidence.score;

      const flagScore = categoryWeight * severityWeight * confidenceWeight;
      totalScore += flagScore;
      totalWeight += confidenceWeight;
    }

    return totalWeight > 0 ? Math.min(totalScore / totalWeight, 1) : 0;
  }

  determineAction(analysis: ModerationAnalysis): ModerationAction {
    const score = analysis.score;
    const highestSeverity = this.getHighestSeverityFlag(analysis.flags);
    const flagCount = analysis.flags.length;

    // Critical content
    if (highestSeverity === ModerationSeverity.CRITICAL || score >= 0.9) {
      return ModerationAction.BLOCK;
    }

    // High severity or high score
    if (highestSeverity === ModerationSeverity.HIGH || score >= 0.7) {
      if (flagCount > 3) {
        return ModerationAction.BLOCK;
      }
      return ModerationAction.REVIEW;
    }

    // Medium severity or moderate score
    if (highestSeverity === ModerationSeverity.MEDIUM || score >= 0.5) {
      return ModerationAction.FLAG;
    }

    // Low severity or low score
    if (score >= 0.3) {
      return ModerationAction.FLAG;
    }

    // Safe content
    return ModerationAction.ALLOW;
  }

  // Private Helper Methods
  // =====================

  private async analyzeTextContent(text: string, analysis: ModerationAnalysis): Promise<void> {
    const content = text.toLowerCase();
    const flags: ModerationFlag[] = [];

    // Keyword-based detection
    const keywordPatterns = {
      hateSpeech: ['hate', 'discrimination', 'racist', 'sexist', 'homophobic'],
      harassment: ['harass', 'bully', 'threaten', 'stalk', 'abuse'],
      violence: ['kill', 'murder', 'violence', 'attack', 'hurt'],
      spam: ['click here', 'free money', 'winner', 'congratulations', 'limited time'],
      adult: ['porn', 'adult', 'nsfw', 'explicit', 'sexual'],
      personalInfo: ['ssn', 'credit card', 'password', 'phone number', 'email address'],
      threats: ['i will kill', 'i will hurt', 'i will attack', 'death threat'],
      selfHarm: ['kill myself', 'suicide', 'self harm', 'end my life', 'want to die']
    };

    for (const [category, keywords] of Object.entries(keywordPatterns)) {
      const matches = keywords.filter(keyword => content.includes(keyword));
      if (matches.length > 0) {
        flags.push({
          id: this.generateId(),
          type: 'keyword',
          category: category as ModerationCategory,
          severity: this.determineKeywordSeverity(category, matches.length),
          message: `Detected ${category} keywords: ${matches.join(', ')}`,
          evidence: matches,
          confidence: {
            score: Math.min(matches.length * 0.2, 0.9),
            confidence: matches.length > 2 ? 'high' : matches.length > 1 ? 'medium' : 'low'
          }
        });
      }
    }

    // Pattern-based detection
    const patternFlags = this.detectPatterns(text);
    flags.push(...patternFlags);

    // Language analysis
    const languageFlags = this.analyzeLanguage(text);
    flags.push(...languageFlags);

    analysis.flags = flags;
    analysis.suggestions = this.generateSuggestions(flags);
    analysis.metadata.analysisType = 'text';
    analysis.metadata.wordCount = text.split(/\s+/).length;
  }

  private async analyzeImageContent(imageData: Buffer | string, analysis: ModerationAnalysis): Promise<void> {
    const flags: ModerationFlag[] = [];

    // Image size and format analysis
    if (typeof imageData === 'string') {
      // URL-based image
      flags.push({
        id: this.generateId(),
        type: 'image_url',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.LOW,
        message: 'Image URL provided - need to fetch and analyze',
        evidence: [imageData],
        confidence: { score: 0.3, confidence: 'low' }
      });
    } else {
      // Buffer-based image
      const sizeKB = imageData.length / 1024;
      if (sizeKB > 10000) { // > 10MB
        flags.push({
          id: this.generateId(),
          type: 'image_size',
          category: ModerationCategory.CUSTOM,
          severity: ModerationSeverity.MEDIUM,
          message: `Large image detected: ${sizeKB.toFixed(2)}KB`,
          evidence: [sizeKB.toString()],
          confidence: { score: 0.8, confidence: 'high' }
        });
      }
    }

    // Metadata analysis (would require image processing library)
    const metadataFlags = this.analyzeImageMetadata(imageData);
    flags.push(...metadataFlags);

    analysis.flags = flags;
    analysis.suggestions = this.generateSuggestions(flags);
    analysis.metadata.analysisType = 'image';
  }

  private async analyzeVideoContent(videoData: Buffer | string, analysis: ModerationAnalysis): Promise<void> {
    const flags: ModerationFlag[] = [];

    // Video duration and size analysis
    if (typeof videoData === 'string') {
      flags.push({
        id: this.generateId(),
        type: 'video_url',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.LOW,
        message: 'Video URL provided - need to fetch and analyze',
        evidence: [videoData],
        confidence: { score: 0.3, confidence: 'low' }
      });
    } else {
      const sizeMB = videoData.length / (1024 * 1024);
      if (sizeMB > 100) { // > 100MB
        flags.push({
          id: this.generateId(),
          type: 'video_size',
          category: ModerationCategory.CUSTOM,
          severity: ModerationSeverity.MEDIUM,
          message: `Large video detected: ${sizeMB.toFixed(2)}MB`,
          evidence: [sizeMB.toString()],
          confidence: { score: 0.8, confidence: 'high' }
        });
      }
    }

    analysis.flags = flags;
    analysis.suggestions = this.generateSuggestions(flags);
    analysis.metadata.analysisType = 'video';
  }

  private async analyzeAudioContent(audioData: Buffer | string, analysis: ModerationAnalysis): Promise<void> {
    const flags: ModerationFlag[] = [];

    // Audio duration and size analysis
    if (typeof audioData === 'string') {
      flags.push({
        id: this.generateId(),
        type: 'audio_url',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.LOW,
        message: 'Audio URL provided - need to fetch and analyze',
        evidence: [audioData],
        confidence: { score: 0.3, confidence: 'low' }
      });
    } else {
      const sizeMB = audioData.length / (1024 * 1024);
      if (sizeMB > 50) { // > 50MB
        flags.push({
          id: this.generateId(),
          type: 'audio_size',
          category: ModerationCategory.CUSTOM,
          severity: ModerationSeverity.MEDIUM,
          message: `Large audio detected: ${sizeMB.toFixed(2)}MB`,
          evidence: [sizeMB.toString()],
          confidence: { score: 0.8, confidence: 'high' }
        });
      }
    }

    analysis.flags = flags;
    analysis.suggestions = this.generateSuggestions(flags);
    analysis.metadata.analysisType = 'audio';
  }

  private async analyzeGenericContent(content: any, analysis: ModerationAnalysis): Promise<void> {
    const flags: ModerationFlag[] = [];

    // Generic content analysis
    if (typeof content === 'object') {
      const strContent = JSON.stringify(content).toLowerCase();
      const genericFlags = this.analyzeGenericText(strContent);
      flags.push(...genericFlags);
    }

    analysis.flags = flags;
    analysis.suggestions = this.generateSuggestions(flags);
    analysis.metadata.analysisType = 'generic';
  }

  private detectPatterns(text: string): ModerationFlag[] {
    const flags: ModerationFlag[] = [];

    // URL patterns
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlPattern) || [];
    if (urls.length > 5) {
      flags.push({
        id: this.generateId(),
        type: 'pattern',
        category: ModerationCategory.SPAM,
        severity: ModerationSeverity.MEDIUM,
        message: `Multiple URLs detected: ${urls.length} links`,
        evidence: urls,
        confidence: { score: 0.7, confidence: 'high' }
      });
    }

    // Email patterns
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailPattern) || [];
    if (emails.length > 3) {
      flags.push({
        id: this.generateId(),
        type: 'pattern',
        category: ModerationCategory.PERSONAL_INFO,
        severity: ModerationSeverity.MEDIUM,
        message: `Multiple email addresses detected: ${emails.length} emails`,
        evidence: emails,
        confidence: { score: 0.8, confidence: 'high' }
      });
    }

    // Phone number patterns
    const phonePattern = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g;
    const phones = text.match(phonePattern) || [];
    if (phones.length > 2) {
      flags.push({
        id: this.generateId(),
        type: 'pattern',
        category: ModerationCategory.PERSONAL_INFO,
        severity: ModerationSeverity.MEDIUM,
        message: `Multiple phone numbers detected: ${phones.length} numbers`,
        evidence: phones,
        confidence: { score: 0.8, confidence: 'high' }
      });
    }

    return flags;
  }

  private analyzeLanguage(text: string): ModerationFlag[] {
    const flags: ModerationFlag[] = [];

    // Profanity detection
    const profanityList = ['fuck', 'shit', 'ass', 'damn', 'hell', 'bitch', 'bastard'];
    const foundProfanity = profanityList.filter(word => text.toLowerCase().includes(word));

    if (foundProfanity.length > 0) {
      flags.push({
        id: this.generateId(),
        type: 'language',
        category: ModerationCategory.HARASSMENT,
        severity: foundProfanity.length > 3 ? ModerationSeverity.HIGH : ModerationSeverity.MEDIUM,
        message: `Profanity detected: ${foundProfanity.length} instances`,
        evidence: foundProfanity,
        confidence: { score: Math.min(foundProfanity.length * 0.3, 0.9), confidence: 'high' }
      });
    }

    // All caps detection (potential yelling)
    const words = text.split(/\s+/);
    const allCapsWords = words.filter(word => word.length > 3 && word === word.toUpperCase());
    if (allCapsWords.length > words.length * 0.3) {
      flags.push({
        id: this.generateId(),
        type: 'language',
        category: ModerationCategory.HARASSMENT,
        severity: ModerationSeverity.LOW,
        message: `Excessive use of capital letters detected`,
        evidence: allCapsWords.slice(0, 5),
        confidence: { score: 0.6, confidence: 'medium' }
      });
    }

    return flags;
  }

  private analyzeImageMetadata(imageData: Buffer | string): ModerationFlag[] {
    // Placeholder for actual image metadata analysis
    // Would integrate with libraries like sharp, jimp, or exif-parser
    return [];
  }

  private analyzeGenericText(text: string): ModerationFlag[] {
    const flags: ModerationFlag[] = [];

    // Generic keyword detection for JSON content
    const suspiciousKeywords = ['password', 'secret', 'key', 'token', 'auth'];
    const matches = suspiciousKeywords.filter(keyword => text.includes(keyword));

    if (matches.length > 0) {
      flags.push({
        id: this.generateId(),
        type: 'generic',
        category: ModerationCategory.PERSONAL_INFO,
        severity: ModerationSeverity.MEDIUM,
        message: `Suspicious keywords detected in content: ${matches.join(', ')}`,
        evidence: matches,
        confidence: { score: 0.5, confidence: 'medium' }
      });
    }

    return flags;
  }

  private generateSuggestions(flags: ModerationFlag[]): string[] {
    const suggestions: string[] = [];

    if (flags.length === 0) {
      suggestions.push('Content appears safe');
      return suggestions;
    }

    const hasHighSeverity = flags.some(flag =>
      flag.severity === ModerationSeverity.HIGH || flag.severity === ModerationSeverity.CRITICAL
    );

    const hasMultipleFlags = flags.length > 3;
    const hasPersonalInfo = flags.some(flag => flag.category === ModerationCategory.PERSONAL_INFO);
    const hasSpam = flags.some(flag => flag.category === ModerationCategory.SPAM);

    if (hasHighSeverity) {
      suggestions.push('Immediate review recommended - high severity content detected');
    }

    if (hasMultipleFlags) {
      suggestions.push('Multiple policy violations detected - comprehensive review needed');
    }

    if (hasPersonalInfo) {
      suggestions.push('Personal information detected - consider redaction');
    }

    if (hasSpam) {
      suggestions.push('Spam-like content detected - verify authenticity');
    }

    if (flags.some(flag => flag.category === ModerationCategory.HATE_SPEECH)) {
      suggestions.push('Hate speech detected - strict enforcement recommended');
    }

    return suggestions;
  }

  private determineKeywordSeverity(category: string, matchCount: number): ModerationSeverity {
    const baseSeverities: Record<string, ModerationSeverity> = {
      hateSpeech: ModerationSeverity.HIGH,
      harassment: ModerationSeverity.HIGH,
      violence: ModerationSeverity.CRITICAL,
      spam: ModerationSeverity.MEDIUM,
      adult: ModerationSeverity.HIGH,
      personalInfo: ModerationSeverity.MEDIUM,
      threats: ModerationSeverity.CRITICAL,
      selfHarm: ModerationSeverity.CRITICAL
    };

    let severity = baseSeverities[category] || ModerationSeverity.LOW;

    // Escalate severity based on match count
    if (matchCount > 5) {
      if (severity === ModerationSeverity.LOW) severity = ModerationSeverity.MEDIUM;
      if (severity === ModerationSeverity.MEDIUM) severity = ModerationSeverity.HIGH;
      if (severity === ModerationSeverity.HIGH) severity = ModerationSeverity.CRITICAL;
    }

    return severity;
  }

  private getHighestSeverityFlag(flags: ModerationFlag[]): ModerationSeverity {
    if (flags.length === 0) return ModerationSeverity.LOW;

    const severities = flags.map(flag => flag.severity);
    const severityOrder = [
      ModerationSeverity.CRITICAL,
      ModerationSeverity.HIGH,
      ModerationSeverity.MEDIUM,
      ModerationSeverity.LOW
    ];

    for (const severity of severityOrder) {
      if (severities.includes(severity)) {
        return severity;
      }
    }

    return ModerationSeverity.LOW;
  }

  private async evaluateRule(content: any, rule: ModerationRule): Promise<boolean> {
    for (const condition of rule.conditions) {
      if (!(await this.evaluateCondition(content, condition))) {
        return false;
      }
    }
    return true;
  }

  private async applyRuleToAnalysis(analysis: ModerationAnalysis, rule: ModerationRule): Promise<void> {
    analysis.flags.push({
      id: this.generateId(),
      type: 'rule',
      category: rule.category,
      severity: rule.severity,
      message: `Rule "${rule.name}" triggered`,
      evidence: [rule.description],
      confidence: { score: 0.9, confidence: 'high' },
      metadata: { ruleId: rule.id, ruleName: rule.name }
    });

    analysis.action = rule.action;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private equals(a: any, b: any, caseSensitive: boolean = false): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      return caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
  }

  private contains(a: any, b: any, caseSensitive: boolean = false): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      const strA = caseSensitive ? a : a.toLowerCase();
      const strB = caseSensitive ? b : b.toLowerCase();
      return strA.includes(strB);
    }
    if (Array.isArray(a)) {
      return a.includes(b);
    }
    return false;
  }

  private matches(a: any, b: any, caseSensitive: boolean = false): boolean {
    if (typeof a === 'string' && typeof b === 'string') {
      const flags = caseSensitive ? 'g' : 'gi';
      try {
        const regex = new RegExp(b, flags);
        return regex.test(a);
      } catch {
        return false;
      }
    }
    return false;
  }

  private greaterThan(a: any, b: any): boolean {
    return typeof a === 'number' && typeof b === 'number' && a > b;
  }

  private lessThan(a: any, b: any): boolean {
    return typeof a === 'number' && typeof b === 'number' && a < b;
  }

  private greaterThanOrEqual(a: any, b: any): boolean {
    return typeof a === 'number' && typeof b === 'number' && a >= b;
  }

  private lessThanOrEqual(a: any, b: any): boolean {
    return typeof a === 'number' && typeof b === 'number' && a <= b;
  }

  private includes(a: any, b: any): boolean {
    return Array.isArray(a) && Array.isArray(b) && b.every(item => a.includes(item));
  }

  private generateId(): string {
    return `engine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}