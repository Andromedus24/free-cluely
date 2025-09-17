import { Database } from 'better-sqlite3';
import { UsageTracker } from './UsageTracker';
import { DatabaseError } from '../types/JobTypes';

export interface RollupConfig {
  enableDailyRollups: boolean;
  enableWeeklyRollups: boolean;
  dailyRollupHour: number; // 0-23
  weeklyRollupDay: number; // 0-6 (Sunday-Saturday)
  weeklyRollupHour: number; // 0-23
  enableCleanup: boolean;
  cleanupRetentionDays: number;
  enableBackfill: boolean;
  maxBackfillDays: number;
}

export interface RollupJob {
  id: string;
  type: 'daily' | 'weekly' | 'cleanup' | 'backfill';
  status: 'pending' | 'running' | 'completed' | 'failed';
  targetDate?: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

export class AutoRollupScheduler {
  private db: Database;
  private usageTracker: UsageTracker;
  private config: Required<RollupConfig>;
  private interval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(db: Database, usageTracker: UsageTracker, config: Partial<RollupConfig> = {}) {
    this.db = db;
    this.usageTracker = usageTracker;
    this.config = {
      enableDailyRollups: true,
      enableWeeklyRollups: true,
      dailyRollupHour: 2, // 2 AM
      weeklyRollupDay: 0, // Sunday
      weeklyRollupHour: 3, // 3 AM
      enableCleanup: true,
      cleanupRetentionDays: 365,
      enableBackfill: true,
      maxBackfillDays: 30,
      ...config
    };

    this.ensureRollupTable();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('Starting auto rollup scheduler');

    // Process any pending jobs from previous runs
    await this.processPendingJobs();

    // Schedule regular job checks
    this.scheduleJobChecker();

    // Schedule daily rollup
    if (this.config.enableDailyRollups) {
      this.scheduleDailyRollup();
    }

    // Schedule weekly rollup
    if (this.config.enableWeeklyRollups) {
      this.scheduleWeeklyRollup();
    }

    // Schedule cleanup
    if (this.config.enableCleanup) {
      this.scheduleCleanup();
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping auto rollup scheduler');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async triggerDailyRollup(targetDate?: string): Promise<void> {
    const date = targetDate || new Date().toISOString().split('T')[0];
    const jobId = `daily_${date}_${Date.now()}`;

    await this.scheduleJob({
      id: jobId,
      type: 'daily',
      status: 'pending',
      targetDate: date,
      scheduledAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    });

    console.log(`Scheduled daily rollup for ${date}`);
  }

  async triggerWeeklyRollup(targetWeekStart?: string): Promise<void> {
    const weekStart = targetWeekStart || this.getWeekStartDate(new Date());
    const jobId = `weekly_${weekStart}_${Date.now()}`;

    await this.scheduleJob({
      id: jobId,
      type: 'weekly',
      status: 'pending',
      targetDate: weekStart,
      scheduledAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    });

    console.log(`Scheduled weekly rollup for week ${weekStart}`);
  }

  async triggerBackfill(startDate: string, endDate: string): Promise<void> {
    if (!this.config.enableBackfill) {
      throw new DatabaseError('Backfill is disabled', 'BACKFILL_DISABLED');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > this.config.maxBackfillDays) {
      throw new DatabaseError(
        `Backfill period exceeds maximum of ${this.config.maxBackfillDays} days`,
        'BACKFILL_PERIOD_TOO_LONG'
      );
    }

    console.log(`Starting backfill from ${startDate} to ${endDate}`);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const jobId = `backfill_${dateStr}_${Date.now()}`;

      await this.scheduleJob({
        id: jobId,
        type: 'backfill',
        status: 'pending',
        targetDate: dateStr,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 1 // Backfill jobs don't retry as aggressively
      });
    }

    console.log(`Scheduled ${daysDiff + 1} backfill jobs`);
  }

  async getRollupStatus(): Promise<{
    isRunning: boolean;
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    lastDailyRollup?: string;
    lastWeeklyRollup?: string;
    nextScheduledRun?: string;
  }> {
    const stats = this.db.prepare(`
      SELECT
        status,
        COUNT(*) as count,
        MAX(completed_at) as last_completed,
        MIN(scheduled_at) as next_scheduled
      FROM rollup_jobs
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY status
    `).all() as Array<{ status: string; count: number; last_completed: string | null; next_scheduled: string | null }>;

    const pending = stats.find(s => s.status === 'pending')?.count || 0;
    const running = stats.find(s => s.status === 'running')?.count || 0;
    const completed = stats.find(s => s.status === 'completed')?.count || 0;
    const failed = stats.find(s => s.status === 'failed')?.count || 0;

    // Get last daily rollup
    const lastDaily = this.db.prepare(`
      SELECT target_date FROM rollup_jobs
      WHERE type = 'daily' AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `).get() as { target_date: string } | undefined;

    // Get last weekly rollup
    const lastWeekly = this.db.prepare(`
      SELECT target_date FROM rollup_jobs
      WHERE type = 'weekly' AND status = 'completed'
      ORDER BY completed_at DESC
      LIMIT 1
    `).get() as { target_date: string } | undefined;

    // Get next scheduled run
    const nextScheduled = stats.find(s => s.status === 'pending')?.next_scheduled;

    return {
      isRunning: this.isRunning,
      pendingJobs: pending,
      runningJobs: running,
      completedJobs: completed,
      failedJobs: failed,
      lastDailyRollup: lastDaily?.target_date,
      lastWeeklyRollup: lastWeekly?.target_date,
      nextScheduledRun: nextScheduled
    };
  }

  async getRollupHistory(limit: number = 50): Promise<RollupJob[]> {
    const rows = this.db.prepare(`
      SELECT * FROM rollup_jobs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      targetDate: row.target_date,
      scheduledAt: new Date(row.scheduled_at),
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      maxRetries: row.max_retries
    }));
  }

  private async processPendingJobs(): Promise<void> {
    const pendingJobs = this.db.prepare(`
      SELECT * FROM rollup_jobs
      WHERE status = 'pending'
      ORDER BY scheduled_at ASC
    `).all() as any[];

    for (const job of pendingJobs) {
      try {
        await this.executeJob(job);
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
      }
    }
  }

  private async executeJob(jobData: any): Promise<void> {
    const job: RollupJob = {
      id: jobData.id,
      type: jobData.type,
      status: jobData.status,
      targetDate: jobData.target_date,
      scheduledAt: new Date(jobData.scheduled_at),
      startedAt: jobData.started_at ? new Date(jobData.started_at) : undefined,
      completedAt: jobData.completed_at ? new Date(jobData.completed_at) : undefined,
      errorMessage: jobData.error_message,
      retryCount: jobData.retry_count,
      maxRetries: jobData.max_retries
    };

    // Mark job as running
    await this.updateJobStatus(job.id, 'running');

    try {
      switch (job.type) {
        case 'daily':
          await this.usageTracker.performDailyRollup(job.targetDate);
          break;
        case 'weekly':
          await this.usageTracker.performWeeklyRollup(job.targetDate);
          break;
        case 'cleanup':
          await this.usageTracker.cleanupOldStats();
          break;
        case 'backfill':
          await this.usageTracker.performDailyRollup(job.targetDate);
          break;
        default:
          throw new DatabaseError(`Unknown job type: ${job.type}`, 'UNKNOWN_JOB_TYPE');
      }

      await this.updateJobStatus(job.id, 'completed');
      console.log(`Completed ${job.type} rollup job ${job.id}`);
    } catch (error: any) {
      console.error(`Failed to execute ${job.type} rollup job ${job.id}:`, error);

      if (job.retryCount < job.maxRetries) {
        // Retry the job
        await this.updateJobStatus(job.id, 'pending', error.message);
        await this.incrementRetryCount(job.id);
      } else {
        // Mark as failed
        await this.updateJobStatus(job.id, 'failed', error.message);
      }
    }
  }

  private scheduleJobChecker(): void {
    // Check for pending jobs every minute
    this.interval = setInterval(async () => {
      if (this.isRunning) {
        await this.processPendingJobs();
      }
    }, 60 * 1000);
  }

  private scheduleDailyRollup(): void {
    const scheduleNextDaily = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(this.config.dailyRollupHour, 0, 0, 0);

      const delay = tomorrow.getTime() - now.getTime();

      setTimeout(async () => {
        if (this.isRunning) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          await this.triggerDailyRollup(yesterday.toISOString().split('T')[0]);
        }
        scheduleNextDaily();
      }, delay);
    };

    scheduleNextDaily();
  }

  private scheduleWeeklyRollup(): void {
    const scheduleNextWeekly = () => {
      const now = new Date();
      const nextWeek = new Date(now);

      // Find next Sunday
      const daysUntilSunday = (7 - now.getDay()) % 7;
      nextWeek.setDate(nextWeek.getDate() + daysUntilSunday);
      nextWeek.setHours(this.config.weeklyRollupHour, 0, 0, 0);

      const delay = nextWeek.getTime() - now.getTime();

      setTimeout(async () => {
        if (this.isRunning) {
          const weekStart = this.getWeekStartDate(nextWeek);
          await this.triggerWeeklyRollup(weekStart);
        }
        scheduleNextWeekly();
      }, delay);
    };

    scheduleNextWeekly();
  }

  private scheduleCleanup(): void {
    // Schedule cleanup every day at 4 AM
    const scheduleNextCleanup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(4, 0, 0, 0);

      const delay = tomorrow.getTime() - now.getTime();

      setTimeout(async () => {
        if (this.isRunning) {
          await this.scheduleJob({
            id: `cleanup_${Date.now()}`,
            type: 'cleanup',
            status: 'pending',
            scheduledAt: new Date(),
            retryCount: 0,
            maxRetries: 2
          });
        }
        scheduleNextCleanup();
      }, delay);
    };

    scheduleNextCleanup();
  }

  private async scheduleJob(job: Omit<RollupJob, 'status'>): Promise<void> {
    this.db.prepare(`
      INSERT INTO rollup_jobs (
        id, type, status, target_date, scheduled_at, retry_count, max_retries
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      job.id,
      job.type,
      'pending',
      job.targetDate,
      job.scheduledAt.toISOString(),
      job.retryCount,
      job.maxRetries
    );
  }

  private async updateJobStatus(jobId: string, status: string, errorMessage?: string): Promise<void> {
    const updates: string[] = ['status = ?'];
    const params: any[] = [status];

    if (status === 'running') {
      updates.push('started_at = ?');
      params.push(new Date().toISOString());
    } else if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = ?');
      params.push(new Date().toISOString());
    }

    if (errorMessage) {
      updates.push('error_message = ?');
      params.push(errorMessage);
    }

    params.push(jobId);

    this.db.prepare(`
      UPDATE rollup_jobs
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...params);
  }

  private async incrementRetryCount(jobId: string): Promise<void> {
    this.db.prepare(`
      UPDATE rollup_jobs
      SET retry_count = retry_count + 1
      WHERE id = ?
    `).run(jobId);
  }

  private ensureRollupTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rollup_jobs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        target_date TEXT,
        scheduled_at DATETIME NOT NULL,
        started_at DATETIME,
        completed_at DATETIME,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_rollup_jobs_status ON rollup_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_rollup_jobs_scheduled_at ON rollup_jobs(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_rollup_jobs_type ON rollup_jobs(type);
    `);
  }

  private getWeekStartDate(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  public getConfig(): RollupConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<RollupConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart scheduler if needed
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}