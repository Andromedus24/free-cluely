import { z } from 'zod';

// Job types
export const JobTypeSchema = z.enum(['chat', 'vision', 'image_generation', 'code_analysis', 'other']);
export type JobType = z.infer<typeof JobTypeSchema>;

export const JobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobEventTypeSchema = z.enum([
  'created', 'started', 'progress', 'warning', 'error', 'completed', 'cancelled'
]);
export type JobEventType = z.infer<typeof JobEventTypeSchema>;

export const EventLevelSchema = z.enum(['debug', 'info', 'warning', 'error']);
export type EventLevel = z.infer<typeof EventLevelSchema>;

export const ArtifactTypeSchema = z.enum(['screenshot', 'file', 'image', 'document', 'log', 'other']);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const StorageBackendSchema = z.enum(['local', 's3', 'gcs', 'azure']);
export type StorageBackend = z.infer<typeof StorageBackendSchema>;

// Core job types
export const JobSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  title: z.string(),
  description: z.string().optional(),
  type: JobTypeSchema,
  status: JobStatusSchema,
  priority: z.number().min(0).max(10),
  provider: z.string(),
  model: z.string(),
  providerJobId: z.string().optional(),
  request: z.string(), // JSON
  response: z.string().optional(), // JSON
  error: z.string().optional(),
  metadata: z.string().optional(), // JSON
  tags: z.string().optional(), // JSON array
  sessionId: z.string().optional(),
  createdAt: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  updatedAt: z.number(),
  durationMs: z.number().optional(),
  tokensUsed: z.number().optional(),
  costUsd: z.number().optional()
});

export type Job = z.infer<typeof JobSchema>;

export const CreateJobSchema = JobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
  durationMs: true,
  tokensUsed: true,
  costUsd: true
}).extend({
  uuid: z.string().optional(), // Optional, will be generated if not provided
  priority: z.number().min(0).max(10).default(0),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional()
});

export type CreateJob = z.infer<typeof CreateJobSchema>;

export const UpdateJobSchema = JobSchema.partial().omit({
  id: true,
  uuid: true,
  createdAt: true,
  updatedAt: true
}).extend({
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional()
});

export type UpdateJob = z.infer<typeof UpdateJobSchema>;

// Job artifact types
export const JobArtifactSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  jobId: z.number(),
  type: ArtifactTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  filePath: z.string(),
  fileSize: z.number(),
  mimeType: z.string().optional(),
  hashSha256: z.string(),
  previewData: z.string().optional(), // Base64
  previewSize: z.number().optional(),
  previewMimeType: z.string().optional(),
  metadata: z.string().optional(), // JSON
  storageBackend: StorageBackendSchema,
  createdAt: z.number(),
  accessedAt: z.number(),
  expiresAt: z.number().optional()
});

export type JobArtifact = z.infer<typeof JobArtifactSchema>;

export const CreateJobArtifactSchema = JobArtifactSchema.omit({
  id: true,
  createdAt: true,
  accessedAt: true,
  uuid: true // Optional, will be generated if not provided
}).extend({
  uuid: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export type CreateJobArtifact = z.infer<typeof CreateJobArtifactSchema>;

// Job event types
export const JobEventSchema = z.object({
  id: z.number(),
  jobId: z.number(),
  eventType: JobEventTypeSchema,
  message: z.string(),
  details: z.string().optional(), // JSON
  timestamp: z.number(),
  sequence: z.number(),
  level: EventLevelSchema,
  category: z.string().optional()
});

export type JobEvent = z.infer<typeof JobEventSchema>;

export const CreateJobEventSchema = JobEventSchema.omit({
  id: true,
  timestamp: true,
  sequence: true
});

export type CreateJobEvent = z.infer<typeof CreateJobEventSchema>;

// Usage tracking types
export const UsageDailySchema = z.object({
  id: z.number(),
  date: z.string(), // YYYY-MM-DD
  provider: z.string(),
  model: z.string(),
  requestsCount: z.number(),
  tokensInput: z.number(),
  tokensOutput: z.number(),
  tokensTotal: z.number(),
  costUsd: z.number(),
  avgDurationMs: z.number().optional(),
  avgTokensPerRequest: z.number().optional(),
  createdAt: z.number(),
  updatedAt: z.number()
});

export type UsageDaily = z.infer<typeof UsageDailySchema>;

export const UsageWeeklySchema = z.object({
  id: z.number(),
  yearWeek: z.string(), // YYYY-WW
  requestsCount: z.number(),
  tokensTotal: z.number(),
  costUsd: z.number(),
  providerBreakdown: z.string().optional(), // JSON
  createdAt: z.number(),
  updatedAt: z.number()
});

export type UsageWeekly = z.infer<typeof UsageWeeklySchema>;

// Session types
export const SessionSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  metadata: z.string().optional(), // JSON
  tags: z.string().optional(), // JSON array
  jobsCount: z.number(),
  totalDurationMs: z.number(),
  totalCostUsd: z.number(),
  createdAt: z.number(),
  lastActivityAt: z.number(),
  updatedAt: z.number()
});

export type Session = z.infer<typeof SessionSchema>;

export const CreateSessionSchema = SessionSchema.omit({
  id: true,
  jobsCount: true,
  totalDurationMs: true,
  totalCostUsd: true,
  createdAt: true,
  lastActivityAt: true,
  updatedAt: true
}).extend({
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional()
});

export type CreateSession = z.infer<typeof CreateSessionSchema>;

// Query types
export const JobFilterSchema = z.object({
  status: JobStatusSchema.optional(),
  type: JobTypeSchema.optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  sessionId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.number().optional(),
  createdBefore: z.number().optional(),
  completedAfter: z.number().optional(),
  completedBefore: z.number().optional(),
  minDuration: z.number().optional(),
  maxDuration: z.number().optional(),
  minCost: z.number().optional(),
  maxCost: z.number().optional(),
  search: z.string().optional() // Text search in title/description
});

export type JobFilter = z.infer<typeof JobFilterSchema>;

export const JobSortSchema = z.enum([
  'created_at', 'updated_at', 'duration_ms', 'cost_usd', 'priority', 'tokens_used'
]);

export type JobSort = z.infer<typeof JobSortSchema>;

export const SortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

export const PaginationSchema = z.object({
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  cursor: z.string().optional() // For cursor-based pagination
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const JobQuerySchema = z.object({
  filter: JobFilterSchema.optional(),
  sort: JobSortSchema.default('created_at'),
  direction: SortDirectionSchema.default('desc'),
  pagination: PaginationSchema.default({})
});

export type JobQuery = z.infer<typeof JobQuerySchema>;

// Cursor-based pagination types
export const CursorInfoSchema = z.object({
  id: z.number(),
  createdAt: z.number(),
  value: z.number() // The value being sorted on
});

export type CursorInfo = z.infer<typeof CursorInfoSchema>;

export const PaginatedResultSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
  cursor: CursorInfoSchema.optional(),
  nextCursor: CursorInfoSchema.optional(),
  previousCursor: CursorInfoSchema.optional()
});

export type PaginatedResult<T = any> = z.infer<typeof PaginatedResultSchema> & {
  items: T[];
};

// Statistics types
export const JobStatsSchema = z.object({
  totalJobs: z.number(),
  completedJobs: z.number(),
  failedJobs: z.number(),
  averageDuration: z.number(),
  totalCost: z.number(),
  averageCost: z.number(),
  totalTokens: z.number(),
  averageTokens: z.number(),
  byStatus: z.record(z.number()),
  byType: z.record(z.number()),
  byProvider: z.record(z.number()),
  byDay: z.array(z.object({
    date: z.string(),
    count: z.number(),
    cost: z.number()
  }))
});

export type JobStats = z.infer<typeof JobStatsSchema>;

export const UsageStatsSchema = z.object({
  period: z.string(),
  totalRequests: z.number(),
  totalTokens: z.number(),
  totalCost: z.number(),
  averageCostPerRequest: z.number(),
  averageTokensPerRequest: z.number(),
  byProvider: z.record(z.object({
    requests: z.number(),
    tokens: z.number(),
    cost: z.number()
  })),
  byModel: z.record(z.object({
    requests: z.number(),
    tokens: z.number(),
    cost: z.number()
  })),
  dailyBreakdown: z.array(z.object({
    date: z.string(),
    requests: z.number(),
    tokens: z.number(),
    cost: z.number()
  }))
});

export type UsageStats = z.infer<typeof UsageStatsSchema>;

// Database connection types
export const DatabaseConfigSchema = z.object({
  path: z.string().default('./atlas.db'),
  maxConnections: z.number().default(10),
  timeout: z.number().default(30000), // 30 seconds
  enableForeignKeys: z.boolean().default(true),
  enableWAL: z.boolean().default(true),
  enableVacuum: z.boolean().default(true),
  vacuumThreshold: z.number().default(1000) // Run vacuum after this many operations
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

// Error types
export class DatabaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class MigrationError extends DatabaseError {
  constructor(message: string, public migration?: string) {
    super(message);
    this.name = 'MigrationError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, public query?: string, public params?: any[]) {
    super(message);
    this.name = 'QueryError';
  }
}

export class ConstraintError extends DatabaseError {
  constructor(message: string, public constraint?: string) {
    super(message);
    this.name = 'ConstraintError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string, public resource?: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}