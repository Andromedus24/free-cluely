// Core types and interfaces
export * from './types/ChatTypes';

// Main services
export { ChatService } from './ChatService';
export { ConversationManager } from './ConversationManager';
export { RAGService } from './RAGService';

// Re-export commonly used types for convenience
export type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  Conversation,
  ConversationBranch,
  Attachment,
  Document,
  SearchQuery,
  SearchResult,
  StreamChunk,
  StreamOptions,
  ChatConfig,
  ChatEvent,
  ChatError,
  ContextWindow,
  ProviderConfig,
  ProviderCapabilities,
  ToolCall,
  ToolDefinition,
} from './types/ChatTypes';

// Default configurations
export const defaultChatConfig = {
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
    type: 'memory' as const,
    autoSaveInterval: 30000,
  },
  enableVision: true,
  enableImageGeneration: true,
  enableTools: true,
  maxFileSize: 100 * 1024 * 1024, // 100MB
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
  supportedDocumentFormats: ['txt', 'md', 'pdf', 'json', 'csv'],
};

// Factory functions for easy setup
export function createChatService(
  dependencies?: any,
  config?: Partial<typeof defaultChatConfig>
): ChatService {
  const { ChatService } = require('./ChatService');
  return new ChatService(dependencies, config);
}

export function createConversationManager(
  dependencies?: any,
  config?: any
): ConversationManager {
  const { ConversationManager } = require('./ConversationManager');
  return new ConversationManager(dependencies, config);
}

export function createRAGService(
  dependencies?: any,
  config?: any
): RAGService {
  const { RAGService } = require('./RAGService');
  return new RAGService(dependencies, config);
}

// Utility functions
export function generateId(): string {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

export function estimateTokens(text: string): number {
  // Simple token estimation (rough approximation)
  return Math.ceil(text.length / 4);
}

export function formatMessageForDisplay(message: ChatMessage): string {
  const timestamp = message.timestamp.toLocaleString();
  const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);

  let formatted = `[${timestamp}] ${role}:\n${message.content}`;

  if (message.attachments && message.attachments.length > 0) {
    formatted += '\n\nAttachments:\n';
    message.attachments.forEach((attachment, index) => {
      formatted += `${index + 1}. ${attachment.name} (${attachment.type})\n`;
    });
  }

  return formatted;
}

export function validateChatRequest(request: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.message || typeof request.message !== 'string') {
    errors.push('Message is required and must be a string');
  }

  if (request.message.length > 100000) {
    errors.push('Message is too long (max 100,000 characters)');
  }

  if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
    errors.push('Temperature must be between 0 and 2');
  }

  if (request.maxTokens !== undefined && (request.maxTokens < 1 || request.maxTokens > 100000)) {
    errors.push('Max tokens must be between 1 and 100,000');
  }

  if (request.attachments && !Array.isArray(request.attachments)) {
    errors.push('Attachments must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createChatResponse(
  request: ChatRequest,
  response: any,
  conversationId: string
): ChatResponse {
  const { generateId } = require('./index');

  return {
    id: generateId(),
    conversationId,
    message: {
      id: generateId(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      provider: response.provider,
      model: response.model,
      usage: response.usage,
      metadata: response.metadata,
    },
    provider: response.provider,
    model: response.model,
    usage: response.usage,
    metadata: response.metadata,
    timestamp: new Date(),
    processingTime: response.processingTime || 0,
  };
}

// Event helper functions
export function createChatEvent(
  type: ChatEvent['type'],
  payload?: any,
  conversationId?: string,
  messageId?: string
): ChatEvent {
  return {
    type,
    payload,
    timestamp: new Date(),
    conversationId,
    messageId,
  };
}

// Error helper functions
export function createChatError(
  code: string,
  message: string,
  operation?: string,
  details?: any
): ChatError {
  return {
    code,
    message,
    details,
    operation,
    timestamp: new Date(),
    retryable: isRetryableError({ code, message }),
  };
}

export function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'TIMEOUT',
    'NETWORK_ERROR',
    'RATE_LIMITED',
    'TEMPORARY_ERROR',
    'SERVICE_UNAVAILABLE',
  ];

  return retryableCodes.includes(error.code) ||
         error.message?.includes('timeout') ||
         error.message?.includes('network') ||
         error.message?.includes('rate limit') ||
         error.message?.includes('service unavailable');
}

// Conversation helper functions
export function generateConversationTitle(message: string): string {
  const words = message.split(' ').slice(0, 8);
  return words.join(' ') + (message.split(' ').length > 8 ? '...' : '');
}

export function calculateConversationCost(messages: ChatMessage[]): number {
  return messages.reduce((total, message) => {
    return total + (message.usage?.cost || 0);
  }, 0);
}

export function getConversationSummary(conversation: Conversation): {
  totalMessages: number;
  totalTokens: number;
  totalCost: number;
  duration: number;
  lastActivity: Date;
} {
  const totalMessages = conversation.messages.length;
  const totalTokens = conversation.messages.reduce((sum, msg) =>
    sum + (msg.usage?.totalTokens || 0), 0);
  const totalCost = calculateConversationCost(conversation.messages);
  const duration = conversation.updatedAt.getTime() - conversation.createdAt.getTime();
  const lastActivity = conversation.updatedAt;

  return {
    totalMessages,
    totalTokens,
    totalCost,
    duration,
    lastActivity,
  };
}

// RAG helper functions
export function formatRAGContext(searchResult: SearchResult): string {
  const contextParts: string[] = [];

  for (let i = 0; i < searchResult.documents.length; i++) {
    const doc = searchResult.documents[i];
    const score = searchResult.scores[i];
    contextParts.push(`Document ${i + 1} (Relevance: ${(score * 100).toFixed(1)}%, Source: ${doc.source || 'Unknown'}):\n${doc.content}`);
  }

  return contextParts.join('\n\n---\n\n');
}

export function estimateDocumentProcessingTime(size: number, type: string): number {
  // Base processing time in milliseconds
  let baseTime = 1000;

  // Adjust based on document type
  switch (type) {
    case 'application/pdf':
      baseTime = 5000;
      break;
    case 'image/*':
      baseTime = 3000;
      break;
    case 'text/plain':
      baseTime = 500;
      break;
    default:
      baseTime = 2000;
  }

  // Adjust based on size (add 1ms per 1000 bytes)
  return baseTime + (size / 1000);
}

// Streaming helper functions
export function createStreamChunk(
  id: string,
  type: StreamChunk['type'],
  content?: string,
  metadata?: any
): StreamChunk {
  return {
    id,
    type,
    content,
    metadata,
    timestamp: new Date(),
  };
}

export function parseStreamChunk(chunk: any): StreamChunk | null {
  try {
    if (typeof chunk === 'string') {
      const parsed = JSON.parse(chunk);
      return {
        id: parsed.id || generateId(),
        type: parsed.type || 'content',
        content: parsed.content,
        metadata: parsed.metadata,
        timestamp: new Date(parsed.timestamp || Date.now()),
      };
    } else if (typeof chunk === 'object') {
      return {
        id: chunk.id || generateId(),
        type: chunk.type || 'content',
        content: chunk.content,
        metadata: chunk.metadata,
        timestamp: new Date(chunk.timestamp || Date.now()),
      };
    }
  } catch (error) {
    console.warn('Failed to parse stream chunk:', error);
  }

  return null;
}

// Version information
export const CHAT_SERVICE_VERSION = '1.0.0';
export const CHAT_SERVICE_COMPATIBILITY = '^1.0.0';

// Main export class that bundles everything together
export class AtlasChat {
  private chatService: ChatService;
  private conversationManager: ConversationManager;
  private ragService: RAGService;

  constructor(config?: Partial<typeof defaultChatConfig>) {
    this.conversationManager = createConversationManager({}, config?.persistence);
    this.ragService = createRAGService({}, config?.rag);

    this.chatService = createChatService(
      {
        conversationManager: this.conversationManager,
        ragService: this.ragService,
      },
      config
    );
  }

  async initialize(): Promise<void> {
    await this.chatService.initialize();
  }

  get chat(): ChatService {
    return this.chatService;
  }

  get conversations(): ConversationManager {
    return this.conversationManager;
  }

  get rag(): RAGService {
    return this.ragService;
  }

  async cleanup(): Promise<void> {
    await this.chatService.cleanup();
    await this.conversationManager.cleanup();
    await this.ragService.cleanup();
  }
}

// Default export for convenience
export default AtlasChat;