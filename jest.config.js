/**
 * Jest Configuration for Atlas AI
 * Comprehensive testing setup for all packages and applications
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './apps/dashboard',
})

// Custom Jest configuration
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Directories to search for test files
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files with Babel
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Coverage configuration
  collectCoverageFrom: [
    'apps/**/*.{js,jsx,ts,tsx}',
    'packages/**/*.{js,jsx,ts,tsx}',
    '!apps/**/*.d.ts',
    '!packages/**/*.d.ts',
    '!apps/**/node_modules/**',
    '!packages/**/node_modules/**',
    '!**/jest.config.*',
    '!**/coverage/**',
    '!**/.next/**',
    '!**/dist/**',
    '!**/build/**',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFiles: ['<rootDir>/jest.setup.js'],

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/dashboard/src/$1',
    '^@free-cluely/(.*)$': '<rootDir>/packages/$1/src',
  },

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks before each test
  clearMocks: true,

  // Reset mocks before each test
  resetMocks: true,

  // Restore mocks before each test
  restoreMocks: true,

  // Collect coverage
  collectCoverage: true,

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage report formats
  coverageReporters: ['text', 'lcov', 'clover', 'html'],

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Max workers
  maxWorkers: '50%',

  // Global setup and teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)