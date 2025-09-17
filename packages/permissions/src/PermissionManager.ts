import { EventEmitter } from 'events';
import { dialog, BrowserWindow, ipcMain } from 'electron';
import { 
  Permission, 
  PermissionManager, 
  PermissionError,
  PluginError 
} from '@free-cluely/shared';
import { configManager } from '@free-cluely/config';

export interface PermissionRequest {
  id: string;
  permission: keyof Permission;
  plugin?: string;
  reason?: string;
  timestamp: number;
}

export interface PermissionDialogOptions {
  title: string;
  message: string;
  detail: string;
  buttons: string[];
  defaultId?: number;
  cancelId?: number;
}

export class PermissionManagerImpl extends EventEmitter implements PermissionManager {
  private permissions: Permission;
  private pendingRequests: Map<string, PermissionRequest> = new Map();
  private mainWindow?: BrowserWindow;

  constructor(initialPermissions?: Permission) {
    super();
    
    // Load permissions from config
    this.permissions = configManager.getPermissions();
    
    // Set up IPC handlers
    this.setupIPCHandlers();
    
    // Listen for config changes
    configManager.onConfigChange((config) => {
      this.setPermissions(config.permissions);
    });
  }

  hasPermission(permission: keyof Permission): boolean {
    return this.permissions[permission];
  }

  async requestPermission(permission: keyof Permission): Promise<boolean> {
    try {
      // If already granted, return true
      if (this.permissions[permission]) {
        return true;
      }

      // Create permission request
      const requestId = this.generateRequestId();
      const request: PermissionRequest = {
        id: requestId,
        permission,
        timestamp: Date.now()
      };

      this.pendingRequests.set(requestId, request);
      
      // Emit request event
      this.emit('permission:request', request);
      
      // Show permission dialog if we have a main window
      const granted = await this.showPermissionDialog(permission);
      
      // Update permission if granted
      if (granted) {
        this.setPermission(permission, true);
      }
      
      // Remove from pending requests
      this.pendingRequests.delete(requestId);
      
      return granted;
    } catch (error) {
      throw new PermissionError(
        `Failed to request permission '${permission}': ${error instanceof Error ? error.message : String(error)}`,
        permission
      );
    }
  }

  getPermissions(): Permission {
    return { ...this.permissions };
  }

  onPermissionChange(handler: (permissions: Permission) => void): () => void {
    this.on('permissions:changed', handler);
    return () => this.off('permissions:changed', handler);
  }

  // Set permission directly
  setPermission(permission: keyof Permission, granted: boolean): void {
    if (this.permissions[permission] !== granted) {
      this.permissions[permission] = granted;
      
      // Update config
      const currentConfig = configManager.getAppConfig();
      const updatedConfig = {
        ...currentConfig,
        permissions: this.permissions
      };
      configManager.updateConfig(updatedConfig);
      
      // Emit events
      this.emit('permission:changed', permission, granted);
      this.emit('permissions:changed', this.permissions);
    }
  }

  // Set all permissions
  setPermissions(permissions: Permission): void {
    const changed = JSON.stringify(this.permissions) !== JSON.stringify(permissions);
    
    if (changed) {
      this.permissions = { ...permissions };
      
      // Update config
      const currentConfig = configManager.getAppConfig();
      const updatedConfig = {
        ...currentConfig,
        permissions: this.permissions
      };
      configManager.updateConfig(updatedConfig);
      
      this.emit('permissions:changed', this.permissions);
    }
  }

  // Set main window reference for dialogs
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  // Check if all required permissions are granted
  hasAllPermissions(requiredPermissions: (keyof Permission)[]): boolean {
    return requiredPermissions.every(permission => this.permissions[permission]);
  }

  // Get missing permissions
  getMissingPermissions(requiredPermissions: (keyof Permission)[]): (keyof Permission)[] {
    return requiredPermissions.filter(permission => !this.permissions[permission]);
  }

  // Request multiple permissions at once
  async requestPermissions(permissions: (keyof Permission)[]): Promise<{ granted: (keyof Permission)[]; denied: (keyof Permission)[] }> {
    const granted: (keyof Permission)[] = [];
    const denied: (keyof Permission)[] = [];

    for (const permission of permissions) {
      try {
        const isGranted = await this.requestPermission(permission);
        if (isGranted) {
          granted.push(permission);
        } else {
          denied.push(permission);
        }
      } catch (error) {
        denied.push(permission);
      }
    }

    return { granted, denied };
  }

  // Reset all permissions to default
  resetPermissions(): void {
    const defaultPermissions: Permission = {
      screen: true,
      clipboard: false,
      automation: false,
      network: true,
    };
    
    this.setPermissions(defaultPermissions);
  }

  // Check if automation is allowed for a specific domain
  isAutomationAllowed(domain: string): boolean {
    if (!this.permissions.automation) {
      return false;
    }
    
    const automationConfig = configManager.getAutomationConfig();
    const allowlist = automationConfig.allowlist || [];

    // If no allowlist is specified, allow all domains
    if (allowlist.length === 0) {
      return true;
    }
    
    return allowlist.some(allowedDomain => {
      // Support wildcard domains
      if (allowedDomain.startsWith('*.')) {
        const baseDomain = allowedDomain.substring(2);
        return domain === baseDomain || domain.endsWith(`.${baseDomain}`);
      }
      
      return domain === allowedDomain;
    });
  }

  // Get permission summary for UI
  getPermissionSummary(): {
    total: number;
    granted: number;
    details: Array<{
      permission: keyof Permission;
      granted: boolean;
      description: string;
      icon: string;
      color: string;
    }>;
  } {
    const permissionDetails = [
      {
        permission: 'screen' as keyof Permission,
        granted: this.permissions.screen,
        description: 'Screen capture and analysis',
        icon: '🖥️',
        color: this.permissions.screen ? 'text-green-600' : 'text-gray-400'
      },
      {
        permission: 'clipboard' as keyof Permission,
        granted: this.permissions.clipboard,
        description: 'Clipboard read/write access',
        icon: '📋',
        color: this.permissions.clipboard ? 'text-green-600' : 'text-gray-400'
      },
      {
        permission: 'automation' as keyof Permission,
        granted: this.permissions.automation,
        description: 'Browser automation control',
        icon: '🤖',
        color: this.permissions.automation ? 'text-green-600' : 'text-gray-400'
      },
      {
        permission: 'network' as keyof Permission,
        granted: this.permissions.network,
        description: 'Network requests and API calls',
        icon: '🌐',
        color: this.permissions.network ? 'text-green-600' : 'text-gray-400'
      }
    ];
    
    return {
      total: permissionDetails.length,
      granted: permissionDetails.filter(p => p.granted).length,
      details: permissionDetails
    };
  }

  // Validate permissions against configuration
  validatePermissions(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if automation is enabled but permission not granted
    const automationConfig = configManager.getAutomationConfig();
    if (automationConfig.enabled && !this.permissions.automation) {
      errors.push('Automation is enabled but permission not granted');
    }
    
    // Check automation allowlist
    if (this.permissions.automation && automationConfig.allowlist.length > 0) {
      const invalidDomains = automationConfig.allowlist.filter(domain => {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        return !domainRegex.test(domain);
      });
      
      if (invalidDomains.length > 0) {
        errors.push(`Invalid domains in automation allowlist: ${invalidDomains.join(', ')}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Export permissions to various formats
  exportPermissions(format: 'json' | 'env' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.permissions, null, 2);
    } else if (format === 'env') {
      return [
        `PERMISSION_SCREEN=${this.permissions.screen}`,
        `PERMISSION_CLIPBOARD=${this.permissions.clipboard}`,
        `PERMISSION_AUTOMATION=${this.permissions.automation}`,
        `PERMISSION_NETWORK=${this.permissions.network}`
      ].join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  // Import permissions from JSON
  importPermissions(json: string): void {
    try {
      const imported = JSON.parse(json);
      const permissions: Permission = {
        screen: Boolean(imported.screen),
        clipboard: Boolean(imported.clipboard),
        automation: Boolean(imported.automation),
        network: Boolean(imported.network),
      };
      
      this.setPermissions(permissions);
    } catch (error) {
      throw new Error(`Failed to import permissions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Private methods
  private generateRequestId(): string {
    return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async showPermissionDialog(permission: keyof Permission): Promise<boolean> {
    if (!this.mainWindow) {
      // Fallback to console prompt for testing
      return new Promise((resolve) => {
        const response = dialog.showMessageBoxSync({
          type: 'question',
          buttons: ['Allow', 'Deny'],
          defaultId: 0,
          cancelId: 1,
          title: 'Permission Request',
          message: `Allow ${this.getPermissionDescription(permission)}?`,
          detail: this.getPermissionDetail(permission)
        });
        
        resolve(response === 0);
      });
    }

    // For renderer process, we'll use IPC
    return new Promise((resolve) => {
      const requestId = this.generateRequestId();
      
      const handler = (_event: any, responseId: string, granted: boolean) => {
        if (responseId === requestId) {
          ipcMain.removeListener('permission-response', handler);
          resolve(granted);
        }
      };
      
      ipcMain.on('permission-response', handler);
      
      // Send request to renderer
      this.mainWindow?.webContents.send('permission-request', {
        id: requestId,
        permission,
        description: this.getPermissionDescription(permission),
        detail: this.getPermissionDetail(permission)
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        ipcMain.removeListener('permission-response', handler);
        resolve(false);
      }, 30000);
    });
  }

  private getPermissionDescription(permission: keyof Permission): string {
    const descriptions = {
      screen: 'Screen Capture',
      clipboard: 'Clipboard Access',
      automation: 'Browser Automation',
      network: 'Network Access'
    };
    
    return descriptions[permission];
  }

  private getPermissionDetail(permission: keyof Permission): string {
    const details = {
      screen: 'This application needs permission to capture screenshots and analyze screen content for AI processing.',
      clipboard: 'This application needs permission to read from and write to your clipboard for text processing and data extraction.',
      automation: 'This application needs permission to control your web browser for automated testing and data extraction tasks.',
      network: 'This application needs permission to make network requests for API calls and data synchronization.'
    };
    
    return details[permission];
  }

  private setupIPCHandlers(): void {
    ipcMain.handle('permission:get', () => this.getPermissions());
    ipcMain.handle('permission:has', (_event, permission: keyof Permission) => this.hasPermission(permission));
    ipcMain.handle('permission:request', (_event, permission: keyof Permission) => this.requestPermission(permission));
    ipcMain.handle('permission:set', (_event, permission: keyof Permission, granted: boolean) => {
      this.setPermission(permission, granted);
    });
    ipcMain.handle('permission:summary', () => this.getPermissionSummary());
    ipcMain.handle('permission:validate', () => this.validatePermissions());
  }
}

// Create singleton instance
export const permissionManager = new PermissionManagerImpl();

// Export for testing
export { PermissionManagerImpl };