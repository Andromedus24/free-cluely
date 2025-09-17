import { BaseAdapter } from '../base/BaseAdapter';
import {
  ChatRequest,
  ChatResponse,
  VisionRequest,
  VisionResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ModelInfo,
  TestConnectionRequest,
  TestConnectionResponse,
  ProviderConfig,
  CancellationToken
} from '../types/provider';

interface AnthropicConfig extends ProviderConfig {
  version?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image'; text?: string; source?: { type: 'base64'; media_type: string; data: string } }>;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamResponse {
  type: string;
  message?: {
    id: string;
    type: string;
    role: string;
    content: Array<{ type: 'text'; text: string }>;
    model: string;
    stop_reason: string | null;
    stop_sequence: string | null;
    usage: {
      input_tokens: number;
      output_tokens: number;
    };
  };
  delta?: { type: 'text_delta'; text: string };
  message_start?: {
    message: {
      id: string;
      type: string;
      role: string;
      content: Array<{ type: 'text'; text: string }>;
      model: string;
      stop_reason: string | null;
      stop_sequence: string | null;
      usage: {
        input_tokens: number;
        output_tokens: number;
      };
    };
  };
  message_delta?: {
    delta: {
      stop_reason: string | null;
      stop_sequence: string | null;
    };
    usage: {
      output_tokens: number;
    };
  };
}

interface AnthropicModelsResponse {
  data: Array<{
    id: string;
    object: string;
    created: number;
    type: string;
  }>;
}

export class AnthropicAdapter extends BaseAdapter {
  readonly provider = 'anthropic';
  readonly name = 'Anthropic';
  readonly version = '1.0.0';
  readonly capabilities = ['chat', 'stream', 'vision'];

  private defaultModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-haiku-20240307',
    'claude-3-opus-20240229'
  ];

  async chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse> {
    if (cancellationToken?.isCancelled) {
      throw new Error('Operation cancelled');
    }

    const anthropicRequest = await this.transformChatRequest(request);

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(anthropicRequest)
        },
        this.config.timeout || 30000
      );

      const data: AnthropicResponse = await this.handleResponse(response);
      return this.transformChatResponse(data);
    });
  }

  async streamChat(
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    cancellationToken?: CancellationToken
  ): Promise<ChatResponse> {
    if (cancellationToken?.isCancelled) {
      throw new Error('Operation cancelled');
    }

    const anthropicRequest = {
      ...await this.transformChatRequest(request),
      stream: true
    };

    let fullContent = '';
    let responseId = '';
    let model = '';

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(anthropicRequest)
        },
        this.config.timeout || 60000
      );

      if (!response.body) {
        throw new Error('No response body for streaming request');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          if (cancellationToken?.isCancelled) {
            reader.cancel();
            throw new Error('Operation cancelled');
          }

          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);

              try {
                const parsed: AnthropicStreamResponse = JSON.parse(data);

                if (parsed.type === 'message_start' && parsed.message_start) {
                  responseId = parsed.message_start.message.id;
                  model = parsed.message_start.message.model;
                }

                if (parsed.type === 'content_block_delta' && parsed.delta) {
                  const delta = parsed.delta.text;
                  if (delta) {
                    fullContent += delta;
                    onChunk(delta);
                  }
                }
              } catch (e) {
                // Ignore parse errors for SSE chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        id: responseId,
        content: fullContent,
        model: model || request.model || this.config.defaultModel || 'claude-3-5-sonnet-20241022',
        timestamp: new Date()
      };
    });
  }

  async visionAnalyze(request: VisionRequest, cancellationToken?: CancellationToken): Promise<VisionResponse> {
    if (cancellationToken?.isCancelled) {
      throw new Error('Operation cancelled');
    }

    const { format, data } = await this.processImageData(request.image);

    const visionRequest = {
      model: request.model || this.config.defaultModel || 'claude-3-5-sonnet-20241022',
      max_tokens: request.maxTokens || 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: request.prompt || 'What is shown in this image?'
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: `image/${format}`,
                data: data
              }
            }
          ]
        }
      ]
    };

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'https://api.anthropic.com'}/v1/messages`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(visionRequest)
        },
        this.config.timeout || 30000
      );

      const data: AnthropicResponse = await this.handleResponse(response);

      return {
        content: data.content[0].text,
        model: data.model,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        timestamp: new Date()
      };
    });
  }

  async imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse> {
    throw new Error('Anthropic does not support image generation');
  }

  async listModels(config?: ProviderConfig): Promise<ModelInfo[]> {
    const targetConfig = config || this.config;

    try {
      const response = await this.fetchWithTimeout(
        `${targetConfig.baseUrl || 'https://api.anthropic.com'}/v1/models`,
        {
          method: 'GET',
          headers: this.getHeaders(targetConfig.apiKey)
        },
        targetConfig.timeout || 30000
      );

      const data: AnthropicModelsResponse = await this.handleResponse(response);

      return data.data.map(model => ({
        id: model.id,
        name: model.id,
        provider: this.provider,
        capabilities: this.getModelCapabilities(model.id),
        contextLength: this.getContextLength(model.id),
        supportsStreaming: true,
        supportsVision: this.supportsVision(model.id),
        supportsImages: false
      }));
    } catch (error) {
      // Fallback to default models if API fails
      this.log('warn', 'Failed to fetch models from API, using defaults', { error: error.message });
      return this.defaultModels.map(modelId => ({
        id: modelId,
        name: modelId,
        provider: this.provider,
        capabilities: this.getModelCapabilities(modelId),
        contextLength: this.getContextLength(modelId),
        supportsStreaming: true,
        supportsVision: this.supportsVision(modelId),
        supportsImages: false
      }));
    }
  }

  async testConnection(config: TestConnectionRequest): Promise<TestConnectionResponse> {
    const startTime = Date.now();

    try {
      const response = await this.fetchWithTimeout(
        `${config.baseUrl || 'https://api.anthropic.com'}/v1/models`,
        {
          method: 'GET',
          headers: this.getHeaders(config.apiKey)
        },
        config.timeout || 30000
      );

      await this.handleResponse(response);

      const models = await this.listModels(config as ProviderConfig);

      return {
        success: true,
        message: 'Connection successful',
        latency: Date.now() - startTime,
        models
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        latency: Date.now() - startTime
      };
    }
  }

  validateConfig(config: ProviderConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.apiKey) {
      errors.push('API key is required');
    }

    const apiKeyValidation = this.validateApiKey(config.apiKey, /^sk-ant-api03-[A-Za-z0-9]{95,}$/);
    if (!apiKeyValidation.valid) {
      errors.push(apiKeyValidation.error || 'Invalid API key format');
    }

    if (config.baseUrl) {
      const urlValidation = this.validateUrl(config.baseUrl);
      if (!urlValidation.valid) {
        errors.push(urlValidation.error || 'Invalid base URL');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getDefaultConfig(): Partial<AnthropicConfig> {
    return {
      baseUrl: 'https://api.anthropic.com',
      timeout: 30000,
      defaultModel: 'claude-3-5-sonnet-20241022',
      version: '2023-06-01'
    };
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    return {
      ...this.getDefaultHeaders(),
      'x-api-key': apiKey || this.config.apiKey,
      'anthropic-version': this.config.version || '2023-06-01',
      'content-type': 'application/json'
    };
  }

  private async transformChatRequest(request: ChatRequest): Promise<any> {
    // Apply code mode prompt shaping if detected
    const systemPrompt = this.detectAndApplyCodeMode(request);

    const messages: AnthropicMessage[] = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const transformedRequest: any = {
      model: request.model || this.config.defaultModel || 'claude-3-5-sonnet-20241022',
      max_tokens: request.maxTokens || 1000,
      messages
    };

    if (systemPrompt) {
      transformedRequest.system = systemPrompt;
    }

    if (request.temperature !== undefined) {
      transformedRequest.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      transformedRequest.top_p = request.topP;
    }

    if (request.stop) {
      transformedRequest.stop_sequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }

    return transformedRequest;
  }

  private transformChatResponse(data: AnthropicResponse): ChatResponse {
    return {
      id: data.id,
      content: data.content[0].text,
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      finishReason: data.stop_reason,
      timestamp: new Date()
    };
  }

  private detectAndApplyCodeMode(request: ChatRequest): string | null {
    const lastMessage = request.messages[request.messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    // Check if this appears to be a code-related request
    const codeIndicators = [
      'code', 'function', 'implement', 'algorithm', 'programming',
      'debug', 'refactor', 'optimize', 'typescript', 'javascript',
      'python', 'java', 'go', 'rust', 'c++', 'sql'
    ];

    const isCodeRequest = codeIndicators.some(indicator => content.includes(indicator));

    if (isCodeRequest) {
      return `You are an expert software engineer. Provide clear, well-structured code with detailed explanations.
Use appropriate programming language conventions and best practices. Include comments for complex logic.
Format your response with proper code blocks using markdown syntax.
Be precise and focus on providing working solutions to the programming problem.`;
    }

    return null;
  }

  private getModelCapabilities(modelId: string): string[] {
    const capabilities = ['chat', 'stream'];

    if (this.supportsVision(modelId)) {
      capabilities.push('vision');
    }

    return capabilities;
  }

  private supportsVision(modelId: string): boolean {
    return modelId.includes('claude-3');
  }

  private getContextLength(modelId: string): number {
    if (modelId.includes('claude-3-5-sonnet')) return 200000;
    if (modelId.includes('claude-3-opus')) return 200000;
    if (modelId.includes('claude-3-haiku')) return 200000;
    return 100000;
  }
}