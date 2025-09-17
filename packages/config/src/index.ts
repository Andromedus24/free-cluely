export { ConfigManager, configManager } from './ConfigManager';
export type { EnvConfig } from './ConfigManager';

// Re-export types from shared
export type { AppConfig } from '@free-cluely/shared';

// Utility functions
export const createConfigManager = (configPath?: string) => {
  return new ConfigManager(configPath);
};

// Environment helpers
export const getEnv = () => configManager.getEnv();
export const getAppConfig = () => configManager.getAppConfig();
export const isDevelopment = () => configManager.isDevelopment();
export const isProduction = () => configManager.isProduction();
export const isTest = () => configManager.isTest();

// Configuration section helpers
export const getLLMConfig = () => configManager.getLLMConfig();
export const getPermissions = () => configManager.getPermissions();
export const getAutomationConfig = () => configManager.getAutomationConfig();
export const getDashboardConfig = () => configManager.getDashboardConfig();
export const getTelemetryConfig = () => configManager.getTelemetryConfig();

// Security and build helpers
export const getSecuritySettings = () => configManager.getSecuritySettings();
export const getDevelopmentSettings = () => configManager.getDevelopmentSettings();
export const getBuildSettings = () => configManager.getBuildSettings();

// Path helpers
export const getConfigPath = () => configManager.getConfigPath();
export const getLogsPath = () => configManager.getLogsPath();
export const getPluginsPath = () => configManager.getPluginsPath();