import { ChatRequest, ChatMessage, VisionRequest } from '../types/provider';

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  redactedContent?: string;
  categories?: {
    personal_info: boolean;
    sensitive_data: boolean;
    harmful_content: boolean;
    spam: boolean;
  };
  confidence?: number;
}

export interface ModerationConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  blockPersonalInfo: boolean;
  blockSensitiveData: boolean;
  blockHarmfulContent: boolean;
  blockSpam: boolean;
  customPatterns?: string[];
}

export class ModerationService {
  private config: ModerationConfig;

  constructor(config: Partial<ModerationConfig> = {}) {
    this.config = {
      enabled: true,
      sensitivity: 'medium',
      blockPersonalInfo: true,
      blockSensitiveData: true,
      blockHarmfulContent: true,
      blockSpam: true,
      ...config
    };
  }

  async moderateChatRequest(request: ChatRequest): Promise<{ allowed: boolean; result?: ModerationResult; redactedRequest?: ChatRequest }> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    const results: ModerationResult[] = [];

    // Moderate each message in the conversation
    for (const message of request.messages) {
      const result = await this.moderateContent(message.content);
      results.push(result);

      if (!result.allowed) {
        return {
          allowed: false,
          result
        };
      }
    }

    // Check for spam patterns in the entire conversation
    const spamResult = await this.checkSpamPatterns(request.messages);
    if (!spamResult.allowed) {
      return {
        allowed: false,
        result: spamResult
      };
    }

    // Apply redaction if needed
    const redactedRequest = await this.redactSensitiveContent(request);

    return {
      allowed: true,
      redactedRequest
    };
  }

  async moderateVisionRequest(request: VisionRequest): Promise<{ allowed: boolean; result?: ModerationResult; redactedRequest?: VisionRequest }> {
    if (!this.config.enabled) {
      return { allowed: true };
    }

    // Moderate the prompt
    const promptResult = await this.moderateContent(request.prompt || '');
    if (!promptResult.allowed) {
      return {
        allowed: false,
        result: promptResult
      };
    }

    // Moderate image content if possible (basic checks)
    const imageResult = await this.moderateImageContent(request.image);
    if (!imageResult.allowed) {
      return {
        allowed: false,
        result: imageResult
      };
    }

    return {
      allowed: true
    };
  }

  private async moderateContent(content: string): Promise<ModerationResult> {
    const categories = {
      personal_info: false,
      sensitive_data: false,
      harmful_content: false,
      spam: false
    };

    let confidence = 0;
    const violations: string[] = [];

    // Personal Information Detection
    if (this.config.blockPersonalInfo) {
      const personalInfoPatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit Card
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
        /\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g, // Phone
        /\b\d{5}(-\d{4})?\b/g, // ZIP Code
      ];

      for (const pattern of personalInfoPatterns) {
        if (pattern.test(content)) {
          categories.personal_info = true;
          confidence = Math.max(confidence, 0.8);
          violations.push('personal information detected');
        }
      }
    }

    // Sensitive Data Detection
    if (this.config.blockSensitiveData) {
      const sensitivePatterns = [
        /\b(api[_\s]?key|secret[_\s]?key|access[_\s]?token|bearer[_\s]?token)\b/gi,
        /\b(password|passwd|pwd)\s*[:=]\s*\S+/gi,
        /\b(aws_access_key|aws_secret_key|azure_key|gcp_key)\b/gi,
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          categories.sensitive_data = true;
          confidence = Math.max(confidence, 0.9);
          violations.push('sensitive data detected');
        }
      }
    }

    // Harmful Content Detection
    if (this.config.blockHarmfulContent) {
      const harmfulPatterns = [
        /\b(hate|discrimination|violence|threat|abuse)\b/gi,
        /\b(kill|hurt|attack|destroy)\b/gi,
        /\b(illegal|hack|crack|exploit)\b/gi,
      ];

      for (const pattern of harmfulPatterns) {
        if (pattern.test(content)) {
          categories.harmful_content = true;
          confidence = Math.max(confidence, 0.7);
          violations.push('harmful content detected');
        }
      }
    }

    // Custom patterns
    if (this.config.customPatterns) {
      for (const customPattern of this.config.customPatterns) {
        try {
          const regex = new RegExp(customPattern, 'gi');
          if (regex.test(content)) {
            confidence = Math.max(confidence, 0.8);
            violations.push('custom pattern matched');
          }
        } catch (e) {
          console.warn('Invalid custom pattern:', customPattern);
        }
      }
    }

    // Apply sensitivity threshold
    const sensitivityThresholds = {
      low: 0.9,
      medium: 0.7,
      high: 0.5
    };

    const threshold = sensitivityThresholds[this.config.sensitivity];

    if (confidence >= threshold) {
      return {
        allowed: false,
        reason: violations.join(', '),
        categories,
        confidence
      };
    }

    return {
      allowed: true,
      categories,
      confidence
    };
  }

  private async checkSpamPatterns(messages: ChatMessage[]): Promise<ModerationResult> {
    if (!this.config.blockSpam) {
      return { allowed: true };
    }

    const content = messages.map(m => m.content).join(' ').toLowerCase();

    // Spam detection patterns
    const spamPatterns = [
      /(\b\w+\b\s*)\1{3,}/g, // Repetitive words
      /\b(free|win|prize|click|limited|offer|discount|deal)\b/gi, // Marketing keywords
      /\b(http|www|\.com|\.net|\.org)\b/gi, // URLs
      /[A-Z]{5,}/g, // ALL CAPS words
      /[!]{3,}/g, // Excessive punctuation
    ];

    let spamScore = 0;
    const violations: string[] = [];

    for (const pattern of spamPatterns) {
      const matches = content.match(pattern) || [];
      if (matches.length > 3) {
        spamScore += 0.2;
        violations.push('spam pattern detected');
      }
    }

    // Check for excessive length
    if (content.length > 10000) {
      spamScore += 0.3;
      violations.push('excessive content length');
    }

    // Check for message frequency (simple heuristics)
    if (messages.length > 20) {
      spamScore += 0.2;
      violations.push('too many messages');
    }

    const threshold = this.config.sensitivity === 'high' ? 0.4 :
                      this.config.sensitivity === 'medium' ? 0.6 : 0.8;

    if (spamScore >= threshold) {
      return {
        allowed: false,
        reason: violations.join(', '),
        categories: { spam: true },
        confidence: spamScore
      };
    }

    return {
      allowed: true,
      categories: { spam: false },
      confidence: spamScore
    };
  }

  private async moderateImageContent(image: string | Buffer): Promise<ModerationResult> {
    // Basic image content moderation
    // In a real implementation, this would use vision APIs to detect inappropriate content
    return {
      allowed: true,
      confidence: 0.5
    };
  }

  private async redactSensitiveContent(request: ChatRequest): Promise<ChatRequest> {
    if (!this.config.enabled || this.config.sensitivity === 'low') {
      return request;
    }

    const redactedMessages = request.messages.map(message => {
      let content = message.content;

      // Redact personal information
      if (this.config.blockPersonalInfo) {
        content = content.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');
        content = content.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED-CARD]');
        content = content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED-EMAIL]');
        content = content.replace(/\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g, '[REDACTED-PHONE]');
      }

      // Redact sensitive data
      if (this.config.blockSensitiveData) {
        content = content.replace(/\b(api[_\s]?key|secret[_\s]?key|access[_\s]?token|bearer[_\s]?token)\b/gi, '[REDACTED-KEY]');
        content = content.replace(/\b(password|passwd|pwd)\s*[:=]\s*\S+/gi, '[REDACTED-PASSWORD]');
        content = content.replace(/\b(aws_access_key|aws_secret_key|azure_key|gcp_key)\b/gi, '[REDACTED-CREDENTIAL]');
      }

      return {
        ...message,
        content
      };
    });

    return {
      ...request,
      messages: redactedMessages
    };
  }

  updateConfig(config: Partial<ModerationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ModerationConfig {
    return { ...this.config };
  }
}