import * as keytar from 'keytar';

export interface SecureStorageConfig {
  serviceName: string;
  accountPrefix?: string;
}

export interface StoredProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  project?: string;
  version?: string;
  timeout?: number;
  defaultModel?: string;
  models?: string[];
  retry?: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
    retryableErrors: string[];
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class SecureStorage {
  private config: SecureStorageConfig;

  constructor(config: SecureStorageConfig) {
    this.config = {
      accountPrefix: 'atlas-provider-',
      ...config
    };
  }

  async storeProviderConfig(providerId: string, config: Omit<StoredProviderConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const accountName = `${this.config.accountPrefix}${providerId}`;
    const storedConfig: StoredProviderConfig = {
      id: providerId,
      ...config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await keytar.setPassword(
        this.config.serviceName,
        accountName,
        JSON.stringify(storedConfig)
      );
    } catch (error) {
      throw new Error(`Failed to store provider config: ${error.message}`);
    }
  }

  async getProviderConfig(providerId: string): Promise<StoredProviderConfig | null> {
    const accountName = `${this.config.accountPrefix}${providerId}`;

    try {
      const storedValue = await keytar.getPassword(this.config.serviceName, accountName);
      if (!storedValue) {
        return null;
      }

      const config: StoredProviderConfig = JSON.parse(storedValue);
      return config;
    } catch (error) {
      throw new Error(`Failed to retrieve provider config: ${error.message}`);
    }
  }

  async updateProviderConfig(providerId: string, updates: Partial<Omit<StoredProviderConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    const existingConfig = await this.getProviderConfig(providerId);
    if (!existingConfig) {
      throw new Error(`Provider config not found: ${providerId}`);
    }

    const updatedConfig: StoredProviderConfig = {
      ...existingConfig,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.storeProviderConfig(providerId, updatedConfig);
  }

  async deleteProviderConfig(providerId: string): Promise<boolean> {
    const accountName = `${this.config.accountPrefix}${providerId}`;

    try {
      return await keytar.deletePassword(this.config.serviceName, accountName);
    } catch (error) {
      throw new Error(`Failed to delete provider config: ${error.message}`);
    }
  }

  async listProviderConfigs(): Promise<StoredProviderConfig[]> {
    try {
      const credentials = await keytar.findCredentials(this.config.serviceName);
      const configs: StoredProviderConfig[] = [];

      for (const credential of credentials) {
        if (credential.account.startsWith(this.config.accountPrefix || '')) {
          try {
            const config: StoredProviderConfig = JSON.parse(credential.password);
            configs.push(config);
          } catch (error) {
            console.warn(`Failed to parse config for ${credential.account}:`, error.message);
          }
        }
      }

      return configs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      throw new Error(`Failed to list provider configs: ${error.message}`);
    }
  }

  async clearAllProviderConfigs(): Promise<number> {
    try {
      const credentials = await keytar.findCredentials(this.config.serviceName);
      let deletedCount = 0;

      for (const credential of credentials) {
        if (credential.account.startsWith(this.config.accountPrefix || '')) {
          const success = await keytar.deletePassword(this.config.serviceName, credential.account);
          if (success) {
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to clear provider configs: ${error.message}`);
    }
  }

  async backupConfigs(backupPath: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const configs = await this.listProviderConfigs();
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        configs: configs.map(config => ({
          ...config,
          // Redact sensitive data in backup
          apiKey: '[REDACTED]'
        }))
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
    } catch (error) {
      throw new Error(`Failed to backup configs: ${error.message}`);
    }
  }

  async restoreConfigs(backupPath: string): Promise<void> {
    const fs = require('fs').promises;

    try {
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));

      if (backupData.version !== '1.0') {
        throw new Error('Unsupported backup version');
      }

      let restoredCount = 0;
      for (const config of backupData.configs) {
        // Skip redacted configs
        if (config.apiKey === '[REDACTED]') {
          continue;
        }

        try {
          await this.storeProviderConfig(config.id, config);
          restoredCount++;
        } catch (error) {
          console.warn(`Failed to restore config for ${config.id}:`, error.message);
        }
      }

      console.log(`Restored ${restoredCount} provider configurations`);
    } catch (error) {
      throw new Error(`Failed to restore configs: ${error.message}`);
    }
  }

  async exportConfigs(): Promise<string> {
    const configs = await this.listProviderConfigs();
    return JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      configs: configs.map(config => ({
        ...config,
        apiKey: '[REDACTED]'
      }))
    }, null, 2);
  }

  async importConfigs(importData: string): Promise<number> {
    try {
      const data = JSON.parse(importData);

      if (data.version !== '1.0') {
        throw new Error('Unsupported import version');
      }

      let importedCount = 0;
      for (const config of data.configs) {
        // Skip redacted configs
        if (config.apiKey === '[REDACTED]') {
          continue;
        }

        try {
          await this.storeProviderConfig(config.id, config);
          importedCount++;
        } catch (error) {
          console.warn(`Failed to import config for ${config.id}:`, error.message);
        }
      }

      return importedCount;
    } catch (error) {
      throw new Error(`Failed to import configs: ${error.message}`);
    }
  }

  async validateProviderConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!config.id || typeof config.id !== 'string') {
      errors.push('Provider ID is required and must be a string');
    }

    if (!config.name || typeof config.name !== 'string') {
      errors.push('Provider name is required and must be a string');
    }

    if (!config.apiKey || typeof config.apiKey !== 'string') {
      errors.push('API key is required and must be a string');
    }

    if (config.baseUrl && typeof config.baseUrl !== 'string') {
      errors.push('Base URL must be a string if provided');
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      errors.push('Timeout must be a positive number if provided');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async getStorageStats(): Promise<{
    totalConfigs: number;
    oldestConfig?: string;
    newestConfig?: string;
    providers: string[];
  }> {
    const configs = await this.listProviderConfigs();

    if (configs.length === 0) {
      return {
        totalConfigs: 0,
        providers: []
      };
    }

    const sortedByDate = [...configs].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      totalConfigs: configs.length,
      oldestConfig: sortedByDate[0]?.createdAt,
      newestConfig: sortedByDate[sortedByDate.length - 1]?.createdAt,
      providers: configs.map(c => c.id)
    };
  }
}