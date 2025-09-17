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

interface OllamaConfig extends ProviderConfig {
  baseUrl?: string;
  model?: string;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaTagResponse {
  models: OllamaModel[];
}

export class OllamaAdapter extends BaseAdapter {
  readonly provider = 'ollama';
  readonly name = 'Ollama';
  readonly version = '1.0.0';
  readonly capabilities = ['chat', 'stream', 'vision'];

  async chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse> {
    if (cancellationToken?.isCancelled) {
      throw new Error('Operation cancelled');
    }

    const ollamaRequest = await this.transformChatRequest(request);

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'http://localhost:11434'}/api/generate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(ollamaRequest)
        },
        this.config.timeout || 60000
      );

      const data: OllamaResponse = await this.handleResponse(response);
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

    const ollamaRequest = {
      ...await this.transformChatRequest(request),
      stream: true
    };

    let fullContent = '';
    let model = '';
    let createdAt = '';

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'http://localhost:11434'}/api/generate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(ollamaRequest)
        },
        this.config.timeout || 120000
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
            if (line.trim()) {
              try {
                const data: OllamaResponse = JSON.parse(line);

                if (!model) model = data.model;
                if (!createdAt) createdAt = data.created_at;

                if (data.response) {
                  fullContent += data.response;
                  onChunk(data.response);
                }

                if (data.done) {
                  return {
                    id: Date.now().toString(),
                    content: fullContent,
                    model,
                    timestamp: new Date(),
                    usage: data.prompt_eval_count && data.eval_count ? {
                      promptTokens: data.prompt_eval_count,
                      completionTokens: data.eval_count,
                      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                    } : undefined
                  };
                }
              } catch (e) {
                // Ignore parse errors for streaming chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        id: Date.now().toString(),
        content: fullContent,
        model: model || request.model || this.config.defaultModel || 'llama2',
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
      model: request.model || this.config.defaultModel || 'llava',
      prompt: request.prompt || 'What is shown in this image?',
      images: [data],
      stream: false
    };

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl || 'http://localhost:11434'}/api/generate`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(visionRequest)
        },
        this.config.timeout || 60000
      );

      const data: OllamaResponse = await this.handleResponse(response);

      return {
        content: data.response,
        model: data.model,
        usage: data.prompt_eval_count && data.eval_count ? {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        } : undefined,
        timestamp: new Date()
      };
    });
  }

  async imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse> {
    throw new Error('Ollama does not support image generation');
  }

  async listModels(config?: ProviderConfig): Promise<ModelInfo[]> {
    const targetConfig = config || this.config;

    try {
      const response = await this.fetchWithTimeout(
        `${targetConfig.baseUrl || 'http://localhost:11434'}/api/tags`,
        {
          method: 'GET',
          headers: this.getHeaders()
        },
        targetConfig.timeout || 30000
      );

      const data: OllamaTagResponse = await this.handleResponse(response);

      return data.models.map(model => ({
        id: model.name,
        name: model.name,
        provider: this.provider,
        capabilities: this.getModelCapabilities(model.name),
        contextLength: this.getContextLength(model.name),
        supportsStreaming: true,
        supportsVision: this.supportsVision(model.name),
        supportsImages: false
      }));
    } catch (error) {
      // Fallback to basic models if local Ollama is not available
      this.log('warn', 'Failed to fetch models from local Ollama, using defaults', { error: error.message });
      return [
        {
          id: 'llama2',
          name: 'Llama 2',
          provider: this.provider,
          capabilities: ['chat', 'stream'],
          contextLength: 4096,
          supportsStreaming: true,
          supportsVision: false,
          supportsImages: false
        },
        {
          id: 'llava',
          name: 'LLaVA',
          provider: this.provider,
          capabilities: ['chat', 'stream', 'vision'],
          contextLength: 4096,
          supportsStreaming: true,
          supportsVision: true,
          supportsImages: false
        }
      ];
    }
  }

  async testConnection(config: TestConnectionRequest): Promise<TestConnectionResponse> {
    const startTime = Date.now();

    try {
      const response = await this.fetchWithTimeout(
        `${config.baseUrl || 'http://localhost:11434'}/api/tags`,
        {
          method: 'GET',
          headers: this.getHeaders()
        },
        config.timeout || 10000
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

    // Ollama typically doesn't require an API key for local instances
    // but we'll validate it if provided
    if (config.apiKey) {
      const apiKeyValidation = this.validateApiKey(config.apiKey);
      if (!apiKeyValidation.valid) {
        errors.push(apiKeyValidation.error || 'Invalid API key format');
      }
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

  getDefaultConfig(): Partial<OllamaConfig> {
    return {
      baseUrl: 'http://localhost:11434',
      timeout: 60000,
      defaultModel: 'llama2'
    };
  }

  private getHeaders(): Record<string, string> {
    return this.getDefaultHeaders();
  }

  private async transformChatRequest(request: ChatRequest): Promise<any> {
    const messages: OllamaMessage[] = [];

    // Ollama expects a specific format with system message
    let systemPrompt = '';
    const userMessages: OllamaMessage[] = [];

    for (const message of request.messages) {
      if (message.role === 'system') {
        systemPrompt = message.content;
      } else {
        userMessages.push({
          role: message.role,
          content: message.content
        });
      }
    }

    // Build the prompt in Ollama's format
    let prompt = '';
    if (systemPrompt) {
      prompt += `System: ${systemPrompt}\n\n`;
    }

    for (const message of userMessages) {
      if (message.role === 'user') {
        prompt += `User: ${message.content}\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n`;
      }
    }

    prompt += 'Assistant:';

    const ollamaRequest: any = {
      model: request.model || this.config.defaultModel || 'llama2',
      prompt,
      stream: false
    };

    // Add options if provided
    const options: any = {};
    if (request.temperature !== undefined) {
      options.temperature = request.temperature;
    }
    if (request.topP !== undefined) {
      options.top_p = request.topP;
    }
    if (request.maxTokens !== undefined) {
      options.num_predict = request.maxTokens;
    }
    if (request.stop) {
      options.stop = Array.isArray(request.stop) ? request.stop : [request.stop];
    }

    if (Object.keys(options).length > 0) {
      ollamaRequest.options = options;
    }

    return ollamaRequest;
  }

  private transformChatResponse(data: OllamaResponse): ChatResponse {
    return {
      id: Date.now().toString(),
      content: data.response,
      model: data.model,
      usage: data.prompt_eval_count && data.eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      } : undefined,
      timestamp: new Date(data.created_at)
    };
  }

  private getModelCapabilities(modelName: string): string[] {
    const capabilities = ['chat', 'stream'];

    if (this.supportsVision(modelName)) {
      capabilities.push('vision');
    }

    return capabilities;
  }

  private supportsVision(modelName: string): boolean {
    return modelName.toLowerCase().includes('llava') ||
           modelName.toLowerCase().includes('vision') ||
           modelName.toLowerCase().includes('multimodal');
  }

  private getContextLength(modelName: string): number {
    // Estimate context length based on common model patterns
    if (modelName.includes('70b') || modelName.includes('70B')) return 8192;
    if (modelName.includes('13b') || modelName.includes('13B')) return 8192;
    if (modelName.includes('7b') || modelName.includes('7B')) return 4096;
    if (modelName.includes('llama2')) return 4096;
    if (modelName.includes('mistral')) return 8192;
    if (modelName.includes('mixtral')) return 32768;
    return 4096; // Default fallback
  }
}