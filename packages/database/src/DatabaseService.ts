import Database from 'better-sqlite3';
import { DatabaseManager } from './DatabaseManager';
import { ArtifactStorage, ArtifactStorageConfig } from './ArtifactStorage';
import { UsageTracker, UsageTrackerConfig } from './UsageTracker';
import { QueryEngine } from './QueryEngine';
import { JobRepository } from './repositories/JobRepository';
import { ArtifactRepository } from './repositories/ArtifactRepository';
import { SessionRepository } from './repositories/SessionRepository';
import {
  Job,
  CreateJob,
  UpdateJob,
  JobQuery,
  JobFilter,
  JobArtifact,
  CreateJobArtifact,
  Session,
  CreateSession,
  PaginatedResult,
  JobStats,
  UsageStats,
  DatabaseConfig,
  JobEvent,
  DatabaseError,
  CostCalculation
} from './types';

export interface DatabaseServiceConfig {
  database?: DatabaseConfig;
  artifactStorage?: Partial<ArtifactStorageConfig>;
  usageTracker?: Partial<UsageTrackerConfig>;
}

export class DatabaseService {
  private dbManager: DatabaseManager;
  private artifactStorage: ArtifactStorage;
  private usageTracker: UsageTracker;
  private queryEngine: QueryEngine;
  private jobRepository: JobRepository;
  private artifactRepository: ArtifactRepository;
  private sessionRepository: SessionRepository;

  constructor(config: DatabaseServiceConfig = {}) {
    // Initialize database manager
    this.dbManager = new DatabaseManager(config.database);

    // Get database instance
    const db = this.dbManager.getDatabase();

    // Initialize artifact storage
    this.artifactStorage = new ArtifactStorage(db, config.artifactStorage);

    // Initialize usage tracker
    this.usageTracker = new UsageTracker(db, config.usageTracker);

    // Initialize query engine
    this.queryEngine = new QueryEngine(db);

    // Initialize repositories
    this.jobRepository = new JobRepository(db);
    this.artifactRepository = new ArtifactRepository(db, this.artifactStorage);
    this.sessionRepository = new SessionRepository(db);
  }

  async initialize(): Promise<void> {
    try {
      console.log('Initializing database service...');

      // Initialize database
      await this.dbManager.initialize();

      console.log('Database service initialized successfully');
    } catch (error) {
      throw new DatabaseError('Failed to initialize database service', error as Error);
    }
  }

  // Job operations
  async createJob(data: CreateJob): Promise<Job> {
    return await this.jobRepository.createJob(data);
  }

  async getJob(id: number): Promise<Job | null> {
    return await this.jobRepository.findById(id);
  }

  async getJobByUUID(uuid: string): Promise<Job | null> {
    return await this.jobRepository.findByUUID(uuid);
  }

  async updateJob(id: number, data: UpdateJob): Promise<Job> {
    return await this.jobRepository.update(id, data);
  }

  async startJob(id: number, providerJobId?: string): Promise<Job> {
    return await this.jobRepository.startJob(id, providerJobId);
  }

  async completeJob(
    id: number,
    response: string,
    tokensUsed: number,
    costUsd: number,
    error?: string
  ): Promise<Job> {
    const job = await this.jobRepository.completeJob(id, response, tokensUsed, costUsd, error);

    // Track usage for completed jobs
    if (job.status === 'completed') {
      await this.usageTracker.trackJobCompletion(job);
    }

    return job;
  }

  async cancelJob(id: number): Promise<Job> {
    return await this.jobRepository.cancelJob(id);
  }

  async deleteJob(id: number): Promise<boolean> {
    return await this.jobRepository.delete(id);
  }

  async queryJobs(query: JobQuery): Promise<PaginatedResult<Job>> {
    return await this.jobRepository.query(query);
  }

  async getJobStats(filter?: JobFilter): Promise<JobStats> {
    return await this.jobRepository.getStats(filter);
  }

  async searchJobs(searchTerm: string, options?: any): Promise<{ jobs: Job[]; total: number }> {
    return await this.queryEngine.searchJobs(searchTerm, options);
  }

  // Session operations
  async createSession(data: CreateSession): Promise<Session> {
    return await this.sessionRepository.createSession(data);
  }

  async getSession(id: number): Promise<Session | null> {
    return await this.sessionRepository.findById(id);
  }

  async getSessionByUUID(uuid: string): Promise<Session | null> {
    return await this.sessionRepository.findByUUID(uuid);
  }

  async updateSession(id: number, data: any): Promise<Session> {
    return await this.sessionRepository.update(id, data);
  }

  async updateSessionActivity(id: number): Promise<Session> {
    return await this.sessionRepository.updateActivity(id);
  }

  async deleteSession(id: number): Promise<boolean> {
    return await this.sessionRepository.delete(id);
  }

  async findRecentSessions(limit: number = 50): Promise<Session[]> {
    return await this.sessionRepository.findRecent(limit);
  }

  async findActiveSessions(sinceDays: number = 7): Promise<Session[]> {
    return await this.sessionRepository.findActive(sinceDays);
  }

  // Artifact operations
  async createArtifact(data: CreateJobArtifact & { fileData: Buffer }): Promise<JobArtifact> {
    return await this.artifactRepository.createArtifact(data);
  }

  async getArtifact(id: number): Promise<JobArtifact | null> {
    return await this.artifactRepository.findById(id);
  }

  async getArtifactByUUID(uuid: string): Promise<JobArtifact | null> {
    return await this.artifactRepository.findByUUID(uuid);
  }

  async getJobArtifacts(jobId: number): Promise<JobArtifact[]> {
    return await this.artifactRepository.findByJobId(jobId);
  }

  async getArtifactData(artifact: JobArtifact): Promise<Buffer> {
    return await this.artifactRepository.getArtifactData(artifact);
  }

  async getArtifactPreview(artifact: JobArtifact): Promise<Buffer | null> {
    return await this.artifactRepository.getArtifactPreview(artifact);
  }

  async deleteArtifact(id: number): Promise<boolean> {
    return await this.artifactRepository.delete(id);
  }

  async getArtifactStorageStats() {
    return await this.artifactRepository.getStorageStats();
  }

  // Usage tracking operations
  async calculateCost(calculation: CostCalculation): Promise<number> {
    return this.usageTracker.calculateCost(calculation);
  }

  async getUsageStats(timeRange: { start: Date; end: Date }, groupBy?: 'day' | 'week' | 'month'): Promise<UsageStats> {
    return await this.usageTracker.getUsageStats(timeRange, groupBy);
  }

  updateCostModel(provider: string, model: string, costModel: any): void {
    this.usageTracker.updateCostModel(provider, model, costModel);
  }

  // Event operations
  async getJobEvents(jobId: number, filter?: any, pagination?: any): Promise<{ events: JobEvent[]; total: number }> {
    return await this.queryEngine.queryJobEvents(jobId, filter, pagination);
  }

  // Database operations
  async backup(backupPath: string): Promise<void> {
    return await this.dbManager.backup(backupPath);
  }

  async restore(backupPath: string): Promise<void> {
    return await this.dbManager.restore(backupPath);
  }

  async vacuum(): Promise<void> {
    return await this.dbManager.vacuum();
  }

  async optimize(): Promise<void> {
    return await this.dbManager.optimize();
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string; stats?: any }> {
    return await this.dbManager.healthCheck();
  }

  async getDatabaseStats() {
    return this.dbManager.getStats();
  }

  // Cleanup operations
  async cleanup(): Promise<{
    expiredArtifacts: { deletedCount: number; freedSpace: number };
    oldJobs: { deletedCount: number; deletedJobs: Job[] };
    inactiveSessions: { deletedCount: number; deletedSessions: Session[] };
  }> {
    const results = await Promise.allSettled([
      this.artifactRepository.cleanupExpiredArtifacts(),
      this.jobRepository.cleanupOldJobs(30),
      this.sessionRepository.cleanupInactiveSessions(30)
    ]);

    const expiredArtifacts = results[0].status === 'fulfilled' ? results[0].value : { deletedCount: 0, freedSpace: 0 };
    const oldJobs = results[1].status === 'fulfilled' ? results[1].value : { deletedCount: 0, deletedJobs: [] };
    const inactiveSessions = results[2].status === 'fulfilled' ? results[2].value : { deletedCount: 0, deletedSessions: [] };

    return {
      expiredArtifacts,
      oldJobs,
      inactiveSessions
    };
  }

  // Performance testing
  async performanceTest(): Promise<{ queryTimes: number[]; averageTime: number; p95Time: number }> {
    const queryTimes: number[] = [];
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      await this.jobRepository.query({ limit: 50 });
      const endTime = Date.now();
      queryTimes.push(endTime - startTime);
    }

    queryTimes.sort((a, b) => a - b);
    const averageTime = queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length;
    const p95Time = queryTimes[Math.floor(queryTimes.length * 0.95)];

    return {
      queryTimes,
      averageTime,
      p95Time
    };
  }

  // Close connections
  async close(): Promise<void> {
    try {
      console.log('Closing database service...');

      // Stop background tasks
      this.usageTracker.stop();
      this.artifactStorage.stopAutoCleanup();

      // Close database
      await this.dbManager.close();

      console.log('Database service closed successfully');
    } catch (error) {
      throw new DatabaseError('Failed to close database service', error as Error);
    }
  }

  // Reset database (for testing)
  async reset(): Promise<void> {
    await this.dbManager.reset();
  }

  // Get underlying components for advanced usage
  getDatabase(): Database.Database {
    return this.dbManager.getDatabase();
  }

  getJobRepository(): JobRepository {
    return this.jobRepository;
  }

  getArtifactRepository(): ArtifactRepository {
    return this.artifactRepository;
  }

  getSessionRepository(): SessionRepository {
    return this.sessionRepository;
  }

  getQueryEngine(): QueryEngine {
    return this.queryEngine;
  }

  getUsageTracker(): UsageTracker {
    return this.usageTracker;
  }

  getArtifactStorage(): ArtifactStorage {
    return this.artifactStorage;
  }
}