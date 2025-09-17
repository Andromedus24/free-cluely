import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Conversation,
  ConversationBranch,
  ChatMessage,
  ChatEvent,
  ChatError,
  ConversationStats,
} from './types/ChatTypes';

export interface ConversationManagerConfig {
  maxConversations: number;
  maxMessagesPerConversation: number;
  autoSave: boolean;
  enableBranching: boolean;
  persistence: {
    type: 'memory' | 'file' | 'database';
    path?: string;
    connection?: string;
    autoSaveInterval: number;
  };
}

export interface ConversationManagerDependencies {
  storage?: any;
  logger?: any;
}

export class ConversationManager extends EventEmitter {
  private config: Required<ConversationManagerConfig>;
  private dependencies: ConversationManagerDependencies;
  private conversations = new Map<string, Conversation>();
  private branches = new Map<string, ConversationBranch>();
  private autoSaveTimer?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(
    dependencies: ConversationManagerDependencies = {},
    config: Partial<ConversationManagerConfig> = {}
  ) {
    super();
    this.dependencies = dependencies;

    this.config = {
      maxConversations: 100,
      maxMessagesPerConversation: 1000,
      autoSave: true,
      enableBranching: true,
      persistence: {
        type: 'memory',
        autoSaveInterval: 30000,
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

      // Load conversations from persistent storage
      await this.loadConversations();

      // Setup auto-save
      if (this.config.autoSave && this.config.persistence.autoSaveInterval > 0) {
        this.setupAutoSave();
      }

      this.isInitialized = true;
      this.emit('progress', { stage: 'initialization', status: 'completed' });
    } catch (error) {
      this.emit('error', { stage: 'initialization', error: error.message });
      throw new Error(`Failed to initialize ConversationManager: ${error.message}`);
    }
  }

  async createConversation(options?: Partial<Conversation>): Promise<Conversation> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check conversation limit
    if (this.conversations.size >= this.config.maxConversations) {
      throw new Error(`Maximum number of conversations (${this.config.maxConversations}) reached`);
    }

    const conversation: Conversation = {
      id: options?.id || uuidv4(),
      title: options?.title || 'New Conversation',
      description: options?.description,
      messages: options?.messages || [],
      attachments: options?.attachments || [],
      metadata: options?.metadata || {},
      tags: options?.tags || [],
      provider: options?.provider || 'openai',
      model: options?.model || 'gpt-3.5-turbo',
      createdAt: options?.createdAt || new Date(),
      updatedAt: options?.updatedAt || new Date(),
      isArchived: options?.isArchived || false,
      isPinned: options?.isPinned || false,
      contextWindowSize: options?.contextWindowSize || 4096,
      maxTokens: options?.maxTokens || 2048,
      temperature: options?.temperature || 0.7,
      systemPrompt: options?.systemPrompt,
      settings: options?.settings || {},
    };

    this.conversations.set(conversation.id, conversation);

    // Save to persistent storage
    await this.saveConversation(conversation);

    // Emit event
    this.emit('conversation_created', {
      conversationId: conversation.id,
      conversation,
    });

    return conversation;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check cache first
    const cached = this.conversations.get(conversationId);
    if (cached) {
      return cached;
    }

    // Load from persistent storage
    const loaded = await this.loadConversation(conversationId);
    if (loaded) {
      this.conversations.set(conversationId, loaded);
      return loaded;
    }

    return null;
  }

  async updateConversation(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<Conversation> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const updatedConversation: Conversation = {
      ...conversation,
      ...updates,
      id: conversationId, // Ensure ID doesn't change
      updatedAt: new Date(),
    };

    // Validate message limit
    if (updatedConversation.messages.length > this.config.maxMessagesPerConversation) {
      // Remove oldest messages if over limit
      const overflow = updatedConversation.messages.length - this.config.maxMessagesPerConversation;
      updatedConversation.messages = updatedConversation.messages.slice(overflow);
    }

    this.conversations.set(conversationId, updatedConversation);

    // Save to persistent storage
    await this.saveConversation(updatedConversation);

    // Emit event
    this.emit('conversation_updated', {
      conversationId,
      conversation: updatedConversation,
    });

    return updatedConversation;
  }

  async deleteConversation(conversationId: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return false;
    }

    // Remove from memory
    this.conversations.delete(conversationId);

    // Remove associated branches
    for (const [branchId, branch] of this.branches) {
      if (branch.conversationId === conversationId) {
        this.branches.delete(branchId);
      }
    }

    // Remove from persistent storage
    await this.deleteConversationFromStorage(conversationId);

    // Emit event
    this.emit('conversation_deleted', {
      conversationId,
      conversation,
    });

    return true;
  }

  async listConversations(
    limit?: number,
    offset?: number,
    filters?: {
      isArchived?: boolean;
      isPinned?: boolean;
      tags?: string[];
      provider?: string;
      model?: string;
    }
  ): Promise<Conversation[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    let conversations = Array.from(this.conversations.values());

    // Apply filters
    if (filters) {
      conversations = conversations.filter(conv => {
        if (filters.isArchived !== undefined && conv.isArchived !== filters.isArchived) {
          return false;
        }
        if (filters.isPinned !== undefined && conv.isPinned !== filters.isPinned) {
          return false;
        }
        if (filters.tags && filters.tags.length > 0) {
          const hasAllTags = filters.tags.every(tag => conv.tags.includes(tag));
          if (!hasAllTags) return false;
        }
        if (filters.provider && conv.provider !== filters.provider) {
          return false;
        }
        if (filters.model && conv.model !== filters.model) {
          return false;
        }
        return true;
      });
    }

    // Sort by updatedAt (newest first)
    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply pagination
    if (offset !== undefined) {
      conversations = conversations.slice(offset);
    }
    if (limit !== undefined) {
      conversations = conversations.slice(0, limit);
    }

    return conversations;
  }

  async addMessage(
    conversationId: string,
    message: ChatMessage
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // Add message to conversation
    conversation.messages.push(message);
    conversation.updatedAt = new Date();

    // Update in memory and persistent storage
    await this.updateConversation(conversationId, {
      messages: conversation.messages,
      updatedAt: conversation.updatedAt,
    });

    // Emit event
    this.emit('message_added', {
      conversationId,
      message,
    });
  }

  async createBranch(
    conversationId: string,
    branchName: string,
    branchPoint: number,
    description?: string
  ): Promise<ConversationBranch> {
    if (!this.config.enableBranching) {
      throw new Error('Branching is not enabled');
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    if (branchPoint < 0 || branchPoint >= conversation.messages.length) {
      throw new Error('Invalid branch point');
    }

    const branch: ConversationBranch = {
      id: uuidv4(),
      conversationId,
      name: branchName,
      description,
      branchPoint,
      createdAt: new Date(),
      updatedAt: new Date(),
      isMain: false,
      metadata: {},
    };

    this.branches.set(branch.id, branch);

    // Save to persistent storage
    await this.saveBranch(branch);

    // Emit event
    this.emit('branch_created', {
      branchId: branch.id,
      conversationId,
      branch,
    });

    return branch;
  }

  async getBranches(conversationId: string): Promise<ConversationBranch[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const branches: ConversationBranch[] = [];
    for (const branch of this.branches.values()) {
      if (branch.conversationId === conversationId) {
        branches.push(branch);
      }
    }

    return branches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async mergeBranch(
    conversationId: string,
    branchId: string,
    strategy: 'replace' | 'append' | 'interactive' = 'append'
  ): Promise<Conversation> {
    if (!this.config.enableBranching) {
      throw new Error('Branching is not enabled');
    }

    const branch = this.branches.get(branchId);
    if (!branch || branch.conversationId !== conversationId) {
      throw new Error('Branch not found');
    }

    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const branchMessages = conversation.messages.slice(branch.branchPoint);

    switch (strategy) {
      case 'replace':
        conversation.messages = conversation.messages.slice(0, branch.branchPoint);
        break;
      case 'append':
        // Keep current messages, branch remains as alternative
        break;
      case 'interactive':
        // Would require user interaction to resolve conflicts
        throw new Error('Interactive merge not implemented');
    }

    await this.updateConversation(conversationId, {
      messages: conversation.messages,
    });

    // Delete the branch after merging
    this.branches.delete(branchId);
    await this.deleteBranchFromStorage(branchId);

    // Emit event
    this.emit('branch_merged', {
      branchId,
      conversationId,
      strategy,
    });

    return conversation;
  }

  async getConversationStats(conversationId: string): Promise<ConversationStats> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const totalTokens = conversation.messages.reduce((total, msg) => {
      return total + (msg.usage?.totalTokens || 0);
    }, 0);

    const totalCost = conversation.messages.reduce((total, msg) => {
      return total + (msg.usage?.cost || 0);
    }, 0);

    const providerUsage: Record<string, number> = {};
    const modelUsage: Record<string, number> = {};

    conversation.messages.forEach(msg => {
      if (msg.provider) {
        providerUsage[msg.provider] = (providerUsage[msg.provider] || 0) + 1;
      }
      if (msg.model) {
        modelUsage[msg.model] = (modelUsage[msg.model] || 0) + 1;
      }
    });

    const branches = await this.getBranches(conversationId);

    return {
      totalMessages: conversation.messages.length,
      totalTokens,
      totalCost,
      averageResponseTime: this.calculateAverageResponseTime(conversation.messages),
      providerUsage,
      modelUsage,
      attachmentCount: conversation.attachments.length,
      branchCount: branches.length,
      createdAt: conversation.createdAt,
      lastActivity: conversation.updatedAt,
    };
  }

  async searchConversations(
    query: string,
    options?: {
      limit?: number;
      searchInMessages?: boolean;
      searchInTitles?: boolean;
      filters?: any;
    }
  ): Promise<Array<{ conversation: Conversation; score: number; matches: string[] }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results: Array<{ conversation: Conversation; score: number; matches: string[] }> = [];
    const searchQuery = query.toLowerCase();

    for (const conversation of this.conversations.values()) {
      let score = 0;
      const matches: string[] = [];

      // Search in title
      if (options?.searchInTitles !== false && conversation.title.toLowerCase().includes(searchQuery)) {
        score += 10;
        matches.push(`Title: ${conversation.title}`);
      }

      // Search in description
      if (conversation.description && conversation.description.toLowerCase().includes(searchQuery)) {
        score += 5;
        matches.push(`Description: ${conversation.description}`);
      }

      // Search in messages
      if (options?.searchInMessages !== false) {
        for (const message of conversation.messages) {
          if (message.content.toLowerCase().includes(searchQuery)) {
            score += 2;
            matches.push(`Message: ${message.content.substring(0, 100)}...`);
          }
        }
      }

      // Search in tags
      for (const tag of conversation.tags) {
        if (tag.toLowerCase().includes(searchQuery)) {
          score += 3;
          matches.push(`Tag: ${tag}`);
        }
      }

      if (score > 0) {
        results.push({ conversation, score, matches });
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    if (options?.limit) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  async archiveConversation(conversationId: string): Promise<void> {
    await this.updateConversation(conversationId, { isArchived: true });

    this.emit('conversation_archived', {
      conversationId,
    });
  }

  async unarchiveConversation(conversationId: string): Promise<void> {
    await this.updateConversation(conversationId, { isArchived: false });

    this.emit('conversation_unarchived', {
      conversationId,
    });
  }

  async pinConversation(conversationId: string): Promise<void> {
    await this.updateConversation(conversationId, { isPinned: true });

    this.emit('conversation_pinned', {
      conversationId,
    });
  }

  async unpinConversation(conversationId: string): Promise<void> {
    await this.updateConversation(conversationId, { isPinned: false });

    this.emit('conversation_unpinned', {
      conversationId,
    });
  }

  async exportConversation(
    conversationId: string,
    format: 'json' | 'markdown' | 'txt' = 'json'
  ): Promise<string> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(conversation, null, 2);

      case 'markdown':
        return this.exportToMarkdown(conversation);

      case 'txt':
        return this.exportToText(conversation);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToMarkdown(conversation: Conversation): string {
    let markdown = `# ${conversation.title}\n\n`;

    if (conversation.description) {
      markdown += `**Description:** ${conversation.description}\n\n`;
    }

    markdown += `**Created:** ${conversation.createdAt.toISOString()}\n`;
    markdown += `**Updated:** ${conversation.updatedAt.toISOString()}\n`;
    markdown += `**Provider:** ${conversation.provider}\n`;
    markdown += `**Model:** ${conversation.model}\n\n`;

    if (conversation.tags.length > 0) {
      markdown += `**Tags:** ${conversation.tags.join(', ')}\n\n`;
    }

    markdown += `---\n\n`;

    for (const message of conversation.messages) {
      markdown += `## ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n`;
      markdown += `**Time:** ${message.timestamp.toISOString()}\n\n`;
      markdown += `${message.content}\n\n`;

      if (message.attachments && message.attachments.length > 0) {
        markdown += `**Attachments:**\n`;
        for (const attachment of message.attachments) {
          markdown += `- ${attachment.name} (${attachment.type})\n`;
        }
        markdown += '\n';
      }

      markdown += `---\n\n`;
    }

    return markdown;
  }

  private exportToText(conversation: Conversation): string {
    let text = `${conversation.title}\n`;
    text += '='.repeat(conversation.title.length) + '\n\n';

    if (conversation.description) {
      text += `Description: ${conversation.description}\n\n`;
    }

    text += `Created: ${conversation.createdAt.toISOString()}\n`;
    text += `Updated: ${conversation.updatedAt.toISOString()}\n`;
    text += `Provider: ${conversation.provider}\n`;
    text += `Model: ${conversation.model}\n\n`;

    if (conversation.tags.length > 0) {
      text += `Tags: ${conversation.tags.join(', ')}\n\n`;
    }

    text += '-'.repeat(50) + '\n\n';

    for (const message of conversation.messages) {
      text += `${message.role.toUpperCase()} (${message.timestamp.toISOString()}):\n`;
      text += `${message.content}\n\n`;

      if (message.attachments && message.attachments.length > 0) {
        text += 'Attachments:\n';
        for (const attachment of message.attachments) {
          text += `- ${attachment.name} (${attachment.type})\n`;
        }
        text += '\n';
      }

      text += '-'.repeat(50) + '\n\n';
    }

    return text;
  }

  private calculateAverageResponseTime(messages: ChatMessage[]): number {
    let totalTime = 0;
    let responseCount = 0;

    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role === 'assistant' && messages[i - 1].role === 'user') {
        const timeDiff = messages[i].timestamp.getTime() - messages[i - 1].timestamp.getTime();
        totalTime += timeDiff;
        responseCount++;
      }
    }

    return responseCount > 0 ? totalTime / responseCount : 0;
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.saveAllConversations();
      } catch (error) {
        if (this.dependencies.logger) {
          this.dependencies.logger.error('Auto-save failed:', error);
        }
      }
    }, this.config.persistence.autoSaveInterval);
  }

  private async loadConversations(): Promise<void> {
    // Implementation depends on persistence type
    switch (this.config.persistence.type) {
      case 'memory':
        // No loading needed for memory persistence
        break;

      case 'file':
        await this.loadConversationsFromFile();
        break;

      case 'database':
        await this.loadConversationsFromDatabase();
        break;
    }
  }

  private async loadConversationsFromFile(): Promise<void> {
    if (!this.dependencies.storage || !this.config.persistence.path) {
      return;
    }

    try {
      const data = await this.dependencies.storage.readFile(this.config.persistence.path);
      const parsed = JSON.parse(data);

      if (parsed.conversations) {
        for (const conv of parsed.conversations) {
          const conversation: Conversation = {
            ...conv,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          };
          this.conversations.set(conversation.id, conversation);
        }
      }

      if (parsed.branches) {
        for (const branch of parsed.branches) {
          const conversationBranch: ConversationBranch = {
            ...branch,
            createdAt: new Date(branch.createdAt),
            updatedAt: new Date(branch.updatedAt),
          };
          this.branches.set(conversationBranch.id, conversationBranch);
        }
      }
    } catch (error) {
      if (this.dependencies.logger) {
        this.dependencies.logger.warn('Failed to load conversations from file:', error);
      }
    }
  }

  private async loadConversationsFromDatabase(): Promise<void> {
    // Database implementation would go here
    // This would depend on the specific database being used
  }

  private async saveConversation(conversation: Conversation): Promise<void> {
    if (!this.config.autoSave) {
      return;
    }

    switch (this.config.persistence.type) {
      case 'memory':
        // No saving needed for memory persistence
        break;

      case 'file':
        await this.saveConversationsToFile();
        break;

      case 'database':
        await this.saveConversationToDatabase(conversation);
        break;
    }
  }

  private async saveBranch(branch: ConversationBranch): Promise<void> {
    if (!this.config.autoSave) {
      return;
    }

    switch (this.config.persistence.type) {
      case 'memory':
        // No saving needed for memory persistence
        break;

      case 'file':
        await this.saveConversationsToFile();
        break;

      case 'database':
        await this.saveBranchToDatabase(branch);
        break;
    }
  }

  private async saveConversationsToFile(): Promise<void> {
    if (!this.dependencies.storage || !this.config.persistence.path) {
      return;
    }

    try {
      const data = {
        conversations: Array.from(this.conversations.values()),
        branches: Array.from(this.branches.values()),
        savedAt: new Date().toISOString(),
      };

      await this.dependencies.storage.writeFile(
        this.config.persistence.path,
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      if (this.dependencies.logger) {
        this.dependencies.logger.error('Failed to save conversations to file:', error);
      }
    }
  }

  private async saveConversationToDatabase(conversation: Conversation): Promise<void> {
    // Database implementation would go here
  }

  private async saveBranchToDatabase(branch: ConversationBranch): Promise<void> {
    // Database implementation would go here
  }

  private async deleteConversationFromStorage(conversationId: string): Promise<void> {
    switch (this.config.persistence.type) {
      case 'memory':
        // No deletion needed for memory persistence
        break;

      case 'file':
        await this.saveConversationsToFile();
        break;

      case 'database':
        await this.deleteConversationFromDatabase(conversationId);
        break;
    }
  }

  private async deleteBranchFromStorage(branchId: string): Promise<void> {
    switch (this.config.persistence.type) {
      case 'memory':
        // No deletion needed for memory persistence
        break;

      case 'file':
        await this.saveConversationsToFile();
        break;

      case 'database':
        await this.deleteBranchFromDatabase(branchId);
        break;
    }
  }

  private async deleteConversationFromDatabase(conversationId: string): Promise<void> {
    // Database implementation would go here
  }

  private async deleteBranchFromDatabase(branchId: string): Promise<void> {
    // Database implementation would go here
  }

  private async saveAllConversations(): Promise<void> {
    await this.saveConversationsToFile();
  }

  async cleanup(): Promise<void> {
    // Clear auto-save timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Save all data before cleanup
    if (this.config.autoSave) {
      await this.saveAllConversations();
    }

    // Clear memory
    this.conversations.clear();
    this.branches.clear();

    this.isInitialized = false;
  }
}