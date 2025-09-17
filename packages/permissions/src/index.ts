export { PermissionManagerImpl, permissionManager } from './PermissionManager';
export type { PermissionRequest, PermissionDialogOptions } from './PermissionManager';

// Permission utilities
export const requestPermission = (permission: keyof any) => 
  permissionManager.requestPermission(permission);

export const hasPermission = (permission: keyof any) => 
  permissionManager.hasPermission(permission);

export const getPermissions = () => 
  permissionManager.getPermissions();

export const getPermissionSummary = () => 
  permissionManager.getPermissionSummary();

export const isAutomationAllowed = (domain: string) => 
  permissionManager.isAutomationAllowed(domain);

// Export types
export type { Permission } from '@free-cluely/shared';