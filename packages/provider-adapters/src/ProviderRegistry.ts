import { ProviderAdapter, ProviderRegistry as IProviderRegistry } from './types/provider';

export class ProviderRegistry implements IProviderRegistry {
  private adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    if (this.adapters.has(adapter.provider)) {
      throw new Error(`Provider '${adapter.provider}' is already registered`);
    }

    this.adapters.set(adapter.provider, adapter);
    console.log(`Registered provider adapter: ${adapter.name} (${adapter.provider})`);
  }

  unregister(provider: string): void {
    if (!this.adapters.has(provider)) {
      throw new Error(`Provider '${provider}' is not registered`);
    }

    this.adapters.delete(provider);
    console.log(`Unregistered provider adapter: ${provider}`);
  }

  get(provider: string): ProviderAdapter | undefined {
    return this.adapters.get(provider);
  }

  list(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  find(capabilities: string[]): ProviderAdapter[] {
    return this.list().filter(adapter =>
      capabilities.every(capability => adapter.supportsCapability(capability))
    );
  }

  getProviders(): string[] {
    return Array.from(this.adapters.keys());
  }

  has(provider: string): boolean {
    return this.adapters.has(provider);
  }

  clear(): void {
    this.adapters.clear();
    console.log('Cleared all provider adapters');
  }

  // Convenience methods
  getProvidersByCapability(capability: string): ProviderAdapter[] {
    return this.list().filter(adapter => adapter.supportsCapability(capability));
  }

  getDefaultProvider(): ProviderAdapter | undefined {
    // Return first registered adapter as default
    return this.list()[0];
  }
}