import { Anthropic } from '@anthropic-ai/sdk';
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

interface AnthropicAdapterConfig {
  apiKey: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
}

export class AnthropicAdapter implements ProviderAdapter {
  private client: Anthropic;
  private config: AnthropicAdapterConfig;

  constructor(config: AnthropicAdapterConfig) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      maxRetries: this.config.maxRetries
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const systemPrompt = this.getSystemPrompt(request.mode);
      const message = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: systemPrompt,
        messages: this.formatMessages(request.messages)
      });

      const content = message.content[0];
      if (!content || content.type !== 'text') {
        throw new ProviderError('No text content in Anthropic response', 'anthropic');
      }

      return {
        content: content.text,
        usage: message.usage ? {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
          cost: this.calculateCost(message.usage.input_tokens + message.usage.output_tokens)
        } : undefined,
        metadata: {
          model: message.model,
          stopReason: message.stop_reason,
          stopSequence: message.stop_sequence
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
      const stream = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        system: systemPrompt,
        messages: this.formatMessages(request.messages),
        stream: true
      });

      for await (const message of stream) {
        if (message.type === 'content_block_delta') {
          const delta = message.delta;
          if (delta.type === 'text_delta') {
            yield {
              content: delta.text,
              done: false,
              metadata: {
                model: 'claude-3-opus-20240229'
              },
              timestamp: Date.now()
            };
          }
        } else if (message.type === 'message_stop') {
          yield {
            content: '',
            done: true,
            usage: message.usage ? {
              promptTokens: message.usage.input_tokens,
              completionTokens: message.usage.output_tokens,
              totalTokens: message.usage.input_tokens + message.usage.output_tokens,
              cost: this.calculateCost(message.usage.input_tokens + message.usage.output_tokens)
            } : undefined,
            metadata: {
              stopReason: message.stop_reason
            },
            timestamp: Date.now()
          };
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async visionAnalyze(request: VisionRequest): Promise<VisionResponse> {
    try {
      const messages: Array<any> = [{
        role: 'user',
        content: []
      }];

      if (request.prompt) {
        messages[0].content.push({
          type: 'text',
          text: request.prompt
        });
      }

      // Handle image input
      if (typeof request.image === 'string') {
        // Base64 image
        messages[0].content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: request.image.startsWith('data:') ?
              request.image.split(',')[1] : request.image
          }
        });
      } else {
        // Buffer image
        const base64 = request.image.toString('base64');
        messages[0].content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: base64
          }
        });
      }

      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4096,
        messages
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new ProviderError('No text content in Anthropic vision response', 'anthropic');
      }

      return {
        text: content.text,
        confidence: 0.9,
        structured: request.options?.extractStructured ? this.parseStructuredResponse(content.text) : undefined,
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
    throw new ProviderError('Anthropic does not support image generation', 'anthropic', 'NOT_SUPPORTED');
  }

  async listModels(): Promise<string[]> {
    try {
      // Anthropic doesn't have a models list endpoint, so we return known models
      return [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
          throw new ProviderAuthError('Invalid API key', 'anthropic');
        } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
          throw new ProviderConnectionError('Connection failed', 'anthropic', error);
        }
      }
      return false;
    }
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'Anthropic',
      version: '1.0.0',
      description: 'Anthropic Claude models with strong reasoning and coding capabilities',
      capabilities: ['chat', 'stream', 'vision'],
      models: [
        {
          id: 'claude-3-opus-20240229',
          name: 'Claude 3 Opus',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 200000,
          supportsStreaming: true,
          supportsVision: true
        },
        {
          id: 'claude-3-sonnet-20240229',
          name: 'Claude 3 Sonnet',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 200000,
          supportsStreaming: true,
          supportsVision: true
        },
        {
          id: 'claude-3-haiku-20240307',
          name: 'Claude 3 Haiku',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 200000,
          supportsStreaming: true,
          supportsVision: true
        }
      ],
      pricing: {
        'claude-3-opus-20240229': 0.015,
        'claude-3-sonnet-20240229': 0.003,
        'claude-3-haiku-20240307': 0.00025
      }
    };
  }

  private getSystemPrompt(mode?: string): string {
    switch (mode) {
      case 'code':
        return `You are Claude, an AI assistant created by Anthropic. You are an expert programmer with deep knowledge of software development best practices.

When responding to coding requests:
1. Provide clean, efficient, and well-documented code
2. Explain your approach and reasoning
3. Consider edge cases and error handling
4. Follow established patterns and conventions
5. Include examples and usage where helpful
6. Suggest improvements or alternatives when appropriate

Your responses should be thorough, accurate, and demonstrate strong technical expertise.`;
      case 'vision':
        return `You are Claude, an AI assistant created by Anthropic. You are an expert at analyzing and interpreting visual content.

When analyzing images:
1. Provide detailed, accurate descriptions
2. Identify key elements, relationships, and patterns
3. Extract and interpret text, charts, and data
4. Offer insights and context based on visual information
5. Be precise and specific in your observations
6. Consider both obvious details and subtle nuances

Your visual analysis should be comprehensive and insightful.`;
      case 'automation':
        return `You are Claude, an AI assistant created by Anthropic. You are an expert in automation and workflow optimization.

When providing automation guidance:
1. Break down complex tasks into clear, manageable steps
2. Provide specific, actionable instructions
3. Consider different tools and approaches
4. Address potential issues and edge cases
5. Include best practices and optimization tips
6. Structure your response for easy implementation

Your automation advice should be practical and immediately useful.`;
      default:
        return `You are Claude, an AI assistant created by Anthropic. You are helpful, harmless, and honest.

Provide thoughtful, accurate, and helpful responses that:
1. Are clear and well-structured
2. Address the user's specific needs
3. Consider multiple perspectives when relevant
4. Acknowledge limitations and uncertainties
5. Encourage critical thinking and learning
6. Maintain a helpful and respectful tone

Your goal is to be genuinely helpful while being truthful about what you know and don't know.`;
    }
  }

  private formatMessages(messages: Array<any>): Array<any> {
    return messages.map(message => {
      if (message.attachments && message.attachments.length > 0) {
        const content = [{ type: 'text', text: message.content }];

        for (const attachment of message.attachments) {
          if (attachment.type === 'image') {
            const imageData = typeof attachment.content === 'string' ?
              attachment.content : attachment.content.toString('base64');
            content.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageData.startsWith('data:') ? imageData.split(',')[1] : imageData
              }
            });
          }
        }

        return {
          role: message.role,
          content
        };
      }

      return {
        role: message.role,
        content: message.content
      };
    });
  }

  private calculateCost(tokens: number): number {
    // Anthropic pricing: $15 per million tokens for input, $75 per million for output
    // We'll use an average rate for simplicity
    return tokens * 0.000015; // $0.015 per 1000 tokens average
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
      if (error.message.includes('401') || error.message.includes('invalid_api_key')) {
        return new ProviderAuthError('Invalid API key', 'anthropic');
      } else if (error.message.includes('429') || error.message.includes('rate_limit')) {
        const retryAfter = this.extractRetryAfter(error.message);
        return new ProviderRateLimitError('Rate limit exceeded', 'anthropic', retryAfter);
      } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        return new ProviderConnectionError('Connection failed', 'anthropic', error);
      }
    }
    return new ProviderError('Unknown Anthropic error', 'anthropic', 'UNKNOWN', error instanceof Error ? error : undefined);
  }

  private extractRetryAfter(message: string): number | undefined {
    const match = message.match(/retry after (\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }
}