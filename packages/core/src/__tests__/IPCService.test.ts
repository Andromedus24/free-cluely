import { IPCService, IPCSecurityConfig, IPCMessage } from '../IPCService';
import { SecureStorage } from '../SecureStorage';
import * as keytar from 'keytar';

// Mock keytar
jest.mock('keytar');
const mockKeytar = keytar as jest.Mocked<typeof keytar>;

describe('IPCService', () => {
  let ipcService: IPCService;
  let secureStorage: SecureStorage;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset keytar mocks
    mockKeytar.getPassword.mockResolvedValue('a'.repeat(64));
    mockKeytar.setPassword.mockResolvedValue();
    mockKeytar.deletePassword.mockResolvedValue(true);
    mockKeytar.findCredentials.mockResolvedValue([]);

    // Create instances
    secureStorage = new SecureStorage();
    ipcService = new IPCService(secureStorage);
  });

  describe('Constructor and Configuration', () => {
    it('should initialize with default security config', () => {
      const service = new IPCService(secureStorage);

      const status = service.getSecurityStatus();
      expect(status.allowedOrigins).toEqual(['atlas://main', 'atlas://renderer']);
      expect(status.rateLimit.max).toBe(100);
      expect(status.rateLimit.window).toBe(60000);
    });

    it('should accept custom security config', () => {
      const customConfig: Partial<IPCSecurityConfig> = {
        allowedOrigins: ['custom://origin'],
        enableNonceValidation: false,
        maxAge: 60000,
        rateLimit: {
          windowMs: 30000,
          maxRequests: 50
        }
      };

      const service = new IPCService(secureStorage, customConfig);

      const status = service.getSecurityStatus();
      expect(status.allowedOrigins).toEqual(['custom://origin']);
      expect(status.rateLimit.max).toBe(50);
      expect(status.rateLimit.window).toBe(30000);
    });

    it('should setup all method handlers', () => {
      const service = new IPCService(secureStorage);

      // Verify that common methods are registered
      expect(service.listenerCount('setProviderKey')).toBe(1);
      expect(service.listenerCount('getProviderKey')).toBe(1);
      expect(service.listenerCount('saveSettings')).toBe(1);
      expect(service.listenerCount('getSettings')).toBe(1);
      expect(service.listenerCount('lock')).toBe(1);
    });
  });

  describe('Security Validation', () => {
    it('should reject requests from unauthorized origins', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      await expect(ipcService.handleMessage(message, 'unauthorized://origin'))
        .rejects.toThrow('Origin not allowed');
    });

    it('should reject expired requests', async () => {
      const oldTimestamp = Date.now() - 35000; // 35 seconds ago (older than 30s max age)

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'test-nonce' },
        timestamp: oldTimestamp
      };

      await expect(ipcService.handleMessage(message, 'atlas://main'))
        .rejects.toThrow('Request expired');
    });

    it('should reject requests without nonce when validation is enabled', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: {}, // No nonce
        timestamp: Date.now()
      };

      await expect(ipcService.handleMessage(message, 'atlas://main'))
        .rejects.toThrow('Nonce required');
    });

    it('should reject nonce reuse', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'reused-nonce' },
        timestamp: Date.now()
      };

      // First request should succeed
      await ipcService.handleMessage(message, 'atlas://main');

      // Second request with same nonce should fail
      await expect(ipcService.handleMessage(message, 'atlas://main'))
        .rejects.toThrow('Nonce reuse detected');
    });

    it('should allow valid requests with unique nonce', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'unique-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.id).toBe('test-1');
      expect(response.method).toBe('getSettings');
    });

    it('should allow requests without nonce when validation is disabled', async () => {
      const service = new IPCService(secureStorage, { enableNonceValidation: false });

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: {}, // No nonce
        timestamp: Date.now()
      };

      const response = await service.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const service = new IPCService(secureStorage, {
        rateLimit: {
          windowMs: 1000, // 1 second window
          maxRequests: 2  // Max 2 requests
        }
      });

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'nonce-1' },
        timestamp: Date.now()
      };

      // First 2 requests should succeed
      await service.handleMessage({ ...message, payload: { nonce: 'nonce-1' } }, 'atlas://main');
      await service.handleMessage({ ...message, payload: { nonce: 'nonce-2' } }, 'atlas://main');

      // Third request should be rate limited
      await expect(service.handleMessage({ ...message, payload: { nonce: 'nonce-3' } }, 'atlas://main'))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should reset rate limit after window expires', async () => {
      const service = new IPCService(secureStorage, {
        rateLimit: {
          windowMs: 100, // 100ms window
          maxRequests: 1  // Max 1 request
        }
      });

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'nonce-1' },
        timestamp: Date.now()
      };

      // First request should succeed
      await service.handleMessage(message, 'atlas://main');

      // Second request should be rate limited
      await expect(service.handleMessage({ ...message, payload: { nonce: 'nonce-2' } }, 'atlas://main'))
        .rejects.toThrow('Rate limit exceeded');

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Request after window should succeed
      const response = await service.handleMessage({ ...message, payload: { nonce: 'nonce-3' } }, 'atlas://main');
      expect(response.success).toBe(true);
    });

    it('should track rate limit per origin', async () => {
      const service = new IPCService(secureStorage, {
        rateLimit: {
          windowMs: 1000,
          maxRequests: 1
        }
      });

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'nonce-1' },
        timestamp: Date.now()
      };

      // First origin should be rate limited after 1 request
      await service.handleMessage(message, 'atlas://main');
      await expect(service.handleMessage({ ...message, payload: { nonce: 'nonce-2' } }, 'atlas://main'))
        .rejects.toThrow('Rate limit exceeded');

      // Different origin should not be affected
      const response = await service.handleMessage({ ...message, payload: { nonce: 'nonce-3' } }, 'atlas://renderer');
      expect(response.success).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('should handle unknown methods gracefully', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'unknownMethod',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unknown method: unknownMethod');
    });

    it('should return error response when method throws', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'setProviderKey',
        payload: { providerName: 'test', apiKey: 'test-key', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      // Mock secure storage to throw error
      jest.spyOn(secureStorage, 'setProviderKey').mockRejectedValue(new Error('Storage error'));

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Storage error');
    });

    it('should include timestamp in response', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.timestamp).toBeGreaterThan(0);
      expect(response.timestamp).toBeGreaterThanOrEqual(message.timestamp);
    });
  });

  describe('Provider Key Methods', () => {
    it('should handle setProviderKey', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'setProviderKey',
        payload: { providerName: 'openai', apiKey: 'sk-test-key', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(secureStorage.setProviderKey).toHaveBeenCalledWith('openai', 'sk-test-key');
    });

    it('should handle getProviderKey', async () => {
      jest.spyOn(secureStorage, 'getProviderKey').mockResolvedValue('retrieved-key');

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getProviderKey',
        payload: { providerName: 'openai', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toBe('retrieved-key');
      expect(secureStorage.getProviderKey).toHaveBeenCalledWith('openai');
    });

    it('should handle deleteProviderKey', async () => {
      jest.spyOn(secureStorage, 'deleteProviderKey').mockResolvedValue(true);

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'deleteProviderKey',
        payload: { providerName: 'openai', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toBe(true);
      expect(secureStorage.deleteProviderKey).toHaveBeenCalledWith('openai');
    });

    it('should handle listProviderKeys', async () => {
      jest.spyOn(secureStorage, 'listProviderKeys').mockResolvedValue(['openai', 'anthropic']);

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'listProviderKeys',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(['openai', 'anthropic']);
    });

    it('should validate setProviderKey payload', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'setProviderKey',
        payload: { invalid: 'payload', nonce: 'test-nonce' }, // Missing required fields
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(false);
      expect(response.error).toContain('providerName');
    });
  });

  describe('Settings Methods', () => {
    it('should handle saveSettings', async () => {
      const settings = { theme: 'dark', providers: { openai: { enabled: true } } };

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'saveSettings',
        payload: { settings, nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(secureStorage.saveSettings).toHaveBeenCalledWith(settings);
    });

    it('should handle getSettings', async () => {
      const mockSettings = {
        providers: { openai: { enabled: true } },
        preferences: { theme: 'dark' },
        security: { encryptionEnabled: true }
      };

      jest.spyOn(secureStorage, 'getSettings').mockResolvedValue(mockSettings);

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockSettings);
    });

    it('should handle exportSettings', async () => {
      jest.spyOn(secureStorage, 'exportSettings').mockResolvedValue('{"settings":{}}');

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'exportSettings',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toBe('{"settings":{}}');
    });

    it('should handle importSettings', async () => {
      const exportData = '{"settings":{},"providerKeys":{}}';

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'importSettings',
        payload: exportData,
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(secureStorage.importSettings).toHaveBeenCalledWith(exportData);
    });

    it('should reject importSettings with non-string payload', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'importSettings',
        payload: { invalid: 'payload' }, // Should be string
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Import data must be a string');
    });
  });

  describe('Security Operations', () => {
    it('should handle lock', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'lock',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(secureStorage.lock).toHaveBeenCalled();
    });

    it('should handle unlock', async () => {
      jest.spyOn(secureStorage, 'unlock').mockResolvedValue(true);

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'unlock',
        payload: { password: 'test-password', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toBe(true);
      expect(secureStorage.unlock).toHaveBeenCalledWith('test-password');
    });

    it('should handle isLocked', async () => {
      jest.spyOn(secureStorage, 'isLocked').mockResolvedValue(false);

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'isLocked',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toBe(false);
    });

    it('should handle healthCheck', async () => {
      const healthResult = { status: 'healthy' as const };
      jest.spyOn(secureStorage, 'healthCheck').mockResolvedValue(healthResult);

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'healthCheck',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(healthResult);
    });

    it('should handle clearAllData', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'clearAllData',
        payload: { nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(secureStorage.clearAllData).toHaveBeenCalled();
    });
  });

  describe('General Secure Storage Methods', () => {
    it('should handle setSecureItem', async () => {
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'setSecureItem',
        payload: { key: 'test-key', value: 'test-value', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(secureStorage.setSecureItem).toHaveBeenCalledWith('test-key', 'test-value', undefined);
    });

    it('should handle setSecureItem with metadata', async () => {
      const metadata = { type: 'credentials', service: 'test' };

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'setSecureItem',
        payload: { key: 'test-key', value: 'test-value', metadata, nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(secureStorage.setSecureItem).toHaveBeenCalledWith('test-key', 'test-value', metadata);
    });

    it('should handle getSecureItem', async () => {
      jest.spyOn(secureStorage, 'getSecureItem').mockResolvedValue('retrieved-value');

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSecureItem',
        payload: { key: 'test-key', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toBe('retrieved-value');
      expect(secureStorage.getSecureItem).toHaveBeenCalledWith('test-key');
    });

    it('should handle deleteSecureItem', async () => {
      jest.spyOn(secureStorage, 'deleteSecureItem').mockResolvedValue(true);

      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'deleteSecureItem',
        payload: { key: 'test-key', nonce: 'test-nonce' },
        timestamp: Date.now()
      };

      const response = await ipcService.handleMessage(message, 'atlas://main');

      expect(response.success).toBe(true);
      expect(response.data).toBe(true);
      expect(secureStorage.deleteSecureItem).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Cache Management', () => {
    it('should cleanup expired cache entries', () => {
      const service = new IPCService(secureStorage);

      // Manually add some expired entries
      (service as any).requestCache.set('expired-key', {
        timestamp: Date.now() - 120000, // 2 minutes ago
        count: 1
      });

      (service as any).requestCache.set('recent-key', {
        timestamp: Date.now() - 30000, // 30 seconds ago
        count: 1
      });

      // Trigger cleanup
      (service as any).cleanup();

      // Check that expired entry was removed
      expect((service as any).requestCache.has('expired-key')).toBe(false);
      expect((service as any).requestCache.has('recent-key')).toBe(true);
    });

    it('should start periodic cleanup', () => {
      const service = new IPCService(secureStorage);

      // Mock setInterval
      const mockSetInterval = jest.spyOn(global, 'setInterval').mockReturnValue(123 as any);

      service.startCleanup(1000);

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 1000);

      mockSetInterval.mockRestore();
    });
  });

  describe('Security Status', () => {
    it('should report current security status', async () => {
      const service = new IPCService(secureStorage, {
        rateLimit: {
          windowMs: 60000,
          maxRequests: 10
        }
      });

      // Make some requests to build up rate limit data
      const message: IPCMessage = {
        id: 'test-1',
        type: 'request',
        method: 'getSettings',
        payload: { nonce: 'nonce-1' },
        timestamp: Date.now()
      };

      await service.handleMessage(message, 'atlas://main');
      await service.handleMessage({ ...message, payload: { nonce: 'nonce-2' } }, 'atlas://main');

      const status = service.getSecurityStatus();

      expect(status.allowedOrigins).toEqual(['atlas://main', 'atlas://renderer']);
      expect(status.rateLimit.max).toBe(10);
      expect(status.rateLimit.current).toBe(2);
      expect(status.rateLimit.window).toBe(60000);
      expect(status.cacheSize).toBeGreaterThan(0);
    });

    it('should update security configuration', () => {
      const service = new IPCService(secureStorage);

      service.updateSecurityConfig({
        allowedOrigins: ['new://origin'],
        enableNonceValidation: false
      });

      const status = service.getSecurityStatus();
      expect(status.allowedOrigins).toEqual(['new://origin']);
    });
  });

  describe('Event Handling', () => {
    it('should emit events for settings changes', () => {
      const mockEmit = jest.spyOn(ipcService, 'emit');

      // Simulate settings changed event
      ipcService.emit('settings-changed', { theme: 'dark' });

      expect(mockEmit).toHaveBeenCalledWith('settings-changed', { theme: 'dark' });
    });

    it('should emit events for security lock', () => {
      const mockEmit = jest.spyOn(ipcService, 'emit');

      // Simulate security lock event
      ipcService.emit('security-lock');

      expect(mockEmit).toHaveBeenCalledWith('security-lock');
    });
  });
});