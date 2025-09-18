// Offline System Types
// =====================

/**
 * Storage Service Interface
 */
export interface IStorageService extends EventEmitter {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
  getStorageInfo(): Promise<StorageInfo>;
  loadPendingOperations(): Promise<OfflineOperation[]>;
  savePendingOperations(operations: OfflineOperation[]): Promise<void>;
  compress(data: any): Promise<string>;
  decompress(compressed: string): Promise<any>;
  encrypt(data: any, key: string): Promise<string>;
  decrypt(encrypted: string, key: string): Promise<any>;
}

/**
 * Sync Service Interface
 */
export interface ISyncService extends EventEmitter {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  syncPendingOperations(): Promise<SyncResult>;
  syncAll(): Promise<SyncResult>;
  syncEntity(entity: string, entityId: string): Promise<SyncResult>;
  getSyncStatus(): Promise<SyncStatus>;
  getHealthStatus(): Promise<SyncHealth>;
  pauseSync(): Promise<void>;
  resumeSync(): Promise<void>;
  forceSync(): Promise<SyncResult>;
  getSyncHistory(): Promise<SyncHistory[]>;
  clearSyncHistory(): Promise<void>;
}

/**
 * Conflict Resolver Interface
 */
export interface IConflictResolver extends EventEmitter {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  detectConflicts(operations: OfflineOperation[]): Promise<Conflict[]>;
  resolveConflict(conflict: Conflict, strategy: ConflictResolutionStrategy): Promise<ConflictResolution>;
  autoResolveConflicts(conflicts: Conflict[]): Promise<ConflictResolution[]>;
  getConflicts(): Conflict[];
  clearConflicts(): Promise<void>;
  setResolutionStrategy(strategy: ConflictResolutionStrategy): void;
  getResolutionStrategies(): ConflictResolutionStrategy[];
}

/**
 * Offline UI Interface
 */
export interface IOfflineUI extends EventEmitter {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  showOfflineNotification(): Promise<void>;
  showOnlineNotification(): Promise<void>;
  showSyncProgress(): Promise<void>;
  hideSyncProgress(): Promise<void>;
  showSyncError(error: Error): Promise<void>;
  showConflictDialog(conflict: Conflict): Promise<void>;
  hideConflictDialog(): Promise<void>;
  showOperationError(operation: OfflineOperation, error: Error): Promise<void>;
  showStorageError(error: Error): Promise<void>;
  showStorageFullWarning(): Promise<void>;
  showOfflineError(): Promise<void>;
  showOfflineModeEnabled(): Promise<void>;
  showOfflineModeDisabled(): Promise<void>;
  updatePendingOperations(count: number): Promise<void>;
  updateSyncStatus(status: OfflineStatus): Promise<void>;
  updateStats(stats: OfflineStats): Promise<void>;
}

/**
 * Queue Service Interface
 */
export interface IQueueService extends EventEmitter {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  enqueue(operation: OfflineOperation): Promise<void>;
  dequeue(): Promise<OfflineOperation | null>;
  retryOperation(operationId: string): Promise<void>;
  cancelOperation(operationId: string): Promise<void>;
  getQueue(): OfflineOperation[];
  getPendingOperations(): OfflineOperation[];
  getFailedOperations(): OfflineOperation[];
  clearQueue(): Promise<void>;
  processQueue(): Promise<void>;
  pauseQueue(): Promise<void>;
  resumeQueue(): Promise<void>;
  isProcessing(): boolean;
}

/**
 * Analytics Service Interface
 */
export interface IAnalyticsService extends EventEmitter {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  trackEvent(event: AnalyticsEvent): Promise<void>;
  trackMetric(metric: AnalyticsMetric): Promise<void>;
  trackError(error: AnalyticsError): Promise<void>;
  getAnalyticsData(timeRange: TimeRange): Promise<AnalyticsData>;
  getPerformanceMetrics(): Promise<PerformanceMetrics>;
  getUsageStats(): Promise<UsageStats>;
  exportData(format: 'json' | 'csv'): Promise<string>;
  clearData(): Promise<void>;
}

/**
 * Storage Information
 */
export interface StorageInfo {
  total: number;
  used: number;
  available: number;
  quota: number;
  usage: number;
}

/**
 * Sync Result
 */
export interface SyncResult {
  success: boolean;
  operationsSynced: number;
  operationsFailed: number;
  bytesSynced: number;
  duration: number;
  conflicts: Conflict[];
  errors: Error[];
  timestamp: Date;
}

/**
 * Sync Status
 */
export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  nextSyncTime: Date | null;
  pendingOperations: number;
  failedOperations: number;
  syncQueue: SyncQueueItem[];
}

/**
 * Sync Health
 */
export interface SyncHealth {
  health: 'healthy' | 'degraded' | 'critical';
  lastCheckTime: Date;
  issues: HealthIssue[];
  recommendations: string[];
}

/**
 * Sync Queue Item
 */
export interface SyncQueueItem {
  id: string;
  operation: OfflineOperation;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  lastAttempt: Date | null;
  nextAttempt: Date | null;
  error?: string;
}

/**
 * Sync History
 */
export interface SyncHistory {
  id: string;
  timestamp: Date;
  duration: number;
  operationsSynced: number;
  operationsFailed: number;
  bytesSynced: number;
  success: boolean;
  errors: string[];
}

/**
 * Conflict
 */
export interface Conflict {
  id: string;
  operation: OfflineOperation;
  serverData: any;
  localData: any;
  conflictType: 'create' | 'update' | 'delete';
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestions: ConflictSuggestion[];
}

/**
 * Conflict Suggestion
 */
export interface ConflictSuggestion {
  strategy: ConflictResolutionStrategy;
  description: string;
  confidence: number;
  risk: 'low' | 'medium' | 'high';
}

/**
 * Conflict Resolution Strategy
 */
export type ConflictResolutionStrategy =
  | 'local_wins'
  | 'server_wins'
  | 'merge'
  | 'manual'
  | 'timestamp_wins'
  | 'user_wins'
  | 'field_level_merge';

/**
 * Conflict Resolution
 */
export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvedData: any;
  resolutionTime: Date;
  resolvedBy: 'auto' | 'user' | 'system';
  confidence: number;
  metadata?: any;
}

/**
 * Analytics Event
 */
export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  metadata?: any;
}

/**
 * Analytics Metric
 */
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

/**
 * Analytics Error
 */
export interface AnalyticsError {
  id: string;
  type: string;
  message: string;
  stack?: string;
  timestamp: Date;
  context?: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Time Range
 */
export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Analytics Data
 */
export interface AnalyticsData {
  events: AnalyticsEvent[];
  metrics: AnalyticsMetric[];
  errors: AnalyticsError[];
  summary: AnalyticsSummary;
}

/**
 * Analytics Summary
 */
export interface AnalyticsSummary {
  totalEvents: number;
  totalErrors: number;
  errorRate: number;
  averageResponseTime: number;
  topEvents: AnalyticsEvent[];
  topErrors: AnalyticsError[];
  performanceMetrics: PerformanceMetrics;
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  averageSyncTime: number;
  averageOperationTime: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
}

/**
 * Usage Stats
 */
export interface UsageStats {
  totalOperations: number;
  dataSynced: number;
  timeOffline: number;
  conflictsResolved: number;
  topFeatures: string[];
  usageByHour: UsageByHour[];
  usageByDay: UsageByDay[];
}

/**
 * Usage By Hour
 */
export interface UsageByHour {
  hour: number;
  operations: number;
  data: number;
}

/**
 * Usage By Day
 */
export interface UsageByDay {
  date: string;
  operations: number;
  data: number;
}

/**
 * Health Issue
 */
export interface HealthIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: Date;
  resolved: boolean;
}

/**
 * Cache Strategy
 */
export interface CacheStrategy {
  type: 'memory' | 'indexeddb' | 'both';
  maxSize: number;
  ttl: number;
  compression: boolean;
  encryption: boolean;
  evictionPolicy: 'lru' | 'fifo' | 'lfu';
}

/**
 * Network Condition
 */
export interface NetworkCondition {
  online: boolean;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * Offline Operation (re-export from main file)
 */
export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync';
  entity: string;
  entityId: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
  error?: string;
  dependencies?: string[];
  metadata?: any;
}

/**
 * Offline Status (re-export from main file)
 */
export interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  hasPendingChanges: boolean;
  hasConflicts: boolean;
  lastSyncTime: Date | null;
  nextSyncTime: Date | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  batteryStatus: 'charging' | 'discharging' | 'critical';
  storageStatus: 'normal' | 'low' | 'critical';
  syncHealth: 'healthy' | 'degraded' | 'critical';
}

/**
 * Offline Stats (re-export from main file)
 */
export interface OfflineStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageSyncTime: number;
  lastSyncDuration: number;
  dataSynced: number;
  conflictsResolved: number;
  pendingOperations: number;
  cacheHits: number;
  cacheMisses: number;
  storageUsed: number;
  storageAvailable: number;
  batteryLevel: number;
  networkLatency: number;
}

/**
 * Offline Manager Config (re-export from main file)
 */
export interface OfflineManagerConfig {
  enableOfflineMode: boolean;
  syncInterval: number;
  maxRetries: number;
  retryDelay: number;
  enableBackgroundSync: boolean;
  enableConflictResolution: boolean;
  enableCompression: boolean;
  maxStorageSize: number;
  cacheStrategy: 'memory' | 'indexeddb' | 'both';
  offlineTimeout: number;
  enableOptimisticUpdates: boolean;
  enableRealtimeSync: boolean;
  syncBatchSize: number;
  enableDataEncryption: boolean;
  enableSelectiveSync: boolean;
  prioritySync: string[];
  enableHealthChecks: boolean;
  healthCheckInterval: number;
  enableTelemetry: boolean;
  enableDiagnostics: boolean;
}