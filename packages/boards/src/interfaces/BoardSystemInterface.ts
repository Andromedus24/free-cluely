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

export interface BoardSystemInterface {
  // Board Management
  createBoard(request: CreateBoardRequest, ownerId: string): Promise<Board>;
  getBoard(boardId: string): Promise<Board | null>;
  updateBoard(boardId: string, request: UpdateBoardRequest): Promise<Board>;
  deleteBoard(boardId: string): Promise<void>;
  archiveBoard(boardId: string): Promise<void>;
  restoreBoard(boardId: string): Promise<Board>;
  duplicateBoard(boardId: string, newName: string): Promise<Board>;
  getBoardsByUser(userId: string, filters?: BoardFilters): Promise<Board[]>;
  searchBoards(query: string, userId?: string): Promise<Board[]>;

  // Column Management
  createColumn(boardId: string, name: string, status: string, position?: number): Promise<Column>;
  updateColumn(columnId: string, updates: Partial<Column>): Promise<Column>;
  deleteColumn(columnId: string): Promise<void>;
  reorderColumns(boardId: string, columnIds: string[]): Promise<void>;
  getColumnsByBoard(boardId: string): Promise<Column[]>;

  // Card Management
  createCard(boardId: string, columnId: string, request: CreateCardRequest, createdBy: string): Promise<Card>;
  getCard(cardId: string): Promise<Card | null>;
  updateCard(cardId: string, request: UpdateCardRequest): Promise<Card>;
  deleteCard(cardId: string): Promise<void>;
  moveCard(cardId: string, request: MoveCardRequest): Promise<Card>;
  archiveCard(cardId: string): Promise<void>;
  restoreCard(cardId: string): Promise<Card>;
  duplicateCard(cardId: string, targetColumnId?: string): Promise<Card>;
  getCardsByBoard(boardId: string, query?: BoardQuery): Promise<Card[]>;
  getCardsByColumn(columnId: string): Promise<Card[]>;
  searchCards(boardId: string, query: string): Promise<Card[]>;

  // Card Hierarchy
  createSubtask(parentCardId: string, request: CreateCardRequest, createdBy: string): Promise<Card>;
  getSubtasks(parentCardId: string): Promise<Card[]>;
  updateCardHierarchy(cardId: string, parentCardId?: string): Promise<Card>;
  getCardDependencies(cardId: string): Promise<Card[]>;
  addCardDependency(cardId: string, dependencyId: string): Promise<void>;
  removeCardDependency(cardId: string, dependencyId: string): Promise<void>;

  // Comments
  createComment(cardId: string, content: string, authorId: string, parentCommentId?: string): Promise<Comment>;
  getCommentsByCard(cardId: string): Promise<Comment[]>;
  updateComment(commentId: string, content: string): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
  pinComment(commentId: string): Promise<Comment>;
  unpinComment(commentId: string): Promise<Comment>;

  // Attachments
  addCardAttachment(cardId: string, attachment: {
    name: string;
    url: string;
    size: number;
    type: string;
  }, uploadedBy: string): Promise<Card>;
  removeCardAttachment(cardId: string, attachmentId: string): Promise<Card>;
  getCardAttachments(cardId: string): Promise<Card['attachments']>;

  // Checklists
  addCardChecklist(cardId: string, title: string): Promise<Card>;
  updateCardChecklist(cardId: string, checklistId: string, updates: any): Promise<Card>;
  deleteCardChecklist(cardId: string, checklistId: string): Promise<Card>;
  addChecklistItem(cardId: string, checklistId: string, text: string): Promise<Card>;
  updateChecklistItem(cardId: string, checklistId: string, itemId: string, updates: any): Promise<Card>;
  deleteChecklistItem(cardId: string, checklistId: string, itemId: string): Promise<Card>;

  // Labels
  createBoardLabel(boardId: string, name: string, color: string): Promise<Board>;
  updateBoardLabel(boardId: string, labelId: string, updates: any): Promise<Board>;
  deleteBoardLabel(boardId: string, labelId: string): Promise<Board>;
  getBoardLabels(boardId: string): Promise<string[]>;

  // Views
  createBoardView(boardId: string, name: string, type: string): Promise<BoardView>;
  getBoardViews(boardId: string): Promise<BoardView[]>;
  updateBoardView(viewId: string, updates: any): Promise<BoardView>;
  deleteBoardView(viewId: string): Promise<void>;
  setDefaultBoardView(boardId: string, viewId: string): Promise<void>;

  // Templates
  createBoardTemplate(request: {
    name: string;
    description?: string;
    category: string;
    boardId: string;
    isPublic?: boolean;
  }, authorId: string): Promise<BoardTemplate>;
  getBoardTemplates(category?: string, search?: string): Promise<BoardTemplate[]>;
  getBoardTemplate(templateId: string): Promise<BoardTemplate | null>;
  applyBoardTemplate(templateId: string, name: string, ownerId: string): Promise<Board>;
  deleteBoardTemplate(templateId: string): Promise<void>;
  rateBoardTemplate(templateId: string, rating: number, userId: string): Promise<BoardTemplate>;

  // Collaboration
  startCollaborationSession(boardId: string, userIds: string[]): Promise<CollaborationSession>;
  joinCollaborationSession(sessionId: string, userId: string): Promise<CollaborationSession>;
  leaveCollaborationSession(sessionId: string, userId: string): Promise<void>;
  updateCursorPosition(sessionId: string, userId: string, position: { x: number; y: number; cardId?: string }): Promise<void>;
  updateSelection(sessionId: string, userId: string, selection: { type: string; entityId: string }): Promise<void>;
  getActiveCollaborationSessions(boardId: string): Promise<CollaborationSession[]>;

  // Analytics
  getBoardAnalytics(boardId: string, period: string): Promise<BoardAnalytics>;
  getBoardMetrics(boardId: string): Promise<{
    totalCards: number;
    completedCards: number;
    averageCycleTime: number;
    averageLeadTime: number;
    throughput: number;
    wipCount: number;
  }>;
  getBoardActivity(boardId: string, days?: number): Promise<Activity[]>;
  getUserProductivity(userId: string, boardId?: string, period?: string): Promise<any>;
  getBoardBurndown(boardId: string, startDate: Date, endDate: Date): Promise<any>;
  getBoardVelocity(boardId: string, periods?: number): Promise<any>;
  getCumulativeFlow(boardId: string, startDate: Date, endDate: Date): Promise<any>;

  // Real-time Events
  subscribeToBoardEvents(boardId: string, callback: (event: BoardSystemEvent) => void): () => void;
  emitBoardEvent(event: BoardSystemEvent): void;
  broadcastCollaborationEvent(sessionId: string, event: CollaborationEvent): void;

  // Search and Filtering
  searchCardsAdvanced(boardId: string, filters: BoardFilters): Promise<Card[]>;
  getBoardStatistics(boardId: string): Promise<any>;
  getCardHistory(cardId: string): Promise<Activity[]>;
  getUserActivity(userId: string, boardId?: string, limit?: number): Promise<Activity[]>;

  // Bulk Operations
  bulkMoveCards(cardIds: string[], targetColumnId: string): Promise<void>;
  bulkUpdateCards(cardIds: string[], updates: Partial<Card>): Promise<void>;
  bulkDeleteCards(cardIds: string[]): Promise<void>;
  bulkArchiveCards(cardIds: string[]): Promise<void>;

  // Import/Export
  exportBoardData(boardId: string, format: 'json' | 'csv' | 'excel'): Promise<any>;
  importBoardData(data: any, format: 'json' | 'csv' | 'excel', ownerId: string): Promise<Board>;
  exportBoardTemplate(boardId: string): Promise<BoardTemplate>;

  // Settings and Configuration
  updateBoardSettings(boardId: string, settings: Partial<Board['settings']>): Promise<Board>;
  updateBoardTheme(boardId: string, theme: Partial<Board['theme']>): Promise<Board>;
  getBoardSettings(boardId: string): Promise<Board['settings']>;
  getBoardTheme(boardId: string): Promise<Board['theme']>;

  // Permissions and Access
  addBoardMember(boardId: string, userId: string, role?: string): Promise<Board>;
  removeBoardMember(boardId: string, userId: string): Promise<Board>;
  updateBoardMemberRole(boardId: string, userId: string, role: string): Promise<Board>;
  getBoardMembers(boardId: string): Promise<Array<{ userId: string; role?: string; joinedAt: Date }>>;
  checkBoardAccess(boardId: string, userId: string, permission: string): Promise<boolean>;

  // Notifications
  subscribeToCardNotifications(cardId: string, userId: string): Promise<void>;
  unsubscribeFromCardNotifications(cardId: string, userId: string): Promise<void>;
  getCardNotifications(userId: string): Promise<any[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;

  // Webhooks
  createBoardWebhook(boardId: string, url: string, events: string[]): Promise<any>;
  updateBoardWebhook(webhookId: string, updates: any): Promise<any>;
  deleteBoardWebhook(webhookId: string): Promise<void>;
  getBoardWebhooks(boardId: string): Promise<any[]>;
  testBoardWebhook(webhookId: string): Promise<void>;

  // Automation
  createBoardAutomation(boardId: string, trigger: any, actions: any[]): Promise<any>;
  updateBoardAutomation(automationId: string, updates: any): Promise<any>;
  deleteBoardAutomation(automationId: string): Promise<void>;
  getBoardAutomations(boardId: string): Promise<any[]>;
  triggerBoardAutomation(boardId: string, triggerType: string, context: any): Promise<void>;

  // Integration
  connectBoardToIntegration(boardId: string, integrationType: string, config: any): Promise<any>;
  disconnectBoardFromIntegration(boardId: string, integrationId: string): Promise<void>;
  getBoardIntegrations(boardId: string): Promise<any[]>;
  syncBoardWithIntegration(boardId: string, integrationId: string): Promise<void>;
}

export interface BoardRepositoryInterface {
  // Board CRUD
  createBoard(board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): Promise<Board>;
  findBoardById(boardId: string): Promise<Board | null>;
  updateBoard(boardId: string, updates: Partial<Board>): Promise<Board>;
  deleteBoard(boardId: string): Promise<void>;
  findBoardsByUserId(userId: string, filters?: BoardFilters): Promise<Board[]>;
  searchBoards(query: string, userId?: string): Promise<Board[]>;

  // Column CRUD
  createColumn(column: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>): Promise<Column>;
  findColumnsByBoardId(boardId: string): Promise<Column[]>;
  updateColumn(columnId: string, updates: Partial<Column>): Promise<Column>;
  deleteColumn(columnId: string): Promise<void>;

  // Card CRUD
  createCard(card: Omit<Card, 'id' | 'createdAt' | 'updatedAt'>): Promise<Card>;
  findCardById(cardId: string): Promise<Card | null>;
  updateCard(cardId: string, updates: Partial<Card>): Promise<Card>;
  deleteCard(cardId: string): Promise<void>;
  findCardsByBoardId(boardId: string, query?: BoardQuery): Promise<Card[]>;
  findCardsByColumnId(columnId: string): Promise<Card[]>;
  searchCards(boardId: string, query: string): Promise<Card[]>;

  // Comments
  createComment(comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment>;
  findCommentsByCardId(cardId: string): Promise<Comment[]>;
  updateComment(commentId: string, updates: Partial<Comment>): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;

  // Activity
  createActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity>;
  findActivityByBoardId(boardId: string, limit?: number): Promise<Activity[]>;
  findActivityByCardId(cardId: string): Promise<Activity[]>;
  findActivityByUserId(userId: string, limit?: number): Promise<Activity[]>;

  // Views
  createBoardView(view: Omit<BoardView, 'id' | 'createdAt' | 'updatedAt'>): Promise<BoardView>;
  findViewsByBoardId(boardId: string): Promise<BoardView[]>;
  updateBoardView(viewId: string, updates: Partial<BoardView>): Promise<BoardView>;
  deleteBoardView(viewId: string): Promise<void>;

  // Templates
  createBoardTemplate(template: Omit<BoardTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>): Promise<BoardTemplate>;
  findBoardTemplateById(templateId: string): Promise<BoardTemplate | null>;
  findBoardTemplates(category?: string, search?: string): Promise<BoardTemplate[]>;
  updateBoardTemplate(templateId: string, updates: Partial<BoardTemplate>): Promise<BoardTemplate>;
  deleteBoardTemplate(templateId: string): Promise<void>;

  // Analytics
  createBoardAnalytics(analytics: Omit<BoardAnalytics, 'createdAt'>): Promise<BoardAnalytics>;
  findBoardAnalytics(boardId: string, period: string): Promise<BoardAnalytics | null>;
  updateBoardAnalytics(analyticsId: string, updates: Partial<BoardAnalytics>): Promise<BoardAnalytics>;

  // Collaboration
  createCollaborationSession(session: Omit<CollaborationSession, 'startedAt'>): Promise<CollaborationSession>;
  findCollaborationSessionById(sessionId: string): Promise<CollaborationSession | null>;
  findActiveSessionsByBoardId(boardId: string): Promise<CollaborationSession[]>;
  updateCollaborationSession(sessionId: string, updates: Partial<CollaborationSession>): Promise<CollaborationSession>;
  endCollaborationSession(sessionId: string): Promise<void>;

  // Bulk Operations
  bulkUpdateCards(cardIds: string[], updates: Partial<Card>): Promise<void>;
  bulkDeleteCards(cardIds: string[]): Promise<void>;

  // Transactions
  transaction<T>(operation: () => Promise<T>): Promise<T>;
}

export interface BoardEventBusInterface {
  emit(event: BoardSystemEvent): void;
  subscribe(eventType: string, callback: (event: BoardSystemEvent) => void): () => void;
  unsubscribe(eventType: string, callback: (event: BoardSystemEvent) => void): void;
  subscribeToBoard(boardId: string, callback: (event: BoardSystemEvent) => void): () => void;
  broadcastToBoard(boardId: string, event: BoardSystemEvent): void;
  getEventHistory(boardId: string, limit?: number): Promise<BoardSystemEvent[]>;
}

export interface BoardSecurityInterface {
  canAccessBoard(userId: string, boardId: string, permission: string): Promise<boolean>;
  canModifyCard(userId: string, cardId: string): Promise<boolean>;
  canViewCard(userId: string, cardId: string): Promise<boolean>;
  canCommentOnCard(userId: string, cardId: string): Promise<boolean>;
  canDeleteCard(userId: string, cardId: string): Promise<boolean>;
  canManageBoard(userId: string, boardId: string): Promise<boolean>;
  validateBoardAccess(boardId: string, userId: string): Promise<boolean>;
  enforceBoardPermission(boardId: string, userId: string, permission: string): Promise<boolean>;
  logSecurityEvent(event: {
    type: string;
    userId: string;
    boardId?: string;
    cardId?: string;
    action: string;
    metadata?: any;
  }): Promise<void>;
}