import { EventEmitter } from 'events';
import { ScreenshotCapture } from './ScreenshotCapture';
import { OverlayManager } from './OverlayManager';
import { PreviewGenerator } from './PreviewGenerator';
import { CaptureService } from './CaptureService';
import { JobStore } from '@job-store';

import {
  CaptureOptions,
  CaptureResult,
  PreviewOptions,
  PreviewResult,
  CaptureError,
  Job,
  JobArtifact
} from './types/CaptureTypes';

export interface PipelineConfig {
  enableJobCreation: boolean;
  enableArtifactStorage: boolean;
  enablePreviewGeneration: boolean;
  enableErrorHandling: boolean;
  defaultCaptureOptions: Partial<CaptureOptions>;
  defaultPreviewOptions: Partial<PreviewOptions>;
  captureTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface PipelineEvent {
  type: 'start' | 'progress' | 'complete' | 'error' | 'cancel';
  timestamp: Date;
  data: any;
}

export class CapturePipeline extends EventEmitter {
  private captureService: CaptureService;
  private overlayManager: OverlayManager;
  private previewGenerator: PreviewGenerator;
  private jobStore: JobStore | null;
  private config: Required<PipelineConfig>;
  private isActive = false;
  private cancellationToken = { cancelled: false };

  constructor(
    captureService: CaptureService,
    jobStore: JobStore | null = null,
    config: Partial<PipelineConfig> = {}
  ) {
    super();
    this.captureService = captureService;
    this.jobStore = jobStore;
    this.overlayManager = new OverlayManager();
    this.previewGenerator = new PreviewGenerator();
    this.config = {
      enableJobCreation: true,
      enableArtifactStorage: true,
      enablePreviewGeneration: true,
      enableErrorHandling: true,
      defaultCaptureOptions: {
        format: 'png',
        quality: 90,
        includeCursor: false
      },
      defaultPreviewOptions: {
        maxWidth: 200,
        maxHeight: 150,
        quality: 80,
        format: 'webp',
        caching: true
      },
      captureTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  async captureRegion(options?: Partial<CaptureOptions>): Promise<{
    success: boolean;
    capture?: CaptureResult;
    preview?: PreviewResult;
    job?: Job;
    artifacts?: JobArtifact[];
    error?: string;
  }> {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.emit('start', { type: 'start', timestamp: new Date(), data: { pipelineId, captureType: 'region' } });

    try {
      this.isActive = true;
      this.cancellationToken = { cancelled: false };

      // Start with overlay
      this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'overlay', status: 'starting' } });

      const overlayResult = await this.withTimeout(
        this.overlayManager.showOverlay(options),
        this.config.captureTimeout,
        'Overlay timeout'
      );

      if (this.cancellationToken.cancelled) {
        this.cleanup('cancelled');
        return { success: false, error: 'Capture cancelled by user' };
      }

      if ('error' in overlayResult) {
        this.cleanup('error', overlayResult.error.message);
        return { success: false, error: overlayResult.error.message };
      }

      // Simulate region capture (in real implementation, overlay would provide the region)
      this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'capture', status: 'processing' } });

      const regionCapture = await this.withTimeout(
        this.simulateRegionCapture(overlayResult),
        this.config.captureTimeout,
        'Region capture timeout'
      );

      if (this.cancellationToken.cancelled) {
        this.cleanup('cancelled');
        return { success: false, error: 'Capture cancelled by user' };
      }

      // Generate preview if enabled
      let preview: PreviewResult | undefined;
      if (this.config.enablePreviewGeneration && regionCapture.filePath) {
        this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'preview', status: 'generating' } });

        preview = await this.withTimeout(
          this.previewGenerator.generatePreview(regionCapture.filePath, this.config.defaultPreviewOptions),
          this.config.captureTimeout,
          'Preview generation timeout'
        );
      }

      // Create job if enabled
      let job: Job | undefined;
      let artifacts: JobArtifact[] = [];

      if (this.config.enableJobCreation && this.jobStore) {
        this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'job', status: 'creating' } });

        job = await this.withTimeout(
          this.createCaptureJob('region', regionCapture),
          this.config.captureTimeout,
          'Job creation timeout'
        );

        // Create artifacts if enabled
        if (this.config.enableArtifactStorage) {
          artifacts = await this.withTimeout(
            this.createCaptureArtifacts(job!.id, regionCapture, preview),
            this.config.captureTimeout,
            'Artifact creation timeout'
          );
        }
      }

      this.cleanup('complete');
      this.emit('complete', { type: 'complete', timestamp: new Date(), data: { capture: regionCapture, preview, job, artifacts } });

      return {
        success: true,
        capture: regionCapture,
        preview,
        job,
        artifacts
      };

    } catch (error) {
      const errorMessage = this.config.enableErrorHandling ? error.message : 'Capture failed';
      this.cleanup('error', errorMessage);
      this.emit('error', { type: 'error', timestamp: new Date(), data: { error: errorMessage, details: error } });

      return { success: false, error: errorMessage };
    }
  }

  async captureWindow(windowId: string, options?: Partial<CaptureOptions>): Promise<{
    success: boolean;
    capture?: CaptureResult;
    preview?: PreviewResult;
    job?: Job;
    artifacts?: JobArtifact[];
    error?: string;
  }> {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.emit('start', { type: 'start', timestamp: new Date(), data: { pipelineId, captureType: 'window' } });

    try {
      this.isActive = true;
      this.cancellationToken = { cancelled: false };

      // Capture window
      this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'capture', status: 'processing' } });

      const windowCapture = await this.withTimeout(
        this.captureService.captureWindow(windowId, { ...this.config.defaultCaptureOptions, ...options }),
        this.config.captureTimeout,
        'Window capture timeout'
      );

      if (this.cancellationToken.cancelled) {
        this.cleanup('cancelled');
        return { success: false, error: 'Capture cancelled by user' };
      }

      if ('error' in windowCapture) {
        this.cleanup('error', windowCapture.error.message);
        return { success: false, error: windowCapture.error.message };
      }

      // Generate preview if enabled
      let preview: PreviewResult | undefined;
      if (this.config.enablePreviewGeneration && windowCapture.filePath) {
        this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'preview', status: 'generating' } });

        preview = await this.withTimeout(
          this.previewGenerator.generatePreview(windowCapture.filePath, this.config.defaultPreviewOptions),
          this.config.captureTimeout,
          'Preview generation timeout'
        );
      }

      // Create job if enabled
      let job: Job | undefined;
      let artifacts: JobArtifact[] = [];

      if (this.config.enableJobCreation && this.jobStore) {
        this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'job', status: 'creating' } });

        job = await this.withTimeout(
          this.createCaptureJob('window', windowCapture),
          this.config.captureTimeout,
          'Job creation timeout'
        );

        // Create artifacts if enabled
        if (this.config.enableArtifactStorage) {
          artifacts = await this.withTimeout(
            this.createCaptureArtifacts(job!.id, windowCapture, preview),
            this.config.captureTimeout,
            'Artifact creation timeout'
          );
        }
      }

      this.cleanup('complete');
      this.emit('complete', { type: 'complete', timestamp: new Date(), data: { capture: windowCapture, preview, job, artifacts } });

      return {
        success: true,
        capture: windowCapture,
        preview,
        job,
        artifacts
      };

    } catch (error) {
      const errorMessage = this.config.enableErrorHandling ? error.message : 'Capture failed';
      this.cleanup('error', errorMessage);
      this.emit('error', { type: 'error', timestamp: new Date(), data: { error: errorMessage, details: error } });

      return { success: false, error: errorMessage };
    }
  }

  async captureFullScreen(options?: Partial<CaptureOptions>): Promise<{
    success: boolean;
    capture?: CaptureResult;
    preview?: PreviewResult;
    job?: Job;
    artifacts?: JobArtifact[];
    error?: string;
  }> {
    const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    this.emit('start', { type: 'start', timestamp: new Date(), data: { pipelineId, captureType: 'full' } });

    try {
      this.isActive = true;
      this.cancellationToken = { cancelled: false };

      // Capture full screen
      this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'capture', status: 'processing' } });

      const fullCapture = await this.withTimeout(
        this.captureService.captureFullScreen({ ...this.config.defaultCaptureOptions, ...options }),
        this.config.captureTimeout,
        'Full screen capture timeout'
      );

      if (this.cancellationToken.cancelled) {
        this.cleanup('cancelled');
        return { success: false, error: 'Capture cancelled by user' };
      }

      if ('error' in fullCapture) {
        this.cleanup('error', fullCapture.error.message);
        return { success: false, error: fullCapture.error.message };
      }

      // Generate preview if enabled
      let preview: PreviewResult | undefined;
      if (this.config.enablePreviewGeneration && fullCapture.filePath) {
        this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'preview', status: 'generating' } });

        preview = await this.withTimeout(
          this.previewGenerator.generatePreview(fullCapture.filePath, this.config.defaultPreviewOptions),
          this.config.captureTimeout,
          'Preview generation timeout'
        );
      }

      // Create job if enabled
      let job: Job | undefined;
      let artifacts: JobArtifact[] = [];

      if (this.config.enableJobCreation && this.jobStore) {
        this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'job', status: 'creating' } });

        job = await this.withTimeout(
          this.createCaptureJob('full', fullCapture),
          this.config.captureTimeout,
          'Job creation timeout'
        );

        // Create artifacts if enabled
        if (this.config.enableArtifactStorage) {
          artifacts = await this.withTimeout(
            this.createCaptureArtifacts(job!.id, fullCapture, preview),
            this.config.captureTimeout,
            'Artifact creation timeout'
          );
        }
      }

      this.cleanup('complete');
      this.emit('complete', { type: 'complete', timestamp: new Date(), data: { capture: fullCapture, preview, job, artifacts } });

      return {
        success: true,
        capture: fullCapture,
        preview,
        job,
        artifacts
      };

    } catch (error) {
      const errorMessage = this.config.enableErrorHandling ? error.message : 'Capture failed';
      this.cleanup('error', errorMessage);
      this.emit('error', { type: 'error', timestamp: new Date(), data: { error: errorMessage, details: error } });

      return { success: false, error: errorMessage };
    }
  }

  cancel(): void {
    if (this.isActive) {
      this.cancellationToken.cancelled = true;
      this.overlayManager.forceCancel();
      this.emit('progress', { type: 'progress', timestamp: new Date(), data: { stage: 'cancel', status: 'cancelling' } });
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private async simulateRegionCapture(overlayResult: any): Promise<CaptureResult> {
    // In a real implementation, this would use the region data from the overlay
    // For now, simulate a region capture
    return {
      id: `region_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      type: 'region',
      filePath: overlayResult.filePath || '/path/to/simulated/region.png',
      fileSize: 102400,
      format: 'png',
      width: 800,
      height: 600,
      metadata: {
        deviceScaleFactor: 1,
        region: { x: 100, y: 100, width: 800, height: 600 },
        captureDuration: 150,
        cursorIncluded: false
      }
    };
  }

  private async createCaptureJob(captureType: string, capture: CaptureResult): Promise<Job> {
    if (!this.jobStore) {
      throw new Error('JobStore not available');
    }

    return await this.jobStore.createJob({
      type: 'capture',
      title: `${captureType.charAt(0).toUpperCase() + captureType.slice(1)} Capture`,
      description: `Captured ${captureType} at ${capture.timestamp.toISOString()}`,
      params: {
        captureType,
        format: capture.format,
        fileSize: capture.fileSize,
        dimensions: { width: capture.width, height: capture.height }
      },
      metadata: {
        captureId: capture.id,
        filePath: capture.filePath,
        ...capture.metadata
      }
    });
  }

  private async createCaptureArtifacts(
    jobId: string,
    capture: CaptureResult,
    preview?: PreviewResult
  ): Promise<JobArtifact[]> {
    if (!this.jobStore) {
      throw new Error('JobStore not available');
    }

    const artifacts: JobArtifact[] = [];

    // Add main capture artifact
    if (capture.filePath) {
      try {
        const fileData = await import('fs').then(fs => fs.promises.readFile(capture.filePath));
        const mainArtifact = await this.jobStore.createArtifact({
          job_id: jobId,
          type: 'screenshot',
          name: `capture_${capture.id}.${capture.format}`,
          data: fileData,
          metadata: {
            captureType: capture.type,
            originalPath: capture.filePath,
            dimensions: { width: capture.width, height: capture.height },
            fileSize: capture.fileSize
          }
        });
        artifacts.push(mainArtifact);
      } catch (error) {
        console.warn('Failed to create main capture artifact:', error);
      }
    }

    // Add preview artifact if available
    if (preview) {
      try {
        const previewData = Buffer.from(preview.data.split(',')[1], 'base64');
        const previewArtifact = await this.jobStore.createArtifact({
          job_id: jobId,
          type: 'preview',
          name: `preview_${capture.id}.${preview.format}`,
          data: previewData,
          metadata: {
            originalId: preview.originalId,
            dimensions: { width: preview.width, height: preview.height },
            fileSize: preview.size,
            cached: preview.cached
          }
        });
        artifacts.push(previewArtifact);
      } catch (error) {
        console.warn('Failed to create preview artifact:', error);
      }
    }

    return artifacts;
  }

  private cleanup(reason: string, error?: string): void {
    this.isActive = false;
    this.cancellationToken = { cancelled: false };

    if (reason === 'error' && error) {
      console.error('Capture pipeline error:', error);
    }
  }

  isActivePipeline(): boolean {
    return this.isActive;
  }

  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getStats(): {
    isActive: boolean;
    config: PipelineConfig;
    recentEvents: PipelineEvent[];
  } {
    // This would track recent events in a real implementation
    return {
      isActive: this.isActive,
      config: this.config,
      recentEvents: []
    };
  }
}