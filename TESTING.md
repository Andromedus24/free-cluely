# Testing Guide for Atlas AI

This document provides a comprehensive guide to testing the Atlas AI application, including unit tests, integration tests, end-to-end tests, and CI/CD pipelines.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Testing Tools](#testing-tools)
- [CI/CD Pipeline](#cicd-pipeline)
- [Test Coverage](#test-coverage)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)

## Testing Philosophy

Our testing strategy follows the Testing Pyramid model:

```
          E2E Tests (10%)
         /               \
    Integration Tests (30%)
   /                     \
Unit Tests (60%)
```

### Principles

1. **Fast Feedback**: Unit tests should run in seconds
2. **Reliable**: Tests should be deterministic and flake-free
3. **Comprehensive**: Cover critical paths and edge cases
4. **Maintainable**: Tests should be easy to understand and modify
5. **Realistic**: Test real user scenarios and behaviors

## Test Structure

```
apps/dashboard/src/
├── __tests__/
│   ├── components/          # Component tests
│   ├── pages/              # Page tests
│   ├── services/           # Service tests
│   ├── hooks/              # Hook tests
│   ├── utils/              # Utility tests
│   ├── validation.test.ts  # Validation system tests
│   └── services.test.ts   # Service integration tests
└── e2e/                   # End-to-end tests
    ├── auth.spec.ts        # Authentication tests
    ├── dashboard.spec.ts   # Dashboard functionality tests
    ├── knowledge.spec.ts   # Knowledge management tests
    ├── 3d-modeling.spec.ts # 3D modeling tests
    └── messaging.spec.ts   # Messaging tests

packages/*/src/
└── __tests__/              # Package-specific tests
    ├── *.test.ts          # Unit and integration tests
    └── *.spec.ts         # Component tests
```

## Running Tests

### Local Development

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests in CI mode
pnpm test:ci

# Run end-to-end tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run E2E tests in headed mode
pnpm test:e2e:headed

# Run validation tests
pnpm test:validation

# Run performance tests
pnpm test:performance

# Run security tests
pnpm test:security

# Validate PR requirements
pnpm validate:pr
```

### Specific Test Categories

```bash
# Run only unit tests
pnpm test -- --testPathPattern="unit"

# Run only integration tests
pnpm test -- --testPathPattern="integration"

# Run specific test file
pnpm test validation.test.ts

# Run tests matching a pattern
pnpm test -- --testNamePattern="should validate"

# Run tests with specific coverage
pnpm test:coverage -- --collectCoverageFrom="src/services/**"
```

## Writing Tests

### Unit Tests

Unit tests test individual functions and components in isolation.

```typescript
// Example: Service test
describe('AuthService', () => {
  test('should validate user login credentials', () => {
    const authService = new AuthService()

    const validCredentials = {
      email: 'test@example.com',
      password: 'ValidPass123!'
    }

    expect(() => authService.validateLogin(validCredentials)).not.toThrow()
  })

  test('should reject invalid email format', () => {
    const authService = new AuthService()

    const invalidCredentials = {
      email: 'invalid-email',
      password: 'ValidPass123!'
    }

    expect(() => authService.validateLogin(invalidCredentials)).toThrow('Invalid email format')
  })
})
```

### Component Tests

Component tests test React components with user interactions.

```typescript
// Example: Component test
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  test('should render login form correctly', () => {
    render(<LoginForm onSubmit={jest.fn()} />)

    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  test('should call onSubmit with form data', () => {
    const mockOnSubmit = jest.fn()
    render(<LoginForm onSubmit={mockOnSubmit} />)

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' }
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })
})
```

### Integration Tests

Integration tests test how multiple components or services work together.

```typescript
// Example: Service integration test
describe('Knowledge Management Integration', () => {
  test('should create and retrieve knowledge items', async () => {
    const knowledgeService = new KnowledgeManagementService()

    const item = await knowledgeService.createKnowledgeItem({
      title: 'Test Item',
      content: 'Test content',
      type: 'note',
      source: 'test',
      tags: ['test'],
      category: 'test',
      difficulty: 'beginner',
      estimatedTime: 5
    })

    const retrievedItems = await knowledgeService.getKnowledgeItems()

    expect(retrievedItems).toContainEqual(expect.objectContaining({
      id: item.id,
      title: 'Test Item'
    }))
  })
})
```

### End-to-End Tests

E2E tests test complete user workflows in a real browser.

```typescript
// Example: E2E test
import { test, expect } from '@playwright/test'

test('should complete user authentication flow', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')

  // Fill login form
  await page.fill('input[type="email"]', 'test@example.com')
  await page.fill('input[type="password"]', 'password')

  // Submit form
  await page.click('button[type="submit"]')

  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard/main')

  // Verify user is logged in
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  await expect(page.locator('text=Test User')).toBeVisible()
})
```

## Testing Tools

### Jest

- **Unit Testing**: Framework for unit and integration tests
- **Mocking**: Built-in mocking utilities
- **Coverage**: Code coverage reporting
- **Watch Mode**: Fast development workflow

### React Testing Library

- **Component Testing**: Utilities for testing React components
- **User Interactions**: Simulate real user behavior
- **Accessibility**: Test accessibility features

### Playwright

- **E2E Testing**: Cross-browser end-to-end testing
- **Mobile Testing**: Test mobile viewports and behaviors
- **Network Mocking**: Control network requests
- **Visual Testing**: Screenshot and video recording

### Additional Tools

- **MSW**: Mock Service Worker for API mocking
- **Jest-DOM**: DOM testing utilities
- **User Event**: Realistic user event simulation
- **Lighthouse**: Performance and accessibility testing

## Test Coverage

### Coverage Goals

```
Overall Coverage: 80%
- Critical Paths: 90%
- Services: 85%
- Components: 80%
- Utilities: 75%
```

### Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View detailed coverage
open coverage/lcov-report/index.html

# Filter coverage by directory
pnpm test:coverage -- --collectCoverageFrom="src/services/**"
```

### Coverage Exclusions

```javascript
// In jest.config.js
collectCoverageFrom: [
  'apps/**/*.{js,jsx,ts,tsx}',
  'packages/**/*.{js,jsx,ts,tsx}',
  '!apps/**/*.d.ts',
  '!packages/**/*.d.ts',
  '!**/node_modules/**',
  '!**/coverage/**',
  '!**/.next/**',
  '!**/dist/**',
  '!**/build/**',
  '!**/*.stories.{js,jsx,ts,tsx}',
  '!**/*.config.{js,ts}',
]
```

## CI/CD Pipeline

### GitHub Actions Workflows

1. **CI Pipeline** (`.github/workflows/ci.yml`)
   - Runs on push to main/develop branches
   - Executes tests, linting, type checking
   - Builds application
   - Deploys to staging/production

2. **PR Validation** (`.github/workflows/validate-pr.yml`)
   - Runs on pull request creation/update
   - Validates PR requirements
   - Runs comprehensive test suite
   - Provides feedback to developers

### Pipeline Stages

```yaml
# Example CI pipeline stages
stages:
  - name: Test
    jobs: [unit, integration, e2e]
  - name: Build
    jobs: [build]
    needs: [Test]
  - name: Security
    jobs: [security, audit]
    needs: [Test]
  - name: Deploy
    jobs: [staging, production]
    needs: [Build, Security]
```

### Quality Gates

- **Code Coverage**: Minimum 80% coverage
- **Test Success**: All tests must pass
- **Linting**: No linting errors
- **Type Safety**: No TypeScript errors
- **Security**: No high-severity vulnerabilities

## Performance Testing

### Lighthouse Integration

```bash
# Run performance audit
pnpm test:performance

# Run specific audits
npx lighthouse http://localhost:3000 \
  --output=html \
  --output-path=./lighthouse-results \
  --categories=performance,accessibility,best-practices,seo
```

### Performance Metrics

- **Performance Score**: >90
- **Accessibility Score**: >95
- **Best Practices**: >90
- **SEO Score**: >90

## Security Testing

### Security Scans

```bash
# Run security audit
pnpm test:security

# Run npm audit
npm audit --audit-level moderate

# Run Snyk security scan
snyk test --severity-threshold=high
```

### Security Checks

- **Dependency Vulnerabilities**: Scan for known vulnerabilities
- **Code Security**: Static code analysis
- **Secret Detection**: Check for exposed secrets
- **Input Validation**: Test input sanitization

## Test Best Practices

### 1. Test Naming

```typescript
// Good
test('should validate user email format', () => {
  // ...
})

test('should redirect to dashboard after successful login', async () => {
  // ...
})

// Avoid
test('test login', () => {
  // ...
})
```

### 2. Test Structure

```typescript
describe('AuthService', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  describe('login', () => {
    test('should validate credentials', () => {
      // Test
    })

    test('should handle invalid credentials', () => {
      // Test
    })
  })
})
```

### 3. Mocking Best Practices

```typescript
// Good: Mock external dependencies
jest.mock('@/services/api-service')

// Good: Use test doubles for complex dependencies
const mockApiService = {
  login: jest.fn().mockResolvedValue({ user: mockUser })
}

// Avoid: Mocking simple utilities
// jest.mock('@/lib/utils') // Don't mock simple utilities
```

### 4. Async Testing

```typescript
// Good: Use async/await
test('should fetch user data', async () => {
  const user = await authService.getUser('123')
  expect(user).toEqual(mockUser)
})

// Good: Handle errors
test('should handle API errors', async () => {
  mockApiService.getUser.mockRejectedValue(new Error('API Error'))

  await expect(authService.getUser('123')).rejects.toThrow('API Error')
})
```

### 5. Test Data Management

```typescript
// Use test factories
const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  ...overrides
})

// Use test constants
const TEST_USER = createMockUser()
const VALID_CREDENTIALS = {
  email: 'test@example.com',
  password: 'ValidPass123!'
}
```

## Troubleshooting

### Common Issues

1. **Flaky Tests**
   - Use proper async handling
   - Add proper cleanup
   - Use deterministic test data

2. **Slow Tests**
   - Optimize test setup
   - Use mocks appropriately
   - Parallelize test execution

3. **Mock Failures**
   - Clear mocks before each test
   - Use proper mock implementations
   - Verify mock calls correctly

### Debug Tools

```bash
# Debug tests with Node.js inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug Playwright tests
npx playwright test --debug

# Debug with breakpoints
debugger; // Add this line in your test
```

## Contributing

When adding new features:

1. **Write tests first** (Test-Driven Development)
2. **Cover all paths** (happy path, error cases, edge cases)
3. **Update coverage** if adding new modules
4. **Add E2E tests** for user-facing features
5. **Document testing approach** for complex features

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [React Testing Patterns](https://kentcdodds.com/blog/testing-patterns)