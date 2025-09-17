export { PluginBusImpl } from './PluginBusImpl';
export { ConfigManagerImpl } from './ConfigManagerImpl';
export { LoggerImpl } from './LoggerImpl';
export { PermissionManagerImpl } from './PermissionManagerImpl';

// Factory functions
export const createPluginBus = (config: any, logger: any, permissions: any) => {
  return new PluginBusImpl(config, logger, permissions);
};

export const createConfigManager = (configPath?: string) => {
  return new ConfigManagerImpl(configPath);
};

export const createLogger = (logLevel?: any) => {
  return new LoggerImpl(logLevel);
};

export const createPermissionManager = (initialPermissions?: any) => {
  return new PermissionManagerImpl(initialPermissions);
};

// Type exports
export type {
  PluginBus,
  ConfigManager,
  Logger,
  PermissionManager
} from '@free-cluely/shared';