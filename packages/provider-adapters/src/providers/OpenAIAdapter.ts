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

interface OpenAIConfig extends ProviderConfig {
  organization?: string;
  project?: string;
}

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIModelsResponse {
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
}

export class OpenAIAdapter extends BaseAdapter {
  readonly provider = 'openai';
  readonly name = 'OpenAI';
  readonly version = '1.0.0';
  readonly capabilities = ['chat', 'stream', 'vision', 'image-generation'];

  private defaultModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ];

  async chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse> {
    if (cancellationToken?.isCancelled) {
      throw new Error('Operation cancelled');
    }

    const openaiRequest = await this.transformChatRequest(request);

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(openaiRequest)
        },
        this.config.timeout || 30000
      );

      const data: OpenAIChatResponse = await this.handleResponse(response);
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

    const openaiRequest = {
      ...await this.transformChatRequest(request),
      stream: true
    };

    let fullContent = '';
    let responseId = '';
    let model = '';

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(openaiRequest)
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

              if (data === '[DONE]') {
                return {
                  id: responseId,
                  content: fullContent,
                  model: model || request.model || this.config.defaultModel || 'gpt-4o',
                  timestamp: new Date()
                };
              }

              try {
                const parsed = JSON.parse(data);

                if (parsed.id) responseId = parsed.id;
                if (parsed.model) model = parsed.model;

                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  onChunk(delta);
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
        model: model || request.model || this.config.defaultModel || 'gpt-4o',
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
      model: request.model || this.config.defaultModel || 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: request.prompt || 'What is shown in this image?'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/${format};base64,${data}`
              }
            }
          ]
        }
      ],
      max_tokens: request.maxTokens || 1000
    };

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(visionRequest)
        },
        this.config.timeout || 30000
      );

      const data: OpenAIChatResponse = await this.handleResponse(response);

      return {
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined,
        timestamp: new Date(data.created * 1000)
      };
    });
  }

  async imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse> {
    if (cancellationToken?.isCancelled) {
      throw new Error('Operation cancelled');
    }

    const imageRequest = {
      model: request.model || 'dall-e-3',
      prompt: request.prompt,
      n: request.n || 1,
      size: request.size || '1024x1024',
      quality: request.quality || 'standard',
      style: request.style || 'vivid',
      response_format: request.responseFormat || 'url'
    };

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'https://api.openai.com'}/v1/images/generations`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(imageRequest)
        },
        this.config.timeout || 60000
      );

      const data = await this.handleResponse(response);

      return {
        id: data.created?.toString() || Date.now().toString(),
        images: data.data.map((item: any) => ({
          url: item.url,
          revisedPrompt: item.revised_prompt
        })),
        model: imageRequest.model,
        timestamp: new Date()
      };
    });
  }

  async listModels(config?: ProviderConfig): Promise<ModelInfo[]> {
    const targetConfig = config || this.config;

    try {
      const response = await this.fetchWithTimeout(
        `${targetConfig.baseUrl || 'https://api.openai.com'}/v1/models`,
        {
          method: 'GET',
          headers: this.getHeaders(targetConfig.apiKey)
        },
        targetConfig.timeout || 30000
      );

      const data: OpenAIModelsResponse = await this.handleResponse(response);

      return data.data.map(model => ({
        id: model.id,
        name: model.id,
        provider: this.provider,
        capabilities: this.getModelCapabilities(model.id),
        contextLength: this.getContextLength(model.id),
        supportsStreaming: true,
        supportsVision: this.supportsVision(model.id),
        supportsImages: this.supportsImageGeneration(model.id)
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
        supportsImages: this.supportsImageGeneration(modelId)
      }));
    }
  }

  async testConnection(config: TestConnectionRequest): Promise<TestConnectionResponse> {
    const startTime = Date.now();

    try {
      const response = await this.fetchWithTimeout(
        `${config.baseUrl || 'https://api.openai.com'}/v1/models`,
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

    const apiKeyValidation = this.validateApiKey(config.apiKey, /^sk-[A-Za-z0-9]{48,}$/);
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

  getDefaultConfig(): Partial<OpenAIConfig> {
    return {
      baseUrl: 'https://api.openai.com',
      timeout: 30000,
      defaultModel: 'gpt-4o-mini'
    };
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    return {
      ...this.getDefaultHeaders(),
      'Authorization': `Bearer ${apiKey || this.config.apiKey}`,
      ...(this.config.organization ? { 'OpenAI-Organization': this.config.organization } : {}),
      ...(this.config.project ? { 'OpenAI-Project': this.config.project } : {})
    };
  }

  private async transformChatRequest(request: ChatRequest): Promise<any> {
    const messages: OpenAIChatMessage[] = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    return {
      model: request.model || this.config.defaultModel || 'gpt-4o-mini',
      messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stop,
      stream: false
    };
  }

  private transformChatResponse(data: OpenAIChatResponse): ChatResponse {
    return {
      id: data.id,
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      finishReason: data.choices[0].finish_reason,
      timestamp: new Date(data.created * 1000)
    };
  }

  private getModelCapabilities(modelId: string): string[] {
    const capabilities = ['chat', 'stream'];

    if (this.supportsVision(modelId)) {
      capabilities.push('vision');
    }

    if (this.supportsImageGeneration(modelId)) {
      capabilities.push('image-generation');
    }

    return capabilities;
  }

  private supportsVision(modelId: string): boolean {
    return modelId.includes('gpt-4o') || modelId.includes('vision') || modelId.includes('gpt-4-turbo');
  }

  private supportsImageGeneration(modelId: string): boolean {
    return modelId.startsWith('dall-e');
  }

  private getContextLength(modelId: string): number {
    if (modelId.includes('gpt-4o')) return 128000;
    if (modelId.includes('gpt-4-turbo')) return 128000;
    if (modelId.includes('gpt-4')) return 8192;
    if (modelId.includes('gpt-3.5-turbo')) return 16385;
    return 4096;
  }
}