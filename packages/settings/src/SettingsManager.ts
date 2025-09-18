// Settings Manager Implementation
// ==============================

import { EventEmitter } from 'events';
import {
  SettingsConfig,
  SettingsData,
  SettingsMetadata,
  SettingsManagerConfig,
  StorageAdapter,
  SyncAdapter,
  ValidationAdapter,
  EncryptionAdapter,
  MigrationAdapter,
  ValidationResult,
  SyncConflict,
  SettingsEvent,
  SettingsEventType,
  Migration,
  SettingsSchema
} from './types';

export class SettingsManager extends EventEmitter {
  private config: SettingsConfig;
  private storage: StorageAdapter;
  private sync?: SyncAdapter;
  private validation?: ValidationAdapter;
  private encryption?: EncryptionAdapter;
  private migration?: MigrationAdapter;
  private data: SettingsData | null = null;
  private metadata: SettingsMetadata | null = null;
  private isInitialized = false;
  private isLoading = false;
  private isDirty = false;
  private autoSaveTimer?: NodeJS.Timeout;
  private schemas: Map<string, SettingsSchema> = new Map();
  private customValidators: Map<string, any> = new Map();
  private hooks: Map<SettingsEventType, Function[]> = new Map();

  constructor(config: SettingsManagerConfig) {
    super();
    this.config = config.config;
    this.storage = config.storage;
    this.sync = config.sync;
    this.validation = config.validation;
    this.encryption = config.encryption;
    this.migration = config.migration;

    this.initializeSchemas();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.isLoading = true;
      this.emit('loading');

      // Initialize storage
      await this.ensureStorage();

      // Run migrations if enabled
      if (this.config.migrations.enabled && this.migration) {
        await this.runMigrations();
      }

      // Load settings
      await this.loadSettings();

      // Setup auto-save if enabled
      if (this.config.storage.backup.enabled) {
        this.setupAutoSave();
      }

      // Setup sync if enabled
      if (this.config.synchronization.enabled && this.sync) {
        this.setupSync();
      }

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  private async ensureStorage(): Promise<void> {
    const exists = await this.storage.exists();
    if (!exists) {
      const defaultData = this.createDefaultSettings();
      await this.storage.save(defaultData);
    }
  }

  private createDefaultSettings(): SettingsData {
    const now = Date.now();
    return {
      version: '1.0.0',
      profile: {
        ...this.config.defaults.profile,
        createdAt: now,
        updatedAt: now
      },
      preferences: this.config.defaults.preferences,
      features: this.config.defaults.features,
      providers: this.config.defaults.providers,
      appearance: this.config.defaults.appearance,
      notifications: this.config.defaults.notifications,
      privacy: this.config.defaults.privacy,
      advanced: this.config.defaults.advanced,
      metadata: this.createMetadata(now)
    };
  }

  private createMetadata(timestamp: number): SettingsMetadata {
    return {
      id: this.generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      version: '1.0.0',
      schema: '1.0.0',
      checksum: '',
      sync: {
        enabled: this.config.synchronization.enabled,
        lastSync: 0,
        syncProviders: [],
        conflicts: [],
        version: 1
      },
      encryption: {
        enabled: this.config.encryption.enabled,
        algorithm: this.config.encryption.algorithm,
        encryptedFields: [],
        signature: ''
      },
      validation: {
        valid: true,
        lastValidated: timestamp,
        errors: [],
        warnings: [],
        checksum: ''
      }
    };
  }

  private initializeSchemas(): void {
    // Initialize built-in schemas
    for (const schema of this.config.schemas) {
      this.schemas.set(schema.id, schema);
    }
  }

  private setupEventListeners(): void {
    // Setup event listeners for real-time updates
    this.on('settings-changed', () => {
      this.isDirty = true;
      this.scheduleAutoSave();
    });

    this.on('settings-saved', () => {
      this.isDirty = false;
    });

    // Handle sync events
    if (this.sync) {
      this.on('settings-synced', (event) => {
        this.handleSyncEvent(event);
      });
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      let data = await this.storage.load();

      // Decrypt if encryption is enabled
      if (this.config.encryption.enabled && this.encryption) {
        data = await this.encryption.decrypt(data);
      }

      // Validate if validation is enabled
      if (this.config.validation.enabled && this.validation) {
        const result = await this.validation.validate(data);
        if (!result.valid) {
          this.emit('validation-error', result);
          if (this.config.validation.strict) {
            throw new Error('Settings validation failed');
          }
        }
      }

      this.data = data;
      this.metadata = data.metadata;

      this.emit('settings-loaded', data);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.migration) return;

    const currentVersion = await this.migration.getCurrentVersion();
    const availableMigrations = await this.migration.getAvailableMigrations();

    const pendingMigrations = availableMigrations.filter(m =>
      m.version > currentVersion
    );

    for (const migration of pendingMigrations) {
      try {
        await this.migration.executeMigration(migration, 'up');
        this.emit('migration-executed', { migration, direction: 'up' });
      } catch (error) {
        this.emit('migration-error', { migration, error });
        throw error;
      }
    }
  }

  private setupAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      if (this.isDirty && !this.isLoading) {
        await this.save();
      }
    }, this.config.storage.backup.interval);
  }

  private setupSync(): void {
    if (!this.sync) return;

    // Setup periodic sync
    if (this.config.synchronization.mode === 'scheduled') {
      setInterval(async () => {
        await this.syncSettings();
      }, this.config.synchronization.interval);
    }
  }

  private scheduleAutoSave(): void {
    if (this.config.storage.backup.enabled) {
      // Auto-save will happen on the interval
      return;
    }

    // Immediate save for critical changes
    if (this.isDirty && !this.isLoading) {
      setTimeout(() => this.save(), 1000);
    }
  }

  // Public API
  async get(path: string): Promise<any> {
    this.ensureInitialized();
    return this.getNestedValue(this.data!, path);
  }

  async set(path: string, value: any): Promise<void> {
    this.ensureInitialized();

    const oldValue = await this.get(path);
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return; // No change
    }

    this.setNestedValue(this.data!, path, value);
    this.data!.metadata.updatedAt = Date.now();

    // Validate the change
    if (this.config.validation.enabled && this.validation) {
      const result = await this.validation.validate(this.data!);
      if (!result.valid) {
        this.emit('validation-error', result);
        if (this.config.validation.strict) {
          this.setNestedValue(this.data!, path, oldValue); // Revert
          throw new Error('Settings validation failed');
        }
      }
    }

    this.emit('settings-changed', { path, oldValue, newValue: value });
  }

  async delete(path: string): Promise<void> {
    this.ensureInitialized();
    const oldValue = await this.get(path);
    this.deleteNestedValue(this.data!, path);
    this.data!.metadata.updatedAt = Date.now();
    this.emit('settings-changed', { path, oldValue, newValue: undefined });
  }

  async has(path: string): Promise<boolean> {
    this.ensureInitialized();
    return this.hasNestedValue(this.data!, path);
  }

  async keys(path?: string): Promise<string[]> {
    this.ensureInitialized();
    const obj = path ? await this.get(path) : this.data;
    return Object.keys(obj || {});
  }

  async reset(path?: string): Promise<void> {
    this.ensureInitialized();

    if (!path) {
      // Reset all settings to defaults
      const defaults = this.createDefaultSettings();
      this.data = defaults;
      this.data.metadata = {
        ...this.data.metadata,
        updatedAt: Date.now()
      };
    } else {
      // Reset specific path to defaults
      const defaultValue = this.getNestedValue(this.createDefaultSettings(), path);
      this.setNestedValue(this.data!, path, defaultValue);
      this.data!.metadata.updatedAt = Date.now();
    }

    this.emit('settings-reset', { path });
  }

  async save(): Promise<void> {
    if (!this.data || !this.isDirty) return;

    try {
      let dataToSave = { ...this.data };

      // Update metadata
      dataToSave.metadata.updatedAt = Date.now();
      dataToSave.metadata.validation = {
        valid: true,
        lastValidated: Date.now(),
        errors: [],
        warnings: [],
        checksum: this.generateChecksum(dataToSave)
      };

      // Encrypt if encryption is enabled
      if (this.config.encryption.enabled && this.encryption) {
        dataToSave = await this.encryption.encrypt(dataToSave, ['profile', 'privacy']);
        dataToSave.metadata.encryption = {
          ...dataToSave.metadata.encryption,
          enabled: true,
          encryptedFields: ['profile', 'privacy']
        };
      }

      await this.storage.save(dataToSave);
      this.isDirty = false;

      this.emit('settings-saved', dataToSave);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async export(format: 'json' | 'yaml' | 'env' = 'json'): Promise<string> {
    this.ensureInitialized();

    const exportData = {
      version: this.data!.version,
      data: this.data,
      metadata: {
        exportDate: Date.now(),
        format,
        checksum: this.generateChecksum(this.data)
      }
    };

    switch (format) {
      case 'json':
        return JSON.stringify(exportData, null, 2);
      case 'yaml':
        return this.convertToYAML(exportData);
      case 'env':
        return this.convertToEnv(exportData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async import(data: string, format: 'json' | 'yaml' | 'env' = 'json'): Promise<void> {
    this.ensureInitialized();

    let importedData: any;

    try {
      switch (format) {
        case 'json':
          importedData = JSON.parse(data);
          break;
        case 'yaml':
          importedData = this.parseYAML(data);
          break;
        case 'env':
          importedData = this.parseEnv(data);
          break;
        default:
          throw new Error(`Unsupported import format: ${format}`);
      }

      // Validate imported data
      if (this.config.validation.enabled && this.validation) {
        const result = await this.validation.validate(importedData.data);
        if (!result.valid) {
          throw new Error('Imported data validation failed');
        }
      }

      // Merge with existing data
      this.data = this.mergeSettings(this.data!, importedData.data);
      this.data!.metadata.updatedAt = Date.now();
      this.isDirty = true;

      this.emit('settings-imported', importedData);
      await this.save();
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async backup(): Promise<string> {
    this.ensureInitialized();
    return await this.storage.backup();
  }

  async restore(backup: string): Promise<void> {
    this.ensureInitialized();
    await this.storage.restore(backup);
    await this.loadSettings();
    this.emit('settings-restored');
  }

  async sync(): Promise<void> {
    if (!this.sync || !this.config.synchronization.enabled) {
      return;
    }

    try {
      const remoteData = await this.sync.pull();

      // Handle conflicts
      const conflicts = await this.resolveConflicts(this.data!, remoteData);

      if (conflicts.length > 0) {
        this.emit('sync-conflicts', conflicts);
        return;
      }

      // Merge data
      this.data = this.mergeSettings(this.data!, remoteData);
      this.data!.metadata.sync = {
        ...this.data!.metadata.sync,
        lastSync: Date.now(),
        conflicts: [],
        version: this.data!.metadata.sync.version + 1
      };

      this.isDirty = true;
      await this.save();

      // Push to remote
      await this.sync.push(this.data!);

      this.emit('settings-synced', { timestamp: Date.now() });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  async validate(): Promise<ValidationResult> {
    this.ensureInitialized();

    if (!this.validation) {
      return {
        valid: true,
        errors: [],
        warnings: []
      };
    }

    const result = await this.validation.validate(this.data!);
    this.data!.metadata.validation = {
      valid: result.valid,
      lastValidated: Date.now(),
      errors: result.errors,
      warnings: result.warnings,
      checksum: this.generateChecksum(this.data!)
    };

    this.emit('settings-validated', result);
    return result;
  }

  async migrate(version?: string): Promise<void> {
    if (!this.migration) {
      throw new Error('Migration adapter not available');
    }

    const currentVersion = await this.migration.getCurrentVersion();
    const targetVersion = version || currentVersion;

    if (targetVersion === currentVersion) {
      return;
    }

    const availableMigrations = await this.migration.getAvailableMigrations();

    if (targetVersion > currentVersion) {
      // Upgrade
      const migrations = availableMigrations.filter(m =>
        m.version > currentVersion && m.version <= targetVersion
      );

      for (const migration of migrations) {
        await this.migration.executeMigration(migration, 'up');
        this.emit('migration-executed', { migration, direction: 'up' });
      }
    } else {
      // Downgrade
      const migrations = availableMigrations.filter(m =>
        m.version <= currentVersion && m.version > targetVersion
      ).reverse();

      for (const migration of migrations) {
        await this.migration.executeMigration(migration, 'down');
        this.emit('migration-executed', { migration, direction: 'down' });
      }
    }

    // Reload settings after migration
    await this.loadSettings();
    this.emit('settings-migrated', { from: currentVersion, to: targetVersion });
  }

  // Schema management
  addSchema(schema: SettingsSchema): void {
    this.schemas.set(schema.id, schema);
    this.emit('schema-added', schema);
  }

  removeSchema(schemaId: string): void {
    this.schemas.delete(schemaId);
    this.emit('schema-removed', schemaId);
  }

  getSchema(schemaId: string): SettingsSchema | undefined {
    return this.schemas.get(schemaId);
  }

  getAllSchemas(): SettingsSchema[] {
    return Array.from(this.schemas.values());
  }

  // Hook management
  addHook(event: SettingsEventType, handler: Function, priority: number = 0): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }

    const hooks = this.hooks.get(event)!;
    hooks.push({ handler, priority });
    hooks.sort((a, b) => b.priority - a.priority);
  }

  removeHook(event: SettingsEventType, handler: Function): void {
    const hooks = this.hooks.get(event);
    if (hooks) {
      const index = hooks.findIndex(h => h.handler === handler);
      if (index !== -1) {
        hooks.splice(index, 1);
      }
    }
  }

  // Utility methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Settings manager not initialized');
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);
    if (target && lastKey in target) {
      delete target[lastKey];
    }
  }

  private hasNestedValue(obj: any, path: string): boolean {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => current?.[key], obj);
    return target && lastKey in target;
  }

  private generateChecksum(data: any): string {
    // Simple checksum implementation
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private async resolveConflicts(local: SettingsData, remote: SettingsData): Promise<SyncConflict[]> {
    if (!this.sync) {
      return [];
    }

    const conflicts: SyncConflict[] = [];

    // Simple conflict detection based on last update time
    if (local.metadata.updatedAt > remote.metadata.updatedAt) {
      // Local is newer, but still check for specific conflicts
      // This is a simplified implementation
    } else {
      // Remote is newer
      conflicts.push({
        id: this.generateId(),
        path: 'root',
        localValue: local,
        remoteValue: remote,
        timestamp: Date.now(),
        resolved: false
      });
    }

    return conflicts;
  }

  private mergeSettings(local: SettingsData, remote: SettingsData): SettingsData {
    // Simple merge strategy - remote takes precedence for conflicts
    // In a real implementation, this would be more sophisticated
    return {
      ...local,
      ...remote,
      metadata: {
        ...local.metadata,
        ...remote.metadata,
        updatedAt: Math.max(local.metadata.updatedAt, remote.metadata.updatedAt)
      }
    };
  }

  private async syncSettings(): Promise<void> {
    try {
      await this.sync();
    } catch (error) {
      this.emit('sync-error', error);
    }
  }

  private handleSyncEvent(event: SettingsEvent): void {
    // Handle sync-related events
    switch (event.type) {
      case 'settings-synced':
        this.emit('sync-status', { status: 'synced', timestamp: event.timestamp });
        break;
      case 'sync-conflicts':
        this.emit('sync-status', { status: 'conflicts', conflicts: event.data });
        break;
      case 'sync-error':
        this.emit('sync-status', { status: 'error', error: event.data });
        break;
    }
  }

  private convertToYAML(data: any): string {
    // Simplified YAML conversion
    // In a real implementation, use a proper YAML library
    return JSON.stringify(data, null, 2)
      .replace(/"/g, '')
      .replace(/,/g, '')
      .replace(/{/g, '')
      .replace(/}/g, '')
      .replace(/\[/g, '')
      .replace(/\]/g, '');
  }

  private parseYAML(yaml: string): any {
    // Simplified YAML parsing
    // In a real implementation, use a proper YAML library
    try {
      return JSON.parse(yaml);
    } catch {
      throw new Error('Invalid YAML format');
    }
  }

  private convertToEnv(data: any): string {
    // Convert settings to ENV format
    const env: string[] = [];
    const flatten = (obj: any, prefix: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();
        if (typeof value === 'object' && value !== null) {
          flatten(value, fullKey);
        } else {
          env.push(`${fullKey}=${value}`);
        }
      }
    };
    flatten(data);
    return env.join('\n');
  }

  private parseEnv(env: string): any {
    // Parse ENV format to settings
    const data: any = {};
    const lines = env.split('\n');
    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        const keys = key.toLowerCase().split('_');
        const lastKey = keys.pop()!;
        const target = keys.reduce((current, k) => {
          if (!(k in current)) {
            current[k] = {};
          }
          return current[k];
        }, data);
        target[lastKey] = value;
      }
    }
    return data;
  }

  private generateId(): string {
    return `settings_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public utility methods
  async getMetadata(): Promise<SettingsMetadata | null> {
    this.ensureInitialized();
    return this.metadata;
  }

  async isDirty(): Promise<boolean> {
    return this.isDirty;
  }

  async getStatus(): Promise<{
    initialized: boolean;
    loading: boolean;
    dirty: boolean;
    lastSync?: number;
    lastSave?: number;
    version: string;
  }> {
    return {
      initialized: this.isInitialized,
      loading: this.isLoading,
      dirty: this.isDirty,
      lastSync: this.data?.metadata.sync.lastSync,
      lastSave: this.data?.metadata.updatedAt,
      version: this.data?.version || 'unknown'
    };
  }

  async destroy(): Promise<void> {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Save any pending changes
    if (this.isDirty && this.isInitialized) {
      await this.save();
    }

    this.removeAllListeners();
    this.isInitialized = false;
    this.emit('destroyed');
  }
}