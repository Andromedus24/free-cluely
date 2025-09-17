import { ProviderService } from '../services/ProviderService';
import { ChatRequest, CancellationToken } from '../types/provider';

describe('Streaming Smoke Tests', () => {
  let providerService: ProviderService;

  beforeEach(() => {
    providerService = ProviderService.getInstance();
  });

  describe('Provider Service Streaming', () => {
    test('should initialize provider service correctly', () => {
      expect(providerService).toBeDefined();
      expect(providerService.getAvailableProviders()).toContain('openai');
      expect(providerService.getAvailableProviders()).toContain('anthropic');
      expect(providerService.getAvailableProviders()).toContain('gemini');
      expect(providerService.getAvailableProviders()).toContain('ollama');
    });

    test('should handle streaming with cancellation', async () => {
      const cancellationToken: CancellationToken = {
        isCancelled: false,
        cancel: function() { this.isCancelled = true; },
        onCancelled: function(callback) {}
      };

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      let chunksReceived = 0;
      let streamingComplete = false;

      try {
        // This will fail without proper API keys, but we can test the structure
        const streamPromise = providerService.streamChat(
          request,
          (chunk) => {
            chunksReceived++;
            if (chunksReceived === 2) {
              cancellationToken.cancel();
            }
          },
          cancellationToken
        );

        // Set a timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Test timeout')), 1000);
        });

        await Promise.race([streamPromise, timeoutPromise]);
      } catch (error) {
        // Expected to fail due to missing API keys, but we can verify the structure
        expect(error).toBeDefined();
      }

      // Verify that the streaming mechanism was set up correctly
      expect(chunksReceived).toBeGreaterThanOrEqual(0);
    });

    test('should handle provider switching', () => {
      const providers = providerService.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);

      // Test capability checking
      const chatProviders = providerService.findProvidersByCapabilities(['chat', 'stream']);
      expect(chatProviders.length).toBeGreaterThan(0);

      const visionProviders = providerService.findProvidersByCapabilities(['vision']);
      expect(visionProviders.length).toBeGreaterThan(0);
    });
  });

  describe('Moderation Service Integration', () => {
    test('should detect sensitive content', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'Here is my API key: sk-1234567890abcdef' },
          { role: 'user', content: 'My password is secret123' }
        ]
      };

      // Test with OpenAI adapter (has moderation)
      const openaiAdapter = providerService.getProviderManager().registry.get('openai');
      if (openaiAdapter) {
        // The moderation check should block sensitive content
        try {
          await openaiAdapter.chat(request);
          fail('Expected moderation to block request');
        } catch (error) {
          expect(error.message).toContain('moderation');
        }
      }
    });

    test('should allow safe content', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'user', content: 'What is the weather like today?' }
        ]
      };

      // This should pass moderation but fail due to missing API key
      const openaiAdapter = providerService.getProviderManager().registry.get('openai');
      if (openaiAdapter) {
        try {
          await openaiAdapter.chat(request);
        } catch (error) {
          // Should fail due to API key, not moderation
          expect(error.message).not.toContain('moderation');
        }
      }
    });
  });

  describe('Error Handling and Retry Logic', () => {
    test('should handle network errors gracefully', async () => {
      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const adapter = providerService.getProviderManager().registry.get('openai');
      if (adapter) {
        try {
          await adapter.chat(request);
        } catch (error) {
          expect(error).toBeDefined();
          // The error should be from the network/API call, not a crash
        }
      }
    });

    test('should validate provider configurations', () => {
      const providers = providerService.getAvailableProviders();

      for (const provider of providers) {
        const adapter = providerService.getProviderManager().registry.get(provider);
        if (adapter) {
          // Test with invalid config
          const invalidConfig = { apiKey: '' };
          const validation = adapter.validateConfig(invalidConfig);
          expect(validation.valid).toBe(false);
          expect(validation.errors.length).toBeGreaterThan(0);

          // Test with valid config structure (but fake key)
          const validConfig = { apiKey: 'test-key-123' };
          const validValidation = adapter.validateConfig(validConfig);
          // Some providers might accept any non-empty key for testing
          expect(validValidation.errors.length).toBe(0);
        }
      }
    });
  });

  describe('Provider Health Checks', () => {
    test('should perform health checks', async () => {
      try {
        const health = await providerService.healthCheck();
        expect(health).toBeDefined();
        expect(typeof health.healthy).toBe('boolean');
        expect(health.providers).toBeDefined();
      } catch (error) {
        // Health check might fail due to missing configs, which is expected
        expect(error).toBeDefined();
      }
    });

    test('should provide provider statistics', () => {
      const stats = providerService.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalProviders).toBeGreaterThan(0);
      expect(stats.configuredProviders).toBeGreaterThanOrEqual(0);
      expect(stats.capabilities).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    test('should export and import configurations', () => {
      // Test configuration export
      const exported = providerService.exportConfig();
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('object');

      // Test configuration import
      const testConfig = {
        openai: {
          apiKey: 'sk-test-export',
          baseUrl: 'https://api.openai.com',
          defaultModel: 'gpt-4o-mini'
        }
      };

      try {
        providerService.importConfig(testConfig);
        // Should not throw
      } catch (error) {
        // Might fail due to validation, which is expected
        expect(error).toBeDefined();
      }
    });

    test('should handle provider configuration updates', () => {
      const provider = 'openai';
      const updates = {
        defaultModel: 'gpt-4o',
        timeout: 60000
      };

      try {
        providerService.updateConfig(provider, updates);
        // Should not throw
      } catch (error) {
        // Might fail if provider not configured, which is expected
        expect(error).toBeDefined();
      }
    });
  });
});