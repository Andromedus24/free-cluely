// Cloud Sync Adapter Implementation
// =================================

import { SyncAdapter, SettingsData, SyncAdapterConfig } from '../../types';

export interface CloudSyncAdapterConfig extends SyncAdapterConfig {
  endpoint: string;
  apiKey?: string;
  apiVersion?: string;
  region?: string;
  compression?: boolean;
  encryption?: boolean;
  cacheControl?: number;
  retryAttempts?: number;
  timeout?: number;
}

export interface CloudSyncResponse {
  success: boolean;
  data?: SettingsData;
  error?: string;
  timestamp: number;
  version?: string;
  etag?: string;
}

export class CloudSyncAdapter implements SyncAdapter {
  private config: CloudSyncAdapterConfig;
  private cache: Map<string, { data: SettingsData; timestamp: number; etag?: string }> = new Map();
  private isOnline: boolean = true;

  constructor(config: CloudSyncAdapterConfig) {
    this.config = {
      compression: true,
      encryption: false,
      retryAttempts: 3,
      timeout: 30000,
      cacheControl: 300000, // 5 minutes
      apiVersion: 'v1',
      ...config
    };

    this.initializeNetworkListeners();
  }

  private initializeNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  async sync(data: SettingsData, operationId?: string): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Network is offline');
    }

    const payload = await this.preparePayload(data);
    const headers = await this.prepareHeaders();

    try {
      const response = await this.makeRequest(`${this.config.endpoint}/settings`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
      }

      const result: CloudSyncResponse = await response.json();

      if (result.success) {
        // Update cache
        this.cache.set('settings', {
          data,
          timestamp: Date.now(),
          etag: result.etag
        });
      } else {
        throw new Error(result.error || 'Unknown sync error');
      }
    } catch (error) {
      throw new Error(`Cloud sync failed: ${(error as Error).message}`);
    }
  }

  async pull(operationId?: string): Promise<SettingsData> {
    if (!this.isOnline) {
      // Return cached data if available
      const cached = this.cache.get('settings');
      if (cached && Date.now() - cached.timestamp < this.config.cacheControl!) {
        return cached.data;
      }
      throw new Error('Network is offline and no cached data available');
    }

    const headers = await this.prepareHeaders();

    try {
      const response = await this.makeRequest(`${this.config.endpoint}/settings`, {
        method: 'GET',
        headers
      });

      if (response.status === 404) {
        // No settings exist yet
        return {};
      }

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.status} ${response.statusText}`);
      }

      const result: CloudSyncResponse = await response.json();

      if (result.success && result.data) {
        const data = await this.processResponse(result.data);

        // Update cache
        this.cache.set('settings', {
          data,
          timestamp: Date.now(),
          etag: result.etag
        });

        return data;
      } else {
        throw new Error(result.error || 'Unknown pull error');
      }
    } catch (error) {
      throw new Error(`Cloud pull failed: ${(error as Error).message}`);
    }
  }

  async getConflictResolution(localData: SettingsData, remoteData: SettingsData): Promise<SettingsData> {
    // For cloud sync, we'll use a simple strategy:
    // - If remote data is newer, use remote
    // - If local data is newer, use local
    // - If timestamps are equal, merge

    const localTimestamp = this.getTimestamp(localData);
    const remoteTimestamp = this.getTimestamp(remoteData);

    if (remoteTimestamp > localTimestamp) {
      return remoteData;
    } else if (localTimestamp > remoteTimestamp) {
      return localData;
    } else {
      return this.mergeData(localData, remoteData);
    }
  }

  async getMetadata(): Promise<any> {
    try {
      const response = await this.makeRequest(`${this.config.endpoint}/settings/metadata`, {
        method: 'GET'
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest(`${this.config.endpoint}/health`, {
        method: 'GET'
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private async preparePayload(data: SettingsData): Promise<any> {
    let payload = {
      data,
      timestamp: Date.now(),
      version: this.config.apiVersion,
      client: 'atlas-settings'
    };

    if (this.config.compression) {
      payload = await this.compress(payload);
    }

    if (this.config.encryption) {
      payload = await this.encrypt(payload);
    }

    return payload;
  }

  private async processResponse(data: any): Promise<SettingsData> {
    let processedData = data;

    if (this.config.encryption) {
      processedData = await this.decrypt(processedData);
    }

    if (this.config.compression) {
      processedData = await this.decompress(processedData);
    }

    return processedData.data || processedData;
  }

  private async prepareHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Version': this.config.apiVersion!,
      'X-Client-ID': 'atlas-settings'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    // Add cache headers
    const cached = this.cache.get('settings');
    if (cached && cached.etag) {
      headers['If-None-Match'] = cached.etag;
    }

    return headers;
  }

  private async makeRequest(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...options.headers,
          ...this.prepareHeaders()
        }
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async compress(data: any): Promise<any> {
    // Simple compression simulation
    // In a real implementation, you'd use libraries like pako or compression-streams
    return {
      compressed: true,
      data: JSON.stringify(data),
      originalSize: JSON.stringify(data).length
    };
  }

  private async decompress(data: any): Promise<any> {
    if (data.compressed) {
      return JSON.parse(data.data);
    }
    return data;
  }

  private async encrypt(data: any): Promise<any> {
    // Simple encryption simulation
    // In a real implementation, you'd use Web Crypto API or similar
    return {
      encrypted: true,
      data: btoa(JSON.stringify(data)),
      algorithm: 'simple-base64'
    };
  }

  private async decrypt(data: any): Promise<any> {
    if (data.encrypted) {
      return JSON.parse(atob(data.data));
    }
    return data;
  }

  private getTimestamp(data: SettingsData): number {
    return data.metadata?.updatedAt || data.metadata?.createdAt || 0;
  }

  private mergeData(local: SettingsData, remote: SettingsData): SettingsData {
    // Simple merge strategy - combine objects
    const merged = { ...local };

    for (const [key, value] of Object.entries(remote)) {
      if (key === 'metadata') {
        // Preserve the most recent metadata
        merged.metadata = {
          ...merged.metadata,
          ...value,
          updatedAt: Math.max(merged.metadata?.updatedAt || 0, value.updatedAt || 0)
        };
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        merged[key] = { ...merged[key], ...value };
      } else {
        merged[key] = value;
      }
    }

    return merged;
  }

  // Configuration methods
  updateConfig(newConfig: Partial<CloudSyncAdapterConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): CloudSyncAdapterConfig {
    return { ...this.config };
  }

  getStatus(): { online: boolean; cacheSize: number; lastSync?: number } {
    return {
      online: this.isOnline,
      cacheSize: this.cache.size,
      lastSync: this.cache.get('settings')?.timestamp
    };
  }
}