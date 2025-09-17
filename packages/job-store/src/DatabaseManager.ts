import { Database } from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { MigrationManager } from './migrations/Migration';
import { DatabaseError } from './types/JobTypes';

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  fileMustExist?: boolean;
  timeout?: number;
  verbose?: boolean;
}

export class DatabaseManager {
  private db: Database | null = null;
  private config: DatabaseConfig;
  private migrationManager: MigrationManager | null = null;

  constructor(config: DatabaseConfig) {
    this.config = {
      timeout: 5000,
      verbose: false,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(this.config.path, {
        readonly: this.config.readonly,
        fileMustExist: this.config.fileMustExist,
        timeout: this.config.timeout,
        verbose: this.config.verbose
      });

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');

      // Set busy timeout
      this.db.pragma(`busy_timeout = ${this.config.timeout}`);

      // Configure performance settings
      this.db.pragma('synchronous = NORMAL');
      this.db.pragma('cache_size = -2000'); // 2MB cache
      this.db.pragma('temp_store = MEMORY');

      // Initialize migration manager
      this.migrationManager = new MigrationManager(this.db);
      await this.migrationManager.initialize();

      console.log(`Database initialized at ${this.config.path}`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error.message}`,
        'INITIALIZATION_FAILED',
        { config: this.config, originalError: error }
      );
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      try {
        this.db.close();
        this.db = null;
        this.migrationManager = null;
        console.log('Database connection closed');
      } catch (error) {
        throw new DatabaseError(
          `Failed to close database: ${error.message}`,
          'CLOSE_FAILED',
          { originalError: error }
        );
      }
    }
  }

  getDatabase(): Database {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }
    return this.db;
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const backupDb = new Database(backupPath);
      this.db.backup(backupDb);
      backupDb.close();
      console.log(`Database backed up to ${backupPath}`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to backup database: ${error.message}`,
        'BACKUP_FAILED',
        { backupPath, originalError: error }
      );
    }
  }

  async restore(backupPath: string): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const backupDb = new Database(backupPath, { readonly: true });
      backupDb.backup(this.db);
      backupDb.close();
      console.log(`Database restored from ${backupPath}`);
    } catch (error) {
      throw new DatabaseError(
        `Failed to restore database: ${error.message}`,
        'RESTORE_FAILED',
        { backupPath, originalError: error }
      );
    }
  }

  async vacuum(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      this.db.exec('VACUUM;');
      console.log('Database vacuum completed');
    } catch (error) {
      throw new DatabaseError(
        `Failed to vacuum database: ${error.message}`,
        'VACUUM_FAILED',
        { originalError: error }
      );
    }
  }

  async analyze(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      this.db.exec('ANALYZE;');
      console.log('Database analyze completed');
    } catch (error) {
      throw new DatabaseError(
        `Failed to analyze database: ${error.message}`,
        'ANALYZE_FAILED',
        { originalError: error }
      );
    }
  }

  async getIntegrityCheck(): Promise<boolean> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const result = this.db.prepare('PRAGMA integrity_check;').get() as { integrity_check: string };
      return result.integrity_check === 'ok';
    } catch (error) {
      throw new DatabaseError(
        `Failed to check database integrity: ${error.message}`,
        'INTEGRITY_CHECK_FAILED',
        { originalError: error }
      );
    }
  }

  async getDatabaseStats(): Promise<{
    size: number;
    pageCount: number;
    pageSize: number;
    freePages: number;
    schemaVersion: number;
    migrations: Array<{
      version: number;
      name: string;
      executed_at: string;
      execution_time_ms: number;
    }>;
  }> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    try {
      const stats = this.db.pragma('page_count') as { page_count: number };
      const pageSize = this.db.pragma('page_size') as { page_size: number };
      const freePages = this.db.pragma('freelist_count') as { freelist_count: number };
      const schemaVersion = this.db.pragma('schema_version') as { schema_version: number };

      const dbStats = fs.statSync(this.config.path);

      const migrations = this.migrationManager
        ? await this.migrationManager.getMigrationHistory()
        : [];

      return {
        size: dbStats.size,
        pageCount: stats.page_count,
        pageSize: pageSize.page_size,
        freePages: freePages.freelist_count,
        schemaVersion: schemaVersion.schema_version,
        migrations
      };
    } catch (error) {
      throw new DatabaseError(
        `Failed to get database stats: ${error.message}`,
        'STATS_FAILED',
        { originalError: error }
      );
    }
  }

  async executeInTransaction<T>(callback: (db: Database) => T): Promise<T> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }

    return this.db.transaction(callback)();
  }

  prepare(sql: string) {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }
    return this.db.prepare(sql);
  }

  exec(sql: string): void {
    if (!this.db) {
      throw new DatabaseError('Database not initialized', 'NOT_INITIALIZED');
    }
    this.db.exec(sql);
  }

  // Health check
  async healthCheck(): Promise<{
    healthy: boolean;
    details: {
      connected: boolean;
      writable: boolean;
      integrity: boolean;
      size: number;
      migrationStatus: string;
    };
    error?: string;
  }> {
    try {
      if (!this.db) {
        return {
          healthy: false,
          details: {
            connected: false,
            writable: false,
            integrity: false,
            size: 0,
            migrationStatus: 'not_initialized'
          },
          error: 'Database not initialized'
        };
      }

      // Check basic connectivity
      const result = this.db.prepare('SELECT 1 as test').get() as { test: number };
      const connected = result.test === 1;

      // Check write capability (if not readonly)
      let writable = false;
      if (!this.config.readonly) {
        try {
          this.db.exec('CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY);');
          this.db.exec('DELETE FROM health_check WHERE id = 1;');
          this.db.exec('INSERT INTO health_check (id) VALUES (1);');
          writable = true;
        } catch {
          writable = false;
        }
      }

      // Check integrity
      const integrity = await this.getIntegrityCheck();

      // Get file size
      const stats = fs.statSync(this.config.path);

      // Check migration status
      const currentVersion = this.migrationManager
        ? await this.migrationManager.getCurrentVersion()
        : 0;
      const migrationStatus = currentVersion > 0 ? `v${currentVersion}` : 'pending';

      return {
        healthy: connected && (!this.config.readonly ? writable : true) && integrity,
        details: {
          connected,
          writable,
          integrity,
          size: stats.size,
          migrationStatus
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          connected: false,
          writable: false,
          integrity: false,
          size: 0,
          migrationStatus: 'error'
        },
        error: error.message
      };
    }
  }
}