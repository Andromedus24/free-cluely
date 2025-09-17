// Test setup file
import * as path from 'path';

// Mock node-fetch for tests
jest.mock('node-fetch', () => ({
  default: jest.fn()
}));

// Mock file system operations if needed
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn()
}));

// Mock environment variables
process.env.NODE_ENV = 'test';

// Set up global test utilities
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.jest = jest;

// Increase timeout for async operations
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});