// Settings Package Types
// =====================

// Core Settings Types
export interface SettingsConfig {
  storage: StorageConfig;
  validation: ValidationConfig;
  synchronization: SyncConfig;
  defaults: SettingsDefaults;
  schemas: SettingsSchema[];
  encryption: EncryptionConfig;
  migrations: MigrationConfig;
}

export interface StorageConfig {
  type: 'local' | 'remote' | 'hybrid';
  provider: 'localStorage' | 'indexedDB' | 'file' | 'database' | 'cloud';
  path?: string;
  database?: string;
  table?: string;
  compression: boolean;
  backup: BackupConfig;
}

export interface BackupConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  maxBackups: number;
  location: string;
  compression: boolean;
  encryption: boolean;
}

export interface ValidationConfig {
  enabled: boolean;
  strict: boolean;
  customValidators: CustomValidator[];
  preSaveHooks: ValidationHook[];
  postLoadHooks: ValidationHook[];
}

export interface CustomValidator {
  id: string;
  name: string;
  schema: any;
  validate: (value: any) => ValidationResult;
  message?: string;
}

export interface ValidationHook {
  id: string;
  name: string;
  execute: (settings: SettingsData) => Promise<ValidationResult>;
  async: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Record<string, any>;
}

export interface ValidationError {
  path: string;
  message: string;
  value: any;
  constraint?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  path: string;
  message: string;
  value: any;
  suggestion?: string;
}

export interface SyncConfig {
  enabled: boolean;
  mode: 'auto' | 'manual' | 'scheduled';
  interval: number; // in milliseconds
  conflictResolution: 'local-wins' | 'remote-wins' | 'manual' | 'merge';
  providers: SyncProvider[];
  realtime: boolean;
  offlineSupport: boolean;
}

export interface SyncProvider {
  id: string;
  name: string;
  type: 'cloud' | 'database' | 'api' | 'file';
  endpoint?: string;
  credentials?: SyncCredentials;
  enabled: boolean;
  priority: number;
  lastSync?: number;
}

export interface SyncCredentials {
  apiKey?: string;
  token?: string;
  username?: string;
  password?: string;
  additional?: Record<string, any>;
}

export interface SettingsDefaults {
  profile: UserProfile;
  preferences: UserPreferences;
  features: FeatureFlags;
  providers: ProviderSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  timezone: string;
  language: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  density: 'compact' | 'comfortable' | 'spacious';
  sidebar: {
    collapsed: boolean;
    width: number;
    position: 'left' | 'right';
  };
  layout: {
    mode: 'tabs' | 'windows' | 'grid';
    showTabs: boolean;
    showToolbar: boolean;
    showStatusbar: boolean;
  };
  shortcuts: KeyboardShortcuts;
}

export interface KeyboardShortcuts {
  enabled: boolean;
  global: Shortcut[];
  contextSensitive: Shortcut[];
  custom: Shortcut[];
}

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  category: string;
  keys: string[];
  modifiers: ('ctrl' | 'alt' | 'shift' | 'meta' | 'cmd')[];
  action: string;
  context?: string;
  enabled: boolean;
  overwrite: boolean;
}

export interface FeatureFlags {
  experimental: boolean;
  betaFeatures: boolean;
  aiFeatures: boolean;
  plugins: boolean;
  workflows: boolean;
  collaboration: boolean;
  analytics: boolean;
  notifications: boolean;
  offline: boolean;
  custom: Record<string, boolean>;
}

export interface ProviderSettings {
  defaultProvider: string;
  providers: Record<string, ProviderConfig>;
  models: Record<string, ModelSettings>;
  moderation: ModerationSettings;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retries?: number;
  custom: Record<string, any>;
}

export interface ModelSettings {
  name: string;
  provider: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK?: number;
  frequencyPenalty: number;
  presencePenalty: number;
  stop?: string[];
  systemPrompt?: string;
  capabilities: ModelCapabilities;
}

export interface ModelCapabilities {
  chat: boolean;
  streaming: boolean;
  vision: boolean;
  imageGeneration: boolean;
  code: boolean;
  tools: boolean;
  multimodal: boolean;
}

export interface ModerationSettings {
  enabled: boolean;
  provider: string;
  sensitivity: 'low' | 'medium' | 'high';
  categories: ModerationCategory[];
  customFilters: CustomFilter[];
  action: 'block' | 'warn' | 'flag' | 'none';
}

export interface ModerationCategory {
  id: string;
  name: string;
  enabled: boolean;
  threshold: number;
  severity: 'low' | 'medium' | 'high';
}

export interface CustomFilter {
  id: string;
  name: string;
  pattern: string;
  type: 'regex' | 'keyword' | 'ml';
  enabled: boolean;
  action: 'block' | 'warn' | 'flag';
}

export interface AppearanceSettings {
  theme: ThemeSettings;
  colors: ColorSettings;
  typography: TypographySettings;
  layout: LayoutSettings;
  animations: AnimationSettings;
}

export interface ThemeSettings {
  id: string;
  name: string;
  mode: 'light' | 'dark' | 'auto';
  custom: boolean;
  variables: Record<string, string>;
}

export interface ColorSettings {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  custom: Record<string, string>;
}

export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
  letterSpacing: number;
  custom: Record<string, any>;
}

export interface LayoutSettings {
  density: 'compact' | 'comfortable' | 'spacious';
  sidebar: {
    width: number;
    collapsed: boolean;
    position: 'left' | 'right';
  };
  header: {
    height: number;
    visible: boolean;
  };
  footer: {
    height: number;
    visible: boolean;
  };
}

export interface AnimationSettings {
  enabled: boolean;
  duration: number;
  easing: string;
  reducedMotion: boolean;
  custom: Record<string, any>;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: NotificationChannel[];
  rules: NotificationRule[];
  quietHours: QuietHours;
  frequency: FrequencySettings;
}

export interface NotificationChannel {
  id: string;
  type: 'desktop' | 'email' | 'sms' | 'push' | 'webhook';
  enabled: boolean;
  config: Record<string, any>;
}

export interface NotificationRule {
  id: string;
  name: string;
  event: string;
  condition: string;
  channels: string[];
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
  timezone: string;
  days: number[]; // 0-6 (Sunday-Saturday)
}

export interface FrequencySettings {
  minimumInterval: number; // in milliseconds
  maxNotifications: number;
  window: number; // in milliseconds
  batching: boolean;
  digest: boolean;
}

export interface PrivacySettings {
  dataCollection: boolean;
  analytics: boolean;
  crashReporting: boolean;
  telemetry: boolean;
  location: boolean;
  camera: boolean;
  microphone: boolean;
  contacts: boolean;
  files: boolean;
  thirdParty: ThirdPartySettings;
  retention: RetentionSettings;
}

export interface ThirdPartySettings {
  enabled: boolean;
  providers: string[];
  dataSharing: DataSharingSettings;
}

export interface DataSharingSettings {
  enabled: boolean;
  types: ('anonymous' | 'pseudonymous' | 'personal')[];
  purposes: string[];
  retention: number; // in days
}

export interface RetentionSettings {
  chatHistory: number; // in days
  files: number; // in days
  analytics: number; // in days
  crashReports: number; // in days
  custom: Record<string, number>;
}

export interface AdvancedSettings {
  developer: DeveloperSettings;
  debugging: DebuggingSettings;
  performance: PerformanceSettings;
  experimental: ExperimentalSettings;
}

export interface DeveloperSettings {
  mode: boolean;
  console: ConsoleSettings;
  inspector: boolean;
  hotReload: boolean;
  sourceMaps: boolean;
  testing: TestingSettings;
}

export interface ConsoleSettings {
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  timestamps: boolean;
  colors: boolean;
  format: 'text' | 'json';
  filters: string[];
}

export interface TestingSettings {
  enabled: boolean;
  framework: string;
  coverage: boolean;
  e2e: boolean;
  unit: boolean;
  integration: boolean;
}

export interface DebuggingSettings {
  enabled: boolean;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  breakOnError: boolean;
  trace: boolean;
  profiling: boolean;
  memory: boolean;
  network: boolean;
}

export interface PerformanceSettings {
  monitoring: boolean;
  profiling: boolean;
  metrics: boolean;
  optimization: boolean;
  cache: CacheSettings;
  memory: MemorySettings;
}

export interface CacheSettings {
  enabled: boolean;
  strategy: 'lru' | 'fifo' | 'lfu' | 'adaptive';
  size: number; // in MB
  ttl: number; // in milliseconds
  compression: boolean;
}

export interface MemorySettings {
  limit: number; // in MB
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
  cleanup: boolean;
}

export interface ExperimentalSettings {
  features: Record<string, boolean>;
  flags: Record<string, any>;
  labs: LabSettings[];
}

export interface LabSettings {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config: Record<string, any>;
  feedback: boolean;
}

export interface EncryptionConfig {
  enabled: boolean;
  algorithm: string;
  keyRotation: boolean;
  rotationInterval: number; // in days
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2';
  iterations: number;
  memory: number; // for scrypt/argon2
  parallelism: number;
  saltLength: number;
}

export interface MigrationConfig {
  enabled: boolean;
  autoMigrate: boolean;
  backup: boolean;
  versioning: boolean;
  rollback: boolean;
  migrations: Migration[];
}

export interface Migration {
  id: string;
  version: string;
  description: string;
  up: (settings: SettingsData) => Promise<SettingsData>;
  down: (settings: SettingsData) => Promise<SettingsData>;
  dependencies?: string[];
  required?: boolean;
}

export interface SettingsSchema {
  id: string;
  version: string;
  description: string;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, SettingsSchema>;
  items?: SettingsSchema;
  required?: string[];
  additionalProperties?: boolean;
  patternProperties?: Record<string, SettingsSchema>;
  dependencies?: Record<string, SettingsSchema>;
  enum?: any[];
  const?: any;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  default?: any;
  examples?: any[];
  $schema?: string;
  $id?: string;
  $ref?: string;
  definitions?: Record<string, SettingsSchema>;
  custom?: Record<string, any>;
}

// Settings Data Structure
export interface SettingsData {
  version: string;
  profile: UserProfile;
  preferences: UserPreferences;
  features: FeatureFlags;
  providers: ProviderSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  advanced: AdvancedSettings;
  metadata: SettingsMetadata;
  custom?: Record<string, any>;
}

export interface SettingsMetadata {
  id: string;
  createdAt: number;
  updatedAt: number;
  version: string;
  schema: string;
  checksum: string;
  sync: SyncMetadata;
  encryption: EncryptionMetadata;
  validation: ValidationMetadata;
}

export interface SyncMetadata {
  enabled: boolean;
  lastSync: number;
  syncProviders: string[];
  conflicts: SyncConflict[];
  version: number;
}

export interface SyncConflict {
  id: string;
  path: string;
  localValue: any;
  remoteValue: any;
  timestamp: number;
  resolved: boolean;
  resolution?: 'local' | 'remote' | 'merge' | 'custom';
}

export interface EncryptionMetadata {
  enabled: boolean;
  algorithm: string;
  keyId?: string;
  keyVersion?: number;
  encryptedFields: string[];
  signature?: string;
}

export interface ValidationMetadata {
  valid: boolean;
  lastValidated: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  checksum: string;
}

// Settings Manager Types
export interface SettingsManagerConfig {
  config: SettingsConfig;
  storage: StorageAdapter;
  sync?: SyncAdapter;
  validation?: ValidationAdapter;
  encryption?: EncryptionAdapter;
  migration?: MigrationAdapter;
}

export interface StorageAdapter {
  load(): Promise<SettingsData>;
  save(data: SettingsData): Promise<void>;
  delete(): Promise<void>;
  exists(): Promise<boolean>;
  backup(): Promise<string>;
  restore(backup: string): Promise<void>;
}

export interface SyncAdapter {
  push(data: SettingsData): Promise<void>;
  pull(): Promise<SettingsData>;
  resolve(conflicts: SyncConflict[]): Promise<SyncConflict[]>;
  status(): Promise<SyncStatus>;
}

export interface SyncStatus {
  connected: boolean;
  lastSync: number;
  pendingChanges: boolean;
  conflicts: SyncConflict[];
  providers: SyncProviderStatus[];
}

export interface SyncProviderStatus {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: number;
  error?: string;
}

export interface ValidationAdapter {
  validate(data: SettingsData): Promise<ValidationResult>;
  validateSchema(schema: SettingsSchema, data: any): Promise<ValidationResult>;
  validateCustom(validator: CustomValidator, value: any): Promise<ValidationResult>;
}

export interface EncryptionAdapter {
  encrypt(data: any, fields: string[]): Promise<any>;
  decrypt(data: any): Promise<any>;
  generateKey(): Promise<string>;
  rotateKey(): Promise<void>;
}

export interface MigrationAdapter {
  getCurrentVersion(): Promise<string>;
  getAvailableMigrations(): Promise<Migration[]>;
  executeMigration(migration: Migration, direction: 'up' | 'down'): Promise<void>;
  rollback(version: string): Promise<void>;
}

// Settings Event Types
export interface SettingsEvent {
  type: SettingsEventType;
  timestamp: number;
  data: any;
  metadata?: Record<string, any>;
}

export type SettingsEventType =
  | 'settings-loaded'
  | 'settings-saved'
  | 'settings-changed'
  | 'settings-reset'
  | 'settings-synced'
  | 'settings-migrated'
  | 'settings-validated'
  | 'settings-encrypted'
  | 'settings-decrypted'
  | 'settings-error'
  | 'settings-backup-created'
  | 'settings-backup-restored'
  | 'settings-schema-changed'
  | 'settings-provider-changed'
  | 'settings-feature-toggled'
  | 'settings-theme-changed'
  | 'settings-shortcut-changed'
  | 'settings-notification-changed'
  | 'settings-privacy-changed'
  | 'settings-advanced-changed';

// Settings API Types
export interface SettingsAPI {
  get(path: string): Promise<any>;
  set(path: string, value: any): Promise<void>;
  delete(path: string): Promise<void>;
  has(path: string): Promise<boolean>;
  keys(path?: string): Promise<string[]>;
  reset(path?: string): Promise<void>;
  export(format: 'json' | 'yaml' | 'env'): Promise<string>;
  import(data: string, format: 'json' | 'yaml' | 'env'): Promise<void>;
  backup(): Promise<string>;
  restore(backup: string): Promise<void>;
  sync(): Promise<void>;
  validate(): Promise<ValidationResult>;
  migrate(version?: string): Promise<void>;
}

// Settings UI Types
export interface SettingsUIConfig {
  sections: SettingsSection[];
  layout: 'tabs' | 'accordion' | 'wizard' | 'sidebar';
  theme: 'light' | 'dark' | 'auto';
  localization: LocalizationSettings;
  search: boolean;
  reset: boolean;
  export: boolean;
  import: boolean;
}

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon?: string;
  order: number;
  fields: SettingsField[];
  groups?: SettingsGroup[];
}

export interface SettingsGroup {
  id: string;
  title: string;
  description: string;
  fields: SettingsField[];
  collapsible: boolean;
  collapsed: boolean;
}

export interface SettingsField {
  id: string;
  path: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'password' | 'color' | 'date' | 'time' | 'file' | 'toggle' | 'slider' | 'code' | 'json' | 'custom';
  label: string;
  description?: string;
  placeholder?: string;
  default?: any;
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  disabled?: boolean;
  options?: SelectOption[];
  validation?: FieldValidation[];
  conditions?: FieldCondition[];
  dependencies?: string[];
  ui?: FieldUI;
}

export interface SelectOption {
  value: any;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
}

export interface FieldValidation {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  async?: boolean;
  validator?: (value: any) => Promise<boolean>;
}

export interface FieldCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
  value: any;
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'optional';
}

export interface FieldUI {
  width?: number;
  height?: number;
  className?: string;
  style?: Record<string, any>;
  component?: string;
  props?: Record<string, any>;
  help?: string;
  tooltip?: string;
}

export interface LocalizationSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currency: string;
  translations: Record<string, Record<string, string>>;
}

// Settings Plugin Types
export interface SettingsPlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  dependencies?: string[];
  config: Record<string, any>;
  hooks: SettingsHook[];
}

export interface SettingsHook {
  event: SettingsEventType;
  priority: number;
  async: boolean;
  handler: (event: SettingsEvent) => Promise<void>;
}

// Settings Template Types
export interface SettingsTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  settings: Partial<SettingsData>;
  schema?: SettingsSchema;
  preview?: string;
  screenshots?: string[];
  requirements?: TemplateRequirement[];
}

export interface TemplateRequirement {
  type: 'feature' | 'plugin' | 'provider' | 'version';
  id: string;
  version?: string;
  optional?: boolean;
}

// Settings Analytics Types
export interface SettingsAnalytics {
  tracking: boolean;
  events: AnalyticsEvent[];
  metrics: AnalyticsMetric[];
  reports: AnalyticsReport[];
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  category: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsMetric {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  value: number;
  tags: Record<string, string>;
  timestamp: number;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  type: 'usage' | 'performance' | 'errors' | 'custom';
  period: 'day' | 'week' | 'month' | 'year';
  data: any;
  generatedAt: number;
}

// Settings Export Types
export interface SettingsExport {
  format: 'json' | 'yaml' | 'env' | 'toml' | 'xml';
  version: string;
  data: SettingsData;
  metadata: ExportMetadata;
  compression?: boolean;
  encryption?: boolean;
}

export interface ExportMetadata {
  exportDate: number;
  exporter: string;
  version: string;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
}