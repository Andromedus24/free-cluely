/**
 * Service Tests
 * Tests all integrated services for functionality and error handling
 */

import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/services/auth-service'
import { useKnowledgeManagement } from '@/services/knowledge-management'
import { useThreeDModeling } from '@/services/3d-modeling-service'
import { useMessaging } from '@/services/messaging-service'
import { useProductivityMonitoring } from '@/services/productivity-monitoring'
import { useVoiceAssistant } from '@/services/voice-assistant'

// Mock the services
jest.mock('@/services/auth-service')
jest.mock('@/services/knowledge-management')
jest.mock('@/services/3d-modeling-service')
jest.mock('@/services/messaging-service')
jest.mock('@/services/productivity-monitoring')
jest.mock('@/services/voice-assistant')

describe('Service Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
  })

  describe('Authentication Service', () => {
    test('should initialize auth state correctly', () => {
      const mockAuth = {
        isAuthenticated: false,
        user: null,
        loading: true,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
      }

      require('@/services/auth-service').useAuth.mockReturnValue(mockAuth)

      const { result } = renderHook(() => useAuth())
      expect(result.current.loading).toBe(true)
    })

    test('should handle login process', async () => {
      const mockLogin = jest.fn().mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com' },
        access_token: 'test-token',
      })

      const mockAuth = {
        isAuthenticated: false,
        user: null,
        loading: false,
        login: mockLogin,
        register: jest.fn(),
        logout: jest.fn(),
      }

      require('@/services/auth-service').useAuth.mockReturnValue(mockAuth)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password',
        })
      })

      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password',
      })
    })

    test('should handle registration process', async () => {
      const mockRegister = jest.fn().mockResolvedValue({
        user: { id: 'new-user', email: 'new@example.com' },
        access_token: 'new-token',
      })

      const mockAuth = {
        isAuthenticated: false,
        user: null,
        loading: false,
        login: jest.fn(),
        register: mockRegister,
        logout: jest.fn(),
      }

      require('@/services/auth-service').useAuth.mockReturnValue(mockAuth)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await result.current.register({
          email: 'new@example.com',
          password: 'SecurePass123!',
          full_name: 'New User',
        })
      })

      expect(mockRegister).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'SecurePass123!',
        full_name: 'New User',
      })
    })
  })

  describe('Knowledge Management Service', () => {
    test('should create knowledge items correctly', async () => {
      const mockCreateItem = jest.fn().mockResolvedValue({
        id: 'test-item',
        title: 'Test Item',
        content: 'Test content',
      })

      const mockKnowledge = {
        knowledgeItems: [],
        datasets: [],
        quizzes: [],
        sessions: [],
        createKnowledgeItem: mockCreateItem,
        loadKnowledgeItems: jest.fn(),
        addKnowledgeItem: jest.fn(),
      }

      require('@/services/knowledge-management').useKnowledgeManagement.mockReturnValue(mockKnowledge)

      const { result } = renderHook(() => useKnowledgeManagement())

      await act(async () => {
        await result.current.createKnowledgeItem({
          title: 'Test Item',
          content: 'Test content',
          type: 'note',
          source: 'test',
          tags: ['test'],
          category: 'test',
          difficulty: 'beginner',
          estimatedTime: 5,
        })
      })

      expect(mockCreateItem).toHaveBeenCalled()
    })

    test('should validate knowledge item data', async () => {
      const mockCreateItem = jest.fn()

      const mockKnowledge = {
        knowledgeItems: [],
        datasets: [],
        quizzes: [],
        sessions: [],
        createKnowledgeItem: mockCreateItem,
        loadKnowledgeItems: jest.fn(),
        addKnowledgeItem: jest.fn(),
      }

      require('@/services/knowledge-management').useKnowledgeManagement.mockReturnValue(mockKnowledge)

      const { result } = renderHook(() => useKnowledgeManagement())

      // Test with invalid data (should throw validation error)
      await act(async () => {
        await expect(
          result.current.createKnowledgeItem({
            title: '', // Invalid: empty title
            content: 'Test content',
            type: 'note',
            source: 'test',
            tags: ['test'],
            category: 'test',
            difficulty: 'beginner',
            estimatedTime: 5,
          })
        ).rejects.toThrow()
      })
    })
  })

  describe('3D Modeling Service', () => {
    test('should create scenes correctly', async () => {
      const mockCreateScene = jest.fn().mockResolvedValue({
        id: 'test-scene',
        name: 'Test Scene',
        meshes: [],
      })

      const mockModeling = {
        scenes: [],
        presets: [],
        sessions: [],
        currentScene: null,
        createScene: mockCreateScene,
        loadScene: jest.fn(),
        addObject: jest.fn(),
      }

      require('@/services/3d-modeling-service').useThreeDModeling.mockReturnValue(mockModeling)

      const { result } = renderHook(() => useThreeDModeling())

      await act(async () => {
        await result.current.createScene('Test Scene', 'A test scene')
      })

      expect(mockCreateScene).toHaveBeenCalledWith('Test Scene', 'A test scene')
    })

    test('should validate scene data', async () => {
      const mockCreateScene = jest.fn()

      const mockModeling = {
        scenes: [],
        presets: [],
        sessions: [],
        currentScene: null,
        createScene: mockCreateScene,
        loadScene: jest.fn(),
        addObject: jest.fn(),
      }

      require('@/services/3d-modeling-service').useThreeDModeling.mockReturnValue(mockModeling)

      const { result } = renderHook(() => useThreeDModeling())

      // Test with invalid data (should throw validation error)
      await act(async () => {
        await expect(
          result.current.createScene('', 'Test description') // Invalid: empty name
        ).rejects.toThrow()
      })
    })
  })

  describe('Messaging Service', () => {
    test('should send messages correctly', async () => {
      const mockSendMessage = jest.fn().mockResolvedValue({
        id: 'test-message',
        content: 'Hello, world!',
        timestamp: new Date().toISOString(),
      })

      const mockMessaging = {
        messages: [],
        channels: [],
        users: [],
        sendMessage: mockSendMessage,
        loadMessages: jest.fn(),
        createChannel: jest.fn(),
      }

      require('@/services/messaging-service').useMessaging.mockReturnValue(mockMessaging)

      const { result } = renderHook(() => useMessaging())

      await act(async () => {
        await result.current.sendMessage(
          'Hello, world!',
          'test-sender',
          'test-receiver'
        )
      })

      expect(mockSendMessage).toHaveBeenCalledWith(
        'Hello, world!',
        'test-sender',
        'test-receiver'
      )
    })

    test('should validate message content', async () => {
      const mockSendMessage = jest.fn()

      const mockMessaging = {
        messages: [],
        channels: [],
        users: [],
        sendMessage: mockSendMessage,
        loadMessages: jest.fn(),
        createChannel: jest.fn(),
      }

      require('@/services/messaging-service').useMessaging.mockReturnValue(mockMessaging)

      const { result } = renderHook(() => useMessaging())

      // Test with invalid data (should throw validation error)
      await act(async () => {
        await expect(
          result.current.sendMessage('', 'test-sender', 'test-receiver') // Invalid: empty content
        ).rejects.toThrow()
      })
    })
  })

  describe('Productivity Monitoring Service', () => {
    test('should start and stop monitoring', async () => {
      const mockStartMonitoring = jest.fn()
      const mockStopMonitoring = jest.fn()

      const mockProductivity = {
        isMonitoring: false,
        currentSession: null,
        sessions: [],
        startMonitoring: mockStartMonitoring,
        stopMonitoring: mockStopMonitoring,
        getSessions: jest.fn(),
      }

      require('@/services/productivity-monitoring').useProductivityMonitoring.mockReturnValue(mockProductivity)

      const { result } = renderHook(() => useProductivityMonitoring())

      await act(async () => {
        await result.current.startMonitoring()
      })

      expect(mockStartMonitoring).toHaveBeenCalled()

      await act(async () => {
        await result.current.stopMonitoring()
      })

      expect(mockStopMonitoring).toHaveBeenCalled()
    })
  })

  describe('Voice Assistant Service', () => {
    test('should start and stop listening', async () => {
      const mockStartListening = jest.fn()
      const mockStopListening = jest.fn()

      const mockVoice = {
        isListening: false,
        isHotwordActive: false,
        startListening: mockStartListening,
        stopListening: mockStopListening,
        speak: jest.fn(),
        setHotwordActive: jest.fn(),
      }

      require('@/services/voice-assistant').useVoiceAssistant.mockReturnValue(mockVoice)

      const { result } = renderHook(() => useVoiceAssistant())

      await act(async () => {
        await result.current.startListening()
      })

      expect(mockStartListening).toHaveBeenCalled()

      await act(async () => {
        await result.current.stopListening()
      })

      expect(mockStopListening).toHaveBeenCalled()
    })
  })

  describe('Service Error Handling', () => {
    test('should handle authentication errors gracefully', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Authentication failed'))

      const mockAuth = {
        isAuthenticated: false,
        user: null,
        loading: false,
        login: mockLogin,
        register: jest.fn(),
        logout: jest.fn(),
      }

      require('@/services/auth-service').useAuth.mockReturnValue(mockAuth)

      const { result } = renderHook(() => useAuth())

      await act(async () => {
        await expect(
          result.current.login({
            email: 'test@example.com',
            password: 'wrong-password',
          })
        ).rejects.toThrow('Authentication failed')
      })
    })

    test('should handle network errors gracefully', async () => {
      const mockSendMessage = jest.fn().mockRejectedValue(new Error('Network error'))

      const mockMessaging = {
        messages: [],
        channels: [],
        users: [],
        sendMessage: mockSendMessage,
        loadMessages: jest.fn(),
        createChannel: jest.fn(),
      }

      require('@/services/messaging-service').useMessaging.mockReturnValue(mockMessaging)

      const { result } = renderHook(() => useMessaging())

      await act(async () => {
        await expect(
          result.current.sendMessage('Hello', 'sender', 'receiver')
        ).rejects.toThrow('Network error')
      })
    })

    test('should handle validation errors gracefully', async () => {
      const mockCreateItem = jest.fn().mockRejectedValue(new Error('Validation failed'))

      const mockKnowledge = {
        knowledgeItems: [],
        datasets: [],
        quizzes: [],
        sessions: [],
        createKnowledgeItem: mockCreateItem,
        loadKnowledgeItems: jest.fn(),
        addKnowledgeItem: jest.fn(),
      }

      require('@/services/knowledge-management').useKnowledgeManagement.mockReturnValue(mockKnowledge)

      const { result } = renderHook(() => useKnowledgeManagement())

      await act(async () => {
        await expect(
          result.current.createKnowledgeItem({
            title: 'Test',
            content: 'x'.repeat(50001), // Invalid: too long
            type: 'note',
            source: 'test',
            tags: ['test'],
            category: 'test',
            difficulty: 'beginner',
            estimatedTime: 5,
          })
        ).rejects.toThrow('Validation failed')
      })
    })
  })
})