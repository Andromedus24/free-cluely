import { EventEmitter } from 'events';
import { PermissionManager, AppConfig, Permission, PermissionError } from '@free-cluely/shared';

export class PermissionManagerImpl extends EventEmitter implements PermissionManager {
  private permissions: Permission;

  constructor(initialPermissions?: Permission) {
    super();
    this.permissions = initialPermissions || {
      screen: false,
      clipboard: false,
      automation: false,
      network: false,
    };
  }

  hasPermission(permission: keyof Permission): boolean {
    return this.permissions[permission];
  }

  async requestPermission(permission: keyof Permission): Promise<boolean> {
    try {
      // In a real implementation, this would show a dialog to the user
      // For now, we'll simulate the request by checking current permissions
      
      if (this.permissions[permission]) {
        return true;
      }
      
      // Emit permission request event
      this.emit('permission:request', permission);
      
      // Simulate user approval for demo purposes
      // In a real app, this would wait for user input
      const granted = await this.simulatePermissionRequest(permission);
      
      if (granted) {
        this.permissions[permission] = true;
        this.emit('permission:granted', permission);
        this.emit('permissions:changed', this.permissions);
      } else {
        this.emit('permission:denied', permission);
      }
      
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

  // Set permission directly (for administrative use)
  setPermission(permission: keyof Permission, granted: boolean): void {
    if (this.permissions[permission] !== granted) {
      this.permissions[permission] = granted;
      this.emit('permission:changed', permission, granted);
      this.emit('permissions:changed', this.permissions);
    }
  }

  // Set all permissions at once
  setPermissions(permissions: Permission): void {
    const changed = JSON.stringify(this.permissions) !== JSON.stringify(permissions);
    
    if (changed) {
      this.permissions = { ...permissions };
      this.emit('permissions:changed', this.permissions);
    }
  }

  // Check if all required permissions are granted
  hasAllPermissions(requiredPermissions: (keyof Permission)[]): boolean {
    return requiredPermissions.every(permission => this.permissions[permission]);
  }

  // Get missing permissions
  getMissingPermissions(requiredPermissions: (keyof Permission)[]): (keyof Permission)[] {
    return requiredPermissions.filter(permission => !this.permissions[permission]);
  }

  // Reset all permissions to default state
  resetPermissions(): void {
    const defaultPermissions: Permission = {
      screen: false,
      clipboard: false,
      automation: false,
      network: false,
    };
    
    this.setPermissions(defaultPermissions);
  }

  // Check if automation is allowed for a specific domain
  isAutomationAllowed(domain: string, allowlist: string[]): boolean {
    if (!this.permissions.automation) {
      return false;
    }
    
    // If no allowlist is specified, allow all domains
    if (!allowlist || allowlist.length === 0) {
      return true;
    }
    
    // Check if domain matches any allowlist entry
    return allowlist.some(allowedDomain => {
      // Support wildcard domains
      if (allowedDomain.startsWith('*.')) {
        const baseDomain = allowedDomain.substring(2);
        return domain === baseDomain || domain.endsWith(`.${baseDomain}`);
      }
      
      return domain === allowedDomain;
    });
  }

  // Validate permissions against app configuration
  validatePermissions(config: AppConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if automation is enabled but permission not granted
    if (config.automation.enabled && !this.permissions.automation) {
      errors.push('Automation is enabled but permission not granted');
    }
    
    // Check if automation allowlist contains invalid domains
    if (config.automation.allowlist && config.automation.allowlist.length > 0) {
      const invalidDomains = config.automation.allowlist.filter(domain => {
        // Simple domain validation
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$|^(\*\.)[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
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

  // Get permission summary
  getPermissionSummary(): {
    total: number;
    granted: number;
    details: Array<{
      permission: keyof Permission;
      granted: boolean;
      description: string;
    }>;
  } {
    const permissionDetails: Array<{
      permission: keyof Permission;
      granted: boolean;
      description: string;
    }> = [
      {
        permission: 'screen',
        granted: this.permissions.screen,
        description: 'Screen capture and analysis'
      },
      {
        permission: 'clipboard',
        granted: this.permissions.clipboard,
        description: 'Clipboard read/write access'
      },
      {
        permission: 'automation',
        granted: this.permissions.automation,
        description: 'Browser automation control'
      },
      {
        permission: 'network',
        granted: this.permissions.network,
        description: 'Network requests and API calls'
      }
    ];
    
    return {
      total: permissionDetails.length,
      granted: permissionDetails.filter(p => p.granted).length,
      details: permissionDetails
    };
  }

  // Export permissions to JSON
  exportPermissions(): string {
    return JSON.stringify(this.permissions, null, 2);
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

  // Simulate permission request (in real app, this would show UI)
  private async simulatePermissionRequest(permission: keyof Permission): Promise<boolean> {
    // For demo purposes, we'll auto-approve screen and network permissions
    // and deny clipboard and automation by default
    const autoApprove = ['screen', 'network'];
    return autoApprove.includes(permission);
  }

  // Listen for specific permission changes
  onPermissionChange(permission: keyof Permission, handler: (granted: boolean) => void): () => void {
    const wrappedHandler = (changedPermission: keyof Permission, granted: boolean) => {
      if (changedPermission === permission) {
        handler(granted);
      }
    };
    
    this.on('permission:changed', wrappedHandler);
    return () => this.off('permission:changed', wrappedHandler);
  }
}