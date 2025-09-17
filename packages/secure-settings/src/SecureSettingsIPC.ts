import { ipcMain, ipcRenderer, IpcMainEvent, IpcMainInvokeEvent, IpcRendererEvent } from 'electron';
import { SecureStorage, StoredProviderConfig } from './SecureStorage';

export interface SecureSettingsIPCRequest {
  method: string;
  params?: any;
  id: string;
}

export interface SecureSettingsIPCResponse {
  success: boolean;
  data?: any;
  error?: string;
  id: string;
}

export class SecureSettingsIPCHandler {
  private storage: SecureStorage;

  constructor(storage: SecureStorage) {
    this.storage = storage;
    this.setupIPCHandlers();
  }

  private setupIPCHandlers(): void {
    // Provider configuration methods
    ipcMain.handle('secure-settings:store-provider-config', async (event: IpcMainInvokeEvent, config: any) => {
      try {
        await this.storage.storeProviderConfig(config.id, config);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('secure-settings:get-provider-config', async (event: IpcMainInvokeEvent, providerId: string) => {
      try {
        const config = await this.storage.getProviderConfig(providerId);
        return { success: true, data: config };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('secure-settings:update-provider-config', async (event: IpcMainInvokeEvent, providerId: string, updates: any) => {
      try {
        await this.storage.updateProviderConfig(providerId, updates);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('secure-settings:delete-provider-config', async (event: IpcMainInvokeEvent, providerId: string) => {
      try {
        const success = await this.storage.deleteProviderConfig(providerId);
        return { success: true, data: success };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('secure-settings:list-provider-configs', async () => {
      try {
        const configs = await this.storage.listProviderConfigs();
        // Return safe configs without API keys
        const safeConfigs = configs.map(config => ({
          ...config,
          apiKey: '[REDACTED]'
        }));
        return { success: true, data: safeConfigs };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('secure-settings:clear-all-provider-configs', async () => {
      try {
        const count = await this.storage.clearAllProviderConfigs();
        return { success: true, data: count };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Backup and restore methods
    ipcMain.handle('secure-settings:backup-configs', async (event: IpcMainInvokeEvent, backupPath: string) => {
      try {
        await this.storage.backupConfigs(backupPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('secure-settings:restore-configs', async (event: IpcMainInvokeEvent, backupPath: string) => {
      try {
        await this.storage.restoreConfigs(backupPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Import/export methods
    ipcMain.handle('secure-settings:export-configs', async () => {
      try {
        const exportData = await this.storage.exportConfigs();
        return { success: true, data: exportData };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('secure-settings:import-configs', async (event: IpcMainInvokeEvent, importData: string) => {
      try {
        const count = await this.storage.importConfigs(importData);
        return { success: true, data: count };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Validation methods
    ipcMain.handle('secure-settings:validate-config', async (event: IpcMainInvokeEvent, config: any) => {
      try {
        const result = await this.storage.validateProviderConfig(config);
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Statistics methods
    ipcMain.handle('secure-settings:get-stats', async () => {
      try {
        const stats = await this.storage.getStorageStats();
        return { success: true, data: stats };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Event emitters for real-time updates
    ipcMain.on('secure-settings:subscribe-updates', (event: IpcMainEvent) => {
      // Store the event sender for broadcasting updates
      this.registerUpdateListener(event.sender);
    });
  }

  private updateListeners: Set<Electron.WebContents> = new Set();

  private registerUpdateListener(sender: Electron.WebContents): void {
    this.updateListeners.add(sender);

    // Remove listener when window is closed
    sender.on('destroyed', () => {
      this.updateListeners.delete(sender);
    });
  }

  private broadcastUpdate(type: string, data: any): void {
    this.updateListeners.forEach(sender => {
      if (!sender.isDestroyed()) {
        sender.send('secure-settings:update', { type, data });
      }
    });
  }
}

export class SecureSettingsRenderer {
  private static requestIdCounter = 0;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();

  static setupIPC(): void {
    // Listen for updates from main process
    ipcRenderer.on('secure-settings:update', (event: IpcRendererEvent, update: any) => {
      // Emit to global event system
      window.dispatchEvent(new CustomEvent('secure-settings-update', { detail: update }));
    });
  }

  static async storeProviderConfig(config: any): Promise<void> {
    return this.invokeIPC('secure-settings:store-provider-config', config);
  }

  static async getProviderConfig(providerId: string): Promise<StoredProviderConfig | null> {
    return this.invokeIPC('secure-settings:get-provider-config', providerId);
  }

  static async updateProviderConfig(providerId: string, updates: any): Promise<void> {
    return this.invokeIPC('secure-settings:update-provider-config', providerId, updates);
  }

  static async deleteProviderConfig(providerId: string): Promise<boolean> {
    return this.invokeIPC('secure-settings:delete-provider-config', providerId);
  }

  static async listProviderConfigs(): Promise<StoredProviderConfig[]> {
    return this.invokeIPC('secure-settings:list-provider-configs');
  }

  static async clearAllProviderConfigs(): Promise<number> {
    return this.invokeIPC('secure-settings:clear-all-provider-configs');
  }

  static async backupConfigs(backupPath: string): Promise<void> {
    return this.invokeIPC('secure-settings:backup-configs', backupPath);
  }

  static async restoreConfigs(backupPath: string): Promise<void> {
    return this.invokeIPC('secure-settings:restore-configs', backupPath);
  }

  static async exportConfigs(): Promise<string> {
    return this.invokeIPC('secure-settings:export-configs');
  }

  static async importConfigs(importData: string): Promise<number> {
    return this.invokeIPC('secure-settings:import-configs', importData);
  }

  static async validateConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    return this.invokeIPC('secure-settings:validate-config', config);
  }

  static async getStats(): Promise<{
    totalConfigs: number;
    oldestConfig?: string;
    newestConfig?: string;
    providers: string[];
  }> {
    return this.invokeIPC('secure-settings:get-stats');
  }

  static subscribeToUpdates(callback: (update: any) => void): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener('secure-settings-update', handler);
    ipcRenderer.send('secure-settings:subscribe-updates');

    return () => {
      window.removeEventListener('secure-settings-update', handler);
    };
  }

  private static async invokeIPC(channel: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `request_${this.requestIdCounter++}`;

      this.pendingRequests.set(requestId, { resolve, reject });

      ipcRenderer.invoke(channel, ...args)
        .then((response: any) => {
          this.pendingRequests.delete(requestId);

          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || 'Unknown error'));
          }
        })
        .catch((error: Error) => {
          this.pendingRequests.delete(requestId);
          reject(error);
        });
    });
  }
}