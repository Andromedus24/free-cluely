import { ModerationService, createModeratedAdapter, ModerationPolicy } from '../ModerationService';
import { ProviderAdapter, ChatRequest, ChatResponse } from '@atlas/shared';

// Mock adapter for testing
class MockAdapter implements ProviderAdapter {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return {
      content: `Response to: ${request.messages[0]?.content}`,
      timestamp: Date.now()
    };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<any> {
    yield { content: 'Stream chunk', done: false };
    yield { content: '', done: true };
  }

  async visionAnalyze(request: any): Promise<any> {
    return { text: 'Vision analysis', confidence: 0.8 };
  }

  async imageGenerate(request: any): Promise<any> {
    return { images: [] };
  }

  async listModels(): Promise<string[]> {
    return ['model1', 'model2'];
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  getProviderInfo(): any {
    return { name: 'Mock', capabilities: ['chat'] };
  }
}

describe('ModerationService', () => {
  let moderationService: ModerationService;
  let policy: ModerationPolicy;

  beforeEach(() => {
    policy = {
      enabled: true,
      sensitivity: 'medium',
      block_harmful_content: true,
      block_pii: true,
      block_sensitive_info: true
    };
    moderationService = new ModerationService(policy);
  });

  describe('moderateChat', () => {
    it('should detect PII in chat messages', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'My email is test@example.com and phone is 555-1234' }
        ]
      };

      const result = await moderationService.moderateChat(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.pii).toBe(true);
      expect(result.violation_types).toContain('pii_email');
      expect(result.violation_types).toContain('pii_phone');
    });

    it('should detect harmful content', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'I want to harm someone with a weapon' }
        ]
      };

      const result = await moderationService.moderateChat(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.harmful).toBe(true);
      expect(result.violation_types).toContain('harmful_violence');
    });

    it('should detect blocked keywords', async () => {
      policy.blocked_keywords = ['spam', 'scam'];
      moderationService = new ModerationService(policy);

      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'This is a spam message' }
        ]
      };

      const result = await moderationService.moderateChat(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.blocked_keywords).toBe(true);
      expect(result.violation_types).toContain('spam');
    });

    it('should apply custom rules', async () => {
      policy.custom_rules = [
        {
          id: 'no_links',
          name: 'No Links',
          description: 'No external links allowed',
          pattern: 'http\\S+',
          severity: 'medium',
          action: 'block',
          enabled: true
        }
      ];
      moderationService = new ModerationService(policy);

      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'Check out https://example.com' }
        ]
      };

      const result = await moderationService.moderateChat(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.no_links).toBe(true);
    });

    it('should return unflagged when moderation is disabled', async () => {
      policy.enabled = false;
      moderationService = new ModerationService(policy);

      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'My email is test@example.com' }
        ]
      };

      const result = await moderationService.moderateChat(request);

      expect(result.flagged).toBe(false);
    });

    it('should moderate URL attachments', async () => {
      const request: ChatRequest = {
        messages: [
          {
            role: 'user',
            content: 'Check this link',
            attachments: [
              { type: 'url', content: 'https://malicious.com' }
            ]
          }
        ]
      };

      policy.allowed_domains = ['trusted.com'];
      moderationService = new ModerationService(policy);

      const result = await moderationService.moderateChat(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.blocked_domain).toBe(true);
    });
  });

  describe('redactContent', () => {
    it('should redact PII from content', async () => {
      const content = 'Email: test@example.com, Phone: 555-1234, SSN: 123-45-6789';
      const moderationResult = await moderationService.moderateChat({
        messages: [{ role: 'user', content }]
      });

      const redacted = moderationService.redactContent(content, moderationResult);

      expect(redacted).toContain('[REDACTED_EMAIL]');
      expect(redacted).toContain('[REDACTED_PHONE]');
      expect(redacted).toContain('[REDACTED_SSN]');
      expect(redacted).not.toContain('test@example.com');
    });

    it('should redact based on custom rules', async () => {
      policy.custom_rules = [
        {
          id: 'no_phone',
          name: 'No Phone Numbers',
          description: 'Redact phone numbers',
          pattern: '\\d{3}-\\d{3}-\\d{4}',
          severity: 'medium',
          action: 'redact',
          enabled: true
        }
      ];
      moderationService = new ModerationService(policy);

      const content = 'Call me at 555-1234';
      const moderationResult = await moderationService.moderateChat({
        messages: [{ role: 'user', content }]
      });

      const redacted = moderationService.redactContent(content, moderationResult);

      expect(redacted).toContain('[REDACTED]');
    });
  });

  describe('moderateVision', () => {
    it('should moderate vision prompts', async () => {
      const request = {
        image: Buffer.from('test'),
        prompt: 'Generate harmful content'
      };

      const result = await moderationService.moderateVision(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.harmful).toBe(true);
    });
  });

  describe('moderateImageGeneration', () => {
    it('should moderate image generation prompts', async () => {
      const request = {
        prompt: 'Generate explicit content'
      };

      const result = await moderationService.moderateImageGeneration(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.harmful).toBe(true);
    });

    it('should detect harmful generation patterns', async () => {
      const request = {
        prompt: 'Show blood and violence'
      };

      const result = await moderationService.moderateImageGeneration(request);

      expect(result.flagged).toBe(true);
      expect(result.categories?.harmful_generation).toBe(true);
    });
  });

  describe('calculateSeverity', () => {
    it('should calculate high severity for violent content', () => {
      const violations = ['harmful_violence'];
      const severity = (moderationService as any).calculateSeverity(violations);

      expect(severity).toBe('high');
    });

    it('should calculate medium severity for hate speech', () => {
      const violations = ['harmful_hate_speech'];
      const severity = (moderationService as any).calculateSeverity(violations);

      expect(severity).toBe('medium');
    });

    it('should calculate low severity for less severe violations', () => {
      const violations = ['pii_email'];
      const severity = (moderationService as any).calculateSeverity(violations);

      expect(severity).toBe('low');
    });
  });
});

describe('createModeratedAdapter', () => {
  let mockAdapter: MockAdapter;
  let moderationService: ModerationService;
  let moderatedAdapter: ProviderAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    moderationService = new ModerationService({
      enabled: true,
      sensitivity: 'medium',
      block_harmful_content: true,
      block_pii: true,
      block_sensitive_info: true
    });
    moderatedAdapter = createModeratedAdapter(mockAdapter, moderationService);
  });

  it('should block requests with high severity violations', async () => {
    // Mock moderation to return high severity violation
    jest.spyOn(moderationService, 'moderateChat').mockResolvedValue({
      flagged: true,
      categories: { harmful: true },
      violation_types: ['harmful_violence'],
      severity: 'high'
    });

    jest.spyOn(moderationService, 'getPolicy').mockReturnValue({
      enabled: true,
      sensitivity: 'medium',
      block_harmful_content: true,
      block_pii: true,
      block_sensitive_info: true
    });

    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'harmful content' }]
    };

    await expect(moderatedAdapter.chat(request)).rejects.toThrow();
  });

  it('should redact content for medium severity violations', async () => {
    // Mock moderation to return medium severity violation
    jest.spyOn(moderationService, 'moderateChat').mockResolvedValue({
      flagged: true,
      categories: { pii: true },
      violation_types: ['pii_email'],
      severity: 'medium'
    });

    jest.spyOn(moderationService, 'redactContent').mockReturnValue('Redacted content');

    jest.spyOn(moderationService, 'getPolicy').mockReturnValue({
      enabled: true,
      sensitivity: 'medium',
      block_harmful_content: false, // Don't block, just redact
      block_pii: true,
      block_sensitive_info: true
    });

    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'test@example.com' }]
    };

    const response = await moderatedAdapter.chat(request);

    expect(response.content).toBe('Redacted content');
  });

  it('should pass through unflagged requests', async () => {
    // Mock moderation to return no violations
    jest.spyOn(moderationService, 'moderateChat').mockResolvedValue({
      flagged: false
    });

    const request: ChatRequest = {
      messages: [{ role: 'user', content: 'Hello world' }]
    };

    const response = await moderatedAdapter.chat(request);

    expect(response.content).toBe('Response to: Hello world');
  });
});