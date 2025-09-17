import { z } from 'zod';

// Core Chat Message Types
export const ChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  timestamp: z.date().default(() => new Date()),
  metadata: z.record(z.unknown()).optional(),
  attachments: z.array(z.any()).optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  usage: z.object({
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    cost: z.number().optional(),
  }).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Attachment Types
export const AttachmentSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'document', 'audio', 'video', 'file']),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  url: z.string().optional(),
  base64: z.string().optional(),
  buffer: z.any().optional(),
  metadata: z.record(z.unknown()).optional(),
  processingResult: z.any().optional(),
  createdAt: z.date().default(() => new Date()),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

// Conversation Types
export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  messages: z.array(ChatMessageSchema).default([]),
  attachments: z.array(AttachmentSchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
  branchId: z.string().optional(),
  parentConversationId: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  isArchived: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  contextWindowSize: z.number().default(4096),
  maxTokens: z.number().default(2048),
  temperature: z.number().default(0.7),
  systemPrompt: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// Conversation Branch Types
export const ConversationBranchSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  branchPoint: z.number(), // Message index where branch was created
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  isMain: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
});

export type ConversationBranch = z.infer<typeof ConversationBranchSchema>;

// Chat Request Types
export const ChatRequestSchema = z.object({
  message: z.string(),
  conversationId: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(0).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string()).optional(),
  stream: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  tools: z.array(z.any()).optional(),
  toolChoice: z.enum(['auto', 'none', 'required']).optional(),
  context: z.record(z.unknown()).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// Chat Response Types
export const ChatResponseSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  message: ChatMessageSchema,
  provider: z.string(),
  model: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
    cost: z.number().optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
  processingTime: z.number().optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// Streaming Types
export const StreamChunkSchema = z.object({
  id: z.string(),
  type: z.enum(['content', 'metadata', 'error', 'complete', 'tool_call']),
  content: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  toolCall: z.any().optional(),
  timestamp: z.date().default(() => new Date()),
});

export type StreamChunk = z.infer<typeof StreamChunkSchema>;

export const StreamOptionsSchema = z.object({
  onChunk: z.function().args(StreamChunkSchema).returns(z.void()),
  onComplete: z.function().args(ChatResponseSchema).returns(z.void()).optional(),
  onError: z.function().args(z.string()).returns(z.void()).optional(),
  cancellationToken: z.any().optional(),
});

export type StreamOptions = z.infer<typeof StreamOptionsSchema>;

// RAG Types
export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).default([]),
  embedding: z.array(z.number()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  source: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
});

export type Document = z.infer<typeof DocumentSchema>;

export const SearchQuerySchema = z.object({
  query: z.string(),
  conversationId: z.string().optional(),
  limit: z.number().default(5),
  threshold: z.number().default(0.7),
  filters: z.record(z.unknown()).optional(),
  includeMetadata: z.boolean().default(true),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultSchema = z.object({
  documents: z.array(DocumentSchema),
  scores: z.array(z.number()),
  query: z.string(),
  processingTime: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

// Context Types
export const ContextWindowSchema = z.object({
  messages: z.array(ChatMessageSchema),
  totalTokens: z.number(),
  availableTokens: z.number(),
  context: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ContextWindow = z.infer<typeof ContextWindowSchema>;

export const ContextOptionsSchema = z.object({
  maxTokens: z.number().default(4096),
  includeSystemPrompt: z.boolean().default(true),
  includeAttachments: z.boolean().default(true),
  includeRAGContext: z.boolean().default(true),
  compression: z.enum(['none', 'basic', 'aggressive']).default('none'),
  prioritization: z.enum(['recency', 'relevance', 'importance']).default('recency'),
});

export type ContextOptions = z.infer<typeof ContextOptionsSchema>;

// Provider Integration Types
export const ProviderConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  timeout: z.number().default(30000),
  maxRetries: z.number().default(3),
  settings: z.record(z.unknown()).optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const ProviderCapabilitiesSchema = z.object({
  streaming: z.boolean().default(true),
  vision: z.boolean().default(false),
  tools: z.boolean().default(false),
  functionCalling: z.boolean().default(false),
  jsonMode: z.boolean().default(false),
  imageGeneration: z.boolean().default(false),
  embedding: z.boolean().default(false),
  maxTokens: z.number().optional(),
  maxContextWindow: z.number().optional(),
});

export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

// Configuration Types
export const ChatConfigSchema = z.object({
  defaultProvider: z.string().default('openai'),
  defaultModel: z.string().default('gpt-3.5-turbo'),
  maxContextTokens: z.number().default(4096),
  maxResponseTokens: z.number().default(2048),
  temperature: z.number().default(0.7),
  enableStreaming: z.boolean().default(true),
  enableRAG: z.boolean().default(true),
  enableAttachments: z.boolean().default(true),
  enableBranching: z.boolean().default(true),
  enablePersistence: z.boolean().default(true),
  autoSave: z.boolean().default(true),
  maxConversations: z.number().default(100),
  maxMessagesPerConversation: z.number().default(1000),
  maxAttachmentsPerMessage: z.number().default(10),
  maxAttachmentSize: z.number().default(50 * 1024 * 1024), // 50MB
  supportedMimeTypes: z.array(z.string()).default([
    'image/*',
    'text/plain',
    'application/pdf',
    'application/json',
    'text/markdown',
    'text/csv',
  ]),
  rag: z.object({
    enabled: z.boolean().default(true),
    chunkSize: z.number().default(1000),
    chunkOverlap: z.number().default(200),
    maxDocuments: z.number().default(1000),
    similarityThreshold: z.number().default(0.7),
    embeddingModel: z.string().default('text-embedding-ada-002'),
  }).optional(),
  providers: z.record(ProviderConfigSchema).optional(),
  persistence: z.object({
    type: z.enum(['memory', 'file', 'database']).default('memory'),
    path: z.string().optional(),
    connection: z.string().optional(),
    autoSaveInterval: z.number().default(30000), // 30 seconds
  }).optional(),
});

export type ChatConfig = z.infer<typeof ChatConfigSchema>;

// Event Types
export const ChatEventSchema = z.object({
  type: z.enum([
    'message_sent',
    'message_received',
    'conversation_created',
    'conversation_updated',
    'conversation_deleted',
    'conversation_archived',
    'branch_created',
    'branch_merged',
    'attachment_added',
    'attachment_processed',
    'error',
    'stream_started',
    'stream_ended',
    'rag_search_started',
    'rag_search_completed',
    'context_updated',
    'provider_changed',
  ]),
  payload: z.record(z.unknown()).optional(),
  timestamp: z.date().default(() => new Date()),
  conversationId: z.string().optional(),
  messageId: z.string().optional(),
  userId: z.string().optional(),
});

export type ChatEvent = z.infer<typeof ChatEventSchema>;

// Error Types
export const ChatErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  operation: z.string().optional(),
  provider: z.string().optional(),
  retryable: z.boolean().default(false),
});

export type ChatError = z.infer<typeof ChatErrorSchema>;

// Analytics Types
export const ConversationStatsSchema = z.object({
  totalMessages: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  averageResponseTime: z.number(),
  providerUsage: z.record(z.number()).optional(),
  modelUsage: z.record(z.number()).optional(),
  attachmentCount: z.number(),
  branchCount: z.number(),
  createdAt: z.date().optional(),
  lastActivity: z.date().optional(),
});

export type ConversationStats = z.infer<typeof ConversationStatsSchema>;

// Tool/Function Calling Types
export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  parameters: z.record(z.unknown()).optional(),
  result: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.any()).optional(),
  required: z.array(z.string()).optional(),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// Export all types
export type {
  ChatMessage,
  Attachment,
  Conversation,
  ConversationBranch,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  StreamOptions,
  Document,
  SearchQuery,
  SearchResult,
  ContextWindow,
  ContextOptions,
  ProviderConfig,
  ProviderCapabilities,
  ChatConfig,
  ChatEvent,
  ChatError,
  ConversationStats,
  ToolCall,
  ToolDefinition,
};