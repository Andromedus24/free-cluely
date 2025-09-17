import { z } from 'zod';
import { ChatRequest, VisionRequest, ImageGenerateRequest } from '@atlas/shared';

// Moderation result schema
const ModerationResultSchema = z.object({
  flagged: z.boolean(),
  categories: z.record(z.boolean()).optional(),
  category_scores: z.record(z.number()).optional(),
  violation_types: z.array(z.string()).optional(),
  severity: z.enum(['low', 'medium', 'high']).optional(),
  recommendations: z.array(z.string()).optional()
});

export type ModerationResult = z.infer<typeof ModerationResultSchema>;

// Moderation policy configuration
export interface ModerationPolicy {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  block_harmful_content: boolean;
  block_pii: boolean;
  block_sensitive_info: boolean;
  custom_rules?: ModerationRule[];
  allowed_domains?: string[];
  blocked_keywords?: string[];
}

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  severity: 'low' | 'medium' | 'high';
  action: 'block' | 'warn' | 'redact';
  enabled: boolean;
}

// PII patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  credit_card: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ip_address: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  url: /https?:\/\/[^\s]+/g
};

// Harmful content patterns
const HARMFUL_PATTERNS = {
  violence: /\b(kill|murder|attack|harm|violence|weapon|bomb|terror)\b/gi,
  hate_speech: /\b(hate|discriminate|racist|sexist|homophobic|slur)\b/gi,
  self_harm: /\b(suicide|self-harm|cut|kill myself|end my life)\b/gi,
  explicit_content: /\b(porn|explicit|nude|sexual|adult)\b/gi
};

export class ModerationService {
  private policy: ModerationPolicy;

  constructor(policy: ModerationPolicy) {
    this.policy = policy;
  }

  async moderateChat(request: ChatRequest): Promise<ModerationResult> {
    if (!this.policy.enabled) {
      return { flagged: false };
    }

    const results: ModerationResult = {
      flagged: false,
      categories: {},
      category_scores: {},
      violation_types: [],
      severity: 'low',
      recommendations: []
    };

    // Check all messages
    for (const message of request.messages) {
      const content = message.content;

      // Check for PII
      if (this.policy.block_pii) {
        const piiViolations = this.checkPII(content);
        if (piiViolations.length > 0) {
          results.flagged = true;
          results.categories!.pii = true;
          results.violation_types!.push(...piiViolations);
          results.recommendations!.push('Remove personal identifying information');
        }
      }

      // Check for harmful content
      if (this.policy.block_harmful_content) {
        const harmfulViolations = this.checkHarmfulContent(content);
        if (harmfulViolations.length > 0) {
          results.flagged = true;
          results.categories!.harmful = true;
          results.violation_types!.push(...harmfulViolations);
          results.severity = this.calculateSeverity(harmfulViolations);
          results.recommendations!.push('Remove harmful content');
        }
      }

      // Check custom rules
      if (this.policy.custom_rules) {
        for (const rule of this.policy.custom_rules) {
          if (rule.enabled) {
            const pattern = new RegExp(rule.pattern, 'gi');
            if (pattern.test(content)) {
              results.flagged = true;
              results.categories![rule.id] = true;
              results.violation_types!.push(rule.name);
              results.severity = this.getHigherSeverity(results.severity, rule.severity);
              results.recommendations!.push(rule.description);
            }
          }
        }
      }

      // Check blocked keywords
      if (this.policy.blocked_keywords) {
        const lowerContent = content.toLowerCase();
        const blockedWords = this.policy.blocked_keywords.filter(keyword =>
          lowerContent.includes(keyword.toLowerCase())
        );

        if (blockedWords.length > 0) {
          results.flagged = true;
          results.categories!.blocked_keywords = true;
          results.violation_types!.push(...blockedWords);
          results.recommendations!.push('Remove blocked keywords');
        }
      }

      // Check attachments
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (attachment.type === 'url') {
            const urlResult = this.moderateURL(attachment.content.toString());
            if (urlResult.flagged) {
              results.flagged = true;
              Object.assign(results.categories!, urlResult.categories);
              results.violation_types!.push(...urlResult.violation_types!);
              results.recommendations!.push(...urlResult.recommendations!);
            }
          }
        }
      }
    }

    return results;
  }

  async moderateVision(request: VisionRequest): Promise<ModerationResult> {
    if (!this.policy.enabled) {
      return { flagged: false };
    }

    const results: ModerationResult = {
      flagged: false,
      categories: {},
      category_scores: {},
      violation_types: [],
      severity: 'low',
      recommendations: []
    };

    // Moderate the prompt
    if (request.prompt) {
      const promptResult = await this.moderateChat({
        messages: [{ role: 'user', content: request.prompt }],
        temperature: 0.7
      });

      if (promptResult.flagged) {
        Object.assign(results, promptResult);
      }
    }

    // For vision, we'll rely on the provider's built-in safety features
    // but can add custom checks here if needed

    return results;
  }

  async moderateImageGeneration(request: ImageGenerateRequest): Promise<ModerationResult> {
    if (!this.policy.enabled) {
      return { flagged: false };
    }

    const results: ModerationResult = {
      flagged: false,
      categories: {},
      category_scores: {},
      violation_types: [],
      severity: 'low',
      recommendations: []
    };

    // Moderate the prompt
    const promptResult = await this.moderateChat({
      messages: [{ role: 'user', content: request.prompt }],
      temperature: 0.7
    });

    if (promptResult.flagged) {
      Object.assign(results, promptResult);
    }

    // Additional checks for image generation
    const harmfulGenerations = this.checkHarmfulGeneration(request.prompt);
    if (harmfulGenerations.length > 0) {
      results.flagged = true;
      results.categories!.harmful_generation = true;
      results.violation_types!.push(...harmfulGenerations);
      results.severity = this.getHigherSeverity(results.severity, 'high');
      results.recommendations!.push('Prompt may generate harmful images');
    }

    return results;
  }

  redactContent(content: string, result: ModerationResult): string {
    let redactedContent = content;

    // Redact PII
    if (result.categories?.pii) {
      redactedContent = this.redactPII(redactedContent);
    }

    // Redact based on custom rules
    if (this.policy.custom_rules) {
      for (const rule of this.policy.custom_rules) {
        if (rule.enabled && rule.action === 'redact' && result.categories?.[rule.id]) {
          const pattern = new RegExp(rule.pattern, 'gi');
          redactedContent = redactedContent.replace(pattern, '[REDACTED]');
        }
      }
    }

    // Redact blocked keywords
    if (result.categories?.blocked_keywords && this.policy.blocked_keywords) {
      for (const keyword of this.policy.blocked_keywords) {
        const regex = new RegExp(keyword, 'gi');
        redactedContent = redactedContent.replace(regex, '[REDACTED]');
      }
    }

    return redactedContent;
  }

  private checkPII(content: string): string[] {
    const violations: string[] = [];

    Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
      if (pattern.test(content)) {
        violations.push(`pii_${type}`);
      }
    });

    return violations;
  }

  private checkHarmfulContent(content: string): string[] {
    const violations: string[] = [];

    Object.entries(HARMFUL_PATTERNS).forEach(([type, pattern]) => {
      if (pattern.test(content)) {
        violations.push(`harmful_${type}`);
      }
    });

    return violations;
  }

  private checkHarmfulGeneration(prompt: string): string[] {
    const violations: string[] = [];
    const harmfulPatterns = [
      /violence|blood|gore|weapon|explosion/gi,
      /nude|naked|sexual|explicit/gi,
      /hate|discrimination|racist/gi,
      /medical procedure|surgery|graphic/gi
    ];

    harmfulPatterns.forEach(pattern => {
      if (pattern.test(prompt)) {
        violations.push('harmful_generation');
      }
    });

    return violations;
  }

  private moderateURL(url: string): ModerationResult {
    const result: ModerationResult = {
      flagged: false,
      categories: {},
      violation_types: [],
      recommendations: []
    };

    // Check if URL is allowed
    if (this.policy.allowed_domains && this.policy.allowed_domains.length > 0) {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      if (!this.policy.allowed_domains.some(allowed => domain.includes(allowed))) {
        result.flagged = true;
        result.categories!.blocked_domain = true;
        result.violation_types!.push('blocked_domain');
        result.recommendations!.push('Domain not allowed');
      }
    }

    return result;
  }

  private redactPII(content: string): string {
    let redacted = content;

    Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
      redacted = redacted.replace(pattern, `[REDACTED_${type.toUpperCase()}]`);
    });

    return redacted;
  }

  private calculateSeverity(violations: string[]): 'low' | 'medium' | 'high' {
    const highSeverity = ['harmful_violence', 'harmful_self_harm', 'harmful_explicit_content'];
    const mediumSeverity = ['harmful_hate_speech', 'pii_credit_card', 'pii_ssn'];

    if (violations.some(v => highSeverity.includes(v))) return 'high';
    if (violations.some(v => mediumSeverity.includes(v))) return 'medium';
    return 'low';
  }

  private getHigherSeverity(current: 'low' | 'medium' | 'high', newSeverity: 'low' | 'medium' | 'high'): 'low' | 'medium' | 'high' {
    if (current === 'high' || newSeverity === 'high') return 'high';
    if (current === 'medium' || newSeverity === 'medium') return 'medium';
    return 'low';
  }

  updatePolicy(policy: Partial<ModerationPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  getPolicy(): ModerationPolicy {
    return { ...this.policy };
  }
}

// Create a decorator/wrapper for adapters with moderation
export function createModeratedAdapter<T extends ProviderAdapter>(
  adapter: T,
  moderationService: ModerationService
): T {
  const originalChat = adapter.chat.bind(adapter);
  const originalStreamChat = adapter.streamChat.bind(adapter);
  const originalVisionAnalyze = adapter.visionAnalyze.bind(adapter);
  const originalImageGenerate = adapter.imageGenerate.bind(adapter);

  return {
    ...adapter,
    async chat(request: ChatRequest): Promise<ChatResponse> {
      // Moderate request
      const moderationResult = await moderationService.moderateChat(request);

      if (moderationResult.flagged) {
        // Apply redaction if enabled
        const redactedRequest = {
          ...request,
          messages: request.messages.map(msg => ({
            ...msg,
            content: moderationService.redactContent(msg.content, moderationResult)
          }))
        };

        // Only proceed if not blocked
        const shouldBlock = moderationService.getPolicy().block_harmful_content &&
                          moderationResult.severity === 'high';

        if (shouldBlock) {
          throw new Error(`Request blocked due to ${moderationResult.violation_types?.join(', ')}`);
        }

        return originalChat(redactedRequest);
      }

      return originalChat(request);
    },

    async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
      const moderationResult = await moderationService.moderateChat(request);

      if (moderationResult.flagged) {
        const redactedRequest = {
          ...request,
          messages: request.messages.map(msg => ({
            ...msg,
            content: moderationService.redactContent(msg.content, moderationResult)
          }))
        };

        const shouldBlock = moderationService.getPolicy().block_harmful_content &&
                          moderationResult.severity === 'high';

        if (shouldBlock) {
          throw new Error(`Request blocked due to ${moderationResult.violation_types?.join(', ')}`);
        }

        yield* originalStreamChat(redactedRequest);
      } else {
        yield* originalStreamChat(request);
      }
    },

    async visionAnalyze(request: VisionRequest): Promise<VisionResponse> {
      const moderationResult = await moderationService.moderateVision(request);

      if (moderationResult.flagged) {
        const shouldBlock = moderationService.getPolicy().block_harmful_content &&
                          moderationResult.severity === 'high';

        if (shouldBlock) {
          throw new Error(`Vision request blocked due to ${moderationResult.violation_types?.join(', ')}`);
        }
      }

      return originalVisionAnalyze(request);
    },

    async imageGenerate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
      const moderationResult = await moderationService.moderateImageGeneration(request);

      if (moderationResult.flagged) {
        const shouldBlock = moderationService.getPolicy().block_harmful_content &&
                          moderationResult.severity === 'high';

        if (shouldBlock) {
          throw new Error(`Image generation request blocked due to ${moderationResult.violation_types?.join(', ')}`);
        }
      }

      return originalImageGenerate(request);
    }
  } as T;
}