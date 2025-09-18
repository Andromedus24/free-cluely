// Validation Adapter Implementation
// =================================

import {
  ValidationAdapter,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SettingsSchema,
  CustomValidator,
  SettingsData
} from '../types';

export class ValidationAdapter implements ValidationAdapter {
  private schemas: Map<string, SettingsSchema> = new Map();
  private validators: Map<string, CustomValidator> = new Map();
  private strictMode: boolean = false;

  constructor(strictMode: boolean = false) {
    this.strictMode = strictMode;
  }

  async validate(data: SettingsData): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate against main schema
    const mainSchema = this.schemas.get('main');
    if (mainSchema) {
      const result = await this.validateSchema(mainSchema, data);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Validate specific sections
    const sectionSchemas = ['profile', 'preferences', 'features', 'providers', 'appearance', 'notifications', 'privacy', 'advanced'];
    for (const section of sectionSchemas) {
      const schema = this.schemas.get(section);
      if (schema && (data as any)[section]) {
        const result = await this.validateSchema(schema, (data as any)[section]);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    }

    // Run custom validators
    for (const validator of this.validators.values()) {
      try {
        const result = await validator.validate(data);
        if (!result.valid) {
          errors.push(...result.errors);
        }
        warnings.push(...result.warnings);
      } catch (error) {
        errors.push({
          path: 'custom',
          message: `Custom validator '${validator.name}' failed: ${error}`,
          value: data,
          constraint: 'custom-validator',
          severity: 'error'
        });
      }
    }

    // Validate metadata
    const metadataErrors = this.validateMetadata(data.metadata);
    errors.push(...metadataErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        timestamp: Date.now(),
        validator: 'ValidationAdapter',
        schemasChecked: Array.from(this.schemas.keys()),
        validatorsRun: Array.from(this.validators.keys())
      }
    };
  }

  async validateSchema(schema: SettingsSchema, data: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      await this.validateAgainstSchema(schema, data, '', errors, warnings);
    } catch (error) {
      errors.push({
        path: '',
        message: `Schema validation failed: ${error}`,
        value: data,
        constraint: 'schema-validation',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateCustom(validator: CustomValidator, value: any): Promise<ValidationResult> {
    try {
      return await validator.validate(value);
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: 'custom',
          message: `Custom validation failed: ${error}`,
          value,
          constraint: validator.name,
          severity: 'error'
        }],
        warnings: []
      };
    }
  }

  private async validateAgainstSchema(
    schema: SettingsSchema,
    data: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    // Handle $ref
    if (schema.$ref) {
      const refSchema = this.schemas.get(schema.$ref.replace('#/definitions/', ''));
      if (refSchema) {
        await this.validateAgainstSchema(refSchema, data, path, errors, warnings);
        return;
      } else {
        errors.push({
          path,
          message: `Reference not found: ${schema.$ref}`,
          value: data,
          constraint: '$ref',
          severity: 'error'
        });
        return;
      }
    }

    // Check if data is undefined/null and field is required
    if (data === undefined || data === null) {
      if (schema.required && schema.required.includes(path.split('.').pop()!)) {
        errors.push({
          path,
          message: 'Required field is missing',
          value: data,
          constraint: 'required',
          severity: 'error'
        });
      }
      return;
    }

    // Type validation
    if (schema.type) {
      await this.validateType(schema.type, data, path, errors, warnings);
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(data)) {
      errors.push({
        path,
        message: `Value must be one of: ${schema.enum.join(', ')}`,
        value: data,
        constraint: 'enum',
        severity: 'error'
      });
    }

    // Const validation
    if (schema.const !== undefined && data !== schema.const) {
      errors.push({
        path,
        message: `Value must be: ${schema.const}`,
        value: data,
        constraint: 'const',
        severity: 'error'
      });
    }

    // Numeric validations
    if (typeof data === 'number') {
      if (schema.minimum !== undefined && data < schema.minimum) {
        errors.push({
          path,
          message: `Value must be at least ${schema.minimum}`,
          value: data,
          constraint: 'minimum',
          severity: 'error'
        });
      }

      if (schema.maximum !== undefined && data > schema.maximum) {
        errors.push({
          path,
          message: `Value must be at most ${schema.maximum}`,
          value: data,
          constraint: 'maximum',
          severity: 'error'
        });
      }
    }

    // String validations
    if (typeof data === 'string') {
      if (schema.minLength !== undefined && data.length < schema.minLength) {
        errors.push({
          path,
          message: `String must be at least ${schema.minLength} characters long`,
          value: data,
          constraint: 'minLength',
          severity: 'error'
        });
      }

      if (schema.maxLength !== undefined && data.length > schema.maxLength) {
        errors.push({
          path,
          message: `String must be at most ${schema.maxLength} characters long`,
          value: data,
          constraint: 'maxLength',
          severity: 'error'
        });
      }

      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          errors.push({
            path,
            message: `String must match pattern: ${schema.pattern}`,
            value: data,
            constraint: 'pattern',
            severity: 'error'
          });
        }
      }

      if (schema.format) {
        await this.validateFormat(schema.format, data, path, errors, warnings);
      }
    }

    // Array validation
    if (Array.isArray(data) && schema.items) {
      for (let i = 0; i < data.length; i++) {
        await this.validateAgainstSchema(
          schema.items,
          data[i],
          path ? `${path}[${i}]` : `[${i}]`,
          errors,
          warnings
        );
      }
    }

    // Object validation
    if (typeof data === 'object' && data !== null && schema.properties) {
      // Check required properties
      if (schema.required) {
        for (const requiredProp of schema.required) {
          if (!(requiredProp in data)) {
            errors.push({
              path: path ? `${path}.${requiredProp}` : requiredProp,
              message: 'Required property is missing',
              value: data,
              constraint: 'required',
              severity: 'error'
            });
          }
        }
      }

      // Validate properties
      for (const [prop, propSchema] of Object.entries(schema.properties)) {
        if (prop in data) {
          await this.validateAgainstSchema(
            propSchema,
            data[prop],
            path ? `${path}.${prop}` : prop,
            errors,
            warnings
          );
        }
      }

      // Check additional properties
      if (schema.additionalProperties === false) {
        const allowedProps = Object.keys(schema.properties || {});
        const extraProps = Object.keys(data).filter(prop => !allowedProps.includes(prop));

        for (const extraProp of extraProps) {
          warnings.push({
            path: path ? `${path}.${extraProp}` : extraProp,
            message: 'Additional property not allowed in schema',
            value: data[extraProp],
            suggestion: 'Remove this property or update schema to allow it'
          });
        }
      }
    }

    // Dependencies validation
    if (schema.dependencies) {
      for (const [dep, depSchema] of Object.entries(schema.dependencies)) {
        if (dep in data) {
          await this.validateAgainstSchema(
            depSchema as SettingsSchema,
            data,
            path,
            errors,
            warnings
          );
        }
      }
    }

    // Default value application
    if (schema.default !== undefined && data === undefined) {
      warnings.push({
        path,
        message: 'Using default value',
        value: schema.default,
        suggestion: 'Consider explicitly setting this value'
      });
    }
  }

  private async validateType(
    type: string | string[],
    data: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const types = Array.isArray(type) ? type : [type];
    const actualType = this.getDataType(data);

    if (!types.includes(actualType)) {
      errors.push({
        path,
        message: `Expected type ${types.join(' or ')}, got ${actualType}`,
        value: data,
        constraint: 'type',
        severity: 'error'
      });
    }
  }

  private getDataType(data: any): string {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }

  private async validateFormat(
    format: string,
    value: string,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    const formatValidators: Record<string, (value: string) => boolean> = {
      'email': (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      'uri': (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      'date-time': (v) => !isNaN(Date.parse(v)),
      'date': (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      'time': (v) => /^\d{2}:\d{2}:\d{2}$/.test(v),
      'uuid': (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      'ipv4': (v) => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v),
      'ipv6': (v) => /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i.test(v),
      'hostname': (v) => /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(v),
      'json': (v) => {
        try {
          JSON.parse(v);
          return true;
        } catch {
          return false;
        }
      }
    };

    const validator = formatValidators[format];
    if (validator && !validator(value)) {
      errors.push({
        path,
        message: `Value does not match format: ${format}`,
        value,
        constraint: 'format',
        severity: 'error'
      });
    }
  }

  private validateMetadata(metadata: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!metadata.id) {
      errors.push({
        path: 'metadata.id',
        message: 'Metadata ID is required',
        value: metadata.id,
        constraint: 'required',
        severity: 'error'
      });
    }

    if (!metadata.createdAt || typeof metadata.createdAt !== 'number') {
      errors.push({
        path: 'metadata.createdAt',
        message: 'Metadata createdAt must be a timestamp',
        value: metadata.createdAt,
        constraint: 'type',
        severity: 'error'
      });
    }

    if (!metadata.updatedAt || typeof metadata.updatedAt !== 'number') {
      errors.push({
        path: 'metadata.updatedAt',
        message: 'Metadata updatedAt must be a timestamp',
        value: metadata.updatedAt,
        constraint: 'type',
        severity: 'error'
      });
    }

    if (!metadata.version || typeof metadata.version !== 'string') {
      errors.push({
        path: 'metadata.version',
        message: 'Metadata version must be a string',
        value: metadata.version,
        constraint: 'type',
        severity: 'error'
      });
    }

    return errors;
  }

  // Schema management
  addSchema(schema: SettingsSchema): void {
    this.schemas.set(schema.id, schema);
  }

  removeSchema(schemaId: string): void {
    this.schemas.delete(schemaId);
  }

  getSchema(schemaId: string): SettingsSchema | undefined {
    return this.schemas.get(schemaId);
  }

  getAllSchemas(): SettingsSchema[] {
    return Array.from(this.schemas.values());
  }

  // Custom validator management
  addValidator(validator: CustomValidator): void {
    this.validators.set(validator.id, validator);
  }

  removeValidator(validatorId: string): void {
    this.validators.delete(validatorId);
  }

  getValidator(validatorId: string): CustomValidator | undefined {
    return this.validators.get(validatorId);
  }

  getAllValidators(): CustomValidator[] {
    return Array.from(this.validators.values());
  }

  // Built-in validators
  addBuiltInValidators(): void {
    // Email validator
    this.addValidator({
      id: 'email-validator',
      name: 'Email Validator',
      schema: { type: 'string', format: 'email' },
      validate: async (value: any) => {
        if (typeof value !== 'string') {
          return {
            valid: false,
            errors: [{
              path: 'email',
              message: 'Email must be a string',
              value,
              constraint: 'type',
              severity: 'error'
            }],
            warnings: []
          };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            valid: false,
            errors: [{
              path: 'email',
              message: 'Invalid email format',
              value,
              constraint: 'format',
              severity: 'error'
            }],
            warnings: []
          };
        }

        return { valid: true, errors: [], warnings: [] };
      }
    });

    // Theme validator
    this.addValidator({
      id: 'theme-validator',
      name: 'Theme Validator',
      schema: { type: 'string', enum: ['light', 'dark', 'auto', 'system'] },
      validate: async (value: any) => {
        const validThemes = ['light', 'dark', 'auto', 'system'];
        if (!validThemes.includes(value)) {
          return {
            valid: false,
            errors: [{
              path: 'theme',
              message: `Invalid theme: ${value}`,
              value,
              constraint: 'enum',
              severity: 'error'
            }],
            warnings: []
          };
        }

        return { valid: true, errors: [], warnings: [] };
      }
    });

    // Language validator
    this.addValidator({
      id: 'language-validator',
      name: 'Language Validator',
      schema: { type: 'string', pattern: '^[a-z]{2}(-[A-Z]{2})?$' },
      validate: async (value: any) => {
        if (typeof value !== 'string') {
          return {
            valid: false,
            errors: [{
              path: 'language',
              message: 'Language must be a string',
              value,
              constraint: 'type',
              severity: 'error'
            }],
            warnings: []
          };
        }

        const langRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
        if (!langRegex.test(value)) {
          return {
            valid: false,
            errors: [{
              path: 'language',
              message: 'Invalid language format (use en, en-US, etc.)',
              value,
              constraint: 'pattern',
              severity: 'error'
            }],
            warnings: []
          };
        }

        return { valid: true, errors: [], warnings: [] };
      }
    });
  }

  // Utility methods
  setStrictMode(strict: boolean): void {
    this.strictMode = strict;
  }

  isStrictMode(): boolean {
    return this.strictMode;
  }

  async validatePartial(data: any, schemaId: string): Promise<ValidationResult> {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return {
        valid: false,
        errors: [{
          path: '',
          message: `Schema not found: ${schemaId}`,
          value: data,
          constraint: 'schema-exists',
          severity: 'error'
        }],
        warnings: []
      };
    }

    return await this.validateSchema(schema, data);
  }

  async validateField(path: string, value: any, schemaId?: string): Promise<ValidationResult> {
    // Try to find the specific field schema
    if (schemaId) {
      const schema = this.schemas.get(schemaId);
      if (schema) {
        return await this.validatePartial({ [path]: value }, schemaId);
      }
    }

    // Fallback to basic validation
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (value === undefined || value === null) {
      errors.push({
        path,
        message: 'Field value is required',
        value,
        constraint: 'required',
        severity: 'error'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}