/**
 * Validation System Tests
 * Tests the comprehensive validation and sanitization system
 */

import { validate, sanitize, ValidationHelper, SanitizationHelper } from '@/lib/validation'
import { dataIntegrityChecker } from '@/lib/data-integrity'
import { runValidationTests } from '@/lib/validation-test'

describe('Validation System', () => {
  describe('User Validation', () => {
    test('should validate correct user data', () => {
      const validUser = {
        email: 'john.doe@example.com',
        password: 'SecurePass123!',
        full_name: 'John Doe',
      }

      expect(() => validate.user.login(validUser)).not.toThrow()
    })

    test('should reject invalid email format', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        full_name: 'John Doe',
      }

      expect(() => validate.user.login(invalidUser)).toThrow()
    })

    test('should reject weak password', () => {
      const weakPasswordUser = {
        email: 'john.doe@example.com',
        password: 'weak',
        full_name: 'John Doe',
      }

      expect(() => validate.user.register(weakPasswordUser)).toThrow()
    })

    test('should validate password requirements', () => {
      const requirementsUser = {
        email: 'john.doe@example.com',
        password: 'password',
        full_name: 'John Doe',
      }

      expect(() => validate.user.register(requirementsUser)).toThrow()
    })
  })

  describe('Knowledge Item Validation', () => {
    test('should validate correct knowledge item', () => {
      const validItem = {
        title: 'Introduction to TypeScript',
        content: 'TypeScript is a typed superset of JavaScript.',
        type: 'article',
        source: 'documentation',
        tags: ['typescript', 'programming'],
        category: 'programming',
        difficulty: 'beginner',
        estimatedTime: 15,
      }

      expect(() => validate.knowledge.item(validItem)).not.toThrow()
    })

    test('should reject content that is too long', () => {
      const longContentItem = {
        title: 'Test',
        content: 'x'.repeat(50001),
        type: 'article' ,
        source: 'test',
        tags: ['test'],
        category: 'test',
        difficulty: 'beginner' ,
        estimatedTime: 15,
      }

      expect(() => validate.knowledge.item(longContentItem)).toThrow()
    })

    test('should reject invalid time estimate', () => {
      const invalidTimeItem = {
        title: 'Test',
        content: 'Test content',
        type: 'article' ,
        source: 'test',
        tags: ['test'],
        category: 'test',
        difficulty: 'beginner' ,
        estimatedTime: 0,
      }

      expect(() => validate.knowledge.item(invalidTimeItem)).toThrow()
    })
  })

  describe('Message Validation', () => {
    test('should validate correct message', () => {
      const validMessage = {
        content: 'Hello, world!',
        channel_id: '550e8400-e29b-41d4-a716-446655440000',
      }

      expect(() => validate.message.message(validMessage)).not.toThrow()
    })

    test('should reject empty message', () => {
      const emptyMessage = {
        content: '',
        channel_id: '550e8400-e29b-41d4-a716-446655440000',
      }

      expect(() => validate.message.message(emptyMessage)).toThrow()
    })

    test('should reject message that is too long', () => {
      const longMessage = {
        content: 'x'.repeat(10001),
        channel_id: '550e8400-e29b-41d4-a716-446655440000',
      }

      expect(() => validate.message.message(longMessage)).toThrow()
    })
  })

  describe('3D Modeling Validation', () => {
    test('should validate correct scene', () => {
      const validScene = {
        name: 'Test Scene',
        objects: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            type: 'cube' ,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: '#ff0000',
          },
        ],
      }

      expect(() => validate.modeling3d.scene(validScene)).not.toThrow()
    })

    test('should reject invalid color format', () => {
      const invalidColorScene = {
        name: 'Test Scene',
        objects: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            type: 'cube' ,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            color: 'invalid-color',
          },
        ],
      }

      expect(() => validate.modeling3d.scene(invalidColorScene)).toThrow()
    })

    test('should reject negative scale', () => {
      const invalidScaleScene = {
        name: 'Test Scene',
        objects: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            type: 'cube' ,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: -1, y: 1, z: 1 },
            color: '#ff0000',
          },
        ],
      }

      expect(() => validate.modeling3d.scene(invalidScaleScene)).toThrow()
    })
  })

  describe('Sanitization', () => {
    test('should sanitize HTML content', () => {
      const htmlInput = '<script>alert("xss")</script>Hello <b>World</b>'
      const sanitized = sanitize.input(htmlInput)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('Hello World')
    })

    test('should normalize email addresses', () => {
      const emailInput = '  TEST@EXAMPLE.COM  '
      const sanitized = sanitize.input(emailInput)

      expect(sanitized).toBe('test@example.com')
    })

    test('should sanitize file paths', () => {
      const pathInput = '../../../etc/passwd'
      const sanitized = sanitize.path(pathInput)

      expect(sanitized).not.toContain('..')
      expect(sanitized).not.toContain('/')
    })

    test('should sanitize filenames', () => {
      const filenameInput = 'malicious/file.exe'
      const sanitized = sanitize.filename(filenameInput)

      expect(sanitized).not.toContain('/')
      expect(sanitized).not.toContain('\\')
    })
  })

  describe('Validation Helpers', () => {
    test('should validate email addresses', () => {
      const validEmail = ValidationHelper.validateEmail('test@example.com')
      expect(validEmail.valid).toBe(true)

      const invalidEmail = ValidationHelper.validateEmail('invalid-email')
      expect(invalidEmail.valid).toBe(false)
    })

    test('should validate URLs', () => {
      const validUrl = ValidationHelper.validateUrl('https://example.com')
      expect(validUrl.valid).toBe(true)

      const invalidUrl = ValidationHelper.validateUrl('not-a-url')
      expect(invalidUrl.valid).toBe(false)
    })

    test('should validate text input', () => {
      const validText = ValidationHelper.validateText('Hello, world!', {
        min: 1,
        max: 100,
      })
      expect(validText.valid).toBe(true)

      const shortText = ValidationHelper.validateText('', {
        min: 1,
        max: 100,
      })
      expect(shortText.valid).toBe(false)
    })

    test('should validate files', () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      const validFile = ValidationHelper.validateFile(mockFile, {
        allowedTypes: ['text/plain'],
        maxSize: 1024,
      })
      expect(validFile.valid).toBe(true)
    })
  })

  describe('Data Integrity', () => {
    test('should validate user data integrity', () => {
      const validUser = {
        email: 'test@example.com',
        full_name: 'Test User',
      }

      const result = dataIntegrityChecker.validateData(validUser, [
        'user_email_format',
        'user_name_required',
      ])

      expect(result.valid).toBe(true)
    })

    test('should detect invalid user data', () => {
      const invalidUser = {
        email: 'invalid-email',
        full_name: '', // Invalid name
      }

      const result = dataIntegrityChecker.validateData(invalidUser, [
        'user_email_format',
        'user_name_required',
      ])

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    test('should validate application state', () => {
      const validState = {
        users: [
          {
            id: '1',
            email: 'user1@example.com',
            full_name: 'User One',
            created_at: new Date().toISOString(),
          },
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
            created_at: new Date().toISOString(),
          },
        ],
      }

      const result = dataIntegrityChecker.validateApplicationState(validState)
      expect(result.valid).toBe(true)
    })
  })

  describe('Integration Tests', () => {
    test('should run complete validation test suite', async () => {
      const { results, summary } = await runValidationTests()

      expect(results.length).toBeGreaterThan(0)
      expect(summary.passed).toBeGreaterThan(0)
      expect(summary.successRate).toBeGreaterThan(80) // At least 80% success rate
    })
  })
})