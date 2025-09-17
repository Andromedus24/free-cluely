import Database from 'better-sqlite3';
import { DatabaseConfig, DatabaseError } from './types';
import { MigrationManager } from './migrations';
import { TABLES } from './schema';
import { existsSync, mkdirSync, dirname } from 'fs';
import { join } from 'path';

export class DatabaseManager {
  private db: Database.Database;
  private config: DatabaseConfig;
  private migrationManager: MigrationManager;
  private operationsCount = 0;

  constructor(config: DatabaseConfig = {}) {
    this.config = {
      path: './atlas.db',
      maxConnections: 10,
      timeout: 30000,
      enableForeignKeys: true,
      enableWAL: true,
      enableVacuum: true,
      vacuumThreshold: 1000,
      ...config
    };

    // Initialize database
    this.db = this.initializeDatabase();
    this.migrationManager = new MigrationManager(this.db);
  }

  private initializeDatabase(): Database.Database {
    try {
      // Ensure database directory exists
      const dbPath = this.config.path;
      const dbDir = dirname(dbPath);

      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      // Create database connection
      const db = new Database(dbPath, {
        timeout: this.config.timeout,
        fileMustExist: false
      });

      // Configure database settings
      this.configureDatabase(db);

      return db;
    } catch (error) {
      throw new DatabaseError(`Failed to initialize database: ${this.config.path}`, error as Error);
    }
  }

  private configureDatabase(db: Database.Database): void {
    try {
      // Enable foreign keys
      if (this.config.enableForeignKeys) {
        db.pragma('foreign_keys = ON');
      }

      // Enable Write-Ahead Logging for better performance
      if (this.config.enableWAL) {
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('cache_size = -10000'); // 10MB cache
        db.pragma('temp_store = MEMORY');
        db.pragma('mmap_size = 268435456'); // 256MB mmap
      }

      // Configure busy timeout
      db.pragma(`busy_timeout = ${this.config.timeout}`);

      // Enable memory mapping for large databases
      if (this.config.enableVacuum) {
        db.pragma('auto_vacuum = INCREMENTAL');
      }

      // Add performance optimizations
      db.pragma('locking_mode = NORMAL');
      db.pragma('read_uncommitted = 0');

      console.log('Database configured with:', {
        foreignKeys: this.config.enableForeignKeys,
        walMode: this.config.enableWAL,
        timeout: this.config.timeout,
        autoVacuum: this.config.enableVacuum
      });
    } catch (error) {
      throw new DatabaseError('Failed to configure database', error as Error);
    }
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing database...');

      // Run migrations
      await this.migrationManager.initialize();

      // Validate database integrity
      await this.validateIntegrity();

      // Prepare statements
      this.prepareCommonStatements();

      console.log('Database initialized successfully');
    } catch (error) {
      throw new DatabaseError('Failed to initialize database', error as Error);
    }
  }

  private async validateIntegrity(): Promise<void> {
    try {
      // Check database integrity
      const integrity = this.db.pragma('integrity_check') as string[];
      if (integrity.length > 1 || integrity[0] !== 'ok') {
        throw new DatabaseError(`Database integrity check failed: ${integrity.join(', ')}`);
      }

      // Check foreign key constraints
      if (this.config.enableForeignKeys) {
        const foreignKeyCheck = this.db.pragma('foreign_key_check') as any[];
        if (foreignKeyCheck.length > 0) {
          console.warn('Foreign key constraint violations found:', foreignKeyCheck);
        }
      }

      // Verify all tables exist
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
      const requiredTables = Object.values(TABLES);

      for (const table of requiredTables) {
        if (!tables.find(t => t.name === table)) {
          throw new DatabaseError(`Required table missing: ${table}`);
        }
      }

      console.log('Database integrity validation passed');
    } catch (error) {
      throw new DatabaseError('Database integrity validation failed', error as Error);
    }
  }

  private prepareCommonStatements(): void {
    // Prepare frequently used statements for better performance
    const statements = [
      'SELECT * FROM jobs WHERE id = ?',
      'SELECT * FROM jobs WHERE uuid = ?',
      'SELECT * FROM job_artifacts WHERE job_id = ?',
      'SELECT * FROM job_events WHERE job_id = ? ORDER BY sequence',
      'INSERT INTO jobs (uuid, title, type, status, provider, model, request, metadata, tags, session_id, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      'UPDATE jobs SET status = ?, started_at = ?, updated_at = ? WHERE id = ?',
      'UPDATE jobs SET status = ?, response = ?, completed_at = ?, duration_ms = ?, tokens_used = ?, cost_usd = ?, updated_at = ? WHERE id = ?',
      'INSERT INTO job_events (job_id, event_type, message, details, level, category, timestamp, sequence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ];

    // Prepare statements (they will be cached by better-sqlite3)
    statements.forEach(statement => {
      try {
        this.db.prepare(statement);
      } catch (error) {
        console.warn(`Failed to prepare statement: ${statement}`, error);
      }
    });
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  async backup(backupPath: string): Promise<void> {
    try {
      console.log(`Creating database backup to: ${backupPath}`);

      // Ensure backup directory exists
      const backupDir = dirname(backupPath);
      if (!existsSync(backupDir)) {
        mkdirSync(backupDir, { recursive: true });
      }

      // Create backup using SQLite backup API
      const backupDb = new Database(backupPath);
      this.db.backup(backupDb);
      backupDb.close();

      console.log('Database backup completed successfully');
    } catch (error) {
      throw new DatabaseError(`Failed to create database backup: ${backupPath}`, error as Error);
    }
  }

  async restore(backupPath: string): Promise<void> {
    try {
      console.log(`Restoring database from: ${backupPath}`);

      if (!existsSync(backupPath)) {
        throw new DatabaseError(`Backup file not found: ${backupPath}`);
      }

      // Close current database
      this.db.close();

      // Replace current database with backup
      const backupDb = new Database(backupPath);
      const restoreDb = new Database(this.config.path);
      backupDb.backup(restoreDb);
      backupDb.close();
      restoreDb.close();

      // Reopen database
      this.db = this.initializeDatabase();
      this.migrationManager = new MigrationManager(this.db);

      // Reinitialize
      await this.initialize();

      console.log('Database restore completed successfully');
    } catch (error) {
      throw new DatabaseError(`Failed to restore database from: ${backupPath}`, error as Error);
    }
  }

  async vacuum(): Promise<void> {
    try {
      console.log('Running database vacuum...');

      const startTime = Date.now();

      // Run incremental vacuum if auto_vacuum is enabled
      if (this.config.enableVacuum) {
        this.db.pragma('incremental_vacuum');
      }

      // Run full vacuum
      this.db.pragma('vacuum');

      // Analyze the database to update statistics
      this.db.pragma('analyze');

      const duration = Date.now() - startTime;
      console.log(`Database vacuum completed in ${duration}ms`);
    } catch (error) {
      throw new DatabaseError('Failed to vacuum database', error as Error);
    }
  }

  async optimize(): Promise<void> {
    try {
      console.log('Optimizing database...');

      const startTime = Date.now();

      // Run vacuum if needed
      if (this.config.enableVacuum && this.operationsCount >= this.config.vacuumThreshold!) {
        await this.vacuum();
        this.operationsCount = 0;
      }

      // Optimize indexes
      this.db.pragma('optimize');

      // Clean up database
      this.db.pragma('wal_checkpoint(TRUNCATE)');

      // Get database stats
      const stats = this.getStats();

      const duration = Date.now() - startTime;
      console.log(`Database optimization completed in ${duration}ms`, stats);
    } catch (error) {
      throw new DatabaseError('Failed to optimize database', error as Error);
    }
  }

  getStats(): {
    size: number;
    tables: number;
    indexes: number;
    walSize: number;
    cacheSize: number;
    pageCount: number;
    pageSize: number;
  } {
    try {
      // Get database file size
      const stats = this.db.pragma('page_size') as number;
      const pageCount = this.db.pragma('page_count') as number;
      const size = pageCount * stats;

      // Get WAL size
      const walSize = this.db.pragma('wal_checkpoint(TRUNCATE)') as number;

      // Get cache size
      const cacheSize = this.db.pragma('cache_size') as number;

      // Count tables
      const tables = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
        .get() as { count: number };

      // Count indexes
      const indexes = this.db.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'")
        .get() as { count: number };

      return {
        size,
        tables: tables.count,
        indexes: indexes.count,
        walSize,
        cacheSize,
        pageCount,
        pageSize: stats
      };
    } catch (error) {
      throw new DatabaseError('Failed to get database stats', error as Error);
    }
  }

  async close(): Promise<void> {
    try {
      console.log('Closing database connection...');

      // Run final optimization
      await this.optimize();

      // Close database
      this.db.close();

      console.log('Database connection closed successfully');
    } catch (error) {
      throw new DatabaseError('Failed to close database connection', error as Error);
    }
  }

  // Transaction helper
  transaction<T>(callback: (db: Database.Database) => T): T {
    try {
      const result = this.db.transaction(callback)();
      this.operationsCount++;
      return result;
    } catch (error) {
      throw new DatabaseError('Transaction failed', error as Error);
    }
  }

  // Health check
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message?: string;
    stats?: any;
  }> {
    try {
      // Check database connection
      const result = this.db.prepare('SELECT 1').get();
      if (!result) {
        throw new DatabaseError('Database connection check failed');
      }

      // Check basic queries
      const tableCount = this.db.prepare("SELECT COUNT(*) FROM sqlite_master WHERE type='table'").get() as { 'COUNT(*)': number };

      if (tableCount['COUNT(*)'] === 0) {
        throw new DatabaseError('No tables found in database');
      }

      const stats = this.getStats();

      return {
        status: 'healthy',
        stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Reset database (for testing)
  async reset(): Promise<void> {
    try {
      console.log('Resetting database...');

      // Close database
      this.db.close();

      // Delete database file
      const fs = require('fs');
      if (existsSync(this.config.path)) {
        fs.unlinkSync(this.config.path);
      }

      // Delete WAL file if it exists
      const walPath = this.config.path + '-wal';
      if (existsSync(walPath)) {
        fs.unlinkSync(walPath);
      }

      // Reinitialize database
      this.db = this.initializeDatabase();
      this.migrationManager = new MigrationManager(this.db);
      this.operationsCount = 0;

      // Run initialization
      await this.initialize();

      console.log('Database reset completed successfully');
    } catch (error) {
      throw new DatabaseError('Failed to reset database', error as Error);
    }
  }
}