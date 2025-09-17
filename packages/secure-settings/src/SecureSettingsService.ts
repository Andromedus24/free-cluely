import { SecureStorage, StoredProviderConfig } from './SecureStorage';
import { ProviderConfig } from '../provider-adapters/src/types/provider';

export interface SecureSettingsServiceConfig {
  serviceName: string;
  accountPrefix?: string;
}

export class SecureSettingsService {
  private storage: SecureStorage;

  constructor(config: SecureSettingsServiceConfig) {
    this.storage = new SecureStorage(config);
  }

  // Provider configuration management
  async saveProviderConfig(
    providerId: string,
    name: string,
    config: ProviderConfig
  ): Promise<void> {
    const storedConfig = {
      id: providerId,
      name,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout: config.timeout,
      defaultModel: config.defaultModel,
      models: config.models,
      retry: config.retry,
      metadata: config.metadata
    };

    const validation = await this.storage.validateProviderConfig(storedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    await this.storage.storeProviderConfig(providerId, storedConfig);
  }

  async loadProviderConfig(providerId: string): Promise<ProviderConfig | null> {
    const storedConfig = await this.storage.getProviderConfig(providerId);
    if (!storedConfig) {
      return null;
    }

    return {
      apiKey: storedConfig.apiKey,
      baseUrl: storedConfig.baseUrl,
      timeout: storedConfig.timeout,
      defaultModel: storedConfig.defaultModel,
      models: storedConfig.models,
      retry: storedConfig.retry,
      metadata: storedConfig.metadata
    };
  }

  async updateProviderConfig(
    providerId: string,
    updates: Partial<ProviderConfig>
  ): Promise<void> {
    const currentConfig = await this.storage.getProviderConfig(providerId);
    if (!currentConfig) {
      throw new Error(`Provider configuration not found: ${providerId}`);
    }

    const updateData: any = {};
    if (updates.apiKey !== undefined) updateData.apiKey = updates.apiKey;
    if (updates.baseUrl !== undefined) updateData.baseUrl = updates.baseUrl;
    if (updates.timeout !== undefined) updateData.timeout = updates.timeout;
    if (updates.defaultModel !== undefined) updateData.defaultModel = updates.defaultModel;
    if (updates.models !== undefined) updateData.models = updates.models;
    if (updates.retry !== undefined) updateData.retry = updates.retry;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    await this.storage.updateProviderConfig(providerId, updateData);
  }

  async deleteProviderConfig(providerId: string): Promise<boolean> {
    return this.storage.deleteProviderConfig(providerId);
  }

  async listProviderConfigs(): Promise<Array<{ id: string; name: string; configured: boolean }>> {
    const configs = await this.storage.listProviderConfigs();
    return configs.map(config => ({
      id: config.id,
      name: config.name,
      configured: true
    }));
  }

  async clearAllProviderConfigs(): Promise<number> {
    return this.storage.clearAllProviderConfigs();
  }

  // Configuration validation
  async validateProviderConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    return this.storage.validateProviderConfig(config);
  }

  // Migration and backup utilities
  async backupConfigs(backupPath: string): Promise<void> {
    await this.storage.backupConfigs(backupPath);
  }

  async restoreConfigs(backupPath: string): Promise<void> {
    await this.storage.restoreConfigs(backupPath);
  }

  async exportConfigs(): Promise<string> {
    return this.storage.exportConfigs();
  }

  async importConfigs(importData: string): Promise<number> {
    return this.storage.importConfigs(importData);
  }

  // Statistics and monitoring
  async getStorageStats(): Promise<{
    totalConfigs: number;
    oldestConfig?: string;
    newestConfig?: string;
    providers: string[];
  }> {
    return this.storage.getStorageStats();
  }

  // Security utilities
  async rotateProviderApiKey(providerId: string, newApiKey: string): Promise<void> {
    const currentConfig = await this.storage.getProviderConfig(providerId);
    if (!currentConfig) {
      throw new Error(`Provider configuration not found: ${providerId}`);
    }

    // Validate new API key format (basic check)
    if (!newApiKey || newApiKey.length < 10) {
      throw new Error('Invalid API key format');
    }

    await this.storage.updateProviderConfig(providerId, { apiKey: newApiKey });
  }

  async getProviderConfigSummary(providerId: string): Promise<{
    id: string;
    name: string;
    baseUrl?: string;
    defaultModel?: string;
    hasApiKey: boolean;
    lastUpdated: string;
  } | null> {
    const config = await this.storage.getProviderConfig(providerId);
    if (!config) {
      return null;
    }

    return {
      id: config.id,
      name: config.name,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      hasApiKey: !!config.apiKey,
      lastUpdated: config.updatedAt
    };
  }

  async getAllProviderSummaries(): Promise<Array<{
    id: string;
    name: string;
    baseUrl?: string;
    defaultModel?: string;
    hasApiKey: boolean;
    lastUpdated: string;
  }>> {
    const configs = await this.storage.listProviderConfigs();
    return configs.map(config => ({
      id: config.id,
      name: config.name,
      baseUrl: config.baseUrl,
      defaultModel: config.defaultModel,
      hasApiKey: !!config.apiKey,
      lastUpdated: config.updatedAt
    }));
  }

  // Configuration health checks
  async checkProviderConfigHealth(providerId: string): Promise<{
    healthy: boolean;
    issues: string[];
    lastTested?: string;
  }> {
    const config = await this.storage.getProviderConfig(providerId);
    if (!config) {
      return {
        healthy: false,
        issues: ['Configuration not found']
      };
    }

    const issues: string[] = [];

    // Check API key presence and format
    if (!config.apiKey) {
      issues.push('API key is missing');
    } else if (config.apiKey.length < 10) {
      issues.push('API key appears to be too short');
    }

    // Check base URL format
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        issues.push('Invalid base URL format');
      }
    }

    // Check timeout value
    if (config.timeout && (config.timeout <= 0 || config.timeout > 300000)) {
      issues.push('Timeout should be between 1 and 300 seconds');
    }

    // Check configuration age
    const configAge = Date.now() - new Date(config.updatedAt).getTime();
    if (configAge > 365 * 24 * 60 * 60 * 1000) { // 1 year
      issues.push('Configuration is over 1 year old, consider updating');
    }

    return {
      healthy: issues.length === 0,
      issues,
      lastTested: config.updatedAt
    };
  }

  // Configuration templates
  getProviderConfigTemplate(providerType: string): Partial<ProviderConfig> {
    const templates: Record<string, Partial<ProviderConfig>> = {
      openai: {
        baseUrl: 'https://api.openai.com',
        timeout: 30000,
        defaultModel: 'gpt-4o-mini'
      },
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        timeout: 30000,
        defaultModel: 'claude-3-5-sonnet-20241022'
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com',
        timeout: 30000,
        defaultModel: 'gemini-1.5-flash'
      },
      ollama: {
        baseUrl: 'http://localhost:11434',
        timeout: 60000,
        defaultModel: 'llama2'
      }
    };

    return templates[providerType] || {};
  }

  // Auto-cleanup utilities
  async cleanupOldConfigs(maxAge: number = 365): Promise<number> {
    // maxAge in days
    const configs = await this.storage.listProviderConfigs();
    const cutoffDate = new Date(Date.now() - maxAge * 24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const config of configs) {
      const configDate = new Date(config.updatedAt);
      if (configDate < cutoffDate) {
        const success = await this.storage.deleteProviderConfig(config.id);
        if (success) {
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  // Duplicate detection
  async findDuplicateConfigs(): Promise<Array<{
    providerId: string;
    name: string;
    duplicates: Array<{ id: string; name: string }>;
  }>> {
    const configs = await this.storage.listProviderConfigs();
    const duplicates: Array<{
      providerId: string;
      name: string;
      duplicates: Array<{ id: string; name: string }>;
    }> = [];

    const nameGroups = configs.reduce((groups, config) => {
      if (!groups[config.name]) {
        groups[config.name] = [];
      }
      groups[config.name].push(config);
      return groups;
    }, {} as Record<string, StoredProviderConfig[]>);

    for (const [name, group] of Object.entries(nameGroups)) {
      if (group.length > 1) {
        duplicates.push({
          providerId: group[0].id,
          name,
          duplicates: group.slice(1).map(config => ({
            id: config.id,
            name: config.name
          }))
        });
      }
    }

    return duplicates;
  }
}