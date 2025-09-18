// Sync Manager Implementation
// ==========================

import { EventEmitter } from 'events';
import { SettingsData, SyncAdapter, SyncConflict, SyncStats } from '../types';
import { SettingsSynchronizer, SettingsSynchronizerConfig } from './SettingsSynchronizer';
import { CloudSyncAdapter, CloudSyncAdapterConfig } from './adapters/CloudSyncAdapter';
import { FileSystemSyncAdapter, FileSystemSyncAdapterConfig } from './adapters/FileSystemSyncAdapter';
import { WebSocketSyncAdapter, WebSocketSyncAdapterConfig } from './adapters/WebSocketSyncAdapter';
import { deepMergeSettings } from '../index';

export interface SyncManagerConfig extends SettingsSynchronizerConfig {
  enableRealtimeSync?: boolean;
  enableConflictDetection?: boolean;
  enableAutoBackup?: boolean;
  backupInterval?: number;
  maxBackupCount?: number;
  syncOnStartup?: boolean;
  syncOnSettingsChange?: boolean;
  syncOnNetworkChange?: boolean;
  realtimeSyncDebounce?: number;
  conflictResolutionTimeout?: number;
}

export interface SyncAdapterConfig {
  name: string;
  type: 'cloud' | 'filesystem' | 'websocket';
  enabled: boolean;
  priority: number;
  config: CloudSyncAdapterConfig | FileSystemSyncAdapterConfig | WebSocketSyncAdapterConfig;
}

export interface BackupInfo {
  id: string;
  timestamp: number;
  size: number;
  adapter: string;
  location: string;
  hash: string;
  compressed: boolean;
  encrypted: boolean;
}

export class SyncManager extends EventEmitter {
  private config: SyncManagerConfig;
  private synchronizer: SettingsSynchronizer;
  private adapters: Map<string, SyncAdapter> = new Map();
  private adapterConfigs: Map<string, SyncAdapterConfig> = new Map();
  private isActive: boolean = false;
  private backupTimer: NodeJS.Timeout | null = null;
  private syncDebounceTimer: NodeJS.Timeout | null = null;
  private backupHistory: BackupInfo[] = [];
  private syncStats: SyncStats = {
    lastSync: null,
    lastSuccess: null,
    lastFailure: null,
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    conflictsResolved: 0,
    bytesTransferred: 0,
    averageSyncTime: 0
  };

  constructor(config: Partial<SyncManagerConfig> = {}) {
    super();

    this.config = {
      enableRealtimeSync: true,
      enableConflictDetection: true,
      enableAutoBackup: true,
      backupInterval: 3600000, // 1 hour
      maxBackupCount: 10,
      syncOnStartup: true,
      syncOnSettingsChange: true,
      syncOnNetworkChange: true,
      realtimeSyncDebounce: 1000, // 1 second
      conflictResolutionTimeout: 30000, // 30 seconds
      ...config
    };

    this.synchronizer = new SettingsSynchronizer(this.config);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen to synchronizer events
    this.synchronizer.on('sync-started', (data) => {
      this.emit('sync-started', data);
    });

    this.synchronizer.on('sync-completed', (data) => {
      this.syncStats = { ...data.results.stats };
      this.emit('sync-completed', data);
    });

    this.synchronizer.on('sync-failed', (data) => {
      this.syncStats = { ...data.results.stats };
      this.emit('sync-failed', data);
    });

    this.synchronizer.on('pull-started', (data) => {
      this.emit('pull-started', data);
    });

    this.synchronizer.on('pull-completed', (data) => {
      this.emit('pull-completed', data);
    });

    this.synchronizer.on('pull-failed', (data) => {
      this.emit('pull-failed', data);
    });

    this.synchronizer.on('conflict-detected', (data) => {
      if (this.config.enableConflictDetection) {
        this.handleConflict(data);
      }
    });

    this.synchronizer.on('online', () => {
      if (this.config.syncOnNetworkChange) {
        this.triggerSync();
      }
    });

    this.synchronizer.on('offline', () => {
      this.emit('offline');
    });

    // Listen for window events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (this.config.syncOnNetworkChange) {
          this.triggerSync();
        }
      });

      window.addEventListener('offline', () => {
        this.emit('offline');
      });
    }
  }

  // Adapter management
  addAdapter(adapterConfig: SyncAdapterConfig): void {
    const adapter = this.createAdapter(adapterConfig);
    this.adapters.set(adapterConfig.name, adapter);
    this.adapterConfigs.set(adapterConfig.name, adapterConfig);
    this.synchronizer.addAdapter(adapterConfig.name, adapter);

    this.emit('adapter-added', { name: adapterConfig.name, config: adapterConfig });
  }

  removeAdapter(name: string): void {
    const adapter = this.adapters.get(name);
    if (adapter) {
      this.adapters.delete(name);
      this.adapterConfigs.delete(name);
      this.synchronizer.removeAdapter(name);

      // Clean up adapter if it has destroy method
      if (typeof adapter.destroy === 'function') {
        adapter.destroy();
      }

      this.emit('adapter-removed', { name });
    }
  }

  private createAdapter(adapterConfig: SyncAdapterConfig): SyncAdapter {
    switch (adapterConfig.type) {
      case 'cloud':
        return new CloudSyncAdapter(adapterConfig.config as CloudSyncAdapterConfig);
      case 'filesystem':
        return new FileSystemSyncAdapter(adapterConfig.config as FileSystemSyncAdapterConfig);
      case 'websocket':
        return new WebSocketSyncAdapter(adapterConfig.config as WebSocketSyncAdapterConfig);
      default:
        throw new Error(`Unknown adapter type: ${adapterConfig.type}`);
    }
  }

  // Sync operations
  async sync(settingsData: SettingsData, adapterNames?: string[]): Promise<SyncStats> {
    if (!this.isActive) {
      throw new Error('Sync manager is not active');
    }

    const targetAdapters = adapterNames || this.getEnabledAdapters();

    if (targetAdapters.length === 0) {
      throw new Error('No enabled sync adapters available');
    }

    const stats = await this.synchronizer.sync(settingsData, targetAdapters);

    // Create backup if enabled
    if (this.config.enableAutoBackup) {
      await this.createBackup(settingsData, targetAdapters);
    }

    return stats;
  }

  async pull(adapterNames?: string[]): Promise<SettingsData> {
    if (!this.isActive) {
      throw new Error('Sync manager is not active');
    }

    const targetAdapters = adapterNames || this.getEnabledAdapters();

    if (targetAdapters.length === 0) {
      throw new Error('No enabled sync adapters available');
    }

    return this.synchronizer.pull(targetAdapters);
  }

  private getEnabledAdapters(): string[] {
    return Array.from(this.adapterConfigs.values())
      .filter(config => config.enabled)
      .sort((a, b) => b.priority - a.priority)
      .map(config => config.name);
  }

  // Real-time sync
  triggerSync(settingsData?: SettingsData): void {
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(async () => {
      try {
        if (settingsData) {
          await this.sync(settingsData);
        } else {
          // Trigger a pull to get latest data
          await this.pull();
        }
      } catch (error) {
        this.emit('sync-error', { error, timestamp: Date.now() });
      }
    }, this.config.realtimeSyncDebounce);
  }

  // Conflict handling
  private async handleConflict(conflict: SyncConflict): Promise<void> {
    this.emit('conflict-detected', conflict);

    try {
      // Auto-resolve based on configuration
      const resolvedConflicts = await this.synchronizer.resolveConflicts([conflict]);

      if (resolvedConflicts.length > 0) {
        this.emit('conflict-resolved', { conflicts: resolvedConflicts });
      }
    } catch (error) {
      this.emit('conflict-resolution-failed', { conflict, error });
    }
  }

  // Backup management
  private async createBackup(settingsData: SettingsData, adapterNames: string[]): Promise<void> {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();

    // Create backup using each adapter
    for (const adapterName of adapterNames) {
      const adapter = this.adapters.get(adapterName);
      if (!adapter) continue;

      try {
        // Some adapters might have specific backup methods
        if (typeof adapter.sync === 'function') {
          await adapter.sync(settingsData, backupId);
        }
      } catch (error) {
        console.warn(`Failed to create backup with adapter ${adapterName}:`, error);
      }
    }

    // Add to backup history
    const backupInfo: BackupInfo = {
      id: backupId,
      timestamp,
      size: JSON.stringify(settingsData).length,
      adapter: adapterNames.join(','),
      location: 'multiple',
      hash: '', // Would calculate actual hash in production
      compressed: false,
      encrypted: false
    };

    this.backupHistory.push(backupInfo);

    // Limit backup history
    if (this.backupHistory.length > this.config.maxBackupCount!) {
      this.backupHistory = this.backupHistory.slice(-this.config.maxBackupCount!);
    }

    this.emit('backup-created', backupInfo);
  }

  async restoreBackup(backupId: string): Promise<SettingsData> {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // In a real implementation, this would restore from actual backup storage
    // For now, we'll pull the latest data from adapters
    const restoredData = await this.pull();

    this.emit('backup-restored', { backup, timestamp: Date.now() });
    return restoredData;
  }

  getBackupHistory(): BackupInfo[] {
    return [...this.backupHistory].sort((a, b) => b.timestamp - a.timestamp);
  }

  async deleteBackup(backupId: string): Promise<void> {
    const index = this.backupHistory.findIndex(b => b.id === backupId);
    if (index === -1) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const backup = this.backupHistory[index];
    this.backupHistory.splice(index, 1);

    this.emit('backup-deleted', backup);
  }

  // Lifecycle management
  async start(): Promise<void> {
    if (this.isActive) {
      return;
    }

    this.isActive = true;

    // Start auto-sync
    if (this.config.autoSync) {
      this.synchronizer.startAutoSync();
    }

    // Start backup timer
    if (this.config.enableAutoBackup) {
      this.startBackupTimer();
    }

    // Sync on startup if enabled
    if (this.config.syncOnStartup) {
      try {
        await this.pull();
      } catch (error) {
        console.warn('Failed to sync on startup:', error);
      }
    }

    this.emit('started', { timestamp: Date.now() });
  }

  async stop(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Stop synchronizer
    this.synchronizer.stopAutoSync();

    // Stop backup timer
    this.stopBackupTimer();

    // Clear debounce timer
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }

    // Clean up adapters
    for (const adapter of this.adapters.values()) {
      if (typeof adapter.destroy === 'function') {
        adapter.destroy();
      }
    }

    this.emit('stopped', { timestamp: Date.now() });
  }

  private startBackupTimer(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(async () => {
      try {
        // Get current settings to backup
        const currentSettings = await this.pull();
        await this.createBackup(currentSettings, this.getEnabledAdapters());
      } catch (error) {
        console.warn('Failed to create automatic backup:', error);
      }
    }, this.config.backupInterval);
  }

  private stopBackupTimer(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
  }

  // Configuration management
  updateConfig(newConfig: Partial<SyncManagerConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Update synchronizer config
    this.synchronizer.updateConfig(newConfig);

    // Restart backup timer if interval changed
    if (oldConfig.backupInterval !== this.config.backupInterval) {
      this.stopBackupTimer();
      if (this.config.enableAutoBackup && this.isActive) {
        this.startBackupTimer();
      }
    }

    this.emit('config-updated', { oldConfig, newConfig: this.config });
  }

  // Status and monitoring
  getStatus(): {
    active: boolean;
    adapters: Array<{ name: string; type: string; enabled: boolean; priority: number }>;
    stats: SyncStats;
    backupHistory: BackupInfo[];
    config: SyncManagerConfig;
  } {
    return {
      active: this.isActive,
      adapters: Array.from(this.adapterConfigs.values()).map(config => ({
        name: config.name,
        type: config.type,
        enabled: config.enabled,
        priority: config.priority
      })),
      stats: { ...this.syncStats },
      backupHistory: [...this.backupHistory],
      config: { ...this.config }
    };
  }

  getAdapterStatus(name: string): any {
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter ${name} not found`);
    }

    // Get adapter-specific status
    if (typeof adapter.getStatus === 'function') {
      return adapter.getStatus();
    }

    return { name, type: this.adapterConfigs.get(name)?.type };
  }

  async testConnection(adapterName?: string): Promise<boolean> {
    if (adapterName) {
      const adapter = this.adapters.get(adapterName);
      if (!adapter) {
        throw new Error(`Adapter ${adapterName} not found`);
      }

      return adapter.testConnection();
    } else {
      // Test all enabled adapters
      const enabledAdapters = this.getEnabledAdapters();
      const results = await Promise.allSettled(
        enabledAdapters.map(name => this.adapters.get(name)!.testConnection())
      );

      return results.every(result => result.status === 'fulfilled' && result.value);
    }
  }

  // Cleanup
  async destroy(): Promise<void> {
    await this.stop();
    this.removeAllListeners();
    this.adapters.clear();
    this.adapterConfigs.clear();
    this.backupHistory = [];
  }
}