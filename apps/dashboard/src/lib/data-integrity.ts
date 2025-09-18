/**
 * Data Integrity Validation System
 * Ensures consistency and validity of data across the application
 */

import { validateIntegrity } from '@/lib/validation';
import { logger } from '@/lib/logger';

export interface IntegrityRule {
  name: string;
  description: string;
  validator: (data: any) => boolean;
  errorMessage: string;
  severity: 'error' | 'warning';
}

export interface ReferentialConstraint {
  fromPath: string;
  toPath: string;
  constraint: 'exists' | 'unique' | 'not_null';
  errorMessage: string;
}

export class DataIntegrityChecker {
  private static instance: DataIntegrityChecker;
  private rules: Map<string, IntegrityRule> = new Map();
  private constraints: Map<string, ReferentialConstraint[]> = new Map();

  private constructor() {
    this.initializeRules();
  }

  static getInstance(): DataIntegrityChecker {
    if (!DataIntegrityChecker.instance) {
      DataIntegrityChecker.instance = new DataIntegrityChecker();
    }
    return DataIntegrityChecker.instance;
  }

  private initializeRules() {
    // User data integrity rules
    this.addRule({
      name: 'user_email_format',
      description: 'User email must be in valid format',
      validator: (user: any) => {
        if (!user.email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email);
      },
      errorMessage: 'Invalid email format',
      severity: 'error'
    });

    this.addRule({
      name: 'user_name_required',
      description: 'User must have a valid name',
      validator: (user: any) => {
        if (!user.full_name) return false;
        return user.full_name.trim().length >= 2;
      },
      errorMessage: 'User name must be at least 2 characters',
      severity: 'error'
    });

    // Knowledge item integrity rules
    this.addRule({
      name: 'knowledge_item_content',
      description: 'Knowledge items must have valid content',
      validator: (item: any) => {
        if (!item.content) return false;
        return item.content.trim().length > 0 && item.content.length <= 50000;
      },
      errorMessage: 'Knowledge item content must be between 1 and 50,000 characters',
      severity: 'error'
    });

    this.addRule({
      name: 'knowledge_item_time_estimate',
      description: 'Knowledge item time estimates must be reasonable',
      validator: (item: any) => {
        if (!item.estimatedTime) return false;
        return item.estimatedTime >= 1 && item.estimatedTime <= 480; // 1 min to 8 hours
      },
      errorMessage: 'Estimated time must be between 1 and 480 minutes',
      severity: 'warning'
    });

    // 3D modeling integrity rules
    this.addRule({
      name: 'mesh_geometry_valid',
      description: '3D meshes must have valid geometry',
      validator: (mesh: any) => {
        if (!mesh.geometry || !mesh.geometry.type) return false;
        const validTypes = ['box', 'sphere', 'cylinder', 'plane', 'custom'];
        return validTypes.includes(mesh.geometry.type);
      },
      errorMessage: 'Invalid mesh geometry type',
      severity: 'error'
    });

    this.addRule({
      name: 'scene_object_count',
      description: 'Scenes should not have excessive objects',
      validator: (scene: any) => {
        if (!scene.meshes) return true;
        return scene.meshes.length <= 1000; // Performance limit
      },
      errorMessage: 'Scene has too many objects (max 1000)',
      severity: 'warning'
    });

    // Message integrity rules
    this.addRule({
      name: 'message_content_length',
      description: 'Messages must have reasonable length',
      validator: (message: any) => {
        if (!message.content) return false;
        return message.content.length <= 10000;
      },
      errorMessage: 'Message content too long (max 10,000 characters)',
      severity: 'error'
    });

    this.addRule({
      name: 'message_sender_exists',
      description: 'Message must have valid sender',
      validator: (message: any, users: any[]) => {
        if (!message.senderId) return false;
        return users.some(user => user.id === message.senderId);
      },
      errorMessage: 'Message sender not found',
      severity: 'error'
    });
  }

  addRule(rule: IntegrityRule) {
    this.rules.set(rule.name, rule);
  }

  addConstraint(constraint: ReferentialConstraint) {
    const key = `${constraint.fromPath}:${constraint.toPath}`;
    if (!this.constraints.has(key)) {
      this.constraints.set(key, []);
    }
    this.constraints.get(key)!.push(constraint);
  }

  validateData(data: any, rules: string[]): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const ruleName of rules) {
      const rule = this.rules.get(ruleName);
      if (!rule) {
        logger.warn('data-integrity', `Rule not found: ${ruleName}`);
        continue;
      }

      try {
        const isValid = rule.validator(data);
        if (!isValid) {
          if (rule.severity === 'error') {
            errors.push(rule.errorMessage);
          } else {
            warnings.push(rule.errorMessage);
          }
        }
      } catch (error) {
        logger.error('data-integrity', `Rule validation failed: ${ruleName}`, error);
        errors.push(`Validation error for rule ${ruleName}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateReferentialIntegrity(data: any, constraints: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const constraintKey of constraints) {
      const constraintList = this.constraints.get(constraintKey);
      if (!constraintList) continue;

      for (const constraint of constraintList) {
        try {
          const fromValue = this.getNestedValue(data, constraint.fromPath);
          const toValue = this.getNestedValue(data, constraint.toPath);

          let isValid = true;
          switch (constraint.constraint) {
            case 'exists':
              isValid = fromValue && toValue !== undefined;
              break;
            case 'unique':
              // This would require checking against a database or collection
              isValid = true; // Placeholder
              break;
            case 'not_null':
              isValid = fromValue !== null && fromValue !== undefined;
              break;
          }

          if (!isValid) {
            errors.push(constraint.errorMessage);
          }
        } catch (error) {
          logger.error('data-integrity', `Referential constraint validation failed: ${constraintKey}`, error);
          errors.push(`Referential integrity error for ${constraintKey}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateBusinessRules(data: any, context: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Business rule: User cannot be in more than 50 channels
    if (data.channels && Array.isArray(data.channels)) {
      if (data.channels.length > 50) {
        errors.push('User cannot be in more than 50 channels');
      }
    }

    // Business rule: Knowledge items in a dataset should be related
    if (data.datasets && Array.isArray(data.datasets)) {
      for (const dataset of data.datasets) {
        if (dataset.items && Array.isArray(dataset.items)) {
          const categories = new Set(dataset.items.map((item: any) => item.category));
          if (categories.size > 10) {
            errors.push(`Dataset "${dataset.name}" has too many diverse categories (max 10)`);
          }
        }
      }
    }

    // Business rule: 3D scenes should have reasonable memory usage
    if (data.scenes && Array.isArray(data.scenes)) {
      for (const scene of data.scenes) {
        if (scene.meshes && Array.isArray(scene.meshes)) {
          const totalVertices = scene.meshes.reduce((sum: number, mesh: any) => {
            return sum + (mesh.geometry?.vertices?.length || 0);
          }, 0);

          if (totalVertices > 1000000) { // 1M vertices
            errors.push(`Scene "${scene.name}" has too many vertices (max 1M)`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  validateConsistency(data: any, rules: Record<string, (value: any) => boolean>): { valid: boolean; errors: string[] } {
    return validateIntegrity.consistency(data, rules);
  }

  validateReferences(data: any, references: Array<{
    path: string;
    referencePath: string;
    message: string;
  }>): { valid: boolean; errors: string[] } {
    return validateIntegrity.references(data, references);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // Validate complete application state
  validateApplicationState(state: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    summary: {
      users: number;
      knowledgeItems: number;
      scenes: number;
      messages: number;
    };
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const summary = {
      users: state.users?.length || 0,
      knowledgeItems: state.knowledgeItems?.length || 0,
      scenes: state.scenes?.length || 0,
      messages: state.messages?.length || 0,
    };

    // Validate users
    if (state.users && Array.isArray(state.users)) {
      for (const user of state.users) {
        const userValidation = this.validateData(user, [
          'user_email_format',
          'user_name_required'
        ]);

        errors.push(...userValidation.errors);
        warnings.push(...userValidation.warnings);
      }
    }

    // Validate knowledge items
    if (state.knowledgeItems && Array.isArray(state.knowledgeItems)) {
      for (const item of state.knowledgeItems) {
        const itemValidation = this.validateData(item, [
          'knowledge_item_content',
          'knowledge_item_time_estimate'
        ]);

        errors.push(...itemValidation.errors);
        warnings.push(...itemValidation.warnings);
      }
    }

    // Validate scenes
    if (state.scenes && Array.isArray(state.scenes)) {
      for (const scene of state.scenes) {
        const sceneValidation = this.validateData(scene, [
          'scene_object_count'
        ]);

        errors.push(...sceneValidation.errors);
        warnings.push(...sceneValidation.warnings);

        // Validate meshes in scene
        if (scene.meshes && Array.isArray(scene.meshes)) {
          for (const mesh of scene.meshes) {
            const meshValidation = this.validateData(mesh, [
              'mesh_geometry_valid'
            ]);

            errors.push(...meshValidation.errors);
            warnings.push(...meshValidation.warnings);
          }
        }
      }
    }

    // Validate messages
    if (state.messages && Array.isArray(state.messages)) {
      for (const message of state.messages) {
        const messageValidation = this.validateData(message, [
          'message_content_length'
        ]);

        errors.push(...messageValidation.errors);
        warnings.push(...messageValidation.warnings);

        // Check sender exists
        const senderValidation = this.validateData(message, ['message_sender_exists'], state.users);
        errors.push(...senderValidation.errors);
      }
    }

    // Validate business rules
    const businessValidation = this.validateBusinessRules(state, {});
    errors.push(...businessValidation.errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary,
    };
  }
}

// Export singleton instance
export const dataIntegrityChecker = DataIntegrityChecker.getInstance();

// Hook for data integrity checking
export function useDataIntegrity() {
  const validateUserData = (user: any) => {
    return dataIntegrityChecker.validateData(user, [
      'user_email_format',
      'user_name_required'
    ]);
  };

  const validateKnowledgeItem = (item: any) => {
    return dataIntegrityChecker.validateData(item, [
      'knowledge_item_content',
      'knowledge_item_time_estimate'
    ]);
  };

  const validateScene = (scene: any) => {
    return dataIntegrityChecker.validateData(scene, [
      'scene_object_count'
    ]);
  };

  const validateMessage = (message: any, users: any[]) => {
    return dataIntegrityChecker.validateData(message, [
      'message_content_length',
      'message_sender_exists'
    ]);
  };

  const validateApplicationState = (state: any) => {
    return dataIntegrityChecker.validateApplicationState(state);
  };

  return {
    validateUserData,
    validateKnowledgeItem,
    validateScene,
    validateMessage,
    validateApplicationState,
    dataIntegrityChecker,
  };
}

export default DataIntegrityChecker;