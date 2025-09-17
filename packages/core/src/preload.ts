import { contextBridge, ipcRenderer } from 'electron';
import { IPCMessage, IPCResponse } from './IPCService';

// Expose secure IPC to renderer process
const secureIPC = {
  // Provider key management
  async setProviderKey(providerName: string, apiKey: string): Promise<void> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'setProviderKey',
      payload: { providerName, apiKey, nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  async getProviderKey(providerName: string): Promise<string | null> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'getProviderKey',
      payload: { providerName, nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async deleteProviderKey(providerName: string): Promise<boolean> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'deleteProviderKey',
      payload: { providerName, nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async listProviderKeys(): Promise<string[]> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'listProviderKeys',
      payload: { nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  // Settings management
  async saveSettings(settings: any): Promise<void> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'saveSettings',
      payload: { settings, nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  async getSettings(): Promise<any> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'getSettings',
      payload: { nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async exportSettings(): Promise<string> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'exportSettings',
      payload: { nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async importSettings(exportData: string): Promise<void> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'importSettings',
      payload: exportData,
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  // Security operations
  async lock(): Promise<void> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'lock',
      payload: { nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  async unlock(password?: string): Promise<boolean> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'unlock',
      payload: { password, nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async isLocked(): Promise<boolean> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'isLocked',
      payload: { nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async healthCheck(): Promise<{ status: 'healthy' | 'error'; message?: string }> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'healthCheck',
      payload: { nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },

  async clearAllData(): Promise<void> {
    const message: IPCMessage = {
      id: Date.now().toString(),
      type: 'request',
      method: 'clearAllData',
      payload: { nonce: Math.random().toString(36) },
      timestamp: Date.now()
    };

    const response = await ipcRenderer.invoke('atlas-secure-call', message);
    if (!response.success) {
      throw new Error(response.error);
    }
  },

  // Event listeners
  onSettingsChanged(callback: (settings: any) => void): () => void {
    ipcRenderer.on('atlas-settings-changed', (event, settings) => {
      callback(settings);
    });

    return () => {
      ipcRenderer.removeListener('atlas-settings-changed', callback);
    };
  },

  onSecurityLock(callback: () => void): () => void {
    ipcRenderer.on('atlas-security-lock', callback);

    return () => {
      ipcRenderer.removeListener('atlas-security-lock', callback);
    };
  }
};

// Expose the secure IPC API to the renderer process
contextBridge.exposeInMainWorld('atlasSecureIPC', secureIPC);

// Type definitions for the exposed API
declare global {
  interface Window {
    atlasSecureIPC: typeof secureIPC;
  }
}

export default secureIPC;