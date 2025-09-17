import { OpenAI } from 'openai';
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

interface OpenAIAdapterConfig {
  apiKey: string;
  baseURL?: string;
  organization?: string;
  maxRetries?: number;
  timeout?: number;
}

export class OpenAIAdapter implements ProviderAdapter {
  private client: OpenAI;
  private config: OpenAIAdapterConfig;

  constructor(config: OpenAIAdapterConfig) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      organization: this.config.organization,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const systemPrompt = this.getSystemPrompt(request.mode);
      const messages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...request.messages]
        : request.messages;

      const response = await this.client.chat.completions.create({
        model: request.messages[0]?.attachments?.length ? 'gpt-4-vision-preview' : 'gpt-4',
        messages: messages as any,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: false
      });

      const message = response.choices[0]?.message;
      if (!message?.content) {
        throw new ProviderError('No content in OpenAI response', 'openai');
      }

      return {
        content: message.content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
          cost: this.calculateCost(response.usage.total_tokens, 'gpt-4')
        } : undefined,
        metadata: {
          model: response.model,
          finishReason: response.choices[0]?.finish_reason
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    try {
      const systemPrompt = this.getSystemPrompt(request.mode);
      const messages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...request.messages]
        : request.messages;

      const stream = await this.client.chat.completions.create({
        model: request.messages[0]?.attachments?.length ? 'gpt-4-vision-preview' : 'gpt-4',
        messages: messages as any,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true
      });

      let content = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        content += delta;

        yield {
          content: delta,
          done: chunk.choices[0]?.finish_reason === 'stop',
          usage: chunk.usage ? {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
            cost: this.calculateCost(chunk.usage.total_tokens, 'gpt-4')
          } : undefined,
          metadata: {
            model: chunk.model,
            finishReason: chunk.choices[0]?.finish_reason
          },
          timestamp: Date.now()
        };
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async visionAnalyze(request: VisionRequest): Promise<VisionResponse> {
    try {
      const messages: Array<any> = [];

      if (request.prompt) {
        messages.push({
          role: 'user',
          content: request.prompt
        });
      }

      // Handle image input
      if (typeof request.image === 'string') {
        // Base64 image
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: request.image.startsWith('data:') ? request.image : `data:image/jpeg;base64,${request.image}`
              }
            }
          ]
        });
      } else {
        // Buffer image - convert to base64
        const base64 = request.image.toString('base64');
        messages.push({
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`
              }
            }
          ]
        });
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-4-vision-preview',
        messages,
        max_tokens: 500
      });

      const message = response.choices[0]?.message;
      if (!message?.content) {
        throw new ProviderError('No content in OpenAI vision response', 'openai');
      }

      return {
        text: message.content,
        confidence: 0.9, // OpenAI doesn't provide confidence scores
        structured: request.options?.extractStructured ? this.parseStructuredResponse(message.content) : undefined,
        metadata: {
          model: response.model,
          mode: request.mode
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async imageGenerate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    try {
      const response = await this.client.images.generate({
        model: 'dall-e-3',
        prompt: request.prompt,
        n: request.options?.count ?? 1,
        size: this.mapAspectRatio(request.options?.aspect),
        quality: request.options?.quality ?? 'standard',
        style: request.options?.style ?? 'vivid',
        response_format: request.options?.responseFormat ?? 'url'
      });

      const images = response.data.map(image => ({
        url: image.url,
        revisedPrompt: image.revised_prompt,
        metadata: {
          model: 'dall-e-3',
          size: image.size
        }
      }));

      return {
        images,
        usage: {
          promptTokens: 0, // DALL-E doesn't provide token counts
          cost: this.calculateImageCost(images.length, request.options?.quality)
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map(model => model.id);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new ProviderAuthError('Invalid API key', 'openai');
        } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          throw new ProviderConnectionError('Connection failed', 'openai', error);
        }
      }
      return false;
    }
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'OpenAI',
      version: '1.0.0',
      description: 'OpenAI GPT models including GPT-4 and DALL-E 3',
      capabilities: ['chat', 'stream', 'vision', 'image_generation'],
      models: [
        {
          id: 'gpt-4',
          name: 'GPT-4',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 8192,
          supportsStreaming: true,
          supportsVision: true
        },
        {
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 128000,
          supportsStreaming: true,
          supportsVision: true
        },
        {
          id: 'dall-e-3',
          name: 'DALL-E 3',
          capabilities: ['image_generation'],
          supportsImageGeneration: true
        }
      ],
      pricing: {
        'gpt-4': 0.03,
        'gpt-4-turbo': 0.01,
        'dall-e-3': 0.02
      }
    };
  }

  private getSystemPrompt(mode?: string): string {
    switch (mode) {
      case 'code':
        return 'You are an expert programmer. Provide clean, efficient, and well-documented code. Explain your approach and consider edge cases.';
      case 'vision':
        return 'You are an expert at analyzing images and visual content. Provide detailed descriptions and insights.';
      case 'automation':
        return 'You are an automation expert. Provide clear, step-by-step instructions for automating tasks.';
      default:
        return 'You are a helpful assistant. Provide clear, accurate, and thoughtful responses.';
    }
  }

  private mapAspectRatio(aspect?: string): string {
    switch (aspect) {
      case 'portrait':
        return '1024x1792';
      case 'landscape':
        return '1792x1024';
      default:
        return '1024x1024';
    }
  }

  private calculateCost(tokens: number, model: string): number {
    const rates = {
      'gpt-4': 0.03 / 1000, // $0.03 per 1K tokens
      'gpt-4-turbo': 0.01 / 1000
    };
    return tokens * (rates[model as keyof typeof rates] || 0.01 / 1000);
  }

  private calculateImageCost(count: number, quality?: string): number {
    const rates = {
      standard: 0.02,
      hd: 0.08
    };
    return count * (rates[quality as keyof typeof rates] || rates.standard);
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
      if (error.message.includes('401')) {
        return new ProviderAuthError('Invalid API key', 'openai');
      } else if (error.message.includes('429')) {
        const retryAfter = this.extractRetryAfter(error.message);
        return new ProviderRateLimitError('Rate limit exceeded', 'openai', retryAfter);
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        return new ProviderConnectionError('Connection failed', 'openai', error);
      }
    }
    return new ProviderError('Unknown OpenAI error', 'openai', 'UNKNOWN', error instanceof Error ? error : undefined);
  }

  private extractRetryAfter(message: string): number | undefined {
    const match = message.match(/retry after (\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }
}