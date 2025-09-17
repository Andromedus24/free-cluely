import { Database } from 'better-sqlite3';
import { ATLAS_DATABASE_SCHEMA } from '../schema/DatabaseSchema';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database) => void;
  down?: (db: Database) => void;
}

export class MigrationManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER
      );
    `);

    // Create initial schema if no migrations have been run
    const hasMigrations = this.db.prepare('SELECT COUNT(*) as count FROM schema_migrations').get() as { count: number };

    if (hasMigrations.count === 0) {
      await this.runMigration(INITIAL_SCHEMA_MIGRATION);
    }
  }

  async getCurrentVersion(): Promise<number> {
    const result = this.db.prepare('SELECT MAX(version) as version FROM schema_migrations').get() as { version: number | null };
    return result?.version || 0;
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const currentVersion = await this.getCurrentVersion();
    return ALL_MIGRATIONS.filter(m => m.version > currentVersion);
  }

  async runMigration(migration: Migration): Promise<void> {
    console.log(`Running migration: ${migration.name} (version ${migration.version})`);

    const startTime = Date.now();

    try {
      this.db.transaction(() => {
        migration.up(this.db);

        this.db.prepare(`
          INSERT INTO schema_migrations (version, name, execution_time_ms)
          VALUES (?, ?, ?)
        `).run(migration.version, migration.name, Date.now() - startTime);
      })();

      console.log(`Migration ${migration.name} completed successfully`);
    } catch (error) {
      console.error(`Migration ${migration.name} failed:`, error);
      throw error;
    }
  }

  async runAllMigrations(): Promise<void> {
    const pending = await this.getPendingMigrations();

    for (const migration of pending) {
      await this.runMigration(migration);
    }
  }

  async rollbackToVersion(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      throw new Error('Target version must be less than current version');
    }

    const migrationsToRollback = ALL_MIGRATIONS
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Rollback in reverse order

    for (const migration of migrationsToRollback) {
      if (migration.down) {
        console.log(`Rolling back migration: ${migration.name} (version ${migration.version})`);

        try {
          this.db.transaction(() => {
            migration.down!(this.db);

            this.db.prepare('DELETE FROM schema_migrations WHERE version = ?').run(migration.version);
          })();

          console.log(`Rollback of ${migration.name} completed successfully`);
        } catch (error) {
          console.error(`Rollback of ${migration.name} failed:`, error);
          throw error;
        }
      } else {
        console.warn(`Migration ${migration.name} (version ${migration.version}) does not support rollback`);
      }
    }
  }

  async getMigrationHistory(): Promise<Array<{
    version: number;
    name: string;
    executed_at: string;
    execution_time_ms: number;
  }>> {
    return this.db.prepare('SELECT * FROM schema_migrations ORDER BY version DESC').all() as any[];
  }
}

// Initial schema migration
const INITIAL_SCHEMA_MIGRATION: Migration = {
  version: 1,
  name: 'initial_schema',
  up: (db: Database) => {
    // Create all tables from the schema
    for (const table of ATLAS_DATABASE_SCHEMA.tables) {
      const columns = table.columns.map(col => {
        let columnDef = `${col.name} ${col.type}`;

        if (!col.nullable) {
          columnDef += ' NOT NULL';
        }

        if (col.unique) {
          columnDef += ' UNIQUE';
        }

        if (col.defaultValue !== undefined) {
          columnDef += ` DEFAULT ${col.defaultValue}`;
        }

        if (col.check) {
          columnDef += ` CHECK (${col.check})`;
        }

        return columnDef;
      });

      if (table.primaryKey && table.primaryKey.length > 0) {
        columns.push(`PRIMARY KEY (${table.primaryKey.join(', ')})`);
      }

      if (table.foreignKeys) {
        for (const fk of table.foreignKeys) {
          columns.push(`FOREIGN KEY (${fk.columns.join(', ')}) REFERENCES ${fk.referenceTable} (${fk.referenceColumns.join(', ')})` +
            (fk.onDelete ? ` ON DELETE ${fk.onDelete}` : '') +
            (fk.onUpdate ? ` ON UPDATE ${fk.onUpdate}` : ''));
        }
      }

      if (table.checks) {
        for (const check of table.checks) {
          columns.push(`CHECK (${check.expression})`);
        }
      }

      db.exec(`CREATE TABLE ${table.name} (\n  ${columns.join(',\n  ')}\n);`);
    }

    // Create all indexes
    for (const index of ATLAS_DATABASE_SCHEMA.indexes) {
      let sql = `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${index.table} (${index.columns.join(', ')})`;

      if (index.where) {
        sql += ` WHERE ${index.where}`;
      }

      db.exec(sql + ';');
    }

    // Create all triggers
    if (ATLAS_DATABASE_SCHEMA.triggers) {
      for (const trigger of ATLAS_DATABASE_SCHEMA.triggers) {
        const timing = trigger.timing;
        const events = trigger.events.join(' OR ');
        const when = trigger.when ? `WHEN ${trigger.when} ` : '';

        db.exec(`CREATE TRIGGER ${trigger.name}
  ${timing} ${events} ON ${trigger.table}
  FOR EACH ROW ${when}
  BEGIN
    ${trigger.body}
  END;`);
      }
    }

    // Insert default cost rates
    const defaultRates = [
      { provider: 'openai', model: 'gpt-4o', input_rate: 0.0025, output_rate: 0.01 },
      { provider: 'openai', model: 'gpt-4o-mini', input_rate: 0.00015, output_rate: 0.0006 },
      { provider: 'openai', model: 'gpt-4-turbo', input_rate: 0.01, output_rate: 0.03 },
      { provider: 'openai', model: 'gpt-4', input_rate: 0.03, output_rate: 0.06 },
      { provider: 'openai', model: 'gpt-3.5-turbo', input_rate: 0.0005, output_rate: 0.0015 },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', input_rate: 0.003, output_rate: 0.015 },
      { provider: 'anthropic', model: 'claude-3-haiku-20240307', input_rate: 0.00025, output_rate: 0.00125 },
      { provider: 'anthropic', model: 'claude-3-opus-20240229', input_rate: 0.015, output_rate: 0.075 },
      { provider: 'gemini', model: 'gemini-1.5-pro', input_rate: 0.00125, output_rate: 0.005 },
      { provider: 'gemini', model: 'gemini-1.5-flash', input_rate: 0.000075, output_rate: 0.0003 }
    ];

    const insertRate = db.prepare(`
      INSERT INTO cost_rates (id, provider, model, input_token_rate, output_token_rate, currency, effective_from)
      VALUES (?, ?, ?, ?, ?, 'USD', ?)
    `);

    const today = new Date().toISOString().split('T')[0];
    for (const rate of defaultRates) {
      insertRate.run(
        `${rate.provider}_${rate.model}_${today.replace(/-/g, '')}`,
        rate.provider,
        rate.model,
        rate.input_rate,
        rate.output_rate,
        today
      );
    }

    // Insert default storage configuration
    const insertConfig = db.prepare(`
      INSERT INTO storage_config (id, key, value, description)
      VALUES (?, ?, ?, ?)
    `);

    insertConfig.run(
      'default_artifact_retention_days',
      'default_artifact_retention_days',
      30,
      'Default number of days to keep artifacts before cleanup'
    );

    insertConfig.run(
      'max_artifact_size_mb',
      'max_artifact_size_mb',
      100,
      'Maximum size of individual artifacts in MB'
    );

    insertConfig.run(
      'cleanup_enabled',
      'cleanup_enabled',
      true,
      'Whether automatic cleanup of old artifacts is enabled'
    );

    insertConfig.run(
      'usage_stats_rollup_hour',
      'usage_stats_rollup_hour',
      2,
      'Hour of day to run usage stats rollup (0-23)'
    );
  },
  down: (db: Database) => {
    // Drop all tables in reverse order to respect foreign keys
    const tables = ['schema_migrations', 'storage_config', 'cost_rates', 'usage_stats', 'job_events', 'job_artifacts', 'jobs'];

    for (const table of tables) {
      db.exec(`DROP TABLE IF EXISTS ${table};`);
    }
  }
};

// All migrations (add new ones here as needed)
const ALL_MIGRATIONS: Migration[] = [
  INITIAL_SCHEMA_MIGRATION,
  // Add future migrations here
  // {
  //   version: 2,
  //   name: 'add_job_tags',
  //   up: (db: Database) => {
  //     db.exec('ALTER TABLE jobs ADD COLUMN tags JSON DEFAULT "[]"');
  //   },
  //   down: (db: Database) => {
  //     db.exec('ALTER TABLE jobs DROP COLUMN tags');
  //   }
  // }
];