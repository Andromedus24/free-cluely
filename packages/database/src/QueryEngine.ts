import Database from 'better-sqlite3';
import {
  Job,
  JobFilter,
  JobQuery,
  PaginatedResult,
  CursorInfo,
  JobSort,
  SortDirection,
  JobArtifact,
  JobEvent,
  QueryError
} from './types';
import { COLUMNS, TABLES } from './schema';

export class QueryEngine {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  // Job queries with cursor pagination
  async queryJobs(query: JobQuery): Promise<PaginatedResult<Job>> {
    try {
      const {
        filter = {},
        sort = 'created_at',
        direction = 'desc',
        pagination = {}
      } = query;

      const { limit = 50, cursor } = pagination;

      // Build WHERE clause
      const { whereClause, params } = this.buildJobFilter(filter);

      // Build ORDER BY clause
      const orderByClause = this.buildOrderBy(sort, direction);

      // Build cursor conditions
      const cursorClause = cursor ? this.buildCursorCondition(cursor, sort, direction) : '';

      // Combine clauses
      const fullWhereClause = [whereClause, cursorClause].filter(c => c).join(' AND ');

      // Count total query
      const totalCount = this.getTotalJobCount(whereClause, params);

      // Query data
      const dataQuery = `
        SELECT
          j.*,
          s.name as session_name,
          COUNT(a.id) as artifact_count
        FROM ${TABLES.JOBS} j
        LEFT JOIN ${TABLES.SESSIONS} s ON j.${COLUMNS.JOBS.SESSION_ID} = s.id
        LEFT JOIN ${TABLES.JOB_ARTIFACTS} a ON j.id = a.${COLUMNS.JOB_ARTIFACTS.JOB_ID}
        ${fullWhereClause ? `WHERE ${fullWhereClause}` : ''}
        GROUP BY j.id
        ${orderByClause}
        LIMIT ?
      `;

      const queryParams = [...params, limit + 1]; // +1 to check if there are more results

      const jobs = this.db.prepare(dataQuery).all(...queryParams) as (Job & { session_name?: string; artifact_count?: number })[];

      // Process results and pagination info
      const result = this.processPaginatedResults(jobs, limit, sort, direction);

      return {
        ...result,
        total: totalCount
      };
    } catch (error) {
      throw new QueryError('Failed to query jobs', undefined, [query], error as Error);
    }
  }

  private buildJobFilter(filter: JobFilter): { whereClause: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    if (filter.status) {
      clauses.push(`j.${COLUMNS.JOBS.STATUS} = ?`);
      params.push(filter.status);
    }

    if (filter.type) {
      clauses.push(`j.${COLUMNS.JOBS.TYPE} = ?`);
      params.push(filter.type);
    }

    if (filter.provider) {
      clauses.push(`j.${COLUMNS.JOBS.PROVIDER} = ?`);
      params.push(filter.provider);
    }

    if (filter.model) {
      clauses.push(`j.${COLUMNS.JOBS.MODEL} = ?`);
      params.push(filter.model);
    }

    if (filter.sessionId) {
      clauses.push(`j.${COLUMNS.JOBS.SESSION_ID} = ?`);
      params.push(filter.sessionId);
    }

    if (filter.createdAfter) {
      clauses.push(`j.${COLUMNS.JOBS.CREATED_AT} >= ?`);
      params.push(filter.createdAfter);
    }

    if (filter.createdBefore) {
      clauses.push(`j.${COLUMNS.JOBS.CREATED_AT} <= ?`);
      params.push(filter.createdBefore);
    }

    if (filter.completedAfter) {
      clauses.push(`j.${COLUMNS.JOBS.COMPLETED_AT} >= ?`);
      params.push(filter.completedAfter);
    }

    if (filter.completedBefore) {
      clauses.push(`j.${COLUMNS.JOBS.COMPLETED_AT} <= ?`);
      params.push(filter.completedBefore);
    }

    if (filter.minDuration !== undefined) {
      clauses.push(`j.${COLUMNS.JOBS.DURATION_MS} >= ?`);
      params.push(filter.minDuration);
    }

    if (filter.maxDuration !== undefined) {
      clauses.push(`j.${COLUMNS.JOBS.DURATION_MS} <= ?`);
      params.push(filter.maxDuration);
    }

    if (filter.minCost !== undefined) {
      clauses.push(`j.${COLUMNS.JOBS.COST_USD} >= ?`);
      params.push(filter.minCost);
    }

    if (filter.maxCost !== undefined) {
      clauses.push(`j.${COLUMNS.JOBS.COST_USD} <= ?`);
      params.push(filter.maxCost);
    }

    if (filter.tags && filter.tags.length > 0) {
      // Search in JSON tags array
      const tagConditions = filter.tags.map(tag => `json_extract(j.${COLUMNS.JOBS.TAGS}, '$[*]') LIKE ?`);
      clauses.push(`(${tagConditions.join(' OR ')})`);
      filter.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    if (filter.search) {
      // Text search on title and description
      clauses.push(`(
        j.${COLUMNS.JOBS.TITLE} LIKE ? OR
        j.${COLUMNS.JOBS.DESCRIPTION} LIKE ? OR
        (SELECT COUNT(*) FROM jobs_fts WHERE jobs_fts.rowid = j.id AND jobs_fts MATCH ?) > 0
      )`);
      const searchTerm = `%${filter.search}%`;
      params.push(searchTerm, searchTerm, filter.search);
    }

    return {
      whereClause: clauses.join(' AND '),
      params
    };
  }

  private buildOrderBy(sort: JobSort, direction: SortDirection): string {
    const columnMap: Record<JobSort, string> = {
      created_at: `j.${COLUMNS.JOBS.CREATED_AT}`,
      updated_at: `j.${COLUMNS.JOBS.UPDATED_AT}`,
      duration_ms: `j.${COLUMNS.JOBS.DURATION_MS}`,
      cost_usd: `j.${COLUMNS.JOBS.COST_USD}`,
      priority: `j.${COLUMNS.JOBS.PRIORITY}`,
      tokens_used: `j.${COLUMNS.JOBS.TOKENS_USED}`
    };

    const column = columnMap[sort] || `j.${COLUMNS.JOBS.CREATED_AT}`;
    const dir = direction.toUpperCase();

    return `ORDER BY ${column} ${dir}, j.id ${dir}`;
  }

  private buildCursorCondition(cursor: string, sort: JobSort, direction: SortDirection): string {
    try {
      const cursorInfo: CursorInfo = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
      const columnMap: Record<JobSort, string> = {
        created_at: COLUMNS.JOBS.CREATED_AT,
        updated_at: COLUMNS.JOBS.UPDATED_AT,
        duration_ms: COLUMNS.JOBS.DURATION_MS,
        cost_usd: COLUMNS.JOBS.COST_USD,
        priority: COLUMNS.JOBS.PRIORITY,
        tokens_used: COLUMNS.JOBS.TOKENS_USED
      };

      const column = columnMap[sort] || COLUMNS.JOBS.CREATED_AT;
      const operator = direction === 'desc' ? '<' : '>';

      return `(j.${column} ${operator} ? OR (j.${column} = ? AND j.id ${operator} ?))`;
    } catch (error) {
      throw new QueryError('Invalid cursor format', undefined, undefined, error as Error);
    }
  }

  private processPaginatedResults(
    items: any[],
    limit: number,
    sort: JobSort,
    direction: SortDirection
  ): {
    items: Job[];
    hasNext: boolean;
    hasPrevious: boolean;
    nextCursor?: string;
    previousCursor?: string;
    cursor?: CursorInfo;
  } {
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    const result = {
      items: pageItems,
      hasNext: hasMore,
      hasPrevious: false,
      nextCursor: undefined as string | undefined,
      previousCursor: undefined as string | undefined,
      cursor: undefined as CursorInfo | undefined
    };

    if (pageItems.length > 0) {
      // Create cursors
      const firstItem = pageItems[0];
      const lastItem = pageItems[pageItems.length - 1];

      const columnMap: Record<JobSort, string> = {
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        duration_ms: 'durationMs',
        cost_usd: 'costUsd',
        priority: 'priority',
        tokens_used: 'tokensUsed'
      };

      const sortField = columnMap[sort] || 'createdAt';

      result.cursor = {
        id: lastItem.id,
        createdAt: lastItem.createdAt,
        value: lastItem[sortField]
      };

      // Next cursor
      if (hasMore) {
        const nextCursor: CursorInfo = {
          id: lastItem.id,
          createdAt: lastItem.createdAt,
          value: lastItem[sortField]
        };
        result.nextCursor = Buffer.from(JSON.stringify(nextCursor)).toString('base64');
      }

      // Previous cursor (for backward pagination)
      if (firstItem.id !== 1) { // Simple check for first item
        const previousCursor: CursorInfo = {
          id: firstItem.id,
          createdAt: firstItem.createdAt,
          value: firstItem[sortField]
        };
        result.previousCursor = Buffer.from(JSON.stringify(previousCursor)).toString('base64');
        result.hasPrevious = true;
      }
    }

    return result;
  }

  private getTotalJobCount(whereClause: string, params: any[]): number {
    const countQuery = `
      SELECT COUNT(*) as count
      FROM ${TABLES.JOBS} j
      ${whereClause ? `WHERE ${whereClause}` : ''}
    `;

    const result = this.db.prepare(countQuery).get(...params) as { count: number };
    return result.count;
  }

  // Artifact queries
  async queryJobArtifacts(
    jobId: number,
    filter?: {
      type?: string;
      createdAfter?: number;
      createdBefore?: number;
    },
    pagination: { limit?: number; cursor?: string } = {}
  ): Promise<PaginatedResult<JobArtifact>> {
    try {
      const { limit = 50, cursor } = pagination;
      const clauses: string[] = [];
      const params: any[] = [jobId];

      clauses.push(`${COLUMNS.JOB_ARTIFACTS.JOB_ID} = ?`);

      if (filter?.type) {
        clauses.push(`${COLUMNS.JOB_ARTIFACTS.TYPE} = ?`);
        params.push(filter.type);
      }

      if (filter?.createdAfter) {
        clauses.push(`${COLUMNS.JOB_ARTIFACTS.CREATED_AT} >= ?`);
        params.push(filter.createdAfter);
      }

      if (filter?.createdBefore) {
        clauses.push(`${COLUMNS.JOB_ARTIFACTS.CREATED_AT} <= ?`);
        params.push(filter.createdBefore);
      }

      const whereClause = clauses.join(' AND ');

      // Count total
      const totalCount = this.db
        .prepare(`SELECT COUNT(*) as count FROM ${TABLES.JOB_ARTIFACTS} WHERE ${whereClause}`)
        .get(...params) as { count: number };

      // Query data
      let query = `
        SELECT * FROM ${TABLES.JOB_ARTIFACTS}
        WHERE ${whereClause}
        ORDER BY ${COLUMNS.JOB_ARTIFACTS.CREATED_AT} DESC
      `;

      if (cursor) {
        query += ` AND ${COLUMNS.JOB_ARTIFACTS.CREATED_AT} < ?`;
        params.push(parseInt(cursor));
      }

      query += ` LIMIT ?`;
      params.push(limit + 1);

      const artifacts = this.db.prepare(query).all(...params) as JobArtifact[];

      const hasMore = artifacts.length > limit;
      const pageArtifacts = hasMore ? artifacts.slice(0, limit) : artifacts;

      const result: PaginatedResult<JobArtifact> = {
        items: pageArtifacts,
        total: totalCount.count,
        hasNext: hasMore,
        hasPrevious: cursor !== undefined,
        nextCursor: hasMore && pageArtifacts.length > 0 ? pageArtifacts[pageArtifacts.length - 1].createdAt.toString() : undefined
      };

      return result;
    } catch (error) {
      throw new QueryError('Failed to query job artifacts', undefined, undefined, error as Error);
    }
  }

  // Event queries (timeline)
  async queryJobEvents(
    jobId: number,
    filter?: {
      eventType?: string;
      level?: string;
      after?: number;
      before?: number;
    },
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ events: JobEvent[]; total: number }> {
    try {
      const { limit = 100, offset = 0 } = pagination;
      const clauses: string[] = [];
      const params: any[] = [jobId];

      clauses.push(`${COLUMNS.JOB_EVENTS.JOB_ID} = ?`);

      if (filter?.eventType) {
        clauses.push(`${COLUMNS.JOB_EVENTS.EVENT_TYPE} = ?`);
        params.push(filter.eventType);
      }

      if (filter?.level) {
        clauses.push(`${COLUMNS.JOB_EVENTS.LEVEL} = ?`);
        params.push(filter.level);
      }

      if (filter?.after) {
        clauses.push(`${COLUMNS.JOB_EVENTS.TIMESTAMP} >= ?`);
        params.push(filter.after);
      }

      if (filter?.before) {
        clauses.push(`${COLUMNS.JOB_EVENTS.TIMESTAMP} <= ?`);
        params.push(filter.before);
      }

      const whereClause = clauses.join(' AND ');

      // Count total
      const totalCount = this.db
        .prepare(`SELECT COUNT(*) as count FROM ${TABLES.JOB_EVENTS} WHERE ${whereClause}`)
        .get(...params) as { count: number };

      // Query events
      const query = `
        SELECT * FROM ${TABLES.JOB_EVENTS}
        WHERE ${whereClause}
        ORDER BY ${COLUMNS.JOB_EVENTS.SEQUENCE} ASC
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const events = this.db.prepare(query).all(...params) as JobEvent[];

      return {
        events,
        total: totalCount.count
      };
    } catch (error) {
      throw new QueryError('Failed to query job events', undefined, undefined, error as Error);
    }
  }

  // Advanced search
  async searchJobs(
    searchTerm: string,
    options: {
      fields?: ('title' | 'description' | 'request' | 'response')[];
      limit?: number;
      offset?: number;
      includeContent?: boolean;
    } = {}
  ): Promise<{ jobs: Job[]; total: number; highlights?: { [jobId: string]: string[] } }> {
    try {
      const {
        fields = ['title', 'description'],
        limit = 50,
        offset = 0,
        includeContent = false
      } = options;

      const searchFields = fields.join(', ');
      const selectFields = includeContent ? '*' : 'id, uuid, title, type, status, provider, model, created_at, completed_at, duration_ms, cost_usd';

      // Full-text search using FTS
      const searchQuery = `
        SELECT ${selectFields}, snippet(jobs_fts, 2, '<mark>', '</mark>', '...', 64) as highlight
        FROM jobs_fts
        JOIN ${TABLES.JOBS} j ON jobs_fts.rowid = j.id
        WHERE jobs_fts MATCH ?
        ORDER BY rank
        LIMIT ? OFFSET ?
      `;

      const jobs = this.db.prepare(searchQuery).all(searchTerm, limit, offset) as (Job & { highlight?: string })[];

      // Get total count
      const totalCount = this.db
        .prepare('SELECT COUNT(*) as count FROM jobs_fts WHERE jobs_fts MATCH ?')
        .get(searchTerm) as { count: number };

      // Process highlights
      const highlights: { [jobId: string]: string[] } = {};
      if (includeContent) {
        jobs.forEach(job => {
          if (job.highlight) {
            highlights[job.id] = [job.highlight];
          }
        });
      }

      return {
        jobs: jobs.map(job => {
          const { highlight, ...jobData } = job;
          return jobData as Job;
        }),
        total: totalCount.count,
        highlights: Object.keys(highlights).length > 0 ? highlights : undefined
      };
    } catch (error) {
      throw new QueryError('Failed to search jobs', undefined, undefined, error as Error);
    }
  }

  // Statistics queries
  async getJobStats(filter?: JobFilter): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageDuration: number;
    totalCost: number;
    averageCost: number;
    totalTokens: number;
    averageTokens: number;
    byStatus: { [status: string]: number };
    byType: { [type: string]: number };
    byProvider: { [provider: string]: number };
    byDay: Array<{ date: string; count: number; cost: number }>;
  }> {
    try {
      const { whereClause, params } = filter ? this.buildJobFilter(filter) : { whereClause: '', params: [] };

      // Basic stats
      const statsQuery = `
        SELECT
          COUNT(*) as total_jobs,
          SUM(CASE WHEN ${COLUMNS.JOBS.STATUS} = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
          SUM(CASE WHEN ${COLUMNS.JOBS.STATUS} = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
          AVG(${COLUMNS.JOBS.DURATION_MS}) as average_duration,
          SUM(${COLUMNS.JOBS.COST_USD}) as total_cost,
          AVG(${COLUMNS.JOBS.COST_USD}) as average_cost,
          SUM(${COLUMNS.JOBS.TOKENS_USED}) as total_tokens,
          AVG(${COLUMNS.JOBS.TOKENS_USED}) as average_tokens
        FROM ${TABLES.JOBS} j
        ${whereClause ? `WHERE ${whereClause}` : ''}
      `;

      const stats = this.db.prepare(statsQuery).get(...params) as any;

      // Group by status
      const byStatusQuery = `
        SELECT ${COLUMNS.JOBS.STATUS}, COUNT(*) as count
        FROM ${TABLES.JOBS} j
        ${whereClause ? `WHERE ${whereClause}` : ''}
        GROUP BY ${COLUMNS.JOBS.STATUS}
      `;

      const byStatus = this.db.prepare(byStatusQuery).all(...params).reduce((acc, row: any) => {
        acc[row.status] = row.count;
        return acc;
      }, {} as { [status: string]: number });

      // Group by type
      const byTypeQuery = `
        SELECT ${COLUMNS.JOBS.TYPE}, COUNT(*) as count
        FROM ${TABLES.JOBS} j
        ${whereClause ? `WHERE ${whereClause}` : ''}
        GROUP BY ${COLUMNS.JOBS.TYPE}
      `;

      const byType = this.db.prepare(byTypeQuery).all(...params).reduce((acc, row: any) => {
        acc[row.type] = row.count;
        return acc;
      }, {} as { [type: string]: number });

      // Group by provider
      const byProviderQuery = `
        SELECT ${COLUMNS.JOBS.PROVIDER}, COUNT(*) as count
        FROM ${TABLES.JOBS} j
        ${whereClause ? `WHERE ${whereClause}` : ''}
        GROUP BY ${COLUMNS.JOBS.PROVIDER}
      `;

      const byProvider = this.db.prepare(byProviderQuery).all(...params).reduce((acc, row: any) => {
        acc[row.provider] = row.count;
        return acc;
      }, {} as { [provider: string]: number });

      // Daily breakdown
      const byDayQuery = `
        SELECT
          DATE(${COLUMNS.JOBS.CREATED_AT}, 'unixepoch') as date,
          COUNT(*) as count,
          SUM(${COLUMNS.JOBS.COST_USD}) as cost
        FROM ${TABLES.JOBS} j
        ${whereClause ? `WHERE ${whereClause}` : ''}
        GROUP BY DATE(${COLUMNS.JOBS.CREATED_AT}, 'unixepoch')
        ORDER BY date DESC
        LIMIT 30
      `;

      const byDay = this.db.prepare(byDayQuery).all(...params) as Array<{ date: string; count: number; cost: number }>;

      return {
        totalJobs: stats.total_jobs || 0,
        completedJobs: stats.completed_jobs || 0,
        failedJobs: stats.failed_jobs || 0,
        averageDuration: Math.round(stats.average_duration || 0),
        totalCost: stats.total_cost || 0,
        averageCost: stats.average_cost || 0,
        totalTokens: stats.total_tokens || 0,
        averageTokens: Math.round(stats.average_tokens || 0),
        byStatus,
        byType,
        byProvider,
        byDay
      };
    } catch (error) {
      throw new QueryError('Failed to get job statistics', undefined, undefined, error as Error);
    }
  }

  // Performance monitoring queries
  async getPerformanceMetrics(timeRange: { start: number; end: number }): Promise<{
    queryPerformance: Array<{ query: string; avgTime: number; maxTime: number; count: number }>;
    slowQueries: Array<{ query: string; time: number; timestamp: number }>;
    databaseStats: any;
  }> {
    try {
      // This would typically require additional monitoring tables
      // For now, we'll return basic database stats

      const dbStats = this.db.pragma('cache_size') as number;

      return {
        queryPerformance: [],
        slowQueries: [],
        databaseStats: {
          cacheSize: dbStats,
          pageSize: this.db.pragma('page_size'),
          pageCount: this.db.pragma('page_count')
        }
      };
    } catch (error) {
      throw new QueryError('Failed to get performance metrics', undefined, undefined, error as Error);
    }
  }
}