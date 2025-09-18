// Moderation System Architecture Types
// ====================================

/**
 * Moderation severity levels
 */
export enum ModerationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Moderation content types
 */
export enum ModerationContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  USER_PROFILE = 'user_profile',
  COMMENT = 'comment',
  MESSAGE = 'message',
  POST = 'post',
  ATTACHMENT = 'attachment'
}

/**
 * Moderation categories
 */
export enum ModerationCategory {
  HATE_SPEECH = 'hate_speech',
  HARASSMENT = 'harassment',
  SPAM = 'spam',
  MISINFORMATION = 'misinformation',
  VIOLENCE = 'violence',
  ADULT_CONTENT = 'adult_content',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  PERSONAL_INFO = 'personal_info',
  THREATS = 'threats',
  SELF_HARM = 'self_harm',
  ILLEGAL_CONTENT = 'illegal_content',
  POLITICAL = 'political',
  RELIGIOUS = 'religious',
  CUSTOM = 'custom'
}

/**
 * Moderation actions
 */
export enum ModerationAction {
  ALLOW = 'allow',
  FLAG = 'flag',
  REVIEW = 'review',
  BLOCK = 'block',
  REMOVE = 'remove',
  SUSPEND = 'suspend',
  BAN = 'ban',
  QUARANTINE = 'quarantine',
  ESCALATE = 'escalate'
}

/**
 * Moderation status
 */
export enum ModerationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
  APPEALED = 'appealed',
  CLOSED = 'closed'
}

/**
 * Moderation priority
 */
export enum ModerationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Moderation confidence score
 */
export interface ModerationConfidence {
  score: number; // 0-1
  confidence: 'low' | 'medium' | 'high';
  explanation?: string;
}

/**
 * Moderation rule condition
 */
export interface ModerationRuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
  caseSensitive?: boolean;
}

/**
 * Moderation rule
 */
export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  category: ModerationCategory;
  severity: ModerationSeverity;
  conditions: ModerationRuleCondition[];
  action: ModerationAction;
  priority: ModerationPriority;
  enabled: boolean;
  autoApply: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Moderation policy
 */
export interface ModerationPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: ModerationRule[];
  settings: {
    autoModeration: boolean;
    humanReviewRequired: boolean;
    escalationEnabled: boolean;
    appealProcessEnabled: boolean;
    retentionPeriod: number; // days
    maxReviewTime: number; // hours
    notificationEnabled: boolean;
  };
  complianceFrameworks: string[];
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
}

/**
 * Content analysis result
 */
export interface ModerationAnalysis {
  id: string;
  contentId: string;
  contentType: ModerationContentType;
  category: ModerationCategory;
  severity: ModerationSeverity;
  confidence: ModerationConfidence;
  action: ModerationAction;
  status: ModerationStatus;
  score: number; // 0-1 overall score
  flags: ModerationFlag[];
  suggestions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  processedAt: Date;
  processingTime: number; // ms
}

/**
 * Moderation flag
 */
export interface ModerationFlag {
  id: string;
  type: string;
  category: ModerationCategory;
  severity: ModerationSeverity;
  message: string;
  evidence: string[];
  confidence: ModerationConfidence;
  metadata?: Record<string, any>;
}

/**
 * User report
 */
export interface UserReport {
  id: string;
  reporterId: string;
  reportedUserId?: string;
  contentId: string;
  contentType: ModerationContentType;
  reason: string;
  category: ModerationCategory;
  description: string;
  evidence: string[];
  severity: ModerationSeverity;
  status: ModerationStatus;
  priority: ModerationPriority;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolution?: {
    action: ModerationAction;
    reason: string;
    resolvedBy: string;
    resolvedAt: Date;
  };
}

/**
 * Moderation queue item
 */
export interface ModerationQueueItem {
  id: string;
  contentId: string;
  contentType: ModerationContentType;
  analysis: ModerationAnalysis;
  report?: UserReport;
  priority: ModerationPriority;
  status: ModerationStatus;
  assignedTo?: string;
  assignedAt?: Date;
  dueDate?: Date;
  createdAt: Date;
  escalated?: boolean;
  escalationLevel?: number;
}

/**
 * Moderation decision
 */
export interface ModerationDecision {
  id: string;
  contentId: string;
  analysisId: string;
  moderatorId: string;
  action: ModerationAction;
  reason: string;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  reviewTime: number; // ms
  confidence?: number; // moderator confidence 0-1
}

/**
 * Moderation appeal
 */
export interface ModerationAppeal {
  id: string;
  decisionId: string;
  appellantId: string;
  reason: string;
  description: string;
  evidence: string[];
  status: ModerationStatus;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolution?: {
    action: 'uphold' | 'reverse' | 'modify';
    reason: string;
    resolvedBy: string;
    resolvedAt: Date;
    newAction?: ModerationAction;
  };
}

/**
 * Moderation statistics
 */
export interface ModerationStats {
  totalContent: number;
  totalReports: number;
  pendingReviews: number;
  averageReviewTime: number;
  accuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  topCategories: Array<{
    category: ModerationCategory;
    count: number;
    percentage: number;
  }>;
  topActions: Array<{
    action: ModerationAction;
    count: number;
    percentage: number;
  }>;
  moderatorStats: Array<{
    moderatorId: string;
    decisionsCount: number;
    averageTime: number;
    accuracy: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Moderation event
 */
export interface ModerationEvent {
  id: string;
  type: 'content_submitted' | 'analysis_completed' | 'flagged' | 'reported' | 'reviewed' | 'appealed' | 'resolved';
  contentId: string;
  contentType: ModerationContentType;
  userId?: string;
  data: Record<string, any>;
  timestamp: Date;
  severity?: ModerationSeverity;
  category?: ModerationCategory;
}

/**
 * Moderation filters
 */
export interface ModerationFilters {
  contentTypes?: ModerationContentType[];
  categories?: ModerationCategory[];
  severities?: ModerationSeverity[];
  statuses?: ModerationStatus[];
  priorities?: ModerationPriority[];
  actions?: ModerationAction[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  userIds?: string[];
  tags?: string[];
  search?: string;
}

/**
 * Moderation configuration
 */
export interface ModerationConfig {
  enabled: boolean;
  autoModeration: boolean;
  humanReviewRequired: boolean;
  appealProcessEnabled: boolean;
  escalationEnabled: boolean;
  notifications: {
    enabled: boolean;
    channels: ('email' | 'in_app' | 'webhook' | 'sms')[];
    templates: {
      flag?: string;
      report?: string;
      escalation?: string;
      resolution?: string;
    };
  };
  retention: {
    contentDays: number;
    reportDays: number;
    decisionDays: number;
    appealDays: number;
  };
  performance: {
    maxConcurrentAnalysis: number;
    analysisTimeout: number; // ms
    queueSize: number;
  };
  integrations: {
    aiProviders: string[];
    storageProvider?: string;
    notificationProvider?: string;
    analyticsProvider?: string;
  };
  security: {
    encryptSensitiveData: boolean;
    auditLogEnabled: boolean;
    rateLimiting: {
      enabled: boolean;
      requestsPerMinute: number;
    };
  };
}

/**
 * Moderation service interface
 */
export interface IModerationService {
  // Content analysis
  analyzeContent(content: any, type: ModerationContentType): Promise<ModerationAnalysis>;
  analyzeText(text: string): Promise<ModerationAnalysis>;
  analyzeImage(imageData: Buffer | string): Promise<ModerationAnalysis>;

  // Policy management
  createPolicy(policy: Omit<ModerationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationPolicy>;
  updatePolicy(id: string, policy: Partial<ModerationPolicy>): Promise<ModerationPolicy>;
  deletePolicy(id: string): Promise<void>;
  getPolicy(id: string): Promise<ModerationPolicy>;
  listPolicies(): Promise<ModerationPolicy[]>;

  // Rule management
  createRule(rule: Omit<ModerationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationRule>;
  updateRule(id: string, rule: Partial<ModerationRule>): Promise<ModerationRule>;
  deleteRule(id: string): Promise<void>;
  getRule(id: string): Promise<ModerationRule>;
  listRules(filters?: ModerationFilters): Promise<ModerationRule[]>;

  // Queue management
  getQueue(filters?: ModerationFilters): Promise<ModerationQueueItem[]>;
  assignToModerator(queueItemId: string, moderatorId: string): Promise<void>;
  escalateItem(queueItemId: string, reason: string): Promise<void>;

  // Decision making
  makeDecision(decision: Omit<ModerationDecision, 'id' | 'createdAt'>): Promise<ModerationDecision>;
  getDecision(id: string): Promise<ModerationDecision>;
  listDecisions(filters?: ModerationFilters): Promise<ModerationDecision[]>;

  // Reports and appeals
  createReport(report: Omit<UserReport, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<UserReport>;
  updateReport(id: string, report: Partial<UserReport>): Promise<UserReport>;
  getReport(id: string): Promise<UserReport>;
  listReports(filters?: ModerationFilters): Promise<UserReport[]>;

  createAppeal(appeal: Omit<ModerationAppeal, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ModerationAppeal>;
  updateAppeal(id: string, appeal: Partial<ModerationAppeal>): Promise<ModerationAppeal>;
  getAppeal(id: string): Promise<ModerationAppeal>;
  listAppeals(filters?: ModerationFilters): Promise<ModerationAppeal[]>;

  // Analytics
  getStats(timeRange?: { start: Date; end: Date }): Promise<ModerationStats>;
  getEvents(filters?: ModerationFilters): Promise<ModerationEvent[]>;

  // Configuration
  getConfig(): Promise<ModerationConfig>;
  updateConfig(config: Partial<ModerationConfig>): Promise<void>;
}

/**
 * Moderation engine interface
 */
export interface IModerationEngine {
  processContent(content: any, type: ModerationContentType): Promise<ModerationAnalysis>;
  applyRules(content: any, rules: ModerationRule[]): Promise<ModerationAnalysis>;
  evaluateCondition(content: any, condition: ModerationRuleCondition): Promise<boolean>;
  calculateScore(analysis: ModerationAnalysis): number;
  determineAction(analysis: ModerationAnalysis): ModerationAction;
}

/**
 * AI provider interface for content analysis
 */
export interface IModerationAIProvider {
  analyzeText(text: string): Promise<ModerationAnalysis>;
  analyzeImage(imageData: Buffer | string): Promise<ModerationAnalysis>;
  analyzeVideo(videoData: Buffer | string): Promise<ModerationAnalysis>;
  isAvailable(): Promise<boolean>;
  getCapabilities(): Promise<{
    text: boolean;
    image: boolean;
    video: boolean;
    audio: boolean;
  }>;
}

/**
 * Storage interface for moderation data
 */
export interface IModerationStorage {
  saveAnalysis(analysis: ModerationAnalysis): Promise<void>;
  getAnalysis(id: string): Promise<ModerationAnalysis>;
  saveDecision(decision: ModerationDecision): Promise<void>;
  getDecision(id: string): Promise<ModerationDecision>;
  saveReport(report: UserReport): Promise<void>;
  getReport(id: string): Promise<UserReport>;
  saveAppeal(appeal: ModerationAppeal): Promise<void>;
  getAppeal(id: string): Promise<ModerationAppeal>;
  saveEvent(event: ModerationEvent): Promise<void>;
  getEvents(filters: ModerationFilters): Promise<ModerationEvent[]>;
  getStats(timeRange: { start: Date; end: Date }): Promise<ModerationStats>;
}

/**
 * Notification interface
 */
export interface IModerationNotifier {
  notifyFlag(analysis: ModerationAnalysis): Promise<void>;
  notifyReport(report: UserReport): Promise<void>;
  notifyEscalation(queueItem: ModerationQueueItem): Promise<void>;
  notifyResolution(decision: ModerationDecision): Promise<void>;
  notifyAppeal(appeal: ModerationAppeal): Promise<void>;
}

/**
 * Audit logging interface
 */
export interface IModerationAudit {
  logAction(action: string, data: Record<string, any>, userId?: string): Promise<void>;
  getAuditLogs(filters: ModerationFilters): Promise<Array<{
    id: string;
    action: string;
    data: Record<string, any>;
    userId?: string;
    timestamp: Date;
  }>>;
}