export interface DatabaseSchema {
  version: number;
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  triggers?: TriggerDefinition[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey?: string[];
  foreignKeys?: ForeignKeyDefinition[];
  checks?: CheckConstraint[];
}

export interface ColumnDefinition {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'DATETIME';
  nullable?: boolean;
  unique?: boolean;
  defaultValue?: any;
  check?: string;
  collate?: string;
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique?: boolean;
  where?: string;
}

export interface ForeignKeyDefinition {
  columns: string[];
  referenceTable: string;
  referenceColumns: string[];
  onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'NO ACTION';
}

export interface CheckConstraint {
  name?: string;
  expression: string;
}

export interface TriggerDefinition {
  name: string;
  table: string;
  timing: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
  when?: string;
  body: string;
}

export const ATLAS_DATABASE_SCHEMA: DatabaseSchema = {
  version: 1,
  tables: [
    {
      name: 'jobs',
      columns: [
        { name: 'id', type: 'TEXT', nullable: false, unique: true },
        { name: 'type', type: 'TEXT', nullable: false }, // 'chat', 'vision', 'capture', 'automation'
        { name: 'status', type: 'TEXT', nullable: false, defaultValue: "'pending'" }, // 'pending', 'running', 'completed', 'failed', 'cancelled'
        { name: 'title', type: 'TEXT', nullable: false },
        { name: 'description', type: 'TEXT' },
        { name: 'provider', type: 'TEXT' }, // 'openai', 'anthropic', 'gemini', 'ollama'
        { name: 'model', type: 'TEXT' },
        { name: 'input_tokens', type: 'INTEGER', defaultValue: 0 },
        { name: 'output_tokens', type: 'INTEGER', defaultValue: 0 },
        { name: 'total_cost', type: 'REAL', defaultValue: 0.0 },
        { name: 'currency', type: 'TEXT', defaultValue: "'USD'" },
        { name: 'duration_ms', type: 'INTEGER' }, // Job execution duration in milliseconds
        { name: 'error_message', type: 'TEXT' },
        { name: 'stack_trace', type: 'TEXT' },
        { name: 'params', type: 'JSON' }, // Job-specific parameters as JSON
        { name: 'metadata', type: 'JSON' }, // Additional metadata as JSON
        { name: 'created_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'started_at', type: 'DATETIME' },
        { name: 'completed_at', type: 'DATETIME' },
        { name: 'parent_job_id', type: 'TEXT' } // For nested/jobs relationships
      ],
      primaryKey: ['id'],
      foreignKeys: [
        {
          columns: ['parent_job_id'],
          referenceTable: 'jobs',
          referenceColumns: ['id'],
          onDelete: 'SET NULL'
        }
      ],
      checks: [
        { expression: "status IN ('pending', 'running', 'completed', 'failed', 'cancelled')" },
        { expression: "type IN ('chat', 'vision', 'capture', 'automation', 'image_generation')" },
        { expression: "input_tokens >= 0" },
        { expression: "output_tokens >= 0" },
        { expression: "total_cost >= 0" },
        { expression: "duration_ms >= 0" }
      ]
    },
    {
      name: 'job_artifacts',
      columns: [
        { name: 'id', type: 'TEXT', nullable: false, unique: true },
        { name: 'job_id', type: 'TEXT', nullable: false },
        { name: 'type', type: 'TEXT', nullable: false }, // 'screenshot', 'file', 'log', 'result', 'preview'
        { name: 'name', type: 'TEXT', nullable: false },
        { name: 'file_path', type: 'TEXT' }, // Local file path
        { name: 'file_size', type: 'INTEGER' }, // Size in bytes
        { name: 'mime_type', type: 'TEXT' },
        { name: 'hash_sha256', type: 'TEXT' }, // SHA-256 hash for deduplication
        { name: 'metadata', type: 'JSON' }, // Artifact-specific metadata
        { name: 'is_deleted', type: 'INTEGER', defaultValue: 0, nullable: false }, // Soft delete flag
        { name: 'created_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id'],
      foreignKeys: [
        {
          columns: ['job_id'],
          referenceTable: 'jobs',
          referenceColumns: ['id'],
          onDelete: 'CASCADE'
        }
      ],
      checks: [
        { expression: "file_size >= 0" },
        { expression: "is_deleted IN (0, 1)" }
      ]
    },
    {
      name: 'job_events',
      columns: [
        { name: 'id', type: 'TEXT', nullable: false, unique: true },
        { name: 'job_id', type: 'TEXT', nullable: false },
        { name: 'event_type', type: 'TEXT', nullable: false }, // 'created', 'started', 'progress', 'completed', 'failed', 'cancelled', 'warning'
        { name: 'message', type: 'TEXT' },
        { name: 'level', type: 'TEXT', defaultValue: "'info'" }, // 'debug', 'info', 'warn', 'error'
        { name: 'data', type: 'JSON' }, // Event-specific data
        { name: 'metadata', type: 'JSON' }, // Additional metadata
        { name: 'created_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id'],
      foreignKeys: [
        {
          columns: ['job_id'],
          referenceTable: 'jobs',
          referenceColumns: ['id'],
          onDelete: 'CASCADE'
        }
      ],
      checks: [
        { expression: "level IN ('debug', 'info', 'warn', 'error')" },
        { expression: "event_type IN ('created', 'started', 'progress', 'completed', 'failed', 'cancelled', 'warning')"
        }
      ]
    },
    {
      name: 'usage_stats',
      columns: [
        { name: 'id', type: 'TEXT', nullable: false, unique: true },
        { name: 'date', type: 'DATE', nullable: false }, // YYYY-MM-DD format
        { name: 'provider', type: 'TEXT', nullable: false },
        { name: 'model', type: 'TEXT', nullable: false },
        { name: 'job_type', type: 'TEXT', nullable: false },
        { name: 'total_jobs', type: 'INTEGER', defaultValue: 0 },
        { name: 'total_input_tokens', type: 'INTEGER', defaultValue: 0 },
        { name: 'total_output_tokens', type: 'INTEGER', defaultValue: 0 },
        { name: 'total_cost', type: 'REAL', defaultValue: 0.0 },
        { name: 'currency', type: 'TEXT', defaultValue: "'USD'" },
        { name: 'average_duration_ms', type: 'REAL' },
        { name: 'success_rate', type: 'REAL', defaultValue: 1.0 }, // 0.0 to 1.0
        { name: 'created_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id'],
      unique: true,
      checks: [
        { expression: "total_jobs >= 0" },
        { expression: "total_input_tokens >= 0" },
        { expression: "total_output_tokens >= 0" },
        { expression: "total_cost >= 0" },
        { expression: "average_duration_ms >= 0" },
        { expression: "success_rate >= 0 AND success_rate <= 1" }
      ]
    },
    {
      name: 'cost_rates',
      columns: [
        { name: 'id', type: 'TEXT', nullable: false, unique: true },
        { name: 'provider', type: 'TEXT', nullable: false },
        { name: 'model', type: 'TEXT', nullable: false },
        { name: 'input_token_rate', type: 'REAL', nullable: false }, // Cost per 1K input tokens
        { name: 'output_token_rate', type: 'REAL', nullable: false }, // Cost per 1K output tokens
        { name: 'currency', type: 'TEXT', defaultValue: "'USD'" },
        { name: 'effective_from', type: 'DATE', nullable: false }, // When this rate became effective
        { name: 'effective_to', type: 'DATE' }, // When this rate was superseded (null for current)
        { name: 'created_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id'],
      checks: [
        { expression: "input_token_rate >= 0" },
        { expression: "output_token_rate >= 0" }
      ]
    },
    {
      name: 'storage_config',
      columns: [
        { name: 'id', type: 'TEXT', nullable: false, unique: true },
        { name: 'key', type: 'TEXT', nullable: false, unique: true },
        { name: 'value', type: 'JSON' },
        { name: 'description', type: 'TEXT' },
        { name: 'created_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', nullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ],
      primaryKey: ['id']
    }
  ],
  indexes: [
    // Jobs table indexes
    {
      name: 'idx_jobs_status_created',
      table: 'jobs',
      columns: ['status', 'created_at']
    },
    {
      name: 'idx_jobs_type_status',
      table: 'jobs',
      columns: ['type', 'status']
    },
    {
      name: 'idx_jobs_provider_model',
      table: 'jobs',
      columns: ['provider', 'model']
    },
    {
      name: 'idx_jobs_created_at',
      table: 'jobs',
      columns: ['created_at']
    },
    {
      name: 'idx_jobs_parent_job_id',
      table: 'jobs',
      columns: ['parent_job_id']
    },
    {
      name: 'idx_jobs_total_cost',
      table: 'jobs',
      columns: ['total_cost']
    },
    {
      name: 'idx_jobs_duration_ms',
      table: 'jobs',
      columns: ['duration_ms']
    },

    // Job artifacts indexes
    {
      name: 'idx_job_artifacts_job_id',
      table: 'job_artifacts',
      columns: ['job_id']
    },
    {
      name: 'idx_job_artifacts_type',
      table: 'job_artifacts',
      columns: ['type']
    },
    {
      name: 'idx_job_artifacts_hash_sha256',
      table: 'job_artifacts',
      columns: ['hash_sha256'],
      unique: true
    },
    {
      name: 'idx_job_artifacts_file_path',
      table: 'job_artifacts',
      columns: ['file_path']
    },
    {
      name: 'idx_job_artifacts_created_at',
      table: 'job_artifacts',
      columns: ['created_at']
    },
    {
      name: 'idx_job_artifacts_is_deleted',
      table: 'job_artifacts',
      columns: ['is_deleted']
    },

    // Job events indexes
    {
      name: 'idx_job_events_job_id',
      table: 'job_events',
      columns: ['job_id']
    },
    {
      name: 'idx_job_events_event_type',
      table: 'job_events',
      columns: ['event_type']
    },
    {
      name: 'idx_job_events_level',
      table: 'job_events',
      columns: ['level']
    },
    {
      name: 'idx_job_events_created_at',
      table: 'job_events',
      columns: ['created_at']
    },

    // Usage stats indexes
    {
      name: 'idx_usage_stats_date_provider',
      table: 'usage_stats',
      columns: ['date', 'provider'],
      unique: true
    },
    {
      name: 'idx_usage_stats_provider_model',
      table: 'usage_stats',
      columns: ['provider', 'model']
    },
    {
      name: 'idx_usage_stats_date',
      table: 'usage_stats',
      columns: ['date']
    },

    // Cost rates indexes
    {
      name: 'idx_cost_rates_provider_model',
      table: 'cost_rates',
      columns: ['provider', 'model']
    },
    {
      name: 'idx_cost_rates_effective_from',
      table: 'cost_rates',
      columns: ['effective_from']
    },
    {
      name: 'idx_cost_rates_effective_to',
      table: 'cost_rates',
      columns: ['effective_to']
    }
  ],
  triggers: [
    {
      name: 'trg_jobs_updated_at',
      table: 'jobs',
      timing: 'BEFORE',
      events: ['UPDATE'],
      body: 'UPDATE jobs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;'
    },
    {
      name: 'trg_job_artifacts_updated_at',
      table: 'job_artifacts',
      timing: 'BEFORE',
      events: ['UPDATE'],
      body: 'UPDATE job_artifacts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;'
    },
    {
      name: 'trg_usage_stats_updated_at',
      table: 'usage_stats',
      timing: 'BEFORE',
      events: ['UPDATE'],
      body: 'UPDATE usage_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;'
    },
    {
      name: 'trg_cost_rates_updated_at',
      table: 'cost_rates',
      timing: 'BEFORE',
      events: ['UPDATE'],
      body: 'UPDATE cost_rates updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;'
    },
    {
      name: 'trg_storage_config_updated_at',
      table: 'storage_config',
      timing: 'BEFORE',
      events: ['UPDATE'],
      body: 'UPDATE storage_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;'
    }
  ]
};

// SQL generation utilities
export function generateCreateTableSQL(table: TableDefinition): string {
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

    if (col.collate) {
      columnDef += ` COLLATE ${col.collate}`;
    }

    return columnDef;
  });

  if (table.primaryKey && table.primaryKey.length > 0) {
    columns.push(`PRIMARY KEY (${table.primaryKey.join(', ')})`);
  }

  return `CREATE TABLE ${table.name} (\n  ${columns.join(',\n  ')}\n);`;
}

export function generateCreateIndexSQL(index: IndexDefinition): string {
  let sql = `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${index.table} (${index.columns.join(', ')})`;

  if (index.where) {
    sql += ` WHERE ${index.where}`;
  }

  return sql + ';';
}

export function generateCreateTriggerSQL(trigger: TriggerDefinition): string {
  const timing = trigger.timing;
  const events = trigger.events.join(' OR ');
  const when = trigger.when ? `WHEN ${trigger.when} ` : '';

  return `CREATE TRIGGER ${trigger.name}
  ${timing} ${events} ON ${trigger.name}
  FOR EACH ROW ${when}
  BEGIN
    ${trigger.body}
  END;`;
}

export function generateForeignKeySQL(foreignKey: ForeignKeyDefinition): string {
  return `FOREIGN KEY (${foreignKey.columns.join(', ')}) REFERENCES ${foreignKey.referenceTable} (${foreignKey.referenceColumns.join(', ')})` +
    (foreignKey.onDelete ? ` ON DELETE ${foreignKey.onDelete}` : '') +
    (foreignKey.onUpdate ? ` ON UPDATE ${foreignKey.onUpdate}` : '');
}