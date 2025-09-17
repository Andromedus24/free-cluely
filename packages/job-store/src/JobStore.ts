import { DatabaseManager } from './DatabaseManager';
import { MigrationManager } from './migrations/Migration';
import { ArtifactStorage } from './storage/ArtifactStorage';
import { UsageTracker } from './usage/UsageTracker';
import { CostRateManager } from './usage/CostRateManager';
import { AutoRollupScheduler } from './usage/AutoRollupScheduler';
import { JobRepository } from './repository/JobRepository';
import { ArtifactRepository } from './repository/ArtifactRepository';
import { EventRepository } from './repository/EventRepository';
import { UsageRepository } from './repository/UsageRepository';
import { JobQueries } from './queries/JobQueries';

import {
  Job,
  JobArtifact,
  JobEvent,
  CreateJobRequest,
  UpdateJobRequest,
  CreateArtifactRequest,
  CreateEventRequest,
  JobQuery,
  JobListResponse,
  ArtifactFilter,
  ArtifactListResponse,
  EventFilter,
  EventListResponse,
  UsageStatsFilter,
  UsageStatsResponse,
  CostBreakdown,
  DashboardStats,
  DatabaseError
} from './types/JobTypes';

export interface JobStoreConfig {
  databasePath: string;
  artifactStoragePath: string;
  enableUsageTracking: boolean;
  enableRollupScheduler: boolean;
  enableArtifactStorage: boolean;
  enableValidation: boolean;
  enableEvents: boolean;
  usageCaptureConfig?: any;
  rollupConfig?: any;
  artifactStorageConfig?: any;
}

export class JobStore {
  private dbManager: DatabaseManager;
  private migrationManager: MigrationManager | null = null;
  private artifactStorage: ArtifactStorage | null = null;
  private usageTracker: UsageTracker | null = null;
  private costRateManager: CostRateManager | null = null;
  private rollupScheduler: AutoRollupScheduler | null = null;
  private jobRepository: JobRepository | null = null;
  private artifactRepository: ArtifactRepository | null = null;
  private eventRepository: EventRepository | null = null;
  private usageRepository: UsageRepository | null = null;
  private jobQueries: JobQueries | null = null;
  private config: JobStoreConfig;
  private initialized = false;

  constructor(config: JobStoreConfig) {
    this.config = {
      enableUsageTracking: true,
      enableRollupScheduler: true,
      enableArtifactStorage: true,
      enableValidation: true,
      enableEvents: true,
      ...config
    };

    this.dbManager = new DatabaseManager({
      path: this.config.databasePath,
      timeout: 30000,
      verbose: false
    });
  }

  async initialize(): Promise<void> {
    try {
      // Initialize database
      await this.dbManager.initialize();
      const db = this.dbManager.getDatabase();

      // Set up migration manager
      this.migrationManager = new MigrationManager(db);
      await this.migrationManager.initialize();

      // Set up artifact storage if enabled
      if (this.config.enableArtifactStorage) {
        this.artifactStorage = new ArtifactStorage(db, {
          basePath: this.config.artifactStoragePath,
          ...this.config.artifactStorageConfig
        });
      }

      // Set up usage tracking if enabled
      if (this.config.enableUsageTracking) {
        this.usageTracker = new UsageTracker(db, this.config.usageCaptureConfig);
        this.costRateManager = new CostRateManager(db);

        // Set up rollup scheduler if enabled
        if (this.config.enableRollupScheduler) {
          this.rollupScheduler = new AutoRollupScheduler(
            db,
            this.usageTracker,
            this.config.rollupConfig
          );
        }
      }

      // Set up repositories
      this.jobRepository = new JobRepository(
        db,
        {
          enableUsageTracking: this.config.enableUsageTracking,
          enableValidation: this.config.enableValidation,
          enableEvents: this.config.enableEvents
        },
        this.usageTracker || undefined
      );

      this.artifactRepository = new ArtifactRepository(
        db,
        {
          enableStorage: this.config.enableArtifactStorage,
          enableValidation: this.config.enableValidation,
          enableDeduplication: true
        },
        this.artifactStorage || undefined
      );

      this.eventRepository = new EventRepository(db, {
        enableValidation: this.config.enableValidation,
        enableCleanup: true,
        retentionDays: 90
      });

      this.usageRepository = new UsageRepository(db, {
        enableAggregation: true,
        enableCache: true,
        cacheTtlMinutes: 5
      });

      // Set up queries
      this.jobQueries = new JobQueries(db);

      // Start rollup scheduler if enabled
      if (this.rollupScheduler) {
        await this.rollupScheduler.start();
      }

      this.initialized = true;
      console.log('JobStore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize JobStore:', error);
      throw new DatabaseError(
        `Failed to initialize JobStore: ${error.message}`,
        'INITIALIZATION_FAILED',
        { originalError: error }
      );
    }
  }

  async close(): Promise<void> {
    try {
      // Stop rollup scheduler
      if (this.rollupScheduler) {
        await this.rollupScheduler.stop();
      }

      // Stop usage tracker
      if (this.usageTracker) {
        this.usageTracker.stopRollupTask();
      }

      // Close database
      await this.dbManager.close();

      this.initialized = false;
      console.log('JobStore closed successfully');
    } catch (error) {
      console.error('Failed to close JobStore:', error);
      throw new DatabaseError(
        `Failed to close JobStore: ${error.message}`,
        'CLOSE_FAILED',
        { originalError: error }
      );
    }
  }

  // Job Operations
  async createJob(request: CreateJobRequest): Promise<Job> {
    this.ensureInitialized();
    return await this.jobRepository!.createJob(request);
  }

  async getJob(id: string): Promise<Job | null> {
    this.ensureInitialized();
    return await this.jobRepository!.getJobById(id);
  }

  async updateJob(id: string, updates: UpdateJobRequest): Promise<Job> {
    this.ensureInitialized();
    return await this.jobRepository!.updateJob(id, updates);
  }

  async deleteJob(id: string, hardDelete: boolean = false): Promise<boolean> {
    this.ensureInitialized();
    return await this.jobRepository!.deleteJob(id, hardDelete);
  }

  async queryJobs(query: JobQuery): Promise<JobListResponse> {
    this.ensureInitialized();
    return await this.jobRepository!.queryJobs(query);
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    this.ensureInitialized();
    return await this.jobRepository!.getJobsByStatus(status as any);
  }

  async getRecentJobs(limit: number = 50): Promise<Job[]> {
    this.ensureInitialized();
    return await this.jobRepository!.getRecentJobs(limit);
  }

  async searchJobs(query: string, limit: number = 50): Promise<Job[]> {
    this.ensureInitialized();
    return await this.jobRepository!.searchJobs(query, limit);
  }

  // Artifact Operations
  async createArtifact(request: CreateArtifactRequest & { data: Buffer | string }): Promise<JobArtifact> {
    this.ensureInitialized();
    return await this.artifactRepository!.createArtifact(request);
  }

  async getArtifact(id: string): Promise<JobArtifact> {
    this.ensureInitialized();
    return await this.artifactRepository!.getArtifactById(id);
  }

  async getArtifactData(id: string): Promise<Buffer | null> {
    this.ensureInitialized();
    return await this.artifactRepository!.getArtifactData(id);
  }

  async getArtifactStream(id: string): Promise<any> {
    this.ensureInitialized();
    return await this.artifactRepository!.getArtifactStream(id);
  }

  async queryArtifacts(filter: ArtifactFilter, limit: number = 50, cursor?: string): Promise<ArtifactListResponse> {
    this.ensureInitialized();
    return await this.artifactRepository!.queryArtifacts(filter, limit, cursor);
  }

  async getArtifactsByJob(jobId: string): Promise<JobArtifact[]> {
    this.ensureInitialized();
    return await this.artifactRepository!.getArtifactsByJob(jobId);
  }

  // Event Operations
  async createEvent(request: CreateEventRequest): Promise<JobEvent> {
    this.ensureInitialized();
    return await this.eventRepository!.createEvent(request);
  }

  async getEventsByJob(jobId: string, limit: number = 100): Promise<JobEvent[]> {
    this.ensureInitialized();
    return await this.eventRepository!.getEventsByJob(jobId, limit);
  }

  async getJobTimeline(jobId: string): Promise<Array<{
    timestamp: Date;
    event: string;
    message: string;
    level: string;
    data: any;
  }>> {
    this.ensureInitialized();
    return await this.jobRepository!.getJobTimeline(jobId);
  }

  // Usage Operations
  async getUsageStats(filter: UsageStatsFilter): Promise<UsageStatsResponse> {
    this.ensureInitialized();
    return await this.usageRepository!.getUsageStats(filter);
  }

  async getCostBreakdown(startDate: string, endDate: string): Promise<CostBreakdown[]> {
    this.ensureInitialized();
    return await this.usageRepository!.getCostBreakdown(startDate, endDate);
  }

  async getDashboardStats(days: number = 30): Promise<DashboardStats> {
    this.ensureInitialized();
    return await this.usageRepository!.getDashboardStats(days);
  }

  async getUsageTrends(days: number = 30, groupBy: 'day' | 'week' = 'day'): Promise<Array<{
    period: string;
    total_jobs: number;
    total_cost: number;
    total_tokens: number;
    success_rate: number;
  }>> {
    this.ensureInitialized();
    return await this.usageRepository!.getUsageTrends(days, groupBy);
  }

  // Cost Rate Management
  async createCostRate(request: any): Promise<any> {
    this.ensureInitialized();
    return await this.costRateManager!.createCostRate(request);
  }

  async getCurrentCostRate(provider: string, model: string): Promise<any> {
    this.ensureInitialized();
    return await this.costRateManager!.getCurrentCostRate(provider, model);
  }

  async getCostRates(filter?: any): Promise<any[]> {
    this.ensureInitialized();
    return await this.costRateManager!.getCostRates(filter);
  }

  // Rollup Operations
  async triggerDailyRollup(date?: string): Promise<void> {
    this.ensureInitialized();
    if (this.rollupScheduler) {
      await this.rollupScheduler.triggerDailyRollup(date);
    } else if (this.usageTracker) {
      await this.usageTracker.performDailyRollup(date);
    }
  }

  async triggerWeeklyRollup(weekStart?: string): Promise<void> {
    this.ensureInitialized();
    if (this.rollupScheduler) {
      await this.rollupScheduler.triggerWeeklyRollup(weekStart);
    } else if (this.usageTracker) {
      await this.usageTracker.performWeeklyRollup(weekStart);
    }
  }

  // Advanced Queries
  async getJobStats(): Promise<any> {
    this.ensureInitialized();
    return await this.jobRepository!.getJobStats();
  }

  async getArtifactStats(jobId?: string): Promise<any> {
    this.ensureInitialized();
    return await this.artifactRepository!.getArtifactStats(jobId);
  }

  async getEventStats(jobId?: string, days: number = 30): Promise<any> {
    this.ensureInitialized();
    return await this.eventRepository!.getEventStats(jobId, days);
  }

  // Health Check
  async healthCheck(): Promise<{
    healthy: boolean;
    database: any;
    storage: any;
    scheduler: any;
    details: any;
  }> {
    const databaseHealth = await this.dbManager.healthCheck();

    let storageHealth = { healthy: true, details: 'Storage not enabled' };
    if (this.artifactStorage) {
      try {
        const stats = await this.artifactStorage.getStorageStats();
        storageHealth = { healthy: true, details: stats };
      } catch (error) {
        storageHealth = { healthy: false, details: error.message };
      }
    }

    let schedulerHealth = { healthy: true, details: 'Scheduler not enabled' };
    if (this.rollupScheduler) {
      try {
        const status = await this.rollupScheduler.getRollupStatus();
        schedulerHealth = { healthy: status.isRunning, details: status };
      } catch (error) {
        schedulerHealth = { healthy: false, details: error.message };
      }
    }

    const overallHealthy = databaseHealth.healthy && storageHealth.healthy && schedulerHealth.healthy;

    return {
      healthy: overallHealthy,
      database: databaseHealth,
      storage: storageHealth,
      scheduler: schedulerHealth,
      details: {
        initialized: this.initialized,
        usageTrackingEnabled: this.config.enableUsageTracking,
        artifactStorageEnabled: this.config.enableArtifactStorage,
        rollupSchedulerEnabled: this.config.enableRollupScheduler
      }
    };
  }

  // Utility Methods
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    this.ensureInitialized();

    const data = {
      jobs: await this.jobQueries!.getAllJobs(),
      artifacts: await this.jobQueries!.getAllArtifacts(),
      events: await this.jobQueries!.getAllEvents(),
      usageStats: await this.jobQueries!.getAllUsageStats(),
      costRates: await this.jobQueries!.getAllCostRates()
    };

    return format === 'json' ? JSON.stringify(data, null, 2) : this.convertToCSV(data);
  }

  async backup(backupPath: string): Promise<void> {
    this.ensureInitialized();
    await this.dbManager.backup(backupPath);
  }

  async restore(backupPath: string): Promise<void> {
    this.ensureInitialized();
    await this.dbManager.restore(backupPath);
  }

  async vacuum(): Promise<void> {
    this.ensureInitialized();
    await this.dbManager.vacuum();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new DatabaseError('JobStore not initialized', 'NOT_INITIALIZED');
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in production, use a proper CSV library
    let csv = '';

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        csv += `\n\n=== ${key.toUpperCase()} ===\n`;
        const headers = Object.keys(value[0]).join(',');
        const rows = value.map((row: any) => Object.values(row).join(','));
        csv += `${headers}\n${rows.join('\n')}`;
      }
    }

    return csv.trim();
  }
}