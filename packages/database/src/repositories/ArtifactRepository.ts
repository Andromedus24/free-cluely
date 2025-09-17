import Database from 'better-sqlite3';
import {
  JobArtifact,
  CreateJobArtifact,
  PaginatedResult,
  DatabaseError,
  NotFoundError
} from '../types';
import { TABLES, COLUMNS } from '../schema';
import { ArtifactStorage } from '../ArtifactStorage';
import { randomUUID } from 'crypto';

export class ArtifactRepository {
  private db: Database.Database;
  private storage: ArtifactStorage;

  constructor(db: Database.Database, storage: ArtifactStorage) {
    this.db = db;
    this.storage = storage;
    this.prepareStatements();
  }

  private prepareStatements(): void {
    const statements = [
      `SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.ID} = ?`,
      `SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.UUID} = ?`,
      `SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.JOB_ID} = ?`,
      `UPDATE ${TABLES.JOB_ARTIFACTS} SET ${COLUMNS.JOB_ARTIFACTS.NAME} = ?, ${COLUMNS.JOB_ARTIFACTS.DESCRIPTION} = ?, ${COLUMNS.JOB_ARTIFACTS.METADATA} = ?, ${COLUMNS.JOB_ARTIFACTS.EXPIRES_AT} = ?, ${COLUMNS.JOB_ARTIFACTS.UPDATED_AT} = ? WHERE ${COLUMNS.JOB_ARTIFACTS.ID} = ?`,
      `DELETE FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.ID} = ?`,
      `SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.HASH_SHA256} = ?`
    ];

    statements.forEach(statement => {
      try {
        this.db.prepare(statement);
      } catch (error) {
        console.warn(`Failed to prepare statement: ${statement}`, error);
      }
    });
  }

  async createArtifact(data: CreateJobArtifact & { fileData: Buffer }): Promise<JobArtifact> {
    try {
      const metadata = {
        jobId: data.jobId,
        type: data.type,
        name: data.name,
        description: data.description,
        mimeType: data.mimeType,
        expiresAt: data.expiresAt,
        metadata: data.metadata
      };

      const artifact = await this.storage.storeArtifact(data.fileData, metadata);
      return artifact;
    } catch (error) {
      throw new DatabaseError('Failed to create artifact', error as Error);
    }
  }

  async findById(id: number): Promise<JobArtifact | null> {
    try {
      return await this.storage.getArtifactById(id);
    } catch (error) {
      throw new DatabaseError('Failed to find artifact by ID', error as Error);
    }
  }

  async findByUUID(uuid: string): Promise<JobArtifact | null> {
    try {
      return await this.storage.getArtifactByUUID(uuid);
    } catch (error) {
      throw new DatabaseError('Failed to find artifact by UUID', error as Error);
    }
  }

  async findByJobId(jobId: number): Promise<JobArtifact[]> {
    try {
      return await this.storage.getJobArtifacts(jobId);
    } catch (error) {
      throw new DatabaseError('Failed to find artifacts by job ID', error as Error);
    }
  }

  async findByHash(hash: string): Promise<JobArtifact | null> {
    try {
      const artifact = this.db
        .prepare(`SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.HASH_SHA256} = ?`)
        .get(hash) as JobArtifact | null;

      if (artifact) {
        // Update access time
        this.db
          .prepare(`UPDATE ${TABLES.JOB_ARTIFACTS} SET ${COLUMNS.JOB_ARTIFACTS.ACCESSED_AT} = ? WHERE ${COLUMNS.JOB_ARTIFACTS.ID} = ?`)
          .run(Math.floor(Date.now() / 1000), artifact.id);
      }

      return artifact;
    } catch (error) {
      throw new DatabaseError('Failed to find artifact by hash', error as Error);
    }
  }

  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      metadata?: Record<string, unknown>;
      expiresAt?: number;
    }
  ): Promise<JobArtifact> {
    try {
      const existingArtifact = await this.findById(id);
      if (!existingArtifact) {
        throw new NotFoundError(`Artifact with ID ${id} not found`);
      }

      const stmt = this.db.prepare(`
        UPDATE ${TABLES.JOB_ARTIFACTS} SET
          ${COLUMNS.JOB_ARTIFACTS.NAME} = ?,
          ${COLUMNS.JOB_ARTIFACTS.DESCRIPTION} = ?,
          ${COLUMNS.JOB_ARTIFACTS.METADATA} = ?,
          ${COLUMNS.JOB_ARTIFACTS.EXPIRES_AT} = ?,
          ${COLUMNS.JOB_ARTIFACTS.UPDATED_AT} = ?
        WHERE ${COLUMNS.JOB_ARTIFACTS.ID} = ?
      `);

      // Parse existing metadata and merge
      const existingMetadata = existingArtifact.metadata ? JSON.parse(existingArtifact.metadata) : {};
      const updatedMetadata = { ...existingMetadata, ...(data.metadata || {}) };

      stmt.run(
        data.name ?? existingArtifact.name,
        data.description ?? existingArtifact.description,
        JSON.stringify(updatedMetadata),
        data.expiresAt ?? existingArtifact.expiresAt,
        Math.floor(Date.now() / 1000),
        id
      );

      const updatedArtifact = await this.findById(id);
      if (!updatedArtifact) {
        throw new DatabaseError('Failed to update artifact: artifact not found after update');
      }

      return updatedArtifact;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update artifact', error as Error);
    }
  }

  async delete(id: number): Promise<boolean> {
    try {
      return await this.storage.deleteArtifact(id);
    } catch (error) {
      throw new DatabaseError('Failed to delete artifact', error as Error);
    }
  }

  async getArtifactData(artifact: JobArtifact): Promise<Buffer> {
    try {
      return await this.storage.getArtifactData(artifact);
    } catch (error) {
      throw new DatabaseError('Failed to get artifact data', error as Error);
    }
  }

  async getArtifactPreview(artifact: JobArtifact): Promise<Buffer | null> {
    try {
      return await this.storage.getArtifactPreview(artifact);
    } catch (error) {
      throw new DatabaseError('Failed to get artifact preview', error as Error);
    }
  }

  async findByType(type: string, limit: number = 50): Promise<JobArtifact[]> {
    try {
      return await this.storage.getArtifactsByType(type as any, limit);
    } catch (error) {
      throw new DatabaseError('Failed to find artifacts by type', error as Error);
    }
  }

  async setExpiration(id: number, expiresAt: number): Promise<boolean> {
    try {
      return await this.storage.setArtifactExpiration(id, expiresAt);
    } catch (error) {
      throw new DatabaseError('Failed to set artifact expiration', error as Error);
    }
  }

  async getStorageStats() {
    try {
      return await this.storage.getStorageStats();
    } catch (error) {
      throw new DatabaseError('Failed to get storage stats', error as Error);
    }
  }

  async findByJobIdWithCursor(
    jobId: number,
    options: {
      limit?: number;
      cursor?: string;
      type?: string;
      createdAfter?: number;
      createdBefore?: number;
    } = {}
  ): Promise<PaginatedResult<JobArtifact>> {
    try {
      const filter: any = {};
      if (options.type) filter.type = options.type;
      if (options.createdAfter) filter.createdAfter = options.createdAfter;
      if (options.createdBefore) filter.createdBefore = options.createdBefore;

      const pagination = {
        limit: options.limit || 50,
        cursor: options.cursor
      };

      return await this.storage['queryJobArtifacts'](jobId, filter, pagination);
    } catch (error) {
      throw new DatabaseError('Failed to query job artifacts with cursor', error as Error);
    }
  }

  async findExpiredArtifacts(): Promise<JobArtifact[]> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const artifacts = this.db
        .prepare(`SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.EXPIRES_AT} IS NOT NULL AND ${COLUMNS.JOB_ARTIFACTS.EXPIRES_AT} <= ?`)
        .all(now) as JobArtifact[];

      return artifacts;
    } catch (error) {
      throw new DatabaseError('Failed to find expired artifacts', error as Error);
    }
  }

  async cleanupExpiredArtifacts(): Promise<{
    deletedCount: number;
    freedSpace: number;
  }> {
    try {
      const expiredArtifacts = await this.findExpiredArtifacts();
      let deletedCount = 0;
      let freedSpace = 0;

      for (const artifact of expiredArtifacts) {
        try {
          const deleted = await this.delete(artifact.id);
          if (deleted) {
            deletedCount++;
            freedSpace += artifact.fileSize;
          }
        } catch (error) {
          console.warn(`Failed to delete expired artifact ${artifact.id}:`, error);
        }
      }

      console.log(`Cleaned up ${deletedCount} expired artifacts, freed ${freedSpace} bytes`);

      return { deletedCount, freedSpace };
    } catch (error) {
      throw new DatabaseError('Failed to cleanup expired artifacts', error as Error);
    }
  }

  async findByMultipleUUIDs(uuids: string[]): Promise<JobArtifact[]> {
    try {
      if (uuids.length === 0) {
        return [];
      }

      const placeholders = uuids.map(() => '?').join(',');
      const artifacts = this.db
        .prepare(`SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.UUID} IN (${placeholders})`)
        .all(...uuids) as JobArtifact[];

      return artifacts;
    } catch (error) {
      throw new DatabaseError('Failed to find artifacts by UUIDs', error as Error);
    }
  }

  async findArtifactsByMimeType(mimeType: string, limit: number = 50): Promise<JobArtifact[]> {
    try {
      const artifacts = this.db
        .prepare(`SELECT * FROM ${TABLES.JOB_ARTIFACTS} WHERE ${COLUMNS.JOB_ARTIFACTS.MIME_TYPE} LIKE ? ORDER BY ${COLUMNS.JOB_ARTIFACTS.CREATED_AT} DESC LIMIT ?`)
        .all(`${mimeType}%`, limit) as JobArtifact[];

      return artifacts;
    } catch (error) {
      throw new DatabaseError('Failed to find artifacts by MIME type', error as Error);
    }
  }
}