import { EventEmitter } from 'events';
import { z } from 'zod';

export interface PluginContext {
  pluginId: string;
  version: string;
  config: Record<string, any>;
  logger: Logger;
  storage: Storage;
  api: ApiClient;
  ui: UIComponents;
  permissions: string[];
  sandbox: boolean;
}

export interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: Error, data?: any): void;
  debug(message: string, data?: any): void;
}

export interface Storage {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface ApiClient {
  request<T = any>(config: ApiRequest): Promise<ApiResponse<T>>;
  get<T = any>(url: string, config?: Omit<ApiRequest, 'method' | 'url'>): Promise<ApiResponse<T>>;
  post<T = any>(url: string, data?: any, config?: Omit<ApiRequest, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
  put<T = any>(url: string, data?: any, config?: Omit<ApiRequest, 'method' | 'url' | 'data'>): Promise<ApiResponse<T>>;
  delete<T = any>(url: string, config?: Omit<ApiRequest, 'method' | 'url'>): Promise<ApiResponse<T>>;
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  headers: Record<string, string>;
}

export interface UIComponents {
  createPanel(config: PanelConfig): Panel;
  createDialog(config: DialogConfig): Dialog;
  createMenuItem(config: MenuItemConfig): MenuItem;
  createButton(config: ButtonConfig): Button;
  createInput(config: InputConfig): Input;
  createSelect(config: SelectConfig): Select;
  createNotification(config: NotificationConfig): Notification;
}

export interface PanelConfig {
  id: string;
  title: string;
  content: string | HTMLElement;
  position?: 'left' | 'right' | 'bottom' | 'top';
  size?: number;
  resizable?: boolean;
  closable?: boolean;
}

export interface DialogConfig {
  id: string;
  title: string;
  content: string | HTMLElement;
  width?: number;
  height?: number;
  modal?: boolean;
  buttons?: DialogButton[];
}

export interface DialogButton {
  id: string;
  label: string;
  type?: 'default' | 'primary' | 'danger';
  onClick?: () => void;
}

export interface MenuItemConfig {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  onClick?: () => void;
  submenu?: MenuItemConfig[];
}

export interface ButtonConfig {
  id: string;
  label: string;
  icon?: string;
  type?: 'default' | 'primary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
}

export interface InputConfig {
  id: string;
  label?: string;
  placeholder?: string;
  type?: 'text' | 'number' | 'password' | 'email';
  value?: string;
  onChange?: (value: string) => void;
}

export interface SelectConfig {
  id: string;
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface NotificationConfig {
  id: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  onClick?: () => void;
}

// UI Components
export interface Panel {
  id: string;
  show(): void;
  hide(): void;
  close(): void;
  setContent(content: string | HTMLElement): void;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

export interface Dialog {
  id: string;
  show(): void;
  hide(): void;
  close(): void;
  setContent(content: string | HTMLElement): void;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

export interface MenuItem {
  id: string;
  enabled: boolean;
  visible: boolean;
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
  onClick(callback: () => void): void;
}

export interface Button {
  id: string;
  enabled: boolean;
  visible: boolean;
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
  setLabel(label: string): void;
  onClick(callback: () => void): void;
}

export interface Input {
  id: string;
  value: string;
  enabled: boolean;
  visible: boolean;
  setValue(value: string): void;
  getValue(): string;
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
  onChange(callback: (value: string) => void): void;
}

export interface Select {
  id: string;
  value: string;
  enabled: boolean;
  visible: boolean;
  setValue(value: string): void;
  getValue(): string;
  setEnabled(enabled: boolean): void;
  setVisible(visible: boolean): void;
  onChange(callback: (value: string) => void): void;
}

export interface Notification {
  id: string;
  show(): void;
  hide(): void;
  close(): void;
}

// Plugin Hooks
export interface PluginHooks {
  onActivate?(context: PluginContext): Promise<void> | void;
  onDeactivate?(context: PluginContext): Promise<void> | void;
  onInstall?(context: PluginContext): Promise<void> | void;
  onUninstall?(context: PluginContext): Promise<void> | void;
  onUpdate?(context: PluginContext): Promise<void> | void;
  onConfigChange?(context: PluginContext, oldConfig: Record<string, any>): Promise<void> | void;
  onPermissionChange?(context: PluginContext, oldPermissions: string[]): Promise<void> | void;
}

// Plugin Lifecycle
export enum PluginLifecycle {
  INSTALLED = 'installed',
  ACTIVATED = 'activated',
  DEACTIVATED = 'deactivated',
  UPDATED = 'updated',
  UNINSTALLED = 'uninstalled'
}

// Plugin Manifest Schema
export const PluginManifestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  author: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  }),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  main: z.string().min(1),
  dependencies: z.record(z.string()).optional(),
  permissions: z.array(z.string()).default([]),
  config: z.record(z.any()).optional(),
  entry: z.string().optional(),
  icon: z.string().optional(),
  screenshot: z.string().optional(),
  minimumAtlasVersion: z.string().optional(),
  maximumAtlasVersion: z.string().optional(),
  platform: z.array(z.enum(['windows', 'macos', 'linux'])).optional(),
  architecture: z.array(z.enum(['x64', 'arm64'])).optional(),
  enabled: z.boolean().default(true),
  hidden: z.boolean().default(false),
  features: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  compatibility: z.object({
    os: z.array(z.enum(['windows', 'macos', 'linux'])).default(['windows', 'macos', 'linux']),
    arch: z.array(z.enum(['x64', 'arm64'])).default(['x64', 'arm64']),
    minVersion: z.string().default('1.0.0'),
    maxVersion: z.string().optional()
  }).optional()
});

export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Plugin SDK Interface
export interface PluginSDK {
  readonly context: PluginContext;
  readonly manifest: PluginManifest;
  readonly lifecycle: PluginLifecycle;

  // Core API
  activate(): Promise<void>;
  deactivate(): Promise<void>;

  // Configuration
  getConfig(): Record<string, any>;
  updateConfig(config: Record<string, any>): Promise<void>;

  // Storage
  getStorage(): Storage;

  // UI
  getUI(): UIComponents;

  // Events
  emit(event: string, data?: any): void;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;

  // Permissions
  checkPermission(permission: string): boolean;
  requestPermission(permission: string): Promise<boolean>;

  // Plugin Communication
  sendToPlugin(pluginId: string, message: any): Promise<any>;
  broadcast(message: any): void;

  // Host Communication
  sendToHost(message: any): Promise<any>;

  // Utilities
  createTimer(duration: number, callback: () => void): NodeJS.Timeout;
  clearTimer(timer: NodeJS.Timeout): void;
  createInterval(duration: number, callback: () => void): NodeJS.Timeout;
  clearInterval(interval: NodeJS.Timeout): void;

  // Version
  getVersion(): string;
  getHostVersion(): string;

  // Debugging
  debug(enabled: boolean): void;
  isDebugEnabled(): boolean;
}

// Plugin Base Class
export abstract class PluginBase extends EventEmitter implements PluginSDK, PluginHooks {
  protected _context: PluginContext;
  protected _manifest: PluginManifest;
  protected _lifecycle: PluginLifecycle = PluginLifecycle.INSTALLED;
  protected _debug: boolean = false;

  constructor(manifest: PluginManifest) {
    super();
    this._manifest = manifest;
  }

  // Plugin SDK Interface
  get context(): PluginContext {
    return this._context;
  }

  get manifest(): PluginManifest {
    return this._manifest;
  }

  get lifecycle(): PluginLifecycle {
    return this._lifecycle;
  }

  async activate(): Promise<void> {
    if (this._lifecycle === PluginLifecycle.ACTIVATED) {
      return;
    }

    try {
      if (this.onActivate) {
        await this.onActivate(this._context);
      }
      this._lifecycle = PluginLifecycle.ACTIVATED;
      this.emit('activated', this._context);
    } catch (error) {
      this._context.logger.error('Plugin activation failed', error as Error);
      throw error;
    }
  }

  async deactivate(): Promise<void> {
    if (this._lifecycle === PluginLifecycle.DEACTIVATED) {
      return;
    }

    try {
      if (this.onDeactivate) {
        await this.onDeactivate(this._context);
      }
      this._lifecycle = PluginLifecycle.DEACTIVATED;
      this.emit('deactivated', this._context);
    } catch (error) {
      this._context.logger.error('Plugin deactivation failed', error as Error);
      throw error;
    }
  }

  getConfig(): Record<string, any> {
    return this._context.config;
  }

  async updateConfig(config: Record<string, any>): Promise<void> {
    const oldConfig = { ...this._context.config };
    this._context.config = { ...this._context.config, ...config };

    if (this.onConfigChange) {
      await this.onConfigChange(this._context, oldConfig);
    }

    this.emit('configChanged', { oldConfig, newConfig: this._context.config });
  }

  getStorage(): Storage {
    return this._context.storage;
  }

  getUI(): UIComponents {
    return this._context.ui;
  }

  checkPermission(permission: string): boolean {
    return this._context.permissions.includes(permission);
  }

  async requestPermission(permission: string): Promise<boolean> {
    // This would be implemented by the host
    return false;
  }

  async sendToPlugin(pluginId: string, message: any): Promise<any> {
    // This would be implemented by the host
    throw new Error('Not implemented');
  }

  broadcast(message: any): void {
    // This would be implemented by the host
    this.emit('broadcast', message);
  }

  async sendToHost(message: any): Promise<any> {
    // This would be implemented by the host
    throw new Error('Not implemented');
  }

  createTimer(duration: number, callback: () => void): NodeJS.Timeout {
    return setTimeout(callback, duration);
  }

  clearTimer(timer: NodeJS.Timeout): void {
    clearTimeout(timer);
  }

  createInterval(duration: number, callback: () => void): NodeJS.Timeout {
    return setInterval(callback, duration);
  }

  clearInterval(interval: NodeJS.Timeout): void {
    clearInterval(interval);
  }

  getVersion(): string {
    return this._manifest.version;
  }

  getHostVersion(): string {
    return this._context.pluginId; // This would be provided by the host
  }

  debug(enabled: boolean): void {
    this._debug = enabled;
  }

  isDebugEnabled(): boolean {
    return this._debug;
  }

  // Internal methods called by host
  _setContext(context: PluginContext): void {
    this._context = context;
  }

  _setLifecycle(lifecycle: PluginLifecycle): void {
    this._lifecycle = lifecycle;
  }

  // Abstract methods that plugins can implement
  abstract onActivate?(context: PluginContext): Promise<void> | void;
  abstract onDeactivate?(context: PluginContext): Promise<void> | void;
  abstract onInstall?(context: PluginContext): Promise<void> | void;
  abstract onUninstall?(context: PluginContext): Promise<void> | void;
  abstract onUpdate?(context: PluginContext): Promise<void> | void;
  abstract onConfigChange?(context: PluginContext, oldConfig: Record<string, any>): Promise<void> | void;
  abstract onPermissionChange?(context: PluginContext, oldPermissions: string[]): Promise<void> | void;
}