// Types
export * from './types/MarketplaceTypes';

// Interfaces
export * from './interfaces/MarketplaceInterfaces';

// Services
export { MarketplaceServiceImpl } from './services/MarketplaceService';
export { ApiClientImpl } from './services/ApiClient';
export { PluginInstallerImpl } from './services/PluginInstaller';

// Factory functions
export const createMarketplace = (config: any) => {
  return new MarketplaceServiceImpl(
    config,
    config.apiClient,
    config.store,
    config.cache,
    config.installer,
    config.securityScanner,
    config.paymentHandler,
    config.analytics,
    config.validator,
    config.notifications
  );
};

export const createApiClient = (baseUrl: string, timeout?: number) => {
  return new ApiClientImpl(baseUrl, timeout);
};

export const createPluginInstaller = (installationDir: string) => {
  return new PluginInstallerImpl(installationDir);
};

// Default export
export default {
  createMarketplace,
  createApiClient,
  createPluginInstaller,
};