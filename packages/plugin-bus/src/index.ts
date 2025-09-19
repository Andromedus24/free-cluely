import { PluginBusImpl } from './PluginBusImpl';
import { ConfigManagerImpl } from './ConfigManagerImpl';
import { LoggerImpl } from './LoggerImpl';
import { PermissionManagerImpl } from './PermissionManagerImpl';

export { PluginBusImpl, ConfigManagerImpl, LoggerImpl, PermissionManagerImpl };

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