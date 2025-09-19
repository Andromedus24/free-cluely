import { contextBridge, ipcRenderer } from 'electron';
import { 
  AppConfig, 
  Permission, 
  PluginManifest, 
  LogEntry 
} from '@free-cluely/shared';

// Expose protected APIs to the renderer process
const electronAPI = {
  // App information
  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
    getVersion: () => ipcRenderer.invoke('app:get-info').then((info: any) => info.version),
    getName: () => ipcRenderer.invoke('app:get-info').then((info: any) => info.name),
    isDevelopment: () => ipcRenderer.invoke('app:get-info').then((info: any) => info.isDevelopment),
    isProduction: () => ipcRenderer.invoke('app:get-info').then((info: any) => info.isProduction)
  },

  // Configuration
  config: {
    get: (): Promise<AppConfig> => ipcRenderer.invoke('config:get'),
    update: (updates: Partial<AppConfig>) => ipcRenderer.invoke('config:update', updates),
    validate: () => ipcRenderer.invoke('config:validate'),
    onConfigChange: (callback: (config: AppConfig) => void) => {
      ipcRenderer.on('config:changed', (_event, config) => callback(config));
      return () => ipcRenderer.removeAllListeners('config:changed');
    }
  },

  // Permissions
  permissions: {
    get: (): Promise<Permission> => ipcRenderer.invoke('permission:get'),
    has: (permission: keyof Permission): Promise<boolean> => 
      ipcRenderer.invoke('permission:has', permission),
    request: (permission: keyof Permission): Promise<boolean> => 
      ipcRenderer.invoke('permission:request', permission),
    set: (permission: keyof Permission, granted: boolean): Promise<void> => 
      ipcRenderer.invoke('permission:set', permission, granted),
    getSummary: () => ipcRenderer.invoke('permission:summary'),
    onChange: (callback: (permissions: Permission) => void) => {
      ipcRenderer.on('permissions:changed', (_event, permissions) => callback(permissions));
      return () => ipcRenderer.removeAllListeners('permissions:changed');
    }
  },

  // Plugin management
  plugins: {
    list: (): Promise<PluginManifest[]> => ipcRenderer.invoke('plugin:list'),
    start: (pluginName: string): Promise<void> => ipcRenderer.invoke('plugin:start', pluginName),
    stop: (pluginName: string): Promise<void> => ipcRenderer.invoke('plugin:stop', pluginName),
    register: (manifest: PluginManifest): Promise<void> => 
      ipcRenderer.invoke('plugin:register', manifest),
    unregister: (pluginName: string): Promise<void> => 
      ipcRenderer.invoke('plugin:unregister', pluginName),
    onPluginEvent: (callback: (event: string, data: any) => void) => {
      ipcRenderer.on('plugin:event', (_event, eventData) => {
        const [eventType, data] = eventData;
        callback(eventType, data);
      });
      return () => ipcRenderer.removeAllListeners('plugin:event');
    }
  },

  // Screenshot functionality
  screenshot: {
    capture: (): Promise<string> => ipcRenderer.invoke('screenshot:capture'),
    onCapture: (callback: (imageData: string) => void) => {
      ipcRenderer.on('screenshot:captured', (_event, imageData) => callback(imageData));
      return () => ipcRenderer.removeAllListeners('screenshot:captured');
    }
  },

  // Window management
  window: {
    show: () => ipcRenderer.invoke('window:show'),
    hide: () => ipcRenderer.invoke('window:hide'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    onFocus: (callback: () => void) => {
      ipcRenderer.on('window:focus', callback);
      return () => ipcRenderer.removeAllListeners('window:focus');
    },
    onBlur: (callback: () => void) => {
      ipcRenderer.on('window:blur', callback);
      return () => ipcRenderer.removeAllListeners('window:blur');
    }
  },

  // Dashboard
  dashboard: {
    open: () => ipcRenderer.invoke('dashboard:open'),
    getUrl: async () => {
      try {
        const config: any = await ipcRenderer.invoke('config:get');
        const port = config?.dashboard?.port || 3000;
        return `http://localhost:${port}`;
      } catch (error) {
        console.warn('Failed to get dashboard config, using default port 3000');
        return 'http://localhost:3000';
      }
    }
  },

  // Logging
  log: {
    info: (message: string, metadata?: any) => 
      ipcRenderer.send('log:message', 'info', message, metadata),
    warn: (message: string, metadata?: any) => 
      ipcRenderer.send('log:message', 'warn', message, metadata),
    error: (message: string, metadata?: any) => 
      ipcRenderer.send('log:message', 'error', message, metadata),
    debug: (message: string, metadata?: any) => 
      ipcRenderer.send('log:message', 'debug', message, metadata),
    onLogEntry: (callback: (entry: LogEntry) => void) => {
      ipcRenderer.on('log:entry', (_event, entry) => callback(entry));
      return () => ipcRenderer.removeAllListeners('log:entry');
    }
  },

  // Quick actions
  quickActions: {
    show: () => ipcRenderer.send('quick-actions:show'),
    hide: () => ipcRenderer.send('quick-actions:hide')
  },

  // Permission dialogs (for renderer-initiated requests)
  permissionDialog: {
    request: (permission: string, options: any): Promise<boolean> => {
      return new Promise((resolve) => {
        const requestId = `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const handler = (_event: any, responseId: string, granted: boolean) => {
          if (responseId === requestId) {
            ipcRenderer.removeListener('permission-response', handler);
            resolve(granted);
          }
        };
        
        ipcRenderer.on('permission-response', handler);
        ipcRenderer.send('permission:request', requestId, permission, options);
      });
    }
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}