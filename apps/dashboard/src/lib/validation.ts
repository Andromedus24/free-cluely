/**
 * Comprehensive Data Validation and Sanitization System
 * Provides validation schemas, sanitization functions, and data integrity checks
 */

import { z } from 'zod';
import { security } from './security';

// Common validation patterns
export const ValidationPatterns = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+\..+/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[\d\s-]{10,15}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
};

// User validation schemas
export const UserSchemas = {
  // Login credentials
  Login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),

  // Registration data
  Register: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(ValidationPatterns.PASSWORD, 'Password must contain uppercase, lowercase, number, and special character'),
    full_name: z.string().min(2, 'Full name must be at least 2 characters').max(50, 'Full name too long'),
    avatar_url: z.string().url('Invalid avatar URL').optional().nullable(),
  }),

  // Profile update
  ProfileUpdate: z.object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters').max(50, 'Full name too long').optional(),
    avatar_url: z.string().url('Invalid avatar URL').optional().nullable(),
    email: z.string().email('Invalid email format').optional(),
  }),

  // Password update
  PasswordUpdate: z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string()
      .min(8, 'New password must be at least 8 characters')
      .regex(ValidationPatterns.PASSWORD, 'New password must contain uppercase, lowercase, number, and special character'),
  }),

  // User settings
  Settings: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().min(2, 'Language code required').max(5, 'Invalid language code').optional(),
    timezone: z.string().min(1, 'Timezone required').optional(),
    notifications: z.object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      desktop: z.boolean().optional(),
      frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
    }).optional(),
    privacy: z.object({
      profile_visibility: z.enum(['public', 'private', 'friends']).optional(),
      data_collection: z.boolean().optional(),
      analytics: z.boolean().optional(),
    }).optional(),
    integrations: z.object({
      google: z.boolean().optional(),
      github: z.boolean().optional(),
      slack: z.boolean().optional(),
      discord: z.boolean().optional(),
    }).optional(),
  }),
};

// App validation schemas
export const AppSchemas = {
  // App creation/update
  App: z.object({
    name: z.string().min(1, 'App name is required').max(100, 'App name too long'),
    description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
    category: z.string().min(1, 'Category is required'),
    icon: z.string().url('Invalid icon URL').optional().nullable(),
    url: z.string().url('Invalid app URL').optional().nullable(),
    is_premium: z.boolean().optional(),
    tags: z.array(z.string().min(1, 'Tag too short').max(20, 'Tag too long')).max(10, 'Too many tags').optional(),
  }),

  // App installation
  Installation: z.object({
    app_id: z.string().uuid('Invalid app ID'),
    settings: z.record(z.unknown()).optional(),
  }),
};

// Message validation schemas
export const MessageSchemas = {
  // Message creation
  Message: z.object({
    content: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
    channel_id: z.string().uuid('Invalid channel ID'),
    metadata: z.record(z.unknown()).optional(),
  }),

  // Channel creation
  Channel: z.object({
    name: z.string().min(1, 'Channel name required').max(50, 'Channel name too long'),
    description: z.string().max(200, 'Description too long').optional(),
    is_private: z.boolean().optional(),
    tags: z.array(z.string()).max(5, 'Too many tags').optional(),
  }),
};

// Knowledge management schemas
export const KnowledgeSchemas = {
  // Knowledge item creation
  KnowledgeItem: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
    type: z.enum(['note', 'article', 'video', 'document', 'link']),
    tags: z.array(z.string().min(1, 'Tag too short').max(20, 'Tag too long')).max(20, 'Too many tags').optional(),
    url: z.string().url('Invalid URL').optional().nullable(),
    metadata: z.record(z.unknown()).optional(),
  }),

  // Quiz generation
  Quiz: z.object({
    title: z.string().min(1, 'Quiz title required').max(100, 'Title too long'),
    questions: z.array(z.object({
      question: z.string().min(1, 'Question required').max(500, 'Question too long'),
      options: z.array(z.string().min(1, 'Option required')).min(2, 'At least 2 options required').max(6, 'Too many options'),
      correct_answer: z.number().int('Correct answer must be an integer').min(0, 'Invalid answer index'),
      explanation: z.string().max(500, 'Explanation too long').optional(),
    })).min(1, 'At least 1 question required').max(50, 'Too many questions'),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    time_limit: z.number().int('Time limit must be an integer').positive('Time limit must be positive').optional(),
  }),
};

// 3D modeling schemas
export const Modeling3DSchemas = {
  // Scene creation
  Scene: z.object({
    name: z.string().min(1, 'Scene name required').max(50, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    objects: z.array(z.object({
      id: z.string().uuid('Invalid object ID'),
      type: z.enum(['cube', 'sphere', 'cylinder', 'plane', 'cone', 'torus']),
      position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
      rotation: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
      scale: z.object({
        x: z.number().positive('Scale must be positive'),
        y: z.number().positive('Scale must be positive'),
        z: z.number().positive('Scale must be positive'),
      }),
      color: z.string().regex(ValidationPatterns.HEX_COLOR, 'Invalid color format'),
    })).optional(),
    camera: z.object({
      position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
      target: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }),
    }).optional(),
  }),

  // Object manipulation
  ObjectUpdate: z.object({
    id: z.string().uuid('Invalid object ID'),
    position: z.object({
      x: z.number().optional(),
      y: z.number().optional(),
      z: z.number().optional(),
    }).optional(),
    rotation: z.object({
      x: z.number().optional(),
      y: z.number().optional(),
      z: z.number().optional(),
    }).optional(),
    scale: z.object({
      x: z.number().positive('Scale must be positive').optional(),
      y: z.number().positive('Scale must be positive').optional(),
      z: z.number().positive('Scale must be positive').optional(),
    }).optional(),
    color: z.string().regex(ValidationPatterns.HEX_COLOR, 'Invalid color format').optional(),
  }),
};

// Voice assistant schemas
export const VoiceSchemas = {
  // Voice command
  Command: z.object({
    transcript: z.string().min(1, 'Transcript is required').max(500, 'Transcript too long'),
    intent: z.string().min(1, 'Intent required').max(50, 'Intent too long'),
    confidence: z.number().min(0, 'Confidence must be between 0 and 1').max(1, 'Confidence must be between 0 and 1'),
    entities: z.record(z.unknown()).optional(),
    action: z.object({
      type: z.string().min(1, 'Action type required'),
      parameters: z.record(z.unknown()).optional(),
    }).optional(),
  }),

  // Voice memory
  Memory: z.object({
    id: z.string().uuid('Invalid memory ID'),
    transcript: z.string().min(1, 'Transcript required').max(1000, 'Transcript too long'),
    response: z.string().min(1, 'Response required').max(2000, 'Response too long'),
    intent: z.string().min(1, 'Intent required').max(50, 'Intent too long'),
    timestamp: z.string().datetime('Invalid timestamp'),
    context: z.record(z.unknown()).optional(),
    tags: z.array(z.string()).max(10, 'Too many tags').optional(),
  }),
};

// File validation schemas
export const FileSchemas = {
  // File upload
  Upload: z.object({
    file: z.instanceof(File, 'Invalid file'),
    path: z.string().min(1, 'Path is required').max(200, 'Path too long'),
    allowed_types: z.array(z.string()).optional(),
    max_size: z.number().positive('Max size must be positive').optional(),
  }),

  // File metadata
  Metadata: z.object({
    name: z.string().min(1, 'File name required').max(255, 'File name too long'),
    size: z.number().positive('File size must be positive'),
    type: z.string().min(1, 'File type required'),
    last_modified: z.string().datetime('Invalid last modified date').optional(),
    checksum: z.string().min(1, 'Checksum required').optional(),
  }),
};

// Validation helpers
export class ValidationHelper {
  // Validate and sanitize email
  static validateEmail(email: string): { valid: boolean; sanitized?: string; error?: string } {
    try {
      const sanitized = email.trim().toLowerCase();
      if (!ValidationPatterns.EMAIL.test(sanitized)) {
        return { valid: false, error: 'Invalid email format' };
      }
      return { valid: true, sanitized };
    } catch (error) {
      return { valid: false, error: 'Email validation failed' };
    }
  }

  // Validate and sanitize URL
  static validateUrl(url: string): { valid: boolean; sanitized?: string; error?: string } {
    try {
      const sanitized = security.sanitize.url(url);
      if (sanitized === '#invalid-url') {
        return { valid: false, error: 'Invalid URL format' };
      }
      return { valid: true, sanitized };
    } catch (error) {
      return { valid: false, error: 'URL validation failed' };
    }
  }

  // Validate and sanitize text input
  static validateText(text: string, options: {
    min?: number;
    max?: number;
    allowHtml?: boolean;
    trim?: boolean;
  } = {}): { valid: boolean; sanitized?: string; error?: string } {
    try {
      let sanitized = text;

      // Apply sanitization
      if (options.allowHtml) {
        sanitized = security.sanitize.htmlContent(sanitized);
      } else {
        sanitized = security.sanitize.html(sanitized);
      }

      if (options.trim) {
        sanitized = sanitized.trim();
      }

      // Validate length
      if (options.min && sanitized.length < options.min) {
        return { valid: false, error: `Text must be at least ${options.min} characters` };
      }

      if (options.max && sanitized.length > options.max) {
        return { valid: false, error: `Text must be no more than ${options.max} characters` };
      }

      return { valid: true, sanitized };
    } catch (error) {
      return { valid: false, error: 'Text validation failed' };
    }
  }

  // Validate file
  static validateFile(file: File, options: {
    allowedTypes?: string[];
    maxSize?: number;
    allowedExtensions?: string[];
  } = {}): { valid: boolean; error?: string } {
    try {
      // Check file size
      if (options.maxSize && file.size > options.maxSize) {
        return { valid: false, error: `File size must be less than ${options.maxSize / 1024 / 1024}MB` };
      }

      // Check file type
      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        return { valid: false, error: `File type ${file.type} is not allowed` };
      }

      // Check file extension
      if (options.allowedExtensions) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !options.allowedExtensions.includes(extension)) {
          return { valid: false, error: `File extension .${extension} is not allowed` };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'File validation failed' };
    }
  }

  // Validate JSON data
  static validateJson(json: string, schema: z.ZodSchema<any>): { valid: boolean; data?: any; error?: string } {
    try {
      const parsed = JSON.parse(json);
      const result = schema.safeParse(parsed);

      if (!result.success) {
        return { valid: false, error: result.error.errors[0].message };
      }

      return { valid: true, data: result.data };
    } catch (error) {
      return { valid: false, error: 'Invalid JSON format' };
    }
  }

  // Validate array of items
  static validateArray<T>(items: T[], validator: (item: T) => { valid: boolean; error?: string }): { valid: boolean; sanitized?: T[]; errors: string[] } {
    const errors: string[] = [];
    const sanitized: T[] = [];

    for (let i = 0; i < items.length; i++) {
      const result = validator(items[i]);
      if (result.valid) {
        sanitized.push(items[i]);
      } else {
        errors.push(`Item ${i + 1}: ${result.error}`);
      }
    }

    return {
      valid: errors.length === 0,
      sanitized: errors.length === 0 ? items : sanitized,
      errors,
    };
  }
}

// Sanitization helpers
export class SanitizationHelper {
  // Sanitize user input for safe display
  static sanitizeInput(input: string, options: {
    allowHtml?: boolean;
    maxLength?: number;
    trim?: boolean;
  } = {}): string {
    let sanitized = input;

    if (options.trim) {
      sanitized = sanitized.trim();
    }

    if (options.allowHtml) {
      sanitized = security.sanitize.htmlContent(sanitized);
    } else {
      sanitized = security.sanitize.html(sanitized);
    }

    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    return sanitized;
  }

  // Sanitize filename
  static sanitizeFilename(filename: string): string {
    return security.sanitize.fileName(filename);
  }

  // Sanitize file path
  static sanitizePath(path: string): string {
    return path.replace(/[\\\/:*?"<>|]/g, '_').replace(/\.\./g, '_');
  }

  // Sanitize HTML attributes
  static sanitizeHtmlAttributes(attributes: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(attributes)) {
      sanitized[key] = this.sanitizeInput(value, { allowHtml: false });
    }

    return sanitized;
  }

  // Sanitize CSS
  static sanitizeCss(css: string): string {
    // Remove potentially dangerous CSS
    return css
      .replace(/javascript:/gi, '')
      .replace(/expression\(/gi, '')
      .replace(/import\s+/gi, '')
      .replace(/@import\s+/gi, '')
      .replace(/url\s*\(\s*['"]?\s*javascript:/gi, '')
      .replace(/behaviou?r:/gi, '')
      .replace(/-moz-binding/gi, '')
      .replace(/<[^>]*>/g, '');
  }
}

// Data integrity validation
export class DataIntegrityValidator {
  // Validate data consistency
  static validateConsistency(data: any, rules: Record<string, (value: any) => boolean>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [path, validator] of Object.entries(rules)) {
      const value = this.getNestedValue(data, path);
      if (!validator(value)) {
        errors.push(`Consistency check failed for ${path}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Validate referential integrity
  static validateReferences(data: any, references: Array<{
    path: string;
    referencePath: string;
    message: string;
  }>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const ref of references) {
      const value = this.getNestedValue(data, ref.path);
      const referenceValue = this.getNestedValue(data, ref.referencePath);

      if (value && !referenceValue) {
        errors.push(ref.message);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Validate business rules
  static validateBusinessRules(data: any, rules: Array<{
    name: string;
    validator: (data: any) => boolean;
    message: string;
  }>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of rules) {
      if (!rule.validator(data)) {
        errors.push(rule.message);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Export validation functions
export const validate = {
  user: {
    login: (data: unknown) => UserSchemas.Login.parse(data),
    register: (data: unknown) => UserSchemas.Register.parse(data),
    profileUpdate: (data: unknown) => UserSchemas.ProfileUpdate.parse(data),
    passwordUpdate: (data: unknown) => UserSchemas.PasswordUpdate.parse(data),
    settings: (data: unknown) => UserSchemas.Settings.parse(data),
  },
  app: {
    app: (data: unknown) => AppSchemas.App.parse(data),
    installation: (data: unknown) => AppSchemas.Installation.parse(data),
  },
  message: {
    message: (data: unknown) => MessageSchemas.Message.parse(data),
    channel: (data: unknown) => MessageSchemas.Channel.parse(data),
  },
  knowledge: {
    item: (data: unknown) => KnowledgeSchemas.KnowledgeItem.parse(data),
    quiz: (data: unknown) => KnowledgeSchemas.Quiz.parse(data),
  },
  modeling3d: {
    scene: (data: unknown) => Modeling3DSchemas.Scene.parse(data),
    objectUpdate: (data: unknown) => Modeling3DSchemas.ObjectUpdate.parse(data),
  },
  voice: {
    command: (data: unknown) => VoiceSchemas.Command.parse(data),
    memory: (data: unknown) => VoiceSchemas.Memory.parse(data),
  },
  file: {
    upload: (data: unknown) => FileSchemas.Upload.parse(data),
    metadata: (data: unknown) => FileSchemas.Metadata.parse(data),
  },
};

export const sanitize = {
  input: SanitizationHelper.sanitizeInput,
  filename: SanitizationHelper.sanitizeFilename,
  path: SanitizationHelper.sanitizePath,
  htmlAttributes: SanitizationHelper.sanitizeHtmlAttributes,
  css: SanitizationHelper.sanitizeCss,
};

export const validateIntegrity = {
  consistency: DataIntegrityValidator.validateConsistency,
  references: DataIntegrityValidator.validateReferences,
  businessRules: DataIntegrityValidator.validateBusinessRules,
};

export default {
  ValidationHelper,
  SanitizationHelper,
  DataIntegrityValidator,
  validate,
  sanitize,
  validateIntegrity,
  ValidationPatterns,
};