import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ProviderAdapter,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  VisionRequest,
  VisionResponse,
  ImageGenerateRequest,
  ImageGenerateResponse,
  ProviderInfo,
  ProviderError,
  ProviderConnectionError,
  ProviderRateLimitError,
  ProviderAuthError
} from '@atlas/shared';

interface GeminiAdapterConfig {
  apiKey: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
}

export class GeminiAdapter implements ProviderAdapter {
  private client: GoogleGenerativeAI;
  private config: GeminiAdapterConfig;

  constructor(config: GeminiAdapterConfig) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config
    };

    this.client = new GoogleGenerativeAI(this.config.apiKey);
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-pro',
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
          topP: 0.8,
          topK: 40
        }
      });

      const systemPrompt = this.getSystemPrompt(request.mode);
      const chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens
        }
      });

      const prompt = systemPrompt ? `${systemPrompt}\n\n${this.formatMessages(request.messages)}` : this.formatMessages(request.messages);
      const result = await chat.sendMessage(prompt);
      const response = result.response;
      const text = response.text();

      return {
        content: text,
        usage: this.extractUsage(result),
        metadata: {
          model: 'gemini-pro',
          promptFeedback: response.promptFeedback,
          safetyRatings: response.candidates?.[0]?.safetyRatings
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-pro',
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens,
          topP: 0.8,
          topK: 40
        }
      });

      const systemPrompt = this.getSystemPrompt(request.mode);
      const chat = model.startChat({
        history: [],
        generationConfig: {
          temperature: request.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens
        }
      });

      const prompt = systemPrompt ? `${systemPrompt}\n\n${this.formatMessages(request.messages)}` : this.formatMessages(request.messages);
      const result = await chat.sendMessageStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();

        yield {
          content: text,
          done: false,
          metadata: {
            model: 'gemini-pro'
          },
          timestamp: Date.now()
        };
      }

      // Send final chunk with usage
      yield {
        content: '',
        done: true,
        usage: {
          promptTokens: 0, // Gemini doesn't provide detailed token counts in streaming
          completionTokens: 0,
          totalTokens: 0,
          cost: 0
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async visionAnalyze(request: VisionRequest): Promise<VisionResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: 'gemini-pro-vision',
        generationConfig: {
          maxOutputTokens: 4096
        }
      });

      const prompt = request.prompt || 'Analyze this image and provide a detailed description.';
      let imageContent;

      if (typeof request.image === 'string') {
        // Base64 image
        const base64Data = request.image.startsWith('data:') ?
          request.image.split(',')[1] : request.image;
        imageContent = {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        };
      } else {
        // Buffer image
        const base64Data = request.image.toString('base64');
        imageContent = {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        };
      }

      const result = await model.generateContent([prompt, imageContent]);
      const response = result.response;
      const text = response.text();

      return {
        text: text,
        confidence: 0.85,
        structured: request.options?.extractStructured ? this.parseStructuredResponse(text) : undefined,
        metadata: {
          model: 'gemini-pro-vision',
          mode: request.mode,
          promptFeedback: response.promptFeedback,
          safetyRatings: response.candidates?.[0]?.safetyRatings
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async imageGenerate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    throw new ProviderError('Gemini does not support image generation', 'gemini', 'NOT_SUPPORTED');
  }

  async listModels(): Promise<string[]> {
    try {
      // Gemini doesn't have a public models list endpoint in the SDK
      // Return known models
      return [
        'gemini-pro',
        'gemini-pro-vision',
        'gemini-1.5-pro',
        'gemini-1.5-pro-vision'
      ];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-pro' });
      await model.generateContent('test');
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('API_KEY_INVALID')) {
          throw new ProviderAuthError('Invalid API key', 'gemini');
        } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          throw new ProviderConnectionError('Connection failed', 'gemini', error);
        }
      }
      return false;
    }
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'Google Gemini',
      version: '1.0.0',
      description: 'Google Gemini models with strong multimodal capabilities',
      capabilities: ['chat', 'stream', 'vision'],
      models: [
        {
          id: 'gemini-pro',
          name: 'Gemini Pro',
          capabilities: ['chat', 'stream'],
          maxTokens: 32768,
          supportsStreaming: true
        },
        {
          id: 'gemini-pro-vision',
          name: 'Gemini Pro Vision',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 16384,
          supportsStreaming: true,
          supportsVision: true
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 2097152,
          supportsStreaming: true,
          supportsVision: true
        },
        {
          id: 'gemini-1.5-pro-vision',
          name: 'Gemini 1.5 Pro Vision',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 2097152,
          supportsStreaming: true,
          supportsVision: true
        }
      ],
      pricing: {
        'gemini-pro': 0.001,
        'gemini-pro-vision': 0.002,
        'gemini-1.5-pro': 0.0025,
        'gemini-1.5-pro-vision': 0.0035
      }
    };
  }

  private getSystemPrompt(mode?: string): string {
    switch (mode) {
      case 'code':
        return `You are a helpful AI assistant integrated into the Atlas application. When responding to coding requests:

1. Provide clean, efficient, and well-documented code
2. Explain your approach and reasoning clearly
3. Consider edge cases, error handling, and best practices
4. Follow established coding patterns and conventions
5. Include examples and usage where helpful
6. Suggest improvements or alternative approaches when appropriate
7. Ensure your code is secure and follows security best practices

Focus on providing practical, immediately useful code solutions.`;
      case 'vision':
        return `You are a helpful AI assistant integrated into the Atlas application with strong visual analysis capabilities. When analyzing images:

1. Provide detailed, accurate, and comprehensive descriptions
2. Identify and interpret text, charts, diagrams, and data visualizations
3. Recognize objects, people, scenes, and their relationships
4. Extract and contextualize visual information
5. Be precise and specific in your observations
6. Consider both obvious details and subtle nuances
7. Provide context and insights based on visual content

Your analysis should be thorough, accurate, and immediately useful.`;
      case 'automation':
        return `You are a helpful AI assistant integrated into the Atlas application specializing in automation and workflow optimization. When providing automation guidance:

1. Break down complex tasks into clear, sequential steps
2. Provide specific, actionable instructions that can be implemented
3. Consider different tools, platforms, and approaches
4. Address potential issues, edge cases, and troubleshooting steps
5. Include best practices, optimization tips, and security considerations
6. Structure your response for easy implementation and understanding
7. Provide context for when and why certain approaches are recommended

Your automation advice should be practical, comprehensive, and immediately actionable.`;
      default:
        return `You are a helpful AI assistant integrated into the Atlas application. Provide thoughtful, accurate, and helpful responses that:

1. Are clear, well-structured, and easy to understand
2. Directly address the user's specific needs and questions
3. Consider multiple perspectives when relevant
4. Acknowledge limitations and uncertainties honestly
5. Encourage critical thinking and learning
6. Maintain a helpful, respectful, and professional tone
7. Provide context and background information when helpful

Your goal is to be genuinely helpful while being truthful about what you know and don't know.`;
    }
  }

  private formatMessages(messages: Array<any>): string {
    return messages.map(message => {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${message.content}`;
    }).join('\n\n');
  }

  private extractUsage(result: any) {
    // Gemini doesn't provide detailed usage information in the current SDK
    // We'll estimate based on content length
    const text = result.response.text();
    const estimatedTokens = Math.ceil(text.length / 4); // Rough estimate

    return {
      promptTokens: Math.floor(estimatedTokens * 0.3),
      completionTokens: Math.floor(estimatedTokens * 0.7),
      totalTokens: estimatedTokens,
      cost: this.calculateCost(estimatedTokens, 'gemini-pro')
    };
  }

  private calculateCost(tokens: number, model: string): number {
    const rates = {
      'gemini-pro': 0.001 / 1000, // $0.001 per 1K tokens
      'gemini-pro-vision': 0.002 / 1000,
      'gemini-1.5-pro': 0.0025 / 1000,
      'gemini-1.5-pro-vision': 0.0035 / 1000
    };
    return tokens * (rates[model as keyof typeof rates] || 0.001 / 1000);
  }

  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch {
      return {};
    }
  }

  private handleError(error: unknown): ProviderError {
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('API_KEY_INVALID')) {
        return new ProviderAuthError('Invalid API key', 'gemini');
      } else if (error.message.includes('429') || error.message.includes('QUOTA_EXCEEDED')) {
        const retryAfter = this.extractRetryAfter(error.message);
        return new ProviderRateLimitError('Rate limit exceeded', 'gemini', retryAfter);
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        return new ProviderConnectionError('Connection failed', 'gemini', error);
      }
    }
    return new ProviderError('Unknown Gemini error', 'gemini', 'UNKNOWN', error instanceof Error ? error : undefined);
  }

  private extractRetryAfter(message: string): number | undefined {
    const match = message.match(/retry after (\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }
}