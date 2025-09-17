import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { promises as fs, existsSync, mkdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import {
  JobArtifact,
  CreateJobArtifact,
  ArtifactType,
  StorageBackend,
  DatabaseError
} from './types';
import { COLUMNS, TABLES } from './schema';

export interface ArtifactStorageConfig {
  basePath: string;
  maxFileSize: number; // in bytes
  maxPreviewSize: number; // in bytes
  enableDeduplication: boolean;
  autoCleanup: boolean;
  cleanupInterval: number; // in hours
  supportedMimeTypes: string[];
  previewFormats: { [mimeType: string]: string };
}

export class ArtifactStorage {
  private db: Database.Database;
  private config: ArtifactStorageConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(db: Database.Database, config: Partial<ArtifactStorageConfig> = {}) {
    this.db = db;
    this.config = {
      basePath: './artifacts',
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxPreviewSize: 1024 * 1024, // 1MB
      enableDeduplication: true,
      autoCleanup: true,
      cleanupInterval: 24, // 24 hours
      supportedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'text/plain',
        'application/json',
        'application/pdf',
        'text/markdown'
      ],
      previewFormats: {
        'image/jpeg': 'image/jpeg',
        'image/png': 'image/png',
        'image/webp': 'image/jpeg',
        'image/gif': 'image/jpeg',
        'text/plain': 'text/plain',
        'application/json': 'text/plain',
        'text/markdown': 'text/plain'
      },
      ...config
    };

    this.initializeStorage();
  }

  private initializeStorage(): void {
    try {
      // Ensure base path exists
      if (!existsSync(this.config.basePath)) {
        mkdirSync(this.config.basePath, { recursive: true });
      }

      // Create subdirectories
      const subdirs = ['screenshots', 'files', 'previews', 'temp'];
      for (const subdir of subdirs) {
        const dir = join(this.config.basePath, subdir);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      // Prepare statements
      this.prepareStatements();

      // Start auto cleanup if enabled
      if (this.config.autoCleanup) {
        this.startAutoCleanup();
      }

      console.log('Artifact storage initialized with config:', {
        basePath: this.config.basePath,
        maxFileSize: this.config.maxFileSize,
        enableDeduplication: this.config.enableDeduplication,
        autoCleanup: this.config.autoCleanup
      });
    } catch (error) {
      throw new DatabaseError('Failed to initialize artifact storage', error as Error);
    }
  }

  private prepareStatements(): void {
    // Prepare commonly used statements
    const statements = [
      'SELECT * FROM job_artifacts WHERE hash_sha256 = ?',
      'SELECT * FROM job_artifacts WHERE job_id = ?',
      'INSERT INTO job_artifacts (uuid, job_id, type, name, description, file_path, file_size, mime_type, hash_sha256, preview_data, preview_size, preview_mime_type, metadata, storage_backend, created_at, accessed_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      'UPDATE job_artifacts SET accessed_at = ? WHERE id = ?',
      'DELETE FROM job_artifacts WHERE id = ?',
      'UPDATE job_artifacts SET expires_at = ? WHERE id = ?'
    ];

    statements.forEach(statement => {
      try {
        this.db.prepare(statement);
      } catch (error) {
        console.warn(`Failed to prepare statement: ${statement}`, error);
      }
    });
  }

  private startAutoCleanup(): void {
    const intervalMs = this.config.cleanupInterval * 60 * 60 * 1000;
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        console.error('Auto cleanup failed:', error);
      });
    }, intervalMs);
  }

  private async cleanup(): Promise<{
    deletedArtifacts: number;
    deletedFiles: number;
    freedSpace: number;
  }> {
    try {
      console.log('Running artifact cleanup...');

      const startTime = Date.now();
      let deletedArtifacts = 0;
      let deletedFiles = 0;
      let freedSpace = 0;

      // Find expired artifacts
      const expiredArtifacts = this.db
        .prepare('SELECT * FROM job_artifacts WHERE expires_at IS NOT NULL AND expires_at <= ?')
        .all(Math.floor(Date.now() / 1000)) as JobArtifact[];

      // Delete expired artifacts
      for (const artifact of expiredArtifacts) {
        await this.deleteArtifact(artifact.id);
        deletedArtifacts++;
        deletedFiles++;
        freedSpace += artifact.fileSize;
      }

      // Find orphaned files (files that exist but have no database record)
      const orphanedFiles = await this.findOrphanedFiles();
      for (const filePath of orphanedFiles) {
        try {
          await fs.unlink(filePath);
          deletedFiles++;
          freedSpace += (await fs.stat(filePath)).size;
        } catch (error) {
          console.warn(`Failed to delete orphaned file: ${filePath}`, error);
        }
      }

      // Clean up temporary files
      const tempDir = join(this.config.basePath, 'temp');
      if (existsSync(tempDir)) {
        const tempFiles = await fs.readdir(tempDir);
        for (const file of tempFiles) {
          const filePath = join(tempDir, file);
          const stats = await fs.stat(filePath);

          // Delete files older than 1 hour
          if (Date.now() - stats.mtimeMs > 60 * 60 * 1000) {
            try {
              await fs.unlink(filePath);
              deletedFiles++;
              freedSpace += stats.size;
            } catch (error) {
              console.warn(`Failed to delete temp file: ${filePath}`, error);
            }
          }
        }
      }

      const duration = Date.now() - startTime;
      console.log(`Artifact cleanup completed in ${duration}ms:`, {
        deletedArtifacts,
        deletedFiles,
        freedSpace: `${(freedSpace / 1024 / 1024).toFixed(2)}MB`
      });

      return { deletedArtifacts, deletedFiles, freedSpace };
    } catch (error) {
      throw new DatabaseError('Failed to run artifact cleanup', error as Error);
    }
  }

  private async findOrphanedFiles(): Promise<string[]> {
    const orphanedFiles: string[] = [];

    try {
      // Get all files in storage directories
      const storageDirs = ['screenshots', 'files', 'previews'];
      const allFiles: string[] = [];

      for (const dir of storageDirs) {
        const dirPath = join(this.config.basePath, dir);
        if (existsSync(dirPath)) {
          const files = await this.getFilesRecursive(dirPath);
          allFiles.push(...files);
        }
      }

      // Get all file paths from database
      const dbFiles = this.db
        .prepare('SELECT file_path FROM job_artifacts')
        .all() as { file_path: string }[];

      const dbFilePaths = new Set(dbFiles.map(f => f.file_path));

      // Find orphaned files
      for (const file of allFiles) {
        if (!dbFilePaths.has(file)) {
          orphanedFiles.push(file);
        }
      }
    } catch (error) {
      console.error('Failed to find orphaned files:', error);
    }

    return orphanedFiles;
  }

  private async getFilesRecursive(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await this.getFilesRecursive(fullPath));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private calculateHash(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private generateStoragePath(type: ArtifactType, hash: string, extension: string): string {
    const typeDir = type === 'screenshot' ? 'screenshots' : 'files';
    const firstTwo = hash.substring(0, 2);
    const secondTwo = hash.substring(2, 4);

    return join(this.config.basePath, typeDir, firstTwo, secondTwo, `${hash}${extension}`);
  }

  private generatePreviewPath(hash: string, extension: string): string {
    const firstTwo = hash.substring(0, 2);
    const secondTwo = hash.substring(2, 4);

    return join(this.config.basePath, 'previews', firstTwo, secondTwo, `${hash}_preview${extension}`);
  }

  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async storeArtifact(
    data: Buffer,
    metadata: Omit<CreateJobArtifact, 'id' | 'uuid' | 'createdAt' | 'accessedAt'>
  ): Promise<JobArtifact> {
    try {
      // Validate file size
      if (data.length > this.config.maxFileSize) {
        throw new DatabaseError(`File size (${data.length} bytes) exceeds maximum allowed size (${this.config.maxFileSize} bytes)`);
      }

      // Validate MIME type
      if (metadata.mimeType && !this.config.supportedMimeTypes.includes(metadata.mimeType)) {
        throw new DatabaseError(`Unsupported MIME type: ${metadata.mimeType}`);
      }

      // Calculate hash for deduplication
      const hash = this.calculateHash(data);
      let artifact: JobArtifact | null = null;

      // Check for existing artifact with same hash (deduplication)
      if (this.config.enableDeduplication) {
        artifact = this.db
          .prepare('SELECT * FROM job_artifacts WHERE hash_sha256 = ?')
          .get(hash) as JobArtifact | null;
      }

      if (artifact) {
        // Update existing artifact access time
        this.db
          .prepare('UPDATE job_artifacts SET accessed_at = ? WHERE id = ?')
          .run(Math.floor(Date.now() / 1000), artifact.id);

        return artifact;
      }

      // Generate file path
      const extension = metadata.name ? extname(metadata.name) : '.bin';
      const filePath = this.generateStoragePath(metadata.type, hash, extension);

      // Ensure directory exists
      await this.ensureDirectoryExists(filePath);

      // Write file
      await fs.writeFile(filePath, data);

      // Generate preview if possible
      const previewData = await this.generatePreview(data, metadata.mimeType);
      let previewPath: string | null = null;
      let previewSize = 0;
      let previewMimeType: string | null = null;

      if (previewData) {
        const previewExtension = this.getPreviewExtension(metadata.mimeType);
        previewPath = this.generatePreviewPath(hash, previewExtension);
        await this.ensureDirectoryExists(previewPath);
        await fs.writeFile(previewPath, previewData);
        previewSize = previewData.length;
        previewMimeType = this.getPreviewMimeType(metadata.mimeType);
      }

      // Convert metadata to JSON string
      const metadataJson = JSON.stringify(metadata.metadata || {});

      // Insert into database
      const insertStmt = this.db.prepare(`
        INSERT INTO job_artifacts (
          uuid, job_id, type, name, description, file_path, file_size, mime_type,
          hash_sha256, preview_data, preview_size, preview_mime_type, metadata,
          storage_backend, created_at, accessed_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const uuid = this.generateUUID();
      const now = Math.floor(Date.now() / 1000);

      const result = insertStmt.run(
        uuid,
        metadata.jobId,
        metadata.type,
        metadata.name,
        metadata.description || null,
        filePath,
        data.length,
        metadata.mimeType || null,
        hash,
        previewPath ? Buffer.from(previewData).toString('base64') : null,
        previewSize,
        previewMimeType,
        metadataJson,
        'local',
        now,
        now,
        metadata.expiresAt || null
      );

      // Return created artifact
      return this.getArtifactById(result.lastInsertRowid as number)!;
    } catch (error) {
      throw new DatabaseError('Failed to store artifact', error as Error);
    }
  }

  private async generatePreview(data: Buffer, mimeType?: string): Promise<Buffer | null> {
    if (!mimeType || !this.config.previewFormats[mimeType]) {
      return null;
    }

    try {
      // For images, generate a smaller preview
      if (mimeType.startsWith('image/')) {
        return await this.generateImagePreview(data, mimeType);
      }

      // For text files, generate a text preview
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        return await this.generateTextPreview(data, mimeType);
      }
    } catch (error) {
      console.warn('Failed to generate preview:', error);
    }

    return null;
  }

  private async generateImagePreview(data: Buffer, mimeType: string): Promise<Buffer> {
    // Simple preview generation - in a real implementation, you'd use a library like sharp
    try {
      // For now, just return the original data if it's small enough
      if (data.length <= this.config.maxPreviewSize) {
        return data;
      }

      // Otherwise, you could implement proper image resizing here
      // This is a placeholder - implement actual image processing
      return data.slice(0, Math.min(data.length, this.config.maxPreviewSize));
    } catch (error) {
      console.warn('Failed to generate image preview:', error);
      return null;
    }
  }

  private async generateTextPreview(data: Buffer, mimeType: string): Promise<Buffer> {
    try {
      const text = data.toString('utf8');

      // Truncate to max preview size
      const maxLength = Math.min(text.length, this.config.maxPreviewSize);
      const preview = text.substring(0, maxLength);

      return Buffer.from(preview, 'utf8');
    } catch (error) {
      console.warn('Failed to generate text preview:', error);
      return null;
    }
  }

  private getPreviewExtension(mimeType: string): string {
    const format = this.config.previewFormats[mimeType];
    switch (format) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'text/plain':
        return '.txt';
      default:
        return '.bin';
    }
  }

  private getPreviewMimeType(mimeType: string): string | null {
    return this.config.previewFormats[mimeType] || null;
  }

  async getArtifactById(id: number): Promise<JobArtifact | null> {
    try {
      const artifact = this.db
        .prepare('SELECT * FROM job_artifacts WHERE id = ?')
        .get(id) as JobArtifact | null;

      if (artifact) {
        // Update access time
        this.db
          .prepare('UPDATE job_artifacts SET accessed_at = ? WHERE id = ?')
          .run(Math.floor(Date.now() / 1000), id);
      }

      return artifact;
    } catch (error) {
      throw new DatabaseError('Failed to get artifact', error as Error);
    }
  }

  async getArtifactByUUID(uuid: string): Promise<JobArtifact | null> {
    try {
      const artifact = this.db
        .prepare('SELECT * FROM job_artifacts WHERE uuid = ?')
        .get(uuid) as JobArtifact | null;

      if (artifact) {
        // Update access time
        this.db
          .prepare('UPDATE job_artifacts SET accessed_at = ? WHERE id = ?')
          .run(Math.floor(Date.now() / 1000), artifact.id);
      }

      return artifact;
    } catch (error) {
      throw new DatabaseError('Failed to get artifact', error as Error);
    }
  }

  async getJobArtifacts(jobId: number): Promise<JobArtifact[]> {
    try {
      return this.db
        .prepare('SELECT * FROM job_artifacts WHERE job_id = ? ORDER BY created_at DESC')
        .all(jobId) as JobArtifact[];
    } catch (error) {
      throw new DatabaseError('Failed to get job artifacts', error as Error);
    }
  }

  async getArtifactData(artifact: JobArtifact): Promise<Buffer> {
    try {
      if (!existsSync(artifact.filePath)) {
        throw new DatabaseError(`Artifact file not found: ${artifact.filePath}`);
      }

      return await fs.readFile(artifact.filePath);
    } catch (error) {
      throw new DatabaseError('Failed to read artifact data', error as Error);
    }
  }

  async getArtifactPreview(artifact: JobArtifact): Promise<Buffer | null> {
    try {
      if (!artifact.previewData) {
        return null;
      }

      return Buffer.from(artifact.previewData, 'base64');
    } catch (error) {
      throw new DatabaseError('Failed to read artifact preview', error as Error);
    }
  }

  async deleteArtifact(id: number): Promise<boolean> {
    try {
      const artifact = await this.getArtifactById(id);
      if (!artifact) {
        return false;
      }

      // Delete file
      try {
        if (existsSync(artifact.filePath)) {
          await fs.unlink(artifact.filePath);
        }
      } catch (error) {
        console.warn(`Failed to delete artifact file: ${artifact.filePath}`, error);
      }

      // Delete preview if it exists
      if (artifact.previewData) {
        try {
          const previewPath = this.generatePreviewPath(artifact.hashSha256,
            this.getPreviewExtension(artifact.mimeType || ''));
          if (existsSync(previewPath)) {
            await fs.unlink(previewPath);
          }
        } catch (error) {
          console.warn('Failed to delete artifact preview:', error);
        }
      }

      // Delete database record
      const result = this.db
        .prepare('DELETE FROM job_artifacts WHERE id = ?')
        .run(id);

      return result.changes > 0;
    } catch (error) {
      throw new DatabaseError('Failed to delete artifact', error as Error);
    }
  }

  async setArtifactExpiration(id: number, expiresAt: number): Promise<boolean> {
    try {
      const result = this.db
        .prepare('UPDATE job_artifacts SET expires_at = ? WHERE id = ?')
        .run(expiresAt, id);

      return result.changes > 0;
    } catch (error) {
      throw new DatabaseError('Failed to set artifact expiration', error as Error);
    }
  }

  async getArtifactsByType(type: ArtifactType, limit: number = 50): Promise<JobArtifact[]> {
    try {
      return this.db
        .prepare('SELECT * FROM job_artifacts WHERE type = ? ORDER BY created_at DESC LIMIT ?')
        .all(type, limit) as JobArtifact[];
    } catch (error) {
      throw new DatabaseError('Failed to get artifacts by type', error as Error);
    }
  }

  async getStorageStats(): Promise<{
    totalArtifacts: number;
    totalSize: number;
    totalFiles: number;
    byType: { [type: string]: { count: number; size: number } };
    oldestArtifact: Date | null;
    newestArtifact: Date | null;
  }> {
    try {
      const artifacts = this.db
        .prepare('SELECT * FROM job_artifacts')
        .all() as JobArtifact[];

      const stats = {
        totalArtifacts: artifacts.length,
        totalSize: 0,
        totalFiles: 0,
        byType: {} as { [type: string]: { count: number; size: number } },
        oldestArtifact: null as Date | null,
        newestArtifact: null as Date | null
      };

      for (const artifact of artifacts) {
        stats.totalSize += artifact.fileSize;

        if (existsSync(artifact.filePath)) {
          stats.totalFiles++;
        }

        if (!stats.byType[artifact.type]) {
          stats.byType[artifact.type] = { count: 0, size: 0 };
        }
        stats.byType[artifact.type].count++;
        stats.byType[artifact.type].size += artifact.fileSize;

        const artifactDate = new Date(artifact.createdAt * 1000);
        if (!stats.oldestArtifact || artifactDate < stats.oldestArtifact) {
          stats.oldestArtifact = artifactDate;
        }
        if (!stats.newestArtifact || artifactDate > stats.newestArtifact) {
          stats.newestArtifact = artifactDate;
        }
      }

      return stats;
    } catch (error) {
      throw new DatabaseError('Failed to get storage stats', error as Error);
    }
  }

  private generateUUID(): string {
    return require('crypto').randomUUID();
  }

  // Cleanup
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  async close(): Promise<void> {
    this.stopAutoCleanup();
    await this.cleanup(); // Final cleanup
  }
}