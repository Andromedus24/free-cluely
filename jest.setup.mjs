/**
 * Jest Setup File
 * Global test setup and mocking configuration
 */

import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock fetch
global.fetch = jest.fn()

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock Web Speech API
global.SpeechRecognition = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  onresult: null,
  onerror: null,
  onend: null,
  onstart: null,
}))

global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => []),
  onvoiceschanged: null,
}

// Mock MediaDevices API
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [],
    }),
    enumerateDevices: jest.fn().mockResolvedValue([]),
  },
})

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn()
HTMLCanvasElement.prototype.toDataURL = jest.fn()

// Mock File API
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  bits,
  name,
  options,
  size: bits.length,
  type: options?.type || '',
}))

// Mock URL API
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock Performance API
Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: jest.fn(() => Date.now()),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
  },
})

// Mock RequestIdleCallback
global.requestIdleCallback = jest.fn(callback => {
  return setTimeout(callback, 0)
})

global.cancelIdleCallback = jest.fn(id => {
  clearTimeout(id)
})

// Mock Animation Frame
global.requestAnimationFrame = jest.fn(callback => {
  return setTimeout(callback, 16)
})

global.cancelAnimationFrame = jest.fn(id => {
  clearTimeout(id)
})

// Setup global test utilities
global.testUtils = {
  // Mock API responses
  createMockResponse: (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Map(),
  }),

  // Mock user data
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Mock knowledge item
  createMockKnowledgeItem: (overrides = {}) => ({
    id: 'test-knowledge-id',
    title: 'Test Knowledge Item',
    content: 'This is test content for a knowledge item.',
    type: 'note',
    source: 'test',
    tags: ['test'],
    category: 'test',
    difficulty: 'beginner',
    estimatedTime: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    learningData: {
      views: 0,
      completions: 0,
      masteryLevel: 0,
    },
    ...overrides,
  }),

  // Mock 3D scene
  createMockScene: (overrides = {}) => ({
    id: 'test-scene-id',
    name: 'Test Scene',
    description: 'A test 3D scene',
    meshes: [],
    lights: [],
    cameras: [],
    environment: {
      ambientLight: { color: '#ffffff', intensity: 0.4 },
      backgroundColor: '#1a1a1a',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Mock message
  createMockMessage: (overrides = {}) => ({
    id: 'test-message-id',
    content: 'Test message content',
    senderId: 'test-user-id',
    messageType: 'text',
    timestamp: new Date().toISOString(),
    isEdited: false,
    reactions: [],
    ...overrides,
  }),

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock event
  createMockEvent: (type, data) => ({
    type,
    data,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  }),

  // Create mock file
  createMockFile: (name, content, type = 'text/plain') => {
    const blob = new Blob([content], { type })
    return new File([blob], name, { type })
  },
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})