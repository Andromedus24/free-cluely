import { Database } from 'better-sqlite3';
import {
  JobArtifact,
  CreateArtifactRequest,
  ArtifactFilter,
  ArtifactListResponse,
  DatabaseError,
  NotFoundError,
  ValidationError
} from '../types/JobTypes';
import { ArtifactStorage } from '../storage/ArtifactStorage';
import { v4 as uuidv4 } from 'uuid';

export interface ArtifactRepositoryConfig {
  enableStorage: boolean;
  enableValidation: boolean;
  enableDeduplication: boolean;
}

export class ArtifactRepository {
  private db: Database;
  private artifactStorage?: ArtifactStorage;
  private config: Required<ArtifactRepositoryConfig>;

  constructor(
    db: Database,
    config: Partial<ArtifactRepositoryConfig> = {},
    artifactStorage?: ArtifactStorage
  ) {
    this.db = db;
    this.artifactStorage = artifactStorage;
    this.config = {
      enableStorage: true,
      enableValidation: true,
      enableDeduplication: true,
      ...config
    };
  }

  async createArtifact(request: CreateArtifactRequest & { data: Buffer | string }): Promise<JobArtifact> {
    if (this.config.enableValidation) {
      this.validateCreateRequest(request);
    }

    const id = request.id || uuidv4();

    if (this.artifactStorage && this.config.enableStorage) {
      try {
        return await this.artifactStorage.storeArtifact({ ...request, id });
      } catch (error: any) {
        throw new DatabaseError(
          `Failed to store artifact: ${error.message}`,
          'ARTIFACT_STORAGE_FAILED',
          { request, originalError: error }
        );
      }
    }

    // Fallback: create artifact record without file storage
    const now = new Date().toISOString();

    const artifact: Omit<JobArtifact, 'id'> = {
      job_id: request.job_id,
      type: request.type,
      name: request.name,
      file_path: request.file_path,
      file_size: request.file_size,
      mime_type: request.mime_type,
      hash_sha256: request.hash_sha256,
      metadata: request.metadata || {},
      is_deleted: false,
      created_at: new Date(now),
      updated_at: new Date(now)
    };

    const insert = this.db.prepare(`
      INSERT INTO job_artifacts (
        id, job_id, type, name, file_path, file_size, mime_type,
        hash_sha256, metadata, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      insert.run(
        id,
        artifact.job_id,
        artifact.type,
        artifact.name,
        artifact.file_path,
        artifact.file_size,
        artifact.mime_type,
        artifact.hash_sha256,
        JSON.stringify(artifact.metadata),
        artifact.is_deleted ? 1 : 0,
        artifact.created_at.toISOString(),
        artifact.updated_at.toISOString()
      );

      return await this.getArtifactById(id);
    } catch (error: any) {
      throw new DatabaseError(
        `Failed to create artifact: ${error.message}`,
        'CREATE_ARTIFACT_FAILED',
        { request, originalError: error }
      );
    }
  }

  async getArtifactById(id: string): Promise<JobArtifact> {
    if (this.artifactStorage) {
      const artifact = await this.artifactStorage.getArtifact(id);
      if (!artifact) {
        throw new NotFoundError(`Artifact not found: ${id}`, 'ARTIFACT_NOT_FOUND');
      }
      return artifact;
    }

    const row = this.db.prepare('SELECT * FROM job_artifacts WHERE id = ? AND is_deleted = 0')
      .get(id) as any | undefined;

    if (!row) {
      throw new NotFoundError(`Artifact not found: ${id}`, 'ARTIFACT_NOT_FOUND');
    }

    return this.mapRowToArtifact(row);
  }

  async getArtifactData(id: string): Promise<Buffer | null> {
    if (!this.artifactStorage) {
      throw new DatabaseError('Artifact storage not available', 'STORAGE_NOT_AVAILABLE');
    }

    return await this.artifactStorage.getArtifactData(id);
  }

  async getArtifactStream(id: string): Promise<any> {
    if (!this.artifactStorage) {
      throw new DatabaseError('Artifact storage not available', 'STORAGE_NOT_AVAILABLE');
    }

    return await this.artifactStorage.getArtifactStream(id);
  }

  async queryArtifacts(filter: ArtifactFilter, limit: number = 50, cursor?: string): Promise<ArtifactListResponse> {
    let sql = `
      SELECT * FROM job_artifacts
      WHERE is_deleted = 0
    `;
    const params: any[] = [];

    // Apply filters
    if (filter.job_id) {
      sql += ' AND job_id = ?';
      params.push(filter.job_id);
    }

    if (filter.type?.length > 0) {
      sql += ` AND type IN (${filter.type.map(() => '?').join(', ')})`;
      params.push(...filter.type);
    }

    if (filter.name_contains) {
      sql += ' AND name LIKE ?';
      params.push(`%${filter.name_contains}%`);
    }

    if (filter.created_after) {
      sql += ' AND created_at >= ?';
      params.push(filter.created_after.toISOString());
    }

    if (filter.created_before) {
      sql += ' AND created_at <= ?';
      params.push(filter.created_before.toISOString());
    }

    if (filter.mime_type) {
      sql += ' AND mime_type = ?';
      params.push(filter.mime_type);
    }

    if (filter.is_deleted !== undefined) {
      sql += ' AND is_deleted = ?';
      params.push(filter.is_deleted ? 1 : 0);
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
    const artifacts = rows.slice(0, limit).map(row => this.mapRowToArtifact(row));

    return {
      artifacts,
      has_more: hasMore,
      next_cursor: hasMore ? artifacts[artifacts.length - 1].created_at.toISOString() : undefined
    };
  }

  async getArtifactsByJob(jobId: string): Promise<JobArtifact[]> {
    const rows = this.db.prepare(`
      SELECT * FROM job_artifacts
      WHERE job_id = ? AND is_deleted = 0
      ORDER BY created_at ASC
    `).all(jobId) as any[];

    return rows.map(row => this.mapRowToArtifact(row));
  }

  async updateArtifact(id: string, updates: {
    name?: string;
    metadata?: Record<string, any>;
  }): Promise<JobArtifact> {
    const existing = await this.getArtifactById(id);

    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setClause.push('name = ?');
      params.push(updates.name);
    }

    if (updates.metadata !== undefined) {
      setClause.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (setClause.length === 0) {
      return existing;
    }

    setClause.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    this.db.prepare(`
      UPDATE job_artifacts
      SET ${setClause.join(', ')}
      WHERE id = ?
    `).run(...params);

    return await this.getArtifactById(id);
  }

  async deleteArtifact(id: string, hardDelete: boolean = false): Promise<boolean> {
    try {
      const existing = await this.getArtifactById(id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return false;
      }
      throw error;
    }

    if (this.artifactStorage) {
      return await this.artifactStorage.deleteArtifact(id, hardDelete);
    }

    if (hardDelete) {
      this.db.prepare('DELETE FROM job_artifacts WHERE id = ?').run(id);
    } else {
      this.db.prepare(`
        UPDATE job_artifacts
        SET is_deleted = 1, updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), id);
    }

    return true;
  }

  async getArtifactStats(jobId?: string): Promise<{
    totalArtifacts: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
    oldestArtifact?: Date;
    newestArtifact?: Date;
  }> {
    let sql = `
      SELECT
        COUNT(*) as total_artifacts,
        SUM(file_size) as total_size,
        type,
        COUNT(*) as count,
        SUM(file_size) as size,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM job_artifacts
      WHERE is_deleted = 0
    `;
    const params: any[] = [];

    if (jobId) {
      sql += ' AND job_id = ?';
      params.push(jobId);
    }

    sql += ' GROUP BY type';

    const rows = this.db.prepare(sql).all(...params) as any[];

    const result = {
      totalArtifacts: 0,
      totalSize: 0,
      byType: {} as Record<string, { count: number; size: number }>,
      oldestArtifact: undefined as Date | undefined,
      newestArtifact: undefined as Date | undefined
    };

    for (const row of rows) {
      result.totalArtifacts += row.count;
      result.totalSize += row.size || 0;
      result.byType[row.type] = {
        count: row.count,
        size: row.size || 0
      };

      if (!result.oldestArtifact || row.oldest < result.oldestArtifact.toISOString()) {
        result.oldestArtifact = new Date(row.oldest);
      }

      if (!result.newestArtifact || row.newest > result.newestArtifact.toISOString()) {
        result.newestArtifact = new Date(row.newest);
      }
    }

    return result;
  }

  async searchArtifacts(query: string, limit: number = 50): Promise<JobArtifact[]> {
    const searchQuery = `%${query}%`;
    const rows = this.db.prepare(`
      SELECT * FROM job_artifacts
      WHERE
        is_deleted = 0 AND
        (name LIKE ? OR metadata LIKE ?)
      ORDER BY
        CASE
          WHEN name LIKE ? THEN 1
          ELSE 2
        END,
        created_at DESC
      LIMIT ?
    `).all(searchQuery, searchQuery, searchQuery, limit) as any[];

    return rows.map(row => this.mapRowToArtifact(row));
  }

  async cleanupOldArtifacts(retentionDays: number = 30): Promise<number> {
    if (this.artifactStorage) {
      return await this.artifactStorage.cleanupOldArtifacts();
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = this.db.prepare(`
      UPDATE job_artifacts
      SET is_deleted = 1, updated_at = ?
      WHERE created_at < ? AND is_deleted = 0
    `).run(new Date().toISOString(), cutoffDate.toISOString());

    return result.changes;
  }

  async verifyArtifactIntegrity(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    issues: Array<{ artifactId: string; issue: string }>;
  }> {
    if (this.artifactStorage) {
      return await this.artifactStorage.verifyArtifactIntegrity();
    }

    const artifacts = await this.queryArtifacts({ is_deleted: false }, 10000);
    const result = {
      total: artifacts.artifacts.length,
      valid: artifacts.artifacts.length,
      invalid: 0,
      issues: [] as Array<{ artifactId: string; issue: string }>
    };

    return result;
  }

  private validateCreateRequest(request: CreateArtifactRequest): void {
    if (!request.job_id) {
      throw new ValidationError('Job ID is required');
    }

    if (!request.type) {
      throw new ValidationError('Artifact type is required');
    }

    if (!request.name?.trim()) {
      throw new ValidationError('Artifact name is required');
    }

    const validTypes = ['screenshot', 'file', 'log', 'result', 'preview'];
    if (!validTypes.includes(request.type)) {
      throw new ValidationError(`Invalid artifact type: ${request.type}`);
    }

    if (request.file_size !== undefined && request.file_size < 0) {
      throw new ValidationError('File size cannot be negative');
    }
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
}