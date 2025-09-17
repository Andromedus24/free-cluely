import { Database } from 'better-sqlite3';
import {
  Job,
  CreateJobRequest,
  UpdateJobRequest,
  JobQuery,
  JobListResponse,
  JobStatus,
  DatabaseError,
  NotFoundError,
  ValidationError
} from '../types/JobTypes';
import { UsageTracker } from '../usage/UsageTracker';
import { v4 as uuidv4 } from 'uuid';

export interface JobRepositoryConfig {
  enableUsageTracking: boolean;
  enableValidation: boolean;
  enableEvents: boolean;
}

export class JobRepository {
  private db: Database;
  private usageTracker?: UsageTracker;
  private config: Required<JobRepositoryConfig>;

  constructor(
    db: Database,
    config: Partial<JobRepositoryConfig> = {},
    usageTracker?: UsageTracker
  ) {
    this.db = db;
    this.usageTracker = usageTracker;
    this.config = {
      enableUsageTracking: true,
      enableValidation: true,
      enableEvents: true,
      ...config
    };
  }

  async createJob(request: CreateJobRequest): Promise<Job> {
    if (this.config.enableValidation) {
      this.validateCreateRequest(request);
    }

    const id = request.id || uuidv4();
    const now = new Date().toISOString();

    const job: Omit<Job, 'id'> = {
      type: request.type,
      status: 'pending',
      title: request.title,
      description: request.description,
      provider: request.provider,
      model: request.model,
      input_tokens: 0,
      output_tokens: 0,
      total_cost: 0,
      currency: 'USD',
      duration_ms: undefined,
      error_message: undefined,
      stack_trace: undefined,
      params: request.params || {},
      metadata: request.metadata || {},
      created_at: new Date(now),
      updated_at: new Date(now),
      started_at: undefined,
      completed_at: undefined,
      parent_job_id: request.parent_job_id
    };

    const insert = this.db.prepare(`
      INSERT INTO jobs (
        id, type, status, title, description, provider, model,
        input_tokens, output_tokens, total_cost, currency, duration_ms,
        error_message, stack_trace, params, metadata,
        created_at, updated_at, started_at, completed_at, parent_job_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      insert.run(
        id,
        job.type,
        job.status,
        job.title,
        job.description,
        job.provider,
        job.model,
        job.input_tokens,
        job.output_tokens,
        job.total_cost,
        job.currency,
        job.duration_ms,
        job.error_message,
        job.stack_trace,
        JSON.stringify(job.params),
        JSON.stringify(job.metadata),
        job.created_at.toISOString(),
        job.updated_at.toISOString(),
        job.started_at?.toISOString(),
        job.completed_at?.toISOString(),
        job.parent_job_id
      );

      if (this.config.enableEvents) {
        await this.createJobEvent(id, 'created', 'Job created', 'info', { request });
      }

      const createdJob = await this.getJobById(id);
      return createdJob!;
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create job: ${error.message}`,
        'CREATE_JOB_FAILED',
        { request, originalError: error }
      );
    }
  }

  async getJobById(id: string): Promise<Job | null> {
    const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any | undefined;

    if (!row) {
      return null;
    }

    return this.mapRowToJob(row);
  }

  async updateJob(id: string, updates: UpdateJobRequest): Promise<Job> {
    const existing = await this.getJobById(id);
    if (!existing) {
      throw new NotFoundError(`Job not found: ${id}`, 'JOB_NOT_FOUND');
    }

    if (this.config.enableValidation) {
      this.validateUpdateRequest(updates);
    }

    const setClause: string[] = [];
    const params: any[] = [];

    // Handle status transitions and timestamps
    if (updates.status) {
      setClause.push('status = ?');
      params.push(updates.status);

      if (updates.status === 'running' && existing.status === 'pending') {
        setClause.push('started_at = ?');
        params.push(new Date().toISOString());
      } else if (updates.status === 'completed' && existing.status !== 'completed') {
        setClause.push('completed_at = ?');
        params.push(new Date().toISOString());
      }
    }

    // Add other updates
    const updateFields = [
      'title', 'description', 'provider', 'model', 'input_tokens',
      'output_tokens', 'total_cost', 'currency', 'duration_ms',
      'error_message', 'stack_trace', 'params', 'metadata', 'started_at', 'completed_at'
    ];

    for (const field of updateFields) {
      if (updates[field as keyof UpdateJobRequest] !== undefined) {
        setClause.push(`${field} = ?`);
        const value = updates[field as keyof UpdateJobRequest];
        params.push(
          typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : value
        );
      }
    }

    if (setClause.length === 0) {
      return existing;
    }

    setClause.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    this.db.prepare(`
      UPDATE jobs
      SET ${setClause.join(', ')}
      WHERE id = ?
    `).run(...params);

    const updatedJob = await this.getJobById(id);

    // Capture usage if job was completed
    if (this.usageTracker && this.config.enableUsageTracking &&
        updates.status === 'completed' && existing.status !== 'completed') {
      try {
        await this.usageTracker.captureJobUsage(updatedJob!);
      } catch (error) {
        console.error('Failed to capture usage for job:', error);
      }
    }

    // Create event for status change
    if (this.config.enableEvents && updates.status && updates.status !== existing.status) {
      await this.createJobEvent(id, updates.status, `Job ${updates.status}`, 'info');
    }

    return updatedJob!;
  }

  async deleteJob(id: string, hardDelete: boolean = false): Promise<boolean> {
    const job = await this.getJobById(id);
    if (!job) {
      return false;
    }

    if (hardDelete) {
      // Delete associated artifacts and events first
      this.db.prepare('DELETE FROM job_artifacts WHERE job_id = ?').run(id);
      this.db.prepare('DELETE FROM job_events WHERE job_id = ?').run(id);
      this.db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    } else {
      // Soft delete by marking as cancelled
      await this.updateJob(id, { status: 'cancelled' });
    }

    if (this.config.enableEvents) {
      await this.createJobEvent(id, 'cancelled', 'Job deleted', 'info');
    }

    return true;
  }

  async queryJobs(query: JobQuery): Promise<JobListResponse> {
    let sql = 'SELECT * FROM jobs WHERE 1=1';
    const params: any[] = [];

    // Apply filters
    if (query.filter) {
      const filters = this.buildFilterClauses(query.filter);
      sql += filters.sql;
      params.push(...filters.params);
    }

    // Apply sorting
    if (query.sort) {
      sql += ` ORDER BY ${this.buildSortClause(query.sort)}`;
    } else {
      sql += ' ORDER BY created_at DESC';
    }

    // Apply pagination
    let hasMore = false;
    let totalCount = 0;

    if (query.pagination) {
      if (query.pagination.cursor) {
        sql += ' AND created_at < ?';
        params.push(new Date(query.pagination.cursor).toISOString());
      }

      sql += ' LIMIT ?';
      params.push(query.pagination.limit + 1); // +1 to check if there are more results

      const rows = this.db.prepare(sql).all(...params) as any[];
      hasMore = rows.length > query.pagination.limit;
      const jobs = rows.slice(0, query.pagination.limit).map(row => this.mapRowToJob(row));

      // Get total count
      totalCount = await this.getJobCount(query.filter);

      return {
        jobs,
        has_more: hasMore,
        next_cursor: hasMore ? jobs[jobs.length - 1].created_at.toISOString() : undefined,
        total_count: totalCount
      };
    } else {
      const rows = this.db.prepare(sql).all(...params) as any[];
      const jobs = rows.map(row => this.mapRowToJob(row));

      return {
        jobs,
        has_more: false,
        total_count: jobs.length
      };
    }
  }

  async getJobCount(filter?: any): Promise<number> {
    let sql = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';
    const params: any[] = [];

    if (filter) {
      const filters = this.buildFilterClauses(filter);
      sql += filters.sql;
      params.push(...filters.params);
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    const rows = this.db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC')
      .all(status) as any[];
    return rows.map(row => this.mapRowToJob(row));
  }

  async getJobsByParent(parentId: string): Promise<Job[]> {
    const rows = this.db.prepare('SELECT * FROM jobs WHERE parent_job_id = ? ORDER BY created_at ASC')
      .all(parentId) as any[];
    return rows.map(row => this.mapRowToJob(row));
  }

  async getRecentJobs(limit: number = 50): Promise<Job[]> {
    const rows = this.db.prepare('SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as any[];
    return rows.map(row => this.mapRowToJob(row));
  }

  async getJobStats(): Promise<{
    total: number;
    byStatus: Record<JobStatus, number>;
    byType: Record<string, number>;
    byProvider: Record<string, number>;
    avgDuration: number;
    totalCost: number;
    successRate: number;
  }> {
    const stats = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        AVG(duration_ms) as avg_duration,
        SUM(total_cost) as total_cost,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM jobs
      WHERE created_at >= datetime('now', '-30 days')
    `).get() as any;

    const byStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count
      FROM jobs
      GROUP BY status
    `).all() as Array<{ status: JobStatus; count: number }>;

    const byType = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM jobs
      GROUP BY type
    `).all() as Array<{ type: string; count: number }>;

    const byProvider = this.db.prepare(`
      SELECT provider, COUNT(*) as count
      FROM jobs
      WHERE provider IS NOT NULL
      GROUP BY provider
    `).all() as Array<{ provider: string; count: number }>;

    return {
      total: stats.total,
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.status]: item.count }), {} as Record<JobStatus, number>),
      byType: byType.reduce((acc, item) => ({ ...acc, [item.type]: item.count }), {}),
      byProvider: byProvider.reduce((acc, item) => ({ ...acc, [item.provider]: item.count }), {}),
      avgDuration: stats.avg_duration || 0,
      totalCost: stats.total_cost || 0,
      successRate: stats.total > 0 ? (stats.completed_count / stats.total) * 100 : 0
    };
  }

  async searchJobs(query: string, limit: number = 50): Promise<Job[]> {
    const searchQuery = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT * FROM jobs
      WHERE
        title LIKE ? OR
        description LIKE ? OR
        json_extract(metadata, '$.query') LIKE ?
      ORDER BY
        CASE
          WHEN title LIKE ? THEN 1
          WHEN description LIKE ? THEN 2
          ELSE 3
        END,
        created_at DESC
      LIMIT ?
    `).all(searchQuery, searchQuery, searchQuery, searchQuery, searchQuery, limit) as any[];

    return rows.map(row => this.mapRowToJob(row));
  }

  async getJobTimeline(jobId: string): Promise<Array<{
    timestamp: Date;
    event: string;
    message: string;
    level: string;
    data: any;
  }>> {
    const events = this.db.prepare(`
      SELECT event_type, message, level, data, created_at
      FROM job_events
      WHERE job_id = ?
      ORDER BY created_at ASC
    `).all(jobId) as any[];

    return events.map(event => ({
      timestamp: new Date(event.created_at),
      event: event.event_type,
      message: event.message || '',
      level: event.level,
      data: JSON.parse(event.data || '{}')
    }));
  }

  private async createJobEvent(
    jobId: string,
    eventType: string,
    message?: string,
    level: string = 'info',
    data: any = {}
  ): Promise<void> {
    const id = `event_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    this.db.prepare(`
      INSERT INTO job_events (
        id, job_id, event_type, message, level, data, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      jobId,
      eventType,
      message,
      level,
      JSON.stringify(data),
      JSON.stringify({}),
      new Date().toISOString()
    );
  }

  private buildFilterClauses(filter: any): { sql: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    if (filter.type?.length > 0) {
      clauses.push(`type IN (${filter.type.map(() => '?').join(', ')})`);
      params.push(...filter.type);
    }

    if (filter.status?.length > 0) {
      clauses.push(`status IN (${filter.status.map(() => '?').join(', ')})`);
      params.push(...filter.status);
    }

    if (filter.provider?.length > 0) {
      clauses.push(`provider IN (${filter.provider.map(() => '?').join(', ')})`);
      params.push(...filter.provider);
    }

    if (filter.model?.length > 0) {
      clauses.push(`model IN (${filter.model.map(() => '?').join(', ')})`);
      params.push(...filter.model);
    }

    if (filter.title_contains) {
      clauses.push('title LIKE ?');
      params.push(`%${filter.title_contains}%`);
    }

    if (filter.created_after) {
      clauses.push('created_at >= ?');
      params.push(filter.created_after.toISOString());
    }

    if (filter.created_before) {
      clauses.push('created_at <= ?');
      params.push(filter.created_before.toISOString());
    }

    if (filter.duration_min !== undefined) {
      clauses.push('duration_ms >= ?');
      params.push(filter.duration_min);
    }

    if (filter.duration_max !== undefined) {
      clauses.push('duration_ms <= ?');
      params.push(filter.duration_max);
    }

    if (filter.cost_min !== undefined) {
      clauses.push('total_cost >= ?');
      params.push(filter.cost_min);
    }

    if (filter.cost_max !== undefined) {
      clauses.push('total_cost <= ?');
      params.push(filter.cost_max);
    }

    if (filter.parent_job_id) {
      clauses.push('parent_job_id = ?');
      params.push(filter.parent_job_id);
    }

    if (filter.has_error !== undefined) {
      if (filter.has_error) {
        clauses.push('(error_message IS NOT NULL AND error_message != "")');
      } else {
        clauses.push('(error_message IS NULL OR error_message = "")');
      }
    }

    return {
      sql: clauses.length > 0 ? ` AND ${clauses.join(' AND ')}` : '',
      params
    };
  }

  private buildSortClause(sort: any): string {
    const direction = sort.direction === 'asc' ? 'ASC' : 'DESC';
    return `${sort.field} ${direction}`;
  }

  private validateCreateRequest(request: CreateJobRequest): void {
    if (!request.type) {
      throw new ValidationError('Job type is required');
    }

    if (!request.title?.trim()) {
      throw new ValidationError('Job title is required');
    }

    const validTypes = ['chat', 'vision', 'capture', 'automation', 'image_generation'];
    if (!validTypes.includes(request.type)) {
      throw new ValidationError(`Invalid job type: ${request.type}`);
    }
  }

  private validateUpdateRequest(request: UpdateJobRequest): void {
    if (request.input_tokens !== undefined && request.input_tokens < 0) {
      throw new ValidationError('Input tokens cannot be negative');
    }

    if (request.output_tokens !== undefined && request.output_tokens < 0) {
      throw new ValidationError('Output tokens cannot be negative');
    }

    if (request.total_cost !== undefined && request.total_cost < 0) {
      throw new ValidationError('Total cost cannot be negative');
    }

    if (request.duration_ms !== undefined && request.duration_ms < 0) {
      throw new ValidationError('Duration cannot be negative');
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
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      total_cost: row.total_cost,
      currency: row.currency,
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
}