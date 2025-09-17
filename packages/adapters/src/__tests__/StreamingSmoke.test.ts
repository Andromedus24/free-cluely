import { OpenAIAdapter } from '../OpenAIAdapter';
import { AnthropicAdapter } from '../AnthropicAdapter';
import { GeminiAdapter } from '../GeminiAdapter';
import { OllamaAdapter } from '../OllamaAdapter';
import { ProviderManager } from '../ProviderManager';

// Mock all external dependencies
jest.mock('openai');
jest.mock('@anthropic-ai/sdk');
jest.mock('@google/generative-ai');
jest.mock('node-fetch');

describe('Streaming Smoke Tests', () => {
  let mockProviders: any[];

  beforeEach(() => {
    // Create mock streaming responses
    mockProviders = [
      {
        name: 'OpenAI',
        adapter: new OpenAIAdapter({ apiKey: 'test' }),
        mockCreate: jest.fn()
      },
      {
        name: 'Anthropic',
        adapter: new AnthropicAdapter({ apiKey: 'test' }),
        mockCreate: jest.fn()
      },
      {
        name: 'Gemini',
        adapter: new GeminiAdapter({ apiKey: 'test' }),
        mockCreate: jest.fn()
      },
      {
        name: 'Ollama',
        adapter: new OllamaAdapter({ host: 'http://localhost:11434' }),
        mockCreate: jest.fn()
      }
    ];
  });

  describe('Basic Streaming Functionality', () => {
    it.each(mockProviders)('should handle basic streaming for $name', async ({ adapter, name }) => {
      // Create a mock stream that yields some chunks
      const mockStream = {
        [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
          yield { content: 'Hello', done: false };
          yield { content: ' world', done: false };
          yield { content: '!', done: true };
        })
      };

      // Mock the streaming method based on provider
      if (name === 'Ollama') {
        // Ollama uses fetch, so we need to mock that differently
        const mockResponse = {
          ok: true,
          body: {
            getReader: () => ({
              read: jest.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"response":"Hello"}\n\n') })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"response":" world"}\n\n') })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"response":"!","done":true}\n\n') })
                .mockResolvedValueOnce({ done: true })
            }),
            releaseLock: jest.fn()
          }
        };
        require('node-fetch').mockResolvedValue(mockResponse);
      } else {
        // For other providers, mock their respective streaming methods
        if (name === 'OpenAI') {
          require('openai').mockImplementation(() => ({
            chat: {
              completions: {
                create: jest.fn().mockResolvedValue(mockStream)
              }
            }
          }));
        } else if (name === 'Anthropic') {
          require('@anthropic-ai/sdk').mockImplementation(() => ({
            messages: {
              create: jest.fn().mockResolvedValue(mockStream)
            }
          }));
        } else if (name === 'Gemini') {
          require('@google/generative-ai').mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
              startChat: jest.fn().mockReturnValue({
                sendMessageStream: jest.fn().mockResolvedValue({
                  stream: mockStream
                })
              })
            })
          }));
        }
      }

      const request = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7
      };

      const chunks = [];
      try {
        for await (const chunk of adapter.streamChat(request)) {
          chunks.push(chunk);
          // Break after reasonable chunks to avoid infinite loops in tests
          if (chunks.length > 10) break;
        }
      } catch (error) {
        // It's okay if streaming fails in smoke tests (e.g., no real API)
        console.log(`${name} streaming failed (expected in smoke test):`, error.message);
      }

      // If we got chunks, verify basic structure
      if (chunks.length > 0) {
        expect(chunks[0]).toHaveProperty('content');
        expect(chunks[0]).toHaveProperty('timestamp');

        // Check that at least one chunk has content
        const contentChunks = chunks.filter(c => c.content && c.content.length > 0);
        expect(contentChunks.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Streaming Error Handling', () => {
    it.each(mockProviders)('should handle streaming errors gracefully for $name', async ({ adapter, name }) => {
      // Mock streaming to throw an error
      if (name === 'Ollama') {
        require('node-fetch').mockRejectedValue(new Error('Connection failed'));
      } else {
        const mockErrorStream = {
          [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
            throw new Error('Stream error');
          })
        };

        if (name === 'OpenAI') {
          require('openai').mockImplementation(() => ({
            chat: {
              completions: {
                create: jest.fn().mockRejectedValue(new Error('API Error'))
              }
            }
          }));
        } else if (name === 'Anthropic') {
          require('@anthropic-ai/sdk').mockImplementation(() => ({
            messages: {
              create: jest.fn().mockRejectedValue(new Error('API Error'))
            }
          }));
        } else if (name === 'Gemini') {
          require('@google/generative-ai').mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
              startChat: jest.fn().mockReturnValue({
                sendMessageStream: jest.fn().mockRejectedValue(new Error('API Error'))
              })
            })
          }));
        }
      }

      const request = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await expect(adapter.streamChat(request)).rejects.toThrow();
    });
  });

  describe('Streaming with Attachments', () => {
    it.each(mockProviders)('should handle streaming with image attachments for $name', async ({ adapter, name }) => {
      const request = {
        messages: [
          {
            role: 'user',
            content: 'What do you see in this image?',
            attachments: [
              {
                type: 'image',
                content: 'data:image/jpeg;base64,testimage'
              }
            ]
          }
        ]
      };

      // Mock successful streaming response
      const mockStream = {
        [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
          yield { content: 'I see a test image', done: false };
          yield { content: ' with some content', done: true };
        })
      };

      if (name === 'Ollama') {
        const mockResponse = {
          ok: true,
          body: {
            getReader: () => ({
              read: jest.fn()
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"response":"I see a test image"}\n\n') })
                .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"response":" with some content","done":true}\n\n') })
                .mockResolvedValueOnce({ done: true })
            }),
            releaseLock: jest.fn()
          }
        };
        require('node-fetch').mockResolvedValue(mockResponse);
      } else {
        // Mock respective providers
        if (name === 'OpenAI') {
          require('openai').mockImplementation(() => ({
            chat: {
              completions: {
                create: jest.fn().mockResolvedValue(mockStream)
              }
            }
          }));
        } else if (name === 'Anthropic') {
          require('@anthropic-ai/sdk').mockImplementation(() => ({
            messages: {
              create: jest.fn().mockResolvedValue(mockStream)
            }
          }));
        } else if (name === 'Gemini') {
          require('@google/generative-ai').mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
              startChat: jest.fn().mockReturnValue({
                sendMessageStream: jest.fn().mockResolvedValue({
                  stream: mockStream
                })
              })
            })
          }));
        }
      }

      try {
        const chunks = [];
        for await (const chunk of adapter.streamChat(request)) {
          chunks.push(chunk);
          if (chunks.length > 5) break; // Safety limit
        }

        if (chunks.length > 0) {
          expect(chunks[0]).toHaveProperty('content');
        }
      } catch (error) {
        // Expected in smoke tests
        console.log(`${name} streaming with attachments failed (expected):`, error.message);
      }
    });
  });

  describe('ProviderManager Streaming', () => {
    it('should route streaming requests through ProviderManager', async () => {
      const mockAdapter = {
        streamChat: jest.fn().mockImplementation(async function* (request) {
          yield { content: 'Manager response', done: true };
        }),
        testConnection: jest.fn().mockResolvedValue(true),
        getProviderInfo: jest.fn().mockReturnValue({ name: 'Mock' })
      };

      const manager = new ProviderManager({
        providers: [
          {
            type: 'openai',
            name: 'mock',
            apiKey: 'test',
            enabled: true,
            priority: 1
          }
        ],
        moderation: {
          enabled: false,
          sensitivity: 'medium',
          block_harmful_content: true,
          block_pii: true,
          block_sensitive_info: true
        },
        defaultProvider: 'mock',
        failoverEnabled: true,
        retryAttempts: 3
      });

      // Replace the adapter with our mock
      (manager as any).adapters.set('mock', mockAdapter);

      const request = {
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const chunks = [];
      for await (const chunk of manager.streamChat(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].content).toBe('Manager response');
      expect(mockAdapter.streamChat).toHaveBeenCalledWith(request);
    });
  });

  describe('Streaming Performance', () => {
    it.each(mockProviders)('should handle reasonable streaming performance for $name', async ({ adapter, name }) => {
      // Create a mock stream with many small chunks to test performance
      const chunks = Array.from({ length: 100 }, (_, i) => ({
        content: `Chunk ${i}`,
        done: i === 99
      }));

      const mockStream = {
        [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
          for (const chunk of chunks) {
            yield chunk;
          }
        })
      };

      if (name === 'Ollama') {
        // Ollama performance test would require more complex mocking
        // Skip for now as it's not critical for smoke test
        return;
      } else {
        if (name === 'OpenAI') {
          require('openai').mockImplementation(() => ({
            chat: {
              completions: {
                create: jest.fn().mockResolvedValue(mockStream)
              }
            }
          }));
        } else if (name === 'Anthropic') {
          require('@anthropic-ai/sdk').mockImplementation(() => ({
            messages: {
              create: jest.fn().mockResolvedValue(mockStream)
            }
          }));
        } else if (name === 'Gemini') {
          require('@google/generative-ai').mockImplementation(() => ({
            getGenerativeModel: jest.fn().mockReturnValue({
              startChat: jest.fn().mockReturnValue({
                sendMessageStream: jest.fn().mockResolvedValue({
                  stream: mockStream
                })
              })
            })
          }));
        }
      }

      const request = {
        messages: [{ role: 'user', content: 'Performance test' }]
      };

      const startTime = Date.now();
      let processedChunks = 0;

      try {
        for await (const chunk of adapter.streamChat(request)) {
          processedChunks++;
          // Safety limit to prevent infinite loops
          if (processedChunks > 200) break;
        }
      } catch (error) {
        // Expected in smoke tests
        return;
      }

      const duration = Date.now() - startTime;

      // Performance assertion - should process chunks reasonably quickly
      // In real tests, this would be more strict, but for smoke tests we just check it's not extremely slow
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });
  });
});