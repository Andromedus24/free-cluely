import { z } from 'zod';
import { dialog, BrowserWindow } from 'electron';
import { AppConfigSchema } from '@free-cluely/shared';

// IPC channel validation
const ALLOWED_CHANNELS = {
  // App info - read-only, safe
  'app:get-info': { requiresAuth: false, schema: z.void() },
  
  // Configuration - requires validation and user consent
  'config:get': { requiresAuth: false, schema: z.void() },
  'config:update': { requiresAuth: true, schema: AppConfigSchema.partial() },
  'config:validate': { requiresAuth: false, schema: z.void() },
  
  // Permissions - sensitive operations
  'permission:get': { requiresAuth: false, schema: z.void() },
  'permission:has': { requiresAuth: false, schema: z.string() },
  'permission:request': { requiresAuth: true, schema: z.string() },
  'permission:set': { requiresAuth: true, schema: z.object({
    permission: z.string(),
    granted: z.boolean()
  }) },
  'permission:summary': { requiresAuth: false, schema: z.void() },
  
  // Plugin management - requires auth
  'plugin:list': { requiresAuth: false, schema: z.void() },
  'plugin:start': { requiresAuth: true, schema: z.string() },
  'plugin:stop': { requiresAuth: true, schema: z.string() },
  'plugin:register': { requiresAuth: true, schema: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string().optional(),
    permissions: z.array(z.string()).optional()
  }) },
  'plugin:unregister': { requiresAuth: true, schema: z.string() },
  
  // Screenshot - sensitive operation
  'screenshot:capture': { requiresAuth: true, schema: z.void() },
  
  // Window management - generally safe
  'window:show': { requiresAuth: false, schema: z.void() },
  'window:hide': { requiresAuth: false, schema: z.void() },
  'window:minimize': { requiresAuth: false, schema: z.void() },
  'window:maximize': { requiresAuth: false, schema: z.void() },
  'window:close': { requiresAuth: false, schema: z.void() },
  
  // Dashboard - safe
  'dashboard:open': { requiresAuth: false, schema: z.void() },
} as const;

export type AllowedChannel = keyof typeof ALLOWED_CHANNELS;

export class IPCSecurity {
  private static userConsent = new Set<string>();
  
  /**
   * Validates IPC channel and payload
   */
  static validateChannel(channel: string, payload?: any): { 
    isValid: boolean; 
    error?: string; 
    requiresAuth: boolean;
  } {
    const channelConfig = ALLOWED_CHANNELS[channel as AllowedChannel];
    
    if (!channelConfig) {
      return { 
        isValid: false, 
        error: `Channel '${channel}' is not allowed`,
        requiresAuth: false 
      };
    }
    
    // Validate payload against schema
    try {
      if (payload !== undefined) {
        channelConfig.schema.parse(payload);
      }
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid payload for channel '${channel}': ${error.message}`,
        requiresAuth: channelConfig.requiresAuth 
      };
    }
    
    return { 
      isValid: true, 
      requiresAuth: channelConfig.requiresAuth 
    };
  }
  
  /**
   * Requests user consent for sensitive operations
   */
  static async requestUserConsent(
    mainWindow: BrowserWindow,
    channel: string,
    operation: string
  ): Promise<boolean> {
    const consentKey = `${channel}:${operation}`;
    
    // Check if user has already given consent for this operation
    if (this.userConsent.has(consentKey)) {
      return true;
    }
    
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Allow', 'Deny', 'Always Allow'],
      defaultId: 1,
      title: 'Permission Required',
      message: `Atlas wants to ${operation}`,
      detail: `This action may affect your system configuration. Do you want to allow this?`,
      cancelId: 1,
    });
    
    if (result.response === 0) {
      // Allow once
      return true;
    } else if (result.response === 2) {
      // Always allow
      this.userConsent.add(consentKey);
      return true;
    }
    
    // Deny
    return false;
  }
  
  /**
   * Clears user consent cache
   */
  static clearUserConsent(): void {
    this.userConsent.clear();
  }
  
  /**
   * Gets user consent for a specific operation
   */
  static hasUserConsent(channel: string, operation: string): boolean {
    const consentKey = `${channel}:${operation}`;
    return this.userConsent.has(consentKey);
  }
  
  /**
   * Validates and authorizes IPC request
   */
  static async authorizeRequest(
    mainWindow: BrowserWindow,
    channel: string,
    payload?: any
  ): Promise<{ authorized: boolean; error?: string }> {
    const validation = this.validateChannel(channel, payload);
    
    if (!validation.isValid) {
      return { authorized: false, error: validation.error };
    }
    
    if (!validation.requiresAuth) {
      return { authorized: true };
    }
    
    // For sensitive operations, request user consent
    const operationDescriptions: Record<string, string> = {
      'config:update': 'modify system configuration',
      'permission:request': 'request new permissions',
      'permission:set': 'change permission settings',
      'plugin:start': 'start a plugin',
      'plugin:stop': 'stop a plugin',
      'plugin:register': 'install a new plugin',
      'plugin:unregister': 'remove a plugin',
      'screenshot:capture': 'take a screenshot',
    };
    
    const operation = operationDescriptions[channel] || `perform ${channel}`;
    const hasConsent = await this.requestUserConsent(mainWindow, channel, operation);
    
    if (!hasConsent) {
      return { authorized: false, error: 'User denied authorization' };
    }
    
    return { authorized: true };
  }
  
  /**
   * Sanitizes error messages for client
   */
  static sanitizeError(error: string): string {
    // Remove potentially sensitive information from error messages
    return error
      .replace(/\/[^\s]+/g, '[path]') // Remove file paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[ip]') // Remove IP addresses
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]'); // Remove emails
  }
}

// Export channel list for validation
export const WHITELISTED_CHANNELS = Object.keys(ALLOWED_CHANNELS) as AllowedChannel[];

// Create a wrapper for IPC handlers that includes security validation
export function createSecureIPCHandler<T = any>(
  mainWindow: BrowserWindow,
  channel: AllowedChannel,
  handler: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => Promise<T> | T
) {
  return async (event: Electron.IpcMainInvokeEvent, ...args: any[]): Promise<T> => {
    try {
      // Authorize the request
      const authorization = await IPCSecurity.authorizeRequest(
        mainWindow,
        channel,
        args.length > 0 ? args[0] : undefined
      );
      
      if (!authorization.authorized) {
        throw new Error(authorization.error || 'Unauthorized');
      }
      
      // Execute the original handler
      return await handler(event, ...args);
    } catch (error) {
      console.error(`IPC handler error for ${channel}:`, error);
      const sanitizedError = IPCSecurity.sanitizeError(error.message);
      throw new Error(sanitizedError);
    }
  };
}
