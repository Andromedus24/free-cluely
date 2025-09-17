# Atlas Chat Service

A comprehensive Unified Chat System for the Atlas AI Assistant, providing multi-modal chat capabilities, RAG (Retrieval-Augmented Generation), conversation management, and streaming responses.

## Features

### 🎯 Core Capabilities
- **Unified Chat Interface**: Seamless conversation flow across multiple providers
- **Multi-Modal Support**: Handle text, images, and document attachments
- **Real-time Streaming**: Live response streaming with markdown rendering
- **Context Persistence**: Conversation memory and history management
- **RAG Integration**: Document embedding and semantic search capabilities

### 💬 Conversation Management
- **Conversation History**: Persistent storage and retrieval of conversations
- **Branching System**: Create and manage conversation branches
- **Export Options**: Export conversations in JSON, Markdown, or plain text
- **Search & Filter**: Advanced search across conversations
- **Statistics & Analytics**: Detailed conversation insights and usage metrics

### 🔍 RAG (Retrieval-Augmented Generation)
- **Document Processing**: Automatic chunking and embedding of documents
- **Vector Search**: Semantic similarity search across knowledge base
- **Context Injection**: Intelligent context injection from relevant documents
- **Multi-format Support**: Handle various document types (PDF, text, Markdown, etc.)

### 📎 Multi-Modal Attachments
- **Image Analysis**: Integrated vision analysis for image attachments
- **Document Processing**: Support for PDF, text, and other document formats
- **Metadata Extraction**: Automatic extraction of document metadata and entities
- **File Type Detection**: Intelligent file type detection and handling

### ⚡ Streaming & Performance
- **Real-time Streaming**: Token-by-token response streaming
- **Progress Tracking**: Typing indicators and progress monitoring
- **Cancellation Support**: Stream interruption and cancellation
- **Error Handling**: Comprehensive error handling and retry mechanisms

## Installation

```bash
npm install @atlas/chat
```

## Quick Start

### Basic Usage

```typescript
import { AtlasChat } from '@atlas/chat';

// Initialize the chat service
const chat = new AtlasChat({
  defaultProvider: 'openai',
  defaultModel: 'gpt-3.5-turbo',
  enableRAG: true,
  enableVision: true,
});

await chat.initialize();

// Send a message
const response = await chat.chat.sendMessage({
  message: 'Hello, how can you help me?',
  temperature: 0.7,
  stream: false,
});

console.log(response.message.content);
```

### Streaming Responses

```typescript
import { ChatService } from '@atlas/chat';

const chatService = new ChatService();

// Stream a response with real-time updates
await chatService.streamMessage({
  message: 'Tell me about the solar system',
  conversationId: 'conv-123',
}, {
  onChunk: (chunk) => {
    process.stdout.write(chunk.content || '');
  },
  onComplete: (response) => {
    console.log('\nStream completed!');
  },
  onError: (error) => {
    console.error('Stream error:', error);
  }
});
```

### RAG (Document Search)

```typescript
import { RAGService } from '@atlas/chat';

const ragService = new RAGService();

// Add documents to the knowledge base
const documentId = await ragService.addDocument(
  'The solar system consists of the Sun and the objects that orbit it...',
  {
    title: 'Solar System Overview',
    source: 'NASA',
    tags: ['astronomy', 'science']
  }
);

// Search for relevant documents
const searchResult = await ragService.search({
  query: 'What planets are in our solar system?',
  limit: 5,
  threshold: 0.7,
});

console.log('Found documents:', searchResult.documents);
```

### Conversation Management

```typescript
import { ConversationManager } from '@atlas/chat';

const conversationManager = new ConversationManager();

// Create a new conversation
const conversation = await conversationManager.createConversation({
  title: 'Solar System Discussion',
  provider: 'openai',
  model: 'gpt-4',
  systemPrompt: 'You are an astronomy expert assistant.'
});

// Add messages
await conversationManager.addMessage(conversation.id, {
  id: 'msg-1',
  role: 'user',
  content: 'How many planets are there?',
  timestamp: new Date()
});

// Create a conversation branch
const branch = await conversationManager.createBranch(
  conversation.id,
  'Follow-up about moons',
  1 // Branch after the first message
);

// Get conversation statistics
const stats = await conversationManager.getConversationStats(conversation.id);
console.log('Total messages:', stats.totalMessages);
console.log('Total tokens:', stats.totalTokens);
```

### Multi-Modal Attachments

```typescript
import { ChatService } from '@atlas/chat';

const chatService = new ChatService({
  enableVision: true,
  enableAttachments: true,
});

// Send a message with image attachment
const response = await chatService.sendMessage({
  message: 'What do you see in this image?',
  attachments: [
    {
      id: 'img-1',
      type: 'image',
      name: 'screenshot.png',
      mimeType: 'image/png',
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      size: 67
    }
  ]
});

// The image will be automatically analyzed and the result included in the context
```

## Configuration

### Chat Service Configuration

```typescript
const config = {
  // Provider settings
  defaultProvider: 'openai',
  defaultModel: 'gpt-3.5-turbo',

  // Context and memory
  maxContextTokens: 4096,
  maxResponseTokens: 2048,
  temperature: 0.7,

  // Feature flags
  enableStreaming: true,
  enableRAG: true,
  enableVision: true,
  enableAttachments: true,
  enableBranching: true,
  enablePersistence: true,

  // Limits
  maxConversations: 100,
  maxMessagesPerConversation: 1000,
  maxAttachmentsPerMessage: 10,
  maxAttachmentSize: 50 * 1024 * 1024, // 50MB

  // RAG configuration
  rag: {
    enabled: true,
    chunkSize: 1000,
    chunkOverlap: 200,
    maxDocuments: 1000,
    similarityThreshold: 0.7,
    embeddingModel: 'text-embedding-ada-002'
  },

  // Persistence
  persistence: {
    type: 'memory', // 'memory', 'file', 'database'
    path: './chat-data.json',
    autoSaveInterval: 30000 // 30 seconds
  }
};
```

### RAG Service Configuration

```typescript
const ragConfig = {
  enabled: true,
  chunkSize: 1000,
  chunkOverlap: 200,
  maxDocuments: 1000,
  similarityThreshold: 0.7,
  embeddingModel: 'text-embedding-ada-002',
  embeddingsProvider: 'openai',
  vectorDB: {
    type: 'memory', // 'memory', 'file', 'database'
    path: './rag-data.json',
    indexName: 'atlas-rag'
  },
  processing: {
    batchSize: 10,
    maxRetries: 3,
    timeout: 30000,
    enableParallel: true
  }
};
```

### Conversation Manager Configuration

```typescript
const conversationConfig = {
  maxConversations: 100,
  maxMessagesPerConversation: 1000,
  autoSave: true,
  enableBranching: true,
  persistence: {
    type: 'memory',
    path: './conversations.json',
    autoSaveInterval: 30000
  }
};
```

## API Reference

### Core Types

#### ChatMessage
```typescript
interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  attachments?: Attachment[];
  provider?: string;
  model?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
}
```

#### Conversation
```typescript
interface Conversation {
  id: string;
  title?: string;
  description?: string;
  messages: ChatMessage[];
  attachments: Attachment[];
  metadata?: Record<string, unknown>;
  tags: string[];
  provider: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean;
  isPinned: boolean;
  contextWindowSize: number;
  maxTokens: number;
  temperature: number;
  systemPrompt?: string;
}
```

#### Document
```typescript
interface Document {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
  tags: string[];
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
  source?: string;
  mimeType?: string;
  size?: number;
}
```

### Key Methods

#### ChatService
- `sendMessage(request: ChatRequest): Promise<ChatResponse>` - Send a message and get a response
- `streamMessage(request: ChatRequest, options: StreamOptions): Promise<void>` - Stream a response
- `createConversation(options?: Partial<Conversation>): Promise<Conversation>` - Create a new conversation
- `getConversation(conversationId: string): Promise<Conversation | null>` - Get a conversation
- `listConversations(limit?: number, offset?: number): Promise<Conversation[]>` - List conversations
- `deleteConversation(conversationId: string): Promise<boolean>` - Delete a conversation

#### ConversationManager
- `createConversation(options?: Partial<Conversation>): Promise<Conversation>` - Create a conversation
- `addMessage(conversationId: string, message: ChatMessage): Promise<void>` - Add a message
- `createBranch(conversationId: string, branchName: string, branchPoint: number): Promise<ConversationBranch>` - Create a branch
- `exportConversation(conversationId: string, format?: string): Promise<string>` - Export conversation
- `searchConversations(query: string, options?: SearchOptions): Promise<SearchResult[]>` - Search conversations

#### RAGService
- `addDocument(document: string | Buffer, metadata?: any): Promise<string>` - Add a document
- `search(query: SearchQuery): Promise<SearchResult>` - Search documents
- `deleteDocument(documentId: string): Promise<boolean>` - Delete a document
- `listDocuments(limit?: number, offset?: number): Promise<Document[]>` - List documents
- `getStats(): Promise<RAGStats>` - Get RAG statistics

## Events

The chat service emits various events that you can listen to:

```typescript
chatService.on('message_received', (event) => {
  console.log('Message received:', event.message);
});

chatService.on('conversation_created', (event) => {
  console.log('New conversation:', event.conversation);
});

chatService.on('rag_search_completed', (event) => {
  console.log('RAG search completed:', event.result);
});

chatService.on('error', (error) => {
  console.error('Chat error:', error);
});
```

## Error Handling

The service provides comprehensive error handling:

```typescript
try {
  const response = await chatService.sendMessage({
    message: 'Hello',
  });
} catch (error) {
  if (error.code === 'TIMEOUT') {
    console.log('Request timed out, retrying...');
  } else if (error.code === 'RATE_LIMITED') {
    console.log('Rate limited, waiting before retry...');
  } else {
    console.error('Chat error:', error);
  }
}
```

## Integration with Other Atlas Services

The chat service integrates seamlessly with other Atlas services:

```typescript
import { ChatService } from '@atlas/chat';
import { VisionService } from '@atlas/vision';
import { ImageGenerationService } from '@atlas/image-generation';
import { ProviderManager } from '@atlas/provider-adapters';

const chatService = new ChatService({
  visionService: new VisionService(),
  imageGenerationService: new ImageGenerationService(),
  providerManager: new ProviderManager(),
});

// Now you can use all integrated features
const response = await chatService.sendMessage({
  message: 'Analyze this image and generate a similar one',
  attachments: [/* image attachment */],
});
```

## Performance Considerations

- **Memory Usage**: Configure appropriate limits for conversations and documents
- **Caching**: Enable caching to improve response times
- **Batch Processing**: Use batch operations for adding multiple documents
- **Streaming**: Use streaming for better user experience with long responses
- **Persistence**: Choose the right persistence strategy for your use case

## Security

- **API Keys**: Store API keys securely, not in configuration files
- **Input Validation**: All inputs are validated and sanitized
- **File Uploads**: File size and type restrictions are enforced
- **Data Privacy**: Sensitive data handling according to your requirements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/atlas-ai/atlas-chat/issues
- Documentation: https://docs.atlas-ai.com/chat
- Community: https://community.atlas-ai.com