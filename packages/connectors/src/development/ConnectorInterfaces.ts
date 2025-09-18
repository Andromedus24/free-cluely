import { EventEmitter } from 'events';
import {
  ConnectorConfig,
  ConnectionStatus,
  AuthenticationMethod,
  RateLimitConfig,
  DataSchema,
  SyncConfig,
  DataRecord,
  SyncResult,
  SyncDirection,
  ConnectorType,
  PaginationConfig
} from '../types/ConnectorTypes';

/**
 * Base connector interface that all connectors must implement
 */
export interface IConnector extends EventEmitter {
  readonly id: string;
  readonly name: string;
  readonly type: ConnectorType;
  readonly version: string;
  readonly description: string;
  config: ConnectorConfig;
  status: ConnectionStatus;
  readonly capabilities: ConnectorCapabilities;
  readonly schema: DataSchema;

  // Lifecycle methods
  initialize(config: ConnectorConfig): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;

  // Data operations
  sync(config: SyncConfig): Promise<SyncResult>;
  query(query: string, params?: Record<string, any>): Promise<DataRecord[]>;
  create(record: DataRecord): Promise<DataRecord>;
  update(id: string, record: Partial<DataRecord>): Promise<DataRecord>;
  delete(id: string): Promise<boolean>;

  // Schema operations
  getSchema(): Promise<DataSchema>;
  validateSchema(schema: DataSchema): Promise<boolean>;

  // Metadata
  getMetadata(): Promise<ConnectorMetadata>;
  getStats(): Promise<ConnectorStats>;
}

/**
 * Connector capabilities definition
 */
export interface ConnectorCapabilities {
  readonly authentication: AuthenticationMethod[];
  readonly sync: {
    directions: SyncDirection[];
    realtime: boolean;
    batching: boolean;
    deltaSync: boolean;
    conflictResolution: boolean;
  };
  readonly data: {
    read: boolean;
    write: boolean;
    delete: boolean;
    bulkOperations: boolean;
    filtering: boolean;
    sorting: boolean;
    aggregation: boolean;
  };
  readonly advanced: {
    webhooks: boolean;
    transformations: boolean;
    customFields: boolean;
    validation: boolean;
    encryption: boolean;
    compression: boolean;
  };
  readonly limitations: {
    maxRecordsPerSync?: number;
    maxFileSize?: number;
    supportedFormats?: string[];
    rateLimits?: RateLimitConfig;
    fields?: string[];
  };
}

/**
 * Connector metadata information
 */
export interface ConnectorMetadata {
  readonly author: string;
  readonly email: string;
  readonly website?: string;
  readonly documentation: string;
  readonly license: string;
  readonly tags: string[];
  readonly categories: string[];
  readonly screenshots?: string[];
  readonly icon?: string;
  readonly minimumAtlasVersion: string;
  readonly dependencies?: Record<string, string>;
  readonly configurationSchema: ConfigurationSchema;
}

/**
 * Configuration schema for connector settings
 */
export interface ConfigurationSchema {
  type: 'object';
  properties: Record<string, ConfigurationProperty>;
  required: string[];
  additionalProperties?: boolean;
}

/**
 * Configuration property definition
 */
export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title: string;
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
  items?: ConfigurationProperty;
  properties?: Record<string, ConfigurationProperty>;
  required?: string[];
  ui?: {
    widget?: string;
    help?: string;
    placeholder?: string;
    group?: string;
    order?: number;
    condition?: string;
  };
}

/**
 * Connector statistics
 */
export interface ConnectorStats {
  totalRecords: number;
  lastSync?: Date;
  syncCount: number;
  errorCount: number;
  averageSyncTime: number;
  dataVolume: {
    uploaded: number;
    downloaded: number;
    unit: 'bytes' | 'kb' | 'mb' | 'gb';
  };
  performance: {
    responseTime: number;
    successRate: number;
    uptime: number;
  };
}

/**
 * Abstract base connector providing common functionality
 */
export abstract class BaseConnector extends EventEmitter implements IConnector {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: ConnectorType;
  abstract readonly version: string;
  abstract readonly description: string;

  public config: ConnectorConfig;
  public status: ConnectionStatus = ConnectionStatus.Disconnected;
  protected readonly stats: ConnectorStats;

  constructor(config: ConnectorConfig) {
    super();
    this.config = config;
    this.stats = this.initializeStats();
  }

  abstract get capabilities(): ConnectorCapabilities;
  abstract get schema(): DataSchema;

  protected abstract initializeStats(): ConnectorStats;

  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = { ...this.config, ...config };
    this.emit('initialized', { config });
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;
  abstract sync(config: SyncConfig): Promise<SyncResult>;
  abstract query(query: string, params?: Record<string, any>): Promise<DataRecord[]>;
  abstract create(record: DataRecord): Promise<DataRecord>;
  abstract update(id: string, record: Partial<DataRecord>): Promise<DataRecord>;
  abstract delete(id: string): Promise<boolean>;
  abstract getSchema(): Promise<DataSchema>;

  async validateSchema(schema: DataSchema): Promise<boolean> {
    // Basic validation - override in subclasses for specific validation
    return schema && schema.fields && schema.fields.length > 0;
  }

  abstract getMetadata(): Promise<ConnectorMetadata>;

  async getStats(): Promise<ConnectorStats> {
    return { ...this.stats };
  }

  protected updateStats(updates: Partial<ConnectorStats>): void {
    Object.assign(this.stats, updates);
    this.emit('statsUpdated', this.stats);
  }

  protected handleError(error: Error, context: string): void {
    this.stats.errorCount++;
    this.emit('error', { error, context, timestamp: new Date() });
  }

  protected logSync(result: SyncResult): void {
    this.stats.syncCount++;
    this.stats.totalRecords += result.recordsProcessed;
    if (result.endTime && result.startTime) {
      const duration = result.endTime.getTime() - result.startTime.getTime();
      this.stats.averageSyncTime =
        (this.stats.averageSyncTime * (this.stats.syncCount - 1) + duration) / this.stats.syncCount;
    }
    this.stats.lastSync = result.endTime || new Date();
    this.updateStats(this.stats);
  }
}

/**
 * Connector factory interface
 */
export interface IConnectorFactory {
  readonly type: ConnectorType;
  readonly id: string;
  readonly name: string;
  create(config: ConnectorConfig): Promise<IConnector>;
  getMetadata(): Promise<ConnectorMetadata>;
  validateConfig(config: ConnectorConfig): Promise<boolean>;
}

/**
 * Development utilities for connector testing
 */
export interface ConnectorDevUtils {
  createMockData(schema: DataSchema, count: number): DataRecord[];
  simulateLatency(min: number, max: number): Promise<void>;
  simulateError(errorType: 'network' | 'auth' | 'rate' | 'server'): Promise<void>;
  generateTestScenarios(): TestScenario[];
  validateConnectorImplementation(connector: IConnector): ValidationResult[];
}

/**
 * Test scenario definition
 */
export interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: (connector: IConnector) => Promise<boolean>;
  cleanup: () => Promise<void>;
  expectedResults: any;
}

/**
 * Validation result
 */
export interface ValidationResult {
  passed: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
  details?: any;
}

/**
 * Builder for creating connectors with fluent API
 */
export class ConnectorBuilder {
  private connectorClass: new (config: ConnectorConfig) => BaseConnector;
  private config: Partial<ConnectorConfig> = {};

  constructor(
    id: string,
    name: string,
    type: ConnectorType,
    version: string = '1.0.0'
  ) {
    // Create a dynamic connector class
    this.connectorClass = class extends BaseConnector {
      readonly id = id;
      readonly name = name;
      readonly type = type;
      readonly version = version;
      readonly description = '';

      get capabilities(): ConnectorCapabilities {
        throw new Error('Capabilities not implemented');
      }

      get schema(): DataSchema {
        throw new Error('Schema not implemented');
      }

      protected initializeStats(): ConnectorStats {
        return {
          totalRecords: 0,
          syncCount: 0,
          errorCount: 0,
          averageSyncTime: 0,
          dataVolume: { uploaded: 0, downloaded: 0, unit: 'bytes' },
          performance: { responseTime: 0, successRate: 0, uptime: 0 }
        };
      }

      async connect(): Promise<void> {
        throw new Error('Connect not implemented');
      }

      async disconnect(): Promise<void> {
        throw new Error('Disconnect not implemented');
      }

      async testConnection(): Promise<boolean> {
        throw new Error('Test connection not implemented');
      }

      async sync(config: SyncConfig): Promise<SyncResult> {
        throw new Error('Sync not implemented');
      }

      async query(query: string, params?: Record<string, any>): Promise<DataRecord[]> {
        throw new Error('Query not implemented');
      }

      async create(record: DataRecord): Promise<DataRecord> {
        throw new Error('Create not implemented');
      }

      async update(id: string, record: Partial<DataRecord>): Promise<DataRecord> {
        throw new Error('Update not implemented');
      }

      async delete(id: string): Promise<boolean> {
        throw new Error('Delete not implemented');
      }

      async getSchema(): Promise<DataSchema> {
        throw new Error('Get schema not implemented');
      }

      async getMetadata(): Promise<ConnectorMetadata> {
        throw new Error('Get metadata not implemented');
      }
    };
  }

  withDescription(description: string): this {
    Object.defineProperty(this.connectorClass.prototype, 'description', {
      get: () => description,
      enumerable: true
    });
    return this;
  }

  withCapabilities(capabilities: ConnectorCapabilities): this {
    Object.defineProperty(this.connectorClass.prototype, 'capabilities', {
      get: () => capabilities,
      enumerable: true
    });
    return this;
  }

  withSchema(schema: DataSchema): this {
    Object.defineProperty(this.connectorClass.prototype, 'schema', {
      get: () => schema,
      enumerable: true
    });
    return this;
  }

  withConfig(config: Partial<ConnectorConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  withMethod(methodName: keyof IConnector, implementation: Function): this {
    this.connectorClass.prototype[methodName] = implementation;
    return this;
  }

  build(): (config: ConnectorConfig) => BaseConnector {
    return (config: ConnectorConfig) => {
      const fullConfig = { ...this.config, ...config };
      return new this.connectorClass(fullConfig);
    };
  }
}

/**
 * Helper utilities for connector development
 */
export class ConnectorUtils {
  static generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.toString();
    } catch {
      return '';
    }
  }

  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  static calculateSuccessRate(success: number, total: number): number {
    return total === 0 ? 0 : Math.round((success / total) * 100);
  }

  static calculateAverage(times: number[]): number {
    return times.length === 0 ? 0 : times.reduce((a, b) => a + b, 0) / times.length;
  }

  static retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const attempt = () => {
        fn()
          .then(resolve)
          .catch(error => {
            attempts++;
            if (attempts >= maxRetries) {
              reject(error);
            } else {
              setTimeout(attempt, delay * attempts);
            }
          });
      };

      attempt();
    });
  }

  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}