import { CacheManager, MarketplacePlugin, MarketplaceQuery, MarketplaceResponse } from '../interfaces/MarketplaceInterfaces';

export class CacheManagerImpl implements CacheManager {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private defaultTTL: number = 3600000; // 1 hour

  constructor(ttl: number = 3600000) {
    this.defaultTTL = ttl;
    this.startCleanupTimer();
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<void> {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttl
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const cached = this.cache.get(key);
    if (!cached) {
      return false;
    }

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Plugin-specific caching methods
  async getPlugin(id: string): Promise<MarketplacePlugin | null> {
    const key = `plugin:${id}`;
    return this.get<MarketplacePlugin>(key);
  }

  async setPlugin(plugin: MarketplacePlugin): Promise<void> {
    const key = `plugin:${plugin.id}`;
    await this.set(key, plugin, this.defaultTTL);
  }

  async getPlugins(query: MarketplaceQuery): Promise<MarketplaceResponse | null> {
    const key = `plugins:${this.generateQueryKey(query)}`;
    return this.get<MarketplaceResponse>(key);
  }

  async setPlugins(query: MarketplaceQuery, response: MarketplaceResponse): Promise<void> {
    const key = `plugins:${this.generateQueryKey(query)}`;
    await this.set(key, response, this.defaultTTL);
  }

  async invalidatePlugin(pluginId: string): Promise<void> {
    await this.delete(`plugin:${pluginId}`);
    // Also invalidate any search results that might contain this plugin
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.startsWith('plugins:')) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  async invalidateCategory(category: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.startsWith('plugins:') && key.includes(category)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  async invalidateSearch(query: string): Promise<void> {
    const keysToDelete: string[] = [];
    for (const [key] of this.cache) {
      if (key.startsWith('plugins:') && key.includes(query.toLowerCase())) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      await this.delete(key);
    }
  }

  private generateQueryKey(query: MarketplaceQuery): string {
    const sortedQuery = {
      ...query,
      tags: query.tags?.sort(),
      price: query.price ? { ...query.price } : undefined,
      rating: query.rating ? { ...query.rating } : undefined,
      compatibility: query.compatibility ? { ...query.compatibility } : undefined
    };

    return Buffer.from(JSON.stringify(sortedQuery)).toString('base64');
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache) {
        if (now > value.expires) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  // Utility methods
  getSize(): number {
    return this.cache.size;
  }

  getStats(): {
    totalEntries: number;
    expiredEntries: number;
    memoryUsage: string;
  } {
    let expiredEntries = 0;
    const now = Date.now();

    for (const [, value] of this.cache) {
      if (now > value.expires) {
        expiredEntries++;
      }
    }

    // Rough memory estimation
    let memoryUsage = 0;
    for (const [key, value] of this.cache) {
      memoryUsage += key.length * 2; // UTF-16
      memoryUsage += JSON.stringify(value.data).length * 2;
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries,
      memoryUsage: this.formatBytes(memoryUsage)
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}