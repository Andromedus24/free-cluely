import Database from 'better-sqlite3';
import {
  Session,
  CreateSession,
  DatabaseError,
  NotFoundError,
  ConstraintError
} from '../types';
import { TABLES, COLUMNS } from '../schema';
import { randomUUID } from 'crypto';

export class SessionRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  private prepareStatements(): void {
    const statements = [
      `SELECT * FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.ID} = ?`,
      `SELECT * FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.UUID} = ?`,
      `INSERT INTO ${TABLES.SESSIONS} (${COLUMNS.SESSIONS.UUID}, ${COLUMNS.SESSIONS.NAME}, ${COLUMNS.SESSIONS.DESCRIPTION}, ${COLUMNS.SESSIONS.METADATA}, ${COLUMNS.SESSIONS.TAGS}, ${COLUMNS.SESSIONS.CREATED_AT}, ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT}, ${COLUMNS.SESSIONS.UPDATED_AT}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      `UPDATE ${TABLES.SESSIONS} SET ${COLUMNS.SESSIONS.NAME} = ?, ${COLUMNS.SESSIONS.DESCRIPTION} = ?, ${COLUMNS.SESSIONS.METADATA} = ?, ${COLUMNS.SESSIONS.TAGS} = ?, ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} = ?, ${COLUMNS.SESSIONS.UPDATED_AT} = ? WHERE ${COLUMNS.SESSIONS.ID} = ?`,
      `DELETE FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.ID} = ?`,
      `SELECT * FROM ${TABLES.SESSIONS} ORDER BY ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} DESC LIMIT ?`,
      `SELECT COUNT(*) FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} >= ?`
    ];

    statements.forEach(statement => {
      try {
        this.db.prepare(statement);
      } catch (error) {
        console.warn(`Failed to prepare statement: ${statement}`, error);
      }
    });
  }

  async createSession(data: CreateSession): Promise<Session> {
    try {
      const uuid = data.uuid || randomUUID();
      const now = Math.floor(Date.now() / 1000);

      // Convert metadata and tags to JSON strings
      const metadataJson = JSON.stringify(data.metadata || {});
      const tagsJson = JSON.stringify(data.tags || []);

      const stmt = this.db.prepare(`
        INSERT INTO ${TABLES.SESSIONS} (
          ${COLUMNS.SESSIONS.UUID}, ${COLUMNS.SESSIONS.NAME}, ${COLUMNS.SESSIONS.DESCRIPTION},
          ${COLUMNS.SESSIONS.METADATA}, ${COLUMNS.SESSIONS.TAGS},
          ${COLUMNS.SESSIONS.CREATED_AT}, ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT}, ${COLUMNS.SESSIONS.UPDATED_AT}
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        uuid,
        data.name || null,
        data.description || null,
        metadataJson,
        tagsJson,
        now,
        now,
        now
      );

      const session = await this.findById(result.lastInsertRowid as number);
      if (!session) {
        throw new DatabaseError('Failed to create session: session not found after insertion');
      }

      return session;
    } catch (error) {
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new ConstraintError('Session with this UUID already exists', error);
      }
      throw new DatabaseError('Failed to create session', error as Error);
    }
  }

  async findById(id: number): Promise<Session | null> {
    try {
      const session = this.db
        .prepare(`SELECT * FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.ID} = ?`)
        .get(id) as Session | null;

      return session;
    } catch (error) {
      throw new DatabaseError('Failed to find session by ID', error as Error);
    }
  }

  async findByUUID(uuid: string): Promise<Session | null> {
    try {
      const session = this.db
        .prepare(`SELECT * FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.UUID} = ?`)
        .get(uuid) as Session | null;

      return session;
    } catch (error) {
      throw new DatabaseError('Failed to find session by UUID', error as Error);
    }
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      metadata?: Record<string, unknown>;
      tags?: string[];
    }
  ): Promise<Session> {
    try {
      const existingSession = await this.findById(id);
      if (!existingSession) {
        throw new NotFoundError(`Session with ID ${id} not found`);
      }

      const stmt = this.db.prepare(`
        UPDATE ${TABLES.SESSIONS} SET
          ${COLUMNS.SESSIONS.NAME} = ?,
          ${COLUMNS.SESSIONS.DESCRIPTION} = ?,
          ${COLUMNS.SESSIONS.METADATA} = ?,
          ${COLUMNS.SESSIONS.TAGS} = ?,
          ${COLUMNS.SESSIONS.UPDATED_AT} = ?
        WHERE ${COLUMNS.SESSIONS.ID} = ?
      `);

      // Parse existing metadata and tags, merge with new data
      const existingMetadata = existingSession.metadata ? JSON.parse(existingSession.metadata) : {};
      const existingTags = existingSession.tags ? JSON.parse(existingSession.tags) : [];

      const updatedMetadata = { ...existingMetadata, ...(data.metadata || {}) };
      const updatedTags = data.tags || existingTags;

      stmt.run(
        data.name ?? existingSession.name,
        data.description ?? existingSession.description,
        JSON.stringify(updatedMetadata),
        JSON.stringify(updatedTags),
        Math.floor(Date.now() / 1000),
        id
      );

      const updatedSession = await this.findById(id);
      if (!updatedSession) {
        throw new DatabaseError('Failed to update session: session not found after update');
      }

      return updatedSession;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update session', error as Error);
    }
  }

  async updateActivity(id: number): Promise<Session> {
    try {
      const existingSession = await this.findById(id);
      if (!existingSession) {
        throw new NotFoundError(`Session with ID ${id} not found`);
      }

      const stmt = this.db.prepare(`
        UPDATE ${TABLES.SESSIONS} SET
          ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} = ?,
          ${COLUMNS.SESSIONS.UPDATED_AT} = ?
        WHERE ${COLUMNS.SESSIONS.ID} = ?
      `);

      const now = Math.floor(Date.now() / 1000);
      stmt.run(now, now, id);

      const updatedSession = await this.findById(id);
      if (!updatedSession) {
        throw new DatabaseError('Failed to update session activity: session not found after update');
      }

      return updatedSession;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update session activity', error as Error);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      const existingSession = await this.findById(id);
      if (!existingSession) {
        throw new NotFoundError(`Session with ID ${id} not found`);
      }

      const stmt = this.db.prepare(`DELETE FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.ID} = ?`);
      const result = stmt.run(id);

      return result.changes > 0;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete session', error as Error);
    }
  }

  async findRecent(limit: number = 50): Promise<Session[]> {
    try {
      const sessions = this.db
        .prepare(`SELECT * FROM ${TABLES.SESSIONS} ORDER BY ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} DESC LIMIT ?`)
        .all(limit) as Session[];

      return sessions;
    } catch (error) {
      throw new DatabaseError('Failed to find recent sessions', error as Error);
    }
  }

  async findActive(sinceDays: number = 7): Promise<Session[]> {
    try {
      const cutoffTime = Math.floor((Date.now() - sinceDays * 24 * 60 * 60 * 1000) / 1000);
      const sessions = this.db
        .prepare(`SELECT * FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} >= ? ORDER BY ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} DESC`)
        .all(cutoffTime) as Session[];

      return sessions;
    } catch (error) {
      throw new DatabaseError('Failed to find active sessions', error as Error);
    }
  }

  async findByName(name: string): Promise<Session[]> {
    try {
      const sessions = this.db
        .prepare(`SELECT * FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.NAME} LIKE ? ORDER BY ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} DESC`)
        .all(`%${name}%`) as Session[];

      return sessions;
    } catch (error) {
      throw new DatabaseError('Failed to find sessions by name', error as Error);
    }
  }

  async findByTag(tag: string): Promise<Session[]> {
    try {
      const sessions = this.db
        .prepare(`SELECT * FROM ${TABLES.SESSIONS} WHERE json_extract(${COLUMNS.SESSIONS.TAGS}, '$[*]') LIKE ? ORDER BY ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} DESC`)
        .all(`%"${tag}"%`) as Session[];

      return sessions;
    } catch (error) {
      throw new DatabaseError('Failed to find sessions by tag', error as Error);
    }
  }

  async getSessionStats(sessionId: number): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalDuration: number;
    totalCost: number;
    averageCost: number;
    lastJob?: Date;
  }> {
    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_jobs,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
          SUM(duration_ms) as total_duration,
          SUM(cost_usd) as total_cost,
          MAX(created_at) as last_job_time
        FROM ${TABLES.JOBS}
        WHERE ${COLUMNS.JOBS.SESSION_ID} = ?
      `;

      const stats = this.db.prepare(statsQuery).get(sessionId) as any;

      return {
        totalJobs: stats.total_jobs || 0,
        completedJobs: stats.completed_jobs || 0,
        failedJobs: stats.failed_jobs || 0,
        totalDuration: stats.total_duration || 0,
        totalCost: stats.total_cost || 0,
        averageCost: stats.total_jobs > 0 ? (stats.total_cost || 0) / stats.total_jobs : 0,
        lastJob: stats.last_job_time ? new Date(stats.last_job_time * 1000) : undefined
      };
    } catch (error) {
      throw new DatabaseError('Failed to get session stats', error as Error);
    }
  }

  async getActiveSessionCount(sinceDays: number = 7): Promise<number> {
    try {
      const cutoffTime = Math.floor((Date.now() - sinceDays * 24 * 60 * 60 * 1000) / 1000);
      const result = this.db
        .prepare(`SELECT COUNT(*) as count FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} >= ?`)
        .get(cutoffTime) as { count: number };

      return result.count;
    } catch (error) {
      throw new DatabaseError('Failed to get active session count', error as Error);
    }
  }

  async cleanupInactiveSessions(olderThanDays: number = 30): Promise<{
    deletedCount: number;
    deletedSessions: Session[];
  }> {
    try {
      const cutoffTime = Math.floor((Date.now() - olderThanDays * 24 * 60 * 60 * 1000) / 1000);

      // Find sessions to delete (only those with no jobs)
      const sessionsToDelete = this.db
        .prepare(`
          SELECT s.* FROM ${TABLES.SESSIONS} s
          LEFT JOIN ${TABLES.JOBS} j ON s.id = j.${COLUMNS.JOBS.SESSION_ID}
          WHERE s.${COLUMNS.SESSIONS.LAST_ACTIVITY_AT} < ?
          AND j.id IS NULL
        `)
        .all(cutoffTime) as Session[];

      if (sessionsToDelete.length === 0) {
        return { deletedCount: 0, deletedSessions: [] };
      }

      // Delete sessions
      const stmt = this.db.prepare(`DELETE FROM ${TABLES.SESSIONS} WHERE ${COLUMNS.SESSIONS.ID} = ?`);
      let deletedCount = 0;

      for (const session of sessionsToDelete) {
        stmt.run(session.id);
        deletedCount++;
      }

      console.log(`Cleaned up ${deletedCount} inactive sessions older than ${olderThanDays} days`);

      return {
        deletedCount,
        deletedSessions: sessionsToDelete
      };
    } catch (error) {
      throw new DatabaseError('Failed to cleanup inactive sessions', error as Error);
    }
  }
}