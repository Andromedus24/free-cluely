import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
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
  BoardSystemEvent,
  TaskType,
  CardStatus,
  TaskPriority
} from '../types/BoardTypes';
import {
  BoardSystemInterface,
  BoardRepositoryInterface,
  BoardEventBusInterface,
  BoardSecurityInterface
} from '../interfaces/BoardSystemInterface';

export class BoardSystemService extends EventEmitter implements BoardSystemInterface {
  private repository: BoardRepositoryInterface;
  private eventBus: BoardEventBusInterface;
  private security: BoardSecurityInterface;
  private activeSessions: Map<string, CollaborationSession> = new Map();
  private boardCache: Map<string, Board> = new Map();
  private cardCache: Map<string, Card> = new Map();

  constructor(
    repository: BoardRepositoryInterface,
    eventBus: BoardEventBusInterface,
    security: BoardSecurityInterface
  ) {
    super();
    this.repository = repository;
    this.eventBus = eventBus;
    this.security = security;
    this.setupEventHandlers();
  }

  // Board Management
  async createBoard(request: CreateBoardRequest, ownerId: string): Promise<Board> {
    const boardData = {
      id: uuidv4(),
      ...request,
      ownerId,
      memberIds: [ownerId],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const board = await this.repository.createBoard(boardData);

    // Create default columns based on board type
    await this.createDefaultColumns(board.id, board.type);

    // Cache the board
    this.boardCache.set(board.id, board);

    // Emit event
    this.emitBoardEvent({
      type: 'board_created',
      boardId: board.id,
      data: board,
      userId: ownerId,
      timestamp: new Date()
    });

    return board;
  }

  async getBoard(boardId: string): Promise<Board | null> {
    // Check cache first
    const cached = this.boardCache.get(boardId);
    if (cached) return cached;

    const board = await this.repository.findBoardById(boardId);
    if (board) {
      this.boardCache.set(boardId, board);
    }
    return board;
  }

  async updateBoard(boardId: string, request: UpdateBoardRequest): Promise<Board> {
    const board = await this.repository.updateBoard(boardId, {
      ...request,
      updatedAt: new Date()
    });

    // Update cache
    this.boardCache.set(boardId, board);

    // Emit event
    this.emitBoardEvent({
      type: 'board_updated',
      boardId: board.id,
      data: board,
      userId: request.memberIds?.[0] || 'system',
      timestamp: new Date()
    });

    return board;
  }

  async deleteBoard(boardId: string): Promise<void> {
    await this.repository.deleteBoard(boardId);

    // Clear cache
    this.boardCache.delete(boardId);

    // Emit event
    this.emitBoardEvent({
      type: 'board_deleted',
      boardId,
      data: {} as Board,
      userId: 'system',
      timestamp: new Date()
    });
  }

  async archiveBoard(boardId: string): Promise<void> {
    const board = await this.getBoard(boardId);
    if (!board) throw new Error('Board not found');

    await this.updateBoard(boardId, {
      status: 'archived' as any,
      archivedAt: new Date()
    });

    this.emitBoardEvent({
      type: 'board_archived',
      boardId: board.id,
      data: board,
      userId: 'system',
      timestamp: new Date()
    });
  }

  async restoreBoard(boardId: string): Promise<Board> {
    const board = await this.getBoard(boardId);
    if (!board) throw new Error('Board not found');

    return this.updateBoard(boardId, {
      status: 'active' as any,
      archivedAt: undefined
    });
  }

  async duplicateBoard(boardId: string, newName: string): Promise<Board> {
    const originalBoard = await this.getBoard(boardId);
    if (!originalBoard) throw new Error('Board not found');

    const newBoard = await this.createBoard({
      name: newName,
      description: originalBoard.description,
      type: originalBoard.type,
      settings: originalBoard.settings,
      theme: originalBoard.theme
    }, originalBoard.ownerId);

    // Copy columns
    const columns = await this.repository.findColumnsByBoardId(boardId);
    for (const column of columns) {
      await this.createColumn(
        newBoard.id,
        column.name,
        column.status,
        column.position
      );
    }

    return newBoard;
  }

  async getBoardsByUser(userId: string, filters?: BoardFilters): Promise<Board[]> {
    return this.repository.findBoardsByUserId(userId, filters);
  }

  async searchBoards(query: string, userId?: string): Promise<Board[]> {
    return this.repository.searchBoards(query, userId);
  }

  // Column Management
  async createColumn(boardId: string, name: string, status: string, position?: number): Promise<Column> {
    const columnData = {
      id: uuidv4(),
      boardId,
      name,
      status: status as any,
      position: position || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.repository.createColumn(columnData);
  }

  async updateColumn(columnId: string, updates: Partial<Column>): Promise<Column> {
    return this.repository.updateColumn(columnId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  async deleteColumn(columnId: string): Promise<void> {
    await this.repository.deleteColumn(columnId);
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
    const columns = await this.repository.findColumnsByBoardId(boardId);

    for (let i = 0; i < columnIds.length; i++) {
      const columnId = columnIds[i];
      await this.updateColumn(columnId, { position: i });
    }
  }

  async getColumnsByBoard(boardId: string): Promise<Column[]> {
    return this.repository.findColumnsByBoardId(boardId);
  }

  // Card Management
  async createCard(boardId: string, columnId: string, request: CreateCardRequest, createdBy: string): Promise<Card> {
    const position = await this.getNextCardPosition(columnId);

    const cardData = {
      id: uuidv4(),
      boardId,
      columnId,
      ...request,
      position,
      status: this.getStatusFromColumn(columnId),
      createdBy,
      updatedBy: createdBy,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const card = await this.repository.createCard(cardData);

    // Cache the card
    this.cardCache.set(card.id, card);

    // Create activity
    await this.createActivity({
      boardId,
      cardId: card.id,
      userId: createdBy,
      action: 'created',
      entityType: 'card',
      entityId: card.id,
      newValues: cardData
    });

    // Emit event
    this.emitBoardEvent({
      type: 'card_created',
      cardId: card.id,
      boardId,
      columnId,
      data: card,
      userId: createdBy,
      timestamp: new Date()
    });

    return card;
  }

  async getCard(cardId: string): Promise<Card | null> {
    // Check cache first
    const cached = this.cardCache.get(cardId);
    if (cached) return cached;

    const card = await this.repository.findCardById(cardId);
    if (card) {
      this.cardCache.set(cardId, card);
    }
    return card;
  }

  async updateCard(cardId: string, request: UpdateCardRequest): Promise<Card> {
    const oldCard = await this.getCard(cardId);
    if (!oldCard) throw new Error('Card not found');

    const updatedCard = await this.repository.updateCard(cardId, {
      ...request,
      updatedAt: new Date()
    });

    // Update cache
    this.cardCache.set(cardId, updatedCard);

    // Create activity
    await this.createActivity({
      boardId: updatedCard.boardId,
      cardId: updatedCard.id,
      userId: updatedCard.updatedBy,
      action: 'updated',
      entityType: 'card',
      entityId: updatedCard.id,
      oldValues: oldCard,
      newValues: updatedCard
    });

    // Emit event
    this.emitBoardEvent({
      type: 'card_updated',
      cardId: updatedCard.id,
      boardId: updatedCard.boardId,
      columnId: updatedCard.columnId,
      data: updatedCard,
      userId: updatedCard.updatedBy,
      timestamp: new Date()
    });

    return updatedCard;
  }

  async deleteCard(cardId: string): Promise<void> {
    const card = await this.getCard(cardId);
    if (!card) throw new Error('Card not found');

    await this.repository.deleteCard(cardId);

    // Clear cache
    this.cardCache.delete(cardId);

    // Create activity
    await this.createActivity({
      boardId: card.boardId,
      cardId: card.id,
      userId: 'system',
      action: 'deleted',
      entityType: 'card',
      entityId: card.id
    });

    // Emit event
    this.emitBoardEvent({
      type: 'card_deleted',
      cardId,
      boardId: card.boardId,
      columnId: card.columnId,
      data: card,
      userId: 'system',
      timestamp: new Date()
    });
  }

  async moveCard(cardId: string, request: MoveCardRequest): Promise<Card> {
    const card = await this.getCard(cardId);
    if (!card) throw new Error('Card not found');

    const oldColumnId = card.columnId;
    const newPosition = request.targetPosition || await this.getNextCardPosition(request.targetColumnId);

    const updatedCard = await this.repository.updateCard(cardId, {
      columnId: request.targetColumnId,
      position: newPosition,
      swimlaneId: request.targetSwimlaneId,
      status: this.getStatusFromColumn(request.targetColumnId),
      updatedAt: new Date()
    });

    // Update cache
    this.cardCache.set(cardId, updatedCard);

    // Create activity
    await this.createActivity({
      boardId: updatedCard.boardId,
      cardId: updatedCard.id,
      userId: 'system',
      action: 'moved',
      entityType: 'card',
      entityId: updatedCard.id,
      oldValues: { columnId: oldColumnId },
      newValues: { columnId: request.targetColumnId }
    });

    // Emit event
    this.emitBoardEvent({
      type: 'card_moved',
      cardId: updatedCard.id,
      boardId: updatedCard.boardId,
      columnId: updatedCard.columnId,
      data: updatedCard,
      userId: 'system',
      timestamp: new Date()
    });

    return updatedCard;
  }

  async archiveCard(cardId: string): Promise<void> {
    await this.updateCard(cardId, {
      status: CardStatus.CANCELLED,
      completedAt: new Date()
    });
  }

  async restoreCard(cardId: string): Promise<Card> {
    return this.updateCard(cardId, {
      status: CardStatus.TODO,
      completedAt: undefined
    });
  }

  async duplicateCard(cardId: string, targetColumnId?: string): Promise<Card> {
    const originalCard = await this.getCard(cardId);
    if (!originalCard) throw new Error('Card not found');

    const columnId = targetColumnId || originalCard.columnId;

    return this.createCard(
      originalCard.boardId,
      columnId,
      {
        title: `${originalCard.title} (Copy)`,
        description: originalCard.description,
        type: originalCard.type,
        priority: originalCard.priority,
        assigneeIds: originalCard.assigneeIds,
        labels: originalCard.labels,
        dueDate: originalCard.dueDate,
        estimatedHours: originalCard.estimatedHours,
        customFields: originalCard.customFields
      },
      originalCard.createdBy
    );
  }

  async getCardsByBoard(boardId: string, query?: BoardQuery): Promise<Card[]> {
    return this.repository.findCardsByBoardId(boardId, query);
  }

  async getCardsByColumn(columnId: string): Promise<Card[]> {
    return this.repository.findCardsByColumnId(columnId);
  }

  async searchCards(boardId: string, query: string): Promise<Card[]> {
    return this.repository.searchCards(boardId, query);
  }

  // Comments
  async createComment(cardId: string, content: string, authorId: string, parentCommentId?: string): Promise<Comment> {
    const card = await this.getCard(cardId);
    if (!card) throw new Error('Card not found');

    const commentData = {
      id: uuidv4(),
      cardId,
      boardId: card.boardId,
      content,
      authorId,
      parentCommentId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const comment = await this.repository.createComment(commentData);

    // Create activity
    await this.createActivity({
      boardId: card.boardId,
      cardId,
      userId: authorId,
      action: 'commented',
      entityType: 'comment',
      entityId: comment.id
    });

    // Emit event
    this.emitBoardEvent({
      type: 'comment_created',
      commentId: comment.id,
      cardId,
      boardId: card.boardId,
      data: comment,
      userId: authorId,
      timestamp: new Date()
    });

    return comment;
  }

  async getCommentsByCard(cardId: string): Promise<Comment[]> {
    return this.repository.findCommentsByCardId(cardId);
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    const comment = await this.repository.updateComment(commentId, {
      content,
      isEdited: true,
      updatedAt: new Date()
    });

    return comment;
  }

  async deleteComment(commentId: string): Promise<void> {
    await this.repository.deleteComment(commentId);
  }

  async pinComment(commentId: string): Promise<Comment> {
    return this.repository.updateComment(commentId, {
      isPinned: true,
      updatedAt: new Date()
    });
  }

  async unpinComment(commentId: string): Promise<Comment> {
    return this.repository.updateComment(commentId, {
      isPinned: false,
      updatedAt: new Date()
    });
  }

  // Analytics
  async getBoardAnalytics(boardId: string, period: string): Promise<BoardAnalytics> {
    let analytics = await this.repository.findBoardAnalytics(boardId, period);

    if (!analytics) {
      analytics = await this.calculateBoardAnalytics(boardId, period);
      await this.repository.createBoardAnalytics(analytics);
    }

    return analytics;
  }

  async getBoardMetrics(boardId: string): Promise<{
    totalCards: number;
    completedCards: number;
    averageCycleTime: number;
    averageLeadTime: number;
    throughput: number;
    wipCount: number;
  }> {
    const cards = await this.getCardsByBoard(boardId);
    const completedCards = cards.filter(card => card.status === CardStatus.DONE);
    const inProgressCards = cards.filter(card => card.status === CardStatus.IN_PROGRESS);

    return {
      totalCards: cards.length,
      completedCards: completedCards.length,
      averageCycleTime: this.calculateAverageCycleTime(completedCards),
      averageLeadTime: this.calculateAverageLeadTime(completedCards),
      throughput: this.calculateThroughput(completedCards),
      wipCount: inProgressCards.length
    };
  }

  async getBoardActivity(boardId: string, days: number = 30): Promise<Activity[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.repository.findActivityByBoardId(boardId, 1000);
  }

  // Real-time Events
  subscribeToBoardEvents(boardId: string, callback: (event: BoardSystemEvent) => void): () => void {
    return this.eventBus.subscribeToBoard(boardId, callback);
  }

  emitBoardEvent(event: BoardSystemEvent): void {
    this.eventBus.emit(event);
  }

  // Helper Methods
  private async createDefaultColumns(boardId: string, boardType: string): Promise<void> {
    const defaultColumns = this.getDefaultColumnsForBoardType(boardType);

    for (let i = 0; i < defaultColumns.length; i++) {
      await this.createColumn(
        boardId,
        defaultColumns[i].name,
        defaultColumns[i].status,
        i
      );
    }
  }

  private getDefaultColumnsForBoardType(boardType: string): Array<{ name: string; status: string }> {
    switch (boardType) {
      case 'kanban':
        return [
          { name: 'Backlog', status: 'backlog' },
          { name: 'To Do', status: 'todo' },
          { name: 'In Progress', status: 'in_progress' },
          { name: 'Review', status: 'review' },
          { name: 'Done', status: 'done' }
        ];
      case 'scrum':
        return [
          { name: 'Product Backlog', status: 'backlog' },
          { name: 'Sprint Backlog', status: 'todo' },
          { name: 'In Development', status: 'in_progress' },
          { name: 'Testing', status: 'review' },
          { name: 'Done', status: 'done' }
        ];
      default:
        return [
          { name: 'To Do', status: 'todo' },
          { name: 'In Progress', status: 'in_progress' },
          { name: 'Done', status: 'done' }
        ];
    }
  }

  private async getNextCardPosition(columnId: string): Promise<number> {
    const cards = await this.repository.findCardsByColumnId(columnId);
    return cards.length > 0 ? Math.max(...cards.map(card => card.position)) + 1 : 0;
  }

  private getStatusFromColumn(columnId: string): CardStatus {
    // This is a simplified version - in practice, you'd fetch the column and get its status
    return CardStatus.TODO;
  }

  private async createActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
    return this.repository.createActivity({
      ...activity,
      id: uuidv4(),
      createdAt: new Date()
    });
  }

  private calculateAverageCycleTime(cards: Card[]): number {
    if (cards.length === 0) return 0;

    const totalTime = cards.reduce((sum, card) => {
      if (card.createdAt && card.completedAt) {
        return sum + (card.completedAt.getTime() - card.createdAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / cards.length / (1000 * 60 * 60 * 24); // Convert to days
  }

  private calculateAverageLeadTime(cards: Card[]): number {
    // Similar to cycle time but from creation to completion
    return this.calculateAverageCycleTime(cards);
  }

  private calculateThroughput(cards: Card[]): number {
    if (cards.length === 0) return 0;

    // Calculate cards completed per week
    const weeks = 4; // Default to 4 weeks
    return cards.length / weeks;
  }

  private async calculateBoardAnalytics(boardId: string, period: string): Promise<BoardAnalytics> {
    const cards = await this.getCardsByBoard(boardId);
    const completedCards = cards.filter(card => card.status === CardStatus.DONE);

    return {
      boardId,
      period: period as any,
      metrics: {
        totalCards: cards.length,
        completedCards: completedCards.length,
        averageCycleTime: this.calculateAverageCycleTime(completedCards),
        averageLeadTime: this.calculateAverageLeadTime(completedCards),
        throughput: this.calculateThroughput(completedCards),
        wipCount: cards.filter(card => card.status === CardStatus.IN_PROGRESS).length,
        burndown: [],
        velocity: [],
        cumulativeFlow: []
      },
      createdAt: new Date()
    };
  }

  private setupEventHandlers(): void {
    // Handle real-time collaboration events
    this.eventBus.subscribe('collaboration', (event: any) => {
      this.handleCollaborationEvent(event);
    });
  }

  private handleCollaborationEvent(event: any): void {
    // Handle cursor positions, selections, etc.
    switch (event.type) {
      case 'cursor_moved':
        this.updateCursorPosition(event.sessionId, event.userId, event.position);
        break;
      case 'selection_changed':
        this.updateSelection(event.sessionId, event.userId, event.selection);
        break;
    }
  }

  // Additional methods would be implemented for all other interface methods
  async startCollaborationSession(boardId: string, userIds: string[]): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      id: uuidv4(),
      boardId,
      userIds,
      isActive: true,
      cursorPositions: [],
      selections: [],
      startedAt: new Date()
    };

    this.activeSessions.set(session.id, session);
    return session;
  }

  async joinCollaborationSession(sessionId: string, userId: string): Promise<CollaborationSession> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    if (!session.userIds.includes(userId)) {
      session.userIds.push(userId);
    }

    return session;
  }

  async leaveCollaborationSession(sessionId: string, userId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.userIds = session.userIds.filter(id => id !== userId);

    if (session.userIds.length === 0) {
      this.activeSessions.delete(sessionId);
    }
  }

  async updateCursorPosition(sessionId: string, userId: string, position: { x: number; y: number; cardId?: string }): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const existingPosition = session.cursorPositions.find(p => p.userId === userId);
    if (existingPosition) {
      Object.assign(existingPosition, { x: position.x, y: position.y, cardId: position.cardId, timestamp: new Date() });
    } else {
      session.cursorPositions.push({
        userId,
        x: position.x,
        y: position.y,
        cardId: position.cardId,
        timestamp: new Date()
      });
    }
  }

  async updateSelection(sessionId: string, userId: string, selection: { type: string; entityId: string }): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    const existingSelection = session.selections.find(s => s.userId === userId);
    if (existingSelection) {
      Object.assign(existingSelection, { ...selection, timestamp: new Date() });
    } else {
      session.selections.push({
        userId,
        entityType: selection.type as any,
        entityId: selection.entityId,
        timestamp: new Date()
      });
    }
  }

  async getActiveCollaborationSessions(boardId: string): Promise<CollaborationSession[]> {
    return Array.from(this.activeSessions.values()).filter(session => session.boardId === boardId);
  }

  // Template Management
  async createBoardTemplate(request: {
    name: string;
    description?: string;
    category: string;
    boardId: string;
    isPublic?: boolean;
  }, authorId: string): Promise<BoardTemplate> {
    const board = await this.getBoard(request.boardId);
    if (!board) throw new Error('Board not found');

    const columns = await this.getColumnsByBoard(request.boardId);

    const templateData = {
      id: uuidv4(),
      name: request.name,
      description: request.description,
      category: request.category as any,
      type: board.type,
      isPublic: request.isPublic || false,
      isOfficial: false,
      authorId,
      tags: [],
      boardData: {
        columns: columns.map(col => ({
          name: col.name,
          description: col.description,
          status: col.status,
          settings: col.settings
        })),
        settings: board.settings,
        theme: board.theme,
        customFields: board.settings.customFields
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.repository.createBoardTemplate(templateData);
  }

  async getBoardTemplates(category?: string, search?: string): Promise<BoardTemplate[]> {
    return this.repository.findBoardTemplates(category, search);
  }

  async getBoardTemplate(templateId: string): Promise<BoardTemplate | null> {
    return this.repository.findBoardTemplateById(templateId);
  }

  async applyBoardTemplate(templateId: string, name: string, ownerId: string): Promise<Board> {
    const template = await this.getBoardTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const board = await this.createBoard({
      name,
      description: template.description,
      type: template.type,
      settings: template.boardData.settings,
      theme: template.boardData.theme
    }, ownerId);

    // Create columns from template
    for (let i = 0; i < template.boardData.columns.length; i++) {
      const columnData = template.boardData.columns[i];
      await this.createColumn(
        board.id,
        columnData.name,
        columnData.status,
        i
      );
    }

    // Update template usage count
    await this.repository.updateBoardTemplate(templateId, {
      usageCount: template.usageCount + 1
    });

    return board;
  }

  async deleteBoardTemplate(templateId: string): Promise<void> {
    await this.repository.deleteBoardTemplate(templateId);
  }

  async rateBoardTemplate(templateId: string, rating: number, userId: string): Promise<BoardTemplate> {
    const template = await this.getBoardTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const newRating = {
      average: ((template.rating.average * template.rating.count) + rating) / (template.rating.count + 1),
      count: template.rating.count + 1
    };

    return this.repository.updateBoardTemplate(templateId, {
      rating: newRating
    });
  }
}