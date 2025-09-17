import { EventEmitter } from 'events';
import { z } from 'zod';
import { SecureStorage, Settings } from './SecureStorage';
import { ProviderConfig } from '@atlas/adapters';

// IPC message schemas
const IPCMessageSchema = z.object({
  id: z.string(),
  type: z.enum(['request', 'response', 'event']),
  method: z.string(),
  payload: z.unknown(),
  timestamp: z.number()
});

export type IPCMessage = z.infer<typeof IPCMessageSchema>;

const IPCResponseSchema = z.object({
  id: z.string(),
  type: z.literal('response'),
  method: z.string(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.number()
});

export type IPCResponse = z.infer<typeof IPCResponseSchema>;

// IPC method schemas
const SetProviderKeySchema = z.object({
  providerName: z.string(),
  apiKey: z.string()
});

const GetProviderKeySchema = z.object({
  providerName: z.string()
});

const SaveSettingsSchema = z.object({
  settings: z.record(z.unknown())
});

// Security validation schema
const SecurityCheckSchema = z.object({
  origin: z.string(),
  method: z.string(),
  timestamp: z.number(),
  nonce: z.string()
});

export interface IPCSecurityConfig {
  allowedOrigins: string[];
  enableNonceValidation: boolean;
  maxAge: number; // Maximum age for requests in milliseconds
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

export class IPCService extends EventEmitter {
  private secureStorage: SecureStorage;
  private config: IPCSecurityConfig;
  private requestCache: Map<string, { timestamp: number; count: number }> = new Map();

  constructor(secureStorage: SecureStorage, config?: Partial<IPCSecurityConfig>) {
    super();
    this.secureStorage = secureStorage;
    this.config = {
      allowedOrigins: ['atlas://main', 'atlas://renderer'],
      enableNonceValidation: true,
      maxAge: 30000, // 30 seconds
      rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100
      },
      ...config
    };

    this.setupMethods();
  }

  private setupMethods(): void {
    // Provider key management
    this.on('setProviderKey', this.handleSetProviderKey.bind(this));
    this.on('getProviderKey', this.handleGetProviderKey.bind(this));
    this.on('deleteProviderKey', this.handleDeleteProviderKey.bind(this));
    this.on('listProviderKeys', this.handleListProviderKeys.bind(this));

    // Settings management
    this.on('saveSettings', this.handleSaveSettings.bind(this));
    this.on('getSettings', this.handleGetSettings.bind(this));
    this.on('exportSettings', this.handleExportSettings.bind(this));
    this.on('importSettings', this.handleImportSettings.bind(this));

    // General secure storage
    this.on('setSecureItem', this.handleSetSecureItem.bind(this));
    this.on('getSecureItem', this.handleGetSecureItem.bind(this));
    this.on('deleteSecureItem', this.handleDeleteSecureItem.bind(this));

    // Security operations
    this.on('lock', this.handleLock.bind(this));
    this.on('unlock', this.handleUnlock.bind(this));
    this.on('isLocked', this.handleIsLocked.bind(this));
    this.on('healthCheck', this.handleHealthCheck.bind(this));
    this.on('clearAllData', this.handleClearAllData.bind(this));
  }

  // Message handling
  async handleMessage(message: IPCMessage, origin: string): Promise<IPCResponse> {
    try {
      // Security validation
      await this.validateSecurity(message, origin);

      // Rate limiting
      this.checkRateLimit(origin);

      // Execute method
      const result = await this.executeMethod(message.method, message.payload);

      return {
        id: message.id,
        type: 'response',
        method: message.method,
        success: true,
        data: result,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        id: message.id,
        type: 'response',
        method: message.method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  private async validateSecurity(message: IPCMessage, origin: string): Promise<void> {
    // Validate origin
    if (!this.config.allowedOrigins.includes(origin)) {
      throw new Error(`Origin not allowed: ${origin}`);
    }

    // Validate timestamp
    const now = Date.now();
    if (now - message.timestamp > this.config.maxAge) {
      throw new Error('Request expired');
    }

    // Validate nonce if enabled
    if (this.config.enableNonceValidation) {
      const nonce = (message.payload as any)?.nonce;
      if (!nonce) {
        throw new Error('Nonce required');
      }

      // Check for nonce reuse (simple implementation)
      // In production, you'd want a more robust nonce storage system
      const nonceKey = `${origin}:${nonce}`;
      if (this.requestCache.has(nonceKey)) {
        throw new Error('Nonce reuse detected');
      }

      this.requestCache.set(nonceKey, { timestamp: now, count: 1 });
    }
  }

  private checkRateLimit(origin: string): void {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;
    const key = `rate_limit:${origin}`;

    const record = this.requestCache.get(key);
    if (!record || record.timestamp < windowStart) {
      this.requestCache.set(key, { timestamp: now, count: 1 });
      return;
    }

    if (record.count >= this.config.rateLimit.maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    record.count++;
  }

  private async executeMethod(method: string, payload: unknown): Promise<any> {
    const handler = this.listeners(method)[0];
    if (!handler) {
      throw new Error(`Unknown method: ${method}`);
    }

    return await handler.call(this, payload);
  }

  // Method handlers
  private async handleSetProviderKey(payload: unknown): Promise<void> {
    const validated = SetProviderKeySchema.parse(payload);
    await this.secureStorage.setProviderKey(validated.providerName, validated.apiKey);
  }

  private async handleGetProviderKey(payload: unknown): Promise<string | null> {
    const validated = GetProviderKeySchema.parse(payload);
    return await this.secureStorage.getProviderKey(validated.providerName);
  }

  private async handleDeleteProviderKey(payload: unknown): Promise<boolean> {
    const validated = GetProviderKeySchema.parse(payload);
    return await this.secureStorage.deleteProviderKey(validated.providerName);
  }

  private async handleListProviderKeys(): Promise<string[]> {
    return await this.secureStorage.listProviderKeys();
  }

  private async handleSaveSettings(payload: unknown): Promise<void> {
    const validated = SaveSettingsSchema.parse(payload);
    await this.secureStorage.saveSettings(validated.settings);
  }

  private async handleGetSettings(): Promise<Settings> {
    return await this.secureStorage.getSettings();
  }

  private async handleExportSettings(): Promise<string> {
    return await this.secureStorage.exportSettings();
  }

  private async handleImportSettings(payload: unknown): Promise<void> {
    if (typeof payload !== 'string') {
      throw new Error('Import data must be a string');
    }
    await this.secureStorage.importSettings(payload);
  }

  private async handleSetSecureItem(payload: unknown): Promise<void> {
    const { key, value, metadata } = payload as { key: string; value: string; metadata?: Record<string, unknown> };
    await this.secureStorage.setSecureItem(key, value, metadata);
  }

  private async handleGetSecureItem(payload: unknown): Promise<string | null> {
    const { key } = payload as { key: string };
    return await this.secureStorage.getSecureItem(key);
  }

  private async handleDeleteSecureItem(payload: unknown): Promise<boolean> {
    const { key } = payload as { key: string };
    return await this.secureStorage.deleteSecureItem(key);
  }

  private async handleLock(): Promise<void> {
    await this.secureStorage.lock();
  }

  private async handleUnlock(payload: unknown): Promise<boolean> {
    const { password } = payload as { password?: string };
    return await this.secureStorage.unlock(password);
  }

  private async handleIsLocked(): Promise<boolean> {
    return await this.secureStorage.isLocked();
  }

  private async handleHealthCheck(): Promise<{ status: 'healthy' | 'error'; message?: string }> {
    return await this.secureStorage.healthCheck();
  }

  private async handleClearAllData(): Promise<void> {
    await this.secureStorage.clearAllData();
  }

  // Cleanup expired cache entries
  private cleanup(): void {
    const now = Date.now();
    const maxAge = this.config.rateLimit.windowMs;

    for (const [key, record] of this.requestCache.entries()) {
      if (now - record.timestamp > maxAge) {
        this.requestCache.delete(key);
      }
    }
  }

  // Start periodic cleanup
  startCleanup(interval: number = 60000): void {
    setInterval(() => this.cleanup(), interval);
  }

  // Get current security status
  getSecurityStatus(): {
    allowedOrigins: string[];
    rateLimit: { current: number; max: number; window: number };
    cacheSize: number;
  } {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;
    let currentRequests = 0;

    for (const [key, record] of this.requestCache.entries()) {
      if (key.startsWith('rate_limit:') && record.timestamp >= windowStart) {
        currentRequests += record.count;
      }
    }

    return {
      allowedOrigins: this.config.allowedOrigins,
      rateLimit: {
        current: currentRequests,
        max: this.config.rateLimit.maxRequests,
        window: this.config.rateLimit.windowMs
      },
      cacheSize: this.requestCache.size
    };
  }

  // Update security configuration
  updateSecurityConfig(config: Partial<IPCSecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Electron IPC integration helper
export class ElectronIPCIntegration {
  private ipcService: IPCService;
  private electronIPC: any;

  constructor(ipcService: IPCService, electronIPC: any) {
    this.ipcService = ipcService;
    this.electronIPC = electronIPC;
    this.setupElectronHandlers();
  }

  private setupElectronHandlers(): void {
    // Handle IPC calls from renderer process
    this.electronIPC.handle('atlas-secure-call', async (event: any, message: IPCMessage) => {
      const origin = `atlas://${event.sender.id}`;
      return await this.ipcService.handleMessage(message, origin);
    });

    // Handle events from renderer to main
    this.electronIPC.on('atlas-secure-event', (event: any, eventData: any) => {
      const origin = `atlas://${event.sender.id}`;
      // Process events if needed
    });

    // Broadcast events to all renderers
    this.ipcService.on('settings-changed', (settings: Settings) => {
      this.electronIPC.broadcast('atlas-settings-changed', settings);
    });

    this.ipcService.on('security-lock', () => {
      this.electronIPC.broadcast('atlas-security-lock');
    });
  }

  // Send event to specific renderer
  sendToRenderer(webContents: any, event: string, data: any): void {
    webContents.send(`atlas-${event}`, data);
  }

  // Broadcast event to all renderers
  broadcast(event: string, data: any): void {
    this.electronIPC.broadcast(`atlas-${event}`, data);
  }
}

// HTTP API integration helper for development/testing
export class HTTPAPIIntegration {
  private ipcService: IPCService;
  private express: any;

  constructor(ipcService: IPCService, express: any) {
    this.ipcService = ipcService;
    this.express = express;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    const router = this.express.Router();

    // Authentication middleware
    router.use((req: any, res: any, next: any) => {
      // Simple API key authentication for development
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.ATLAS_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    });

    // Provider key endpoints
    router.post('/provider-keys', async (req: any, res: any) => {
      try {
        const message: IPCMessage = {
          id: Date.now().toString(),
          type: 'request',
          method: 'setProviderKey',
          payload: req.body,
          timestamp: Date.now()
        };

        const response = await this.ipcService.handleMessage(message, 'atlas://api');
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/provider-keys/:providerName', async (req: any, res: any) => {
      try {
        const message: IPCMessage = {
          id: Date.now().toString(),
          type: 'request',
          method: 'getProviderKey',
          payload: { providerName: req.params.providerName },
          timestamp: Date.now()
        };

        const response = await this.ipcService.handleMessage(message, 'atlas://api');
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Settings endpoints
    router.get('/settings', async (req: any, res: any) => {
      try {
        const message: IPCMessage = {
          id: Date.now().toString(),
          type: 'request',
          method: 'getSettings',
          payload: {},
          timestamp: Date.now()
        };

        const response = await this.ipcService.handleMessage(message, 'atlas://api');
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.put('/settings', async (req: any, res: any) => {
      try {
        const message: IPCMessage = {
          id: Date.now().toString(),
          type: 'request',
          method: 'saveSettings',
          payload: { settings: req.body },
          timestamp: Date.now()
        };

        const response = await this.ipcService.handleMessage(message, 'atlas://api');
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Health check
    router.get('/health', async (req: any, res: any) => {
      try {
        const message: IPCMessage = {
          id: Date.now().toString(),
          type: 'request',
          method: 'healthCheck',
          payload: {},
          timestamp: Date.now()
        };

        const response = await this.ipcService.handleMessage(message, 'atlas://api');
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Security status
    router.get('/security', (req: any, res: any) => {
      res.json(this.ipcService.getSecurityStatus());
    });

    return router;
  }
}