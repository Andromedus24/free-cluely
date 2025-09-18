// Core connector types and interfaces

export interface DataConnector {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: ConnectorCategory;
  icon: string;
  supportedFeatures: ConnectorFeature[];
  authentication: AuthenticationMethod[];
  dataTypes: DataType[];
  configuration: ConnectorConfiguration;
  status: ConnectorStatus;
  lastSync?: Date;
  error?: string;
  metadata: ConnectorMetadata;
}

export interface DataSource {
  id: string;
  name: string;
  connectorId: string;
  configuration: Record<string, any>;
  isEnabled: boolean;
  lastSyncAt?: Date;
  syncStatus: SyncStatus;
  syncFrequency: SyncFrequency;
  dataRetention: DataRetentionPolicy;
  filters: DataFilter[];
  transformations: DataTransformation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DataRecord {
  id: string;
  dataSourceId: string;
  externalId: string;
  dataType: string;
  data: Record<string, any>;
  metadata: RecordMetadata;
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date;
  version: number;
  isDeleted: boolean;
}

export interface SyncJob {
  id: string;
  dataSourceId: string;
  type: SyncType;
  status: SyncStatus;
  startTime?: Date;
  endTime?: Date;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: SyncError[];
  metadata: Record<string, any>;
}

export interface DataFilter {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  dataType: DataType;
  isActive: boolean;
}

export interface DataTransformation {
  id: string;
  type: TransformationType;
  configuration: Record<string, any>;
  fieldMapping?: FieldMapping[];
  isActive: boolean;
  order: number;
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
  defaultValue?: any;
  isRequired: boolean;
}

export interface RecordMetadata {
  source: string;
  sourceUrl?: string;
  schemaVersion: string;
  checksum: string;
  size: number;
  tags: string[];
  relationships: Relationship[];
}

export interface Relationship {
  type: 'belongs_to' | 'has_many' | 'many_to_many';
  targetDataSourceId: string;
  targetRecordId: string;
  metadata?: Record<string, any>;
}

export interface SyncError {
  id: string;
  type: ErrorType;
  message: string;
  stack?: string;
  recordId?: string;
  timestamp: Date;
  resolved: boolean;
}

export interface ConnectorConfiguration {
  fields: ConfigurationField[];
  validationRules: ValidationRule[];
  defaults: Record<string, any>;
  required: string[];
}

export interface ConfigurationField {
  name: string;
  label: string;
  type: FieldType;
  description: string;
  required: boolean;
  sensitive: boolean;
  validation: ValidationRule[];
  options?: SelectOption[];
  placeholder?: string;
  defaultValue?: any;
}

export interface ValidationRule {
  type: ValidationType;
  value: any;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface ConnectorMetadata {
  website?: string;
  documentation?: string;
  supportEmail?: string;
  pricing?: PricingInfo;
  limits?: ConnectorLimits;
  capabilities: ConnectorCapabilities;
}

export interface PricingInfo {
  model: 'free' | 'freemium' | 'paid';
  price?: number;
  currency?: string;
  period?: 'monthly' | 'yearly';
  features: string[];
}

export interface ConnectorLimits {
  rateLimit?: number;
  rateLimitWindow?: string;
  maxRecords?: number;
  maxDataSize?: number;
  concurrentConnections?: number;
}

export interface ConnectorCapabilities {
  realTimeSync: boolean;
  incrementalSync: boolean;
  webhookSupport: boolean;
  customFields: boolean;
  dataTransformation: boolean;
  conflictResolution: boolean;
  encryption: boolean;
  compression: boolean;
}

export interface DataRetentionPolicy {
  enabled: boolean;
  retentionPeriod: number; // in days
  action: 'delete' | 'archive';
  archiveStorage?: string;
}

// Enums
export enum ConnectorCategory {
  CRM = 'crm',
  MARKETING = 'marketing',
  SALES = 'sales',
  SUPPORT = 'support',
  FINANCE = 'finance',
  HR = 'hr',
  PRODUCTIVITY = 'productivity',
  DEVELOPER = 'developer',
  ANALYTICS = 'analytics',
  STORAGE = 'storage',
  COMMUNICATION = 'communication',
  SOCIAL = 'social',
  ECOMMERCE = 'ecommerce',
  OTHER = 'other'
}

export enum ConnectorFeature {
  DATA_SYNC = 'data_sync',
  WEBHOOKS = 'webhooks',
  REAL_TIME = 'real_time',
  BULK_EXPORT = 'bulk_export',
  BULK_IMPORT = 'bulk_import',
  CUSTOM_FIELDS = 'custom_fields',
  ADVANCED_FILTERING = 'advanced_filtering',
  DATA_TRANSFORMATION = 'data_transformation',
  RELATIONSHIPS = 'relationships',
  WEBHOOKS_INBOUND = 'webhooks_inbound',
  WEBHOOKS_OUTBOUND = 'webhooks_outbound'
}

export enum AuthenticationMethod {
  API_KEY = 'api_key',
  OAUTH2 = 'oauth2',
  BASIC_AUTH = 'basic_auth',
  BEARER_TOKEN = 'bearer_token',
  WEBHOOK_SIGNATURE = 'webhook_signature',
  JWT = 'jwt',
  CUSTOM = 'custom'
}

export enum DataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  JSON = 'json',
  ARRAY = 'array',
  OBJECT = 'object',
  BINARY = 'binary',
  GEOLOCATION = 'geolocation'
}

export enum ConnectorStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  UPDATING = 'updating',
  MAINTENANCE = 'maintenance'
}

export enum SyncStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PAUSED = 'paused'
}

export enum SyncType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  REAL_TIME = 'real_time',
  WEBHOOK = 'webhook'
}

export enum SyncFrequency {
  MANUAL = 'manual',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  REAL_TIME = 'real_time'
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null'
}

export enum TransformationType {
  FIELD_MAPPING = 'field_mapping',
  DATA_TYPE_CONVERSION = 'data_type_conversion',
  VALUE_TRANSFORMATION = 'value_transformation',
  AGGREGATION = 'aggregation',
  CALCULATION = 'calculation',
  FORMAT_CONVERSION = 'format_conversion',
  VALIDATION = 'validation',
  ENRICHMENT = 'enrichment',
  DEDUPLICATION = 'deduplication'
}

export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  VALIDATION = 'validation',
  DATA_FORMAT = 'data_format',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
  INTERNAL = 'internal',
  EXTERNAL = 'external'
}

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  TEXTAREA = 'textarea',
  PASSWORD = 'password',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  FILE = 'file',
  JSON = 'json',
  ARRAY = 'array',
  OBJECT = 'object'
}

export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  MIN_VALUE = 'min_value',
  MAX_VALUE = 'max_value',
  PATTERN = 'pattern',
  EMAIL = 'email',
  URL = 'url',
  CUSTOM = 'custom'
}