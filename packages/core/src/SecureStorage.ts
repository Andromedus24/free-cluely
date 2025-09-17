import * as keytar from 'keytar';
import { z } from 'zod';
import { createHash, randomBytes, createCipher, createDecipher } from 'crypto';

// Service name for keytar
const SERVICE_NAME = 'atlas-secure-storage';

// Secure storage schemas
const SecureItemSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: z.string(),
  encrypted: z.boolean().default(true),
  createdAt: z.number().default(() => Date.now()),
  updatedAt: z.number().default(() => Date.now()),
  metadata: z.record(z.unknown()).optional()
});

export type SecureItem = z.infer<typeof SecureItemSchema>;

// Settings schema
const SettingsSchema = z.object({
  providers: z.record(z.unknown()).default({}),
  preferences: z.record(z.unknown()).default({}),
  security: z.object({
    encryptionEnabled: z.boolean().default(true),
    autoLock: z.boolean().default(true),
    lockTimeout: z.number().default(300000), // 5 minutes
    biometricEnabled: z.boolean().default(false)
  }).default({}),
  lastSync: z.number().optional(),
  version: z.string().default('1.0.0')
});

export type Settings = z.infer<typeof SettingsSchema>;

export class SecureStorage {
  private encryptionKey: Buffer | null = null;
  private lockTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize encryption key
    this.initializeEncryption();
  }

  private async initializeEncryption(): Promise<void> {
    try {
      // Try to retrieve existing encryption key
      const existingKey = await keytar.getPassword(SERVICE_NAME, 'encryption-key');

      if (existingKey) {
        this.encryptionKey = Buffer.from(existingKey, 'hex');
      } else {
        // Generate new encryption key
        const newKey = randomBytes(32);
        await keytar.setPassword(SERVICE_NAME, 'encryption-key', newKey.toString('hex'));
        this.encryptionKey = newKey;
      }
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('Failed to initialize secure storage');
    }
  }

  private encrypt(value: string): string {
    if (!this.encryptionKey || !this.encryptionKey.length) {
      throw new Error('Encryption not initialized');
    }

    const iv = randomBytes(16);
    const cipher = createCipher('aes-256-cbc', this.encryptionKey);

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedValue: string): string {
    if (!this.encryptionKey || !this.encryptionKey.length) {
      throw new Error('Encryption not initialized');
    }

    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = createDecipher('aes-256-cbc', this.encryptionKey);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private resetLockTimer(): void {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
    }

    const settings = this.getSettingsSync();
    if (settings.security.autoLock && settings.security.lockTimeout > 0) {
      this.lockTimer = setTimeout(() => {
        this.lock();
      }, settings.security.lockTimeout);
    }
  }

  // Provider key management
  async setProviderKey(providerName: string, apiKey: string): Promise<void> {
    try {
      this.resetLockTimer();

      const secureItem: SecureItem = {
        id: `provider-${providerName}`,
        key: `provider-${providerName}`,
        value: this.encrypt(apiKey),
        encrypted: true,
        metadata: {
          provider: providerName,
          type: 'api-key'
        }
      };

      await keytar.setPassword(SERVICE_NAME, secureItem.id, JSON.stringify(secureItem));
    } catch (error) {
      console.error(`Failed to store provider key for ${providerName}:`, error);
      throw new Error(`Failed to store provider key: ${error.message}`);
    }
  }

  async getProviderKey(providerName: string): Promise<string | null> {
    try {
      this.resetLockTimer();

      const result = await keytar.getPassword(SERVICE_NAME, `provider-${providerName}`);

      if (!result) {
        return null;
      }

      const secureItem = JSON.parse(result) as SecureItem;

      if (!secureItem.encrypted) {
        return secureItem.value;
      }

      return this.decrypt(secureItem.value);
    } catch (error) {
      console.error(`Failed to retrieve provider key for ${providerName}:`, error);
      return null;
    }
  }

  async deleteProviderKey(providerName: string): Promise<boolean> {
    try {
      this.resetLockTimer();
      return await keytar.deletePassword(SERVICE_NAME, `provider-${providerName}`);
    } catch (error) {
      console.error(`Failed to delete provider key for ${providerName}:`, error);
      return false;
    }
  }

  async listProviderKeys(): Promise<string[]> {
    try {
      const allKeys = await keytar.findCredentials(SERVICE_NAME);
      return allKeys
        .filter(key => key.account.startsWith('provider-'))
        .map(key => key.account.replace('provider-', ''));
    } catch (error) {
      console.error('Failed to list provider keys:', error);
      return [];
    }
  }

  // General secure storage
  async setSecureItem(key: string, value: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      this.resetLockTimer();

      const hashedKey = this.hashKey(key);
      const secureItem: SecureItem = {
        id: hashedKey,
        key,
        value: this.encrypt(value),
        encrypted: true,
        metadata
      };

      await keytar.setPassword(SERVICE_NAME, hashedKey, JSON.stringify(secureItem));
    } catch (error) {
      console.error(`Failed to store secure item ${key}:`, error);
      throw new Error(`Failed to store secure item: ${error.message}`);
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      this.resetLockTimer();

      const hashedKey = this.hashKey(key);
      const result = await keytar.getPassword(SERVICE_NAME, hashedKey);

      if (!result) {
        return null;
      }

      const secureItem = JSON.parse(result) as SecureItem;

      if (!secureItem.encrypted) {
        return secureItem.value;
      }

      return this.decrypt(secureItem.value);
    } catch (error) {
      console.error(`Failed to retrieve secure item ${key}:`, error);
      return null;
    }
  }

  async deleteSecureItem(key: string): Promise<boolean> {
    try {
      this.resetLockTimer();
      const hashedKey = this.hashKey(key);
      return await keytar.deletePassword(SERVICE_NAME, hashedKey);
    } catch (error) {
      console.error(`Failed to delete secure item ${key}:`, error);
      return false;
    }
  }

  // Settings management
  async saveSettings(settings: Partial<Settings>): Promise<void> {
    try {
      this.resetLockTimer();

      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...settings,
        lastSync: Date.now()
      };

      const validatedSettings = SettingsSchema.parse(updatedSettings);
      await this.setSecureItem('app-settings', JSON.stringify(validatedSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error(`Failed to save settings: ${error.message}`);
    }
  }

  async getSettings(): Promise<Settings> {
    try {
      const settingsJson = await this.getSecureItem('app-settings');

      if (!settingsJson) {
        return SettingsSchema.parse({});
      }

      const settings = JSON.parse(settingsJson);
      return SettingsSchema.parse(settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      return SettingsSchema.parse({});
    }
  }

  getSettingsSync(): Settings {
    // Fallback for synchronous access (use sparingly)
    try {
      const defaultSettings = SettingsSchema.parse({});
      return defaultSettings;
    } catch (error) {
      console.error('Failed to get settings sync:', error);
      return SettingsSchema.parse({});
    }
  }

  // Security operations
  async lock(): Promise<void> {
    try {
      // Clear encryption key from memory
      this.encryptionKey = null;

      if (this.lockTimer) {
        clearTimeout(this.lockTimer);
        this.lockTimer = null;
      }
    } catch (error) {
      console.error('Failed to lock secure storage:', error);
    }
  }

  async unlock(password?: string): Promise<boolean> {
    try {
      // For future implementation with password protection
      await this.initializeEncryption();
      return true;
    } catch (error) {
      console.error('Failed to unlock secure storage:', error);
      return false;
    }
  }

  async isLocked(): Promise<boolean> {
    return this.encryptionKey === null;
  }

  async changeEncryptionKey(newPassword?: string): Promise<void> {
    try {
      // Get all current secure items
      const allCredentials = await keytar.findCredentials(SERVICE_NAME);
      const items: Array<{ account: string; password: string }> = [];

      // Backup all items
      for (const credential of allCredentials) {
        const item = JSON.parse(credential.password) as SecureItem;
        items.push({ account: credential.account, password: credential.password });
      }

      // Generate new encryption key
      const newKey = randomBytes(32);
      this.encryptionKey = newKey;

      // Re-encrypt and save all items
      for (const item of items) {
        if (item.account !== 'encryption-key') {
          const secureItem = JSON.parse(item.password) as SecureItem;
          if (secureItem.encrypted) {
            secureItem.value = this.encrypt(this.decrypt(secureItem.value));
          }
          await keytar.setPassword(SERVICE_NAME, item.account, JSON.stringify(secureItem));
        }
      }

      // Save new encryption key
      await keytar.setPassword(SERVICE_NAME, 'encryption-key', newKey.toString('hex'));
    } catch (error) {
      console.error('Failed to change encryption key:', error);
      throw new Error(`Failed to change encryption key: ${error.message}`);
    }
  }

  async exportSettings(): Promise<string> {
    try {
      const settings = await this.getSettings();
      const providerKeys: Record<string, string> = {};

      const providers = await this.listProviderKeys();
      for (const provider of providers) {
        const key = await this.getProviderKey(provider);
        if (key) {
          providerKeys[provider] = key;
        }
      }

      const exportData = {
        settings,
        providerKeys,
        exportedAt: Date.now(),
        version: '1.0.0'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export settings:', error);
      throw new Error(`Failed to export settings: ${error.message}`);
    }
  }

  async importSettings(exportData: string): Promise<void> {
    try {
      const data = JSON.parse(exportData);

      // Validate import data structure
      if (!data.settings || !data.providerKeys || !data.exportedAt) {
        throw new Error('Invalid export data format');
      }

      // Import settings
      await this.saveSettings(data.settings);

      // Import provider keys
      for (const [provider, apiKey] of Object.entries(data.providerKeys)) {
        await this.setProviderKey(provider, apiKey as string);
      }
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error(`Failed to import settings: ${error.message}`);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      const allCredentials = await keytar.findCredentials(SERVICE_NAME);

      for (const credential of allCredentials) {
        await keytar.deletePassword(SERVICE_NAME, credential.account);
      }

      if (this.lockTimer) {
        clearTimeout(this.lockTimer);
        this.lockTimer = null;
      }

      this.encryptionKey = null;
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw new Error(`Failed to clear all data: ${error.message}`);
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: 'healthy' | 'error'; message?: string }> {
    try {
      await this.initializeEncryption();
      const testKey = 'health-check';
      await this.setSecureItem(testKey, 'test-value');
      const retrieved = await this.getSecureItem(testKey);
      await this.deleteSecureItem(testKey);

      if (retrieved !== 'test-value') {
        throw new Error('Secure storage integrity check failed');
      }

      return { status: 'healthy' };
    } catch (error) {
      console.error('Secure storage health check failed:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}