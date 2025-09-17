import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Database } from 'better-sqlite3';
import { JobArtifact, ArtifactType, CreateArtifactRequest } from '../types/JobTypes';
import { DatabaseError, NotFoundError, ConflictError } from '../types/JobTypes';

export interface ArtifactStorageConfig {
  basePath: string;
  maxFileSize?: number; // in bytes
  retentionDays?: number;
  enableDeduplication?: boolean;
  enableCleanup?: boolean;
  cleanupIntervalHours?: number;
}

export interface StorageStats {
  totalArtifacts: number;
  totalSize: number;
  totalFiles: number;
  deduplicationRatio: number;
  oldestArtifact?: Date;
  newestArtifact?: Date;
  sizeByType: Record<ArtifactType, number>;
  countByType: Record<ArtifactType, number>;
}

export class ArtifactStorage {
  private db: Database;
  private config: Required<ArtifactStorageConfig>;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(db: Database, config: ArtifactStorageConfig) {
    this.db = db;
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      retentionDays: 30,
      enableDeduplication: true,
      enableCleanup: true,
      cleanupIntervalHours: 24,
      ...config
    };

    this.ensureStorageDirectory();
    this.startCleanupTask();
  }

  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.config.basePath)) {
      fs.mkdirSync(this.config.basePath, { recursive: true });
    }

    // Create type-specific subdirectories
    const types: ArtifactType[] = ['screenshot', 'file', 'log', 'result', 'preview'];
    for (const type of types) {
      const typePath = path.join(this.config.basePath, type);
      if (!fs.existsSync(typePath)) {
        fs.mkdirSync(typePath, { recursive: true });
      }
    }
  }

  async storeArtifact(request: CreateArtifactRequest & { data: Buffer | string }): Promise<JobArtifact> {
    // Validate request
    this.validateArtifactRequest(request);

    // Convert to buffer if string
    const buffer = typeof request.data === 'string'
      ? Buffer.from(request.data, 'base64')
      : request.data;

    // Check file size
    if (buffer.length > this.config.maxFileSize!) {
      throw new DatabaseError(
        `Artifact size ${buffer.length} exceeds maximum allowed size ${this.config.maxFileSize}`,
        'ARTIFACT_TOO_LARGE',
        { size: buffer.length, maxSize: this.config.maxFileSize }
      );
    }

    // Generate SHA-256 hash for deduplication
    const hashSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    let filePath: string | undefined;
    let shouldWriteFile = true;

    // Check for existing artifact with same hash (deduplication)
    if (this.config.enableDeduplication) {
      const existing = this.db.prepare(`
        SELECT id, file_path FROM job_artifacts
        WHERE hash_sha256 = ? AND is_deleted = 0
        LIMIT 1
      `).get(hashSha256) as { id: string; file_path: string } | undefined;

      if (existing) {
        // Found duplicate, reuse the file
        filePath = existing.file_path;
        shouldWriteFile = false;
      }
    }

    // Generate file path if new
    if (!filePath) {
      filePath = await this.generateFilePath(request.type, request.name);
    }

    // Write file if needed
    if (shouldWriteFile && filePath) {
      await this.writeFile(filePath, buffer);
    }

    // Create artifact record
    const artifact: JobArtifact = {
      id: request.id || this.generateId(),
      job_id: request.job_id,
      type: request.type,
      name: request.name,
      file_path: filePath,
      file_size: buffer.length,
      mime_type: request.mime_type || this.getMimeType(request.name),
      hash_sha256: hashSha256,
      metadata: request.metadata || {},
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Insert into database
    const insert = this.db.prepare(`
      INSERT INTO job_artifacts (
        id, job_id, type, name, file_path, file_size, mime_type,
        hash_sha256, metadata, is_deleted, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      insert.run(
        artifact.id,
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
    } catch (error: any) {
      // Clean up file if database insertion fails
      if (shouldWriteFile && filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      throw new DatabaseError(
        `Failed to store artifact: ${error.message}`,
        'ARTIFACT_STORAGE_FAILED',
        { originalError: error }
      );
    }

    return artifact;
  }

  async getArtifact(artifactId: string): Promise<JobArtifact | null> {
    const row = this.db.prepare(`
      SELECT * FROM job_artifacts
      WHERE id = ? AND is_deleted = 0
    `).get(artifactId) as any | undefined;

    if (!row) {
      return null;
    }

    return this.mapRowToArtifact(row);
  }

  async getArtifactData(artifactId: string): Promise<Buffer | null> {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact || !artifact.file_path) {
      return null;
    }

    try {
      return await this.readFile(artifact.file_path);
    } catch (error) {
      throw new DatabaseError(
        `Failed to read artifact data: ${error.message}`,
        'ARTIFACT_READ_FAILED',
        { artifactId, filePath: artifact.file_path, originalError: error }
      );
    }
  }

  async getArtifactStream(artifactId: string): Promise<fs.ReadStream | null> {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact || !artifact.file_path) {
      return null;
    }

    if (!fs.existsSync(artifact.file_path)) {
      throw new NotFoundError(`Artifact file not found: ${artifact.file_path}`, 'ARTIFACT_FILE_NOT_FOUND');
    }

    return fs.createReadStream(artifact.file_path);
  }

  async listArtifacts(jobId?: string, type?: ArtifactType): Promise<JobArtifact[]> {
    let sql = `
      SELECT * FROM job_artifacts
      WHERE is_deleted = 0
    `;
    const params: any[] = [];

    if (jobId) {
      sql += ' AND job_id = ?';
      params.push(jobId);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.mapRowToArtifact(row));
  }

  async updateArtifact(artifactId: string, updates: {
    name?: string;
    metadata?: Record<string, any>;
  }): Promise<JobArtifact> {
    const existing = await this.getArtifact(artifactId);
    if (!existing) {
      throw new NotFoundError(`Artifact not found: ${artifactId}`, 'ARTIFACT_NOT_FOUND');
    }

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
    params.push(artifactId);

    this.db.prepare(`
      UPDATE job_artifacts
      SET ${setClause.join(', ')}
      WHERE id = ?
    `).run(...params);

    return (await this.getArtifact(artifactId))!;
  }

  async deleteArtifact(artifactId: string, hardDelete: boolean = false): Promise<boolean> {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact) {
      return false;
    }

    if (hardDelete) {
      // Delete file if it's not referenced by other artifacts
      if (artifact.file_path) {
        const referenceCount = this.db.prepare(`
          SELECT COUNT(*) as count FROM job_artifacts
          WHERE file_path = ? AND id != ? AND is_deleted = 0
        `).get(artifact.file_path, artifactId) as { count: number };

        if (referenceCount.count === 0 && fs.existsSync(artifact.file_path)) {
          fs.unlinkSync(artifact.file_path);
        }
      }

      // Delete database record
      this.db.prepare('DELETE FROM job_artifacts WHERE id = ?').run(artifactId);
    } else {
      // Soft delete
      this.db.prepare(`
        UPDATE job_artifacts
        SET is_deleted = 1, updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), artifactId);
    }

    return true;
  }

  async getStorageStats(): Promise<StorageStats> {
    const artifacts = await this.listArtifacts();

    const stats: StorageStats = {
      totalArtifacts: artifacts.length,
      totalSize: 0,
      totalFiles: new Set(artifacts.map(a => a.file_path).filter(Boolean)).size,
      deduplicationRatio: 0,
      sizeByType: {
        screenshot: 0,
        file: 0,
        log: 0,
        result: 0,
        preview: 0
      },
      countByType: {
        screenshot: 0,
        file: 0,
        log: 0,
        result: 0,
        preview: 0
      }
    };

    for (const artifact of artifacts) {
      stats.totalSize += artifact.file_size || 0;
      stats.sizeByType[artifact.type] += artifact.file_size || 0;
      stats.countByType[artifact.type]++;

      if (!stats.oldestArtifact || artifact.created_at < stats.oldestArtifact) {
        stats.oldestArtifact = artifact.created_at;
      }
      if (!stats.newestArtifact || artifact.created_at > stats.newestArtifact) {
        stats.newestArtifact = artifact.created_at;
      }
    }

    // Calculate deduplication ratio
    const potentialSize = artifacts.reduce((sum, a) => sum + (a.file_size || 0), 0);
    stats.deduplicationRatio = stats.totalFiles > 0
      ? (potentialSize - stats.totalSize) / potentialSize
      : 0;

    return stats;
  }

  async cleanupOldArtifacts(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays!);

    // Find artifacts to delete
    const artifactsToDelete = this.db.prepare(`
      SELECT id, file_path FROM job_artifacts
      WHERE created_at < ? AND is_deleted = 0
    `).all(cutoffDate.toISOString()) as Array<{ id: string; file_path: string }>;

    let deletedCount = 0;

    for (const artifact of artifactsToDelete) {
      try {
        await this.deleteArtifact(artifact.id, true);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete artifact ${artifact.id}:`, error);
      }
    }

    return deletedCount;
  }

  async verifyArtifactIntegrity(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    issues: Array<{ artifactId: string; issue: string }>;
  }> {
    const artifacts = await this.listArtifacts();
    const result = {
      total: artifacts.length,
      valid: 0,
      invalid: 0,
      issues: [] as Array<{ artifactId: string; issue: string }>
    };

    for (const artifact of artifacts) {
      let isValid = true;

      // Check file existence
      if (artifact.file_path) {
        if (!fs.existsSync(artifact.file_path)) {
          result.issues.push({ artifactId: artifact.id, issue: 'File not found' });
          isValid = false;
        } else {
          // Check file size matches
          const stats = fs.statSync(artifact.file_path);
          if (stats.size !== artifact.file_size) {
            result.issues.push({ artifactId: artifact.id, issue: 'File size mismatch' });
            isValid = false;
          }

          // Check hash if file exists
          try {
            const fileBuffer = await this.readFile(artifact.file_path);
            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            if (fileHash !== artifact.hash_sha256) {
              result.issues.push({ artifactId: artifact.id, issue: 'Hash mismatch' });
              isValid = false;
            }
          } catch (error) {
            result.issues.push({ artifactId: artifact.id, issue: 'Cannot read file for hash check' });
            isValid = false;
          }
        }
      }

      if (isValid) {
        result.valid++;
      } else {
        result.invalid++;
      }
    }

    return result;
  }

  private validateArtifactRequest(request: CreateArtifactRequest & { data: Buffer | string }): void {
    if (!request.job_id) {
      throw new DatabaseError('Job ID is required', 'VALIDATION_ERROR');
    }

    if (!request.type) {
      throw new DatabaseError('Artifact type is required', 'VALIDATION_ERROR');
    }

    if (!request.name) {
      throw new DatabaseError('Artifact name is required', 'VALIDATION_ERROR');
    }

    if (!request.data) {
      throw new DatabaseError('Artifact data is required', 'VALIDATION_ERROR');
    }

    const validTypes: ArtifactType[] = ['screenshot', 'file', 'log', 'result', 'preview'];
    if (!validTypes.includes(request.type)) {
      throw new DatabaseError(`Invalid artifact type: ${request.type}`, 'VALIDATION_ERROR');
    }
  }

  private async generateFilePath(type: ArtifactType, name: string): Promise<string> {
    const sanitizeName = (name: string) => {
      return name.replace(/[^a-zA-Z0-9.-]/g, '_');
    };

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedName = sanitizeName(name);

    const fileName = `${timestamp}_${random}_${sanitizedName}`;
    return path.join(this.config.basePath, type, fileName);
  }

  private async writeFile(filePath: string, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, data, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async readFile(filePath: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    });
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.log': 'text/plain',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    };
    return mimeTypes[ext] || 'application/octet-stream';
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

  private generateId(): string {
    return `artifact_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private startCleanupTask(): void {
    if (this.config.enableCleanup) {
      // Run cleanup immediately
      this.cleanupOldArtifacts().catch(console.error);

      // Schedule regular cleanup
      this.cleanupInterval = setInterval(() => {
        this.cleanupOldArtifacts().catch(console.error);
      }, this.config.cleanupIntervalHours! * 60 * 60 * 1000);
    }
  }

  public stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  public getConfig(): ArtifactStorageConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<ArtifactStorageConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart cleanup task if needed
    if (config.enableCleanup !== undefined || config.cleanupIntervalHours !== undefined) {
      this.stopCleanupTask();
      this.startCleanupTask();
    }
  }
}