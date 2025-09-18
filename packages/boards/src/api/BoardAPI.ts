import {
  Board,
  Column,
  Card,
  Comment,
  Activity,
  BoardView,
  BoardTemplate,
  CollaborationSession,
  BoardAnalytics,
  CreateBoardRequest,
  UpdateBoardRequest,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  BoardFilters,
  BoardQuery,
  BoardSystemEvent
} from '../types/BoardTypes';
import { BoardSystemInterface } from '../interfaces/BoardSystemInterface';

export interface BoardAPIConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
}

export class BoardAPI {
  private config: BoardAPIConfig;
  private system: BoardSystemInterface;

  constructor(config: BoardAPIConfig, system: BoardSystemInterface) {
    this.config = config;
    this.system = system;
  }

  // Board Operations
  async createBoard(request: CreateBoardRequest, ownerId: string): Promise<Board> {
    return this.system.createBoard(request, ownerId);
  }

  async getBoard(boardId: string): Promise<Board> {
    const board = await this.system.getBoard(boardId);
    if (!board) {
      throw new Error(`Board with ID ${boardId} not found`);
    }
    return board;
  }

  async updateBoard(boardId: string, request: UpdateBoardRequest): Promise<Board> {
    return this.system.updateBoard(boardId, request);
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.system.deleteBoard(boardId);
  }

  async archiveBoard(boardId: string): Promise<void> {
    await this.system.archiveBoard(boardId);
  }

  async restoreBoard(boardId: string): Promise<Board> {
    return this.system.restoreBoard(boardId);
  }

  async duplicateBoard(boardId: string, newName: string): Promise<Board> {
    return this.system.duplicateBoard(boardId, newName);
  }

  async getBoardsByUser(userId: string, filters?: BoardFilters): Promise<Board[]> {
    return this.system.getBoardsByUser(userId, filters);
  }

  async searchBoards(query: string, userId?: string): Promise<Board[]> {
    return this.system.searchBoards(query, userId);
  }

  // Column Operations
  async createColumn(boardId: string, name: string, status: string, position?: number): Promise<Column> {
    return this.system.createColumn(boardId, name, status, position);
  }

  async updateColumn(columnId: string, updates: Partial<Column>): Promise<Column> {
    return this.system.updateColumn(columnId, updates);
  }

  async deleteColumn(columnId: string): Promise<void> {
    await this.system.deleteColumn(columnId);
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
    await this.system.reorderColumns(boardId, columnIds);
  }

  async getColumnsByBoard(boardId: string): Promise<Column[]> {
    return this.system.getColumnsByBoard(boardId);
  }

  // Card Operations
  async createCard(boardId: string, columnId: string, request: CreateCardRequest, createdBy: string): Promise<Card> {
    return this.system.createCard(boardId, columnId, request, createdBy);
  }

  async getCard(cardId: string): Promise<Card> {
    const card = await this.system.getCard(cardId);
    if (!card) {
      throw new Error(`Card with ID ${cardId} not found`);
    }
    return card;
  }

  async updateCard(cardId: string, request: UpdateCardRequest): Promise<Card> {
    return this.system.updateCard(cardId, request);
  }

  async deleteCard(cardId: string): Promise<void> {
    await this.system.deleteCard(cardId);
  }

  async moveCard(cardId: string, request: MoveCardRequest): Promise<Card> {
    return this.system.moveCard(cardId, request);
  }

  async archiveCard(cardId: string): Promise<void> {
    await this.system.archiveCard(cardId);
  }

  async restoreCard(cardId: string): Promise<Card> {
    return this.system.restoreCard(cardId);
  }

  async duplicateCard(cardId: string, targetColumnId?: string): Promise<Card> {
    return this.system.duplicateCard(cardId, targetColumnId);
  }

  async getCardsByBoard(boardId: string, query?: BoardQuery): Promise<Card[]> {
    return this.system.getCardsByBoard(boardId, query);
  }

  async getCardsByColumn(columnId: string): Promise<Card[]> {
    return this.system.getCardsByColumn(columnId);
  }

  async searchCards(boardId: string, query: string): Promise<Card[]> {
    return this.system.searchCards(boardId, query);
  }

  // Card Hierarchy
  async createSubtask(parentCardId: string, request: CreateCardRequest, createdBy: string): Promise<Card> {
    return this.system.createSubtask(parentCardId, request, createdBy);
  }

  async getSubtasks(parentCardId: string): Promise<Card[]> {
    return this.system.getSubtasks(parentCardId);
  }

  async updateCardHierarchy(cardId: string, parentCardId?: string): Promise<Card> {
    return this.system.updateCardHierarchy(cardId, parentCardId);
  }

  async getCardDependencies(cardId: string): Promise<Card[]> {
    return this.system.getCardDependencies(cardId);
  }

  async addCardDependency(cardId: string, dependencyId: string): Promise<void> {
    await this.system.addCardDependency(cardId, dependencyId);
  }

  async removeCardDependency(cardId: string, dependencyId: string): Promise<void> {
    await this.system.removeCardDependency(cardId, dependencyId);
  }

  // Comments
  async createComment(cardId: string, content: string, authorId: string, parentCommentId?: string): Promise<Comment> {
    return this.system.createComment(cardId, content, authorId, parentCommentId);
  }

  async getCommentsByCard(cardId: string): Promise<Comment[]> {
    return this.system.getCommentsByCard(cardId);
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    return this.system.updateComment(commentId, content);
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.system.deleteComment(commentId);
  }

  async pinComment(commentId: string): Promise<Comment> {
    return this.system.pinComment(commentId);
  }

  async unpinComment(commentId: string): Promise<Comment> {
    return this.system.unpinComment(commentId);
  }

  // Attachments
  async addCardAttachment(cardId: string, attachment: {
    name: string;
    url: string;
    size: number;
    type: string;
  }, uploadedBy: string): Promise<Card> {
    return this.system.addCardAttachment(cardId, attachment, uploadedBy);
  }

  async removeCardAttachment(cardId: string, attachmentId: string): Promise<Card> {
    return this.system.removeCardAttachment(cardId, attachmentId);
  }

  async getCardAttachments(cardId: string): Promise<Card['attachments']> {
    return this.system.getCardAttachments(cardId);
  }

  // Checklists
  async addCardChecklist(cardId: string, title: string): Promise<Card> {
    return this.system.addCardChecklist(cardId, title);
  }

  async updateCardChecklist(cardId: string, checklistId: string, updates: any): Promise<Card> {
    return this.system.updateCardChecklist(cardId, checklistId, updates);
  }

  async deleteCardChecklist(cardId: string, checklistId: string): Promise<Card> {
    return this.system.deleteCardChecklist(cardId, checklistId);
  }

  async addChecklistItem(cardId: string, checklistId: string, text: string): Promise<Card> {
    return this.system.addChecklistItem(cardId, checklistId, text);
  }

  async updateChecklistItem(cardId: string, checklistId: string, itemId: string, updates: any): Promise<Card> {
    return this.system.updateChecklistItem(cardId, checklistId, itemId, updates);
  }

  async deleteChecklistItem(cardId: string, checklistId: string, itemId: string): Promise<Card> {
    return this.system.deleteChecklistItem(cardId, checklistId, itemId);
  }

  // Labels
  async createBoardLabel(boardId: string, name: string, color: string): Promise<Board> {
    return this.system.createBoardLabel(boardId, name, color);
  }

  async updateBoardLabel(boardId: string, labelId: string, updates: any): Promise<Board> {
    return this.system.updateBoardLabel(boardId, labelId, updates);
  }

  async deleteBoardLabel(boardId: string, labelId: string): Promise<Board> {
    return this.system.deleteBoardLabel(boardId, labelId);
  }

  async getBoardLabels(boardId: string): Promise<string[]> {
    return this.system.getBoardLabels(boardId);
  }

  // Views
  async createBoardView(boardId: string, name: string, type: string): Promise<BoardView> {
    return this.system.createBoardView(boardId, name, type);
  }

  async getBoardViews(boardId: string): Promise<BoardView[]> {
    return this.system.getBoardViews(boardId);
  }

  async updateBoardView(viewId: string, updates: any): Promise<BoardView> {
    return this.system.updateBoardView(viewId, updates);
  }

  async deleteBoardView(viewId: string): Promise<void> {
    await this.system.deleteBoardView(viewId);
  }

  async setDefaultBoardView(boardId: string, viewId: string): Promise<void> {
    await this.system.setDefaultBoardView(boardId, viewId);
  }

  // Templates
  async createBoardTemplate(request: {
    name: string;
    description?: string;
    category: string;
    boardId: string;
    isPublic?: boolean;
  }, authorId: string): Promise<BoardTemplate> {
    return this.system.createBoardTemplate(request, authorId);
  }

  async getBoardTemplates(category?: string, search?: string): Promise<BoardTemplate[]> {
    return this.system.getBoardTemplates(category, search);
  }

  async getBoardTemplate(templateId: string): Promise<BoardTemplate> {
    const template = await this.system.getBoardTemplate(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    return template;
  }

  async applyBoardTemplate(templateId: string, name: string, ownerId: string): Promise<Board> {
    return this.system.applyBoardTemplate(templateId, name, ownerId);
  }

  async deleteBoardTemplate(templateId: string): Promise<void> {
    await this.system.deleteBoardTemplate(templateId);
  }

  async rateBoardTemplate(templateId: string, rating: number, userId: string): Promise<BoardTemplate> {
    return this.system.rateBoardTemplate(templateId, rating, userId);
  }

  // Collaboration
  async startCollaborationSession(boardId: string, userIds: string[]): Promise<CollaborationSession> {
    return this.system.startCollaborationSession(boardId, userIds);
  }

  async joinCollaborationSession(sessionId: string, userId: string): Promise<CollaborationSession> {
    return this.system.joinCollaborationSession(sessionId, userId);
  }

  async leaveCollaborationSession(sessionId: string, userId: string): Promise<void> {
    await this.system.leaveCollaborationSession(sessionId, userId);
  }

  async updateCursorPosition(sessionId: string, userId: string, position: { x: number; y: number; cardId?: string }): Promise<void> {
    await this.system.updateCursorPosition(sessionId, userId, position);
  }

  async updateSelection(sessionId: string, userId: string, selection: { type: string; entityId: string }): Promise<void> {
    await this.system.updateSelection(sessionId, userId, selection);
  }

  async getActiveCollaborationSessions(boardId: string): Promise<CollaborationSession[]> {
    return this.system.getActiveCollaborationSessions(boardId);
  }

  // Analytics
  async getBoardAnalytics(boardId: string, period: string): Promise<BoardAnalytics> {
    return this.system.getBoardAnalytics(boardId, period);
  }

  async getBoardMetrics(boardId: string): Promise<{
    totalCards: number;
    completedCards: number;
    averageCycleTime: number;
    averageLeadTime: number;
    throughput: number;
    wipCount: number;
  }> {
    return this.system.getBoardMetrics(boardId);
  }

  async getBoardActivity(boardId: string, days?: number): Promise<Activity[]> {
    return this.system.getBoardActivity(boardId, days);
  }

  async getUserProductivity(userId: string, boardId?: string, period?: string): Promise<any> {
    return this.system.getUserProductivity(userId, boardId, period);
  }

  async getBoardBurndown(boardId: string, startDate: Date, endDate: Date): Promise<any> {
    return this.system.getBoardBurndown(boardId, startDate, endDate);
  }

  async getBoardVelocity(boardId: string, periods?: number): Promise<any> {
    return this.system.getBoardVelocity(boardId, periods);
  }

  async getCumulativeFlow(boardId: string, startDate: Date, endDate: Date): Promise<any> {
    return this.system.getCumulativeFlow(boardId, startDate, endDate);
  }

  // Real-time Events
  async subscribeToBoardEvents(boardId: string, callback: (event: BoardSystemEvent) => void): Promise<() => void> {
    return this.system.subscribeToBoardEvents(boardId, callback);
  }

  // Search and Filtering
  async searchCardsAdvanced(boardId: string, filters: BoardFilters): Promise<Card[]> {
    return this.system.searchCardsAdvanced(boardId, filters);
  }

  async getBoardStatistics(boardId: string): Promise<any> {
    return this.system.getBoardStatistics(boardId);
  }

  async getCardHistory(cardId: string): Promise<Activity[]> {
    return this.system.getCardHistory(cardId);
  }

  async getUserActivity(userId: string, boardId?: string, limit?: number): Promise<Activity[]> {
    return this.system.getUserActivity(userId, boardId, limit);
  }

  // Bulk Operations
  async bulkMoveCards(cardIds: string[], targetColumnId: string): Promise<void> {
    await this.system.bulkMoveCards(cardIds, targetColumnId);
  }

  async bulkUpdateCards(cardIds: string[], updates: Partial<Card>): Promise<void> {
    await this.system.bulkUpdateCards(cardIds, updates);
  }

  async bulkDeleteCards(cardIds: string[]): Promise<void> {
    await this.system.bulkDeleteCards(cardIds);
  }

  async bulkArchiveCards(cardIds: string[]): Promise<void> {
    await this.system.bulkArchiveCards(cardIds);
  }

  // Import/Export
  async exportBoardData(boardId: string, format: 'json' | 'csv' | 'excel'): Promise<any> {
    return this.system.exportBoardData(boardId, format);
  }

  async importBoardData(data: any, format: 'json' | 'csv' | 'excel', ownerId: string): Promise<Board> {
    return this.system.importBoardData(data, format, ownerId);
  }

  async exportBoardTemplate(boardId: string): Promise<BoardTemplate> {
    return this.system.exportBoardTemplate(boardId);
  }

  // Settings and Configuration
  async updateBoardSettings(boardId: string, settings: Partial<Board['settings']>): Promise<Board> {
    return this.system.updateBoardSettings(boardId, settings);
  }

  async updateBoardTheme(boardId: string, theme: Partial<Board['theme']>): Promise<Board> {
    return this.system.updateBoardTheme(boardId, theme);
  }

  async getBoardSettings(boardId: string): Promise<Board['settings']> {
    return this.system.getBoardSettings(boardId);
  }

  async getBoardTheme(boardId: string): Promise<Board['theme']> {
    return this.system.getBoardTheme(boardId);
  }

  // Permissions and Access
  async addBoardMember(boardId: string, userId: string, role?: string): Promise<Board> {
    return this.system.addBoardMember(boardId, userId, role);
  }

  async removeBoardMember(boardId: string, userId: string): Promise<Board> {
    return this.system.removeBoardMember(boardId, userId);
  }

  async updateBoardMemberRole(boardId: string, userId: string, role: string): Promise<Board> {
    return this.system.updateBoardMemberRole(boardId, userId, role);
  }

  async getBoardMembers(boardId: string): Promise<Array<{ userId: string; role?: string; joinedAt: Date }>> {
    return this.system.getBoardMembers(boardId);
  }

  async checkBoardAccess(boardId: string, userId: string, permission: string): Promise<boolean> {
    return this.system.checkBoardAccess(boardId, userId, permission);
  }

  // Notifications
  async subscribeToCardNotifications(cardId: string, userId: string): Promise<void> {
    await this.system.subscribeToCardNotifications(cardId, userId);
  }

  async unsubscribeFromCardNotifications(cardId: string, userId: string): Promise<void> {
    await this.system.unsubscribeFromCardNotifications(cardId, userId);
  }

  async getCardNotifications(userId: string): Promise<any[]> {
    return this.system.getCardNotifications(userId);
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.system.markNotificationAsRead(notificationId);
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.system.markAllNotificationsAsRead(userId);
  }

  // Webhooks
  async createBoardWebhook(boardId: string, url: string, events: string[]): Promise<any> {
    return this.system.createBoardWebhook(boardId, url, events);
  }

  async updateBoardWebhook(webhookId: string, updates: any): Promise<any> {
    return this.system.updateBoardWebhook(webhookId, updates);
  }

  async deleteBoardWebhook(webhookId: string): Promise<void> {
    await this.system.deleteBoardWebhook(webhookId);
  }

  async getBoardWebhooks(boardId: string): Promise<any[]> {
    return this.system.getBoardWebhooks(boardId);
  }

  async testBoardWebhook(webhookId: string): Promise<void> {
    await this.system.testBoardWebhook(webhookId);
  }

  // Automation
  async createBoardAutomation(boardId: string, trigger: any, actions: any[]): Promise<any> {
    return this.system.createBoardAutomation(boardId, trigger, actions);
  }

  async updateBoardAutomation(automationId: string, updates: any): Promise<any> {
    return this.system.updateBoardAutomation(automationId, updates);
  }

  async deleteBoardAutomation(automationId: string): Promise<void> {
    await this.system.deleteBoardAutomation(automationId);
  }

  async getBoardAutomations(boardId: string): Promise<any[]> {
    return this.system.getBoardAutomations(boardId);
  }

  async triggerBoardAutomation(boardId: string, triggerType: string, context: any): Promise<void> {
    await this.system.triggerBoardAutomation(boardId, triggerType, context);
  }

  // Integration
  async connectBoardToIntegration(boardId: string, integrationType: string, config: any): Promise<any> {
    return this.system.connectBoardToIntegration(boardId, integrationType, config);
  }

  async disconnectBoardFromIntegration(boardId: string, integrationId: string): Promise<void> {
    await this.system.disconnectBoardFromIntegration(boardId, integrationId);
  }

  async getBoardIntegrations(boardId: string): Promise<any[]> {
    return this.system.getBoardIntegrations(boardId);
  }

  async syncBoardWithIntegration(boardId: string, integrationId: string): Promise<void> {
    await this.system.syncBoardWithIntegration(boardId, integrationId);
  }

  // Error handling wrapper
  private async withErrorHandling<T>(operation: () => Promise<T>, errorMessage: string): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.error(errorMessage, error);
      throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Rate limiting
  private rateLimits = new Map<string, { count: number; resetTime: number }>();

  private async checkRateLimit(userId: string, limit: number, windowMs: number): Promise<void> {
    const now = Date.now();
    const userLimit = this.rateLimits.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      this.rateLimits.set(userId, { count: 1, resetTime: now + windowMs });
      return;
    }

    if (userLimit.count >= limit) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    userLimit.count++;
  }

  // Validation
  private validateBoardRequest(request: CreateBoardRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Board name is required');
    }
    if (request.name.length > 100) {
      throw new Error('Board name must be less than 100 characters');
    }
  }

  private validateCardRequest(request: CreateCardRequest): void {
    if (!request.title || request.title.trim().length === 0) {
      throw new Error('Card title is required');
    }
    if (request.title.length > 200) {
      throw new Error('Card title must be less than 200 characters');
    }
  }

  private validateComment(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }
    if (content.length > 5000) {
      throw new Error('Comment must be less than 5000 characters');
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; timestamp: Date; uptime: number }> {
    return {
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime() * 1000
    };
  }
}