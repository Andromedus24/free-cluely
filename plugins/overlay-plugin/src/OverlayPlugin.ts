import { BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import * as path from 'path';
import { Plugin, PluginBus, ConfigManager, Logger, PluginError, OverlayConfig, WindowPosition } from '@free-cluely/shared';

export class OverlayPlugin implements Plugin {
  name = 'overlay-plugin';
  version = '1.0.0';
  permissions = ['screen', 'automation'];
  
  private overlayWindow: BrowserWindow | null = null;
  private isVisible = false;
  private config: OverlayConfig;
  private logger: Logger;
  private bus: PluginBus;
  private configManager: ConfigManager;
  private overlayState = {
    position: { x: 100, y: 100 },
    size: { width: 400, height: 600 },
    isVisible: false
  };
  
  // Default hotkeys (platform-specific)
  private hotkeys = {
    toggleVisibility: process.platform === 'darwin' ? 'Cmd+Shift+Space' : 'Ctrl+Shift+Space',
    takeScreenshot: process.platform === 'darwin' ? 'Cmd+H' : 'Ctrl+H',
    centerWindow: process.platform === 'darwin' ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
    moveUp: process.platform === 'darwin' ? 'Cmd+Up' : 'Ctrl+Up',
    moveDown: process.platform === 'darwin' ? 'Cmd+Down' : 'Ctrl+Down',
    moveLeft: process.platform === 'darwin' ? 'Cmd+Left' : 'Ctrl+Left',
    moveRight: process.platform === 'darwin' ? 'Cmd+Right' : 'Ctrl+Right',
    resetPosition: process.platform === 'darwin' ? 'Cmd+R' : 'Ctrl+R',
    minimize: process.platform === 'darwin' ? 'Cmd+M' : 'Ctrl+M',
    quickCapture: process.platform === 'darwin' ? 'Cmd+Shift+H' : 'Ctrl+Shift+H',
    escape: 'Escape'
  };

  constructor(config: Partial<OverlayConfig> = {}) {
    this.config = {
      width: 400,
      height: 600,
      alwaysOnTop: true,
      transparent: true,
      frameless: true,
      movable: true,
      resizable: false,
      ...config
    };
  }

  async initialize(bus: PluginBus, configManager: ConfigManager, logger: Logger): Promise<void> {
    this.bus = bus;
    this.logger = logger;
    this.configManager = configManager;

    // Load configuration and state
    const overlayConfig = configManager.get('overlay') as OverlayConfig;
    if (overlayConfig) {
      this.config = { ...this.config, ...overlayConfig };
    }

    // Load persisted state
    const savedState = configManager.get('overlayState');
    if (savedState) {
      this.overlayState = { ...this.overlayState, ...savedState };
    }

    this.logger.info('Initializing OverlayPlugin');

    // Setup IPC handlers
    this.setupIpcHandlers();

    // Create overlay window
    await this.createOverlayWindow();

    // Register global shortcuts
    this.registerGlobalShortcuts();

    // Register plugin methods
    this.registerPluginMethods();

    this.logger.info('OverlayPlugin initialized successfully');
  }

  private async createOverlayWindow(): Promise<void> {
    if (this.overlayWindow) {
      this.overlayWindow.destroy();
    }

    const { width, height, alwaysOnTop, transparent, frameless } = this.config;
    const { position } = this.overlayState;

    this.overlayWindow = new BrowserWindow({
      width: this.overlayState.size.width,
      height: this.overlayState.size.height,
      x: position.x,
      y: position.y,
      alwaysOnTop,
      transparent,
      frame: false,
      resizable: this.config.resizable,
      skipTaskbar: true,
      vibrancy: 'sidebar',
      visualEffectState: 'active',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: path.join(__dirname, '../../../apps/electron-host/dist/preload.js')
      }
    });

    // Load the overlay UI - using the overlay page
    await this.overlayWindow.loadURL(`file://${path.join(__dirname, '../../../apps/dashboard/out/index.html')}#overlay`);

    // Hide initially
    this.overlayWindow.hide();
    this.isVisible = false;

    // Handle window events
    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });

    this.overlayWindow.on('blur', () => {
      // Optional: Auto-hide on blur
      // this.hide();
    });
  }

  private setupIpcHandlers(): void {
    ipcMain.handle('overlay:show', () => this.show());
    ipcMain.handle('overlay:hide', () => this.hide());
    ipcMain.handle('overlay:toggle', () => this.toggle());
    ipcMain.handle('overlay:center', () => this.center());
    ipcMain.handle('overlay:move', (event, x: number, y: number) => this.move(x, y));
    ipcMain.handle('overlay:resize', (event, width: number, height: number) => this.resize(width, height));
    ipcMain.handle('overlay:getPosition', () => this.getPosition());
    ipcMain.handle('overlay:getConfig', () => this.getConfig());
    ipcMain.handle('overlay:setConfig', (event, config: Partial<OverlayConfig>) => this.setConfig(config));

    // Additional IPC handlers for overlay page functionality
    ipcMain.handle('overlay:takeScreenshot', async () => {
      try {
        // Forward to screenshot plugin
        const result = await this.bus.send({
          id: Date.now().toString(),
          type: 'request',
          plugin: 'screenshot-plugin',
          method: 'takeScreenshot',
          payload: { type: 'problem' },
          timestamp: Date.now()
        });
        return result;
      } catch (error) {
        this.logger.error('Failed to take screenshot:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('overlay:attachImage', async () => {
      // This would open file dialog for image selection
      // For now, return empty result
      return { success: false, error: 'Not implemented yet' };
    });

    ipcMain.handle('overlay:startRecording', async () => {
      // This would start voice recording
      // For now, return empty result
      return { success: false, error: 'Not implemented yet' };
    });

    ipcMain.handle('overlay:sendMessage', async (event, data: { message: string; attachments?: any[] }) => {
      try {
        // Forward to LLM plugin
        const result = await this.bus.send({
          id: Date.now().toString(),
          type: 'request',
          plugin: 'llm-service',
          method: 'sendMessage',
          payload: data,
          timestamp: Date.now()
        });
        return result;
      } catch (error) {
        this.logger.error('Failed to send message:', error);
        return { success: false, error: error.message };
      }
    });
  }

  private registerGlobalShortcuts(): void {
    const shortcuts = [
      { key: this.hotkeys.toggleVisibility, callback: () => this.toggle() },
      { key: this.hotkeys.centerWindow, callback: () => this.center() },
      { key: this.hotkeys.moveUp, callback: () => this.moveRelative(0, -20) },
      { key: this.hotkeys.moveDown, callback: () => this.moveRelative(0, 20) },
      { key: this.hotkeys.moveLeft, callback: () => this.moveRelative(-20, 0) },
      { key: this.hotkeys.moveRight, callback: () => this.moveRelative(20, 0) },
      { key: this.hotkeys.resetPosition, callback: () => this.center() },
      { key: this.hotkeys.minimize, callback: () => this.hide() },
      { key: this.hotkeys.quickCapture, callback: () => this.quickCapture() },
      { key: this.hotkeys.escape, callback: () => this.handleEscape() }
    ];

    shortcuts.forEach(({ key, callback }) => {
      const ret = globalShortcut.register(key, callback);
      if (!ret) {
        this.logger.error(`Failed to register global shortcut: ${key}`);
      } else {
        this.logger.info(`Registered global shortcut: ${key}`);
      }
    });

    // Screenshot hotkey will be handled by screenshot plugin
  }

  private registerPluginMethods(): void {
    this.bus.on('overlay:show', () => this.show());
    this.bus.on('overlay:hide', () => this.hide());
    this.bus.on('overlay:toggle', () => this.toggle());
    this.bus.on('overlay:center', () => this.center());
    this.bus.on('overlay:move', (data: { x: number; y: number }) => this.move(data.x, data.y));
    this.bus.on('overlay:resize', (data: { width: number; height: number }) => this.resize(data.width, data.height));
  }

  async show(): Promise<void> {
    if (!this.overlayWindow) return;

    this.overlayWindow.show();
    this.overlayWindow.focus();
    this.isVisible = true;
    this.overlayState.isVisible = true;

    // Persist state
    this.persistState();

    this.logger.info('Overlay window shown');
    this.bus.emit('overlay:visibilityChanged', { visible: true });
  }

  async hide(): Promise<void> {
    if (!this.overlayWindow) return;

    this.overlayWindow.hide();
    this.isVisible = false;
    this.overlayState.isVisible = false;

    // Persist state
    this.persistState();

    this.logger.info('Overlay window hidden');
    this.bus.emit('overlay:visibilityChanged', { visible: false });
  }

  async toggle(): Promise<void> {
    if (this.isVisible) {
      await this.hide();
    } else {
      await this.show();
    }
  }

  async center(): Promise<void> {
    if (!this.overlayWindow) return;
    
    const { width, height } = this.overlayWindow.getBounds();
    const { workArea } = screen.getPrimaryDisplay();
    
    const x = Math.floor((workArea.width - width) / 2);
    const y = Math.floor((workArea.height - height) / 2);
    
    this.overlayWindow.setPosition(x, y);
    
    this.logger.info(`Overlay window centered at (${x}, ${y})`);
    this.bus.emit('overlay:moved', { x, y });
  }

  async move(x: number, y: number): Promise<void> {
    if (!this.overlayWindow) return;

    this.overlayWindow.setPosition(x, y);

    // Update and persist state
    this.overlayState.position = { x, y };
    this.persistState();

    this.logger.info(`Overlay window moved to (${x}, ${y})`);
    this.bus.emit('overlay:moved', { x, y });
  }

  async moveRelative(deltaX: number, deltaY: number): Promise<void> {
    if (!this.overlayWindow) return;
    
    const currentBounds = this.overlayWindow.getBounds();
    const newX = currentBounds.x + deltaX;
    const newY = currentBounds.y + deltaY;
    
    await this.move(newX, newY);
  }

  async resize(width: number, height: number): Promise<void> {
    if (!this.overlayWindow) return;

    this.overlayWindow.setSize(width, height);
    this.config.width = width;
    this.config.height = height;

    // Update and persist state
    this.overlayState.size = { width, height };
    this.persistState();

    this.logger.info(`Overlay window resized to ${width}x${height}`);
    this.bus.emit('overlay:resized', { width, height });
  }

  getPosition(): WindowPosition | null {
    if (!this.overlayWindow) return null;
    
    const bounds = this.overlayWindow.getBounds();
    return { x: bounds.x, y: bounds.y };
  }

  getConfig(): OverlayConfig {
    return { ...this.config };
  }

  async setConfig(config: Partial<OverlayConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    if (this.overlayWindow) {
      this.overlayWindow.setAlwaysOnTop(this.config.alwaysOnTop);
      
      if (config.width || config.height) {
        this.overlayWindow.setSize(this.config.width, this.config.height);
      }
    }
    
    this.logger.info('Overlay configuration updated');
    this.bus.emit('overlay:configChanged', this.config);
  }

  private async quickCapture(): Promise<void> {
    try {
      // Quick capture - show overlay and take screenshot
      if (!this.isVisible) {
        await this.show();
      }

      // Trigger screenshot capture
      const result = await this.bus.send({
        id: Date.now().toString(),
        type: 'request',
        plugin: 'screenshot-plugin',
        method: 'takeScreenshot',
        payload: { type: 'problem', autoHide: false },
        timestamp: Date.now()
      });

      if (result.success) {
        this.logger.info('Quick capture completed successfully');
      } else {
        this.logger.error('Quick capture failed:', result.error);
      }
    } catch (error) {
      this.logger.error('Failed to perform quick capture:', error);
    }
  }

  private handleEscape(): void {
    if (this.isVisible) {
      this.hide();
    }
  }

  private persistState(): void {
    try {
      this.configManager.set('overlayState', this.overlayState);
    } catch (error) {
      this.logger.error('Failed to persist overlay state:', error);
    }
  }

  async destroy(): Promise<void> {
    this.logger.info('Destroying OverlayPlugin');

    // Persist final state
    this.persistState();

    // Unregister all global shortcuts
    globalShortcut.unregisterAll();

    // Destroy overlay window
    if (this.overlayWindow) {
      this.overlayWindow.destroy();
      this.overlayWindow = null;
    }

    // Remove IPC handlers
    ipcMain.removeHandler('overlay:show');
    ipcMain.removeHandler('overlay:hide');
    ipcMain.removeHandler('overlay:toggle');
    ipcMain.removeHandler('overlay:center');
    ipcMain.removeHandler('overlay:move');
    ipcMain.removeHandler('overlay:resize');
    ipcMain.removeHandler('overlay:getPosition');
    ipcMain.removeHandler('overlay:getConfig');
    ipcMain.removeHandler('overlay:setConfig');

    this.logger.info('OverlayPlugin destroyed');
  }
}