import Database from 'better-sqlite3';
import {
  UsageDaily,
  UsageWeekly,
  Job,
  UsageStats,
  DatabaseError
} from './types';
import { TABLES, COLUMNS } from './schema';

export interface CostCalculation {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  provider: string;
  model: string;
}

export interface UsageTrackerConfig {
  enableDailyRollup: boolean;
  enableWeeklyRollup: boolean;
  rollupIntervalHours: number;
  costModels: { [provider: string]: { [model: string]: CostModel } };
}

export interface CostModel {
  inputTokenCost: number; // per 1K tokens
  outputTokenCost: number; // per 1K tokens
  baseCost?: number; // base cost per request
  imageCost?: number; // cost per image
  currency: string;
}

export class UsageTracker {
  private db: Database.Database;
  private config: UsageTrackerConfig;
  private rollupTimer?: NodeJS.Timeout;

  constructor(db: Database.Database, config: Partial<UsageTrackerConfig> = {}) {
    this.db = db;
    this.config = {
      enableDailyRollup: true,
      enableWeeklyRollup: true,
      rollupIntervalHours: 6, // Roll up every 6 hours
      costModels: {
        openai: {
          'gpt-3.5-turbo': { inputTokenCost: 0.0015, outputTokenCost: 0.002, currency: 'USD' },
          'gpt-4': { inputTokenCost: 0.03, outputTokenCost: 0.06, currency: 'USD' },
          'gpt-4-turbo': { inputTokenCost: 0.01, outputTokenCost: 0.03, currency: 'USD' },
          'gpt-4-vision-preview': { inputTokenCost: 0.01, outputTokenCost: 0.03, currency: 'USD' },
          'dall-e-3': { baseCost: 0.04, imageCost: 0.08, currency: 'USD' }
        },
        anthropic: {
          'claude-3-sonnet-20240229': { inputTokenCost: 0.003, outputTokenCost: 0.015, currency: 'USD' },
          'claude-3-opus-20240229': { inputTokenCost: 0.015, outputTokenCost: 0.075, currency: 'USD' },
          'claude-3-haiku-20240307': { inputTokenCost: 0.00025, outputTokenCost: 0.00125, currency: 'USD' }
        },
        gemini: {
          'gemini-pro': { inputTokenCost: 0.000125, outputTokenCost: 0.0005, currency: 'USD' },
          'gemini-pro-vision': { inputTokenCost: 0.000125, outputTokenCost: 0.0005, currency: 'USD' }
        }
      },
      ...config
    };

    this.initialize();
  }

  private initialize(): void {
    // Start rollup timer if enabled
    if (this.config.enableDailyRollup || this.config.enableWeeklyRollup) {
      this.startRollupTimer();
    }

    // Prepare statements
    this.prepareStatements();

    console.log('Usage tracker initialized with config:', {
      dailyRollup: this.config.enableDailyRollup,
      weeklyRollup: this.config.enableWeeklyRollup,
      rollupInterval: `${this.config.rollupIntervalHours}h`
    });
  }

  private prepareStatements(): void {
    const statements = [
      // Daily usage statements
      'INSERT OR REPLACE INTO usage_daily (date, provider, model, requests_count, tokens_input, tokens_output, tokens_total, cost_usd, avg_duration_ms, avg_tokens_per_request, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      'SELECT * FROM usage_daily WHERE date = ? AND provider = ? AND model = ?',
      'SELECT * FROM usage_daily WHERE date = ? ORDER BY cost_usd DESC',

      // Weekly usage statements
      'INSERT OR REPLACE INTO usage_weekly (year_week, requests_count, tokens_total, cost_usd, provider_breakdown, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      'SELECT * FROM usage_weekly WHERE year_week = ?',

      // Job usage aggregation
      'SELECT provider, model, COUNT(*) as requests, SUM(tokens_used) as tokens, SUM(cost_usd) as cost, AVG(duration_ms) as avg_duration FROM jobs WHERE completed_at >= ? AND completed_at <= ? GROUP BY provider, model'
    ];

    statements.forEach(statement => {
      try {
        this.db.prepare(statement);
      } catch (error) {
        console.warn(`Failed to prepare statement: ${statement}`, error);
      }
    });
  }

  private startRollupTimer(): void {
    const intervalMs = this.config.rollupIntervalHours * 60 * 60 * 1000;
    this.rollupTimer = setInterval(() => {
      this.performRollups().catch(error => {
        console.error('Usage rollup failed:', error);
      });
    }, intervalMs);

    // Perform initial rollup
    this.performRollups().catch(error => {
      console.error('Initial usage rollup failed:', error);
    });
  }

  async trackJobCompletion(job: Job): Promise<void> {
    try {
      if (job.status !== 'completed' || !job.costUsd || !job.tokensUsed) {
        return;
      }

      // Parse the request to get token counts
      const request = JSON.parse(job.request);
      const response = job.response ? JSON.parse(job.response) : null;

      const inputTokens = response?.usage?.prompt_tokens || 0;
      const outputTokens = response?.usage?.completion_tokens || 0;

      // Update daily usage
      await this.updateDailyUsage(job, inputTokens, outputTokens);

      console.log(`Tracked usage for job ${job.uuid}: ${job.tokensUsed} tokens, $${job.costUsd}`);
    } catch (error) {
      console.error('Failed to track job usage:', error);
    }
  }

  private async updateDailyUsage(job: Job, inputTokens: number, outputTokens: number): Promise<void> {
    const date = new Date(job.completedAt! * 1000).toISOString().split('T')[0]; // YYYY-MM-DD

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO usage_daily
      (date, provider, model, requests_count, tokens_input, tokens_output, tokens_total, cost_usd, avg_duration_ms, avg_tokens_per_request, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Get existing usage for this date/provider/model
    const existing = this.db
      .prepare('SELECT * FROM usage_daily WHERE date = ? AND provider = ? AND model = ?')
      .get(date, job.provider, job.model) as UsageDaily | undefined;

    if (existing) {
      // Update existing record
      const requestsCount = existing.requestsCount + 1;
      const tokensInput = existing.tokensInput + inputTokens;
      const tokensOutput = existing.tokensOutput + outputTokens;
      const tokensTotal = existing.tokensTotal + job.tokensUsed!;
      const costUsd = existing.costUsd + job.costUsd!;
      const avgDurationMs = (existing.avgDurationMs! * existing.requestsCount + (job.durationMs || 0)) / requestsCount;
      const avgTokensPerRequest = tokensTotal / requestsCount;

      stmt.run(
        date,
        job.provider,
        job.model,
        requestsCount,
        tokensInput,
        tokensOutput,
        tokensTotal,
        costUsd,
        Math.round(avgDurationMs),
        Math.round(avgTokensPerRequest),
        Math.floor(Date.now() / 1000)
      );
    } else {
      // Insert new record
      stmt.run(
        date,
        job.provider,
        job.model,
        1,
        inputTokens,
        outputTokens,
        job.tokensUsed!,
        job.costUsd!,
        job.durationMs || 0,
        job.tokensUsed!,
        Math.floor(Date.now() / 1000)
      );
    }
  }

  private async performRollups(): Promise<void> {
    try {
      console.log('Performing usage rollups...');

      const startTime = Date.now();

      if (this.config.enableDailyRollup) {
        await this.performDailyRollup();
      }

      if (this.config.enableWeeklyRollup) {
        await this.performWeeklyRollup();
      }

      const duration = Date.now() - startTime;
      console.log(`Usage rollups completed in ${duration}ms`);
    } catch (error) {
      throw new DatabaseError('Failed to perform usage rollups', error as Error);
    }
  }

  private async performDailyRollup(): Promise<void> {
    try {
      // Get jobs that haven't been rolled up yet
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const untrackedJobs = this.db
        .prepare(`
          SELECT * FROM jobs
          WHERE status = 'completed'
          AND completed_at IS NOT NULL
          AND cost_usd IS NOT NULL
          AND tokens_used IS NOT NULL
          AND DATE(completed_at, 'unixepoch') = ?
          AND id NOT IN (
            SELECT DISTINCT job_id FROM daily_job_rollups
          )
        `)
        .all(yesterdayStr) as Job[];

      if (untrackedJobs.length === 0) {
        return;
      }

      console.log(`Rolling up ${untrackedJobs.length} jobs for ${yesterdayStr}`);

      // Group by provider and model
      const grouped = untrackedJobs.reduce((acc, job) => {
        const key = `${job.provider}:${job.model}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(job);
        return acc;
      }, {} as { [key: string]: Job[] });

      // Update daily usage for each group
      for (const [key, jobs] of Object.entries(grouped)) {
        const [provider, model] = key.split(':');

        const totalRequests = jobs.length;
        const totalInputTokens = jobs.reduce((sum, job) => {
          const request = JSON.parse(job.request);
          const response = job.response ? JSON.parse(job.response) : null;
          return sum + (response?.usage?.prompt_tokens || 0);
        }, 0);

        const totalOutputTokens = jobs.reduce((sum, job) => {
          const response = job.response ? JSON.parse(job.response) : null;
          return sum + (response?.usage?.completion_tokens || 0);
        }, 0);

        const totalTokens = jobs.reduce((sum, job) => sum + (job.tokensUsed || 0), 0);
        const totalCost = jobs.reduce((sum, job) => sum + (job.costUsd || 0), 0);
        const avgDuration = jobs.reduce((sum, job) => sum + (job.durationMs || 0), 0) / totalRequests;
        const avgTokensPerRequest = totalTokens / totalRequests;

        const stmt = this.db.prepare(`
          INSERT OR REPLACE INTO usage_daily
          (date, provider, model, requests_count, tokens_input, tokens_output, tokens_total, cost_usd, avg_duration_ms, avg_tokens_per_request, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          yesterdayStr,
          provider,
          model,
          totalRequests,
          totalInputTokens,
          totalOutputTokens,
          totalTokens,
          totalCost,
          Math.round(avgDuration),
          Math.round(avgTokensPerRequest),
          Math.floor(Date.now() / 1000)
        );
      }

      // Mark jobs as rolled up (would need a daily_job_rollups table)
      // For now, we'll skip this step
    } catch (error) {
      console.error('Daily rollup failed:', error);
    }
  }

  private async performWeeklyRollup(): Promise<void> {
    try {
      // Get the current ISO week
      const now = new Date();
      const year = now.getFullYear();
      const week = this.getISOWeek(now);
      const yearWeek = `${year}-${week.toString().padStart(2, '0')}`;

      // Check if weekly data already exists for this week
      const existing = this.db
        .prepare('SELECT * FROM usage_weekly WHERE year_week = ?')
        .get(yearWeek) as UsageWeekly | undefined;

      if (existing) {
        // Update existing week
        await this.updateWeeklyRollup(yearWeek);
      } else {
        // Create new week rollup
        await this.createWeeklyRollup(yearWeek);
      }
    } catch (error) {
      console.error('Weekly rollup failed:', error);
    }
  }

  private async createWeeklyRollup(yearWeek: string): Promise<void> {
    const [year, week] = yearWeek.split('-').map(Number);

    // Calculate date range for the week
    const startDate = this.getDateFromISOWeek(year, week);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Aggregate daily data for the week
    const dailyData = this.db
      .prepare(`
        SELECT provider, model,
               SUM(requests_count) as total_requests,
               SUM(tokens_input) as total_input_tokens,
               SUM(tokens_output) as total_output_tokens,
               SUM(tokens_total) as total_tokens,
               SUM(cost_usd) as total_cost,
               AVG(avg_duration_ms) as avg_duration_ms
        FROM usage_daily
        WHERE date >= ? AND date <= ?
        GROUP BY provider, model
        ORDER BY total_cost DESC
      `)
      .all(startDateStr, endDateStr) as any[];

    if (dailyData.length === 0) {
      return;
    }

    // Calculate totals
    const totalRequests = dailyData.reduce((sum, row) => sum + row.total_requests, 0);
    const totalTokens = dailyData.reduce((sum, row) => sum + row.total_tokens, 0);
    const totalCost = dailyData.reduce((sum, row) => sum + row.total_cost, 0);

    // Create provider breakdown
    const providerBreakdown = dailyData.reduce((acc, row) => {
      if (!acc[row.provider]) {
        acc[row.provider] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          models: {}
        };
      }
      acc[row.provider].requests += row.total_requests;
      acc[row.provider].tokens += row.total_tokens;
      acc[row.provider].cost += row.total_cost;
      acc[row.provider].models[row.model] = {
        requests: row.total_requests,
        tokens: row.total_tokens,
        cost: row.total_cost
      };
      return acc;
    }, {} as any);

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO usage_weekly
      (year_week, requests_count, tokens_total, cost_usd, provider_breakdown, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      yearWeek,
      totalRequests,
      totalTokens,
      totalCost,
      JSON.stringify(providerBreakdown),
      Math.floor(Date.now() / 1000)
    );

    console.log(`Created weekly rollup for ${yearWeek}: ${totalRequests} requests, $${totalCost.toFixed(2)}`);
  }

  private async updateWeeklyRollup(yearWeek: string): Promise<void> {
    // For simplicity, recreate the weekly rollup
    // In production, you might want to do incremental updates
    await this.createWeeklyRollup(yearWeek);
  }

  private getISOWeek(date: Date): number {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }

  private getDateFromISOWeek(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const isoWeekStart = simple;
    isoWeekStart.setDate(simple.getDate() - dayOfWeek + 1);
    return isoWeekStart;
  }

  async getUsageStats(
    timeRange: { start: Date; end: Date },
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<UsageStats> {
    try {
      const startDateStr = timeRange.start.toISOString().split('T')[0];
      const endDateStr = timeRange.end.toISOString().split('T')[0];

      let query: string;
      let groupByFormat: string;

      switch (groupBy) {
        case 'week':
          query = `
            SELECT
              strftime('%Y-%W', date) as period,
              SUM(requests_count) as total_requests,
              SUM(tokens_total) as total_tokens,
              SUM(cost_usd) as total_cost,
              AVG(avg_duration_ms) as avg_duration_ms
            FROM usage_daily
            WHERE date >= ? AND date <= ?
            GROUP BY strftime('%Y-%W', date)
            ORDER BY period
          `;
          break;
        case 'month':
          query = `
            SELECT
              strftime('%Y-%m', date) as period,
              SUM(requests_count) as total_requests,
              SUM(tokens_total) as total_tokens,
              SUM(cost_usd) as total_cost,
              AVG(avg_duration_ms) as avg_duration_ms
            FROM usage_daily
            WHERE date >= ? AND date <= ?
            GROUP BY strftime('%Y-%m', date)
            ORDER BY period
          `;
          break;
        default: // day
          query = `
            SELECT
              date as period,
              SUM(requests_count) as total_requests,
              SUM(tokens_total) as total_tokens,
              SUM(cost_usd) as total_cost,
              AVG(avg_duration_ms) as avg_duration_ms
            FROM usage_daily
            WHERE date >= ? AND date <= ?
            GROUP BY date
            ORDER BY date
          `;
      }

      const results = this.db.prepare(query).all(startDateStr, endDateStr) as any[];

      if (results.length === 0) {
        return {
          period: `${groupBy}ly`,
          totalRequests: 0,
          totalTokens: 0,
          totalCost: 0,
          averageCostPerRequest: 0,
          averageTokensPerRequest: 0,
          byProvider: {},
          byModel: {},
          dailyBreakdown: []
        };
      }

      // Calculate totals
      const totalRequests = results.reduce((sum, row) => sum + row.total_requests, 0);
      const totalTokens = results.reduce((sum, row) => sum + row.total_tokens, 0);
      const totalCost = results.reduce((sum, row) => sum + row.total_cost, 0);

      // Get detailed breakdown by provider and model
      const breakdown = this.db
        .prepare(`
          SELECT provider, model,
                 SUM(requests_count) as requests,
                 SUM(tokens_total) as tokens,
                 SUM(cost_usd) as cost
          FROM usage_daily
          WHERE date >= ? AND date <= ?
          GROUP BY provider, model
          ORDER BY cost DESC
        `)
        .all(startDateStr, endDateStr) as any[];

      const byProvider = breakdown.reduce((acc, row) => {
        if (!acc[row.provider]) {
          acc[row.provider] = { requests: 0, tokens: 0, cost: 0 };
        }
        acc[row.provider].requests += row.requests;
        acc[row.provider].tokens += row.tokens;
        acc[row.provider].cost += row.cost;
        return acc;
      }, {} as any);

      const byModel = breakdown.reduce((acc, row) => {
        const modelKey = `${row.provider}:${row.model}`;
        acc[modelKey] = {
          requests: row.requests,
          tokens: row.tokens,
          cost: row.cost
        };
        return acc;
      }, {} as any);

      return {
        period: `${groupBy}ly`,
        totalRequests,
        totalTokens,
        totalCost,
        averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
        averageTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0,
        byProvider,
        byModel,
        dailyBreakdown: results.map(row => ({
          date: row.period,
          requests: row.total_requests,
          tokens: row.total_tokens,
          cost: row.total_cost
        }))
      };
    } catch (error) {
      throw new DatabaseError('Failed to get usage stats', error as Error);
    }
  }

  calculateCost(calculation: CostCalculation): number {
    const provider = this.config.costModels[calculation.provider];
    if (!provider) {
      console.warn(`No cost model found for provider: ${calculation.provider}`);
      return 0;
    }

    const model = provider[calculation.model];
    if (!model) {
      console.warn(`No cost model found for model: ${calculation.model}`);
      return 0;
    }

    let cost = model.baseCost || 0;
    cost += (calculation.inputTokens / 1000) * model.inputTokenCost;
    cost += (calculation.outputTokens / 1000) * model.outputTokenCost;

    return Math.round(cost * 1000000) / 1000000; // Round to 6 decimal places
  }

  updateCostModel(provider: string, model: string, costModel: CostModel): void {
    if (!this.config.costModels[provider]) {
      this.config.costModels[provider] = {};
    }
    this.config.costModels[provider][model] = costModel;
    console.log(`Updated cost model for ${provider}/${model}`);
  }

  // Cleanup
  stop(): void {
    if (this.rollupTimer) {
      clearInterval(this.rollupTimer);
      this.rollupTimer = undefined;
    }
  }
}