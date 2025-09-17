import { SecureStorage } from '../SecureStorage';
import * as keytar from 'keytar';

// Mock keytar
jest.mock('keytar');
const mockKeytar = keytar as jest.Mocked<typeof keytar>;

describe('SecureStorage', () => {
  let secureStorage: SecureStorage;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset keytar mocks
    mockKeytar.getPassword.mockResolvedValue(null);
    mockKeytar.setPassword.mockResolvedValue();
    mockKeytar.deletePassword.mockResolvedValue(true);
    mockKeytar.findCredentials.mockResolvedValue([]);

    // Create new instance
    secureStorage = new SecureStorage();
  });

  describe('Provider Key Management', () => {
    it('should store and retrieve provider keys', async () => {
      const providerName = 'openai';
      const apiKey = 'sk-test-key';

      await secureStorage.setProviderKey(providerName, apiKey);
      const retrievedKey = await secureStorage.getProviderKey(providerName);

      expect(retrievedKey).toBe(apiKey);
      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        'atlas-secure-storage',
        'provider-openai',
        expect.stringContaining('"value"')
      );
    });

    it('should return null for non-existent provider keys', async () => {
      mockKeytar.getPassword.mockResolvedValue(null);

      const key = await secureStorage.getProviderKey('non-existent');
      expect(key).toBeNull();
    });

    it('should delete provider keys', async () => {
      const result = await secureStorage.deleteProviderKey('openai');
      expect(result).toBe(true);
      expect(mockKeytar.deletePassword).toHaveBeenCalledWith(
        'atlas-secure-storage',
        'provider-openai'
      );
    });

    it('should list all provider keys', async () => {
      mockKeytar.findCredentials.mockResolvedValue([
        { account: 'provider-openai', password: '{}' },
        { account: 'provider-anthropic', password: '{}' },
        { account: 'other-key', password: '{}' }
      ]);

      const keys = await secureStorage.listProviderKeys();
      expect(keys).toEqual(['openai', 'anthropic']);
    });
  });

  describe('General Secure Storage', () => {
    it('should store and retrieve secure items', async () => {
      const key = 'test-key';
      const value = 'secret-value';

      await secureStorage.setSecureItem(key, value);
      const retrieved = await secureStorage.getSecureItem(key);

      expect(retrieved).toBe(value);
    });

    it('should store items with metadata', async () => {
      const key = 'test-key';
      const value = 'secret-value';
      const metadata = { type: 'credentials', service: 'test' };

      await secureStorage.setSecureItem(key, value, metadata);

      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        'atlas-secure-storage',
        expect.any(String),
        expect.stringContaining('"metadata"')
      );
    });

    it('should delete secure items', async () => {
      const result = await secureStorage.deleteSecureItem('test-key');
      expect(result).toBe(true);
    });
  });

  describe('Settings Management', () => {
    it('should save and retrieve settings', async () => {
      const settings = {
        providers: { openai: { enabled: true } },
        preferences: { theme: 'dark' },
        security: { encryptionEnabled: true }
      };

      await secureStorage.saveSettings(settings);
      const retrieved = await secureStorage.getSettings();

      expect(retrieved).toMatchObject(settings);
      expect(retrieved.lastSync).toBeDefined();
    });

    it('should handle default settings', async () => {
      mockKeytar.getPassword.mockResolvedValue(null);

      const settings = await secureStorage.getSettings();

      expect(settings.providers).toEqual({});
      expect(settings.security.encryptionEnabled).toBe(true);
    });

    it('should update settings incrementally', async () => {
      const initialSettings = {
        providers: { openai: { enabled: true } },
        security: { encryptionEnabled: true }
      };

      // Set initial settings
      await secureStorage.saveSettings(initialSettings);

      // Update with partial settings
      await secureStorage.saveSettings({
        preferences: { theme: 'dark' }
      });

      const updated = await secureStorage.getSettings();

      expect(updated.providers).toEqual(initialSettings.providers);
      expect(updated.preferences).toEqual({ theme: 'dark' });
      expect(updated.security.encryptionEnabled).toBe(true);
    });
  });

  describe('Security Operations', () => {
    it('should lock and check lock status', async () => {
      await secureStorage.lock();
      const isLocked = await secureStorage.isLocked();

      expect(isLocked).toBe(true);
    });

    it('should unlock successfully', async () => {
      await secureStorage.lock();
      const result = await secureStorage.unlock();

      expect(result).toBe(true);
    });

    it('should perform health check', async () => {
      mockKeytar.setPassword.mockResolvedValue();
      mockKeytar.getPassword.mockResolvedValue('{"value":"test-value"}');

      const health = await secureStorage.healthCheck();

      expect(health.status).toBe('healthy');
    });

    it('should report health check failure', async () => {
      mockKeytar.setPassword.mockRejectedValue(new Error('Storage error'));

      const health = await secureStorage.healthCheck();

      expect(health.status).toBe('error');
      expect(health.message).toBeDefined();
    });

    it('should clear all data', async () => {
      mockKeytar.findCredentials.mockResolvedValue([
        { account: 'test1', password: '{}' },
        { account: 'test2', password: '{}' }
      ]);

      await secureStorage.clearAllData();

      expect(mockKeytar.deletePassword).toHaveBeenCalledTimes(3); // 2 items + 1 encryption key
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt values correctly', async () => {
      // Force encryption key initialization
      mockKeytar.getPassword.mockResolvedValue('a'.repeat(64)); // 32 bytes in hex

      secureStorage = new SecureStorage();

      const testValue = 'secret message';
      await secureStorage.setSecureItem('test', testValue);

      // Verify the stored value is encrypted (not the original)
      const setPasswordCall = mockKeytar.setPassword.mock.calls[0];
      const storedData = JSON.parse(setPasswordCall[2]);

      expect(storedData.value).not.toBe(testValue);
      expect(storedData.encrypted).toBe(true);

      // Verify decryption works
      const retrieved = await secureStorage.getSecureItem('test');
      expect(retrieved).toBe(testValue);
    });

    it('should handle encryption key generation', async () => {
      mockKeytar.getPassword.mockResolvedValue(null);

      secureStorage = new SecureStorage();

      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        'atlas-secure-storage',
        'encryption-key',
        expect.any(String)
      );
    });
  });

  describe('Import/Export', () => {
    it('should export settings and provider keys', async () => {
      const mockSettings = {
        providers: { openai: { enabled: true } },
        security: { encryptionEnabled: true }
      };

      mockKeytar.getPassword.mockImplementation((service, account) => {
        if (account === 'app-settings') {
          return Promise.resolve(JSON.stringify(mockSettings));
        }
        if (account === 'provider-openai') {
          return Promise.resolve('{"value":"encrypted-key"}');
        }
        return Promise.resolve(null);
      });

      mockKeytar.findCredentials.mockResolvedValue([
        { account: 'provider-openai', password: '{}' }
      ]);

      const exported = await secureStorage.exportSettings();

      const data = JSON.parse(exported);
      expect(data.settings).toMatchObject(mockSettings);
      expect(data.providerKeys).toHaveProperty('openai');
      expect(data.exportedAt).toBeDefined();
    });

    it('should import settings and provider keys', async () => {
      const exportData = {
        settings: {
          providers: { openai: { enabled: true } },
          security: { encryptionEnabled: true }
        },
        providerKeys: {
          openai: 'imported-api-key'
        },
        exportedAt: Date.now(),
        version: '1.0.0'
      };

      await secureStorage.importSettings(JSON.stringify(exportData));

      expect(mockKeytar.setPassword).toHaveBeenCalledWith(
        'atlas-secure-storage',
        'provider-openai',
        expect.stringContaining('imported-api-key')
      );
    });

    it('should reject invalid import data', async () => {
      await expect(secureStorage.importSettings('invalid-json')).rejects.toThrow();
      await expect(secureStorage.importSettings('{"incomplete":"data"}')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle keytar errors gracefully', async () => {
      mockKeytar.setPassword.mockRejectedValue(new Error('Keytar error'));

      await expect(secureStorage.setProviderKey('test', 'key')).rejects.toThrow('Failed to store provider key');
    });

    it('should handle decryption errors', async () => {
      mockKeytar.getPassword.mockResolvedValue('{"value":"invalid-encrypted-data","encrypted":true}');

      await expect(secureStorage.getSecureItem('test')).rejects.toThrow();
    });

    it('should handle corrupted settings', async () => {
      mockKeytar.getPassword.mockResolvedValue('invalid-json');

      const settings = await secureStorage.getSettings();

      expect(settings.providers).toEqual({});
      expect(settings.security.encryptionEnabled).toBe(true);
    });
  });
});