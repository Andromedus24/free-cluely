/**
 * Jest Configuration for Atlas AI
 * Comprehensive testing setup for all packages and applications
 */

// Custom Jest configuration
const customJestConfig = {
  // Enable ES modules
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],

  // Directories to search for test files
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],

  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
    '^.+\\.(js|jsx)$': 'babel-jest',
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
  setupFiles: ['<rootDir>/jest.setup.mjs'],

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
  globalSetup: '<rootDir>/jest.global-setup.mjs',
  globalTeardown: '<rootDir>/jest.global-teardown.mjs',
}

module.exports = customJestConfig