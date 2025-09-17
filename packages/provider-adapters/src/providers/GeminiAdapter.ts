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

interface GeminiConfig extends ProviderConfig {
  projectId?: string;
  location?: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiStreamResponse {
  candidates: Array<{
    content: GeminiContent;
    finishReason: string;
    index: number;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GeminiModelsResponse {
  models: Array<{
    name: string;
    displayName: string;
    description: string;
    supportedGenerationMethods: string[];
    inputTokenLimit: number;
    outputTokenLimit: number;
  }>;
}

export class GeminiAdapter extends BaseAdapter {
  readonly provider = 'gemini';
  readonly name = 'Google Gemini';
  readonly version = '1.0.0';
  readonly capabilities = ['chat', 'stream', 'vision'];

  private defaultModels = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro'
  ];

  async chat(request: ChatRequest, cancellationToken?: CancellationToken): Promise<ChatResponse> {
    if (cancellationToken?.isCancelled) {
      throw new Error('Operation cancelled');
    }

    const geminiRequest = await this.transformChatRequest(request);

    return this.withRetry(async () => {
      const model = request.model || this.config.defaultModel || 'gemini-1.5-pro';
      const url = `${this.getBaseUrl()}/v1/models/${model}:generateContent`;

      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(geminiRequest)
        },
        this.config.timeout || 30000
      );

      const data: GeminiResponse = await this.handleResponse(response);
      return this.transformChatResponse(data, model);
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

    const geminiRequest = await this.transformChatRequest(request);
    const model = request.model || this.config.defaultModel || 'gemini-1.5-pro';
    const url = `${this.getBaseUrl()}/v1/models/${model}:streamGenerateContent`;

    let fullContent = '';

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(geminiRequest)
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
                const parsed: GeminiStreamResponse = JSON.parse(data);

                const candidate = parsed.candidates[0];
                if (candidate && candidate.content.parts[0]?.text) {
                  const text = candidate.content.parts[0].text;
                  fullContent += text;
                  onChunk(text);
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
        id: Date.now().toString(),
        content: fullContent,
        model,
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
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: request.prompt || 'What is shown in this image?'
            },
            {
              inline_data: {
                mime_type: `image/${format}`,
                data: data
              }
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: request.maxTokens || 1000
      }
    };

    const model = request.model || this.config.defaultModel || 'gemini-1.5-pro';
    const url = `${this.getBaseUrl()}/v1/models/${model}:generateContent`;

    return this.withRetry(async () => {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(visionRequest)
        },
        this.config.timeout || 30000
      );

      const data: GeminiResponse = await this.handleResponse(response);

      return {
        content: data.candidates[0].content.parts[0].text || '',
        model,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount
        } : undefined,
        timestamp: new Date()
      };
    });
  }

  async imageGenerate(request: ImageGenerationRequest, cancellationToken?: CancellationToken): Promise<ImageGenerationResponse> {
    throw new Error('Google Gemini does not support image generation');
  }

  async listModels(config?: ProviderConfig): Promise<ModelInfo[]> {
    const targetConfig = config || this.config;

    try {
      const url = `${this.getBaseUrl(targetConfig)}/v1/models`;
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: this.getHeaders(targetConfig.apiKey)
        },
        targetConfig.timeout || 30000
      );

      const data: GeminiModelsResponse = await this.handleResponse(response);

      return data.models
        .filter(model => model.supportedGenerationMethods.includes('generateContent'))
        .map(model => {
          const modelId = model.name.split('/').pop() || model.name;
          return {
            id: modelId,
            name: model.displayName,
            provider: this.provider,
            capabilities: this.getModelCapabilities(modelId),
            contextLength: model.inputTokenLimit,
            supportsStreaming: true,
            supportsVision: this.supportsVision(modelId),
            supportsImages: false
          };
        });
    } catch (error) {
      // Fallback to default models if API fails
      this.log('warn', 'Failed to fetch models from API, using defaults', { error: error.message });
      return this.defaultModels.map(modelId => ({
        id: modelId,
        name: modelId,
        provider: this.provider,
        capabilities: this.getModelCapabilities(modelId),
        contextLength: 1000000,
        supportsStreaming: true,
        supportsVision: this.supportsVision(modelId),
        supportsImages: false
      }));
    }
  }

  async testConnection(config: TestConnectionRequest): Promise<TestConnectionResponse> {
    const startTime = Date.now();

    try {
      const url = `${this.getBaseUrl(config as ProviderConfig)}/v1/models`;
      const response = await this.fetchWithTimeout(
        url,
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

    // Gemini API key format is more flexible, just check it's not empty
    const apiKeyValidation = this.validateApiKey(config.apiKey);
    if (!apiKeyValidation.valid) {
      errors.push(apiKeyValidation.error || 'Invalid API key');
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

  getDefaultConfig(): Partial<GeminiConfig> {
    return {
      baseUrl: 'https://generativelanguage.googleapis.com',
      timeout: 30000,
      defaultModel: 'gemini-1.5-flash',
      location: 'us-central1'
    };
  }

  private getBaseUrl(config?: ProviderConfig): string {
    const targetConfig = config || this.config;
    return targetConfig.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  private getHeaders(apiKey?: string): Record<string, string> {
    return {
      ...this.getDefaultHeaders(),
      'x-goog-api-key': apiKey || this.config.apiKey,
      'Content-Type': 'application/json'
    };
  }

  private async transformChatRequest(request: ChatRequest): Promise<any> {
    // Transform messages to Gemini format
    const contents: GeminiContent[] = [];

    for (const message of request.messages) {
      // Gemini doesn't have system messages, add as first user message
      if (message.role === 'system') {
        if (contents.length === 0) {
          contents.push({
            role: 'user',
            parts: [{ text: `System: ${message.content}` }]
          });
          contents.push({
            role: 'model',
            parts: [{ text: 'I understand.' }]
          });
        } else {
          // Prepend system instruction to first user message
          if (contents[0].role === 'user') {
            contents[0].parts[0].text = `System: ${message.content}\n\n${contents[0].parts[0].text}`;
          }
        }
        continue;
      }

      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      });
    }

    const generationConfig: any = {};
    if (request.temperature !== undefined) {
      generationConfig.temperature = request.temperature;
    }
    if (request.topP !== undefined) {
      generationConfig.topP = request.topP;
    }
    if (request.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = request.maxTokens;
    }
    if (request.stop) {
      generationConfig.stopSequences = Array.isArray(request.stop) ? request.stop : [request.stop];
    }

    const transformedRequest: any = {
      contents
    };

    if (Object.keys(generationConfig).length > 0) {
      transformedRequest.generationConfig = generationConfig;
    }

    return transformedRequest;
  }

  private transformChatResponse(data: GeminiResponse, model: string): ChatResponse {
    const candidate = data.candidates[0];
    const content = candidate.content.parts[0]?.text || '';

    return {
      id: Date.now().toString(),
      content,
      model,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : undefined,
      finishReason: candidate.finishReason,
      timestamp: new Date()
    };
  }

  private getModelCapabilities(modelId: string): string[] {
    const capabilities = ['chat', 'stream'];

    if (this.supportsVision(modelId)) {
      capabilities.push('vision');
    }

    return capabilities;
  }

  private supportsVision(modelId: string): boolean {
    return modelId.includes('gemini-1.5') || modelId.includes('gemini-1.0-vision');
  }
}