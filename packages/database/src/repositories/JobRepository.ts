import Database from 'better-sqlite3';
import {
  Job,
  CreateJob,
  UpdateJob,
  JobFilter,
  JobQuery,
  PaginatedResult,
  JobStats,
  DatabaseError,
  NotFoundError,
  ConstraintError
} from '../types';
import { COLUMNS, TABLES } from '../schema';
import { QueryEngine } from '../QueryEngine';
import { randomUUID } from 'crypto';

export class JobRepository {
  private db: Database.Database;
  private queryEngine: QueryEngine;

  constructor(db: Database.Database) {
    this.db = db;
    this.queryEngine = new QueryEngine(db);
    this.prepareStatements();
  }

  private prepareStatements(): void {
    // Prepare frequently used statements
    const statements = [
      `SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.ID} = ?`,
      `SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.UUID} = ?`,
      `INSERT INTO ${TABLES.JOBS} (${COLUMNS.JOBS.UUID}, ${COLUMNS.JOBS.TITLE}, ${COLUMNS.JOBS.DESCRIPTION}, ${COLUMNS.JOBS.TYPE}, ${COLUMNS.JOBS.STATUS}, ${COLUMNS.JOBS.PRIORITY}, ${COLUMNS.JOBS.PROVIDER}, ${COLUMNS.JOBS.MODEL}, ${COLUMNS.JOBS.PROVIDER_JOB_ID}, ${COLUMNS.JOBS.REQUEST}, ${COLUMNS.JOBS.RESPONSE}, ${COLUMNS.JOBS.ERROR}, ${COLUMNS.JOBS.METADATA}, ${COLUMNS.JOBS.TAGS}, ${COLUMNS.JOBS.SESSION_ID}, ${COLUMNS.JOBS.CREATED_AT}, ${COLUMNS.JOBS.UPDATED_AT}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      `UPDATE ${TABLES.JOBS} SET ${COLUMNS.JOBS.TITLE} = ?, ${COLUMNS.JOBS.DESCRIPTION} = ?, ${COLUMNS.JOBS.TYPE} = ?, ${COLUMNS.JOBS.STATUS} = ?, ${COLUMNS.JOBS.PRIORITY} = ?, ${COLUMNS.JOBS.PROVIDER} = ?, ${COLUMNS.JOBS.MODEL} = ?, ${COLUMNS.JOBS.REQUEST} = ?, ${COLUMNS.JOBS.METADATA} = ?, ${COLUMNS.JOBS.TAGS} = ?, ${COLUMNS.JOBS.SESSION_ID} = ?, ${COLUMNS.JOBS.UPDATED_AT} = ? WHERE ${COLUMNS.JOBS.ID} = ?`,
      `UPDATE ${TABLES.JOBS} SET ${COLUMNS.JOBS.STATUS} = ?, ${COLUMNS.JOBS.STARTED_AT} = ?, ${COLUMNS.JOBS.UPDATED_AT} = ? WHERE ${COLUMNS.JOBS.ID} = ?`,
      `UPDATE ${TABLES.JOBS} SET ${COLUMNS.JOBS.STATUS} = ?, ${COLUMNS.JOBS.RESPONSE} = ?, ${COLUMNS.JOBS.ERROR} = ?, ${COLUMNS.JOBS.COMPLETED_AT} = ?, ${COLUMNS.JOBS.DURATION_MS} = ?, ${COLUMNS.JOBS.TOKENS_USED} = ?, ${COLUMNS.JOBS.COST_USD} = ?, ${COLUMNS.JOBS.UPDATED_AT} = ? WHERE ${COLUMNS.JOBS.ID} = ?`,
      `DELETE FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.ID} = ?`,
      `SELECT COUNT(*) FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.SESSION_ID} = ?`
    ];

    statements.forEach(statement => {
      try {
        this.db.prepare(statement);
      } catch (error) {
        console.warn(`Failed to prepare statement: ${statement}`, error);
      }
    });
  }

  async createJob(data: CreateJob): Promise<Job> {
    try {
      const uuid = data.uuid || randomUUID();
      const now = Math.floor(Date.now() / 1000);

      // Convert metadata and tags to JSON strings
      const metadataJson = JSON.stringify(data.metadata || {});
      const tagsJson = JSON.stringify(data.tags || []);

      const stmt = this.db.prepare(`
        INSERT INTO ${TABLES.JOBS} (
          ${COLUMNS.JOBS.UUID}, ${COLUMNS.JOBS.TITLE}, ${COLUMNS.JOBS.DESCRIPTION}, ${COLUMNS.JOBS.TYPE},
          ${COLUMNS.JOBS.STATUS}, ${COLUMNS.JOBS.PRIORITY}, ${COLUMNS.JOBS.PROVIDER}, ${COLUMNS.JOBS.MODEL},
          ${COLUMNS.JOBS.PROVIDER_JOB_ID}, ${COLUMNS.JOBS.REQUEST}, ${COLUMNS.JOBS.RESPONSE}, ${COLUMNS.JOBS.ERROR},
          ${COLUMNS.JOBS.METADATA}, ${COLUMNS.JOBS.TAGS}, ${COLUMNS.JOBS.SESSION_ID},
          ${COLUMNS.JOBS.CREATED_AT}, ${COLUMNS.JOBS.UPDATED_AT}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        uuid,
        data.title,
        data.description || null,
        data.type,
        data.status || 'pending',
        data.priority || 0,
        data.provider,
        data.model,
        data.providerJobId || null,
        data.request,
        null, // response
        null, // error
        metadataJson,
        tagsJson,
        data.sessionId || null,
        now,
        now
      );

      const job = await this.findById(result.lastInsertRowid as number);
      if (!job) {
        throw new DatabaseError('Failed to create job: job not found after insertion');
      }

      return job;
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new ConstraintError('Job with this UUID already exists', error);
      }
      throw new DatabaseError('Failed to create job', error as Error);
    }
  }

  async findById(id: number): Promise<Job | null> {
    try {
      const job = this.db
        .prepare(`SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.ID} = ?`)
        .get(id) as Job | null;

      return job;
    } catch (error) {
      throw new DatabaseError('Failed to find job by ID', error as Error);
    }
  }

  async findByUUID(uuid: string): Promise<Job | null> {
    try {
      const job = this.db
        .prepare(`SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.UUID} = ?`)
        .get(uuid) as Job | null;

      return job;
    } catch (error) {
      throw new DatabaseError('Failed to find job by UUID', error as Error);
    }
  }

  async update(id: number, data: UpdateJob): Promise<Job> {
    try {
      const existingJob = await this.findById(id);
      if (!existingJob) {
        throw new NotFoundError(`Job with ID ${id} not found`);
      }

      const stmt = this.db.prepare(`
        UPDATE ${TABLES.JOBS} SET
          ${COLUMNS.JOBS.TITLE} = ?,
          ${COLUMNS.JOBS.DESCRIPTION} = ?,
          ${COLUMNS.JOBS.TYPE} = ?,
          ${COLUMNS.JOBS.STATUS} = ?,
          ${COLUMNS.JOBS.PRIORITY} = ?,
          ${COLUMNS.JOBS.PROVIDER} = ?,
          ${COLUMNS.JOBS.MODEL} = ?,
          ${COLUMNS.JOBS.REQUEST} = ?,
          ${COLUMNS.JOBS.METADATA} = ?,
          ${COLUMNS.JOBS.TAGS} = ?,
          ${COLUMNS.JOBS.SESSION_ID} = ?,
          ${COLUMNS.JOBS.UPDATED_AT} = ?
        WHERE ${COLUMNS.JOBS.ID} = ?
      `);

      // Parse existing metadata and tags, merge with new data
      const existingMetadata = existingJob.metadata ? JSON.parse(existingJob.metadata) : {};
      const existingTags = existingJob.tags ? JSON.parse(existingJob.tags) : [];

      const updatedMetadata = { ...existingMetadata, ...(data.metadata || {}) };
      const updatedTags = data.tags || existingTags;

      stmt.run(
        data.title ?? existingJob.title,
        data.description ?? existingJob.description,
        data.type ?? existingJob.type,
        data.status ?? existingJob.status,
        data.priority ?? existingJob.priority,
        data.provider ?? existingJob.provider,
        data.model ?? existingJob.model,
        data.request ?? existingJob.request,
        JSON.stringify(updatedMetadata),
        JSON.stringify(updatedTags),
        data.sessionId ?? existingJob.sessionId,
        Math.floor(Date.now() / 1000),
        id
      );

      const updatedJob = await this.findById(id);
      if (!updatedJob) {
        throw new DatabaseError('Failed to update job: job not found after update');
      }

      return updatedJob;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConstraintError) {
        throw error;
      }
      throw new DatabaseError('Failed to update job', error as Error);
    }
  }

  async startJob(id: number, providerJobId?: string): Promise<Job> {
    try {
      const existingJob = await this.findById(id);
      if (!existingJob) {
        throw new NotFoundError(`Job with ID ${id} not found`);
      }

      if (existingJob.status !== 'pending') {
        throw new ConstraintError(`Job ${id} is not in pending status (current: ${existingJob.status})`);
      }

      const stmt = this.db.prepare(`
        UPDATE ${TABLES.JOBS} SET
          ${COLUMNS.JOBS.STATUS} = ?,
          ${COLUMNS.JOBS.STARTED_AT} = ?,
          ${COLUMNS.JOBS.PROVIDER_JOB_ID} = ?,
          ${COLUMNS.JOBS.UPDATED_AT} = ?
        WHERE ${COLUMNS.JOBS.ID} = ?
      `);

      stmt.run(
        'running',
        Math.floor(Date.now() / 1000),
        providerJobId || null,
        Math.floor(Date.now() / 1000),
        id
      );

      const updatedJob = await this.findById(id);
      if (!updatedJob) {
        throw new DatabaseError('Failed to start job: job not found after update');
      }

      return updatedJob;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConstraintError) {
        throw error;
      }
      throw new DatabaseError('Failed to start job', error as Error);
    }
  }

  async completeJob(
    id: number,
    response: string,
    tokensUsed: number,
    costUsd: number,
    error?: string
  ): Promise<Job> {
    try {
      const existingJob = await this.findById(id);
      if (!existingJob) {
        throw new NotFoundError(`Job with ID ${id} not found`);
      }

      if (existingJob.status !== 'running') {
        throw new ConstraintError(`Job ${id} is not in running status (current: ${existingJob.status})`);
      }

      const now = Math.floor(Date.now() / 1000);
      const durationMs = now - existingJob.createdAt;

      const stmt = this.db.prepare(`
        UPDATE ${TABLES.JOBS} SET
          ${COLUMNS.JOBS.STATUS} = ?,
          ${COLUMNS.JOBS.RESPONSE} = ?,
          ${COLUMNS.JOBS.ERROR} = ?,
          ${COLUMNS.JOBS.COMPLETED_AT} = ?,
          ${COLUMNS.JOBS.DURATION_MS} = ?,
          ${COLUMNS.JOBS.TOKENS_USED} = ?,
          ${COLUMNS.JOBS.COST_USD} = ?,
          ${COLUMNS.JOBS.UPDATED_AT} = ?
        WHERE ${COLUMNS.JOBS.ID} = ?
      `);

      stmt.run(
        error ? 'failed' : 'completed',
        response,
        error || null,
        now,
        durationMs,
        tokensUsed,
        costUsd,
        now,
        id
      );

      const updatedJob = await this.findById(id);
      if (!updatedJob) {
        throw new DatabaseError('Failed to complete job: job not found after update');
      }

      return updatedJob;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConstraintError) {
        throw error;
      }
      throw new DatabaseError('Failed to complete job', error as Error);
    }
  }

  async cancelJob(id: number): Promise<Job> {
    try {
      const existingJob = await this.findById(id);
      if (!existingJob) {
        throw new NotFoundError(`Job with ID ${id} not found`);
      }

      if (!['pending', 'running'].includes(existingJob.status)) {
        throw new ConstraintError(`Job ${id} cannot be cancelled (current: ${existingJob.status})`);
      }

      const now = Math.floor(Date.now() / 1000);
      const durationMs = now - existingJob.createdAt;

      const stmt = this.db.prepare(`
        UPDATE ${TABLES.JOBS} SET
          ${COLUMNS.JOBS.STATUS} = ?,
          ${COLUMNS.JOBS.COMPLETED_AT} = ?,
          ${COLUMNS.JOBS.DURATION_MS} = ?,
          ${COLUMNS.JOBS.UPDATED_AT} = ?
        WHERE ${COLUMNS.JOBS.ID} = ?
      `);

      stmt.run('cancelled', now, durationMs, now, id);

      const updatedJob = await this.findById(id);
      if (!updatedJob) {
        throw new DatabaseError('Failed to cancel job: job not found after update');
      }

      return updatedJob;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ConstraintError) {
        throw error;
      }
      throw new DatabaseError('Failed to cancel job', error as Error);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const existingJob = await this.findById(id);
      if (!existingJob) {
        throw new NotFoundError(`Job with ID ${id} not found`);
      }

      const stmt = this.db.prepare(`DELETE FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.ID} = ?`);
      const result = stmt.run(id);

      return result.changes > 0;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete job', error as Error);
    }
  }

  async query(query: JobQuery): Promise<PaginatedResult<Job>> {
    try {
      return await this.queryEngine.queryJobs(query);
    } catch (error) {
      throw new DatabaseError('Failed to query jobs', error as Error);
    }
  }

  async getStats(filter?: JobFilter): Promise<JobStats> {
    try {
      return await this.queryEngine.getJobStats(filter);
    } catch (error) {
      throw new DatabaseError('Failed to get job statistics', error as Error);
    }
  }

  async findBySession(sessionId: string): Promise<Job[]> {
    try {
      const jobs = this.db
        .prepare(`SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.SESSION_ID} = ? ORDER BY ${COLUMNS.JOBS.CREATED_AT} DESC`)
        .all(sessionId) as Job[];

      return jobs;
    } catch (error) {
      throw new DatabaseError('Failed to find jobs by session', error as Error);
    }
  }

  async findRunningJobs(): Promise<Job[]> {
    try {
      const jobs = this.db
        .prepare(`SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.STATUS} = 'running' ORDER BY ${COLUMNS.JOBS.STARTED_AT} ASC`)
        .all() as Job[];

      return jobs;
    } catch (error) {
      throw new DatabaseError('Failed to find running jobs', error as Error);
    }
  }

  async findFailedJobs(limit: number = 50): Promise<Job[]> {
    try {
      const jobs = this.db
        .prepare(`SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.STATUS} = 'failed' ORDER BY ${COLUMNS.JOBS.COMPLETED_AT} DESC LIMIT ?`)
        .all(limit) as Job[];

      return jobs;
    } catch (error) {
      throw new DatabaseError('Failed to find failed jobs', error as Error);
    }
  }

  async findJobsByStatus(status: string, limit: number = 50): Promise<Job[]> {
    try {
      const jobs = this.db
        .prepare(`SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.STATUS} = ? ORDER BY ${COLUMNS.JOBS.CREATED_AT} DESC LIMIT ?`)
        .all(status, limit) as Job[];

      return jobs;
    } catch (error) {
      throw new DatabaseError('Failed to find jobs by status', error as Error);
    }
  }

  async getJobCount(filter?: JobFilter): Promise<number> {
    try {
      const { whereClause, params } = this.queryEngine['buildJobFilter'](filter || {});

      const query = `SELECT COUNT(*) as count FROM ${TABLES.JOBS} j ${whereClause ? `WHERE ${whereClause}` : ''}`;
      const result = this.db.prepare(query).get(...params) as { count: number };

      return result.count;
    } catch (error) {
      throw new DatabaseError('Failed to get job count', error as Error);
    }
  }

  async cleanupOldJobs(olderThanDays: number = 30): Promise<{
    deletedCount: number;
    deletedJobs: Job[];
  }> {
    try {
      const cutoffTime = Math.floor((Date.now() - olderThanDays * 24 * 60 * 60 * 1000) / 1000);

      // Find jobs to delete
      const jobsToDelete = this.db
        .prepare(`SELECT * FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.CREATED_AT} < ? AND ${COLUMNS.JOBS.STATUS} IN ('completed', 'failed', 'cancelled')`)
        .all(cutoffTime) as Job[];

      if (jobsToDelete.length === 0) {
        return { deletedCount: 0, deletedJobs: [] };
      }

      // Delete jobs
      const stmt = this.db.prepare(`DELETE FROM ${TABLES.JOBS} WHERE ${COLUMNS.JOBS.ID} = ?`);
      let deletedCount = 0;

      for (const job of jobsToDelete) {
        stmt.run(job.id);
        deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} old jobs older than ${olderThanDays} days`);

      return {
        deletedCount,
        deletedJobs: jobsToDelete
      };
    } catch (error) {
      throw new DatabaseError('Failed to cleanup old jobs', error as Error);
    }
  }
}