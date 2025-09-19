import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  PluginManifest,
  PluginMessage,
  PluginResponse,
  PluginBus,
  ConfigManager,
  Logger,
  PermissionManager,
  PluginError,
  PermissionError,
  validateManifest
} from '@free-cluely/shared';

export class PluginBusImpl extends EventEmitter implements PluginBus {
  private plugins: Map<string, PluginManifest> = new Map();
  private processes: Map<string, any> = new Map(); // ChildProcess instances
  private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout?: NodeJS.Timeout }> = new Map();
  private config: ConfigManager;
  private logger: Logger;
  private permissions: PermissionManager;
  private requestTimeout = 30000; // 30 seconds

  constructor(config: ConfigManager, logger: Logger, permissions: PermissionManager) {
    super();
    this.config = config;
    this.logger = logger;
    this.permissions = permissions;
  }

  async register(manifest: PluginManifest): Promise<void> {
    try {
      // Validate manifest
      const validatedManifest = validateManifest(manifest);
      
      // Check if plugin already exists
      if (this.plugins.has(validatedManifest.name)) {
        throw new PluginError(`Plugin '${validatedManifest.name}' is already registered`, validatedManifest.name);
      }

      // Check permissions
      for (const permission of validatedManifest.permissions) {
        if (!this.permissions.hasPermission(permission as any)) {
          throw new PermissionError(`Permission '${permission}' not granted`, permission);
        }
      }

      // Add to plugins registry
      this.plugins.set(validatedManifest.name, validatedManifest);
      
      // Emit registration event
      this.emit('plugin:registered', validatedManifest);
      
      this.logger.info(`Plugin '${validatedManifest.name}' registered successfully`, { plugin: validatedManifest.name });
    } catch (error) {
      this.logger.error(`Failed to register plugin '${manifest.name}': ${error instanceof Error ? error.message : String(error)}`, { plugin: manifest.name });
      throw error;
    }
  }

  async unregister(pluginName: string): Promise<void> {
    try {
      const manifest = this.plugins.get(pluginName);
      if (!manifest) {
        throw new PluginError(`Plugin '${pluginName}' is not registered`, pluginName);
      }

      // Stop any running processes
      const process = this.processes.get(pluginName);
      if (process) {
        process.kill();
        this.processes.delete(pluginName);
      }

      // Remove from registry
      this.plugins.delete(pluginName);
      
      // Emit unregistration event
      this.emit('plugin:unregistered', manifest);
      
      this.logger.info(`Plugin '${pluginName}' unregistered successfully`, { plugin: pluginName });
    } catch (error) {
      this.logger.error(`Failed to unregister plugin '${pluginName}': ${error instanceof Error ? error.message : String(error)}`, { plugin: pluginName });
      throw error;
    }
  }

  async send(message: PluginMessage): Promise<PluginResponse> {
    try {
      const manifest = this.plugins.get(message.plugin);
      if (!manifest) {
        throw new PluginError(`Plugin '${message.plugin}' is not registered`, message.plugin);
      }

      // Check if plugin has required permissions for the method
      if (this.requiresPermission(message.method)) {
        const requiredPermission = this.getMethodPermission(message.method);
        if (!manifest.permissions.includes(requiredPermission)) {
          throw new PermissionError(`Plugin '${message.plugin}' lacks required permission '${requiredPermission}'`, requiredPermission);
        }
      }

      // Create response promise
      return new Promise((resolve, reject) => {
        const messageId = message.id;
        
        // Set up timeout
        const timeout = setTimeout(() => {
          this.pendingRequests.delete(messageId);
          reject(new PluginError(`Request to plugin '${message.plugin}' timed out`, message.plugin));
        }, this.requestTimeout);

        // Store pending request
        this.pendingRequests.set(messageId, { resolve, reject, timeout });

        // Send message to plugin
        this.emit('message:send', message);
      });
    } catch (error) {
      this.logger.error(`Failed to send message to plugin '${message.plugin}': ${error instanceof Error ? error.message : String(error)}`, { plugin: message.plugin });
      throw error;
    }
  }

  broadcast(event: Omit<PluginMessage, 'id' | 'type'>): void {
    const message: PluginMessage = {
      id: uuidv4(),
      type: 'event',
      ...event,
      timestamp: Date.now()
    };

    // Send to all registered plugins
    for (const pluginName of this.plugins.keys()) {
      const pluginMessage: PluginMessage = {
        ...message,
        plugin: pluginName
      };
      
      this.emit('message:send', pluginMessage);
    }

    this.logger.debug(`Broadcast event to all plugins: ${event.method}`, { method: event.method });
  }

  onMessage(handler: (message: PluginMessage) => void): () => void {
    this.on('message:send', handler);
    return () => this.off('message:send', handler);
  }

  getPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  // Handle responses from plugins
  handleResponse(response: PluginResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.success) {
        pending.resolve(response);
      } else {
        pending.reject(new PluginError(response.error || 'Plugin request failed', response.plugin));
      }
    }
  }

  // Start a plugin process
  async startPlugin(pluginName: string): Promise<void> {
    const manifest = this.plugins.get(pluginName);
    if (!manifest) {
      throw new PluginError(`Plugin '${pluginName}' is not registered`, pluginName);
    }

    if (this.processes.has(pluginName)) {
      throw new PluginError(`Plugin '${pluginName}' is already running`, pluginName);
    }

    try {
      // In a real implementation, this would spawn a child process
      // For now, we'll simulate it
      const mockProcess = {
        kill: () => {},
        on: (event: string, handler: Function) => {},
        send: (message: any) => {}
      };

      this.processes.set(pluginName, mockProcess);
      
      this.emit('plugin:started', manifest);
      this.logger.info(`Plugin '${pluginName}' started successfully`, { plugin: pluginName });
    } catch (error) {
      this.logger.error(`Failed to start plugin '${pluginName}': ${error instanceof Error ? error.message : String(error)}`, { plugin: pluginName });
      throw error;
    }
  }

  // Stop a plugin process
  async stopPlugin(pluginName: string): Promise<void> {
    const process = this.processes.get(pluginName);
    if (!process) {
      throw new PluginError(`Plugin '${pluginName}' is not running`, pluginName);
    }

    try {
      process.kill();
      this.processes.delete(pluginName);
      
      const manifest = this.plugins.get(pluginName);
      if (manifest) {
        this.emit('plugin:stopped', manifest);
      }
      
      this.logger.info(`Plugin '${pluginName}' stopped successfully`, { plugin: pluginName });
    } catch (error) {
      this.logger.error(`Failed to stop plugin '${pluginName}': ${error instanceof Error ? error.message : String(error)}`, { plugin: pluginName });
      throw error;
    }
  }

  // Check if a plugin is running
  isPluginRunning(pluginName: string): boolean {
    return this.processes.has(pluginName);
  }

  // Get running plugins
  getRunningPlugins(): string[] {
    return Array.from(this.processes.keys());
  }

  // Helper method to check if a method requires permission
  private requiresPermission(method: string): boolean {
    const permissionRequiredMethods = [
      'screenshot',
      'clipboard.read',
      'clipboard.write',
      'network.request',
      'automation.navigate',
      'automation.click',
      'automation.type'
    ];
    return permissionRequiredMethods.includes(method);
  }

  // Helper method to get required permission for a method
  private getMethodPermission(method: string): string {
    const methodPermissions: Record<string, string> = {
      'screenshot': 'screen',
      'clipboard.read': 'clipboard',
      'clipboard.write': 'clipboard',
      'network.request': 'network',
      'automation.navigate': 'automation',
      'automation.click': 'automation',
      'automation.type': 'automation'
    };
    return methodPermissions[method] || 'network';
  }
}