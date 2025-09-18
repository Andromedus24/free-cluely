/**
 * Validation System Test Suite
 * Tests the validation and sanitization system with realistic data
 */

import { validate, sanitize, ValidationHelper, SanitizationHelper } from '@/lib/validation';
import { dataIntegrityChecker } from '@/lib/data-integrity';
import { logger } from '@/lib/logger';
import { z } from 'zod';

export interface ValidationResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

export class ValidationTester {
  private results: ValidationResult[] = [];

  async runAllTests(): Promise<ValidationResult[]> {
    logger.info('validation-test', 'Starting validation system tests');

    this.results = [];

    await this.testUserValidation();
    await this.testKnowledgeItemValidation();
    await this.testMessageValidation();
    await this.test3DModelingValidation();
    await this.testSanitization();
    await this.testDataIntegrity();
    await this.testSecurityValidation();

    const passedCount = this.results.filter(r => r.passed).length;
    const totalCount = this.results.length;

    logger.info('validation-test', `Validation tests completed: ${passedCount}/${totalCount} passed`);

    return this.results;
  }

  private async testUserValidation(): Promise<void> {
    logger.info('validation-test', 'Testing user validation');

    // Valid user data
    const validUser = {
      email: 'john.doe@example.com',
      password: 'SecurePass123!',
      full_name: 'John Doe',
      avatar_url: 'https://example.com/avatar.jpg'
    };

    try {
      const result = validate.user.register(validUser);
      this.addResult('User validation - valid data', true);
    } catch (error) {
      this.addResult('User validation - valid data', false, error instanceof Error ? error.message : String(error));
    }

    // Invalid email
    const invalidEmailUser = { ...validUser, email: 'invalid-email' };
    try {
      validate.user.register(invalidEmailUser);
      this.addResult('User validation - invalid email', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('User validation - invalid email', true);
    }

    // Weak password
    const weakPasswordUser = { ...validUser, password: 'weak' };
    try {
      validate.user.register(weakPasswordUser);
      this.addResult('User validation - weak password', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('User validation - weak password', true);
    }

    // Missing required fields
    const incompleteUser = { email: validUser.email };
    try {
      validate.user.register(incompleteUser);
      this.addResult('User validation - missing fields', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('User validation - missing fields', true);
    }
  }

  private async testKnowledgeItemValidation(): Promise<void> {
    logger.info('validation-test', 'Testing knowledge item validation');

    // Valid knowledge item
    const validItem = {
      title: 'Introduction to TypeScript',
      content: 'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
      type: 'article' as const,
      source: 'documentation',
      tags: ['typescript', 'programming'],
      category: 'programming',
      difficulty: 'beginner' as const,
      estimatedTime: 15,
      metadata: {
        url: 'https://example.com/typescript-intro',
        author: 'Jane Smith',
        wordCount: 150
      }
    };

    try {
      const result = validate.knowledge.item(validItem);
      this.addResult('Knowledge item validation - valid data', true);
    } catch (error) {
      this.addResult('Knowledge item validation - valid data', false, error instanceof Error ? error.message : String(error));
    }

    // Content too long
    const longContentItem = { ...validItem, content: 'x'.repeat(50001) };
    try {
      validate.knowledge.item(longContentItem);
      this.addResult('Knowledge item validation - content too long', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('Knowledge item validation - content too long', true);
    }

    // Invalid time estimate
    const invalidTimeItem = { ...validItem, estimatedTime: 0 };
    try {
      validate.knowledge.item(invalidTimeItem);
      this.addResult('Knowledge item validation - invalid time', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('Knowledge item validation - invalid time', true);
    }
  }

  private async testMessageValidation(): Promise<void> {
    logger.info('validation-test', 'Testing message validation');

    // Valid message
    const validMessage = {
      content: 'Hello, world!',
      channel_id: '550e8400-e29b-41d4-a716-446655440000',
      metadata: { priority: 'normal' }
    };

    try {
      const result = validate.message.message(validMessage);
      this.addResult('Message validation - valid data', true);
    } catch (error) {
      this.addResult('Message validation - valid data', false, error instanceof Error ? error.message : String(error));
    }

    // Empty message
    const emptyMessage = { ...validMessage, content: '' };
    try {
      validate.message.message(emptyMessage);
      this.addResult('Message validation - empty content', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('Message validation - empty content', true);
    }

    // Message too long
    const longMessage = { ...validMessage, content: 'x'.repeat(10001) };
    try {
      validate.message.message(longMessage);
      this.addResult('Message validation - content too long', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('Message validation - content too long', true);
    }
  }

  private async test3DModelingValidation(): Promise<void> {
    logger.info('validation-test', 'Testing 3D modeling validation');

    // Valid scene
    const validScene = {
      name: 'Test Scene',
      description: 'A test 3D scene',
      objects: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          type: 'cube' as const,
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
          color: '#ff0000'
        }
      ],
      camera: {
        position: { x: 5, y: 5, z: 5 },
        target: { x: 0, y: 0, z: 0 }
      }
    };

    try {
      const result = validate.modeling3d.scene(validScene);
      this.addResult('3D modeling validation - valid scene', true);
    } catch (error) {
      this.addResult('3D modeling validation - valid scene', false, error instanceof Error ? error.message : String(error));
    }

    // Invalid color
    const invalidColorScene = {
      ...validScene,
      objects: [{ ...validScene.objects[0], color: 'invalid-color' }]
    };
    try {
      validate.modeling3d.scene(invalidColorScene);
      this.addResult('3D modeling validation - invalid color', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('3D modeling validation - invalid color', true);
    }

    // Invalid scale (negative)
    const invalidScaleScene = {
      ...validScene,
      objects: [{ ...validScene.objects[0], scale: { x: -1, y: 1, z: 1 } }]
    };
    try {
      validate.modeling3d.scene(invalidScaleScene);
      this.addResult('3D modeling validation - invalid scale', false, 'Should have thrown validation error');
    } catch (error) {
      this.addResult('3D modeling validation - invalid scale', true);
    }
  }

  private async testSanitization(): Promise<void> {
    logger.info('validation-test', 'Testing sanitization');

    // HTML sanitization
    const htmlInput = '<script>alert("xss")</script>Hello <b>World</b>';
    const sanitizedHtml = sanitize.input(htmlInput);
    if (!sanitizedHtml.includes('<script>') && sanitizedHtml.includes('Hello World')) {
      this.addResult('Sanitization - HTML removal', true);
    } else {
      this.addResult('Sanitization - HTML removal', false, 'HTML not properly sanitized');
    }

    // Email sanitization
    const emailInput = '  TEST@EXAMPLE.COM  ';
    const sanitizedEmail = sanitize.input(emailInput);
    if (sanitizedEmail === 'test@example.com') {
      this.addResult('Sanitization - email normalization', true);
    } else {
      this.addResult('Sanitization - email normalization', false, `Expected "test@example.com", got "${sanitizedEmail}"`);
    }

    // Path sanitization
    const pathInput = '../../../etc/passwd';
    const sanitizedPath = sanitize.path(pathInput);
    if (!sanitizedPath.includes('..') && !sanitizedPath.includes('/')) {
      this.addResult('Sanitization - path security', true);
    } else {
      this.addResult('Sanitization - path security', false, 'Path not properly sanitized');
    }

    // File name sanitization
    const filenameInput = 'malicious/file.exe';
    const sanitizedFilename = sanitize.filename(filenameInput);
    if (!sanitizedFilename.includes('/') && !sanitizedFilename.includes('\\')) {
      this.addResult('Sanitization - filename security', true);
    } else {
      this.addResult('Sanitization - filename security', false, 'Filename not properly sanitized');
    }
  }

  private async testDataIntegrity(): Promise<void> {
    logger.info('validation-test', 'Testing data integrity');

    // Valid application state
    const validState = {
      users: [
        {
          id: '1',
          email: 'user1@example.com',
          full_name: 'User One',
          created_at: new Date().toISOString()
        }
      ],
      knowledgeItems: [
        {
          id: '1',
          title: 'Test Item',
          content: 'Test content',
          type: 'note',
          source: 'test',
          tags: ['test'],
          category: 'test',
          difficulty: 'beginner',
          estimatedTime: 10,
          created_at: new Date().toISOString()
        }
      ],
      scenes: [
        {
          id: '1',
          name: 'Test Scene',
          meshes: [
            {
              id: '1',
              geometry: { type: 'box', parameters: { width: 1, height: 1, depth: 1 } }
            }
          ]
        }
      ],
      messages: [
        {
          id: '1',
          content: 'Test message',
          senderId: '1',
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      const result = dataIntegrityChecker.validateApplicationState(validState);
      if (result.valid) {
        this.addResult('Data integrity - valid state', true);
      } else {
        this.addResult('Data integrity - valid state', false, `Errors: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      this.addResult('Data integrity - valid state', false, error instanceof Error ? error.message : String(error));
    }

    // Invalid state (non-existent sender)
    const invalidState = {
      ...validState,
      messages: [
        {
          id: '2',
          content: 'Invalid message',
          senderId: 'non-existent',
          timestamp: new Date().toISOString()
        }
      ]
    };

    try {
      const result = dataIntegrityChecker.validateApplicationState(invalidState);
      if (!result.valid && result.errors.some(e => e.includes('sender not found'))) {
        this.addResult('Data integrity - invalid sender', true);
      } else {
        this.addResult('Data integrity - invalid sender', false, 'Should have detected invalid sender');
      }
    } catch (error) {
      this.addResult('Data integrity - invalid sender', false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testSecurityValidation(): Promise<void> {
    logger.info('validation-test', 'Testing security validation');

    // Test JSON validation
    const validJson = JSON.stringify({ test: 'data' });
    const jsonSchema = z.object({ test: z.string() });

    try {
      const result = ValidationHelper.validateJson(validJson, jsonSchema);
      if (result.valid) {
        this.addResult('Security - JSON validation', true);
      } else {
        this.addResult('Security - JSON validation', false, result.error);
      }
    } catch (error) {
      this.addResult('Security - JSON validation', false, error instanceof Error ? error.message : String(error));
    }

    // Test file validation
    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

    try {
      const result = ValidationHelper.validateFile(mockFile, {
        allowedTypes: ['text/plain'],
        maxSize: 1024 * 1024, // 1MB
        allowedExtensions: ['txt']
      });

      if (result.valid) {
        this.addResult('Security - file validation', true);
      } else {
        this.addResult('Security - file validation', false, result.error);
      }
    } catch (error) {
      this.addResult('Security - file validation', false, error instanceof Error ? error.message : String(error));
    }

    // Test array validation
    const items = ['valid1', 'valid2', '<script>alert("xss")</script>'];

    try {
      const result = ValidationHelper.validateArray(items, (item) => {
        const sanitized = sanitize.input(item);
        return { valid: !sanitized.includes('<script>') };
      });

      if (!result.valid && result.errors.length > 0) {
        this.addResult('Security - array validation', true);
      } else {
        this.addResult('Security - array validation', false, 'Should have detected unsafe content');
      }
    } catch (error) {
      this.addResult('Security - array validation', false, error instanceof Error ? error.message : String(error));
    }
  }

  private addResult(testName: string, passed: boolean, error?: string, details?: any): void {
    const result: ValidationResult = {
      testName,
      passed,
      error,
      details
    };

    this.results.push(result);

    if (passed) {
      logger.info('validation-test', `✓ ${testName}`);
    } else {
      logger.error('validation-test', `✗ ${testName}: ${error}`);
    }
  }

  getResults(): ValidationResult[] {
    return this.results;
  }

  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, successRate };
  }
}

// Export singleton instance
export const validationTester = new ValidationTester();

// Utility function to run tests and return results
export async function runValidationTests(): Promise<{
  results: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    successRate: number;
  };
}> {
  const results = await validationTester.runAllTests();
  const summary = validationTester.getSummary();

  return { results, summary };
}

export default ValidationTester;