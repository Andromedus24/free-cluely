import { Database } from 'better-sqlite3';
import {
  Job,
  JobArtifact,
  JobEvent,
  JobFilter,
  JobSort,
  JobPagination,
  JobQuery,
  ArtifactFilter,
  EventFilter,
  UsageStatsFilter,
  JobListResponse,
  ArtifactListResponse,
  EventListResponse,
  UsageStatsResponse,
  DashboardStats,
  CostBreakdown,
  JobStatus,
  JobType,
  EventLevel
} from '../types/JobTypes';
import { DatabaseError, NotFoundError, ValidationError } from '../types/JobTypes';

export class JobQueries {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // Job queries with cursor pagination
  async queryJobs(query: JobQuery): Promise<JobListResponse> {
    const { filter = {}, sort = { field: 'created_at', direction: 'desc' }, pagination = { limit: 50 } } = query;

    // Build WHERE clause
    const whereClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.type && filter.type.length > 0) {
      const placeholders = filter.type.map(() => '?').join(',');
      whereClause.push(`jobs.type IN (${placeholders})`);
      params.push(...filter.type);
      paramIndex += filter.type.length;
    }

    if (filter.status && filter.status.length > 0) {
      const placeholders = filter.status.map(() => '?').join(',');
      whereClause.push(`jobs.status IN (${placeholders})`);
      params.push(...filter.status);
      paramIndex += filter.status.length;
    }

    if (filter.provider && filter.provider.length > 0) {
      const placeholders = filter.provider.map(() => '?').join(',');
      whereClause.push(`jobs.provider IN (${placeholders})`);
      params.push(...filter.provider);
      paramIndex += filter.provider.length;
    }

    if (filter.model && filter.model.length > 0) {
      const placeholders = filter.model.map(() => '?').join(',');
      whereClause.push(`jobs.model IN (${placeholders})`);
      params.push(...filter.model);
      paramIndex += filter.model.length;
    }

    if (filter.title_contains) {
      whereClause.push(`jobs.title LIKE ?`);
      params.push(`%${filter.title_contains}%`);
      paramIndex++;
    }

    if (filter.created_after) {
      whereClause.push(`jobs.created_at >= ?`);
      params.push(filter.created_after.toISOString());
      paramIndex++;
    }

    if (filter.created_before) {
      whereClause.push(`jobs.created_at <= ?`);
      params.push(filter.created_before.toISOString());
      paramIndex++;
    }

    if (filter.duration_min !== undefined) {
      whereClause.push(`jobs.duration_ms >= ?`);
      params.push(filter.duration_min);
      paramIndex++;
    }

    if (filter.duration_max !== undefined) {
      whereClause.push(`jobs.duration_ms <= ?`);
      params.push(filter.duration_max);
      paramIndex++;
    }

    if (filter.cost_min !== undefined) {
      whereClause.push(`jobs.total_cost >= ?`);
      params.push(filter.cost_min);
      paramIndex++;
    }

    if (filter.cost_max !== undefined) {
      whereClause.push(`jobs.total_cost <= ?`);
      params.push(filter.cost_max);
      paramIndex++;
    }

    if (filter.parent_job_id) {
      whereClause.push(`jobs.parent_job_id = ?`);
      params.push(filter.parent_job_id);
      paramIndex++;
    }

    if (filter.has_error !== undefined) {
      whereClause.push(filter.has_error ? `jobs.error_message IS NOT NULL` : `jobs.error_message IS NULL`);
    }

    // Build ORDER BY clause
    const orderClause = `jobs.${sort.field} ${sort.direction.toUpperCase()}`;

    // Build cursor condition
    const cursorClause = pagination.cursor ? this.buildCursorCondition(sort.field, sort.direction, paramIndex) : '';
    if (cursorClause) {
      params.push(this.decodeCursor(pagination.cursor));
      paramIndex++;
    }

    // Combine WHERE clauses
    const fullWhereClause = whereClause.length > 0
      ? `WHERE ${whereClause.join(' AND ')}${cursorClause ? ` AND ${cursorClause}` : ''}`
      : cursorClause
      ? `WHERE ${cursorClause}`
      : '';

    // Execute query
    const sql = `
      SELECT
        jobs.*,
        COUNT(DISTINCT job_artifacts.id) as artifact_count,
        COUNT(DISTINCT job_events.id) as event_count
      FROM jobs
      LEFT JOIN job_artifacts ON jobs.id = job_artifacts.job_id AND job_artifacts.is_deleted = 0
      LEFT JOIN job_events ON jobs.id = job_events.job_id
      ${fullWhereClause}
      GROUP BY jobs.id
      ORDER BY ${orderClause}
      LIMIT ${Math.min(pagination.limit, 1000)}
    `;

    const rows = this.db.prepare(sql).all(...params) as any[];
    const jobs = rows.map(row => this.mapRowToJob(row));

    // Determine if there are more results
    const hasMore = jobs.length === pagination.limit;
    let nextCursor: string | undefined;

    if (hasMore && jobs.length > 0) {
      const lastJob = jobs[jobs.length - 1];
      nextCursor = this.encodeCursor(lastJob[sort.field]);
    }

    // Get total count for accurate pagination info
    const countSql = `
      SELECT COUNT(*) as total
      FROM jobs
      ${fullWhereClause.replace(cursorClause || '', '')}
    `;
    const totalResult = this.db.prepare(countSql).all(...params.slice(0, -cursorClause ? 1 : 0)) as { total: number }[];
    const totalCount = totalResult[0]?.total || 0;

    return {
      jobs,
      hasMore,
      nextCursor,
      total_count: totalCount
    };
  }

  async getJobById(jobId: string): Promise<Job | null> {
    const row = this.db.prepare(`
      SELECT
        jobs.*,
        COUNT(DISTINCT job_artifacts.id) as artifact_count,
        COUNT(DISTINCT job_events.id) as event_count
      FROM jobs
      LEFT JOIN job_artifacts ON jobs.id = job_artifacts.job_id AND job_artifacts.is_deleted = 0
      LEFT JOIN job_events ON jobs.id = job_events.job_id
      WHERE jobs.id = ?
      GROUP BY jobs.id
    `).get(jobId) as any | undefined;

    return row ? this.mapRowToJob(row) : null;
  }

  // Artifact queries
  async queryArtifacts(filter: ArtifactFilter, pagination: JobPagination = { limit: 50 }): Promise<ArtifactListResponse> {
    const whereClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.job_id) {
      whereClause.push(`job_artifacts.job_id = ?`);
      params.push(filter.job_id);
      paramIndex++;
    }

    if (filter.type && filter.type.length > 0) {
      const placeholders = filter.type.map(() => '?').join(',');
      whereClause.push(`job_artifacts.type IN (${placeholders})`);
      params.push(...filter.type);
      paramIndex += filter.type.length;
    }

    if (filter.name_contains) {
      whereClause.push(`job_artifacts.name LIKE ?`);
      params.push(`%${filter.name_contains}%`);
      paramIndex++;
    }

    if (filter.created_after) {
      whereClause.push(`job_artifacts.created_at >= ?`);
      params.push(filter.created_after.toISOString());
      paramIndex++;
    }

    if (filter.created_before) {
      whereClause.push(`job_artifacts.created_at <= ?`);
      params.push(filter.created_before.toISOString());
      paramIndex++;
    }

    if (filter.mime_type) {
      whereClause.push(`job_artifacts.mime_type = ?`);
      params.push(filter.mime_type);
      paramIndex++;
    }

    if (filter.is_deleted !== undefined) {
      whereClause.push(`job_artifacts.is_deleted = ?`);
      params.push(filter.is_deleted ? 1 : 0);
      paramIndex++;
    }

    const fullWhereClause = whereClause.length > 0
      ? `WHERE ${whereClause.join(' AND ')}`
      : '';

    const sql = `
      SELECT job_artifacts.*, jobs.title as job_title, jobs.type as job_type
      FROM job_artifacts
      LEFT JOIN jobs ON job_artifacts.job_id = jobs.id
      ${fullWhereClause}
      ORDER BY job_artifacts.created_at DESC
      LIMIT ${Math.min(pagination.limit, 1000)}
    `;

    const rows = this.db.prepare(sql).all(...params) as any[];
    const artifacts = rows.map(row => ({
      ...this.mapRowToArtifact(row),
      job_title: row.job_title,
      job_type: row.job_type
    }));

    const hasMore = artifacts.length === pagination.limit;
    let nextCursor: string | undefined;

    if (hasMore && artifacts.length > 0) {
      const lastArtifact = artifacts[artifacts.length - 1];
      nextCursor = this.encodeCursor(lastArtifact.created_at.getTime());
    }

    const countSql = `
      SELECT COUNT(*) as total FROM job_artifacts ${fullWhereClause}
    `;
    const totalResult = this.db.prepare(countSql).get(...params) as { total: number };
    const totalCount = totalResult.total || 0;

    return {
      artifacts,
      hasMore,
      nextCursor,
      total_count: totalCount
    };
  }

  // Event queries
  async queryEvents(filter: EventFilter, pagination: JobPagination = { limit: 50 }): Promise<EventListResponse> {
    const whereClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filter.job_id) {
      whereClause.push(`job_events.job_id = ?`);
      params.push(filter.job_id);
      paramIndex++;
    }

    if (filter.event_type && filter.event_type.length > 0) {
      const placeholders = filter.event_type.map(() => '?').join(',');
      whereClause.push(`job_events.event_type IN (${placeholders})`);
      params.push(...filter.event_type);
      paramIndex += filter.event_type.length;
    }

    if (filter.level && filter.level.length > 0) {
      const placeholders = filter.level.map(() => '?').join(',');
      whereClause.push(`job_events.level IN (${placeholders})`);
      params.push(...filter.level);
      paramIndex += filter.level.length;
    }

    if (filter.created_after) {
      whereClause.push(`job_events.created_at >= ?`);
      params.push(filter.created_after.toISOString());
      paramIndex++;
    }

    if (filter.created_before) {
      whereClause.push(`job_events.created_at <= ?`);
      params.push(filter.created_before.toISOString());
      paramIndex++;
    }

    if (filter.message_contains) {
      whereClause.push(`job_events.message LIKE ?`);
      params.push(`%${filter.message_contains}%`);
      paramIndex++;
    }

    const fullWhereClause = whereClause.length > 0
      ? `WHERE ${whereClause.join(' AND ')}`
      : '';

    const sql = `
      SELECT job_events.*, jobs.title as job_title, jobs.type as job_type
      FROM job_events
      LEFT JOIN jobs ON job_events.job_id = jobs.id
      ${fullWhereClause}
      ORDER BY job_events.created_at DESC
      LIMIT ${Math.min(pagination.limit, 1000)}
    `;

    const rows = this.db.prepare(sql).all(...params) as any[];
    const events = rows.map(row => ({
      ...this.mapRowToEvent(row),
      job_title: row.job_title,
      job_type: row.job_type
    }));

    const hasMore = events.length === pagination.limit;
    let nextCursor: string | undefined;

    if (hasMore && events.length > 0) {
      const lastEvent = events[events.length - 1];
      nextCursor = this.encodeCursor(lastEvent.created_at.getTime());
    }

    const countSql = `
      SELECT COUNT(*) as total FROM job_events ${fullWhereClause}
    `;
    const totalResult = this.db.prepare(countSql).get(...params) as { total: number };
    const totalCount = totalResult.total || 0;

    return {
      events,
      hasMore,
      nextCursor,
      total_count: totalCount
    };
  }

  // Usage stats queries
  async getUsageStats(filter: UsageStatsFilter = {}): Promise<UsageStatsResponse> {
    const whereClause: string[] = [];
    const params: any[] = [];

    if (filter.provider && filter.provider.length > 0) {
      const placeholders = filter.provider.map(() => '?').join(',');
      whereClause.push(`provider IN (${placeholders})`);
      params.push(...filter.provider);
    }

    if (filter.model && filter.model.length > 0) {
      const placeholders = filter.model.map(() => '?').join(',');
      whereClause.push(`model IN (${placeholders})`);
      params.push(...filter.model);
    }

    if (filter.job_type && filter.job_type.length > 0) {
      const placeholders = filter.job_type.map(() => '?').join(',');
      whereClause.push(`job_type IN (${placeholders})`);
      params.push(...filter.job_type);
    }

    if (filter.date_after) {
      whereClause.push(`date >= ?`);
      params.push(filter.date_after);
    }

    if (filter.date_before) {
      whereClause.push(`date <= ?`);
      params.push(filter.date_before);
    }

    const fullWhereClause = whereClause.length > 0
      ? `WHERE ${whereClause.join(' AND ')}`
      : '';

    const stats = this.db.prepare(`
      SELECT
        SUM(total_jobs) as total_jobs,
        SUM(total_input_tokens) as total_input_tokens,
        SUM(total_output_tokens) as total_output_tokens,
        SUM(total_cost) as total_cost,
        AVG(success_rate) as average_success_rate
      FROM usage_stats
      ${fullWhereClause}
    `).get(...params) as {
      total_jobs: number;
      total_input_tokens: number;
      total_output_tokens: number;
      total_cost: number;
      average_success_rate: number;
    };

    const detailedStats = this.db.prepare(`
      SELECT * FROM usage_stats
      ${fullWhereClause}
      ORDER BY date DESC
    `).all(...params);

    return {
      stats: detailedStats,
      total_jobs: stats.total_jobs || 0,
      total_cost: stats.total_cost || 0,
      total_input_tokens: stats.total_input_tokens || 0,
      total_output_tokens: stats.total_output_tokens || 0,
      average_success_rate: stats.average_success_rate || 0
    };
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    // Overall stats
    const overallStats = this.db.prepare(`
      SELECT
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
        SUM(total_cost) as total_cost,
        SUM(input_tokens + output_tokens) as total_tokens,
        AVG(duration_ms) as average_duration
      FROM jobs
      WHERE created_at >= datetime('now', '-30 days')
    `).get() as {
      total_jobs: number;
      completed_jobs: number;
      failed_jobs: number;
      total_cost: number;
      total_tokens: number;
      average_duration: number;
    };

    // Success rate
    const successRate = overallStats.total_jobs > 0
      ? overallStats.completed_jobs / overallStats.total_jobs
      : 0;

    // Jobs by type
    const jobsByType = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM jobs
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY type
    `).all() as Array<{ type: JobType; count: number }>;

    const jobsByTypeMap: Record<JobType, number> = {
      chat: 0,
      vision: 0,
      capture: 0,
      automation: 0,
      image_generation: 0
    };

    for (const item of jobsByType) {
      jobsByTypeMap[item.type] = item.count;
    }

    // Jobs by status
    const jobsByStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM jobs
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY status
    `).all() as Array<{ status: JobStatus; count: number }>;

    const jobsByStatusMap: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };

    for (const item of jobsByStatus) {
      jobsByStatusMap[item.status] = item.count;
    }

    // Cost by provider
    const costByProvider = this.db.prepare(`
      SELECT provider, SUM(total_cost) as total_cost
      FROM jobs
      WHERE created_at >= datetime('now', '-30 days') AND provider IS NOT NULL
      GROUP BY provider
    `).all() as Array<{ provider: string; total_cost: number }>;

    const costByProviderMap: Record<string, number> = {};
    for (const item of costByProvider) {
      costByProviderMap[item.provider] = item.total_cost;
    }

    // Recent activity
    const recentActivity = this.db.prepare(`
      SELECT job_events.*, jobs.title as job_title, jobs.type as job_type
      FROM job_events
      LEFT JOIN jobs ON job_events.job_id = jobs.id
      WHERE job_events.created_at >= datetime('now', '-24 hours')
      ORDER BY job_events.created_at DESC
      LIMIT 10
    `).all() as any[];

    const events = recentActivity.map(row => this.mapRowToEvent(row));

    return {
      total_jobs: overallStats.total_jobs || 0,
      completed_jobs: overallStats.completed_jobs || 0,
      failed_jobs: overallStats.failed_jobs || 0,
      total_cost: overallStats.total_cost || 0,
      total_tokens: overallStats.total_tokens || 0,
      average_duration: overallStats.average_duration || 0,
      success_rate,
      jobs_by_type: jobsByTypeMap,
      jobs_by_status: jobsByStatusMap,
      cost_by_provider: costByProviderMap,
      recent_activity: events
    };
  }

  // Cost breakdown by provider and model
  async getCostBreakdown(): Promise<CostBreakdown[]> {
    const results = this.db.prepare(`
      SELECT
        provider,
        model,
        COUNT(*) as total_jobs,
        SUM(total_cost) as total_cost,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens
      FROM jobs
      WHERE created_at >= datetime('now', '-30 days') AND status = 'completed'
      GROUP BY provider, model
      ORDER BY total_cost DESC
    `).all() as Array<{
      provider: string;
      model: string;
      total_jobs: number;
      total_cost: number;
      total_input_tokens: number;
      total_output_tokens: number;
    }>;

    return results.map(item => ({
      provider: item.provider,
      model: item.model,
      total_jobs: item.total_jobs,
      total_cost: item.total_cost,
      total_input_tokens: item.total_input_tokens,
      total_output_tokens: item.total_output_tokens,
      average_cost_per_job: item.total_cost / item.total_jobs,
      average_tokens_per_job: (item.total_input_tokens + item.total_output_tokens) / item.total_jobs
    }));
  }

  // Search functionality
  async searchJobs(query: string, limit: number = 50): Promise<Job[]> {
    const searchPattern = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT DISTINCT jobs.*
      FROM jobs
      LEFT JOIN job_events ON jobs.id = job_events.job_id
      WHERE
        jobs.title LIKE ? OR
        jobs.description LIKE ? OR
        job_events.message LIKE ?
      ORDER BY jobs.created_at DESC
      LIMIT ?
    `).all(searchPattern, searchPattern, searchPattern, limit) as any[];

    return rows.map(row => this.mapRowToJob(row));
  }

  // Helper methods
  private buildCursorCondition(field: string, direction: string, paramIndex: number): string {
    const operator = direction === 'asc' ? '>' : '<';
    return `jobs.${field} ${operator} ?`;
  }

  private encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString('base64');
  }

  private decodeCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch {
      throw new ValidationError('Invalid cursor format', 'INVALID_CURSOR');
    }
  }

  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      title: row.title,
      description: row.description,
      provider: row.provider,
      model: row.model,
      input_tokens: row.input_tokens || 0,
      output_tokens: row.output_tokens || 0,
      total_cost: row.total_cost || 0,
      currency: row.currency || 'USD',
      duration_ms: row.duration_ms,
      error_message: row.error_message,
      stack_trace: row.stack_trace,
      params: JSON.parse(row.params || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      started_at: row.started_at ? new Date(row.started_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      parent_job_id: row.parent_job_id
    };
  }

  private mapRowToArtifact(row: any): JobArtifact {
    return {
      id: row.id,
      job_id: row.job_id,
      type: row.type,
      name: row.name,
      file_path: row.file_path,
      file_size: row.file_size,
      mime_type: row.mime_type,
      hash_sha256: row.hash_sha256,
      metadata: JSON.parse(row.metadata || '{}'),
      is_deleted: row.is_deleted === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  private mapRowToEvent(row: any): JobEvent {
    return {
      id: row.id,
      job_id: row.job_id,
      event_type: row.event_type,
      message: row.message,
      level: row.level,
      data: JSON.parse(row.data || '{}'),
      metadata: JSON.parse(row.metadata || '{}'),
      created_at: new Date(row.created_at)
    };
  }
}