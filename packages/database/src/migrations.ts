import Database from 'better-sqlite3';
import { SCHEMA, SCHEMA_VERSION, TABLES } from './schema';
import { MigrationError } from './types';
import { randomUUID } from 'crypto';

// Migration interface
export interface Migration {
  version: string;
  name: string;
  up: (db: Database.Database) => void;
  down?: (db: Database.Database) => void; // Optional rollback
}

// Migration history table
const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    executed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    execution_time_ms INTEGER,
    checksum TEXT,
    description TEXT
  )
`;

// All migrations in chronological order
export const MIGRATIONS: Migration[] = [
  {
    version: '1.0.0',
    name: 'Initial schema creation',
    up: (db: Database.Database) => {
      // Execute all schema statements
      db.exec(SCHEMA.jobs);
      db.exec(SCHEMA.job_artifacts);
      db.exec(SCHEMA.job_events);
      db.exec(SCHEMA.usage_daily);
      db.exec(SCHEMA.usage_weekly);
      db.exec(SCHEMA.config);
      db.exec(SCHEMA.sessions);

      // Execute all triggers
      SCHEMA.triggers.forEach(trigger => db.exec(trigger));

      // Execute all views
      SCHEMA.views.forEach(view => db.exec(view));

      // Create migrations table
      db.exec(MIGRATIONS_TABLE);

      // Insert initial configuration
      const configInsert = db.prepare(`
        INSERT OR IGNORE INTO config (key, value, type, description)
        VALUES (?, ?, ?, ?)
      `);

      configInsert.run('schema_version', SCHEMA_VERSION, 'string', 'Current database schema version');
      configInsert.run('app_name', 'Atlas', 'string', 'Application name');
      configInsert.run('app_version', '1.0.0', 'string', 'Application version');
      configInsert.run('debug_mode', 'false', 'boolean', 'Enable debug logging');
      configInsert.run('max_artifact_size_mb', '100', 'number', 'Maximum artifact size in MB');
      configInsert.run('artifact_retention_days', '30', 'number', 'Default artifact retention period in days');
      configInsert.run('auto_vacuum_enabled', 'true', 'boolean', 'Enable automatic database vacuuming');
      configInsert.run('enable_usage_tracking', 'true', 'boolean', 'Enable usage and cost tracking');
      configInsert.run('enable_analytics', 'false', 'boolean', 'Enable anonymous analytics');
    },
    down: (db: Database.Database) => {
      // Drop all tables in reverse order
      db.exec('DROP TABLE IF EXISTS schema_migrations');
      db.exec('DROP TABLE IF EXISTS job_artifacts');
      db.exec('DROP TABLE IF EXISTS job_events');
      db.exec('DROP TABLE IF EXISTS usage_weekly');
      db.exec('DROP TABLE IF EXISTS usage_daily');
      db.exec('DROP TABLE IF EXISTS sessions');
      db.exec('DROP TABLE IF EXISTS jobs');
      db.exec('DROP TABLE IF EXISTS config');
    }
  },

  {
    version: '1.0.1',
    name: 'Add full-text search support',
    up: (db: Database.Database) => {
      // Create full-text search virtual tables
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts
        USING fts5(uuid, title, description, content=jobs, content_rowid=id)
      `);

      db.exec(`
        CREATE TRIGGER IF NOT EXISTS jobs_fts_insert
        AFTER INSERT ON jobs BEGIN
          INSERT INTO jobs_fts(rowid, uuid, title, description)
          VALUES (new.id, new.uuid, new.title, new.description);
        END
      `);

      db.exec(`
        CREATE TRIGGER IF NOT EXISTS jobs_fts_delete
        AFTER DELETE ON jobs BEGIN
          DELETE FROM jobs_fts WHERE rowid = old.id;
        END
      `);

      db.exec(`
        CREATE TRIGGER IF NOT EXISTS jobs_fts_update
        AFTER UPDATE ON jobs BEGIN
          DELETE FROM jobs_fts WHERE rowid = old.id;
          INSERT INTO jobs_fts(rowid, uuid, title, description)
          VALUES (new.id, new.uuid, new.title, new.description);
        END
      `);

      // Update config
      const configUpsert = db.prepare(`
        INSERT OR REPLACE INTO config (key, value, type, description)
        VALUES (?, ?, ?, ?)
      `);

      configUpsert.run('full_text_search_enabled', 'true', 'boolean', 'Enable full-text search on jobs');
    },
    down: (db: Database.Database) => {
      db.exec('DROP TRIGGER IF EXISTS jobs_fts_insert');
      db.exec('DROP TRIGGER IF EXISTS jobs_fts_delete');
      db.exec('DROP TRIGGER IF EXISTS jobs_fts_update');
      db.exec('DROP TABLE IF EXISTS jobs_fts');
    }
  },

  {
    version: '1.0.2',
    name: 'Add performance optimization indexes',
    up: (db: Database.Database) => {
      // Add composite indexes for common query patterns
      db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs(status, created_at)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_type_status ON jobs(type, status)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_provider_model ON jobs(provider, model)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_jobs_session_created ON jobs(session_id, created_at)');

      // Add artifact indexes for performance
      db.exec('CREATE INDEX IF NOT EXISTS idx_job_artifacts_job_type ON job_artifacts(job_id, type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_job_artifacts_type_created ON job_artifacts(type, created_at)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_job_artifacts_expires_created ON job_artifacts(expires_at, created_at)');

      // Add event indexes for timeline queries
      db.exec('CREATE INDEX IF NOT EXISTS idx_job_events_job_type ON job_events(job_id, event_type)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_job_events_type_timestamp ON job_events(event_type, timestamp)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_job_events_level_timestamp ON job_events(level, timestamp)');

      // Add usage stats indexes
      db.exec('CREATE INDEX IF NOT EXISTS idx_usage_daily_provider_model_date ON usage_daily(provider, model, date)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_usage_daily_date_cost ON usage_daily(date, cost_usd)');
    },
    down: (db: Database.Database) => {
      // Drop all performance indexes
      const indexes = [
        'idx_jobs_status_created',
        'idx_jobs_type_status',
        'idx_jobs_provider_model',
        'idx_jobs_session_created',
        'idx_job_artifacts_job_type',
        'idx_job_artifacts_type_created',
        'idx_job_artifacts_expires_created',
        'idx_job_events_job_type',
        'idx_job_events_type_timestamp',
        'idx_job_events_level_timestamp',
        'idx_usage_daily_provider_model_date',
        'idx_usage_daily_date_cost'
      ];

      indexes.forEach(index => {
        db.exec(`DROP INDEX IF EXISTS ${index}`);
      });
    }
  },

  {
    version: '1.0.3',
    name: 'Add job templates and presets',
    up: (db: Database.Database) => {
      // Create job templates table
      db.exec(`
        CREATE TABLE IF NOT EXISTS job_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK(type IN ('chat', 'vision', 'image_generation', 'code_analysis', 'other')),
          provider TEXT NOT NULL,
          model TEXT NOT NULL,
          template_data TEXT NOT NULL, -- JSON template configuration
          tags TEXT, -- JSON array of tags
          is_public BOOLEAN DEFAULT false,
          is_system BOOLEAN DEFAULT false,
          created_by TEXT, -- User ID
          usage_count INTEGER DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

          INDEX idx_job_templates_uuid (uuid),
          INDEX idx_job_templates_type (type),
          INDEX idx_job_templates_provider (provider),
          INDEX idx_job_templates_public (is_public),
          INDEX idx_job_templates_usage (usage_count),
          INDEX idx_job_templates_created_at (created_at)
        )
      `);

      // Create template usage tracking
      db.exec(`
        CREATE TABLE IF NOT EXISTS template_usage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          template_id INTEGER NOT NULL,
          job_id INTEGER NOT NULL,
          used_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          user_id TEXT,

          FOREIGN KEY (template_id) REFERENCES job_templates(id) ON DELETE CASCADE,
          FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,

          INDEX idx_template_usage_template (template_id),
          INDEX idx_template_usage_job (job_id),
          INDEX idx_template_usage_user (user_id),
          INDEX idx_template_usage_used_at (used_at)
        )
      `);

      // Add trigger to update template usage count
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_template_usage_count
        AFTER INSERT ON template_usage
        FOR EACH ROW
        BEGIN
          UPDATE job_templates
          SET usage_count = usage_count + 1, updated_at = strftime('%s', 'now')
          WHERE id = NEW.template_id;
        END
      `);

      // Insert system templates
      const templates = db.prepare(`
        INSERT OR IGNORE INTO job_templates
        (uuid, name, description, type, provider, model, template_data, is_system, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      templates.run(
        randomUUID(),
        'Quick Chat',
        'Basic conversation template',
        'chat',
        'openai',
        'gpt-3.5-turbo',
        JSON.stringify({
          system: 'You are a helpful assistant.',
          temperature: 0.7,
          maxTokens: 1000
        }),
        true,
        'system'
      );

      templates.run(
        randomUUID(),
        'Code Review',
        'Code analysis and review template',
        'code_analysis',
        'openai',
        'gpt-4',
        JSON.stringify({
          system: 'You are an expert code reviewer. Analyze the provided code and suggest improvements.',
          temperature: 0.3,
          maxTokens: 2000
        }),
        true,
        'system'
      );

      templates.run(
        randomUUID(),
        'Image Analysis',
        'Image description and analysis template',
        'vision',
        'openai',
        'gpt-4-vision-preview',
        JSON.stringify({
          system: 'You are an expert at analyzing images. Provide detailed descriptions and insights.',
          temperature: 0.5,
          maxTokens: 1500
        }),
        true,
        'system'
      );
    },
    down: (db: Database.Database) => {
      db.exec('DROP TRIGGER IF EXISTS update_template_usage_count');
      db.exec('DROP TABLE IF EXISTS template_usage');
      db.exec('DROP TABLE IF EXISTS job_templates');
    }
  },

  {
    version: '1.0.4',
    name: 'Add data retention and cleanup policies',
    up: (db: Database.Database) => {
      // Create retention policies table
      db.exec(`
        CREATE TABLE IF NOT EXISTS retention_policies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          resource_type TEXT NOT NULL CHECK(resource_type IN ('jobs', 'artifacts', 'events', 'logs')),
          policy_name TEXT NOT NULL,
          criteria TEXT NOT NULL, -- JSON criteria
          retention_days INTEGER NOT NULL,
          action TEXT NOT NULL CHECK(action IN ('delete', 'archive', 'anonymize')),
          is_active BOOLEAN DEFAULT true,
          last_run_at INTEGER,
          next_run_at INTEGER,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

          INDEX idx_retention_policies_type (resource_type),
          INDEX idx_retention_policies_active (is_active),
          INDEX idx_retention_policies_next_run (next_run_at)
        )
      `);

      // Create cleanup logs table
      db.exec(`
        CREATE TABLE IF NOT EXISTS cleanup_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          policy_id INTEGER,
          resource_type TEXT NOT NULL,
          items_affected INTEGER NOT NULL,
          execution_time_ms INTEGER NOT NULL,
          error_message TEXT,
          executed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),

          FOREIGN KEY (policy_id) REFERENCES retention_policies(id) ON DELETE SET NULL,

          INDEX idx_cleanup_logs_policy (policy_id),
          INDEX idx_cleanup_logs_type (resource_type),
          INDEX idx_cleanup_logs_executed_at (executed_at)
        )
      `);

      // Insert default retention policies
      const policies = db.prepare(`
        INSERT OR IGNORE INTO retention_policies
        (resource_type, policy_name, criteria, retention_days, action, next_run_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const tomorrow = Math.floor(Date.now() / 1000) + 86400;

      policies.run(
        'artifacts',
        'Old screenshots cleanup',
        JSON.stringify({ type: 'screenshot' }),
        30,
        'delete',
        tomorrow
      );

      policies.run(
        'jobs',
        'Failed jobs cleanup',
        JSON.stringify({ status: 'failed', age_days: 90 }),
        90,
        'delete',
        tomorrow
      );

      policies.run(
        'events',
        'Debug events cleanup',
        JSON.stringify({ level: 'debug', age_days: 7 }),
        7,
        'delete',
        tomorrow
      );

      // Update config with retention settings
      const configUpsert = db.prepare(`
        INSERT OR REPLACE INTO config (key, value, type, description)
        VALUES (?, ?, ?, ?)
      `);

      configUpsert.run('retention_cleanup_enabled', 'true', 'boolean', 'Enable automatic data cleanup');
      configUpsert.run('cleanup_schedule_hours', '24', 'number', 'How often to run cleanup (hours)');
    },
    down: (db: Database.Database) => {
      db.exec('DROP TABLE IF EXISTS cleanup_logs');
      db.exec('DROP TABLE IF EXISTS retention_policies');
    }
  }
];

export class MigrationManager {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    try {
      // Create migrations table if it doesn't exist
      this.db.exec(MIGRATIONS_TABLE);

      // Get current schema version
      const currentVersion = this.getCurrentVersion();

      // Run pending migrations
      await this.runPendingMigrations(currentVersion);

      // Update current version in config
      this.updateConfigVersion();
    } catch (error) {
      throw new MigrationError('Failed to initialize database migrations', error as Error);
    }
  }

  private getCurrentVersion(): string {
    const result = this.db
      .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
      .get() as { version: string } | undefined;

    return result?.version || '0.0.0';
  }

  private async runPendingMigrations(currentVersion: string): Promise<void> {
    const pendingMigrations = MIGRATIONS.filter(m => this.compareVersions(m.version, currentVersion) > 0);

    for (const migration of pendingMigrations) {
      await this.runMigration(migration);
    }
  }

  private async runMigration(migration: Migration): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`Running migration ${migration.version}: ${migration.name}`);

      // Start transaction
      this.db.exec('BEGIN TRANSACTION');

      // Run migration
      migration.up(this.db);

      // Record migration
      const insertMigration = this.db.prepare(`
        INSERT INTO schema_migrations (version, name, executed_at, execution_time_ms)
        VALUES (?, ?, ?, ?)
      `);

      insertMigration.run(
        migration.version,
        migration.name,
        Math.floor(Date.now() / 1000),
        Date.now() - startTime
      );

      // Commit transaction
      this.db.exec('COMMIT');

      console.log(`Completed migration ${migration.version}: ${migration.name}`);
    } catch (error) {
      // Rollback on error
      this.db.exec('ROLLBACK');

      throw new MigrationError(
        `Failed to run migration ${migration.version}: ${migration.name}`,
        error as Error
      );
    }
  }

  private updateConfigVersion(): void {
    const configUpsert = this.db.prepare(`
      INSERT OR REPLACE INTO config (key, value, type, description)
      VALUES (?, ?, ?, ?)
    `);

    configUpsert.run('schema_version', SCHEMA_VERSION, 'string', 'Current database schema version');
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) return -1;
      if (aPart > bPart) return 1;
    }

    return 0;
  }

  async rollback(version: string): Promise<void> {
    const currentVersion = this.getCurrentVersion();
    const migrationsToRollback = MIGRATIONS
      .filter(m => this.compareVersions(m.version, version) > 0)
      .filter(m => this.compareVersions(m.version, currentVersion) <= 0)
      .reverse();

    for (const migration of migrationsToRollback) {
      if (!migration.down) {
        throw new MigrationError(`Cannot rollback migration ${migration.version}: no down migration defined`);
      }

      await this.rollbackMigration(migration);
    }
  }

  private async rollbackMigration(migration: Migration): Promise<void> {
    try {
      console.log(`Rolling back migration ${migration.version}: ${migration.name}`);

      // Start transaction
      this.db.exec('BEGIN TRANSACTION');

      // Run rollback
      migration.down(this.db);

      // Remove migration record
      this.db.prepare('DELETE FROM schema_migrations WHERE version = ?').run(migration.version);

      // Commit transaction
      this.db.exec('COMMIT');

      console.log(`Rolled back migration ${migration.version}: ${migration.name}`);
    } catch (error) {
      // Rollback on error
      this.db.exec('ROLLBACK');

      throw new MigrationError(
        `Failed to rollback migration ${migration.version}: ${migration.name}`,
        error as Error
      );
    }
  }

  getMigrationHistory(): Array<{ version: string; name: string; executedAt: number; executionTime: number }> {
    return this.db
      .prepare('SELECT version, name, executed_at as executedAt, execution_time_ms as executionTime FROM schema_migrations ORDER BY version')
      .all();
  }

  getPendingMigrations(): Migration[] {
    const currentVersion = this.getCurrentVersion();
    return MIGRATIONS.filter(m => this.compareVersions(m.version, currentVersion) > 0);
  }
}