import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Document,
  SearchQuery,
  SearchResult,
  ChatEvent,
  ChatError,
} from './types/ChatTypes';

export interface RAGServiceConfig {
  enabled: boolean;
  chunkSize: number;
  chunkOverlap: number;
  maxDocuments: number;
  similarityThreshold: number;
  embeddingModel: string;
  embeddingsProvider: string;
  vectorDB: {
    type: 'memory' | 'file' | 'database';
    path?: string;
    connection?: string;
    indexName?: string;
  };
  processing: {
    batchSize: number;
    maxRetries: number;
    timeout: number;
    enableParallel: boolean;
  };
}

export interface RAGServiceDependencies {
  logger?: any;
  storage?: any;
  embeddings?: any; // Embeddings service
  vectorDB?: any; // Vector database service
}

export class RAGService extends EventEmitter {
  private config: Required<RAGServiceConfig>;
  private dependencies: RAGServiceDependencies;
  private documents = new Map<string, Document>();
  private embeddings = new Map<string, number[]>();
  private isInitialized = false;
  private processingQueue: any[] = [];
  private isProcessing = false;

  constructor(
    dependencies: RAGServiceDependencies = {},
    config: Partial<RAGServiceConfig> = {}
  ) {
    super();
    this.dependencies = dependencies;

    this.config = {
      enabled: true,
      chunkSize: 1000,
      chunkOverlap: 200,
      maxDocuments: 1000,
      similarityThreshold: 0.7,
      embeddingModel: 'text-embedding-ada-002',
      embeddingsProvider: 'openai',
      vectorDB: {
        type: 'memory',
        indexName: 'atlas-rag',
      },
      processing: {
        batchSize: 10,
        maxRetries: 3,
        timeout: 30000,
        enableParallel: true,
      },
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.emit('progress', { stage: 'initialization', status: 'starting' });

      // Load documents from persistent storage
      await this.loadDocuments();

      // Initialize vector database
      await this.initializeVectorDB();

      // Initialize embeddings service
      await this.initializeEmbeddings();

      this.isInitialized = true;
      this.emit('progress', { stage: 'initialization', status: 'completed' });
    } catch (error) {
      this.emit('error', { stage: 'initialization', error: error.message });
      throw new Error(`Failed to initialize RAGService: ${error.message}`);
    }
  }

  async addDocument(
    documentInput: string | Buffer | any,
    metadata?: any
  ): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Parse input and create document
      const document = await this.parseDocument(documentInput, metadata);

      // Check document limit
      if (this.documents.size >= this.config.maxDocuments) {
        // Remove oldest document if at limit
        const oldestDoc = Array.from(this.documents.values())
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        if (oldestDoc) {
          this.documents.delete(oldestDoc.id);
          this.embeddings.delete(oldestDoc.id);
        }
      }

      // Add document to storage
      this.documents.set(document.id, document);

      // Process document (chunking, embedding)
      await this.processDocument(document);

      // Save to persistent storage
      await this.saveDocument(document);

      // Emit event
      this.emit('document_added', {
        documentId: document.id,
        document,
      });

      return document.id;

    } catch (error) {
      const chatError: ChatError = {
        code: 'ADD_DOCUMENT_FAILED',
        message: error.message,
        operation: 'addDocument',
        timestamp: new Date(),
        retryable: this.isRetryableError(error),
      };

      this.emit('error', chatError);
      throw chatError;
    }
  }

  async addDocuments(
    documentInputs: Array<string | Buffer | any>,
    metadata?: any[]
  ): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const documentIds: string[] = [];
    const batchSize = this.config.processing.batchSize;

    // Process documents in batches
    for (let i = 0; i < documentInputs.length; i += batchSize) {
      const batch = documentInputs.slice(i, i + batchSize);
      const batchMetadata = metadata?.slice(i, i + batchSize) || [];

      if (this.config.processing.enableParallel) {
        // Process batch in parallel
        const batchPromises = batch.map((doc, index) =>
          this.addDocument(doc, batchMetadata[index] || metadata?.[0])
        );
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            documentIds.push(result.value);
          } else {
            if (this.dependencies.logger) {
              this.dependencies.logger.error('Failed to add document:', result.reason);
            }
          }
        }
      } else {
        // Process batch sequentially
        for (let j = 0; j < batch.length; j++) {
          try {
            const docId = await this.addDocument(
              batch[j],
              batchMetadata[j] || metadata?.[0]
            );
            documentIds.push(docId);
          } catch (error) {
            if (this.dependencies.logger) {
              this.dependencies.logger.error('Failed to add document:', error);
            }
          }
        }
      }
    }

    return documentIds;
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      this.emit('rag_search_started', { query: query.query });

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query.query);

      // Find similar documents
      const similarDocuments = await this.findSimilarDocuments(
        queryEmbedding,
        query.limit,
        query.threshold
      );

      // Apply additional filters if provided
      const filteredDocuments = this.applyFilters(
        similarDocuments,
        query.filters
      );

      // Sort by relevance score
      filteredDocuments.sort((a, b) => b.score - a.score);

      const result: SearchResult = {
        documents: filteredDocuments.map(d => d.document),
        scores: filteredDocuments.map(d => d.score),
        query: query.query,
        processingTime: Date.now() - startTime,
        metadata: {
          totalDocuments: this.documents.size,
          matchedDocuments: filteredDocuments.length,
          conversationId: query.conversationId,
          filters: query.filters,
        },
      };

      this.emit('rag_search_completed', {
        query: query.query,
        result,
      });

      return result;

    } catch (error) {
      const chatError: ChatError = {
        code: 'SEARCH_FAILED',
        message: error.message,
        operation: 'search',
        timestamp: new Date(),
        retryable: this.isRetryableError(error),
      };

      this.emit('error', chatError);
      throw chatError;
    }
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const document = this.documents.get(documentId);
    if (!document) {
      return false;
    }

    // Remove from memory
    this.documents.delete(documentId);
    this.embeddings.delete(documentId);

    // Remove from persistent storage
    await this.deleteDocumentFromStorage(documentId);

    // Emit event
    this.emit('document_deleted', {
      documentId,
      document,
    });

    return true;
  }

  async getDocument(documentId: string): Promise<Document | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.documents.get(documentId) || null;
  }

  async listDocuments(
    limit?: number,
    offset?: number,
    filters?: any
  ): Promise<Document[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let documents = Array.from(this.documents.values());

    // Apply filters
    if (filters) {
      documents = documents.filter(doc => this.matchesFilters(doc, filters));
    }

    // Sort by creation date (newest first)
    documents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    if (offset !== undefined) {
      documents = documents.slice(offset);
    }
    if (limit !== undefined) {
      documents = documents.slice(0, limit);
    }

    return documents;
  }

  async updateDocument(
    documentId: string,
    updates: Partial<Document>
  ): Promise<Document> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const updatedDocument: Document = {
      ...document,
      ...updates,
      id: documentId, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    this.documents.set(documentId, updatedDocument);

    // Re-process document if content changed
    if (updates.content && updates.content !== document.content) {
      await this.processDocument(updatedDocument);
    }

    // Save to persistent storage
    await this.saveDocument(updatedDocument);

    // Emit event
    this.emit('document_updated', {
      documentId,
      document: updatedDocument,
    });

    return updatedDocument;
  }

  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    averageChunkSize: number;
    documentTypes: Record<string, number>;
    lastUpdated: Date | null;
  }> {
    const documents = Array.from(this.documents.values());
    const totalChunks = documents.reduce((sum, doc) => {
      return sum + this.estimateChunks(doc.content).length;
    }, 0);

    const totalSize = documents.reduce((sum, doc) => sum + doc.content.length, 0);
    const averageChunkSize = totalChunks > 0 ? totalSize / totalChunks : 0;

    const documentTypes: Record<string, number> = {};
    documents.forEach(doc => {
      const type = doc.mimeType || 'unknown';
      documentTypes[type] = (documentTypes[type] || 0) + 1;
    });

    const lastUpdated = documents.length > 0
      ? documents.reduce((latest, doc) =>
          doc.updatedAt.getTime() > latest.getTime() ? doc.updatedAt : latest,
          documents[0].updatedAt)
      : null;

    return {
      totalDocuments: documents.length,
      totalChunks,
      averageChunkSize,
      documentTypes,
      lastUpdated,
    };
  }

  async clearAll(): Promise<void> {
    // Clear memory
    this.documents.clear();
    this.embeddings.clear();

    // Clear persistent storage
    await this.clearStorage();

    // Emit event
    this.emit('all_documents_cleared');
  }

  private async parseDocument(
    input: string | Buffer | any,
    metadata?: any
  ): Promise<Document> {
    let content: string;
    let mimeType: string;
    let title: string;
    let size: number;

    if (typeof input === 'string') {
      content = input;
      mimeType = 'text/plain';
      title = metadata?.title || 'Text Document';
      size = content.length;
    } else if (Buffer.isBuffer(input)) {
      // Try to detect file type from buffer
      content = input.toString('utf-8');
      mimeType = metadata?.mimeType || this.detectMimeType(input);
      title = metadata?.title || 'Binary Document';
      size = input.length;
    } else if (typeof input === 'object') {
      // Assume it's already a document-like object
      content = input.content || '';
      mimeType = input.mimeType || 'text/plain';
      title = input.title || metadata?.title || 'Imported Document';
      size = content.length;
    } else {
      throw new Error('Unsupported document input type');
    }

    // Extract additional metadata
    const extractedMetadata = await this.extractMetadata(content, mimeType);

    return {
      id: metadata?.id || uuidv4(),
      title,
      content,
      metadata: {
        ...metadata,
        ...extractedMetadata,
      },
      tags: metadata?.tags || this.extractTags(content),
      createdAt: metadata?.createdAt || new Date(),
      updatedAt: metadata?.updatedAt || new Date(),
      source: metadata?.source,
      mimeType,
      size,
    };
  }

  private detectMimeType(buffer: Buffer): string {
    // Simple magic number detection
    const signature = buffer.subarray(0, 12).toString('hex');

    switch (signature) {
      case '25504446': // PDF
        return 'application/pdf';
      case '504b0304': // ZIP-based formats
        return 'application/zip';
      case '7b227469': // JSON
        return 'application/json';
      default:
        return 'application/octet-stream';
    }
  }

  private async extractMetadata(content: string, mimeType: string): Promise<any> {
    const metadata: any = {};

    // Extract basic statistics
    metadata.wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    metadata.characterCount = content.length;
    metadata.lineCount = content.split('\n').length;

    // Extract language if text
    if (mimeType.startsWith('text/')) {
      metadata.language = this.detectLanguage(content);
    }

    // Extract key entities
    metadata.entities = this.extractEntities(content);

    // Extract structure information
    metadata.structure = this.analyzeStructure(content);

    return metadata;
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on character patterns
    const samples = [
      { lang: 'en', pattern: /[the|and|or|to|of|in|is|that|it|for]/gi },
      { lang: 'es', pattern: /[el|la|de|que|y|a|en|un|es|se]/gi },
      { lang: 'fr', pattern: /[le|de|et|à|un|il|être|et|en|avoir]/gi },
      { lang: 'de', pattern: /[der|die|und|in|den|von|zu|das|mit|sich]/gi },
    ];

    let maxScore = 0;
    let detectedLang = 'en';

    for (const sample of samples) {
      const matches = text.match(sample.pattern);
      const score = matches ? matches.length : 0;
      if (score > maxScore) {
        maxScore = score;
        detectedLang = sample.lang;
      }
    }

    return detectedLang;
  }

  private extractEntities(text: string): any {
    const entities: any = {};

    // Extract emails
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    entities.emails = text.match(emailRegex) || [];

    // Extract URLs
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    entities.urls = text.match(urlRegex) || [];

    // Extract phone numbers (simplified)
    const phoneRegex = /\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;
    entities.phones = text.match(phoneRegex) || [];

    // Extract dates (simplified)
    const dateRegex = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g;
    entities.dates = text.match(dateRegex) || [];

    return entities;
  }

  private analyzeStructure(text: string): any {
    const structure: any = {};

    // Count headings (lines starting with # or all caps)
    const lines = text.split('\n');
    structure.headings = lines.filter(line =>
      line.trim().startsWith('#') ||
      line.trim() === line.trim().toUpperCase()
    ).length;

    // Count lists (lines starting with - or *)
    structure.lists = lines.filter(line =>
      line.trim().startsWith('-') || line.trim().startsWith('*')
    ).length;

    // Count code blocks (lines between ``` or indented)
    structure.codeBlocks = (text.match(/```[\s\S]*?```/g) || []).length;

    // Count paragraphs (double line breaks)
    structure.paragraphs = text.split(/\n\s*\n/).filter(p => p.trim()).length;

    return structure;
  }

  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // Extract hashtags
    const hashtags = content.match(/#[\w]+/g);
    if (hashtags) {
      tags.push(...hashtags.map(tag => tag.substring(1)));
    }

    // Extract @mentions
    const mentions = content.match(/@[\w]+/g);
    if (mentions) {
      tags.push(...mentions.map(mention => mention.substring(1)));
    }

    // Extract common keywords (simplified)
    const commonWords = ['important', 'todo', 'fix', 'bug', 'feature', 'update'];
    for (const word of commonWords) {
      if (content.toLowerCase().includes(word)) {
        tags.push(word);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  private async processDocument(document: Document): Promise<void> {
    try {
      // Chunk the document
      const chunks = this.chunkDocument(document.content);

      // Generate embeddings for each chunk
      const chunkEmbeddings = await this.generateBatchEmbeddings(
        chunks.map(chunk => chunk.content)
      );

      // Store embeddings
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${document.id}_chunk_${i}`;
        this.embeddings.set(chunkId, chunkEmbeddings[i]);
      }

      // Add chunk information to document metadata
      document.metadata.chunks = chunks.length;
      document.metadata.chunkSize = this.config.chunkSize;
      document.metadata.chunkOverlap = this.config.chunkOverlap;

    } catch (error) {
      if (this.dependencies.logger) {
        this.dependencies.logger.error('Failed to process document:', error);
      }
      throw error;
    }
  }

  private chunkDocument(content: string): Array<{ content: string; start: number; end: number }> {
    const chunks: Array<{ content: string; start: number; end: number }> = [];
    const chunkSize = this.config.chunkSize;
    const overlap = this.config.chunkOverlap;

    if (content.length <= chunkSize) {
      return [{ content, start: 0, end: content.length }];
    }

    let start = 0;
    while (start < content.length) {
      let end = start + chunkSize;

      // Try to end at a sentence boundary
      if (end < content.length) {
        const sentenceEnd = Math.max(
          content.lastIndexOf('.', end),
          content.lastIndexOf('!', end),
          content.lastIndexOf('?', end)
        );

        if (sentenceEnd > start + chunkSize / 2) {
          end = sentenceEnd + 1;
        }
      }

      // Ensure we don't exceed content length
      end = Math.min(end, content.length);

      chunks.push({
        content: content.substring(start, end),
        start,
        end,
      });

      start = end - overlap;
      if (start >= content.length) break;
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.dependencies.embeddings) {
      // Fallback to simple TF-IDF-like embedding
      return this.generateSimpleEmbedding(text);
    }

    try {
      const embedding = await this.dependencies.embeddings.embed(text, {
        model: this.config.embeddingModel,
        provider: this.config.embeddingsProvider,
      });

      return embedding;
    } catch (error) {
      if (this.dependencies.logger) {
        this.dependencies.logger.error('Failed to generate embedding, using fallback:', error);
      }
      return this.generateSimpleEmbedding(text);
    }
  }

  private async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.dependencies.embeddings) {
      // Fallback to simple embeddings
      return texts.map(text => this.generateSimpleEmbedding(text));
    }

    try {
      const embeddings = await this.dependencies.embeddings.embedBatch(texts, {
        model: this.config.embeddingModel,
        provider: this.config.embeddingsProvider,
      });

      return embeddings;
    } catch (error) {
      if (this.dependencies.logger) {
        this.dependencies.logger.error('Failed to generate batch embeddings, using fallback:', error);
      }
      return texts.map(text => this.generateSimpleEmbedding(text));
    }
  }

  private generateSimpleEmbedding(text: string): number[] {
    // Simple word frequency-based embedding (fallback)
    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 2);
    const wordFreq: Record<string, number> = {};

    // Calculate word frequencies
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Create a simple 256-dimensional vector
    const embedding = new Array(256).fill(0);
    let index = 0;

    for (const [word, freq] of Object.entries(wordFreq)) {
      const hash = this.simpleHash(word);
      embedding[hash % 256] += freq;
      index++;
      if (index >= 256) break;
    }

    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }

    return embedding;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async findSimilarDocuments(
    queryEmbedding: number[],
    limit: number,
    threshold: number
  ): Promise<Array<{ document: Document; score: number }>> {
    const similarDocuments: Array<{ document: Document; score: number }> = [];

    for (const [docId, document] of this.documents) {
      // Get document embedding (average of chunk embeddings)
      const docEmbedding = await this.getDocumentEmbedding(docId);
      if (!docEmbedding) continue;

      // Calculate similarity
      const similarity = this.calculateSimilarity(queryEmbedding, docEmbedding);

      if (similarity >= threshold) {
        similarDocuments.push({ document, score: similarity });
      }
    }

    // Sort by similarity score
    similarDocuments.sort((a, b) => b.score - a.score);

    // Return top results
    return similarDocuments.slice(0, limit);
  }

  private async getDocumentEmbedding(documentId: string): Promise<number[] | null> {
    const chunkEmbeddings: number[][] = [];

    // Collect all chunk embeddings for this document
    for (const [chunkId, embedding] of this.embeddings) {
      if (chunkId.startsWith(documentId + '_chunk_')) {
        chunkEmbeddings.push(embedding);
      }
    }

    if (chunkEmbeddings.length === 0) {
      return null;
    }

    // Average the chunk embeddings
    const avgEmbedding = new Array(chunkEmbeddings[0].length).fill(0);
    for (const embedding of chunkEmbeddings) {
      for (let i = 0; i < embedding.length; i++) {
        avgEmbedding[i] += embedding[i];
      }
    }

    return avgEmbedding.map(val => val / chunkEmbeddings.length);
  }

  private calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    // Calculate cosine similarity
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  private applyFilters(
    documents: Array<{ document: Document; score: number }>,
    filters: any
  ): Array<{ document: Document; score: number }> {
    if (!filters) {
      return documents;
    }

    return documents.filter(({ document }) => this.matchesFilters(document, filters));
  }

  private matchesFilters(document: Document, filters: any): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (key === 'tags' && Array.isArray(value)) {
        const hasAllTags = value.every((tag: string) => document.tags.includes(tag));
        if (!hasAllTags) return false;
      } else if (key === 'mimeType' && typeof value === 'string') {
        if (!document.mimeType?.includes(value)) return false;
      } else if (key === 'source' && typeof value === 'string') {
        if (document.source !== value) return false;
      } else if (key === 'dateRange' && Array.isArray(value)) {
        const [start, end] = value;
        const docDate = document.createdAt.getTime();
        if (docDate < start || docDate > end) return false;
      } else if (typeof value === 'string') {
        if (!document.content.toLowerCase().includes(value.toLowerCase())) return false;
      }
    }

    return true;
  }

  private estimateChunks(content: string): string[] {
    return this.chunkDocument(content).map(chunk => chunk.content);
  }

  private async loadDocuments(): Promise<void> {
    // Implementation depends on vector DB type
    switch (this.config.vectorDB.type) {
      case 'memory':
        // No loading needed for memory storage
        break;

      case 'file':
        await this.loadDocumentsFromFile();
        break;

      case 'database':
        await this.loadDocumentsFromDatabase();
        break;
    }
  }

  private async initializeVectorDB(): Promise<void> {
    // Initialize vector database connection/index
    if (this.dependencies.vectorDB) {
      await this.dependencies.vectorDB.initialize({
        type: this.config.vectorDB.type,
        indexName: this.config.vectorDB.indexName,
        connection: this.config.vectorDB.connection,
      });
    }
  }

  private async initializeEmbeddings(): Promise<void> {
    // Initialize embeddings service if available
    if (this.dependencies.embeddings) {
      await this.dependencies.embeddings.initialize({
        provider: this.config.embeddingsProvider,
        model: this.config.embeddingModel,
      });
    }
  }

  private async loadDocumentsFromFile(): Promise<void> {
    if (!this.dependencies.storage || !this.config.vectorDB.path) {
      return;
    }

    try {
      const data = await this.dependencies.storage.readFile(this.config.vectorDB.path);
      const parsed = JSON.parse(data);

      if (parsed.documents) {
        for (const doc of parsed.documents) {
          const document: Document = {
            ...doc,
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
          };
          this.documents.set(document.id, document);
        }
      }

      if (parsed.embeddings) {
        for (const [key, embedding] of Object.entries(parsed.embeddings)) {
          this.embeddings.set(key, embedding as number[]);
        }
      }
    } catch (error) {
      if (this.dependencies.logger) {
        this.dependencies.logger.warn('Failed to load documents from file:', error);
      }
    }
  }

  private async loadDocumentsFromDatabase(): Promise<void> {
    // Database implementation would go here
  }

  private async saveDocument(document: Document): Promise<void> {
    switch (this.config.vectorDB.type) {
      case 'memory':
        // No saving needed for memory storage
        break;

      case 'file':
        await this.saveDocumentsToFile();
        break;

      case 'database':
        await this.saveDocumentToDatabase(document);
        break;
    }
  }

  private async saveDocumentsToFile(): Promise<void> {
    if (!this.dependencies.storage || !this.config.vectorDB.path) {
      return;
    }

    try {
      const data = {
        documents: Array.from(this.documents.values()),
        embeddings: Object.fromEntries(this.embeddings),
        savedAt: new Date().toISOString(),
      };

      await this.dependencies.storage.writeFile(
        this.config.vectorDB.path,
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      if (this.dependencies.logger) {
        this.dependencies.logger.error('Failed to save documents to file:', error);
      }
    }
  }

  private async saveDocumentToDatabase(document: Document): Promise<void> {
    // Database implementation would go here
  }

  private async deleteDocumentFromStorage(documentId: string): Promise<void> {
    switch (this.config.vectorDB.type) {
      case 'memory':
        // No deletion needed for memory storage
        break;

      case 'file':
        await this.saveDocumentsToFile();
        break;

      case 'database':
        await this.deleteDocumentFromDatabase(documentId);
        break;
    }
  }

  private async deleteDocumentFromDatabase(documentId: string): Promise<void> {
    // Database implementation would go here
  }

  private async clearStorage(): Promise<void> {
    switch (this.config.vectorDB.type) {
      case 'memory':
        // No clearing needed for memory storage
        break;

      case 'file':
        if (this.dependencies.storage && this.config.vectorDB.path) {
          await this.dependencies.storage.writeFile(
            this.config.vectorDB.path,
            JSON.stringify({ documents: [], embeddings: {}, savedAt: new Date().toISOString() })
          );
        }
        break;

      case 'database':
        await this.clearDatabase();
        break;
    }
  }

  private async clearDatabase(): Promise<void> {
    // Database implementation would go here
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

  async cleanup(): Promise<void> {
    // Save all data before cleanup
    if (this.config.vectorDB.type === 'file') {
      await this.saveDocumentsToFile();
    }

    // Clear memory
    this.documents.clear();
    this.embeddings.clear();
    this.processingQueue = [];

    this.isInitialized = false;
  }
}