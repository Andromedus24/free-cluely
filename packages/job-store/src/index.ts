// Main exports
export { JobStore } from './JobStore';
export { DatabaseManager } from './DatabaseManager';
export { ArtifactStorage } from './storage/ArtifactStorage';
export { UsageTracker } from './usage/UsageTracker';
export { CostRateManager } from './usage/CostRateManager';
export { AutoRollupScheduler } from './usage/AutoRollupScheduler';

// Repository exports
export { JobRepository } from './repository/JobRepository';
export { ArtifactRepository } from './repository/ArtifactRepository';
export { EventRepository } from './repository/EventRepository';
export { UsageRepository } from './repository/UsageRepository';

// Query exports
export { JobQueries } from './queries/JobQueries';

// Performance testing
export { PerformanceTester } from './performance/PerformanceTester';

// Type exports
export * from './types/JobTypes';

// Schema exports
export { ATLAS_DATABASE_SCHEMA } from './schema/DatabaseSchema';

// Migration exports
export { MigrationManager } from './migrations/Migration';

// Usage types
export type {
  UsageCaptureConfig,
  UsageMetrics,
  RollupConfig,
  RollupJob
} from './usage/UsageTracker';

export type {
  CostRateCreateRequest,
  CostRateUpdateRequest
} from './usage/CostRateManager';

export type {
  JobRepositoryConfig,
  ArtifactRepositoryConfig,
  EventRepositoryConfig,
  UsageRepositoryConfig
} from './repository/JobRepository';

export type {
  JobStoreConfig
} from './JobStore';

export type {
  PerformanceTestConfig,
  PerformanceMetrics,
  PerformanceTestResult
} from './performance/PerformanceTester';

// Default configurations
export const DEFAULT_JOB_STORE_CONFIG = {
  enableUsageTracking: true,
  enableRollupScheduler: true,
  enableArtifactStorage: true,
  enableValidation: true,
  enableEvents: true,
  usageCaptureConfig: {
    enableAutoCapture: true,
    rollupIntervalMinutes: 60,
    batchSize: 1000,
    enableCostCalculation: true,
    enableDailyRollups: true,
    enableWeeklyRollups: true,
    retentionDays: 365
  },
  rollupConfig: {
    enableDailyRollups: true,
    enableWeeklyRollups: true,
    dailyRollupHour: 2,
    weeklyRollupDay: 0,
    weeklyRollupHour: 3,
    enableCleanup: true,
    cleanupRetentionDays: 365,
    enableBackfill: true,
    maxBackfillDays: 30
  },
  artifactStorageConfig: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    retentionDays: 30,
    enableDeduplication: true,
    enableCleanup: true,
    cleanupIntervalHours: 24
  }
};

export const DEFAULT_PERFORMANCE_CONFIG = {
  testJobCount: 50000,
  testArtifactCount: 100000,
  testEventCount: 250000,
  batchSize: 1000,
  maxQueryTimeMs: 300,
  enableDetailedMetrics: true,
  testDataRetentionDays: 7
};

// Utility functions
export const createJobStore = async (config: Partial<JobStoreConfig> = {}): Promise<JobStore> => {
  const path = require('path');
  const os = require('os');

  const defaultConfig: JobStoreConfig = {
    databasePath: path.join(os.homedir(), '.atlas', 'job-store.db'),
    artifactStoragePath: path.join(os.homedir(), '.atlas', 'artifacts'),
    ...DEFAULT_JOB_STORE_CONFIG,
    ...config
  };

  const jobStore = new JobStore(defaultConfig);
  await jobStore.initialize();
  return jobStore;
};

export const runPerformanceTests = async (
  jobStore: JobStore,
  config?: Partial<PerformanceTestConfig>
): Promise<PerformanceTestResult> => {
  const { PerformanceTester } = require('./performance/PerformanceTester');
  const { JobQueries } = require('./queries/JobQueries');

  const tester = new PerformanceTester(
    jobStore['dbManager'].getDatabase(),
    jobStore,
    new JobQueries(jobStore['dbManager'].getDatabase()),
    config
  );

  const result = await tester.runFullTestSuite();
  await tester.cleanupTestData();

  return result;
};

// Version info
export const JOB_STORE_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;