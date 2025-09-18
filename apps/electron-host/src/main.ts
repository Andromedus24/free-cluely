import { app, BrowserWindow, ipcMain, Menu, globalShortcut, Tray, dialog } from 'electron';
import * as path from 'path';
import { configManager } from '@free-cluely/config';
import { permissionManager } from '@free-cluely/permissions';
import { createPluginBus, createLogger, createConfigManager } from '@free-cluely/plugin-bus';
import { OverlayPlugin } from '@free-cluely/overlay-plugin';
import { ScreenshotPlugin } from '@free-cluely/screenshot-plugin';

// Global references
let mainWindow: BrowserWindow;
let tray: Tray;
let isQuitting = false;

// Plugin instances
let overlayPlugin: OverlayPlugin;
let screenshotPlugin: ScreenshotPlugin;

// Initialize services
const logger = createLogger('info');
const config = createConfigManager();
const pluginBus = createPluginBus(config, logger, permissionManager);

// Dashboard URL configuration
const DASHBOARD_PORT = configManager.getDashboardConfig().port;
const DASHBOARD_URL = configManager.isDevelopment() 
  ? `http://localhost:${DASHBOARD_PORT}` 
  : `file://${path.join(__dirname, '../dashboard/out/index.html')}`;

// Create main application window
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    transparent: true,
    frame: false,
    vibrancy: "fullscreen-ui",
    visualEffectState: "active",
    backgroundColor: "#00000000",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    titleBarStyle: 'default'
  });

  // Load the dashboard
  if (configManager.isDevelopment() && configManager.getDashboardConfig().enabled) {
    mainWindow.loadURL(DASHBOARD_URL);
  } else {
    // Load the built dashboard or fallback to simple UI
    try {
      mainWindow.loadFile(path.join(__dirname, '../dashboard/out/index.html'));
    } catch (error) {
      // Fallback to simple HTML if dashboard not available
      mainWindow.loadFile(path.join(__dirname, 'fallback.html'));
    }
  }

  // Set up permission manager with main window
  permissionManager.setMainWindow(mainWindow);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (configManager.isDevelopment()) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      if (process.platform !== 'darwin') {
        app.quit();
      }
    }
  });

  // Set up application menu
  setupAppMenu();
  
  // Set up global shortcuts
  setupGlobalShortcuts();
}

// Create system tray
function createTray(): void {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Atlas',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Hide Atlas',
      click: () => {
        mainWindow.hide();
      }
    },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        if (configManager.getDashboardConfig().enabled) {
          // Open dashboard in default browser
          require('electron').shell.openExternal(DASHBOARD_URL);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Atlas: All in one assistant');
  
  // Show window on tray icon click
  tray.on('click', () => {
    mainWindow.show();
  });
}

// Set up application menu
function setupAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Screenshot',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('screenshot:capture');
          }
        },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('settings:open');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', accelerator: 'CmdOrCtrl+Z' },
        { role: 'redo', accelerator: 'Shift+CmdOrCtrl+Z' },
        { type: 'separator' },
        { role: 'cut', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', accelerator: 'CmdOrCtrl+V' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forcereload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggledevtools', accelerator: 'F12' },
        { type: 'separator' },
        { role: 'resetzoom', accelerator: 'CmdOrCtrl+0' },
        { role: 'zoomin', accelerator: 'CmdOrCtrl+Plus' },
        { role: 'zoomout', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => {
            require('electron').shell.openExternal('https://docs.atlas-assistant.com');
          }
        },
        {
          label: 'Report Issue',
          click: () => {
            require('electron').shell.openExternal('https://github.com/Andromedus24/free-cluely/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'About Atlas',
          click: () => {
            require('electron').dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Atlas',
              message: 'Atlas: All in one assistant',
              detail: `Version: ${app.getVersion()}\nAll-in-one personal assistant`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Set up global shortcuts
function setupGlobalShortcuts(): void {
  // Screenshot shortcut
  globalShortcut.register('CmdOrCtrl+Shift+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('screenshot:capture');
    }
  });

  // Toggle window visibility
  globalShortcut.register('CmdOrCtrl+Shift+F', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });

  // Quick actions menu
  globalShortcut.register('CmdOrCtrl+Shift+A', () => {
    if (mainWindow) {
      mainWindow.webContents.send('quick-actions:show');
    }
  });
}

// Set up IPC handlers
function setupIPCHandlers(): void {
  // App info
  ipcMain.handle('app:get-info', () => ({
    version: app.getVersion(),
    name: app.getName(),
    isDevelopment: configManager.isDevelopment(),
    isProduction: configManager.isProduction()
  }));

  // Configuration
  ipcMain.handle('config:get', () => configManager.getAppConfig());
  ipcMain.handle('config:update', (_event, updates) => {
    configManager.updateConfig(updates);
  });
  ipcMain.handle('config:validate', () => configManager.validate());

  // Permissions
  ipcMain.handle('permission:get', () => permissionManager.getPermissions());
  ipcMain.handle('permission:has', (_event, permission) => permissionManager.hasPermission(permission));
  ipcMain.handle('permission:request', (_event, permission) => permissionManager.requestPermission(permission));
  ipcMain.handle('permission:set', (_event, permission, granted) => {
    permissionManager.setPermission(permission, granted);
  });
  ipcMain.handle('permission:summary', () => permissionManager.getPermissionSummary());

  // Plugin management
  ipcMain.handle('plugin:list', () => pluginBus.getPlugins());
  ipcMain.handle('plugin:start', (_event, pluginName) => pluginBus.startPlugin(pluginName));
  ipcMain.handle('plugin:stop', (_event, pluginName) => pluginBus.stopPlugin(pluginName));
  ipcMain.handle('plugin:register', (_event, manifest) => pluginBus.register(manifest));
  ipcMain.handle('plugin:unregister', (_event, pluginName) => pluginBus.unregister(pluginName));

  // Screenshot capture
  ipcMain.handle('screenshot:capture', async () => {
    try {
      const screenshot = require('screenshot-desktop');
      const imageBuffer = await screenshot();
      return imageBuffer.toString('base64');
    } catch (error) {
      logger.error(`Screenshot capture failed: ${error}`);
      throw error;
    }
  });

  // Window management
  ipcMain.handle('window:show', () => mainWindow.show());
  ipcMain.handle('window:hide', () => mainWindow.hide());
  ipcMain.handle('window:minimize', () => mainWindow.minimize());
  ipcMain.handle('window:maximize', () => mainWindow.maximize());
  ipcMain.handle('window:close', () => mainWindow.close());

  // Dashboard control
  ipcMain.handle('dashboard:open', () => {
    if (configManager.getDashboardConfig().enabled) {
      require('electron').shell.openExternal(DASHBOARD_URL);
    }
  });

  // Handle renderer permission responses
  ipcMain.on('permission-response', (_event, requestId: string, granted: boolean) => {
    // Forward to permission manager
    mainWindow.webContents.send('permission-response', requestId, granted);
  });

  // Log messages from renderer
  ipcMain.on('log:message', (_event, level: string, message: string, metadata?: any) => {
    logger[level as keyof typeof logger](message, metadata);
  });
}

// Initialize plugins
async function initializePlugins(): Promise<void> {
  try {
    logger.info('Initializing plugins...');
    
    // Create and initialize overlay plugin
    overlayPlugin = new OverlayPlugin();
    await pluginBus.registerPlugin(overlayPlugin);
    
    // Create and initialize screenshot plugin
    screenshotPlugin = new ScreenshotPlugin();
    await pluginBus.registerPlugin(screenshotPlugin);
    
    logger.info('All plugins initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize plugins:', error);
    throw error;
  }
}

// App lifecycle handlers
app.whenReady().then(async () => {
  try {
    createMainWindow();
    createTray();
    setupIPCHandlers();
    
    // Initialize plugins after window is ready
    await initializePlugins();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  } catch (error) {
    logger.error('Application startup failed:', error);
    
    // Show error dialog
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Startup Error',
      message: 'Failed to initialize application',
      detail: error.message
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  
  try {
    logger.info('Shutting down plugins...');
    
    // Destroy plugins
    if (overlayPlugin) {
      await overlayPlugin.destroy();
    }
    if (screenshotPlugin) {
      await screenshotPlugin.destroy();
    }
    
    // Clean up global shortcuts
    globalShortcut.unregisterAll();
    
    // Clean up services
    logger.info('Application shutting down');
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
});

app.on('will-quit', () => {
  // Final cleanup
  pluginBus.destroy();
  config.destroy();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  
  // Show error dialog
  if (mainWindow) {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Application Error',
      message: 'An unexpected error occurred',
      detail: error.message
    });
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});