export interface TimelineEntry {
  id: string;
  type: JobType;
  status: JobStatus;
  title: string;
  description?: string;
  input: any;
  output?: any;
  artifacts?: Artifact[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  cost?: number;
  confidence?: number;
  priority?: Priority;
  parentId?: string;
  children?: string[];
  dependencies?: string[];
  workflowId?: string;
  userId?: string;
  sessionId?: string;
  retryCount: number;
  maxRetries: number;
  error?: JobError;
  progress?: number;
  estimatedDuration?: number;
  resourceUsage?: ResourceUsage;
}

export interface JobError {
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
}

export interface ResourceUsage {
  memory?: number;
  cpu?: number;
  tokens?: number;
  apiCalls?: number;
  networkRequests?: number;
}

export interface Artifact {
  id: string;
  type: ArtifactType;
  name: string;
  content: any;
  metadata: Record<string, any>;
  createdAt: Date;
  size?: number;
  mimeType?: string;
  url?: string;
}

export interface TimelineFilter {
  type?: JobType | JobType[];
  status?: JobStatus | JobStatus[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  dateFrom?: Date;
  dateTo?: Date;
  text?: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  parentId?: string;
  hasError?: boolean;
  hasArtifacts?: boolean;
  priority?: Priority | Priority[];
  costRange?: {
    min: number;
    max: number;
  };
  durationRange?: {
    min: number;
    max: number;
  };
  confidenceRange?: {
    min: number;
    max: number;
  };
}

export interface TimelineSort {
  field: SortField;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  cursor?: string;
  limit: number;
  includeTotal?: boolean;
}

export interface TimelineQuery {
  filter?: TimelineFilter;
  sort?: TimelineSort[];
  pagination?: PaginationOptions;
  fields?: string[];
  aggregations?: Aggregation[];
}

export interface Aggregation {
  field: string;
  operation: AggregationOperation;
  groupBy?: string[];
}

export interface TimelineResponse {
  entries: TimelineEntry[];
  pagination: {
    cursor?: string;
    hasNext: boolean;
    hasPrevious: boolean;
    total?: number;
    limit: number;
  };
  aggregations?: Record<string, any>;
  metadata: {
    queryTime: number;
    cacheHit: boolean;
    filters: TimelineFilter;
    sort: TimelineSort[];
  };
}

export interface SearchQuery {
  text: string;
  filter?: TimelineFilter;
  fuzzy?: boolean;
  semantic?: boolean;
  highlight?: boolean;
  fields?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  entries: TimelineEntry[];
  highlights: Record<string, string[]>;
  scores: Record<string, number>;
  total: number;
  queryTime: number;
  suggestions?: string[];
}

export interface ExportOptions {
  format: ExportFormat;
  filter?: TimelineFilter;
  fields?: string[];
  template?: string;
  includeArtifacts?: boolean;
  includeMetadata?: boolean;
  compression?: boolean;
  encryption?: {
    enabled: boolean;
    key?: string;
  };
}

export interface ExportJob {
  id: string;
  status: ExportStatus;
  format: ExportFormat;
  filter: TimelineFilter;
  options: ExportOptions;
  progress: number;
  fileSize?: number;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TimelineSubscription {
  id: string;
  filter: TimelineFilter;
  callback: (entries: TimelineEntry[]) => void;
  isActive: boolean;
  createdAt: Date;
  lastEventAt?: Date;
}

export interface JobOperation {
  id: string;
  operation: JobOperationType;
  payload?: any;
  scheduledAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TimelineAnalytics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageDuration: number;
  totalCost: number;
  averageCost: number;
  jobsByType: Record<JobType, number>;
  jobsByStatus: Record<JobStatus, number>;
  jobsByDay: Array<{ date: string; count: number }>;
  topTags: Array<{ tag: string; count: number }>;
  errorRates: Record<string, number>;
  performanceMetrics: {
    avgQueryTime: number;
    cacheHitRate: number;
    p95QueryTime: number;
  };
}

export interface WorkflowInstance {
  id: string;
  name: string;
  status: WorkflowStatus;
  jobs: string[];
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  metadata: Record<string, any>;
}

export interface MaterializedView {
  name: string;
  query: TimelineQuery;
  refreshInterval?: number;
  lastRefresh?: Date;
  isStale: boolean;
  data: any[];
}

// Type aliases and enums
export type JobType =
  | 'chat'
  | 'search'
  | 'analysis'
  | 'generation'
  | 'processing'
  | 'export'
  | 'workflow'
  | 'plugin'
  | 'system';

export type JobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused'
  | 'retrying';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ArtifactType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'code'
  | 'data'
  | 'log';

export type SortField =
  | 'createdAt'
  | 'updatedAt'
  | 'startedAt'
  | 'completedAt'
  | 'duration'
  | 'cost'
  | 'confidence'
  | 'priority'
  | 'title'
  | 'type'
  | 'status';

export type AggregationOperation =
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'distinct';

export type ExportFormat =
  | 'json'
  | 'csv'
  | 'pdf'
  | 'xml'
  | 'xlsx'
  | 'html';

export type ExportStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type JobOperationType =
  | 'resume'
  | 'pause'
  | 'cancel'
  | 'retry'
  | 'update'
  | 'delete';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

// API Request/Response types
export interface CreateTimelineEntryRequest {
  type: JobType;
  title: string;
  description?: string;
  input: any;
  tags?: string[];
  metadata?: Record<string, any>;
  priority?: Priority;
  parentId?: string;
  dependencies?: string[];
  workflowId?: string;
  estimatedDuration?: number;
  maxRetries?: number;
}

export interface UpdateTimelineEntryRequest {
  status?: JobStatus;
  title?: string;
  description?: string;
  output?: any;
  tags?: string[];
  metadata?: Record<string, any>;
  priority?: Priority;
  progress?: number;
  error?: JobError;
  artifacts?: Artifact[];
}

export interface BatchOperationRequest {
  operation: JobOperationType;
  entryIds: string[];
  payload?: any;
}

export interface BatchOperationResponse {
  success: boolean[];
  failed: Array<{ id: string; error: string }>;
  totalProcessed: number;
  operationTime: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'term' | 'metadata' | 'phrase';
  score: number;
  context?: string;
}

export interface SearchIndex {
  documents: SearchDocument[];
  terms: Map<string, string[]>;
  metadata: Map<string, string[]>;
  lastUpdated: Date;
}

export interface SearchDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  vectors: number[];
  embeddings: number[];
}

export interface SearchHighlight {
  field: string;
  text: string;
  matches: Array<{ start: number; end: number; text: string }>;
}

export interface SearchFacet {
  name: string;
  label: string;
  type: 'terms' | 'range' | 'histogram';
  values: Array<{
    value: any;
    count: number;
    from?: Date | number;
    to?: Date | number;
  }>;
}

export interface SearchAnalytics {
  totalSearches: number;
  averageResults: number;
  averageLatency?: number;
  topQueries: Array<{ query: string; count: number }>;
  popularFilters: Array<{ filter: string; count: number }>;
  searchLatency: number[];
}