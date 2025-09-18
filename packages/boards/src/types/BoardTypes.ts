import { z } from 'zod';

// Core Board Types
export enum BoardType {
  KANBAN = 'kanban',
  SCRUM = 'scrum',
  LIST = 'list',
  CALENDAR = 'calendar',
  TIMELINE = 'timeline',
  MINDMAP = 'mindmap',
  GANTT = 'gantt',
  CUSTOM = 'custom'
}

export enum BoardStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  TEMPLATE = 'template',
  DRAFT = 'draft'
}

export enum CardStatus {
  BACKLOG = 'backlog',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TaskType {
  TASK = 'task',
  BUG = 'bug',
  FEATURE = 'feature',
  EPIC = 'epic',
  STORY = 'story',
  SUBTASK = 'subtask'
}

// Base Schemas
const BaseBoardSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  type: z.nativeEnum(BoardType),
  status: z.nativeEnum(BoardStatus).default(BoardStatus.ACTIVE),
  ownerId: z.string(),
  memberIds: z.array(z.string()).default([]),
  settings: z.object({
    isPublic: z.boolean().default(false),
    allowComments: z.boolean().default(true),
    allowAttachments: z.boolean().default(true),
    allowVoting: z.boolean().default(false),
    enableNotifications: z.boolean().default(true),
    enableAnalytics: z.boolean().default(true),
    enableCollaboration: z.boolean().default(true),
    customFields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['text', 'number', 'date', 'select', 'multiselect', 'boolean', 'user']),
      required: z.boolean().default(false),
      options: z.array(z.string()).optional(),
      defaultValue: z.any().optional()
    })).default([])
  }).default({}),
  theme: z.object({
    primaryColor: z.string().default('#3B82F6'),
    secondaryColor: z.string().default('#10B981'),
    backgroundColor: z.string().default('#F9FAFB'),
    textColor: z.string().default('#111827'),
    borderColor: z.string().default('#E5E7EB'),
    cardStyle: z.enum(['default', 'compact', 'detailed', 'minimal']).default('default'),
    columnStyle: z.enum(['default', 'minimal', 'cards', 'list']).default('default')
  }).default({}),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
  archivedAt: z.date().optional(),
  templateId: z.string().optional()
});

// Column Schema
const ColumnSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  status: z.nativeEnum(CardStatus),
  position: z.number().min(0),
  settings: z.object({
    wipLimit: z.number().min(0).optional(),
    color: z.string().optional(),
    isCollapsed: z.boolean().default(false),
    allowCards: z.boolean().default(true),
    autoArchive: z.boolean().default(false),
    swimlanes: z.array(z.object({
      id: z.string(),
      name: z.string(),
      position: z.number(),
      color: z.string().optional()
    })).default([])
  }).default({}),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date())
});

// Card Schema
const CardSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  columnId: z.string(),
  swimlaneId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  type: z.nativeEnum(TaskType).default(TaskType.TASK),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  status: z.nativeEnum(CardStatus).default(CardStatus.TODO),
  position: z.number().min(0),
  assigneeIds: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    size: z.number(),
    type: z.string(),
    uploadedBy: z.string(),
    uploadedAt: z.date()
  })).default([]),
  checklists: z.array(z.object({
    id: z.string(),
    title: z.string(),
    items: z.array(z.object({
      id: z.string(),
      text: z.string(),
      completed: z.boolean().default(false),
      assigneeId: z.string().optional(),
      dueDate: z.date().optional()
    })),
    position: z.number()
  })).default([]),
  customFields: z.record(z.any()).default({}),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  parentCardId: z.string().optional(),
  childCardIds: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  voters: z.array(z.object({
    userId: z.string(),
    vote: z.enum(['up', 'down']),
    votedAt: z.date()
  })).default([]),
  watchers: z.array(z.string()).default([]),
  createdBy: z.string(),
  updatedBy: z.string(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date())
});

// Comment Schema
const CommentSchema = z.object({
  id: z.string(),
  cardId: z.string(),
  boardId: z.string(),
  content: z.string().min(1).max(5000),
  authorId: z.string(),
  parentCommentId: z.string().optional(),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    size: z.number(),
    type: z.string()
  })).default([]),
  reactions: z.array(z.object({
    emoji: z.string(),
    userId: z.string(),
    reactedAt: z.date()
  })).default([]),
  isEdited: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date())
});

// Activity Schema
const ActivitySchema = z.object({
  id: z.string(),
  boardId: z.string(),
  cardId: z.string().optional(),
  userId: z.string(),
  action: z.enum(['created', 'updated', 'moved', 'commented', 'assigned', 'completed', 'archived', 'restored', 'deleted']),
  entityType: z.enum(['board', 'column', 'card', 'comment', 'attachment']),
  entityId: z.string(),
  oldValues: z.record(z.any()).optional(),
  newValues: z.record(z.any()).optional(),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().default(new Date())
});

// Board View Schema
const BoardViewSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  name: z.string().min(1).max(50),
  type: z.enum(['kanban', 'list', 'calendar', 'timeline', 'gantt', 'mindmap']),
  filters: z.object({
    assignees: z.array(z.string()).default([]),
    labels: z.array(z.string()).default([]),
    priorities: z.array(z.nativeEnum(TaskPriority)).default([]),
    types: z.array(z.nativeEnum(TaskType)).default([]),
    status: z.array(z.nativeEnum(CardStatus)).default([]),
    dueDate: z.object({
      from: z.date().optional(),
      to: z.date().optional()
    }).optional(),
    customFields: z.record(z.any()).default({})
  }).default({}),
  sorts: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).default([]),
  grouping: z.object({
    field: z.string().optional(),
    direction: z.enum(['asc', 'desc']).default('asc')
  }).default({}),
  isDefault: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  settings: z.record(z.any()).default({}),
  createdBy: z.string(),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date())
});

// Board Template Schema
const BoardTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(['project-management', 'software-development', 'marketing', 'sales', 'hr', 'operations', 'personal', 'custom']),
  type: z.nativeEnum(BoardType),
  isPublic: z.boolean().default(true),
  isOfficial: z.boolean().default(false),
  authorId: z.string(),
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().optional(),
  usageCount: z.number().default(0),
  rating: z.object({
    average: z.number().min(0).max(5).default(0),
    count: z.number().min(0).default(0)
  }).default({}),
  boardData: z.object({
    columns: z.array(z.object({
      name: z.string(),
      description: z.string().optional(),
      status: z.nativeEnum(CardStatus),
      settings: z.record(z.any()).optional()
    })),
    settings: z.record(z.any()).optional(),
    theme: z.record(z.any()).optional(),
    customFields: z.array(z.record(z.any())).optional()
  }),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date())
});

// Collaboration Schema
const CollaborationSessionSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  userIds: z.array(z.string()),
  isActive: z.boolean().default(true),
  cursorPositions: z.array(z.object({
    userId: z.string(),
    cardId: z.string().optional(),
    x: z.number(),
    y: z.number(),
    timestamp: z.date()
  })).default([]),
  selections: z.array(z.object({
    userId: z.string(),
    entityType: z.enum(['card', 'column', 'comment']),
    entityId: z.string(),
    timestamp: z.date()
  })).default([]),
  startedAt: z.date().default(new Date()),
  endedAt: z.date().optional()
});

// Analytics Schema
const BoardAnalyticsSchema = z.object({
  boardId: z.string(),
  period: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
  metrics: z.object({
    totalCards: z.number().default(0),
    completedCards: z.number().default(0),
    averageCycleTime: z.number().default(0),
    averageLeadTime: z.number().default(0),
    throughput: z.number().default(0),
    wipCount: z.number().default(0),
    burndown: z.array(z.object({
      date: z.date(),
      planned: z.number(),
      actual: z.number()
    })).default([]),
    velocity: z.array(z.object({
      period: z.string(),
      completed: z.number(),
      planned: z.number()
    })).default([]),
    cumulativeFlow: z.array(z.object({
      date: z.date(),
      backlog: z.number(),
      todo: z.number(),
      inProgress: z.number(),
      review: z.number(),
      done: z.number()
    })).default([])
  }),
  createdAt: z.date().default(new Date())
});

// Export types
export interface Board extends z.infer<typeof BaseBoardSchema> {}
export interface Column extends z.infer<typeof ColumnSchema> {}
export interface Card extends z.infer<typeof CardSchema> {}
export interface Comment extends z.infer<typeof CommentSchema> {}
export interface Activity extends z.infer<typeof ActivitySchema> {}
export interface BoardView extends z.infer<typeof BoardViewSchema> {}
export interface BoardTemplate extends z.infer<typeof BoardTemplateSchema> {}
export interface CollaborationSession extends z.infer<typeof CollaborationSessionSchema> {}
export interface BoardAnalytics extends z.infer<typeof BoardAnalyticsSchema> {}

// Request/Response types
export interface CreateBoardRequest {
  name: string;
  description?: string;
  type: BoardType;
  templateId?: string;
  settings?: Partial<Board['settings']>;
  theme?: Partial<Board['theme']>;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
  settings?: Partial<Board['settings']>;
  theme?: Partial<Board['theme']>;
  memberIds?: string[];
}

export interface CreateCardRequest {
  title: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  assigneeIds?: string[];
  labels?: string[];
  dueDate?: Date;
  estimatedHours?: number;
  customFields?: Record<string, any>;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  assigneeIds?: string[];
  labels?: string[];
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  customFields?: Record<string, any>;
}

export interface MoveCardRequest {
  targetColumnId: string;
  targetPosition?: number;
  targetSwimlaneId?: string;
}

export interface BoardFilters {
  assignees?: string[];
  labels?: string[];
  priorities?: TaskPriority[];
  types?: TaskType[];
  status?: CardStatus[];
  dueDate?: {
    from?: Date;
    to?: Date;
  };
  search?: string;
  customFields?: Record<string, any>;
}

export interface BoardQuery {
  boardId: string;
  filters?: BoardFilters;
  sorts?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  pagination?: {
    page: number;
    limit: number;
  };
}

// Validation schemas
export const CreateBoardSchema = BaseBoardSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true
});

export const UpdateBoardSchema = BaseBoardSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  ownerId: true,
  type: true
});

export const CreateCardSchema = CardSchema.omit({
  id: true,
  boardId: true,
  columnId: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  createdBy: true,
  updatedBy: true
});

export const UpdateCardSchema = CardSchema.partial().omit({
  id: true,
  boardId: true,
  columnId: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  createdBy: true,
  updatedBy: true
});

export const CreateCommentSchema = CommentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const CreateBoardViewSchema = BoardViewSchema.omit({
  id: true,
  boardId: true,
  createdAt: true,
  updatedAt: true
});

export const CreateBoardTemplateSchema = BoardTemplateSchema.omit({
  id: true,
  usageCount: true,
  createdAt: true,
  updatedAt: true
});

// Event types for real-time updates
export interface BoardEvent {
  type: 'board_created' | 'board_updated' | 'board_deleted' | 'board_archived';
  boardId: string;
  data: Board;
  userId: string;
  timestamp: Date;
}

export interface CardEvent {
  type: 'card_created' | 'card_updated' | 'card_moved' | 'card_deleted' | 'card_completed';
  cardId: string;
  boardId: string;
  columnId: string;
  data: Card;
  userId: string;
  timestamp: Date;
}

export interface CommentEvent {
  type: 'comment_created' | 'comment_updated' | 'comment_deleted';
  commentId: string;
  cardId: string;
  boardId: string;
  data: Comment;
  userId: string;
  timestamp: Date;
}

export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'cursor_moved' | 'selection_changed';
  sessionId: string;
  boardId: string;
  userId: string;
  data: any;
  timestamp: Date;
}

export type BoardSystemEvent = BoardEvent | CardEvent | CommentEvent | CollaborationEvent;