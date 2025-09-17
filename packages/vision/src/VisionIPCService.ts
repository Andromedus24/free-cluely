import { ipcMain, ipcRenderer, IpcMainEvent, IpcRendererEvent } from 'electron';
import { VisionService } from './VisionService';
import {
  VisionRequest,
  VisionResult,
  VisionOptions,
  StructuredTemplate,
  VisionIPCContract
} from './types/VisionTypes';

export interface VisionIPCRequest {
  id: string;
  type: keyof VisionIPCContract;
  payload?: any;
  timestamp: number;
}

export interface VisionIPCResponse {
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

export class VisionIPCService {
  private visionService: VisionService;
  private requestHandlers = new Map<string, (payload: any) => Promise<any>>();

  constructor(visionService: VisionService) {
    this.visionService = visionService;
    this.setupRequestHandlers();
    this.setupIPCListeners();
  }

  private setupRequestHandlers(): void {
    // Vision analysis operations
    this.requestHandlers.set('vision-analyze', async (payload: VisionRequest) => {
      return await this.visionService.analyze(payload);
    });

    this.requestHandlers.set('vision-ocr', async (payload: { imageData: Buffer | string; options?: Omit<VisionOptions, 'analyzeContent' | 'extractStructured'> }) => {
      const request: VisionRequest = {
        id: `ocr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        type: 'ocr',
        imageData: payload.imageData,
        options: payload.options
      };
      return await this.visionService.analyze(request);
    });

    this.requestHandlers.set('vision-extract-structured', async (payload: { imageData: Buffer | string; templateId: string; options?: VisionOptions }) => {
      // Get template (in real implementation, this would come from a template store)
      const template: StructuredTemplate = {
        id: payload.templateId,
        name: 'Default Template',
        description: 'Default extraction template',
        fields: [],
        validation: []
      };

      const request: VisionRequest = {
        id: `structured_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        type: 'structured_extraction',
        imageData: payload.imageData,
        options: {
          ...payload.options,
          templates: [template]
        }
      };
      return await this.visionService.analyze(request);
    });

    // Management operations
    this.requestHandlers.set('vision-get-templates', async () => {
      // Return available templates (in real implementation, query template store)
      return [
        {
          id: 'default',
          name: 'Default Template',
          description: 'Basic information extraction',
          fields: [
            {
              id: 'name',
              name: 'Name',
              type: 'text',
              required: true,
              description: 'Full name',
              extraction: {
                method: 'regex',
                pattern: '([A-Z][a-z]+ [A-Z][a-z]+)',
                confidence: 0.7
              }
            },
            {
              id: 'email',
              name: 'Email',
              type: 'email',
              required: true,
              description: 'Email address',
              extraction: {
                method: 'regex',
                pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
                confidence: 0.9
              }
            }
          ],
          validation: []
        }
      ];
    });

    this.requestHandlers.set('vision-get-capabilities', async () => {
      return await this.visionService.getCapabilities();
    });

    this.requestHandlers.set('vision-clear-cache', async () => {
      return await this.visionService.clearCache();
    });
  }

  private setupIPCListeners(): void {
    // Main process handlers
    ipcMain.handle('vision-request', async (event: IpcMainEvent, request: VisionIPCRequest) => {
      return await this.handleRequest(request);
    });

    // Listen for vision service events
    this.visionService.on('progress', (data) => {
      ipcMain.emit('vision-progress', data);
    });

    this.visionService.on('error', (data) => {
      ipcMain.emit('vision-error', data);
    });
  }

  private async handleRequest(request: VisionIPCRequest): Promise<VisionIPCResponse> {
    const startTime = Date.now();

    try {
      // Validate request
      this.validateRequest(request);

      // Find handler
      const handler = this.requestHandlers.get(request.type);
      if (!handler) {
        throw new Error(`Unknown vision request type: ${request.type}`);
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
      console.error(`Vision IPC request failed: ${request.type}`, error);

      return {
        id: request.id,
        success: false,
        error: {
          code: error.code || 'VISION_IPC_ERROR',
          message: error.message || 'Unknown error',
          details: error.details
        },
        timestamp: Date.now()
      };
    }
  }

  private validateRequest(request: VisionIPCRequest): void {
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
      case 'vision-analyze':
        if (!request.payload?.id || !request.payload?.type || !request.payload?.imageData) {
          throw new Error('Vision analysis requires id, type, and imageData');
        }
        break;

      case 'vision-ocr':
        if (!request.payload?.imageData) {
          throw new Error('OCR requires imageData');
        }
        break;

      case 'vision-extract-structured':
        if (!request.payload?.imageData || !request.payload?.templateId) {
          throw new Error('Structured extraction requires imageData and templateId');
        }
        break;
    }
  }

  private validateResponse(type: string, response: any): void {
    // Type-specific response validation
    switch (type) {
      case 'vision-analyze':
      case 'vision-ocr':
      case 'vision-extract-structured':
        if (!response || typeof response !== 'object') {
          throw new Error('Vision analysis response must be an object');
        }

        if (!response.id || !response.type || !response.hasOwnProperty('success')) {
          throw new Error('Vision response must have id, type, and success properties');
        }

        if (response.success && !response.timestamp) {
          throw new Error('Successful vision response must have timestamp');
        }

        if (!response.success && !response.error) {
          throw new Error('Failed vision response must have error information');
        }
        break;

      case 'vision-get-templates':
        if (!Array.isArray(response)) {
          throw new Error('Templates response must be an array');
        }

        response.forEach((template: any) => {
          if (!template.id || !template.name || !Array.isArray(template.fields)) {
            throw new Error('Each template must have id, name, and fields array');
          }
        });
        break;

      case 'vision-get-capabilities':
        if (!response || typeof response !== 'object') {
          throw new Error('Capabilities response must be an object');
        }

        if (!response.hasOwnProperty('ocr') || !response.hasOwnProperty('analysis') || !response.hasOwnProperty('structured')) {
          throw new Error('Capabilities must have ocr, analysis, and structured properties');
        }

        if (!Array.isArray(response.languages)) {
          throw new Error('Languages must be an array');
        }
        break;

      case 'vision-clear-cache':
        if (typeof response !== 'boolean') {
          throw new Error('Clear cache response must be a boolean');
        }
        break;
    }
  }

  // Renderer process helpers
  static createRendererClient(): VisionIPCRendererClient {
    return new VisionIPCRendererClient();
  }
}

export class VisionIPCRendererClient {
  private requestId = 0;

  async invoke<K extends keyof VisionIPCContract>(
    type: K,
    payload?: VisionIPCContract[K]['input']
  ): Promise<VisionIPCContract[K]['output']> {
    const request: VisionIPCRequest = {
      id: `vision_req_${this.requestId++}_${Date.now()}`,
      type,
      payload,
      timestamp: Date.now()
    };

    try {
      const response: VisionIPCResponse = await (ipcRenderer as any).invoke('vision-request', request);

      if (!response.success) {
        const error = new Error(response.error?.message || 'Unknown vision error');
        (error as any).code = response.error?.code;
        (error as any).details = response.error?.details;
        throw error;
      }

      return response.data;
    } catch (error) {
      console.error(`Vision IPC request failed: ${type}`, error);
      throw error;
    }
  }

  // Convenience methods
  async analyze(request: VisionRequest): Promise<VisionResult> {
    return this.invoke('vision-analyze', request);
  }

  async ocr(imageData: Buffer | string, options?: Omit<VisionOptions, 'analyzeContent' | 'extractStructured'>): Promise<VisionResult> {
    return this.invoke('vision-ocr', { imageData, options });
  }

  async extractStructured(imageData: Buffer | string, templateId: string, options?: VisionOptions): Promise<VisionResult> {
    return this.invoke('vision-extract-structured', { imageData, templateId, options });
  }

  async getTemplates(): Promise<StructuredTemplate[]> {
    return this.invoke('vision-get-templates');
  }

  async getCapabilities(): Promise<{ ocr: boolean; analysis: boolean; structured: boolean; languages: string[] }> {
    return this.invoke('vision-get-capabilities');
  }

  async clearCache(): Promise<boolean> {
    return this.invoke('vision-clear-cache');
  }
}

// Type-safe IPC helpers
export function createVisionIPC(visionService: VisionService): {
  main: VisionIPCService;
  renderer: VisionIPCRendererClient;
} {
  const main = new VisionIPCService(visionService);
  const renderer = VisionIPCRendererClient.createRendererClient();

  return { main, renderer };
}