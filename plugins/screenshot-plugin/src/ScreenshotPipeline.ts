import {
  PluginBus,
  Logger,
  ScreenshotItem,
  CancellationToken,
  PluginError
} from '@free-cluely/shared';
import { v4 as uuidv4 } from 'uuid';

export interface ScreenshotPipelineConfig {
  autoCreateJobs: boolean;
  autoProcessScreenshots: boolean;
  jobTemplates: {
    problem: {
      title: string;
      description: string;
      tags: string[];
    };
    debug: {
      title: string;
      description: string;
      tags: string[];
    };
  };
  sessionManagement: {
    autoCreateSessions: boolean;
    sessionTimeout: number; // in milliseconds
    defaultSessionName: string;
  };
}

export interface PipelineResult {
  success: boolean;
  jobId?: string;
  artifactId?: string;
  sessionId?: string;
  error?: string;
  processingTime: number;
}

export class ScreenshotPipeline {
  private config: ScreenshotPipelineConfig;
  private logger: Logger;
  private bus: PluginBus;
  private activeSessions: Map<string, { id: string; lastActivity: number }> = new Map();

  constructor(config: Partial<ScreenshotPipelineConfig> = {}, bus: PluginBus, logger: Logger) {
    this.config = {
      autoCreateJobs: true,
      autoProcessScreenshots: true,
      jobTemplates: {
        problem: {
          title: 'Screenshot Analysis Request',
          description: 'Analyze screenshot for problem identification and solution',
          tags: ['screenshot', 'problem', 'analysis']
        },
        debug: {
          title: 'Debug Screenshot Analysis',
          description: 'Analyze screenshot for debugging and troubleshooting',
          tags: ['screenshot', 'debug', 'troubleshooting']
        }
      },
      sessionManagement: {
        autoCreateSessions: true,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        defaultSessionName: 'Screenshot Analysis Session'
      },
      ...config
    };

    this.bus = bus;
    this.logger = logger;
  }

  async processScreenshot(
    screenshot: ScreenshotItem,
    cancellationToken?: CancellationToken
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`Starting screenshot pipeline for ${screenshot.filename}`);

      cancellationToken?.throwIfCancelled();

      // Step 1: Get or create session
      const sessionId = await this.getOrCreateSession(cancellationToken);

      cancellationToken?.throwIfCancelled();

      // Step 2: Create job for screenshot analysis
      const jobResult = await this.createAnalysisJob(screenshot, sessionId, cancellationToken);

      if (!jobResult.success) {
        throw new Error(`Failed to create analysis job: ${jobResult.error}`);
      }

      cancellationToken?.throwIfCancelled();

      // Step 3: Attach screenshot as artifact to the job
      const artifactResult = await this.attachScreenshotToJob(
        screenshot,
        jobResult.jobId!,
        cancellationToken
      );

      if (!artifactResult.success) {
        throw new Error(`Failed to attach screenshot artifact: ${artifactResult.error}`);
      }

      cancellationToken?.throwIfCancelled();

      // Step 4: Optionally start automatic processing
      if (this.config.autoProcessScreenshots) {
        await this.startJobProcessing(jobResult.jobId!, cancellationToken);
      }

      const processingTime = Date.now() - startTime;

      this.logger.info(`Screenshot pipeline completed successfully in ${processingTime}ms`, {
        screenshotId: screenshot.id,
        jobId: jobResult.jobId,
        artifactId: artifactResult.artifactId,
        sessionId,
        processingTime
      });

      return {
        success: true,
        jobId: jobResult.jobId,
        artifactId: artifactResult.artifactId,
        sessionId,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('Screenshot pipeline failed:', {
        screenshotId: screenshot.id,
        error: errorMessage,
        processingTime
      });

      return {
        success: false,
        error: errorMessage,
        processingTime
      };
    }
  }

  private async getOrCreateSession(cancellationToken?: CancellationToken): Promise<string> {
    try {
      cancellationToken?.throwIfCancelled();

      // Clean up expired sessions
      this.cleanupExpiredSessions();

      // Try to find an active session
      const activeSession = Array.from(this.activeSessions.values())
        .find(session => Date.now() - session.lastActivity < this.config.sessionManagement.sessionTimeout);

      if (activeSession) {
        activeSession.lastActivity = Date.now();
        return activeSession.id;
      }

      // Create new session if auto-create is enabled
      if (this.config.sessionManagement.autoCreateSessions) {
        const sessionData = {
          name: this.config.sessionManagement.defaultSessionName,
          description: 'Automatically created session for screenshot analysis'
        };

        const result = await this.bus.send({
          id: uuidv4(),
          type: 'request',
          plugin: 'database-service',
          method: 'createSession',
          payload: sessionData,
          timestamp: Date.now()
        });

        if (result.success) {
          const sessionId = result.data.uuid;
          this.activeSessions.set(sessionId, {
            id: sessionId,
            lastActivity: Date.now()
          });

          this.logger.info(`Created new session: ${sessionId}`);
          return sessionId;
        }
      }

      // Fallback: return a placeholder session ID
      return 'default-session';

    } catch (error) {
      this.logger.error('Failed to get or create session:', error);
      return 'default-session';
    }
  }

  private async createAnalysisJob(
    screenshot: ScreenshotItem,
    sessionId: string,
    cancellationToken?: CancellationToken
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      cancellationToken?.throwIfCancelled();

      const template = this.config.jobTemplates[screenshot.type];

      const jobData = {
        title: template.title,
        description: template.description,
        type: 'chat' as const,
        status: 'pending' as const,
        provider: 'gemini', // Could be configurable
        model: 'gemini-pro-vision', // Vision-capable model
        request: JSON.stringify({
          messages: [
            {
              role: 'user' as const,
              content: template.description + ' Please analyze the provided screenshot.'
            }
          ],
          temperature: 0.7,
          screenshotContext: {
            filename: screenshot.filename,
            captureMode: screenshot.captureMode,
            timestamp: screenshot.timestamp,
            type: screenshot.type
          }
        }),
        metadata: {
          source: 'screenshot-plugin',
          screenshotId: screenshot.id,
          captureMode: screenshot.captureMode,
          screenshotType: screenshot.type,
          autoGenerated: true
        },
        tags: template.tags,
        sessionId: sessionId,
        priority: screenshot.type === 'problem' ? 8 : 5 // Higher priority for problems
      };

      const result = await this.bus.send({
        id: uuidv4(),
        type: 'request',
        plugin: 'database-service',
        method: 'createJob',
        payload: jobData,
        timestamp: Date.now()
      });

      if (result.success) {
        this.logger.info(`Created analysis job: ${result.data.uuid}`);
        return { success: true, jobId: result.data.uuid };
      } else {
        return { success: false, error: result.error || 'Failed to create job' };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async attachScreenshotToJob(
    screenshot: ScreenshotItem,
    jobId: string,
    cancellationToken?: CancellationToken
  ): Promise<{ success: boolean; artifactId?: string; error?: string }> {
    try {
      cancellationToken?.throwIfCancelled();

      // Get the actual job ID from UUID
      const jobResult = await this.bus.send({
        id: uuidv4(),
        type: 'request',
        plugin: 'database-service',
        method: 'getJobByUUID',
        payload: jobId,
        timestamp: Date.now()
      });

      if (!jobResult.success || !jobResult.data) {
        return { success: false, error: 'Job not found' };
      }

      const actualJobId = jobResult.data.id;

      // Create artifact
      const artifactData = {
        jobId: actualJobId,
        type: 'screenshot' as const,
        name: screenshot.filename,
        description: `Screenshot captured in ${screenshot.captureMode} mode`,
        mimeType: `image/${screenshot.captureMode === 'jpg' ? 'jpeg' : 'png'}`,
        metadata: {
          captureMode: screenshot.captureMode,
          timestamp: screenshot.timestamp,
          type: screenshot.type,
          size: screenshot.size,
          region: screenshot.region,
          windowInfo: screenshot.windowInfo,
          previewGenerated: !!screenshot.preview
        },
        fileData: Buffer.from(screenshot.base64, 'base64')
      };

      const artifactResult = await this.bus.send({
        id: uuidv4(),
        type: 'request',
        plugin: 'database-service',
        method: 'createArtifact',
        payload: artifactData,
        timestamp: Date.now()
      });

      if (artifactResult.success) {
        this.logger.info(`Attached screenshot artifact: ${artifactResult.data.id} to job: ${jobId}`);
        return { success: true, artifactId: artifactResult.data.id };
      } else {
        return { success: false, error: artifactResult.error || 'Failed to create artifact' };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  private async startJobProcessing(jobId: string, cancellationToken?: CancellationToken): Promise<void> {
    try {
      cancellationToken?.throwIfCancelled();

      // Start the job processing
      const result = await this.bus.send({
        id: uuidv4(),
        type: 'request',
        plugin: 'llm-service',
        method: 'processJob',
        payload: { jobId },
        timestamp: Date.now()
      });

      if (result.success) {
        this.logger.info(`Started processing job: ${jobId}`);
      } else {
        this.logger.warn(`Failed to start job processing: ${jobId}`, { error: result.error });
      }

    } catch (error) {
      this.logger.error('Failed to start job processing:', error);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > this.config.sessionManagement.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.activeSessions.delete(sessionId);
      this.logger.debug(`Cleaned up expired session: ${sessionId}`);
    }
  }

  // Configuration methods
  updateConfig(config: Partial<ScreenshotPipelineConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Screenshot pipeline configuration updated');
  }

  getConfig(): ScreenshotPipelineConfig {
    return { ...this.config };
  }

  // Session management
  getActiveSessions(): Array<{ id: string; lastActivity: number }> {
    return Array.from(this.activeSessions.values());
  }

  async createCustomSession(name: string, description?: string): Promise<string | null> {
    try {
      const sessionData = {
        name,
        description: description || 'Custom session for screenshot analysis'
      };

      const result = await this.bus.send({
        id: uuidv4(),
        type: 'request',
        plugin: 'database-service',
        method: 'createSession',
        payload: sessionData,
        timestamp: Date.now()
      });

      if (result.success) {
        const sessionId = result.data.uuid;
        this.activeSessions.set(sessionId, {
          id: sessionId,
          lastActivity: Date.now()
        });

        this.logger.info(`Created custom session: ${sessionId}`);
        return sessionId;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to create custom session:', error);
      return null;
    }
  }

  // Statistics and monitoring
  getPipelineStats(): {
    activeSessions: number;
    config: ScreenshotPipelineConfig;
  } {
    return {
      activeSessions: this.activeSessions.size,
      config: this.config
    };
  }
}