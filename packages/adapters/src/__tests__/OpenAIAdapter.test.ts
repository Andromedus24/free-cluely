import { OpenAIAdapter } from '../OpenAIAdapter';
import { ProviderError, ProviderAuthError, ProviderConnectionError } from '@atlas/shared';

// Mock OpenAI
jest.mock('openai');
const OpenAI = require('openai');

describe('OpenAIAdapter', () => {
  let adapter: OpenAIAdapter;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      },
      images: {
        generate: jest.fn()
      },
      models: {
        list: jest.fn()
      }
    };

    OpenAI.mockImplementation(() => mockClient);
    adapter = new OpenAIAdapter({
      apiKey: 'test-api-key'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should successfully handle chat requests', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Hello, world!' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        },
        model: 'gpt-4'
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7
      };

      const response = await adapter.chat(request);

      expect(response.content).toBe('Hello, world!');
      expect(response.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cost: expect.any(Number)
      });
      expect(response.metadata).toEqual({
        model: 'gpt-4',
        finishReason: 'stop'
      });
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [{
          message: { content: null },
          finish_reason: 'stop'
        }]
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(adapter.chat(request)).rejects.toThrow(ProviderError);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      mockClient.chat.completions.create.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(adapter.chat(request)).rejects.toThrow(ProviderError);
    });

    it('should handle authentication errors', async () => {
      const error = new Error('401 Unauthorized');
      mockClient.chat.completions.create.mockRejectedValue(error);

      const request = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(adapter.chat(request)).rejects.toThrow(ProviderAuthError);
    });

    it('should apply system prompt based on mode', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Code response' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        },
        model: 'gpt-4'
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        messages: [{ role: 'user', content: 'Write code' }],
        mode: 'code' as const,
        temperature: 0.7
      };

      await adapter.chat(request);

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('expert programmer')
            })
          ])
        })
      );
    });
  });

  describe('streamChat', () => {
    it('should handle streaming responses', async () => {
      const mockStream = [
        {
          choices: [{
            delta: { content: 'Hello' },
            finish_reason: null
          }],
          model: 'gpt-4'
        },
        {
          choices: [{
            delta: { content: ', world!' },
            finish_reason: 'stop'
          }],
          model: 'gpt-4',
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
          }
        }
      ];

      const mockAsyncIterable = {
        [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
          for (const chunk of mockStream) {
            yield chunk;
          }
        })
      };

      mockClient.chat.completions.create.mockResolvedValue(mockAsyncIterable);

      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7
      };

      const chunks = [];
      for await (const chunk of adapter.streamChat(request)) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].content).toBe('Hello');
      expect(chunks[0].done).toBe(false);
      expect(chunks[1].content).toBe(', world!');
      expect(chunks[1].done).toBe(true);
      expect(chunks[1].usage).toBeDefined();
    });

    it('should handle streaming errors', async () => {
      const error = new Error('Stream Error');
      const mockAsyncIterable = {
        [Symbol.asyncIterator]: jest.fn().mockImplementation(async function* () {
          throw error;
        })
      };

      mockClient.chat.completions.create.mockResolvedValue(mockAsyncIterable);

      const request = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(adapter.streamChat(request)).rejects.toThrow(ProviderError);
    });
  });

  describe('visionAnalyze', () => {
    it('should handle vision analysis with base64 image', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Image analysis result' },
          finish_reason: 'stop'
        }],
        model: 'gpt-4-vision-preview'
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        image: 'data:image/jpeg;base64,testbase64',
        prompt: 'Analyze this image'
      };

      const response = await adapter.visionAnalyze(request);

      expect(response.text).toBe('Image analysis result');
      expect(response.confidence).toBe(0.9);

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4-vision-preview',
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.arrayContaining([
                expect.objectContaining({
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/jpeg;base64,testbase64'
                  }
                })
              ])
            })
          ])
        })
      );
    });

    it('should handle vision analysis with buffer image', async () => {
      const mockResponse = {
        choices: [{
          message: { content: 'Buffer image analysis' },
          finish_reason: 'stop'
        }],
        model: 'gpt-4-vision-preview'
      };

      mockClient.chat.completions.create.mockResolvedValue(mockResponse);

      const request = {
        image: Buffer.from('testbuffer'),
        prompt: 'Analyze this image'
      };

      const response = await adapter.visionAnalyze(request);

      expect(response.text).toBe('Buffer image analysis');
    });
  });

  describe('imageGenerate', () => {
    it('should handle image generation requests', async () => {
      const mockResponse = {
        data: [
          {
            url: 'https://example.com/image1.jpg',
            revised_prompt: 'A beautiful landscape',
            size: '1024x1024'
          }
        ]
      };

      mockClient.images.generate.mockResolvedValue(mockResponse);

      const request = {
        prompt: 'A beautiful landscape',
        options: {
          count: 1,
          quality: 'standard' as const,
          aspect: 'square' as const
        }
      };

      const response = await adapter.imageGenerate(request);

      expect(response.images).toHaveLength(1);
      expect(response.images[0].url).toBe('https://example.com/image1.jpg');
      expect(response.images[0].revisedPrompt).toBe('A beautiful landscape');

      expect(mockClient.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'dall-e-3',
          prompt: 'A beautiful landscape',
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        })
      );
    });

    it('should map aspect ratios correctly', async () => {
      const mockResponse = { data: [] };
      mockClient.images.generate.mockResolvedValue(mockResponse);

      const request = {
        prompt: 'Test',
        options: { aspect: 'portrait' as const }
      };

      await adapter.imageGenerate(request);

      expect(mockClient.images.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: '1024x1792'
        })
      );
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockResponse = {
        data: [
          { id: 'gpt-4' },
          { id: 'gpt-4-turbo' },
          { id: 'dall-e-3' }
        ]
      };

      mockClient.models.list.mockResolvedValue(mockResponse);

      const models = await adapter.listModels();

      expect(models).toEqual(['gpt-4', 'gpt-4-turbo', 'dall-e-3']);
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockClient.models.list.mockResolvedValue({ data: [] });

      const result = await adapter.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockClient.models.list.mockRejectedValue(new Error('Connection failed'));

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });

    it('should throw auth error for 401', async () => {
      mockClient.models.list.mockRejectedValue(new Error('401 Unauthorized'));

      await expect(adapter.testConnection()).rejects.toThrow(ProviderAuthError);
    });
  });

  describe('getProviderInfo', () => {
    it('should return correct provider information', () => {
      const info = adapter.getProviderInfo();

      expect(info.name).toBe('OpenAI');
      expect(info.capabilities).toEqual(['chat', 'stream', 'vision', 'image_generation']);
      expect(info.models).toHaveLength(3);
      expect(info.models[0].id).toBe('gpt-4');
      expect(info.models[0].supportsStreaming).toBe(true);
      expect(info.models[0].supportsVision).toBe(true);
    });
  });
});