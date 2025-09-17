import { ScreenshotPipeline, ScreenshotPipelineConfig, PipelineResult } from '../ScreenshotPipeline';
import { ScreenshotItem, CaptureMode } from '@free-cluely/shared';

// Mock dependencies
const mockBus = {
  send: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

describe('ScreenshotPipeline', () => {
  let pipeline: ScreenshotPipeline;
  let config: ScreenshotPipelineConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    config = {
      autoCreateJobs: true,
      autoProcessScreenshots: true,
      jobTemplates: {
        problem: {
          title: 'Problem Analysis',
          description: 'Analyze screenshot for problems',
          tags: ['problem', 'analysis']
        },
        debug: {
          title: 'Debug Analysis',
          description: 'Analyze screenshot for debugging',
          tags: ['debug', 'troubleshooting']
        }
      },
      sessionManagement: {
        autoCreateSessions: true,
        sessionTimeout: 30 * 60 * 1000,
        defaultSessionName: 'Test Session'
      }
    };

    pipeline = new ScreenshotPipeline(config, mockBus as any, mockLogger as any);
  });

  describe('Constructor', () => {
    it('should create pipeline with default config when no config provided', () => {
      const defaultPipeline = new ScreenshotPipeline({}, mockBus as any, mockLogger as any);
      const stats = defaultPipeline.getPipelineStats();

      expect(stats.config.autoCreateJobs).toBe(true);
      expect(stats.config.autoProcessScreenshots).toBe(true);
    });

    it('should use provided config', () => {
      const customConfig: ScreenshotPipelineConfig = {
        autoCreateJobs: false,
        autoProcessScreenshots: false
      };

      const customPipeline = new ScreenshotPipeline(customConfig, mockBus as any, mockLogger as any);
      const stats = customPipeline.getPipelineStats();

      expect(stats.config.autoCreateJobs).toBe(false);
      expect(stats.config.autoProcessScreenshots).toBe(false);
    });
  });

  describe('processScreenshot', () => {
    const mockScreenshot: ScreenshotItem = {
      id: 'test-screenshot-id',
      filename: 'test_screenshot.png',
      path: '/path/to/screenshot.png',
      base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      timestamp: Date.now(),
      type: 'problem',
      size: 1024,
      captureMode: 'full' as CaptureMode,
      preview: {
        base64: 'preview-data',
        width: 320,
        height: 240,
        size: 512,
        generatedAt: Date.now()
      }
    };

    it('should successfully process screenshot and return pipeline result', async () => {
      // Mock successful session creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-session-id' }
      });

      // Mock successful job creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-job-id' }
      });

      // Mock successful job retrieval
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { id: 1 }
      });

      // Mock successful artifact creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { id: 'test-artifact-id' }
      });

      const result = await pipeline.processScreenshot(mockScreenshot);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('test-job-id');
      expect(result.artifactId).toBe('test-artifact-id');
      expect(result.sessionId).toBe('test-session-id');
      expect(result.processingTime).toBeGreaterThan(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting screenshot pipeline for test_screenshot.png');
    });

    it('should handle session creation failure gracefully', async () => {
      // Mock session creation failure
      mockBus.send.mockResolvedValueOnce({
        success: false,
        error: 'Failed to create session'
      });

      // Mock successful job creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-job-id' }
      });

      // Mock successful job retrieval
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { id: 1 }
      });

      // Mock successful artifact creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { id: 'test-artifact-id' }
      });

      const result = await pipeline.processScreenshot(mockScreenshot);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('default-session');
    });

    it('should handle job creation failure', async () => {
      // Mock successful session creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-session-id' }
      });

      // Mock job creation failure
      mockBus.send.mockResolvedValueOnce({
        success: false,
        error: 'Failed to create job'
      });

      const result = await pipeline.processScreenshot(mockScreenshot);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create analysis job: Failed to create job');
      expect(mockLogger.error).toHaveBeenCalledWith('Screenshot pipeline failed:', expect.any(Object));
    });

    it('should handle artifact creation failure', async () => {
      // Mock successful session creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-session-id' }
      });

      // Mock successful job creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-job-id' }
      });

      // Mock successful job retrieval
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { id: 1 }
      });

      // Mock artifact creation failure
      mockBus.send.mockResolvedValueOnce({
        success: false,
        error: 'Failed to create artifact'
      });

      const result = await pipeline.processScreenshot(mockScreenshot);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to attach screenshot artifact: Failed to create artifact');
    });

    it('should not start processing when autoProcessScreenshots is false', async () => {
      // Create pipeline with auto-processing disabled
      const noAutoProcessPipeline = new ScreenshotPipeline({
        ...config,
        autoProcessScreenshots: false
      }, mockBus as any, mockLogger as any);

      // Mock successful session creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-session-id' }
      });

      // Mock successful job creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-job-id' }
      });

      // Mock successful job retrieval
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { id: 1 }
      });

      // Mock successful artifact creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { id: 'test-artifact-id' }
      });

      const result = await noAutoProcessPipeline.processScreenshot(mockScreenshot);

      expect(result.success).toBe(true);
      // Should not call LLM service for processing
      expect(mockBus.send).not.toHaveBeenCalledWith(
        expect.objectContaining({
          plugin: 'llm-service',
          method: 'processJob'
        })
      );
    });
  });

  describe('Session Management', () => {
    it('should create custom session successfully', async () => {
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'custom-session-id' }
      });

      const sessionId = await pipeline.createCustomSession('Custom Session', 'Custom description');

      expect(sessionId).toBe('custom-session-id');
      expect(mockBus.send).toHaveBeenCalledWith({
        id: expect.any(String),
        type: 'request',
        plugin: 'database-service',
        method: 'createSession',
        payload: {
          name: 'Custom Session',
          description: 'Custom description'
        },
        timestamp: expect.any(Number)
      });
    });

    it('should handle custom session creation failure', async () => {
      mockBus.send.mockResolvedValueOnce({
        success: false,
        error: 'Session creation failed'
      });

      const sessionId = await pipeline.createCustomSession('Custom Session');

      expect(sessionId).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to create custom session:', expect.any(Error));
    });

    it('should cleanup expired sessions', async () => {
      // Add an expired session
      const expiredDate = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      (pipeline as any).activeSessions.set('expired-session', {
        id: 'expired-session',
        lastActivity: expiredDate
      });

      // Add an active session
      const activeDate = Date.now() - (10 * 60 * 1000); // 10 minutes ago
      (pipeline as any).activeSessions.set('active-session', {
        id: 'active-session',
        lastActivity: activeDate
      });

      // Trigger cleanup by calling getOrCreateSession
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'new-session' }
      });

      await (pipeline as any).getOrCreateSession();

      // Expired session should be removed
      expect((pipeline as any).activeSessions.has('expired-session')).toBe(false);
      // Active session should remain
      expect((pipeline as any).activeSessions.has('active-session')).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should update pipeline configuration', () => {
      const newConfig: Partial<ScreenshotPipelineConfig> = {
        autoCreateJobs: false,
        autoProcessScreenshots: false,
        sessionManagement: {
          autoCreateSessions: false,
          sessionTimeout: 60 * 60 * 1000, // 1 hour
          defaultSessionName: 'Updated Session'
        }
      };

      pipeline.updateConfig(newConfig);
      const stats = pipeline.getPipelineStats();

      expect(stats.config.autoCreateJobs).toBe(false);
      expect(stats.config.autoProcessScreenshots).toBe(false);
      expect(stats.config.sessionManagement.autoCreateSessions).toBe(false);
      expect(stats.config.sessionManagement.sessionTimeout).toBe(60 * 60 * 1000);
    });

    it('should return pipeline stats', () => {
      // Add some active sessions
      (pipeline as any).activeSessions.set('session1', {
        id: 'session1',
        lastActivity: Date.now()
      });
      (pipeline as any).activeSessions.set('session2', {
        id: 'session2',
        lastActivity: Date.now()
      });

      const stats = pipeline.getPipelineStats();

      expect(stats.activeSessions).toBe(2);
      expect(stats.config).toEqual(config);
    });
  });

  describe('Error Handling', () => {
    it('should handle bus communication errors', async () => {
      mockBus.send.mockRejectedValueOnce(new Error('Communication error'));

      const result = await pipeline.processScreenshot({
        id: 'test',
        filename: 'test.png',
        path: '/test.png',
        base64: 'data',
        timestamp: Date.now(),
        type: 'problem',
        size: 100,
        captureMode: 'full' as CaptureMode
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Communication error');
    });

    it('should handle partial failures gracefully', async () => {
      // Mock successful session creation
      mockBus.send.mockResolvedValueOnce({
        success: true,
        data: { uuid: 'test-session' }
      });

      // Mock job creation failure
      mockBus.send.mockResolvedValueOnce({
        success: false,
        error: 'Job creation failed'
      });

      const result = await pipeline.processScreenshot({
        id: 'test',
        filename: 'test.png',
        path: '/test.png',
        base64: 'data',
        timestamp: Date.now(),
        type: 'problem',
        size: 100,
        captureMode: 'full' as CaptureMode
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Job creation failed');
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});