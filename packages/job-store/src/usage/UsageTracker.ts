import { Database } from 'better-sqlite3';
import { Job, JobStatus, UsageStats, CostRate } from '../types/JobTypes';
import { DatabaseError } from '../types/JobTypes';

export interface UsageCaptureConfig {
  enableAutoCapture: boolean;
  rollupIntervalMinutes: number;
  batchSize: number;
  enableCostCalculation: boolean;
  enableDailyRollups: boolean;
  enableWeeklyRollups: boolean;
  retentionDays: number;
}

export interface UsageMetrics {
  date: string;
  provider: string;
  model: string;
  jobType: string;
  totalJobs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  averageDurationMs: number;
  successCount: number;
  failureCount: number;
}

export class UsageTracker {
  private db: Database;
  private config: Required<UsageCaptureConfig>;
  private rollupInterval?: NodeJS.Timeout;

  constructor(db: Database, config: Partial<UsageCaptureConfig> = {}) {
    this.db = db;
    this.config = {
      enableAutoCapture: true,
      rollupIntervalMinutes: 60,
      batchSize: 1000,
      enableCostCalculation: true,
      enableDailyRollups: true,
      enableWeeklyRollups: true,
      retentionDays: 365,
      ...config
    };

    if (this.config.enableAutoCapture) {
      this.startRollupTask();
    }
  }

  async captureJobUsage(job: Job): Promise<void> {
    if (job.status !== 'completed' && job.status !== 'failed') {
      return; // Only capture usage for completed/failed jobs
    }

    try {
      // Calculate cost if enabled and job has token data
      let totalCost = job.total_cost || 0;
      if (this.config.enableCostCalculation && job.input_tokens > 0 && job.output_tokens > 0) {
        totalCost = await this.calculateJobCost(job);
      }

      // Update job with calculated cost
      if (totalCost !== job.total_cost) {
        this.db.prepare(`
          UPDATE jobs
          SET total_cost = ?, updated_at = ?
          WHERE id = ?
        `).run(totalCost, new Date().toISOString(), job.id);
      }

      // Insert usage stats for this job
      const insertUsage = this.db.prepare(`
        INSERT OR REPLACE INTO usage_stats (
          id, date, provider, model, job_type,
          total_jobs, total_input_tokens, total_output_tokens, total_cost,
          average_duration_ms, success_rate, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const jobDate = job.created_at.toISOString().split('T')[0];
      const successRate = job.status === 'completed' ? 100 : 0;

      insertUsage.run(
        `${jobDate}_${job.provider}_${job.model}_${job.type}`,
        jobDate,
        job.provider || 'unknown',
        job.model || 'unknown',
        job.type,
        1, // total_jobs (will be summed up in rollups)
        job.input_tokens,
        job.output_tokens,
        totalCost,
        job.duration_ms || 0,
        successRate,
        new Date().toISOString(),
        new Date().toISOString()
      );

    } catch (error) {
      console.error('Failed to capture job usage:', error);
      throw new DatabaseError(
        `Failed to capture usage for job ${job.id}: ${error.message}`,
        'USAGE_CAPTURE_FAILED',
        { jobId: job.id, originalError: error }
      );
    }
  }

  async calculateJobCost(job: Job): Promise<number> {
    if (!job.provider || !job.model || job.input_tokens === 0 || job.output_tokens === 0) {
      return 0;
    }

    const costRate = await this.getCurrentCostRate(job.provider, job.model);
    if (!costRate) {
      console.warn(`No cost rate found for ${job.provider}/${job.model}`);
      return 0;
    }

    const inputCost = (job.input_tokens / 1000) * costRate.input_token_rate;
    const outputCost = (job.output_tokens / 1000) * costRate.output_token_rate;
    return inputCost + outputCost;
  }

  async getCurrentCostRate(provider: string, model: string): Promise<CostRate | null> {
    const today = new Date().toISOString().split('T')[0];

    const row = this.db.prepare(`
      SELECT * FROM cost_rates
      WHERE provider = ? AND model = ? AND effective_from <= ?
      AND (effective_to IS NULL OR effective_to >= ?)
      ORDER BY effective_from DESC
      LIMIT 1
    `).get(provider, model, today, today) as any | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      provider: row.provider,
      model: row.model,
      input_token_rate: row.input_token_rate,
      output_token_rate: row.output_token_rate,
      currency: row.currency,
      effective_from: row.effective_from,
      effective_to: row.effective_to,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  async performDailyRollup(targetDate?: string): Promise<void> {
    const date = targetDate || new Date().toISOString().split('T')[0];
    console.log(`Performing daily rollup for ${date}`);

    try {
      // Get all unique provider/model/job_type combinations for this date
      const combinations = this.db.prepare(`
        SELECT DISTINCT provider, model, job_type
        FROM jobs
        WHERE DATE(created_at) = ?
        AND status IN ('completed', 'failed')
      `).all(date) as Array<{ provider: string; model: string; job_type: string }>;

      for (const combo of combinations) {
        await this.rollupCombination(date, combo.provider, combo.model, combo.job_type);
      }

      console.log(`Daily rollup completed for ${date}`);
    } catch (error) {
      console.error(`Daily rollup failed for ${date}:`, error);
      throw error;
    }
  }

  async performWeeklyRollup(targetWeekStart?: string): Promise<void> {
    const weekStart = targetWeekStart || this.getWeekStartDate(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    console.log(`Performing weekly rollup for week ${weekStart} to ${weekEnd.toISOString().split('T')[0]}`);

    try {
      // Get all unique provider/model/job_type combinations for this week
      const combinations = this.db.prepare(`
        SELECT DISTINCT provider, model, job_type
        FROM jobs
        WHERE DATE(created_at) BETWEEN ? AND ?
        AND status IN ('completed', 'failed')
      `).all(weekStart, weekEnd.toISOString().split('T')[0]) as Array<{ provider: string; model: string; job_type: string }>;

      for (const combo of combinations) {
        await this.rollupCombination(weekStart, combo.provider, combo.model, combo.job_type, true);
      }

      console.log(`Weekly rollup completed for week ${weekStart}`);
    } catch (error) {
      console.error(`Weekly rollup failed for week ${weekStart}:`, error);
      throw error;
    }
  }

  private async rollupCombination(
    date: string,
    provider: string,
    model: string,
    jobType: string,
    isWeekly: boolean = false
  ): Promise<void> {
    const dateCondition = isWeekly
      ? `DATE(created_at) >= ? AND DATE(created_at) <= DATE(?, '+6 days')`
      : 'DATE(created_at) = ?';

    const dateParams = isWeekly
      ? [date, date]
      : [date];

    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total_jobs,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_cost) as total_cost,
        AVG(duration_ms) as average_duration_ms,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failure_count
      FROM jobs
      WHERE provider = ? AND model = ? AND type = ?
      AND status IN ('completed', 'failed')
      AND ${dateCondition}
    `).get(provider, model, jobType, ...dateParams) as any;

    if (!stats || stats.total_jobs === 0) {
      return;
    }

    const successRate = (stats.success_count / stats.total_jobs) * 100;
    const statsId = isWeekly
      ? `${date}_weekly_${provider}_${model}_${jobType}`
      : `${date}_${provider}_${model}_${jobType}`;

    this.db.prepare(`
      INSERT OR REPLACE INTO usage_stats (
        id, date, provider, model, job_type,
        total_jobs, total_input_tokens, total_output_tokens, total_cost,
        average_duration_ms, success_rate, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      statsId,
      date,
      provider,
      model,
      jobType,
      stats.total_jobs,
      stats.total_input_tokens || 0,
      stats.total_output_tokens || 0,
      stats.total_cost || 0,
      stats.average_duration_ms || 0,
      successRate,
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  async getUsageMetrics(
    startDate: string,
    endDate: string,
    provider?: string,
    model?: string,
    jobType?: string
  ): Promise<UsageMetrics[]> {
    let sql = `
      SELECT
        date, provider, model, job_type,
        total_jobs, total_input_tokens, total_output_tokens, total_cost,
        average_duration_ms, success_rate
      FROM usage_stats
      WHERE date BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];

    if (provider) {
      sql += ' AND provider = ?';
      params.push(provider);
    }

    if (model) {
      sql += ' AND model = ?';
      params.push(model);
    }

    if (jobType) {
      sql += ' AND job_type = ?';
      params.push(jobType);
    }

    sql += ' ORDER BY date DESC, provider, model, job_type';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => ({
      date: row.date,
      provider: row.provider,
      model: row.model,
      jobType: row.job_type,
      totalJobs: row.total_jobs,
      totalInputTokens: row.total_input_tokens,
      totalOutputTokens: row.total_output_tokens,
      totalCost: row.total_cost,
      averageDurationMs: row.average_duration_ms,
      successCount: Math.round((row.success_rate / 100) * row.total_jobs),
      failureCount: row.total_jobs - Math.round((row.success_rate / 100) * row.total_jobs)
    }));
  }

  async getCostBreakdown(
    startDate: string,
    endDate: string
  ): Promise<Array<{
    provider: string;
    model: string;
    totalJobs: number;
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    averageCostPerJob: number;
    averageTokensPerJob: number;
  }>> {
    const sql = `
      SELECT
        provider, model,
        SUM(total_jobs) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(total_input_tokens) as total_input_tokens,
        SUM(total_output_tokens) as total_output_tokens
      FROM usage_stats
      WHERE date BETWEEN ? AND ?
      GROUP BY provider, model
      ORDER BY total_cost DESC
    `;

    const rows = this.db.prepare(sql).all(startDate, endDate) as any[];
    return rows.map(row => ({
      provider: row.provider,
      model: row.model,
      totalJobs: row.total_jobs,
      totalCost: row.total_cost,
      totalInputTokens: row.total_input_tokens,
      totalOutputTokens: row.total_output_tokens,
      averageCostPerJob: row.total_jobs > 0 ? row.total_cost / row.total_jobs : 0,
      averageTokensPerJob: row.total_jobs > 0 ? (row.total_input_tokens + row.total_output_tokens) / row.total_jobs : 0
    }));
  }

  async cleanupOldStats(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const result = this.db.prepare(`
      DELETE FROM usage_stats
      WHERE date < ?
    `).run(cutoffDate.toISOString().split('T')[0]);

    console.log(`Cleaned up ${result.changes} old usage stats records`);
    return result.changes;
  }

  private startRollupTask(): void {
    // Schedule daily rollup at 2 AM
    const scheduleNextRollup = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(2, 0, 0, 0);

      const delay = tomorrow.getTime() - now.getTime();

      setTimeout(async () => {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          await this.performDailyRollup(yesterday.toISOString().split('T')[0]);

          // Perform weekly rollup on Sunday
          if (yesterday.getDay() === 0) {
            const weekStart = this.getWeekStartDate(yesterday);
            await this.performWeeklyRollup(weekStart);
          }

          // Clean up old stats
          await this.cleanupOldStats();
        } catch (error) {
          console.error('Scheduled rollup failed:', error);
        }

        scheduleNextRollup();
      }, delay);
    };

    scheduleNextRollup();
  }

  private getWeekStartDate(date: Date): string {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  }

  public stopRollupTask(): void {
    if (this.rollupInterval) {
      clearInterval(this.rollupInterval);
      this.rollupInterval = undefined;
    }
  }

  public getConfig(): UsageCaptureConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<UsageCaptureConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart rollup task if needed
    if (config.enableAutoCapture !== undefined) {
      this.stopRollupTask();
      if (this.config.enableAutoCapture) {
        this.startRollupTask();
      }
    }
  }
}