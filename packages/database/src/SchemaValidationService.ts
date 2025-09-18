import { z } from 'zod';
import { EventEmitter } from 'events';

// Toast event types
export interface ToastEvent {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: ToastAction[];
  persistent?: boolean;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: ValidationSummary;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  value: unknown;
  suggestions?: string[];
  code?: string;
}

export interface ValidationSummary {
  totalItems: number;
  validItems: number;
  invalidItems: number;
  warnings: number;
  criticalErrors: number;
}

export interface ValidationConfig {
  enableStrictMode: boolean;
  maxErrors: number;
  maxWarnings: number;
  enableAutoFix: boolean;
  showToast: boolean;
  toastDuration: number;
  enableDetailedLogging: boolean;
}

export class SchemaValidationService extends EventEmitter {
  private config: ValidationConfig;
  private errorHistory: Map<string, ValidationError[]> = new Map();

  constructor(config?: Partial<ValidationConfig>) {
    super();
    this.config = {
      enableStrictMode: true,
      maxErrors: 100,
      maxWarnings: 50,
      enableAutoFix: false,
      showToast: true,
      toastDuration: 5000,
      enableDetailedLogging: true,
      ...config
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for validation events
    this.on('validation-error', (error: ValidationError) => {
      if (this.config.showToast) {
        this.showToast({
          id: `validation-error-${Date.now()}`,
          type: 'error',
          title: 'Validation Error',
          message: `${error.field}: ${error.message}`,
          duration: this.config.toastDuration,
          actions: error.suggestions ? [
            {
              label: 'Show Details',
              onClick: () => this.showValidationDetails(error)
            }
          ] : undefined
        });
      }
    });

    this.on('validation-warning', (warning: ValidationError) => {
      if (this.config.showToast) {
        this.showToast({
          id: `validation-warning-${Date.now()}`,
          type: 'warning',
          title: 'Validation Warning',
          message: `${warning.field}: ${warning.message}`,
          duration: this.config.toastDuration
        });
      }
    });

    this.on('validation-success', (summary: ValidationSummary) => {
      if (this.config.showToast && summary.totalItems > 0) {
        this.showToast({
          id: `validation-success-${Date.now()}`,
          type: 'success',
          title: 'Validation Complete',
          message: `Validated ${summary.totalItems} items with ${summary.warnings} warnings`,
          duration: 3000
        });
      }
    });
  }

  async validateJob(job: any, schema?: z.ZodSchema): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validItems = 0;
    let totalItems = 1;

    try {
      // Basic job validation
      const requiredFields = ['title', 'type', 'provider', 'model'];
      for (const field of requiredFields) {
        if (!job[field] || job[field] === '' || job[field] === null) {
          errors.push({
            field,
            message: `${field} is required`,
            severity: 'error',
            value: job[field],
            code: 'REQUIRED_FIELD_MISSING',
            suggestions: [`Provide a valid ${field}`]
          });
        }
      }

      // Type validation
      if (job.type && !['chat', 'vision', 'image_generation', 'code_analysis', 'other'].includes(job.type)) {
        errors.push({
          field: 'type',
          message: `Invalid job type: ${job.type}`,
          severity: 'error',
          value: job.type,
          code: 'INVALID_JOB_TYPE',
          suggestions: ['Use one of: chat, vision, image_generation, code_analysis, other']
        });
      }

      // Priority validation
      if (job.priority !== undefined) {
        if (typeof job.priority !== 'number' || job.priority < 0 || job.priority > 10) {
          errors.push({
            field: 'priority',
            message: 'Priority must be a number between 0 and 10',
            severity: 'error',
            value: job.priority,
            code: 'INVALID_PRIORITY',
            suggestions: ['Use a number between 0 (lowest) and 10 (highest)']
          });
        }
      }

      // UUID validation
      if (job.uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(job.uuid)) {
          errors.push({
            field: 'uuid',
            message: 'Invalid UUID format',
            severity: 'error',
            value: job.uuid,
            code: 'INVALID_UUID',
            suggestions: ['Use a valid UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)']
          });
        }
      }

      // Status validation
      if (job.status && !['pending', 'running', 'completed', 'failed', 'cancelled'].includes(job.status)) {
        errors.push({
          field: 'status',
          message: `Invalid job status: ${job.status}`,
          severity: 'error',
          value: job.status,
          code: 'INVALID_STATUS',
          suggestions: ['Use one of: pending, running, completed, failed, cancelled']
        });
      }

      // Request/response validation
      if (job.request && typeof job.request === 'string') {
        try {
          JSON.parse(job.request);
        } catch {
          errors.push({
            field: 'request',
            message: 'Request must be valid JSON',
            severity: 'error',
            value: job.request,
            code: 'INVALID_JSON'
          });
        }
      }

      if (job.response && typeof job.response === 'string') {
        try {
          JSON.parse(job.response);
        } catch {
          errors.push({
            field: 'response',
            message: 'Response must be valid JSON',
            severity: 'error',
            value: job.response,
            code: 'INVALID_JSON'
          });
        }
      }

      // Metadata validation
      if (job.metadata) {
        if (typeof job.metadata === 'string') {
          try {
            JSON.parse(job.metadata);
          } catch {
            errors.push({
              field: 'metadata',
              message: 'Metadata must be valid JSON',
              severity: 'error',
              value: job.metadata,
              code: 'INVALID_JSON'
            });
          }
        } else if (typeof job.metadata !== 'object') {
          errors.push({
            field: 'metadata',
            message: 'Metadata must be an object or JSON string',
            severity: 'error',
            value: job.metadata,
            code: 'INVALID_METADATA'
          });
        }
      }

      // Tags validation
      if (job.tags) {
        if (typeof job.tags === 'string') {
          try {
            const parsedTags = JSON.parse(job.tags);
            if (!Array.isArray(parsedTags)) {
              errors.push({
                field: 'tags',
                message: 'Tags must be an array',
                severity: 'error',
                value: job.tags,
                code: 'INVALID_TAGS'
              });
            }
          } catch {
            errors.push({
              field: 'tags',
              message: 'Tags must be valid JSON array',
              severity: 'error',
              value: job.tags,
              code: 'INVALID_JSON'
            });
          }
        } else if (!Array.isArray(job.tags)) {
          errors.push({
            field: 'tags',
            message: 'Tags must be an array',
            severity: 'error',
            value: job.tags,
            code: 'INVALID_TAGS'
          });
        }
      }

      // Schema validation if provided
      if (schema) {
        try {
          schema.parse(job);
        } catch (error) {
          if (error instanceof z.ZodError) {
            for (const issue of error.issues) {
              errors.push({
                field: issue.path.join('.'),
                message: issue.message,
                severity: 'error',
                value: issue,
                code: 'SCHEMA_VALIDATION_ERROR'
              });
            }
          }
        }
      }

      // Count valid items
      if (errors.length === 0) {
        validItems = 1;
      }

      // Check error limits
      if (errors.length > this.config.maxErrors) {
        errors.push({
          field: 'validation',
          message: `Too many validation errors (${errors.length}). Limit is ${this.config.maxErrors}`,
          severity: 'error',
          value: errors.length,
          code: 'TOO_MANY_ERRORS'
        });
      }

      // Emit events
      for (const error of errors) {
        this.emit('validation-error', error);
      }

      for (const warning of warnings) {
        this.emit('validation-warning', warning);
      }

      if (errors.length === 0) {
        this.emit('validation-success', {
          totalItems: 1,
          validItems: 1,
          invalidItems: 0,
          warnings: warnings.length,
          criticalErrors: 0
        });
      }

      return {
        isValid: errors.length === 0,
        errors: errors.slice(0, this.config.maxErrors),
        warnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: errors.length,
          warnings: warnings.length,
          criticalErrors: errors.filter(e => e.severity === 'error').length
        }
      };

    } catch (error) {
      const validationError: ValidationError = {
        field: 'validation',
        message: `Unexpected validation error: ${error.message}`,
        severity: 'error',
        value: error,
        code: 'VALIDATION_EXCEPTION'
      };

      this.emit('validation-error', validationError);

      return {
        isValid: false,
        errors: [validationError],
        warnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: 1,
          warnings: warnings.length,
          criticalErrors: 1
        }
      };
    }
  }

  async validateBatch(items: any[], itemType: 'job' | 'artifact' | 'session'): Promise<ValidationResult> {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];
    let validItems = 0;
    const totalItems = items.length;

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let result: ValidationResult;

        switch (itemType) {
          case 'job':
            result = await this.validateJob(item);
            break;
          case 'artifact':
            result = await this.validateArtifact(item);
            break;
          case 'session':
            result = await this.validateSession(item);
            break;
          default:
            throw new Error(`Unknown item type: ${itemType}`);
        }

        // Add index to field names for batch validation
        result.errors.forEach(error => {
          allErrors.push({
            ...error,
            field: `item[${i}].${error.field}`
          });
        });

        result.warnings.forEach(warning => {
          allWarnings.push({
            ...warning,
            field: `item[${i}].${warning.field}`
          });
        });

        if (result.isValid) {
          validItems++;
        }

        // Check if we've hit the error limit
        if (allErrors.length >= this.config.maxErrors) {
          allErrors.push({
            field: 'batch',
            message: `Stopped batch validation due to too many errors (${allErrors.length})`,
            severity: 'error',
            value: allErrors.length,
            code: 'BATCH_ERROR_LIMIT_REACHED'
          });
          break;
        }
      }

      // Emit summary event
      this.emit('validation-success', {
        totalItems,
        validItems,
        invalidItems: allErrors.length,
        warnings: allWarnings.length,
        criticalErrors: allErrors.filter(e => e.severity === 'error').length
      });

      return {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: allErrors.length,
          warnings: allWarnings.length,
          criticalErrors: allErrors.filter(e => e.severity === 'error').length
        }
      };

    } catch (error) {
      const validationError: ValidationError = {
        field: 'batch',
        message: `Batch validation failed: ${error.message}`,
        severity: 'error',
        value: error,
        code: 'BATCH_VALIDATION_EXCEPTION'
      };

      this.emit('validation-error', validationError);

      return {
        isValid: false,
        errors: [validationError],
        warnings: allWarnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: 1,
          warnings: allWarnings.length,
          criticalErrors: 1
        }
      };
    }
  }

  async validateArtifact(artifact: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validItems = 0;
    const totalItems = 1;

    try {
      // Required fields
      const requiredFields = ['name', 'type', 'filePath', 'fileSize'];
      for (const field of requiredFields) {
        if (!artifact[field] || artifact[field] === '' || artifact[field] === null) {
          errors.push({
            field,
            message: `${field} is required`,
            severity: 'error',
            value: artifact[field],
            code: 'REQUIRED_FIELD_MISSING',
            suggestions: [`Provide a valid ${field}`]
          });
        }
      }

      // Type validation
      if (artifact.type && !['screenshot', 'file', 'image', 'document', 'log', 'other'].includes(artifact.type)) {
        errors.push({
          field: 'type',
          message: `Invalid artifact type: ${artifact.type}`,
          severity: 'error',
          value: artifact.type,
          code: 'INVALID_ARTIFACT_TYPE',
          suggestions: ['Use one of: screenshot, file, image, document, log, other']
        });
      }

      // File size validation
      if (artifact.fileSize && typeof artifact.fileSize === 'number') {
        if (artifact.fileSize < 0) {
          errors.push({
            field: 'fileSize',
            message: 'File size cannot be negative',
            severity: 'error',
            value: artifact.fileSize,
            code: 'INVALID_FILE_SIZE'
          });
        } else if (artifact.fileSize > 1024 * 1024 * 1024) { // 1GB
          warnings.push({
            field: 'fileSize',
            message: 'File size is very large (>1GB)',
            severity: 'warning',
            value: artifact.fileSize,
            code: 'LARGE_FILE_SIZE'
          });
        }
      }

      // UUID validation
      if (artifact.uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(artifact.uuid)) {
          errors.push({
            field: 'uuid',
            message: 'Invalid UUID format',
            severity: 'error',
            value: artifact.uuid,
            code: 'INVALID_UUID'
          });
        }
      }

      // MIME type validation
      if (artifact.mimeType && typeof artifact.mimeType === 'string') {
        const mimeTypeRegex = /^[a-zA-Z][a-zA-Z0-9!#$&\-\^]*\/[a-zA-Z][a-zA-Z0-9!#$&\-\^]*$/;
        if (!mimeTypeRegex.test(artifact.mimeType)) {
          warnings.push({
            field: 'mimeType',
            message: 'Invalid MIME type format',
            severity: 'warning',
            value: artifact.mimeType,
            code: 'INVALID_MIME_TYPE'
          });
        }
      }

      // Count valid items
      if (errors.length === 0) {
        validItems = 1;
      }

      // Emit events
      for (const error of errors) {
        this.emit('validation-error', error);
      }

      for (const warning of warnings) {
        this.emit('validation-warning', warning);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: errors.length,
          warnings: warnings.length,
          criticalErrors: errors.filter(e => e.severity === 'error').length
        }
      };

    } catch (error) {
      const validationError: ValidationError = {
        field: 'artifact',
        message: `Artifact validation failed: ${error.message}`,
        severity: 'error',
        value: error,
        code: 'ARTIFACT_VALIDATION_EXCEPTION'
      };

      this.emit('validation-error', validationError);

      return {
        isValid: false,
        errors: [validationError],
        warnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: 1,
          warnings: warnings.length,
          criticalErrors: 1
        }
      };
    }
  }

  async validateSession(session: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validItems = 0;
    const totalItems = 1;

    try {
      // Required fields
      if (!session.uuid) {
        errors.push({
          field: 'uuid',
          message: 'Session UUID is required',
          severity: 'error',
          value: session.uuid,
          code: 'REQUIRED_FIELD_MISSING'
        });
      }

      // UUID validation
      if (session.uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(session.uuid)) {
          errors.push({
            field: 'uuid',
            message: 'Invalid UUID format',
            severity: 'error',
            value: session.uuid,
            code: 'INVALID_UUID'
          });
        }
      }

      // Metadata validation
      if (session.metadata) {
        if (typeof session.metadata === 'string') {
          try {
            JSON.parse(session.metadata);
          } catch {
            errors.push({
              field: 'metadata',
              message: 'Metadata must be valid JSON',
              severity: 'error',
              value: session.metadata,
              code: 'INVALID_JSON'
            });
          }
        } else if (typeof session.metadata !== 'object') {
          errors.push({
            field: 'metadata',
            message: 'Metadata must be an object or JSON string',
            severity: 'error',
            value: session.metadata,
            code: 'INVALID_METADATA'
          });
        }
      }

      // Tags validation
      if (session.tags) {
        if (typeof session.tags === 'string') {
          try {
            const parsedTags = JSON.parse(session.tags);
            if (!Array.isArray(parsedTags)) {
              errors.push({
                field: 'tags',
                message: 'Tags must be an array',
                severity: 'error',
                value: session.tags,
                code: 'INVALID_TAGS'
              });
            }
          } catch {
            errors.push({
              field: 'tags',
              message: 'Tags must be valid JSON array',
              severity: 'error',
              value: session.tags,
              code: 'INVALID_JSON'
            });
          }
        } else if (!Array.isArray(session.tags)) {
          errors.push({
            field: 'tags',
            message: 'Tags must be an array',
            severity: 'error',
            value: session.tags,
            code: 'INVALID_TAGS'
          });
        }
      }

      // Count valid items
      if (errors.length === 0) {
        validItems = 1;
      }

      // Emit events
      for (const error of errors) {
        this.emit('validation-error', error);
      }

      for (const warning of warnings) {
        this.emit('validation-warning', warning);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: errors.length,
          warnings: warnings.length,
          criticalErrors: errors.filter(e => e.severity === 'error').length
        }
      };

    } catch (error) {
      const validationError: ValidationError = {
        field: 'session',
        message: `Session validation failed: ${error.message}`,
        severity: 'error',
        value: error,
        code: 'SESSION_VALIDATION_EXCEPTION'
      };

      this.emit('validation-error', validationError);

      return {
        isValid: false,
        errors: [validationError],
        warnings,
        summary: {
          totalItems,
          validItems,
          invalidItems: 1,
          warnings: warnings.length,
          criticalErrors: 1
        }
      };
    }
  }

  private showToast(toast: ToastEvent): void {
    this.emit('toast', toast);
  }

  private showValidationDetails(error: ValidationError): void {
    // This could open a modal or show detailed validation information
    console.log('Validation details:', error);
    this.emit('show-validation-details', error);
  }

  // Auto-fix common validation errors
  async autoFix(item: any, itemType: 'job' | 'artifact' | 'session'): Promise<{ fixed: boolean; changes: string[] }> {
    if (!this.config.enableAutoFix) {
      return { fixed: false, changes: [] };
    }

    const changes: string[] = [];
    const original = JSON.parse(JSON.stringify(item));

    try {
      switch (itemType) {
        case 'job':
          // Auto-generate UUID if missing
          if (!item.uuid) {
            item.uuid = this.generateUUID();
            changes.push('Generated missing UUID');
          }

          // Set default priority if invalid
          if (item.priority !== undefined && (typeof item.priority !== 'number' || item.priority < 0 || item.priority > 10)) {
            item.priority = 0;
            changes.push('Fixed invalid priority (set to 0)');
          }

          // Fix JSON fields
          if (item.metadata && typeof item.metadata === 'object') {
            item.metadata = JSON.stringify(item.metadata);
            changes.push('Normalized metadata to JSON string');
          }

          if (item.tags && Array.isArray(item.tags)) {
            item.tags = JSON.stringify(item.tags);
            changes.push('Normalized tags to JSON string');
          }

          break;

        case 'artifact':
          // Auto-generate UUID if missing
          if (!item.uuid) {
            item.uuid = this.generateUUID();
            changes.push('Generated missing UUID');
          }

          break;

        case 'session':
          // Auto-generate UUID if missing
          if (!item.uuid) {
            item.uuid = this.generateUUID();
            changes.push('Generated missing UUID');
          }

          // Fix JSON fields
          if (session.metadata && typeof session.metadata === 'object') {
            session.metadata = JSON.stringify(session.metadata);
            changes.push('Normalized metadata to JSON string');
          }

          if (session.tags && Array.isArray(session.tags)) {
            session.tags = JSON.stringify(session.tags);
            changes.push('Normalized tags to JSON string');
          }

          break;
      }

      if (changes.length > 0) {
        this.showToast({
          id: `auto-fix-${Date.now()}`,
          type: 'info',
          title: 'Auto-Fix Applied',
          message: `Applied ${changes.length} automatic fixes`,
          duration: 3000,
          actions: [
            {
              label: 'View Changes',
              onClick: () => this.showAutoFixChanges(original, item, changes)
            }
          ]
        });

        return { fixed: true, changes };
      }

      return { fixed: false, changes: };

    } catch (error) {
      console.error('Auto-fix failed:', error);
      return { fixed: false, changes: [] };
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private showAutoFixChanges(original: any, fixed: any, changes: string[]): void {
    this.emit('show-auto-fix-changes', { original, fixed, changes });
  }

  // Configuration methods
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  // Error history for debugging
  getErrorHistory(field?: string): ValidationError[] {
    if (field) {
      return this.errorHistory.get(field) || [];
    }

    const allErrors: ValidationError[] = [];
    for (const errors of this.errorHistory.values()) {
      allErrors.push(...errors);
    }
    return allErrors;
  }

  clearErrorHistory(): void {
    this.errorHistory.clear();
  }

  // Validation statistics
  getValidationStats(): {
    totalValidations: number;
    successRate: number;
    averageErrorsPerValidation: number;
    mostCommonErrors: Array<{ field: string; count: number }>;
  } {
    // This would require tracking validation history
    return {
      totalValidations: 0,
      successRate: 0,
      averageErrorsPerValidation: 0,
      mostCommonErrors: []
    };
  }
}