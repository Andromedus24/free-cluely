import { OpenAIAdapter } from '../providers/OpenAIAdapter';
import { ProviderConfig, ChatRequest, ChatResponse, CancellationToken } from '../types/provider';

// Mock fetch for testing
global.fetch = jest.fn();

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let mockConfig: ProviderConfig;

  beforeEach(() => {
    adapter = new OpenAIAdapter();
    mockConfig = {
      apiKey: 'sk-test123',
      baseUrl: 'https://api.openai.com',
      defaultModel: 'gpt-4o-mini'
    };
    adapter.updateConfig(mockConfig);

    // Reset fetch mock
    (fetch as jest.Mock).mockClear();
  });

  describe('Configuration', () => {
    test('should validate config correctly', () => {
      const validConfig = {
        apiKey: 'sk-test123',
        baseUrl: 'https://api.openai.com'
      };

      const result = adapter.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid API key format', () => {
      const invalidConfig = {
        apiKey: 'invalid-key',
        baseUrl: 'https://api.openai.com'
      };

      const result = adapter.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid API key format');
    });

    test('should reject missing API key', () => {
      const invalidConfig = {
        baseUrl: 'https://api.openai.com'
      };

      const result = adapter.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('API key is required');
    });

    test('should reject invalid base URL', () => {
      const invalidConfig = {
        apiKey: 'sk-test123',
        baseUrl: 'invalid-url'
      };

      const result = adapter.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });
  });

  describe('Chat functionality', () => {
    test('should transform chat request correctly', async () => {
      const request: ChatRequest = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        temperature: 0.7,
        maxTokens: 100
      };

      const transformed = await (adapter as any).transformChatRequest(request);

      expect(transformed.model).toBe('gpt-4o-mini');
      expect(transformed.messages).toHaveLength(2);
      expect(transformed.temperature).toBe(0.7);
      expect(transformed.max_tokens).toBe(100);
    });

    test('should handle successful chat response', async () => {
      const mockResponse: ChatResponse = {
        id: 'chat-123',
        content: 'Hello! How can I help you?',
        model: 'gpt-4o-mini',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        },
        timestamp: new Date()
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'chat-123',
          object: 'chat.completion',
          created: Date.now() / 1000,
          model: 'gpt-4o-mini',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Hello! How can I help you?' },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const response = await adapter.chat(request);

      expect(response).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test123'
          })
        })
      );
    });

    test('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(adapter.chat(request)).rejects.toThrow('HTTP 401');
    });
  });

  describe('Streaming chat', () => {
    test('should handle streaming responses', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('data: {"id": "chat-123", "choices": [{"delta": {"content": "Hello"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: {"choices": [{"delta": {"content": "!"}}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: mockStream
      });

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const chunks: string[] = [];
      const response = await adapter.streamChat(request, (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks).toEqual(['Hello', '!']);
      expect(response.content).toBe('Hello!');
    });

    test('should handle cancellation during streaming', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          // Don't close the stream to simulate cancellation
        }
      });

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        body: mockStream
      });

      const cancellationToken: CancellationToken = {
        isCancelled: false,
        cancel: function() { this.isCancelled = true; },
        onCancelled: function(callback) {}
      };

      const request: ChatRequest = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const chunks: string[] = [];

      // Cancel immediately
      cancellationToken.cancel();

      await expect(adapter.streamChat(request, (chunk) => {
        chunks.push(chunk);
      }, cancellationToken)).rejects.toThrow('Operation cancelled');
    });
  });

  describe('Vision analysis', () => {
    test('should process image analysis requests', async () => {
      const mockImageData = Buffer.from('fake-image-data').toString('base64');

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'chat-123',
          object: 'chat.completion',
          created: Date.now() / 1000,
          model: 'gpt-4o',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'This is a test image' },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150
          }
        })
      });

      const request = {
        image: `data:image/png;base64,${mockImageData}`,
        prompt: 'What do you see?'
      };

      const response = await adapter.visionAnalyze(request);

      expect(response.content).toBe('This is a test image');
      expect(response.model).toBe('gpt-4o');
    });
  });

  describe('Model listing', () => {
    test('should list available models', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'gpt-4o', object: 'model', created: 1234567890, owned_by: 'openai' },
            { id: 'gpt-4o-mini', object: 'model', created: 1234567890, owned_by: 'openai' }
          ]
        })
      });

      const models = await adapter.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('gpt-4o');
      expect(models[0].provider).toBe('openai');
      expect(models[0].supportsStreaming).toBe(true);
      expect(models[0].supportsVision).toBe(true);
    });

    test('should fallback to default models on API failure', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const models = await adapter.listModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models[0].provider).toBe('openai');
    });
  });

  describe('Connection testing', () => {
    test('should test connection successfully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: [{ id: 'gpt-4o', object: 'model' }]
        })
      });

      const testRequest = {
        apiKey: 'sk-test123',
        baseUrl: 'https://api.openai.com'
      };

      const result = await adapter.testConnection(testRequest);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(result.latency).toBeGreaterThan(0);
    });

    test('should handle connection failures', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const testRequest = {
        apiKey: 'sk-test123',
        baseUrl: 'https://api.openai.com'
      };

      const result = await adapter.testConnection(testRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
    });
  });

  describe('Capability detection', () => {
    test('should detect model capabilities correctly', () => {
      expect((adapter as any).supportsVision('gpt-4o')).toBe(true);
      expect((adapter as any).supportsVision('gpt-4')).toBe(false);
      expect((adapter as any).supportsImageGeneration('dall-e-3')).toBe(true);
      expect((adapter as any).supportsImageGeneration('gpt-4o')).toBe(false);
    });

    test('should get context length for models', () => {
      expect((adapter as any).getContextLength('gpt-4o')).toBe(128000);
      expect((adapter as any).getContextLength('gpt-4')).toBe(8192);
      expect((adapter as any).getContextLength('gpt-3.5-turbo')).toBe(16385);
    });
  });
});