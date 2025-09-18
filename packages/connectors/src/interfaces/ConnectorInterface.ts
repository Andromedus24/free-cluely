import {
  DataConnector,
  DataSource,
  DataRecord,
  SyncJob,
  SyncType,
  SyncStatus,
  DataFilter,
  DataTransformation,
  ConnectorConfiguration,
  RecordMetadata,
  SyncError,
  AuthenticationMethod
} from '../types/ConnectorTypes';

export interface DataConnectorInterface {
  // Core Operations
  connect(config: Record<string, any>): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  testConnection(config: Record<string, any>): Promise<ConnectionTestResult>;
  getSchema(): Promise<DataSchema>;

  // Data Operations
  fetchData(filters?: DataFilter[], transformations?: DataTransformation[]): Promise<DataRecord[]>;
  createRecord(data: Record<string, any>, metadata?: Partial<RecordMetadata>): Promise<DataRecord>;
  updateRecord(id: string, data: Record<string, any>): Promise<DataRecord>;
  deleteRecord(id: string): Promise<void>;
  search(query: string, filters?: DataFilter[]): Promise<DataRecord[]>;

  // Sync Operations
  startSync(type: SyncType, options?: SyncOptions): Promise<SyncJob>;
  stopSync(jobId: string): Promise<void>;
  getSyncStatus(jobId: string): Promise<SyncStatus>;
  getSyncHistory(limit?: number): Promise<SyncJob[]>;

  // Real-time Operations
  subscribeToChanges(callback: (changes: DataChange[]) => void): Promise<Subscription>;
  unsubscribe(subscriptionId: string): Promise<void>;

  // Configuration
  getConfiguration(): ConnectorConfiguration;
  validateConfiguration(config: Record<string, any>): Promise<ValidationResult>;

  // Webhooks
  handleWebhook(payload: any, signature?: string): Promise<WebhookResult>;
  registerWebhook(url: string, events: string[]): Promise<WebhookRegistration>;
  unregisterWebhook(webhookId: string): Promise<void>;
}

export interface ConnectionResult {
  success: boolean;
  connectionId?: string;
  expiresAt?: Date;
  refreshToken?: string;
  scopes?: string[];
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: ConnectionTestDetails;
  error?: string;
}

export interface ConnectionTestDetails {
  responseTime: number;
  rateLimitRemaining?: number;
  supportedFeatures?: string[];
  authenticatedUser?: string;
  permissions?: string[];
}

export interface DataSchema {
  tables: DataTable[];
  relationships: SchemaRelationship[];
  version: string;
  lastUpdated: Date;
}

export interface DataTable {
  name: string;
  fields: DataField[];
  primaryKey: string[];
  indexes: Index[];
  constraints: Constraint[];
}

export interface DataField {
  name: string;
  type: string;
  nullable: boolean;
  unique: boolean;
  defaultValue?: any;
  description?: string;
  validation?: ValidationRule[];
}

export interface Index {
  name: string;
  fields: string[];
  unique: boolean;
}

export interface Constraint {
  name: string;
  type: 'foreign_key' | 'unique' | 'check';
  definition: string;
}

export interface SchemaRelationship {
  fromTable: string;
  toTable: string;
  fromField: string;
  toField: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_many';
}

export interface SyncOptions {
  filters?: DataFilter[];
  transformations?: DataTransformation[];
  batchSize?: number;
  concurrency?: number;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  conflictResolution?: ConflictResolutionStrategy;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface ConflictResolutionStrategy {
  type: 'use_remote' | 'use_local' | 'merge' | 'manual';
  customLogic?: string;
  priorityFields?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'validation' | 'permission';
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  type: 'deprecated' | 'recommendation' | 'performance';
}

export interface ValidationRule {
  type: string;
  value: any;
  message: string;
}

export interface DataChange {
  type: 'created' | 'updated' | 'deleted';
  recordId: string;
  data: Record<string, any>;
  timestamp: Date;
  sequence: number;
}

export interface Subscription {
  id: string;
  connectionId: string;
  filters: DataFilter[];
  events: string[];
  createdAt: Date;
  lastEventAt?: Date;
  isActive: boolean;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  processedEvents: number;
  errors?: WebhookError[];
}

export interface WebhookError {
  event: string;
  error: string;
  details?: any;
}

export interface WebhookRegistration {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

export interface DataConnectorManager {
  // Connector Lifecycle
  registerConnector(connector: DataConnector): Promise<void>;
  unregisterConnector(connectorId: string): Promise<void>;
  getConnector(connectorId: string): Promise<DataConnector | null>;
  listConnectors(filters?: ConnectorFilter): Promise<DataConnector[]>;

  // Data Source Management
  createDataSource(config: DataSourceConfig): Promise<DataSource>;
  updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource>;
  deleteDataSource(id: string): Promise<void>;
  getDataSource(id: string): Promise<DataSource | null>;
  listDataSources(userId?: string): Promise<DataSource[]>;

  // Sync Management
  scheduleSync(dataSourceId: string, options: SyncOptions): Promise<SyncJob>;
  cancelSync(jobId: string): Promise<void>;
  getSyncJobs(dataSourceId?: string): Promise<SyncJob[]>;
  getSyncJob(jobId: string): Promise<SyncJob | null>;

  // Data Operations
  queryData(query: DataQuery): Promise<DataRecord[]>;
  getDataRecord(recordId: string): Promise<DataRecord | null>;
  createDataRecord(record: Omit<DataRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataRecord>;
  updateDataRecord(recordId: string, updates: Partial<DataRecord>): Promise<DataRecord>;
  deleteDataRecord(recordId: string): Promise<void>;

  // Monitoring & Analytics
  getConnectorMetrics(connectorId: string, period: string): Promise<ConnectorMetrics>;
  getSyncMetrics(dataSourceId: string, period: string): Promise<SyncMetrics>;
  getDataUsageStats(userId?: string): Promise<DataUsageStats>;

  // Security & Compliance
  validateAccess(userId: string, resourceId: string, permission: string): Promise<boolean>;
  auditLog(action: AuditAction): Promise<void>;
  encryptData(data: string, keyId?: string): Promise<string>;
  decryptData(encryptedData: string, keyId?: string): Promise<string>;
}

export interface DataSourceConfig {
  name: string;
  connectorId: string;
  configuration: Record<string, any>;
  syncFrequency: string;
  isEnabled: boolean;
  filters?: DataFilter[];
  transformations?: DataTransformation[];
  dataRetention?: DataRetentionPolicy;
}

export interface ConnectorFilter {
  category?: string;
  authentication?: AuthenticationMethod;
  features?: string[];
  status?: string;
}

export interface DataQuery {
  dataSourceIds?: string[];
  filters?: DataFilter[];
  transformations?: DataTransformation[];
  limit?: number;
  offset?: number;
  orderBy?: QueryOrderBy[];
  includeDeleted?: boolean;
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export interface DataRetentionPolicy {
  enabled: boolean;
  retentionDays: number;
  action: 'delete' | 'archive';
}

export interface ConnectorMetrics {
  totalConnections: number;
  activeConnections: number;
  totalSyncs: number;
  failedSyncs: number;
  averageSyncTime: number;
  dataVolume: number;
  errorRate: number;
  uptime: number;
}

export interface SyncMetrics {
  totalRecords: number;
  recordsSynced: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  conflicts: number;
  errors: number;
  lastSyncDuration: number;
  averageSyncDuration: number;
}

export interface DataUsageStats {
  totalRecords: number;
  totalDataSize: number;
  dataByConnector: Record<string, { records: number; size: number }>;
  syncCount: number;
  apiCalls: number;
}

export interface AuditAction {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  details?: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}