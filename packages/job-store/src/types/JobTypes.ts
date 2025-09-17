export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  title: string;
  description?: string;
  provider?: string;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  currency: string;
  duration_ms?: number;
  error_message?: string;
  stack_trace?: string;
  params: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  started_at?: Date;
  completed_at?: Date;
  parent_job_id?: string;
}

export type JobType = 'chat' | 'vision' | 'capture' | 'automation' | 'image_generation';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface JobArtifact {
  id: string;
  job_id: string;
  type: ArtifactType;
  name: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  hash_sha256?: string;
  metadata: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ArtifactType = 'screenshot' | 'file' | 'log' | 'result' | 'preview';

export interface JobEvent {
  id: string;
  job_id: string;
  event_type: EventType;
  message?: string;
  level: EventLevel;
  data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: Date;
}

export type EventType = 'created' | 'started' | 'progress' | 'completed' | 'failed' | 'cancelled' | 'warning';

export type EventLevel = 'debug' | 'info' | 'warn' | 'error';

export interface UsageStats {
  id: string;
  date: string; // YYYY-MM-DD
  provider: string;
  model: string;
  job_type: JobType;
  total_jobs: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
  currency: string;
  average_duration_ms: number;
  success_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface CostRate {
  id: string;
  provider: string;
  model: string;
  input_token_rate: number; // per 1K tokens
  output_token_rate: number; // per 1K tokens
  currency: string;
  effective_from: string; // YYYY-MM-DD
  effective_to?: string; // YYYY-MM-DD or null for current
  created_at: Date;
  updated_at: Date;
}

export interface StorageConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  created_at: Date;
  updated_at: Date;
}

// Request/Response types
export interface CreateJobRequest {
  type: JobType;
  title: string;
  description?: string;
  provider?: string;
  model?: string;
  params: Record<string, any>;
  metadata?: Record<string, any>;
  parent_job_id?: string;
}

export interface UpdateJobRequest {
  status?: JobStatus;
  title?: string;
  description?: string;
  provider?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_cost?: number;
  currency?: string;
  duration_ms?: number;
  error_message?: string;
  stack_trace?: string;
  params?: Record<string, any>;
  metadata?: Record<string, any>;
  started_at?: Date;
  completed_at?: Date;
}

export interface CreateArtifactRequest {
  job_id: string;
  type: ArtifactType;
  name: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  hash_sha256?: string;
  metadata?: Record<string, any>;
}

export interface CreateEventRequest {
  job_id: string;
  event_type: EventType;
  message?: string;
  level?: EventLevel;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Query types
export interface JobFilter {
  type?: JobType[];
  status?: JobStatus[];
  provider?: string[];
  model?: string[];
  title_contains?: string;
  created_after?: Date;
  created_before?: Date;
  duration_min?: number;
  duration_max?: number;
  cost_min?: number;
  cost_max?: number;
  parent_job_id?: string;
  has_error?: boolean;
}

export interface JobSort {
  field: 'created_at' | 'updated_at' | 'duration_ms' | 'total_cost' | 'title';
  direction: 'asc' | 'desc';
}

export interface JobPagination {
  limit: number;
  cursor?: string;
}

export interface JobQuery {
  filter?: JobFilter;
  sort?: JobSort;
  pagination?: JobPagination;
}

export interface ArtifactFilter {
  job_id?: string;
  type?: ArtifactType[];
  name_contains?: string;
  created_after?: Date;
  created_before?: Date;
  mime_type?: string;
  is_deleted?: boolean;
}

export interface EventFilter {
  job_id?: string;
  event_type?: EventType[];
  level?: EventLevel[];
  created_after?: Date;
  created_before?: Date;
  message_contains?: string;
}

export interface UsageStatsFilter {
  provider?: string[];
  model?: string[];
  job_type?: JobType[];
  date_after?: string;
  date_before?: string;
}

// Response types
export interface JobListResponse {
  jobs: Job[];
  has_more: boolean;
  next_cursor?: string;
  total_count?: number;
}

export interface ArtifactListResponse {
  artifacts: JobArtifact[];
  has_more: boolean;
  next_cursor?: string;
  total_count?: number;
}

export interface EventListResponse {
  events: JobEvent[];
  has_more: boolean;
  next_cursor?: string;
  total_count?: number;
}

export interface UsageStatsResponse {
  stats: UsageStats[];
  total_jobs: number;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  average_success_rate: number;
}

export interface CostBreakdown {
  provider: string;
  model: string;
  total_jobs: number;
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  average_cost_per_job: number;
  average_tokens_per_job: number;
}

export interface DashboardStats {
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_cost: number;
  total_tokens: number;
  average_duration: number;
  success_rate: number;
  jobs_by_type: Record<JobType, number>;
  jobs_by_status: Record<JobStatus, number>;
  cost_by_provider: Record<string, number>;
  recent_activity: JobEvent[];
}

// Error types
export interface JobStoreError extends Error {
  code: string;
  details?: any;
}

export class DatabaseError extends Error implements JobStoreError {
  code: string;
  details?: any;

  constructor(message: string, code: string, details?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends Error implements JobStoreError {
  code: string;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

export class NotFoundError extends Error implements JobStoreError {
  code: string;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
    this.details = details;
  }
}

export class ConflictError extends Error implements JobStoreError {
  code: string;
  details?: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ConflictError';
    this.code = 'CONFLICT';
    this.details = details;
  }
}