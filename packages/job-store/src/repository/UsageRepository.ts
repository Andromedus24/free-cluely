import { Database } from 'better-sqlite3';
import {
  UsageStats,
  UsageStatsFilter,
  UsageStatsResponse,
  CostBreakdown,
  DashboardStats,
  DatabaseError,
  ValidationError
} from '../types/JobTypes';

export interface UsageRepositoryConfig {
  enableAggregation: boolean;
  enableCache: boolean;
  cacheTtlMinutes: number;
}

export class UsageRepository {
  private db: Database;
  private config: Required<UsageRepositoryConfig>;
  private cache = new Map<string, { data: any; timestamp: number }>();

  constructor(db: Database, config: Partial<UsageRepositoryConfig> = {}) {
    this.db = db;
    this.config = {
      enableAggregation: true,
      enableCache: true,
      cacheTtlMinutes: 5,
      ...config
    };
  }

  async getUsageStats(filter: UsageStatsFilter): Promise<UsageStatsResponse> {
    const cacheKey = `usage_stats_${JSON.stringify(filter)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let sql = `
      SELECT
        provider,
        model,
        job_type,
        SUM(total_jobs) as total_jobs,
        SUM(total_input_tokens) as total_input_tokens,
        SUM(total_output_tokens) as total_output_tokens,
        SUM(total_cost) as total_cost,
        AVG(success_rate) as avg_success_rate
      FROM usage_stats
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter.provider?.length > 0) {
      sql += ` AND provider IN (${filter.provider.map(() => '?').join(', ')})`;
      params.push(...filter.provider);
    }

    if (filter.model?.length > 0) {
      sql += ` AND model IN (${filter.model.map(() => '?').join(', ')})`;
      params.push(...filter.model);
    }

    if (filter.job_type?.length > 0) {
      sql += ` AND job_type IN (${filter.job_type.map(() => '?').join(', ')})`;
      params.push(...filter.job_type);
    }

    if (filter.date_after) {
      sql += ' AND date >= ?';
      params.push(filter.date_after);
    }

    if (filter.date_before) {
      sql += ' AND date <= ?';
      params.push(filter.date_before);
    }

    sql += ' GROUP BY provider, model, job_type';

    const rows = this.db.prepare(sql).all(...params) as any[];
    const stats = rows.map(row => ({
      id: `${row.provider}_${row.model}_${row.job_type}`,
      date: filter.date_after || '',
      provider: row.provider,
      model: row.model,
      job_type: row.job_type,
      total_jobs: row.total_jobs,
      total_input_tokens: row.total_input_tokens,
      total_output_tokens: row.total_output_tokens,
      total_cost: row.total_cost,
      currency: 'USD',
      average_duration_ms: 0,
      success_rate: row.avg_success_rate,
      created_at: new Date(),
      updated_at: new Date()
    }));

    const response: UsageStatsResponse = {
      stats,
      total_jobs: stats.reduce((sum, s) => sum + s.total_jobs, 0),
      total_cost: stats.reduce((sum, s) => sum + s.total_cost, 0),
      total_input_tokens: stats.reduce((sum, s) => sum + s.total_input_tokens, 0),
      total_output_tokens: stats.reduce((sum, s) => sum + s.total_output_tokens, 0),
      average_success_rate: stats.length > 0
        ? stats.reduce((sum, s) => sum + s.success_rate, 0) / stats.length
        : 0
    };

    this.setCache(cacheKey, response);
    return response;
  }

  async getCostBreakdown(
    startDate: string,
    endDate: string,
    provider?: string,
    model?: string
  ): Promise<CostBreakdown[]> {
    const cacheKey = `cost_breakdown_${startDate}_${endDate}_${provider || 'all'}_${model || 'all'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let sql = `
      SELECT
        provider,
        model,
        SUM(total_jobs) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(total_input_tokens) as total_input_tokens,
        SUM(total_output_tokens) as total_output_tokens
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

    sql += ' GROUP BY provider, model ORDER BY total_cost DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    const breakdown = rows.map(row => ({
      provider: row.provider,
      model: row.model,
      total_jobs: row.total_jobs,
      total_cost: row.total_cost,
      total_input_tokens: row.total_input_tokens,
      total_output_tokens: row.total_output_tokens,
      average_cost_per_job: row.total_jobs > 0 ? row.total_cost / row.total_jobs : 0,
      average_tokens_per_job: row.total_jobs > 0 ? (row.total_input_tokens + row.total_output_tokens) / row.total_jobs : 0
    }));

    this.setCache(cacheKey, breakdown);
    return breakdown;
  }

  async getDashboardStats(days: number = 30): Promise<DashboardStats> {
    const cacheKey = `dashboard_stats_${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get overall stats from jobs table
    const overallStats = this.db.prepare(`
      SELECT
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
        SUM(total_cost) as total_cost,
        SUM(input_tokens + output_tokens) as total_tokens,
        AVG(duration_ms) as avg_duration
      FROM jobs
      WHERE created_at >= ?
    `).get(startDate.toISOString()) as any;

    // Get stats by type
    const typeStats = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM jobs
      WHERE created_at >= ?
      GROUP BY type
    `).all(startDate.toISOString()) as Array<{ type: string; count: number }>;

    // Get stats by status
    const statusStats = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM jobs
      WHERE created_at >= ?
      GROUP BY status
    `).all(startDate.toISOString()) as Array<{ status: string; count: number }>;

    // Get stats by provider
    const providerStats = this.db.prepare(`
      SELECT provider, SUM(total_cost) as cost
      FROM jobs
      WHERE created_at >= ? AND provider IS NOT NULL
      GROUP BY provider
    `).all(startDate.toISOString()) as Array<{ provider: string; cost: number }>;

    // Get recent activity
    const recentActivity = this.db.prepare(`
      SELECT event_type as type, message, level, data, created_at
      FROM job_events
      WHERE created_at >= datetime('now', '-24 hours')
      ORDER BY created_at DESC
      LIMIT 10
    `).all() as any[];

    const response: DashboardStats = {
      total_jobs: overallStats.total_jobs || 0,
      completed_jobs: overallStats.completed_jobs || 0,
      failed_jobs: overallStats.failed_jobs || 0,
      total_cost: overallStats.total_cost || 0,
      total_tokens: overallStats.total_tokens || 0,
      average_duration: overallStats.avg_duration || 0,
      success_rate: overallStats.total_jobs > 0
        ? ((overallStats.completed_jobs || 0) / overallStats.total_jobs) * 100
        : 0,
      jobs_by_type: typeStats.reduce((acc, item) => ({ ...acc, [item.type]: item.count }), {}),
      jobs_by_status: statusStats.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {}),
      cost_by_provider: providerStats.reduce((acc, item) => ({ ...acc, [item.provider]: item.cost }), {}),
      recent_activity: recentActivity.map(event => ({
        id: `event_${Date.now()}_${Math.random()}`,
        job_id: 'unknown',
        event_type: event.type,
        message: event.message,
        level: event.level,
        data: JSON.parse(event.data || '{}'),
        metadata: {},
        created_at: new Date(event.created_at)
      }))
    };

    this.setCache(cacheKey, response);
    return response;
  }

  async getUsageTrends(
    days: number = 30,
    groupBy: 'day' | 'week' = 'day'
  ): Promise<Array<{
    period: string;
    total_jobs: number;
    total_cost: number;
    total_tokens: number;
    success_rate: number;
  }>> {
    const cacheKey = `usage_trends_${days}_${groupBy}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    let dateFormat = groupBy === 'day' ? '%Y-%m-%d' : '%Y-%W';
    let sql = `
      SELECT
        strftime(?, date) as period,
        SUM(total_jobs) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(total_input_tokens + total_output_tokens) as total_tokens,
        AVG(success_rate) as success_rate
      FROM usage_stats
      WHERE date >= date('now', '-${days} days')
      GROUP BY strftime(?, date)
      ORDER BY period
    `;

    const rows = this.db.prepare(sql, dateFormat, dateFormat).all() as any[];
    const trends = rows.map(row => ({
      period: row.period,
      total_jobs: row.total_jobs,
      total_cost: row.total_cost,
      total_tokens: row.total_tokens,
      success_rate: row.success_rate
    }));

    this.setCache(cacheKey, trends);
    return trends;
  }

  async getTopProviders(days: number = 30, limit: number = 10): Promise<Array<{
    provider: string;
    total_jobs: number;
    total_cost: number;
    total_tokens: number;
    avg_cost_per_job: number;
  }>> {
    const cacheKey = `top_providers_${days}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sql = `
      SELECT
        provider,
        SUM(total_jobs) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(total_input_tokens + total_output_tokens) as total_tokens
      FROM usage_stats
      WHERE date >= date('now', '-${days} days')
      GROUP BY provider
      ORDER BY total_cost DESC
      LIMIT ?
    `;

    const rows = this.db.prepare(sql).all(limit) as any[];
    const providers = rows.map(row => ({
      provider: row.provider,
      total_jobs: row.total_jobs,
      total_cost: row.total_cost,
      total_tokens: row.total_tokens,
      avg_cost_per_job: row.total_jobs > 0 ? row.total_cost / row.total_jobs : 0
    }));

    this.setCache(cacheKey, providers);
    return providers;
  }

  async getTopModels(days: number = 30, limit: number = 10): Promise<Array<{
    model: string;
    provider: string;
    total_jobs: number;
    total_cost: number;
    total_tokens: number;
    avg_cost_per_job: number;
  }>> {
    const cacheKey = `top_models_${days}_${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sql = `
      SELECT
        provider,
        model,
        SUM(total_jobs) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(total_input_tokens + total_output_tokens) as total_tokens
      FROM usage_stats
      WHERE date >= date('now', '-${days} days')
      GROUP BY provider, model
      ORDER BY total_cost DESC
      LIMIT ?
    `;

    const rows = this.db.prepare(sql).all(limit) as any[];
    const models = rows.map(row => ({
      model: row.model,
      provider: row.provider,
      total_jobs: row.total_jobs,
      total_cost: row.total_cost,
      total_tokens: row.total_tokens,
      avg_cost_per_job: row.total_jobs > 0 ? row.total_cost / row.total_jobs : 0
    }));

    this.setCache(cacheKey, models);
    return models;
  }

  async getUsageByJobType(days: number = 30): Promise<Array<{
    job_type: string;
    total_jobs: number;
    total_cost: number;
    total_tokens: number;
    avg_cost_per_job: number;
    success_rate: number;
  }>> {
    const cacheKey = `usage_by_job_type_${days}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const sql = `
      SELECT
        job_type,
        SUM(total_jobs) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(total_input_tokens + total_output_tokens) as total_tokens,
        AVG(success_rate) as success_rate
      FROM usage_stats
      WHERE date >= date('now', '-${days} days')
      GROUP BY job_type
      ORDER BY total_jobs DESC
    `;

    const rows = this.db.prepare(sql).all() as any[];
    const jobTypes = rows.map(row => ({
      job_type: row.job_type,
      total_jobs: row.total_jobs,
      total_cost: row.total_cost,
      total_tokens: row.total_tokens,
      avg_cost_per_job: row.total_jobs > 0 ? row.total_cost / row.total_jobs : 0,
      success_rate: row.success_rate
    }));

    this.setCache(cacheKey, jobTypes);
    return jobTypes;
  }

  async exportUsageData(
    startDate: string,
    endDate: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const sql = `
      SELECT
        date,
        provider,
        model,
        job_type,
        total_jobs,
        total_input_tokens,
        total_output_tokens,
        total_cost,
        average_duration_ms,
        success_rate
      FROM usage_stats
      WHERE date BETWEEN ? AND ?
      ORDER BY date DESC, provider, model, job_type
    `;

    const rows = this.db.prepare(sql).all(startDate, endDate) as any[];

    if (format === 'csv') {
      const headers = Object.keys(rows[0] || {}).join(',');
      const csvRows = rows.map(row => Object.values(row).join(','));
      return `${headers}\n${csvRows.join('\n')}`;
    } else {
      return JSON.stringify(rows, null, 2);
    }
  }

  async getUsageSummary(): Promise<{
    total_jobs: number;
    total_cost: number;
    total_tokens: number;
    unique_providers: number;
    unique_models: number;
    date_range: { start: string; end: string };
  }> {
    const sql = `
      SELECT
        COUNT(*) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(total_input_tokens + total_output_tokens) as total_tokens,
        COUNT(DISTINCT provider) as unique_providers,
        COUNT(DISTINCT model) as unique_models,
        MIN(date) as start_date,
        MAX(date) as end_date
      FROM usage_stats
    `;

    const row = this.db.prepare(sql).get() as any;

    return {
      total_jobs: row.total_jobs || 0,
      total_cost: row.total_cost || 0,
      total_tokens: row.total_tokens || 0,
      unique_providers: row.unique_providers || 0,
      unique_models: row.unique_models || 0,
      date_range: {
        start: row.start_date || '',
        end: row.end_date || ''
      }
    };
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.config.enableCache) {
      return null;
    }

    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const age = now - cached.timestamp;
    const maxAge = this.config.cacheTtlMinutes * 60 * 1000;

    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    if (!this.config.enableCache) {
      return;
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries if cache is too large
    if (this.cache.size > 1000) {
      const now = Date.now();
      const maxAge = this.config.cacheTtlMinutes * 60 * 1000;

      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > maxAge) {
          this.cache.delete(key);
        }
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: 0 // Could be implemented with hit/miss tracking
    };
  }
}