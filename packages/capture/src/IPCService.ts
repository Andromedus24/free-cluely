import { ipcMain, ipcRenderer, IpcMainEvent, IpcRendererEvent } from 'electron';
import { ScreenshotCapture } from './ScreenshotCapture';
import { OverlayManager } from './OverlayManager';
import { PreviewGenerator } from './PreviewGenerator';
import { CaptureService } from './CaptureService';

import {
  CaptureOptions,
  CaptureResult,
  PreviewOptions,
  PreviewResult,
  CaptureError,
  DisplayInfo,
  WindowInfo
} from './types/CaptureTypes';

export interface IPCRequest {
  id: string;
  type: string;
  payload?: any;
  timestamp: number;
}

export interface IPCResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface IPCContract {
  'capture-get-displays': { input: void; output: DisplayInfo[] };
  'capture-get-windows': { input: void; output: WindowInfo[] };
  'capture-start-region': { input: Partial<CaptureOptions>; output: CaptureResult | CaptureError };
  'capture-window': { input: { windowId: string; options?: Partial<CaptureOptions> }; output: CaptureResult | CaptureError };
  'capture-full': { input: Partial<CaptureOptions>; output: CaptureResult | CaptureError };
  'capture-cancel': { input: void; output: boolean };
  'capture-generate-preview': { input: { filePath: string; options?: PreviewOptions }; output: PreviewResult | CaptureError };
  'capture-get-recent': { input: { limit?: number }; output: CaptureResult[] };
  'capture-delete': { input: { captureId: string }; output: boolean };
  'capture-get-stats': { input: void; output: any };
  'capture-clear-cache': { input: void; output: boolean };
}

export class IPCService {
  private captureService: CaptureService;
  private overlayManager: OverlayManager;
  private previewGenerator: PreviewGenerator;
  private requestHandlers = new Map<string, (payload: any) => Promise<any>>();
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(
    captureService: CaptureService,
    overlayManager: OverlayManager,
    previewGenerator: PreviewGenerator
  ) {
    this.captureService = captureService;
    this.overlayManager = overlayManager;
    this.previewGenerator = previewGenerator;

    this.setupRequestHandlers();
    this.setupIPCListeners();
  }

  private setupRequestHandlers(): void {
    // Display and window information
    this.requestHandlers.set('capture-get-displays', async () => {
      return await this.captureService.getDisplays();
    });

    this.requestHandlers.set('capture-get-windows', async () => {
      return await this.captureService.getWindows();
    });

    // Capture operations
    this.requestHandlers.set('capture-start-region', async (options: Partial<CaptureOptions>) => {
      return await this.overlayManager.showOverlay(options);
    });

    this.requestHandlers.set('capture-window', async (payload: { windowId: string; options?: Partial<CaptureOptions> }) => {
      return await this.captureService.captureWindow(payload.windowId, payload.options);
    });

    this.requestHandlers.set('capture-full', async (options: Partial<CaptureOptions>) => {
      return await this.captureService.captureFullScreen(options);
    });

    this.requestHandlers.set('capture-cancel', async () => {
      return await this.captureService.cancelCapture();
    });

    // Preview operations
    this.requestHandlers.set('capture-generate-preview', async (payload: { filePath: string; options?: PreviewOptions }) => {
      return await this.previewGenerator.generatePreview(payload.filePath, payload.options);
    });

    // Management operations
    this.requestHandlers.set('capture-get-recent', async (payload: { limit?: number }) => {
      return await this.captureService.getRecentCaptures(payload.limit || 20);
    });

    this.requestHandlers.set('capture-delete', async (payload: { captureId: string }) => {
      return await this.captureService.deleteCapture(payload.captureId);
    });

    // Statistics and cache
    this.requestHandlers.set('capture-get-stats', async () => {
      return {
        captureDirectory: this.captureService.getCaptureDirectory(),
        overlayActive: this.overlayManager.isActiveOverlay(),
        cacheStats: this.previewGenerator.getCacheStats(),
        captureStats: this.captureService.getCacheStats()
      };
    });

    this.requestHandlers.set('capture-clear-cache', async () => {
      await this.previewGenerator.clearCache();
      this.captureService.clearPreviewCache();
      return true;
    });
  }

  private setupIPCListeners(): void {
    // Main process handlers
    ipcMain.handle('capture-request', async (event: IpcMainEvent, request: IPCRequest) => {
      return await this.handleRequest(request);
    });

    // Listen for overlay events
    ipcMain.on('overlay-region-selected', (event: IpcMainEvent, region: any) => {
      // Forward to overlay manager
      this.overlayManager['handleRegionSelected'](region);
    });

    ipcMain.on('overlay-region-cancelled', (event: IpcMainEvent) => {
      // Forward to overlay manager
      this.overlayManager['handleRegionCancelled']();
    });
  }

  private async handleRequest(request: IPCRequest): Promise<IPCResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);

      // Find handler
      const handler = this.requestHandlers.get(request.type);
      if (!handler) {
        throw new Error(`Unknown request type: ${request.type}`);
      }

      // Execute handler
      const result = await handler(request.payload);

      // Validate response
      this.validateResponse(request.type, result);

      return {
        id: request.id,
        success: true,
        data: result,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`IPC request failed: ${request.type}`, error);

      return {
        id: request.id,
        success: false,
        error: {
          code: error.code || 'IPC_ERROR',
          message: error.message || 'Unknown error',
          details: error.details
        },
        timestamp: Date.now()
      };
    }
  }

  private validateRequest(request: IPCRequest): void {
    if (!request.id || typeof request.id !== 'string') {
      throw new Error('Request ID is required and must be a string');
    }

    if (!request.type || typeof request.type !== 'string') {
      throw new Error('Request type is required and must be a string');
    }

    if (!request.timestamp || typeof request.timestamp !== 'number') {
      throw new Error('Request timestamp is required and must be a number');
    }

    // Validate timestamp is recent (within 5 minutes)
    if (Date.now() - request.timestamp > 5 * 60 * 1000) {
      throw new Error('Request timestamp is too old');
    }

    // Type-specific validation
    switch (request.type) {
      case 'capture-window':
        if (!request.payload?.windowId) {
          throw new Error('Window ID is required for window capture');
        }
        break;

      case 'capture-generate-preview':
        if (!request.payload?.filePath) {
          throw new Error('File path is required for preview generation');
        }
        break;

      case 'capture-delete':
        if (!request.payload?.captureId) {
          throw new Error('Capture ID is required for deletion');
        }
        break;
    }
  }

  private validateResponse(type: string, response: any): void {
    // Type-specific response validation
    switch (type) {
      case 'capture-get-displays':
        if (!Array.isArray(response)) {
          throw new Error('Displays response must be an array');
        }
        break;

      case 'capture-get-windows':
        if (!Array.isArray(response)) {
          throw new Error('Windows response must be an array');
        }
        break;

      case 'capture-start-region':
      case 'capture-window':
      case 'capture-full':
        // These can return either CaptureResult or CaptureError
        if (response && typeof response === 'object') {
          if ('error' in response) {
            // It's an error, validate error structure
            if (!response.code || !response.message) {
              throw new Error('Capture error must have code and message');
            }
          } else {
            // It's a result, validate result structure
            if (!response.id || !response.timestamp || !response.type) {
              throw new Error('Capture result must have id, timestamp, and type');
            }
          }
        }
        break;
    }
  }

  // Renderer process helpers
  static createRendererClient(): IPCRendererClient {
    return new IPCRendererClient();
  }
}

export class IPCRendererClient {
  private requestId = 0;

  async invoke<K extends keyof IPCContract>(
    type: K,
    payload?: IPCContract[K]['input']
  ): Promise<IPCContract[K]['output']> {
    const request: IPCRequest = {
      id: `req_${this.requestId++}_${Date.now()}`,
      type,
      payload,
      timestamp: Date.now()
    };

    try {
      const response: IPCResponse = await (ipcRenderer as any).invoke('capture-request', request);

      if (!response.success) {
        const error = new Error(response.error?.message || 'Unknown error');
        (error as any).code = response.error?.code;
        (error as any).details = response.error?.details;
        throw error;
      }

      return response.data;
    } catch (error) {
      console.error(`IPC request failed: ${type}`, error);
      throw error;
    }
  }

  // Convenience methods
  async getDisplays(): Promise<DisplayInfo[]> {
    return this.invoke('capture-get-displays');
  }

  async getWindows(): Promise<WindowInfo[]> {
    return this.invoke('capture-get-windows');
  }

  async startRegionCapture(options?: Partial<CaptureOptions>): Promise<CaptureResult | CaptureError> {
    return this.invoke('capture-start-region', options);
  }

  async captureWindow(windowId: string, options?: Partial<CaptureOptions>): Promise<CaptureResult | CaptureError> {
    return this.invoke('capture-window', { windowId, options });
  }

  async captureFullScreen(options?: Partial<CaptureOptions>): Promise<CaptureResult | CaptureError> {
    return this.invoke('capture-full', options);
  }

  async cancelCapture(): Promise<boolean> {
    return this.invoke('capture-cancel');
  }

  async generatePreview(filePath: string, options?: PreviewOptions): Promise<PreviewResult | CaptureError> {
    return this.invoke('capture-generate-preview', { filePath, options });
  }

  async getRecentCaptures(limit?: number): Promise<CaptureResult[]> {
    return this.invoke('capture-get-recent', { limit });
  }

  async deleteCapture(captureId: string): Promise<boolean> {
    return this.invoke('capture-delete', { captureId });
  }

  async getStats(): Promise<any> {
    return this.invoke('capture-get-stats');
  }

  async clearCache(): Promise<boolean> {
    return this.invoke('capture-clear-cache');
  }
}

// Type-safe IPC helpers
export function createCaptureIPC(captureService: CaptureService): {
  main: IPCService;
  renderer: IPCRendererClient;
} {
  const overlayManager = new OverlayManager();
  const previewGenerator = new PreviewGenerator();
  const main = new IPCService(captureService, overlayManager, previewGenerator);
  const renderer = IPCRendererClient.createRendererClient();

  return { main, renderer };
}