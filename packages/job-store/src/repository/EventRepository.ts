import { Database } from 'better-sqlite3';
import {
  JobEvent,
  CreateEventRequest,
  EventFilter,
  EventListResponse,
  DatabaseError,
  ValidationError
} from '../types/JobTypes';
import { v4 as uuidv4 } from 'uuid';

export interface EventRepositoryConfig {
  enableValidation: boolean;
  enableCleanup: boolean;
  retentionDays: number;
}

export class EventRepository {
  private db: Database;
  private config: Required<EventRepositoryConfig>;

  constructor(db: Database, config: Partial<EventRepositoryConfig> = {}) {
    this.db = db;
    this.config = {
      enableValidation: true,
      enableCleanup: true,
      retentionDays: 90,
      ...config
    };
  }

  async createEvent(request: CreateEventRequest): Promise<JobEvent> {
    if (this.config.enableValidation) {
      this.validateCreateRequest(request);
    }

    const id = request.id || uuidv4();
    const now = new Date().toISOString();

    const event: Omit<JobEvent, 'id'> = {
      job_id: request.job_id,
      event_type: request.event_type,
      message: request.message,
      level: request.level || 'info',
      data: request.data || {},
      metadata: request.metadata || {},
      created_at: new Date(now)
    };

    const insert = this.db.prepare(`
      INSERT INTO job_events (
        id, job_id, event_type, message, level, data, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      insert.run(
        id,
        event.job_id,
        event.event_type,
        event.message,
        event.level,
        JSON.stringify(event.data),
        JSON.stringify(event.metadata),
        event.created_at.toISOString()
      );

      return await this.getEventById(id);
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create event: ${error.message}`,
        'CREATE_EVENT_FAILED',
        { request, originalError: error }
      );
    }
  }

  async getEventById(id: string): Promise<JobEvent> {
    const row = this.db.prepare('SELECT * FROM job_events WHERE id = ?').get(id) as any | undefined;

    if (!row) {
      throw new DatabaseError(`Event not found: ${id}`, 'EVENT_NOT_FOUND');
    }

    return this.mapRowToEvent(row);
  }

  async queryEvents(filter: EventFilter, limit: number = 50, cursor?: string): Promise<EventListResponse> {
    let sql = 'SELECT * FROM job_events WHERE 1=1';
    const params: any[] = [];

    // Apply filters
    if (filter.job_id) {
      sql += ' AND job_id = ?';
      params.push(filter.job_id);
    }

    if (filter.event_type?.length > 0) {
      sql += ` AND event_type IN (${filter.event_type.map(() => '?').join(', ')})`;
      params.push(...filter.event_type);
    }

    if (filter.level?.length > 0) {
      sql += ` AND level IN (${filter.level.map(() => '?').join(', ')})`;
      params.push(...filter.level);
    }

    if (filter.created_after) {
      sql += ' AND created_at >= ?';
      params.push(filter.created_after.toISOString());
    }

    if (filter.created_before) {
      sql += ' AND created_at <= ?';
      params.push(filter.created_before.toISOString());
    }

    if (filter.message_contains) {
      sql += ' AND message LIKE ?';
      params.push(`%${filter.message_contains}%`);
    }

    // Apply pagination
    let hasMore = false;
    sql += ' ORDER BY created_at DESC';

    if (cursor) {
      sql += ' AND created_at < ?';
      params.push(new Date(cursor).toISOString());
    }

    sql += ' LIMIT ?';
    params.push(limit + 1); // +1 to check if there are more results

    const rows = this.db.prepare(sql).all(...params) as any[];
    hasMore = rows.length > limit;
    const events = rows.slice(0, limit).map(row => this.mapRowToEvent(row));

    return {
      events,
      has_more: hasMore,
      next_cursor: hasMore ? events[events.length - 1].created_at.toISOString() : undefined
    };
  }

  async getEventsByJob(jobId: string, limit: number = 100): Promise<JobEvent[]> {
    const rows = this.db.prepare(`
      SELECT * FROM job_events
      WHERE job_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(jobId, limit) as any[];

    return rows.map(row => this.mapRowToEvent(row));
  }

  async getJobTimeline(jobId: string): Promise<Array<{
    timestamp: Date;
    event: string;
    message: string;
    level: string;
    data: any;
  }>> {
    const events = await this.getEventsByJob(jobId, 1000);

    return events.map(event => ({
      timestamp: event.created_at,
      event: event.event_type,
      message: event.message || '',
      level: event.level,
      data: event.data
    }));
  }

  async getRecentEvents(limit: number = 100, level?: string): Promise<JobEvent[]> {
    let sql = 'SELECT * FROM job_events';
    const params: any[] = [];

    if (level) {
      sql += ' WHERE level = ?';
      params.push(level);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.mapRowToEvent(row));
  }

  async getEventStats(jobId?: string, days: number = 30): Promise<{
    totalEvents: number;
    byType: Record<string, number>;
    byLevel: Record<string, number>;
    eventsByDay: Array<{ date: string; count: number }>;
    latestEvent?: JobEvent;
  }> {
    let sql = `
      SELECT
        COUNT(*) as total_events,
        event_type,
        level,
        DATE(created_at) as event_date,
        COUNT(*) as count,
        MAX(created_at) as latest_created_at
      FROM job_events
      WHERE created_at >= datetime('now', '-${days} days')
    `;
    const params: any[] = [];

    if (jobId) {
      sql += ' AND job_id = ?';
      params.push(jobId);
    }

    sql += ' GROUP BY event_type, level, DATE(created_at)';

    const rows = this.db.prepare(sql).all(...params) as any[];

    const result = {
      totalEvents: 0,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      eventsByDay: [] as Array<{ date: string; count: number }>,
      latestEvent: undefined as JobEvent | undefined
    };

    for (const row of rows) {
      result.totalEvents += row.count;
      result.byType[row.event_type] = (result.byType[row.event_type] || 0) + row.count;
      result.byLevel[row.level] = (result.byLevel[row.level] || 0) + row.count;

      // Find the latest event
      if (!result.latestEvent || row.latest_created_at > result.latestEvent.created_at.toISOString()) {
        result.latestEvent = await this.getEventById(
          this.db.prepare(`
            SELECT id FROM job_events
            WHERE created_at = ?
            ORDER BY id DESC
            LIMIT 1
          `).get(row.latest_created_at) as { id: string }
        );
      }
    }

    // Get events by day
    const daySql = `
      SELECT DATE(created_at) as event_date, COUNT(*) as count
      FROM job_events
      WHERE created_at >= datetime('now', '-${days} days')
    `;
    const dayParams: any[] = [];

    if (jobId) {
      daySql += ' AND job_id = ?';
      dayParams.push(jobId);
    }

    daySql += ' GROUP BY DATE(created_at) ORDER BY event_date DESC';

    const dayRows = this.db.prepare(daySql).all(...dayParams) as any[];
    result.eventsByDay = dayRows.map(row => ({
      date: row.event_date,
      count: row.count
    }));

    return result;
  }

  async searchEvents(query: string, limit: number = 50): Promise<JobEvent[]> {
    const searchQuery = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT * FROM job_events
      WHERE
        message LIKE ? OR
        json_extract(data, '$.error') LIKE ? OR
        json_extract(metadata, '$.details') LIKE ?
      ORDER BY
        CASE
          WHEN message LIKE ? THEN 1
          ELSE 2
        END,
        created_at DESC
      LIMIT ?
    `).all(searchQuery, searchQuery, searchQuery, searchQuery, limit) as any[];

    return rows.map(row => this.mapRowToEvent(row));
  }

  async createBatchEvents(requests: CreateEventRequest[]): Promise<JobEvent[]> {
    const events: JobEvent[] = [];

    for (const request of requests) {
      try {
        const event = await this.createEvent(request);
        events.push(event);
      } catch (error) {
        console.error(`Failed to create batch event:`, error);
        // Continue with other events
      }
    }

    return events;
  }

  async cleanupOldEvents(): Promise<number> {
    if (!this.config.enableCleanup) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const result = this.db.prepare(`
      DELETE FROM job_events
      WHERE created_at < ?
    `).run(cutoffDate.toISOString());

    console.log(`Cleaned up ${result.changes} old events`);
    return result.changes;
  }

  async deleteEventsByJob(jobId: string): Promise<number> {
    const result = this.db.prepare('DELETE FROM job_events WHERE job_id = ?').run(jobId);
    return result.changes;
  }

  async getErrorEvents(jobId?: string, days: number = 7): Promise<JobEvent[]> {
    let sql = `
      SELECT * FROM job_events
      WHERE level = 'error'
      AND created_at >= datetime('now', '-${days} days')
    `;
    const params: any[] = [];

    if (jobId) {
      sql += ' AND job_id = ?';
      params.push(jobId);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.mapRowToEvent(row));
  }

  async getWarningEvents(jobId?: string, days: number = 7): Promise<JobEvent[]> {
    let sql = `
      SELECT * FROM job_events
      WHERE level = 'warn'
      AND created_at >= datetime('now', '-${days} days')
    `;
    const params: any[] = [];

    if (jobId) {
      sql += ' AND job_id = ?';
      params.push(jobId);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.mapRowToEvent(row));
  }

  private validateCreateRequest(request: CreateEventRequest): void {
    if (!request.job_id) {
      throw new ValidationError('Job ID is required');
    }

    if (!request.event_type) {
      throw new ValidationError('Event type is required');
    }

    const validTypes = ['created', 'started', 'progress', 'completed', 'failed', 'cancelled', 'warning'];
    if (!validTypes.includes(request.event_type)) {
      throw new ValidationError(`Invalid event type: ${request.event_type}`);
    }

    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (request.level && !validLevels.includes(request.level)) {
      throw new ValidationError(`Invalid event level: ${request.level}`);
    }
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