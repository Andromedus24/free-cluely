import fetch from 'node-fetch';
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

interface OllamaAdapterConfig {
  host?: string;
  timeout?: number;
  maxRetries?: number;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

interface OllamaMessage {
  role: string;
  content: string;
  images?: string[];
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
    top_k?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaAdapter implements ProviderAdapter {
  private config: Required<OllamaAdapterConfig>;
  private baseUrl: string;

  constructor(config: OllamaAdapterConfig = {}) {
    this.config = {
      host: config.host || 'http://localhost:11434',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3
    };
    this.baseUrl = this.config.host.replace(/\/$/, '');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const ollamaRequest: OllamaChatRequest = {
        model: 'llama3.2', // Default model
        messages: this.formatMessages(request.messages),
        stream: false,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens
        }
      };

      const response = await this.makeRequest(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ollamaRequest)
      });

      const data: OllamaChatResponse = await response.json();

      return {
        content: data.message.content,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          cost: 0 // Ollama is free/local
        },
        metadata: {
          model: data.model,
          totalDuration: data.total_duration,
          loadDuration: data.load_duration,
          evalDuration: data.eval_duration
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async *streamChat(request: ChatRequest): AsyncIterable<ChatStreamChunk> {
    try {
      const ollamaRequest: OllamaChatRequest = {
        model: 'llama3.2', // Default model
        messages: this.formatMessages(request.messages),
        stream: true,
        options: {
          temperature: request.temperature,
          num_predict: request.maxTokens
        }
      };

      const response = await this.makeRequest(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ollamaRequest)
      });

      if (!response.body) {
        throw new ProviderError('No response body', 'ollama');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);

              if (data.response) {
                yield {
                  content: data.response,
                  done: data.done,
                  usage: data.done ? {
                    promptTokens: data.prompt_eval_count || 0,
                    completionTokens: data.eval_count || 0,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
                    cost: 0
                  } : undefined,
                  metadata: {
                    model: data.model
                  },
                  timestamp: Date.now()
                };
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async visionAnalyze(request: VisionRequest): Promise<VisionResponse> {
    try {
      const messages: OllamaMessage[] = [];

      if (request.prompt) {
        messages.push({
          role: 'user',
          content: request.prompt
        });
      }

      // Handle image input
      let imageData: string;
      if (typeof request.image === 'string') {
        imageData = request.image.startsWith('data:') ?
          request.image.split(',')[1] : request.image;
      } else {
        imageData = request.image.toString('base64');
      }

      messages.push({
        role: 'user',
        content: request.prompt || 'Analyze this image and provide a detailed description.',
        images: [imageData]
      });

      const ollamaRequest: OllamaChatRequest = {
        model: 'llava', // Vision model
        messages,
        stream: false
      };

      const response = await this.makeRequest(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ollamaRequest)
      });

      const data: OllamaChatResponse = await response.json();

      return {
        text: data.message.content,
        confidence: 0.8,
        structured: request.options?.extractStructured ? this.parseStructuredResponse(data.message.content) : undefined,
        metadata: {
          model: data.model,
          mode: request.mode
        },
        timestamp: Date.now()
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async imageGenerate(request: ImageGenerateRequest): Promise<ImageGenerateResponse> {
    throw new ProviderError('Ollama does not support image generation', 'ollama', 'NOT_SUPPORTED');
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/api/tags`, {
        method: 'GET'
      });

      const data = await response.json();
      return data.models.map((model: OllamaModel) => model.name);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/api/tags`, {
        method: 'GET'
      });
      return response.ok;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED')) {
          throw new ProviderConnectionError('Ollama server not running', 'ollama', error);
        }
      }
      return false;
    }
  }

  getProviderInfo(): ProviderInfo {
    return {
      name: 'Ollama',
      version: '1.0.0',
      description: 'Local LLM runner with support for various open-source models',
      capabilities: ['chat', 'stream', 'vision'],
      models: [
        {
          id: 'llama3.2',
          name: 'Llama 3.2',
          capabilities: ['chat', 'stream'],
          maxTokens: 8192,
          supportsStreaming: true
        },
        {
          id: 'llava',
          name: 'LLaVA',
          capabilities: ['chat', 'stream', 'vision'],
          maxTokens: 4096,
          supportsStreaming: true,
          supportsVision: true
        },
        {
          id: 'mistral',
          name: 'Mistral',
          capabilities: ['chat', 'stream'],
          maxTokens: 8192,
          supportsStreaming: true
        },
        {
          id: 'codellama',
          name: 'Code Llama',
          capabilities: ['chat', 'stream'],
          maxTokens: 16384,
          supportsStreaming: true
        }
      ],
      pricing: {} // Free/local
    };
  }

  private formatMessages(messages: Array<any>): OllamaMessage[] {
    return messages.map(message => {
      const ollamaMessage: OllamaMessage = {
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content
      };

      // Handle image attachments for vision models
      if (message.attachments && message.attachments.length > 0) {
        ollamaMessage.images = [];
        for (const attachment of message.attachments) {
          if (attachment.type === 'image') {
            const imageData = typeof attachment.content === 'string' ?
              attachment.content : attachment.content.toString('base64');
            const base64Data = imageData.startsWith('data:') ?
              imageData.split(',')[1] : imageData;
            ollamaMessage.images.push(base64Data);
          }
        }
      }

      return ollamaMessage;
    });
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      let response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      // Retry logic
      if (!response.ok && this.config.maxRetries > 0) {
        for (let i = 0; i < this.config.maxRetries; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));

          controller.abort(); // Create new controller for retry
          timeoutId && clearTimeout(timeoutId);

          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(() => retryController.abort(), this.config.timeout);

          response = await fetch(url, {
            ...options,
            signal: retryController.signal
          });

          if (response.ok) break;

          retryTimeoutId && clearTimeout(retryTimeoutId);
        }
      }

      if (!response.ok) {
        throw new ProviderError(`HTTP ${response.status}: ${response.statusText}`, 'ollama');
      }

      return response;
    } catch (error) {
      timeoutId && clearTimeout(timeoutId);
      throw error;
    }
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
      if (error.message.includes('ECONNREFUSED')) {
        return new ProviderConnectionError('Ollama server not running', 'ollama', error);
      } else if (error.message.includes('timeout') || error.message.includes('AbortError')) {
        return new ProviderConnectionError('Request timeout', 'ollama', error);
      } else if (error.message.includes('model not found')) {
        return new ProviderError('Model not found', 'ollama', 'MODEL_NOT_FOUND');
      }
    }
    return new ProviderError('Unknown Ollama error', 'ollama', 'UNKNOWN', error instanceof Error ? error : undefined);
  }
}