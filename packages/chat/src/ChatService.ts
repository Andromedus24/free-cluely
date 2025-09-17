import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  StreamOptions,
  Attachment,
  Conversation,
  ChatConfig,
  ChatEvent,
  ChatError,
  ContextWindow,
  ContextOptions,
  ToolCall,
  ProviderConfig,
  ProviderCapabilities
} from './types/ChatTypes';

// Import existing services
import { VisionService } from '@atlas/vision';
import { ImageGenerationService } from '@atlas/image-generation';
import { ProviderManager } from '@atlas/provider-adapters';
import { ConversationManager } from './ConversationManager';
import { RAGService } from './RAGService';

export interface ChatServiceDependencies {
  visionService?: VisionService;
  imageGenerationService?: ImageGenerationService;
  providerManager?: ProviderManager;
  conversationManager?: ConversationManager;
  ragService?: RAGService;
  logger?: any;
  storage?: any;
}

export interface ChatServiceConfig extends ChatConfig {
  enableVision: boolean;
  enableImageGeneration: boolean;
  enableTools: boolean;
  maxFileSize: number;
  supportedImageFormats: string[];
  supportedDocumentFormats: string[];
}

export class ChatService extends EventEmitter {
  private config: Required<ChatServiceConfig>;
  private dependencies: ChatServiceDependencies;
  private isInitialized = false;
  private activeStreams = new Map<string, any>();
  private cancellationToken = new Map<string, any>();

  constructor(
    dependencies: ChatServiceDependencies = {},
    config: Partial<ChatServiceConfig> = {}
  ) {
    super();
    this.dependencies = dependencies;

    // Set default configuration
    this.config = {
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
      maxContextTokens: 4096,
      maxResponseTokens: 2048,
      temperature: 0.7,
      enableStreaming: true,
      enableRAG: true,
      enableAttachments: true,
      enableBranching: true,
      enablePersistence: true,
      autoSave: true,
      maxConversations: 100,
      maxMessagesPerConversation: 1000,
      maxAttachmentsPerMessage: 10,
      maxAttachmentSize: 50 * 1024 * 1024, // 50MB
      supportedMimeTypes: [
        'image/*',
        'text/plain',
        'application/pdf',
        'application/json',
        'text/markdown',
        'text/csv',
      ],
      rag: {
        enabled: true,
        chunkSize: 1000,
        chunkOverlap: 200,
        maxDocuments: 1000,
        similarityThreshold: 0.7,
        embeddingModel: 'text-embedding-ada-002',
      },
      providers: {},
      persistence: {
        type: 'memory',
        autoSaveInterval: 30000,
      },
      enableVision: true,
      enableImageGeneration: true,
      enableTools: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
      supportedDocumentFormats: ['txt', 'md', 'pdf', 'json', 'csv'],
      ...config
    };

    // Initialize conversation manager if not provided
    if (!this.dependencies.conversationManager) {
      this.dependencies.conversationManager = new ConversationManager({
        storage: this.dependencies.storage,
        logger: this.dependencies.logger,
      }, {
        maxConversations: this.config.maxConversations,
        maxMessagesPerConversation: this.config.maxMessagesPerConversation,
        autoSave: this.config.autoSave,
        enableBranching: this.config.enableBranching,
      });
    }

    // Initialize RAG service if enabled and not provided
    if (this.config.enableRAG && !this.dependencies.ragService) {
      this.dependencies.ragService = new RAGService({
        logger: this.dependencies.logger,
        storage: this.dependencies.storage,
      }, this.config.rag);
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.emit('progress', { stage: 'initialization', status: 'starting' });

      // Initialize conversation manager
      if (this.dependencies.conversationManager) {
        await this.dependencies.conversationManager.initialize();
        this.emit('progress', { stage: 'initialization', status: 'conversation-manager-initialized' });
      }

      // Initialize RAG service
      if (this.config.enableRAG && this.dependencies.ragService) {
        await this.dependencies.ragService.initialize();
        this.emit('progress', { stage: 'initialization', status: 'rag-service-initialized' });
      }

      // Initialize vision service if available
      if (this.config.enableVision && this.dependencies.visionService) {
        await this.dependencies.visionService.initialize();
        this.emit('progress', { stage: 'initialization', status: 'vision-service-initialized' });
      }

      this.isInitialized = true;
      this.emit('progress', { stage: 'initialization', status: 'completed' });
    } catch (error) {
      this.emit('error', { stage: 'initialization', error: error.message });
      throw new Error(`Failed to initialize ChatService: ${error.message}`);
    }
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const messageId = uuidv4();
    let conversationId = request.conversationId;

    try {
      // Create or get conversation
      let conversation: Conversation;
      if (conversationId) {
        conversation = await this.dependencies.conversationManager!.getConversation(conversationId);
        if (!conversation) {
          throw new Error(`Conversation not found: ${conversationId}`);
        }
      } else {
        conversation = await this.dependencies.conversationManager!.createConversation({
          title: this.generateConversationTitle(request.message),
          provider: request.provider || this.config.defaultProvider,
          model: request.model || this.config.defaultModel,
        });
        conversationId = conversation.id;
      }

      // Process attachments
      const processedAttachments = await this.processAttachments(request.attachments || []);

      // Create user message
      const userMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: request.message,
        timestamp: new Date(),
        attachments: processedAttachments,
        metadata: request.metadata,
      };

      // Add message to conversation
      await this.dependencies.conversationManager!.addMessage(conversationId, userMessage);

      // Build context window
      const contextWindow = await this.buildContextWindow(conversationId, {
        maxTokens: request.maxTokens || this.config.maxContextTokens,
        includeSystemPrompt: true,
        includeAttachments: true,
        includeRAGContext: this.config.enableRAG,
      });

      // Perform RAG search if enabled
      let ragContext = '';
      if (this.config.enableRAG && this.dependencies.ragService) {
        const ragResult = await this.dependencies.ragService.search({
          query: request.message,
          conversationId,
          limit: 3,
          threshold: 0.7,
        });

        if (ragResult.documents.length > 0) {
          ragContext = this.formatRAGContext(ragResult);
        }
      }

      // Prepare provider request
      const providerRequest = {
        messages: this.formatMessagesForProvider(contextWindow.messages, ragContext, request.systemPrompt),
        model: request.model || conversation.model || this.config.defaultModel,
        temperature: request.temperature || conversation.temperature || this.config.temperature,
        maxTokens: request.maxTokens || this.config.maxResponseTokens,
        stream: request.stream,
        tools: request.tools,
        toolChoice: request.toolChoice,
        metadata: {
          ...request.metadata,
          conversationId,
          messageId,
          attachments: processedAttachments,
        },
      };

      // Get provider
      const provider = this.dependencies.providerManager || this.getDefaultProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      // Send request to provider
      let response: ChatResponse;
      if (request.stream) {
        response = await this.handleStreamingResponse(providerRequest, provider, conversationId);
      } else {
        response = await this.handleStandardResponse(providerRequest, provider, conversationId);
      }

      // Add assistant message to conversation
      await this.dependencies.conversationManager!.addMessage(conversationId, response.message);

      // Update conversation metadata
      await this.dependencies.conversationManager!.updateConversation(conversationId, {
        updatedAt: new Date(),
        provider: response.provider,
        model: response.model,
      });

      // Emit events
      this.emit('message_received', {
        messageId: response.message.id,
        conversationId,
        response,
      });

      return response;

    } catch (error) {
      const chatError: ChatError = {
        code: 'SEND_MESSAGE_FAILED',
        message: error.message,
        operation: 'sendMessage',
        timestamp: new Date(),
        retryable: this.isRetryableError(error),
      };

      this.emit('error', chatError);
      throw chatError;
    }
  }

  async streamMessage(
    request: ChatRequest,
    options: StreamOptions
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const streamId = uuidv4();
    let conversationId = request.conversationId;

    try {
      // Create or get conversation
      let conversation: Conversation;
      if (conversationId) {
        conversation = await this.dependencies.conversationManager!.getConversation(conversationId);
        if (!conversation) {
          throw new Error(`Conversation not found: ${conversationId}`);
        }
      } else {
        conversation = await this.dependencies.conversationManager!.createConversation({
          title: this.generateConversationTitle(request.message),
          provider: request.provider || this.config.defaultProvider,
          model: request.model || this.config.defaultModel,
        });
        conversationId = conversation.id;
      }

      // Process attachments
      const processedAttachments = await this.processAttachments(request.attachments || []);

      // Create user message
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: request.message,
        timestamp: new Date(),
        attachments: processedAttachments,
        metadata: request.metadata,
      };

      // Add message to conversation
      await this.dependencies.conversationManager!.addMessage(conversationId, userMessage);

      // Build context window
      const contextWindow = await this.buildContextWindow(conversationId, {
        maxTokens: request.maxTokens || this.config.maxContextTokens,
        includeSystemPrompt: true,
        includeAttachments: true,
        includeRAGContext: this.config.enableRAG,
      });

      // Perform RAG search if enabled
      let ragContext = '';
      if (this.config.enableRAG && this.dependencies.ragService) {
        const ragResult = await this.dependencies.ragService.search({
          query: request.message,
          conversationId,
          limit: 3,
          threshold: 0.7,
        });

        if (ragResult.documents.length > 0) {
          ragContext = this.formatRAGContext(ragResult);
        }
      }

      // Prepare provider request
      const providerRequest = {
        messages: this.formatMessagesForProvider(contextWindow.messages, ragContext, request.systemPrompt),
        model: request.model || conversation.model || this.config.defaultModel,
        temperature: request.temperature || conversation.temperature || this.config.temperature,
        maxTokens: request.maxTokens || this.config.maxResponseTokens,
        stream: true,
        tools: request.tools,
        toolChoice: request.toolChoice,
        metadata: {
          ...request.metadata,
          conversationId,
          streamId,
          attachments: processedAttachments,
        },
      };

      // Get provider
      const provider = this.dependencies.providerManager || this.getDefaultProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      // Start streaming
      this.activeStreams.set(streamId, {
        request: providerRequest,
        options,
        conversationId,
        startTime: Date.now(),
        contentBuffer: '',
        metadataBuffer: {},
      });

      // Handle streaming response
      await this.handleStreamingResponse(providerRequest, provider, conversationId, options);

      // Clean up
      this.activeStreams.delete(streamId);

    } catch (error) {
      const chatError: ChatError = {
        code: 'STREAM_MESSAGE_FAILED',
        message: error.message,
        operation: 'streamMessage',
        timestamp: new Date(),
        retryable: this.isRetryableError(error),
      };

      if (options.onError) {
        options.onError(error.message);
      }

      this.emit('error', chatError);
      throw chatError;
    }
  }

  private async handleStandardResponse(
    providerRequest: any,
    provider: any,
    conversationId: string
  ): Promise<ChatResponse> {
    const response = await provider.chat(providerRequest);

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      metadata: response.metadata,
    };

    return {
      id: uuidv4(),
      conversationId,
      message: assistantMessage,
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      metadata: response.metadata,
      timestamp: new Date(),
      processingTime: Date.now() - (response.metadata?.startTime || Date.now()),
    };
  }

  private async handleStreamingResponse(
    providerRequest: any,
    provider: any,
    conversationId: string,
    options?: StreamOptions
  ): Promise<ChatResponse> {
    const messageId = uuidv4();
    let contentBuffer = '';
    let metadataBuffer: any = {};
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const cancellationToken = {
        isCancelled: false,
        cancel: () => {
          cancellationToken.isCancelled = true;
          this.cancellationToken.delete(messageId);
        },
        onCancelled: (callback: () => void) => {
          // Implementation for cancellation callback
        },
      };

      this.cancellationToken.set(messageId, cancellationToken);

      const onChunk = async (chunk: string) => {
        if (cancellationToken.isCancelled) {
          return;
        }

        contentBuffer += chunk;

        const streamChunk: StreamChunk = {
          id: messageId,
          type: 'content',
          content: chunk,
          timestamp: new Date(),
        };

        if (options?.onChunk) {
          options.onChunk(streamChunk);
        }

        this.emit('stream_chunk', streamChunk);
      };

      const onComplete = async (response: any) => {
        const assistantMessage: ChatMessage = {
          id: messageId,
          role: 'assistant',
          content: contentBuffer,
          timestamp: new Date(),
          provider: response.provider,
          model: response.model,
          usage: response.usage,
          metadata: {
            ...response.metadata,
            streaming: true,
          },
        };

        const chatResponse: ChatResponse = {
          id: uuidv4(),
          conversationId,
          message: assistantMessage,
          provider: response.provider,
          model: response.model,
          usage: response.usage,
          metadata: response.metadata,
          timestamp: new Date(),
          processingTime: Date.now() - startTime,
        };

        if (options?.onComplete) {
          options.onComplete(chatResponse);
        }

        this.cancellationToken.delete(messageId);
        resolve(chatResponse);
      };

      const onError = async (error: string) => {
        if (options?.onError) {
          options.onError(error);
        }

        const chatError: ChatError = {
          code: 'STREAM_ERROR',
          message: error,
          operation: 'streaming',
          timestamp: new Date(),
          retryable: true,
        };

        this.emit('error', chatError);
        this.cancellationToken.delete(messageId);
        reject(chatError);
      };

      provider.streamChat(providerRequest, onChunk, cancellationToken)
        .then(onComplete)
        .catch(onError);
    });
  }

  private async processAttachments(attachments: any[]): Promise<Attachment[]> {
    const processedAttachments: Attachment[] = [];

    for (const attachment of attachments) {
      try {
        const processedAttachment = await this.processSingleAttachment(attachment);
        processedAttachments.push(processedAttachment);
      } catch (error) {
        this.emit('attachment_error', {
          attachmentId: attachment.id,
          error: error.message,
        });
        if (this.dependencies.logger) {
          this.dependencies.logger.error('Failed to process attachment:', error);
        }
      }
    }

    return processedAttachments;
  }

  private async processSingleAttachment(attachment: any): Promise<Attachment> {
    const processedAttachment: Attachment = {
      id: attachment.id || uuidv4(),
      type: this.determineAttachmentType(attachment),
      name: attachment.name || 'Unknown',
      size: attachment.size || 0,
      mimeType: attachment.mimeType || 'application/octet-stream',
      url: attachment.url,
      base64: attachment.base64,
      buffer: attachment.buffer,
      metadata: attachment.metadata || {},
      createdAt: new Date(),
    };

    // Process image attachments with vision service
    if (this.config.enableVision &&
        processedAttachment.type === 'image' &&
        this.dependencies.visionService) {
      try {
        const visionResult = await this.dependencies.visionService.analyze({
          id: processedAttachment.id,
          type: 'analysis',
          imageData: attachment.buffer || attachment.base64,
          options: {
            provider: 'openai',
            enableContextualAnalysis: true,
          },
        });

        processedAttachment.processingResult = {
          vision: visionResult,
          processedAt: new Date(),
        };
      } catch (error) {
        this.emit('vision_processing_error', {
          attachmentId: processedAttachment.id,
          error: error.message,
        });
      }
    }

    return processedAttachment;
  }

  private determineAttachmentType(attachment: any): Attachment['type'] {
    if (attachment.mimeType?.startsWith('image/')) {
      return 'image';
    }
    if (attachment.mimeType?.startsWith('audio/')) {
      return 'audio';
    }
    if (attachment.mimeType?.startsWith('video/')) {
      return 'video';
    }
    if (attachment.mimeType?.includes('pdf') ||
        attachment.mimeType?.includes('document') ||
        attachment.name?.match(/\.(txt|md|pdf|doc|docx)$/i)) {
      return 'document';
    }
    return 'file';
  }

  private async buildContextWindow(
    conversationId: string,
    options: ContextOptions
  ): Promise<ContextWindow> {
    if (!this.dependencies.conversationManager) {
      return {
        messages: [],
        totalTokens: 0,
        availableTokens: options.maxTokens,
      };
    }

    const conversation = await this.dependencies.conversationManager.getConversation(conversationId);
    if (!conversation) {
      return {
        messages: [],
        totalTokens: 0,
        availableTokens: options.maxTokens,
      };
    }

    const messages = [...conversation.messages];
    let totalTokens = 0;
    const maxTokens = options.maxTokens;

    // Reverse messages to process from newest to oldest
    const reversedMessages = messages.reverse();
    const contextMessages: ChatMessage[] = [];

    for (const message of reversedMessages) {
      const messageTokens = this.estimateTokenCount(message.content);

      if (totalTokens + messageTokens <= maxTokens) {
        contextMessages.unshift(message); // Add to beginning of context
        totalTokens += messageTokens;
      } else {
        break;
      }
    }

    return {
      messages: contextMessages,
      totalTokens,
      availableTokens: maxTokens - totalTokens,
      context: options.context,
      metadata: {
        conversationId,
        totalMessages: conversation.messages.length,
        contextMessages: contextMessages.length,
        compression: options.compression,
        prioritization: options.prioritization,
      },
    };
  }

  private formatMessagesForProvider(
    messages: ChatMessage[],
    ragContext: string,
    systemPrompt?: string
  ): any[] {
    const providerMessages: any[] = [];

    // Add system prompt
    if (systemPrompt) {
      providerMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Add RAG context if available
    if (ragContext) {
      providerMessages.push({
        role: 'system',
        content: `Context from relevant documents:\n\n${ragContext}`,
      });
    }

    // Add conversation messages
    for (const message of messages) {
      let content = message.content;

      // Add attachment context
      if (message.attachments && message.attachments.length > 0) {
        const attachmentTexts = message.attachments
          .filter(att => att.processingResult?.vision?.text)
          .map(att => `[Image: ${att.name}] ${att.processingResult.vision.text}`)
          .join('\n\n');

        if (attachmentTexts) {
          content += `\n\nAttachments:\n${attachmentTexts}`;
        }
      }

      providerMessages.push({
        role: message.role,
        content,
      });
    }

    return providerMessages;
  }

  private formatRAGContext(ragResult: any): string {
    const contextParts: string[] = [];

    for (let i = 0; i < ragResult.documents.length; i++) {
      const doc = ragResult.documents[i];
      contextParts.push(`Document ${i + 1} (${doc.source || 'Unknown'}):\n${doc.content}`);
    }

    return contextParts.join('\n\n---\n\n');
  }

  private generateConversationTitle(message: string): string {
    const words = message.split(' ').slice(0, 8);
    return words.join(' ') + (message.split(' ').length > 8 ? '...' : '');
  }

  private estimateTokenCount(text: string): number {
    // Simple token estimation (rough approximation)
    return Math.ceil(text.length / 4);
  }

  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'RATE_LIMITED',
      'TEMPORARY_ERROR',
    ];

    return retryableCodes.includes(error.code) ||
           error.message?.includes('timeout') ||
           error.message?.includes('network') ||
           error.message?.includes('rate limit');
  }

  private getDefaultProvider(): any {
    // Implementation for getting default provider
    // This would typically come from the provider manager
    return null;
  }

  // Public utility methods
  async createConversation(options?: Partial<Conversation>): Promise<Conversation> {
    if (!this.dependencies.conversationManager) {
      throw new Error('Conversation manager not available');
    }

    return await this.dependencies.conversationManager.createConversation(options);
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    if (!this.dependencies.conversationManager) {
      throw new Error('Conversation manager not available');
    }

    return await this.dependencies.conversationManager.getConversation(conversationId);
  }

  async listConversations(limit?: number, offset?: number): Promise<Conversation[]> {
    if (!this.dependencies.conversationManager) {
      throw new Error('Conversation manager not available');
    }

    return await this.dependencies.conversationManager.listConversations(limit, offset);
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (!this.dependencies.conversationManager) {
      throw new Error('Conversation manager not available');
    }

    return await this.dependencies.conversationManager.deleteConversation(conversationId);
  }

  async addDocument(document: any): Promise<string> {
    if (!this.dependencies.ragService) {
      throw new Error('RAG service not available');
    }

    return await this.dependencies.ragService.addDocument(document);
  }

  async searchDocuments(query: string, options?: any): Promise<any> {
    if (!this.dependencies.ragService) {
      throw new Error('RAG service not available');
    }

    return await this.dependencies.ragService.search({
      query,
      ...options,
    });
  }

  async getCapabilities(): Promise<{
    vision: boolean;
    imageGeneration: boolean;
    rag: boolean;
    streaming: boolean;
    tools: boolean;
    branching: boolean;
  }> {
    return {
      vision: this.config.enableVision && !!this.dependencies.visionService,
      imageGeneration: this.config.enableImageGeneration && !!this.dependencies.imageGenerationService,
      rag: this.config.enableRAG && !!this.dependencies.ragService,
      streaming: this.config.enableStreaming,
      tools: this.config.enableTools,
      branching: this.config.enableBranching,
    };
  }

  async cancelStream(streamId: string): Promise<boolean> {
    const cancellationToken = this.cancellationToken.get(streamId);
    if (cancellationToken) {
      cancellationToken.cancel();
      return true;
    }
    return false;
  }

  async cleanup(): Promise<void> {
    // Cancel all active streams
    for (const [streamId, cancellationToken] of this.cancellationToken) {
      cancellationToken.cancel();
    }

    // Cleanup services
    if (this.dependencies.conversationManager) {
      await this.dependencies.conversationManager.cleanup();
    }

    if (this.dependencies.ragService) {
      await this.dependencies.ragService.cleanup();
    }

    if (this.dependencies.visionService) {
      await this.dependencies.visionService.cleanup();
    }

    this.isInitialized = false;
  }
}