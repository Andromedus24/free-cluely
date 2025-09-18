// Database package exports
export { DatabaseManager } from './DatabaseManager';
export { MigrationManager, MIGRATIONS } from './migrations';
export { SCHEMA, SCHEMA_VERSION, TABLES, COLUMNS } from './schema';
export { ArtifactStorage } from './ArtifactStorage';
export { UsageTracker } from './UsageTracker';
export { StorageManager } from './StorageManager';
export { QueryEngine } from './QueryEngine';
export { DatabaseService } from './DatabaseService';
export { ImportExportService, ExportOptions, ImportOptions } from './ImportExportService';
export { SchemaValidationService, ValidationConfig, ToastEvent } from './SchemaValidationService';

// Repositories
export { JobRepository } from './repositories/JobRepository';
export { ArtifactRepository } from './repositories/ArtifactRepository';
export { SessionRepository } from './repositories/SessionRepository';

// Types
export type {
  Job,
  CreateJob,
  UpdateJob,
  JobArtifact,
  CreateJobArtifact,
  JobEvent,
  CreateJobEvent,
  UsageDaily,
  UsageWeekly,
  Session,
  CreateSession,
  JobFilter,
  JobQuery,
  JobSort,
  SortDirection,
  Pagination,
  CursorInfo,
  PaginatedResult,
  JobStats,
  UsageStats,
  DatabaseConfig
} from './types';

// Storage Manager types
export type {
  StorageQuota,
  StoragePathConfig,
  StorageQuotaConfig,
  StorageManagerConfig
} from './StorageManager';

export {
  JobTypeSchema,
  JobStatusSchema,
  JobEventTypeSchema,
  EventLevelSchema,
  ArtifactTypeSchema,
  StorageBackendSchema,
  JobSchema,
  CreateJobSchema,
  UpdateJobSchema,
  JobArtifactSchema,
  CreateJobArtifactSchema,
  JobEventSchema,
  CreateJobEventSchema,
  UsageDailySchema,
  UsageWeeklySchema,
  SessionSchema,
  CreateSessionSchema,
  JobFilterSchema,
  JobQuerySchema,
  JobSortSchema,
  SortDirectionSchema,
  PaginationSchema,
  CursorInfoSchema,
  PaginatedResultSchema,
  JobStatsSchema,
  UsageStatsSchema,
  DatabaseConfigSchema
} from './types';

// Error types
export {
  DatabaseError,
  MigrationError,
  QueryError,
  ConstraintError,
  NotFoundError
} from './types';

// Version info
export const DATABASE_VERSION = SCHEMA_VERSION;

// Default configuration
export const DEFAULT_CONFIG = {
  path: './atlas.db',
  maxConnections: 10,
  timeout: 30000,
  enableForeignKeys: true,
  enableWAL: true,
  enableVacuum: true,
  vacuumThreshold: 1000
} as const;