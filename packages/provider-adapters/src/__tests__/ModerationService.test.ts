import { ModerationService, ModerationConfig } from '../moderation/ModerationService';
import { ChatRequest } from '../types/provider';

describe('ModerationService', () => {
  let moderationService: ModerationService;

  beforeEach(() => {
    moderationService = new ModerationService();
  });

  describe('Personal Information Detection', () => {
    test('should detect SSN patterns', async () => {
      const result = await moderationService.moderateContent('My SSN is 123-45-6789');
      expect(result.allowed).toBe(false);
      expect(result.categories?.personal_info).toBe(true);
    });

    test('should detect credit card patterns', async () => {
      const result = await moderationService.moderateContent('Card: 4111-1111-1111-1111');
      expect(result.allowed).toBe(false);
      expect(result.categories?.personal_info).toBe(true);
    });

    test('should detect email addresses', async () => {
      const result = await moderationService.moderateContent('Email me at test@example.com');
      expect(result.allowed).toBe(false);
      expect(result.categories?.personal_info).toBe(true);
    });

    test('should detect phone numbers', async () => {
      const result = await moderationService.moderateContent('Call me at 555-123-4567');
      expect(result.allowed).toBe(false);
      expect(result.categories?.personal_info).toBe(true);
    });
  });

  describe('Sensitive Data Detection', () => {
    test('should detect API keys', async () => {
      const result = await moderationService.moderateContent('API_KEY=sk-1234567890abcdef');
      expect(result.allowed).toBe(false);
      expect(result.categories?.sensitive_data).toBe(true);
    });

    test('should detect passwords', async () => {
      const result = await moderationService.moderateContent('password=secret123');
      expect(result.allowed).toBe(false);
      expect(result.categories?.sensitive_data).toBe(true);
    });

    test('should detect cloud provider keys', async () => {
      const result = await moderationService.moderateContent('AWS_ACCESS_KEY=AKIA1234567890ABCDEF');
      expect(result.allowed).toBe(false);
      expect(result.categories?.sensitive_data).toBe(true);
    });
  });

  describe('Harmful Content Detection', () => {
    test('should detect hate speech', async () => {
      const result = await moderationService.moderateContent('I hate everyone');
      expect(result.categories?.harmful_content).toBe(true);
    });

    test('should detect violent language', async () => {
      const result = await moderationService.moderateContent('I will hurt you');
      expect(result.categories?.harmful_content).toBe(true);
    });

    test('should detect illegal activity mentions', async () => {
      const result = await moderationService.moderateContent('Let me hack this system');
      expect(result.categories?.harmful_content).toBe(true);
    });
  });

  describe('Spam Detection', () => {
    test('should detect repetitive content', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'hello hello hello hello hello hello' }
        ]
      };

      const result = await moderationService.checkSpamPatterns(request.messages);
      expect(result.categories?.spam).toBe(true);
    });

    test('should detect marketing keywords', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'FREE OFFER CLICK NOW WIN PRIZE' }
        ]
      };

      const result = await moderationService.checkSpamPatterns(request.messages);
      expect(result.categories?.spam).toBe(true);
    });

    test('should detect excessive content length', async () => {
      const longContent = 'x'.repeat(15000);
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: longContent }
        ]
      };

      const result = await moderationService.checkSpamPatterns(request.messages);
      expect(result.categories?.spam).toBe(true);
    });
  });

  describe('Content Redaction', () => {
    test('should redact personal information', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'My SSN is 123-45-6789 and email is test@example.com' }
        ]
      };

      const redacted = await moderationService.redactSensitiveContent(request);
      expect(redacted.messages[0].content).toContain('[REDACTED-SSN]');
      expect(redacted.messages[0].content).toContain('[REDACTED-EMAIL]');
    });

    test('should redact sensitive data', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'My api key is sk-1234567890 and password is secret123' }
        ]
      };

      const redacted = await moderationService.redactSensitiveContent(request);
      expect(redacted.messages[0].content).toContain('[REDACTED-KEY]');
      expect(redacted.messages[0].content).toContain('[REDACTED-PASSWORD]');
    });
  });

  describe('Configuration Sensitivity', () => {
    test('should apply different sensitivity levels', async () => {
      const lowSensitivityConfig: ModerationConfig = {
        enabled: true,
        sensitivity: 'low',
        blockPersonalInfo: true,
        blockSensitiveData: true,
        blockHarmfulContent: true,
        blockSpam: true
      };

      const highSensitivityConfig: ModerationConfig = {
        enabled: true,
        sensitivity: 'high',
        blockPersonalInfo: true,
        blockSensitiveData: true,
        blockHarmfulContent: true,
        blockSpam: true
      };

      const lowSensitivityService = new ModerationService(lowSensitivityConfig);
      const highSensitivityService = new ModerationService(highSensitivityConfig);

      const contentWithMildIssues = 'I really hate waiting in lines';

      const lowResult = await lowSensitivityService.moderateContent(contentWithMildIssues);
      const highResult = await highSensitivityService.moderateContent(contentWithMildIssues);

      // High sensitivity should be more likely to block
      expect(highResult.confidence).toBeGreaterThanOrEqual(lowResult.confidence);
    });

    test('should allow disabling moderation', async () => {
      const disabledConfig: ModerationConfig = {
        enabled: false,
        sensitivity: 'medium',
        blockPersonalInfo: true,
        blockSensitiveData: true,
        blockHarmfulContent: true,
        blockSpam: true
      };

      const disabledService = new ModerationService(disabledConfig);
      const result = await disabledService.moderateContent('My SSN is 123-45-6789');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Custom Patterns', () => {
    test('should apply custom moderation patterns', async () => {
      const config: ModerationConfig = {
        enabled: true,
        sensitivity: 'medium',
        blockPersonalInfo: true,
        blockSensitiveData: true,
        blockHarmfulContent: true,
        blockSpam: true,
        customPatterns: ['\\bconfidential\\b', '\\binternal[_\\s]?use\\b']
      };

      const customService = new ModerationService(config);
      const result = await customService.moderateContent('This is confidential information');

      expect(result.allowed).toBe(false);
    });

    test('should handle invalid custom patterns gracefully', async () => {
      const config: ModerationConfig = {
        enabled: true,
        sensitivity: 'medium',
        blockPersonalInfo: true,
        blockSensitiveData: true,
        blockHarmfulContent: true,
        blockSpam: true,
        customPatterns: ['[invalid-regex'] // Invalid regex
      };

      const customService = new ModerationService(config);
      const result = await customService.moderateContent('This is safe content');

      // Should not crash and should allow safe content
      expect(result.allowed).toBe(true);
    });
  });

  describe('Chat Request Moderation', () => {
    test('should moderate entire chat conversation', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'My API key is sk-1234567890' },
          { role: 'assistant', content: 'I cannot help with that' },
          { role: 'user', content: 'What is the weather?' }
        ]
      };

      const result = await moderationService.moderateChatRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.result?.reason).toContain('sensitive data');
    });

    test('should allow safe conversations', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'What is the weather today?' }
        ]
      };

      const result = await moderationService.moderateChatRequest(request);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Vision Request Moderation', () => {
    test('should moderate vision prompts', async () => {
      const request = {
        image: Buffer.from('test'),
        prompt: 'Extract the SSN from this image'
      };

      const result = await moderationService.moderateVisionRequest(request);
      expect(result.allowed).toBe(false);
      expect(result.result?.reason).toContain('personal information');
    });

    test('should allow safe vision prompts', async () => {
      const request = {
        image: Buffer.from('test'),
        prompt: 'What do you see in this image?'
      };

      const result = await moderationService.moderateVisionRequest(request);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    test('should allow updating configuration', () => {
      const newConfig: Partial<ModerationConfig> = {
        sensitivity: 'high',
        blockSpam: false
      };

      moderationService.updateConfig(newConfig);
      const updatedConfig = moderationService.getConfig();

      expect(updatedConfig.sensitivity).toBe('high');
      expect(updatedConfig.blockSpam).toBe(false);
    });

    test('should preserve other settings when updating', () => {
      const originalConfig = moderationService.getConfig();
      const newConfig: Partial<ModerationConfig> = {
        sensitivity: 'low'
      };

      moderationService.updateConfig(newConfig);
      const updatedConfig = moderationService.getConfig();

      expect(updatedConfig.sensitivity).toBe('low');
      expect(updatedConfig.enabled).toBe(originalConfig.enabled);
      expect(updatedConfig.blockPersonalInfo).toBe(originalConfig.blockPersonalInfo);
    });
  });
});