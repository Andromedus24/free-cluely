/**
 * Messaging Service for Atlas AI
 * Integrates Stray-Sender social messaging with AI-powered content ranking
 * Supports templates, automation, and smart message scheduling
 */

import { logger } from '@/lib/logger';
import { validate, sanitize } from '@/lib/validation';

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  channelId?: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  timestamp: Date;
  editedAt?: Date;
  isEdited: boolean;
  reactions: MessageReaction[];
  attachments?: MessageAttachment[];
  metadata?: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    tags?: string[];
    category?: string;
    language?: string;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
  aiData?: {
    relevanceScore?: number;
    engagementPrediction?: number;
    suggestedResponses?: string[];
    toxicity?: number;
    spamProbability?: number;
  };
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  timestamp: Date;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedAt: Date;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'direct' | 'group' | 'broadcast' | 'community';
  members: string[];
  admins: string[];
  createdById: string;
  createdAt: Date;
  settings: {
    isPrivate: boolean;
    allowInvites: boolean;
    requireApproval: boolean;
    maxMembers?: number;
    theme?: string;
  };
  metadata?: {
    totalMessages: number;
    activeMembers: number;
    lastActivity: Date;
    popularTopics?: string[];
  };
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  bio?: string;
  joinedAt: Date;
  stats: {
    messagesSent: number;
    reactionsGiven: number;
    connectionsCount: number;
    reputation: number;
  };
  preferences: {
    notifications: boolean;
    sound: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
  tags: string[];
  variables: TemplateVariable[];
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  isPublic: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'user' | 'channel';
  defaultValue?: string;
  required: boolean;
  description?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions: AutomationCondition[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  lastRun?: Date;
  runCount: number;
}

export interface AutomationTrigger {
  type: 'message_received' | 'message_sent' | 'user_joined' | 'time_based' | 'keyword_mentioned';
  config: Record<string, any>;
}

export interface AutomationAction {
  type: 'send_message' | 'add_reaction' | 'assign_tag' | 'move_message' | 'notify_user';
  config: Record<string, string | number | boolean | string[]>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'regex';
  value: string | number | boolean | string[];
}

export interface MessagingConfig {
  ai: {
    contentRanking: boolean;
    spamDetection: boolean;
    sentimentAnalysis: boolean;
    suggestedResponses: boolean;
    autoTranslation: boolean;
  };
  automation: {
    enabled: boolean;
    maxRulesPerUser: number;
    executionLimit: number;
  };
  privacy: {
    messageEncryption: boolean;
    dataRetention: number; // days
    allowAnalytics: boolean;
  };
  limits: {
    maxMessageLength: number;
    maxAttachmentsPerMessage: number;
    maxFileSize: number; // MB
    maxChannelsPerUser: number;
  };
}

class MessagingService {
  private config: MessagingConfig;
  private messages: Map<string, Message> = new Map();
  private channels: Map<string, Channel> = new Map();
  private users: Map<string, User> = new Map();
  private templates: Map<string, MessageTemplate> = new Map();
  private automationRules: Map<string, AutomationRule> = new Map();
  private isInitialized = false;

  constructor(config: MessagingConfig) {
    this.config = config;
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Load configuration from localStorage
      const savedConfig = localStorage.getItem('atlas-messaging-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }

      // Load data from localStorage
      await this.loadFromStorage();

      this.isInitialized = true;
      logger.info('messaging-service', 'Messaging service initialized');
    } catch (error) {
      logger.error('messaging-service', 'Failed to initialize messaging service', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async loadFromStorage() {
    try {
      const savedMessages = localStorage.getItem('atlas-messages');
      if (savedMessages) {
        const messages = JSON.parse(savedMessages);
        messages.forEach((message: Message) => {
          this.messages.set(message.id, message);
        });
      }

      const savedChannels = localStorage.getItem('atlas-channels');
      if (savedChannels) {
        const channels = JSON.parse(savedChannels);
        channels.forEach((channel: Channel) => {
          this.channels.set(channel.id, channel);
        });
      }

      const savedUsers = localStorage.getItem('atlas-users');
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        users.forEach((user: User) => {
          this.users.set(user.id, user);
        });
      }

      const savedTemplates = localStorage.getItem('atlas-templates');
      if (savedTemplates) {
        const templates = JSON.parse(savedTemplates);
        templates.forEach((template: MessageTemplate) => {
          this.templates.set(template.id, template);
        });
      }

      const savedRules = localStorage.getItem('atlas-automation-rules');
      if (savedRules) {
        const rules = JSON.parse(savedRules);
        rules.forEach((rule: AutomationRule) => {
          this.automationRules.set(rule.id, rule);
        });
      }
    } catch (error) {
      logger.error('messaging-service', 'Failed to load messaging data', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public async sendMessage(
    content: string,
    senderId: string,
    receiverId?: string,
    channelId?: string,
    messageType: Message['messageType'] = 'text'
  ): Promise<Message> {
    if (!this.isInitialized) {
      throw new Error('Messaging service not initialized');
    }

    // Validate and sanitize message content
    const sanitizedContent = sanitize.input(content, {
      maxLength: this.config.limits.maxMessageLength,
      allowHtml: false
    });

    if (!sanitizedContent.trim()) {
      throw new Error('Message content cannot be empty');
    }

    const message: Message = {
      id: this.generateId(),
      content: sanitizedContent.trim(),
      senderId,
      receiverId,
      channelId,
      messageType,
      timestamp: new Date(),
      isEdited: false,
      reactions: [],
      metadata: {
        priority: 'normal',
        tags: [],
        category: 'general'
      }
    };

    // Apply AI analysis if enabled
    if (this.config.ai.contentRanking) {
      message.aiData = await this.analyzeMessage(message);
    }

    // Store message
    this.messages.set(message.id, message);

    // Update channel metadata
    if (channelId && this.channels.has(channelId)) {
      const channel = this.channels.get(channelId)!;
      channel.metadata!.totalMessages++;
      channel.metadata!.lastActivity = new Date();
      await this.saveChannels();
    }

    // Update user stats
    if (this.users.has(senderId)) {
      const user = this.users.get(senderId)!;
      user.stats.messagesSent++;
      await this.saveUsers();
    }

    // Check automation rules
    await this.processAutomationRules('message_sent', message);

    await this.saveMessages();
    return message;
  }

  public async editMessage(messageId: string, newContent: string, editorId: string): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== editorId) {
      throw new Error('Cannot edit message sent by another user');
    }

    if (newContent.length > this.config.limits.maxMessageLength) {
      throw new Error(`Message too long (max ${this.config.limits.maxMessageLength} characters)`);
    }

    message.content = newContent.trim();
    message.editedAt = new Date();
    message.isEdited = true;

    await this.saveMessages();
    return message;
  }

  public async deleteMessage(messageId: string, deleterId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== deleterId) {
      throw new Error('Cannot delete message sent by another user');
    }

    this.messages.delete(messageId);
    await this.saveMessages();
  }

  public async addReaction(messageId: string, userId: string, emoji: string): Promise<MessageReaction> {
    const message = this.messages.get(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.userId === userId && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction if it already exists
      message.reactions = message.reactions.filter(r => r.id !== existingReaction.id);
      await this.saveMessages();
      return existingReaction;
    }

    const reaction: MessageReaction = {
      id: this.generateId(),
      messageId,
      userId,
      emoji,
      timestamp: new Date()
    };

    message.reactions.push(reaction);
    await this.saveMessages();

    // Update user stats
    if (this.users.has(userId)) {
      const user = this.users.get(userId)!;
      user.stats.reactionsGiven++;
      await this.saveUsers();
    }

    return reaction;
  }

  public async createChannel(
    name: string,
    description: string,
    type: Channel['type'],
    creatorId: string,
    isPrivate: boolean = false
  ): Promise<Channel> {
    const channel: Channel = {
      id: this.generateId(),
      name,
      description,
      type,
      members: [creatorId],
      admins: [creatorId],
      createdById: creatorId,
      createdAt: new Date(),
      settings: {
        isPrivate,
        allowInvites: true,
        requireApproval: type === 'community'
      },
      metadata: {
        totalMessages: 0,
        activeMembers: 1,
        lastActivity: new Date(),
        popularTopics: []
      }
    };

    this.channels.set(channel.id, channel);
    await this.saveChannels();

    // Check automation rules for new channel
    await this.processAutomationRules('channel_created', channel);

    return channel;
  }

  public async joinChannel(channelId: string, userId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (channel.members.includes(userId)) {
      throw new Error('User already in channel');
    }

    if (channel.settings.requireApproval && !channel.admins.includes(userId)) {
      throw new Error('Channel requires approval to join');
    }

    channel.members.push(userId);
    channel.metadata!.activeMembers++;
    await this.saveChannels();

    // Check automation rules
    await this.processAutomationRules('user_joined', { channel, userId });
  }

  public async leaveChannel(channelId: string, userId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    channel.members = channel.members.filter(id => id !== userId);
    channel.admins = channel.admins.filter(id => id !== userId);
    channel.metadata!.activeMembers--;
    await this.saveChannels();
  }

  public async createTemplate(
    name: string,
    content: string,
    category: string,
    tags: string[],
    variables: TemplateVariable[],
    creatorId: string,
    isPublic: boolean = false
  ): Promise<MessageTemplate> {
    const template: MessageTemplate = {
      id: this.generateId(),
      name,
      content,
      category,
      tags,
      variables,
      createdBy: creatorId,
      createdAt: new Date(),
      usageCount: 0,
      isPublic
    };

    this.templates.set(template.id, template);
    await this.saveTemplates();
    return template;
  }

  public async useTemplate(templateId: string, variables: Record<string, string>): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    let content = template.content;

    // Replace variables
    template.variables.forEach(variable => {
      const value = variables[variable.name] || variable.defaultValue || '';
      const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      content = content.replace(regex, value);
    });

    // Increment usage count
    template.usageCount++;
    await this.saveTemplates();

    return content;
  }

  public async createAutomationRule(
    name: string,
    description: string,
    trigger: AutomationTrigger,
    actions: AutomationAction[],
    conditions: AutomationCondition[],
    creatorId: string
  ): Promise<AutomationRule> {
    const userRules = Array.from(this.automationRules.values()).filter(
      rule => rule.createdBy === creatorId
    );

    if (userRules.length >= this.config.automation.maxRulesPerUser) {
      throw new Error(`Maximum automation rules (${this.config.automation.maxRulesPerUser}) reached`);
    }

    const rule: AutomationRule = {
      id: this.generateId(),
      name,
      description,
      trigger,
      actions,
      conditions,
      isActive: true,
      createdBy: creatorId,
      createdAt: new Date(),
      runCount: 0
    };

    this.automationRules.set(rule.id, rule);
    await this.saveAutomationRules();
    return rule;
  }

  private async analyzeMessage(message: Message): Promise<Message['aiData']> {
    // Simulate AI analysis (in real implementation, use OpenAI/Anthropic API)
    const sentiment = this.analyzeSentiment(message.content);
    const toxicity = this.calculateToxicity(message.content);
    const spamProbability = this.calculateSpamProbability(message.content);
    const relevanceScore = this.calculateRelevanceScore(message);
    const engagementPrediction = this.predictEngagement(message);

    return {
      relevanceScore,
      engagementPrediction,
      suggestedResponses: this.generateSuggestedResponses(message),
      toxicity,
      spamProbability
    };
  }

  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'awesome', 'excellent', 'good', 'love', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'horrible', 'worst'];

    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const negativeCount = words.filter(word => negativeWords.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateToxicity(content: string): number {
    const toxicWords = ['hate', 'kill', 'stupid', 'idiot', 'damn', 'hell'];
    const words = content.toLowerCase().split(/\s+/);
    const toxicCount = words.filter(word => toxicWords.includes(word)).length;
    return Math.min(100, (toxicCount / words.length) * 100);
  }

  private calculateSpamProbability(content: string): number {
    const spamIndicators = [
      /http[s]?:\/\/[^\s]+/g, // URLs
      /\$\d+/g, // Money mentions
      /click here/gi, // Common spam phrases
      /free money/gi,
      /limited time/gi
    ];

    let spamScore = 0;
    spamIndicators.forEach(indicator => {
      if (indicator.test(content)) {
        spamScore += 25;
      }
    });

    return Math.min(100, spamScore);
  }

  private calculateRelevanceScore(message: Message): number {
    // Simple relevance calculation based on content length and engagement factors
    const lengthScore = Math.min(100, (message.content.length / 200) * 100);
    const hashtagScore = (message.metadata?.tags?.length || 0) * 10;
    return Math.min(100, (lengthScore + hashtagScore) / 2);
  }

  private predictEngagement(message: Message): number {
    // Simple engagement prediction based on message characteristics
    const questionMarkCount = (message.content.match(/\?/g) || []).length;
    const exclamationCount = (message.content.match(/!/g) || []).length;
    const emojiCount = (message.content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;

    return Math.min(100, (questionMarkCount * 15) + (exclamationCount * 10) + (emojiCount * 20));
  }

  private generateSuggestedResponses(message: Message): string[] {
    // Generate contextual response suggestions
    const suggestions = [];

    if (message.content.includes('?')) {
      suggestions.push('I can help with that!', 'Let me look into this for you.');
    }

    if (message.content.toLowerCase().includes('thank')) {
      suggestions.push('You\'re welcome!', 'Happy to help!');
    }

    if (message.content.toLowerCase().includes('help')) {
      suggestions.push('How can I assist you?', 'I\'m here to help!');
    }

    return suggestions.slice(0, 3);
  }

  private async processAutomationRules(eventType: string, data: Record<string, unknown>): Promise<void> {
    const activeRules = Array.from(this.automationRules.values()).filter(rule => rule.isActive);

    for (const rule of activeRules) {
      if (rule.trigger.type === eventType) {
        try {
          // Check conditions
          const conditionsMet = rule.conditions.every(condition => this.checkCondition(condition, data));

          if (conditionsMet) {
            // Execute actions
            for (const action of rule.actions) {
              await this.executeAction(action, data);
            }

            // Update rule stats
            rule.lastRun = new Date();
            rule.runCount++;
            await this.saveAutomationRules();
          }
        } catch (error) {
          logger.error('messaging-service', `Error executing automation rule ${rule.name}`, error instanceof Error ? error : new Error(String(error)));
        }
      }
    }
  }

  private checkCondition(condition: AutomationCondition, data: Record<string, unknown>): boolean {
    // Simple condition checking logic
    const fieldValue = this.getNestedValue(data, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'regex':
        return new RegExp(condition.value).test(String(fieldValue));
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeAction(action: AutomationAction, data: Record<string, unknown>): Promise<void> {
    switch (action.type) {
      case 'send_message':
        // Implementation for auto-sending messages
        break;
      case 'add_reaction':
        // Implementation for auto-adding reactions
        break;
      case 'assign_tag':
        // Implementation for auto-assigning tags
        break;
      case 'notify_user':
        // Implementation for sending notifications
        break;
    }
  }

  // Getter methods
  public getMessages(channelId?: string, limit?: number): Message[] {
    let messages = Array.from(this.messages.values());

    if (channelId) {
      messages = messages.filter(m => m.channelId === channelId);
    }

    messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? messages.slice(0, limit) : messages;
  }

  public getChannel(id: string): Channel | undefined {
    return this.channels.get(id);
  }

  public getChannels(userId?: string): Channel[] {
    let channels = Array.from(this.channels.values());

    if (userId) {
      channels = channels.filter(c => c.members.includes(userId));
    }

    return channels;
  }

  public getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  public getUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getTemplates(userId?: string): MessageTemplate[] {
    let templates = Array.from(this.templates.values());

    if (userId) {
      templates = templates.filter(t => t.createdBy === userId || t.isPublic);
    }

    return templates;
  }

  public getAutomationRules(userId?: string): AutomationRule[] {
    let rules = Array.from(this.automationRules.values());

    if (userId) {
      rules = rules.filter(r => r.createdBy === userId);
    }

    return rules;
  }

  // Storage methods
  private async saveMessages(): Promise<void> {
    try {
      const messagesArray = Array.from(this.messages.values());
      localStorage.setItem('atlas-messages', JSON.stringify(messagesArray));
    } catch (error) {
      logger.error('messaging-service', 'Failed to save messages', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async saveChannels(): Promise<void> {
    try {
      const channelsArray = Array.from(this.channels.values());
      localStorage.setItem('atlas-channels', JSON.stringify(channelsArray));
    } catch (error) {
      logger.error('messaging-service', 'Failed to save channels', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async saveUsers(): Promise<void> {
    try {
      const usersArray = Array.from(this.users.values());
      localStorage.setItem('atlas-users', JSON.stringify(usersArray));
    } catch (error) {
      logger.error('messaging-service', 'Failed to save users', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async saveTemplates(): Promise<void> {
    try {
      const templatesArray = Array.from(this.templates.values());
      localStorage.setItem('atlas-templates', JSON.stringify(templatesArray));
    } catch (error) {
      logger.error('messaging-service', 'Failed to save templates', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async saveAutomationRules(): Promise<void> {
    try {
      const rulesArray = Array.from(this.automationRules.values());
      localStorage.setItem('atlas-automation-rules', JSON.stringify(rulesArray));
    } catch (error) {
      logger.error('messaging-service', 'Failed to save automation rules', error instanceof Error ? error : new Error(String(error)));
    }
  }

  public updateConfig(config: Partial<MessagingConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('atlas-messaging-config', JSON.stringify(this.config));
  }

  public getConfig(): MessagingConfig {
    return this.config;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  public destroy(): void {
    // Clean up resources
    this.messages.clear();
    this.channels.clear();
    this.users.clear();
    this.templates.clear();
    this.automationRules.clear();
  }
}

// Export singleton instance
export const messagingService = new MessagingService({
  ai: {
    contentRanking: true,
    spamDetection: true,
    sentimentAnalysis: true,
    suggestedResponses: true,
    autoTranslation: false
  },
  automation: {
    enabled: true,
    maxRulesPerUser: 10,
    executionLimit: 100
  },
  privacy: {
    messageEncryption: true,
    dataRetention: 30,
    allowAnalytics: true
  },
  limits: {
    maxMessageLength: 2000,
    maxAttachmentsPerMessage: 5,
    maxFileSize: 10,
    maxChannelsPerUser: 50
  }
});

export default MessagingService;