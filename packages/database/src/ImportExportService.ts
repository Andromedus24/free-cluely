import { z } from 'zod';
import { createHash, randomBytes } from 'crypto';
import { DatabaseService } from './DatabaseService';
import { Job, JobArtifact, Session, DatabaseError } from './types';
import { SecureStorage } from '@atlas/core';

// Redaction patterns for sensitive data
const REDACTION_PATTERNS = [
  // API Keys
  /sk-[a-zA-Z0-9]{48,}/g,
  /pk-[a-zA-Z0-9]{48,}/g,
  // Passwords
  /"password":\s*"([^"]+)"/g,
  /'password':\s*'([^']+)'/g,
  // Tokens
  /Bearer\s+[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?/g,
  // Email addresses (optional)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers (optional)
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  // Credit cards (optional)
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g
];

// Export/Import schemas
const ExportOptionsSchema = z.object({
  includeJobs: z.boolean().default(true),
  includeArtifacts: z.boolean().default(false), // Artifacts can be large
  includeSessions: z.boolean().default(true),
  includeSettings: z.boolean().default(true),
  redactSensitive: z.boolean().default(true),
  compress: z.boolean().default(true),
  artifactSizeLimit: z.number().default(10 * 1024 * 1024), // 10MB
  dateRange: z.object({
    start: z.number().optional(),
    end: z.number().optional()
  }).optional()
});

export type ExportOptions = z.infer<typeof ExportOptionsSchema>;

const ImportOptionsSchema = z.object({
  overwriteExisting: z.boolean().default(false),
  skipConflicts: z.boolean().default(true),
  validateOnly: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  mergeSettings: z.boolean().default(true)
});

export type ImportOptions = z.infer<typeof ImportOptionsSchema>;

const ExportDataSchema = z.object({
  version: z.string().default('1.0.0'),
  exportedAt: z.number().default(() => Date.now()),
  atlasVersion: z.string().default('1.0.0'),
  checksum: z.string(),
  metadata: z.object({
    totalJobs: z.number(),
    totalArtifacts: z.number(),
    totalSessions: z.number(),
    sizeBytes: z.number(),
    redactionApplied: z.boolean(),
    compressionApplied: z.boolean()
  }),
  jobs: z.array(z.unknown()).optional(),
  artifacts: z.array(z.unknown()).optional(),
  sessions: z.array(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional()
});

export type ExportData = z.infer<typeof ExportDataSchema>;

const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
  value: z.unknown()
});

export type ValidationError = z.infer<typeof ValidationErrorSchema>;

const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationErrorSchema),
  summary: z.object({
    totalItems: z.number(),
    validItems: z.number(),
    invalidItems: z.number(),
    warnings: z.number()
  })
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;

export class ImportExportService {
  private databaseService: DatabaseService;
  private secureStorage: SecureStorage;

  constructor(databaseService: DatabaseService, secureStorage: SecureStorage) {
    this.databaseService = databaseService;
    this.secureStorage = secureStorage;
  }

  private redactSensitiveData(data: string): string {
    let redacted = data;

    for (const pattern of REDACTION_PATTERNS) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }

    return redacted;
  }

  private async calculateChecksum(data: any): Promise<string> {
    const dataString = JSON.stringify(data);
    return createHash('sha256').update(dataString).digest('hex');
  }

  private async validateJob(job: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      // Basic validation
      if (!job.title || typeof job.title !== 'string') {
        errors.push({
          field: 'title',
          message: 'Job title is required and must be a string',
          severity: 'error',
          value: job.title
        });
      }

      if (!job.type || !['chat', 'vision', 'image_generation', 'code_analysis', 'other'].includes(job.type)) {
        errors.push({
          field: 'type',
          message: 'Invalid job type',
          severity: 'error',
          value: job.type
        });
      }

      if (!job.provider || typeof job.provider !== 'string') {
        errors.push({
          field: 'provider',
          message: 'Provider is required and must be a string',
          severity: 'error',
          value: job.provider
        });
      }

      // Check for sensitive data in request/response
      if (job.request && typeof job.request === 'string') {
        const redactedRequest = this.redactSensitiveData(job.request);
        if (redactedRequest !== job.request) {
          errors.push({
            field: 'request',
            message: 'Request contains sensitive data that will be redacted',
            severity: 'warning',
            value: '[REDACTED_FOR_VALIDATION]'
          });
        }
      }

      if (job.response && typeof job.response === 'string') {
        const redactedResponse = this.redactSensitiveData(job.response);
        if (redactedResponse !== job.response) {
          errors.push({
            field: 'response',
            message: 'Response contains sensitive data that will be redacted',
            severity: 'warning',
            value: '[REDACTED_FOR_VALIDATION]'
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'job',
        message: `Job validation failed: ${error.message}`,
        severity: 'error',
        value: null
      });
    }

    return errors;
  }

  private async validateArtifact(artifact: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      if (!artifact.name || typeof artifact.name !== 'string') {
        errors.push({
          field: 'name',
          message: 'Artifact name is required and must be a string',
          severity: 'error',
          value: artifact.name
        });
      }

      if (!artifact.type || !['screenshot', 'file', 'image', 'document', 'log', 'other'].includes(artifact.type)) {
        errors.push({
          field: 'type',
          message: 'Invalid artifact type',
          severity: 'error',
          value: artifact.type
        });
      }

      if (artifact.fileSize && typeof artifact.fileSize === 'number' && artifact.fileSize > 100 * 1024 * 1024) {
        errors.push({
          field: 'fileSize',
          message: 'Artifact size exceeds 100MB limit',
          severity: 'error',
          value: artifact.fileSize
        });
      }

    } catch (error) {
      errors.push({
        field: 'artifact',
        message: `Artifact validation failed: ${error.message}`,
        severity: 'error',
        value: null
      });
    }

    return errors;
  }

  private async validateSession(session: any): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    try {
      if (!session.uuid || typeof session.uuid !== 'string') {
        errors.push({
          field: 'uuid',
          message: 'Session UUID is required and must be a string',
          severity: 'error',
          value: session.uuid
        });
      }

      // Check for UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (session.uuid && !uuidRegex.test(session.uuid)) {
        errors.push({
          field: 'uuid',
          message: 'Invalid UUID format',
          severity: 'error',
          value: session.uuid
        });
      }

    } catch (error) {
      errors.push({
        field: 'session',
        message: `Session validation failed: ${error.message}`,
        severity: 'error',
        value: null
      });
    }

    return errors;
  }

  async exportData(options: ExportOptions = {}): Promise<string> {
    const validatedOptions = ExportOptionsSchema.parse(options);

    try {
      console.log('Starting data export with options:', validatedOptions);

      const exportData: any = {
        version: '1.0.0',
        exportedAt: Date.now(),
        atlasVersion: '1.0.0',
        metadata: {
          totalJobs: 0,
          totalArtifacts: 0,
          totalSessions: 0,
          sizeBytes: 0,
          redactionApplied: validatedOptions.redactSensitive,
          compressionApplied: validatedOptions.compress
        }
      };

      // Export jobs
      if (validatedOptions.includeJobs) {
        const jobsQuery = {
          filter: {},
          pagination: { limit: 10000 }
        };

        if (validatedOptions.dateRange) {
          if (validatedOptions.dateRange.start) {
            jobsQuery.filter.createdAfter = validatedOptions.dateRange.start;
          }
          if (validatedOptions.dateRange.end) {
            jobsQuery.filter.createdBefore = validatedOptions.dateRange.end;
          }
        }

        const jobsResult = await this.databaseService.queryJobs(jobsQuery);
        exportData.jobs = jobsResult.items;
        exportData.metadata.totalJobs = jobsResult.items.length;

        // Apply redaction if enabled
        if (validatedOptions.redactSensitive) {
          exportData.jobs = exportData.jobs.map((job: Job) => ({
            ...job,
            request: job.request ? this.redactSensitiveData(job.request) : job.request,
            response: job.response ? this.redactSensitiveData(job.response) : job.response,
            metadata: job.metadata ? this.redactSensitiveData(JSON.stringify(job.metadata)) : job.metadata
          }));
        }
      }

      // Export artifacts (with size limit)
      if (validatedOptions.includeArtifacts) {
        try {
          // This is a simplified approach - in production, you'd want batch processing
          const artifacts = await this.databaseService.getArtifactStorageStats();
          exportData.artifacts = []; // Placeholder for artifact metadata
          exportData.metadata.totalArtifacts = 0; // Would need to implement artifact listing
        } catch (error) {
          console.warn('Failed to export artifacts:', error);
        }
      }

      // Export sessions
      if (validatedOptions.includeSessions) {
        const sessions = await this.databaseService.findRecentSessions(1000);
        exportData.sessions = sessions;
        exportData.metadata.totalSessions = sessions.length;
      }

      // Export settings
      if (validatedOptions.includeSettings) {
        const settings = await this.secureStorage.getSettings();
        exportData.settings = settings;
      }

      // Calculate final checksum and size
      exportData.checksum = await this.calculateChecksum(exportData);
      exportData.metadata.sizeBytes = Buffer.byteLength(JSON.stringify(exportData), 'utf8');

      // Validate export data
      const validatedData = ExportDataSchema.parse(exportData);

      // Apply compression if enabled
      if (validatedOptions.compress) {
        // In a real implementation, you'd use a compression library
        // For now, we'll return the JSON as-is
        console.log('Compression enabled but not implemented in this version');
      }

      const result = JSON.stringify(validatedData, null, 2);
      console.log('Export completed successfully');
      return result;

    } catch (error) {
      console.error('Export failed:', error);
      throw new DatabaseError(`Export failed: ${error.message}`, error);
    }
  }

  async importData(data: string, options: ImportOptions = {}): Promise<ValidationResult> {
    const validatedOptions = ImportOptionsSchema.parse(options);

    try {
      console.log('Starting data import with options:', validatedOptions);

      // Parse and validate import data
      let importData;
      try {
        importData = JSON.parse(data);
      } catch (error) {
        throw new Error('Invalid JSON format in import data');
      }

      const validationResult = await this.validateImportData(importData);

      if (!validationResult.isValid) {
        console.error('Import validation failed:', validationResult.errors);
        return validationResult;
      }

      if (validatedOptions.validateOnly || validatedOptions.dryRun) {
        console.log('Validation/dry run completed successfully');
        return validationResult;
      }

      // Perform actual import
      if (validatedOptions.overwriteExisting || validatedOptions.skipConflicts) {
        await this.performImport(importData, validatedOptions);
      } else {
        throw new Error('Import requires either overwriteExisting or skipConflicts to be true');
      }

      console.log('Import completed successfully');
      return validationResult;

    } catch (error) {
      console.error('Import failed:', error);
      return {
        isValid: false,
        errors: [{
          field: 'import',
          message: `Import failed: ${error.message}`,
          severity: 'error',
          value: null
        }],
        warnings: [],
        summary: {
          totalItems: 0,
          validItems: 0,
          invalidItems: 1,
          warnings: 0
        }
      };
    }
  }

  private async validateImportData(data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let totalItems = 0;
    let validItems = 0;

    try {
      // Validate basic structure
      if (!data.version || typeof data.version !== 'string') {
        errors.push({
          field: 'version',
          message: 'Version is required and must be a string',
          severity: 'error',
          value: data.version
        });
      }

      if (!data.exportedAt || typeof data.exportedAt !== 'number') {
        errors.push({
          field: 'exportedAt',
          message: 'Export timestamp is required and must be a number',
          severity: 'error',
          value: data.exportedAt
        });
      }

      if (!data.checksum || typeof data.checksum !== 'string') {
        errors.push({
          field: 'checksum',
          message: 'Checksum is required and must be a string',
          severity: 'error',
          value: data.checksum
        });
      } else {
        // Verify checksum
        const dataCopy = { ...data };
        delete dataCopy.checksum;
        const calculatedChecksum = await this.calculateChecksum(dataCopy);
        if (calculatedChecksum !== data.checksum) {
          errors.push({
            field: 'checksum',
            message: 'Checksum validation failed - data may be corrupted',
            severity: 'error',
            value: data.checksum
          });
        }
      }

      // Validate jobs
      if (data.jobs && Array.isArray(data.jobs)) {
        totalItems += data.jobs.length;
        for (let i = 0; i < data.jobs.length; i++) {
          const jobErrors = await this.validateJob(data.jobs[i]);
          if (jobErrors.length === 0) {
            validItems++;
          } else {
            errors.push(...jobErrors);
          }
        }
      }

      // Validate artifacts
      if (data.artifacts && Array.isArray(data.artifacts)) {
        totalItems += data.artifacts.length;
        for (let i = 0; i < data.artifacts.length; i++) {
          const artifactErrors = await this.validateArtifact(data.artifacts[i]);
          if (artifactErrors.length === 0) {
            validItems++;
          } else {
            errors.push(...artifactErrors);
          }
        }
      }

      // Validate sessions
      if (data.sessions && Array.isArray(data.sessions)) {
        totalItems += data.sessions.length;
        for (let i = 0; i < data.sessions.length; i++) {
          const sessionErrors = await this.validateSession(data.sessions[i]);
          if (sessionErrors.length === 0) {
            validItems++;
          } else {
            errors.push(...sessionErrors);
          }
        }
      }

      // Check for version compatibility
      if (data.version && data.version !== '1.0.0') {
        warnings.push({
          field: 'version',
          message: `Import data version ${data.version} may not be fully compatible with current version`,
          severity: 'warning',
          value: data.version
        });
      }

      // Check for old exports
      if (data.exportedAt) {
        const exportAge = Date.now() - data.exportedAt;
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        if (exportAge > thirtyDays) {
          warnings.push({
            field: 'exportedAt',
            message: 'Export data is more than 30 days old - may be outdated',
            severity: 'warning',
            value: new Date(data.exportedAt).toISOString()
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'data',
        message: `Data validation failed: ${error.message}`,
        severity: 'error',
        value: null
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalItems,
        validItems,
        invalidItems: errors.length,
        warnings: warnings.length
      }
    };
  }

  private async performImport(data: any, options: ImportOptions): Promise<void> {
    console.log('Performing import with options:', options);

    // Import jobs
    if (data.jobs && Array.isArray(data.jobs)) {
      for (const jobData of data.jobs) {
        try {
          // Check if job already exists
          const existingJob = await this.databaseService.getJobByUUID(jobData.uuid);

          if (existingJob) {
            if (options.overwriteExisting) {
              // Update existing job
              await this.databaseService.updateJob(existingJob.id, {
                title: jobData.title,
                description: jobData.description,
                status: jobData.status,
                priority: jobData.priority,
                provider: jobData.provider,
                model: jobData.model,
                request: jobData.request,
                response: jobData.response,
                error: jobData.error,
                metadata: jobData.metadata ? JSON.parse(jobData.metadata) : undefined,
                tags: jobData.tags ? JSON.parse(jobData.tags) : undefined
              });
              console.log(`Updated job: ${jobData.uuid}`);
            } else if (options.skipConflicts) {
              console.log(`Skipping existing job: ${jobData.uuid}`);
              continue;
            }
          } else {
            // Create new job
            await this.databaseService.createJob({
              uuid: jobData.uuid,
              title: jobData.title,
              description: jobData.description,
              type: jobData.type,
              status: jobData.status,
              priority: jobData.priority,
              provider: jobData.provider,
              model: jobData.model,
              request: jobData.request,
              response: jobData.response,
              error: jobData.error,
              metadata: jobData.metadata ? JSON.parse(jobData.metadata) : undefined,
              tags: jobData.tags ? JSON.parse(jobData.tags) : undefined,
              sessionId: jobData.sessionId
            });
            console.log(`Created job: ${jobData.uuid}`);
          }
        } catch (error) {
          console.error(`Failed to import job ${jobData.uuid}:`, error);
          throw error;
        }
      }
    }

    // Import sessions
    if (data.sessions && Array.isArray(data.sessions)) {
      for (const sessionData of data.sessions) {
        try {
          const existingSession = await this.databaseService.getSessionByUUID(sessionData.uuid);

          if (existingSession) {
            if (options.overwriteExisting) {
              await this.databaseService.updateSession(existingSession.id, {
                name: sessionData.name,
                description: sessionData.description,
                metadata: sessionData.metadata ? JSON.parse(sessionData.metadata) : undefined,
                tags: sessionData.tags ? JSON.parse(sessionData.tags) : undefined
              });
              console.log(`Updated session: ${sessionData.uuid}`);
            } else if (options.skipConflicts) {
              console.log(`Skipping existing session: ${sessionData.uuid}`);
              continue;
            }
          } else {
            await this.databaseService.createSession({
              uuid: sessionData.uuid,
              name: sessionData.name,
              description: sessionData.description,
              metadata: sessionData.metadata ? JSON.parse(sessionData.metadata) : undefined,
              tags: sessionData.tags ? JSON.parse(sessionData.tags) : undefined
            });
            console.log(`Created session: ${sessionData.uuid}`);
          }
        } catch (error) {
          console.error(`Failed to import session ${sessionData.uuid}:`, error);
          throw error;
        }
      }
    }

    // Import settings
    if (data.settings && options.mergeSettings) {
      try {
        await this.secureStorage.saveSettings(data.settings);
        console.log('Merged settings successfully');
      } catch (error) {
        console.error('Failed to import settings:', error);
        throw error;
      }
    }

    console.log('Import completed successfully');
  }

  async getExportTemplate(): Promise<string> {
    // Return a template for users to understand the expected format
    const template = {
      version: '1.0.0',
      exportedAt: Date.now(),
      atlasVersion: '1.0.0',
      checksum: 'placeholder-calculated-during-export',
      metadata: {
        totalJobs: 0,
        totalArtifacts: 0,
        totalSessions: 0,
        sizeBytes: 0,
        redactionApplied: true,
        compressionApplied: false
      },
      jobs: [
        {
          uuid: 'example-job-uuid',
          title: 'Example Job',
          description: 'This is an example job',
          type: 'chat',
          status: 'completed',
          priority: 1,
          provider: 'openai',
          model: 'gpt-4',
          request: '{"messages": [{"role": "user", "content": "Hello"}]}',
          response: '{"choices": [{"message": {"role": "assistant", "content": "Hello! How can I help you?"}}]}',
          metadata: '{}',
          tags: '["example", "test"]',
          sessionId: 'example-session-uuid',
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      sessions: [
        {
          uuid: 'example-session-uuid',
          name: 'Example Session',
          description: 'This is an example session',
          metadata: '{}',
          tags: '["example"]',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      settings: {
        providers: {
          openai: {
            model: 'gpt-4',
            apiKey: '[REDACTED]'
          }
        },
        preferences: {
          theme: 'dark',
          language: 'en'
        },
        security: {
          encryptionEnabled: true,
          autoLock: true,
          lockTimeout: 300000
        },
        version: '1.0.0'
      }
    };

    return JSON.stringify(template, null, 2);
  }
}