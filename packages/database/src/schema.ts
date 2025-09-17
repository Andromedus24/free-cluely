// SQLite Schema for Atlas AI Assistant

// Core tables
export const SCHEMA = {
  // Jobs table - stores all AI assistant jobs/requests
  jobs: `
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK(type IN ('chat', 'vision', 'image_generation', 'code_analysis', 'other')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
      priority INTEGER DEFAULT 0 CHECK(priority >= 0 AND priority <= 10),

      -- Provider and model information
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      provider_job_id TEXT,

      -- Request content
      request TEXT NOT NULL, -- JSON serialized request
      response TEXT,         -- JSON serialized response
      error TEXT,           -- Error details if failed

      -- Metadata
      metadata TEXT,        -- JSON serialized metadata
      tags TEXT,            -- JSON array of tags
      session_id TEXT,       -- Optional session grouping

      -- Timestamps
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      started_at INTEGER,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

      -- Performance metrics
      duration_ms INTEGER,   -- Total duration in milliseconds
      tokens_used INTEGER,  -- Total tokens consumed
      cost_usd REAL,        -- Cost in USD

      -- Indexes
      INDEX idx_jobs_uuid (uuid),
      INDEX idx_jobs_status (status),
      INDEX idx_jobs_type (type),
      INDEX idx_jobs_provider (provider),
      INDEX idx_jobs_created_at (created_at),
      INDEX idx_jobs_session_id (session_id),
      INDEX idx_jobs_priority (priority),
      INDEX idx_jobs_completed_at (completed_at),
      INDEX idx_jobs_tags (tags) -- Full-text search on tags
    )
  `,

  // Job artifacts table - stores files, screenshots, and other artifacts
  job_artifacts: `
    CREATE TABLE IF NOT EXISTS job_artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      job_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('screenshot', 'file', 'image', 'document', 'log', 'other')),
      name TEXT NOT NULL,
      description TEXT,

      -- File information
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT,
      hash_sha256 TEXT UNIQUE NOT NULL, -- For deduplication

      -- Preview information
      preview_data TEXT,               -- Base64 encoded preview
      preview_size INTEGER,
      preview_mime_type TEXT,

      -- Metadata
      metadata TEXT,                   -- JSON serialized metadata
      storage_backend TEXT DEFAULT 'local', -- local, s3, etc.

      -- Timestamps
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      accessed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      expires_at INTEGER,              -- Optional expiration

      -- Foreign key constraint
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,

      -- Indexes
      INDEX idx_job_artifacts_uuid (uuid),
      INDEX idx_job_artifacts_job_id (job_id),
      INDEX idx_job_artifacts_type (type),
      INDEX idx_job_artifacts_hash_sha256 (hash_sha256),
      INDEX idx_job_artifacts_created_at (created_at),
      INDEX idx_job_artifacts_expires_at (expires_at)
    )
  `,

  // Job events table - stores timeline events for jobs
  job_events: `
    CREATE TABLE IF NOT EXISTS job_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN (
        'created', 'started', 'progress', 'warning', 'error', 'completed', 'cancelled'
      )),
      message TEXT NOT NULL,
      details TEXT,                   -- JSON serialized event details

      -- Timestamp and sequence
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      sequence INTEGER NOT NULL,      -- Event sequence number

      -- Context
      level TEXT DEFAULT 'info' CHECK(level IN ('debug', 'info', 'warning', 'error')),
      category TEXT,                  -- e.g., 'provider', 'storage', 'validation'

      -- Foreign key constraint
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,

      -- Indexes
      INDEX idx_job_events_job_id (job_id),
      INDEX idx_job_events_event_type (event_type),
      INDEX idx_job_events_timestamp (timestamp),
      INDEX idx_job_events_level (level),
      INDEX idx_job_events_category (category),
      INDEX idx_job_events_job_timestamp (job_id, timestamp),
      UNIQUE(idx_job_events_job_timestamp, sequence)
    )
  `,

  // Usage and cost tracking tables
  usage_daily: `
    CREATE TABLE IF NOT EXISTS usage_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,      -- YYYY-MM-DD format

      -- Provider and model breakdown
      provider TEXT NOT NULL,
      model TEXT NOT NULL,

      -- Usage metrics
      requests_count INTEGER NOT NULL DEFAULT 0,
      tokens_input INTEGER NOT NULL DEFAULT 0,
      tokens_output INTEGER NOT NULL DEFAULT 0,
      tokens_total INTEGER NOT NULL DEFAULT 0,

      -- Cost metrics
      cost_usd REAL NOT NULL DEFAULT 0,

      -- Performance metrics
      avg_duration_ms REAL,
      avg_tokens_per_request REAL,

      -- Timestamps
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

      -- Indexes
      INDEX idx_usage_daily_date (date),
      INDEX idx_usage_daily_provider (provider),
      INDEX idx_usage_daily_provider_model (provider, model),
      INDEX idx_usage_daily_created_at (created_at)
    )
  `,

  usage_weekly: `
    CREATE TABLE IF NOT EXISTS usage_weekly (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_week TEXT NOT NULL UNIQUE, -- YYYY-WW format (ISO week)

      -- Aggregated metrics
      requests_count INTEGER NOT NULL DEFAULT 0,
      tokens_total INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,

      -- Provider breakdown
      provider_breakdown TEXT,         -- JSON serialized provider data

      -- Timestamps
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

      -- Indexes
      INDEX idx_usage_weekly_year_week (year_week),
      INDEX idx_usage_weekly_created_at (created_at)
    )
  `,

  // Configuration and settings tables
  config: `
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('string', 'number', 'boolean', 'json')),
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `,

  // Sessions table for grouping related jobs
  sessions: `
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT,
      description TEXT,

      -- Session metadata
      metadata TEXT,                   -- JSON serialized metadata
      tags TEXT,                       -- JSON array of tags

      -- Statistics
      jobs_count INTEGER DEFAULT 0,
      total_duration_ms INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0,

      -- Timestamps
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      last_activity_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

      -- Indexes
      INDEX idx_sessions_uuid (uuid),
      INDEX idx_sessions_created_at (created_at),
      INDEX idx_sessions_last_activity_at (last_activity_at),
      INDEX idx_sessions_tags (tags)
    )
  `,

  // Triggers for maintaining data integrity
  triggers: [
    // Update job updated_at timestamp
    `
      CREATE TRIGGER IF NOT EXISTS update_jobs_updated_at
      AFTER UPDATE ON jobs
      FOR EACH ROW
      BEGIN
        UPDATE jobs SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
      END
    `,

    // Update job completion stats
    `
      CREATE TRIGGER IF NOT EXISTS update_job_completion_stats
      AFTER UPDATE ON jobs
      FOR EACH ROW
      WHEN NEW.status IN ('completed', 'failed') AND OLD.status NOT IN ('completed', 'failed')
      BEGIN
        UPDATE jobs SET
          completed_at = strftime('%s', 'now'),
          duration_ms = strftime('%s', 'now') - NEW.created_at
        WHERE id = NEW.id AND NEW.completed_at IS NULL;
      END
    `,

    // Update artifact access timestamp
    `
      CREATE TRIGGER IF NOT EXISTS update_artifact_accessed_at
      AFTER UPDATE ON job_artifacts
      FOR EACH ROW
      BEGIN
        UPDATE job_artifacts SET accessed_at = strftime('%s', 'now') WHERE id = NEW.id;
      END
    `,

    // Auto-increment event sequence
    `
      CREATE TRIGGER IF NOT EXISTS auto_increment_event_sequence
      BEFORE INSERT ON job_events
      FOR EACH ROW
      BEGIN
        SELECT COALESCE(MAX(sequence) + 1, 1) INTO NEW.sequence
        FROM job_events WHERE job_id = NEW.job_id;
      END
    `,

    // Update session statistics
    `
      CREATE TRIGGER IF NOT EXISTS update_session_stats
      AFTER INSERT OR UPDATE OR DELETE ON jobs
      FOR EACH ROW
      BEGIN
        -- Update session when job is added/modified
        IF NEW.session_id IS NOT NULL THEN
          UPDATE sessions SET
            jobs_count = (SELECT COUNT(*) FROM jobs WHERE session_id = NEW.session_id),
            total_duration_ms = (SELECT COALESCE(SUM(duration_ms), 0) FROM jobs WHERE session_id = NEW.session_id),
            total_cost_usd = (SELECT COALESCE(SUM(cost_usd), 0) FROM jobs WHERE session_id = NEW.session_id),
            last_activity_at = strftime('%s', 'now'),
            updated_at = strftime('%s', 'now')
          WHERE id = NEW.session_id;
        END IF;

        -- Update session when job is removed
        IF OLD.session_id IS NOT NULL AND NEW.session_id IS NULL THEN
          UPDATE sessions SET
            jobs_count = (SELECT COUNT(*) FROM jobs WHERE session_id = OLD.session_id),
            total_duration_ms = (SELECT COALESCE(SUM(duration_ms), 0) FROM jobs WHERE session_id = OLD.session_id),
            total_cost_usd = (SELECT COALESCE(SUM(cost_usd), 0) FROM jobs WHERE session_id = OLD.session_id),
            last_activity_at = (SELECT MAX(updated_at) FROM jobs WHERE session_id = OLD.session_id),
            updated_at = strftime('%s', 'now')
          WHERE id = OLD.session_id;
        END IF;
      END
    `
  ],

  // Views for common queries
  views: [
    // Recent jobs with basic info
    `
      CREATE VIEW IF NOT EXISTS recent_jobs AS
      SELECT
        j.id,
        j.uuid,
        j.title,
        j.type,
        j.status,
        j.provider,
        j.model,
        j.created_at,
        j.completed_at,
        j.duration_ms,
        j.cost_usd,
        j.session_id,
        s.name as session_name,
        COUNT(a.id) as artifact_count
      FROM jobs j
      LEFT JOIN sessions s ON j.session_id = s.id
      LEFT JOIN job_artifacts a ON j.id = a.job_id
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `,

    // Job timeline view
    `
      CREATE VIEW IF NOT EXISTS job_timeline AS
      SELECT
        j.id as job_id,
        j.uuid as job_uuid,
        j.title,
        e.event_type,
        e.message,
        e.details,
        e.timestamp,
        e.sequence,
        e.level,
        e.category
      FROM jobs j
      JOIN job_events e ON j.id = e.job_id
      ORDER BY j.created_at, e.sequence
    `,

    // Usage statistics view
    `
      CREATE VIEW IF NOT EXISTS usage_stats AS
      SELECT
        date,
        provider,
        model,
        requests_count,
        tokens_input,
        tokens_output,
        tokens_total,
        cost_usd,
        avg_duration_ms,
        avg_tokens_per_request,
        CASE
          WHEN date = date('now') THEN 'today'
          WHEN date = date('now', '-1 day') THEN 'yesterday'
          WHEN date >= date('now', '-7 days') THEN 'this_week'
          WHEN date >= date('now', '-30 days') THEN 'this_month'
          ELSE 'older'
        END as period
      FROM usage_daily
      ORDER BY date DESC
    `
  ]
};

// Schema version tracking
export const SCHEMA_VERSION = '1.0.0';

// Table names for easy reference
export const TABLES = {
  JOBS: 'jobs',
  JOB_ARTIFACTS: 'job_artifacts',
  JOB_EVENTS: 'job_events',
  USAGE_DAILY: 'usage_daily',
  USAGE_WEEKLY: 'usage_weekly',
  CONFIG: 'config',
  SESSIONS: 'sessions'
} as const;

// Column names for type safety
export const COLUMNS = {
  JOBS: {
    ID: 'id',
    UUID: 'uuid',
    TITLE: 'title',
    DESCRIPTION: 'description',
    TYPE: 'type',
    STATUS: 'status',
    PRIORITY: 'priority',
    PROVIDER: 'provider',
    MODEL: 'model',
    PROVIDER_JOB_ID: 'provider_job_id',
    REQUEST: 'request',
    RESPONSE: 'response',
    ERROR: 'error',
    METADATA: 'metadata',
    TAGS: 'tags',
    SESSION_ID: 'session_id',
    CREATED_AT: 'created_at',
    STARTED_AT: 'started_at',
    COMPLETED_AT: 'completed_at',
    UPDATED_AT: 'updated_at',
    DURATION_MS: 'duration_ms',
    TOKENS_USED: 'tokens_used',
    COST_USD: 'cost_usd'
  },
  JOB_ARTIFACTS: {
    ID: 'id',
    UUID: 'uuid',
    JOB_ID: 'job_id',
    TYPE: 'type',
    NAME: 'name',
    DESCRIPTION: 'description',
    FILE_PATH: 'file_path',
    FILE_SIZE: 'file_size',
    MIME_TYPE: 'mime_type',
    HASH_SHA256: 'hash_sha256',
    PREVIEW_DATA: 'preview_data',
    PREVIEW_SIZE: 'preview_size',
    PREVIEW_MIME_TYPE: 'preview_mime_type',
    METADATA: 'metadata',
    STORAGE_BACKEND: 'storage_backend',
    CREATED_AT: 'created_at',
    ACCESSED_AT: 'accessed_at',
    EXPIRES_AT: 'expires_at'
  },
  JOB_EVENTS: {
    ID: 'id',
    JOB_ID: 'job_id',
    EVENT_TYPE: 'event_type',
    MESSAGE: 'message',
    DETAILS: 'details',
    TIMESTAMP: 'timestamp',
    SEQUENCE: 'sequence',
    LEVEL: 'level',
    CATEGORY: 'category'
  }
} as const;