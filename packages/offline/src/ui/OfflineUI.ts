// Offline Mode UI Components
// =========================

import { EventEmitter } from 'events';
import { IOfflineUI, OfflineStatus, OfflineStats, Conflict } from '../types';

/**
 * UI Configuration
 */
export interface OfflineUIConfig {
  enableNotifications: boolean;
  enableToastMessages: boolean;
  enableModalDialogs: boolean;
  enableStatusBar: boolean;
  enableProgressIndicators: boolean;
  enableAnimations: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  duration: number;
  enableKeyboardShortcuts: boolean;
  enableAccessibility: boolean;
  customStyles?: any;
}

/**
 * UI Component Base
 */
export abstract class UIComponent extends EventEmitter {
  protected element: HTMLElement | null = null;
  protected isVisible = false;
  protected config: OfflineUIConfig;

  constructor(config: OfflineUIConfig) {
    super();
    this.config = config;
  }

  abstract render(): void;
  abstract show(): void;
  abstract hide(): void;
  abstract destroy(): void;

  protected createElement(tagName: string, className?: string, attributes?: Record<string, string>): HTMLElement {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
      });
    }
    return element;
  }

  protected addStyles(element: HTMLElement, styles: Record<string, string>): void {
    Object.assign(element.style, styles);
  }

  protected addClasses(element: HTMLElement, ...classes: string[]): void {
    element.classList.add(...classes);
  }

  protected removeClasses(element: HTMLElement, ...classes: string[]): void {
    element.classList.remove(...classes);
  }
}

/**
 * Notification Component
 */
export class NotificationComponent extends UIComponent {
  private message: string = '';
  private type: 'info' | 'warning' | 'error' | 'success' = 'info';
  private timeoutId: number | null = null;

  constructor(config: OfflineUIConfig) {
    super(config);
    this.createNotificationElement();
  }

  private createNotificationElement(): void {
    this.element = this.createElement('div', 'atlas-offline-notification', {
      'role': 'alert',
      'aria-live': 'polite'
    });

    this.addStyles(this.element, {
      position: 'fixed',
      zIndex: '9999',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '400px',
      minWidth: '250px',
      transition: 'all 0.3s ease',
      opacity: '0',
      transform: 'translateY(-10px)',
      pointerEvents: 'none'
    });

    this.applyPosition();
    this.applyTheme();

    // Add close button
    const closeButton = this.createElement('button', 'atlas-notification-close', {
      'aria-label': 'Close notification'
    });
    closeButton.innerHTML = '×';
    this.addStyles(closeButton, {
      position: 'absolute',
      top: '4px',
      right: '8px',
      background: 'none',
      border: 'none',
      fontSize: '18px',
      cursor: 'pointer',
      opacity: '0.7'
    });

    closeButton.addEventListener('click', () => this.hide());
    this.element.appendChild(closeButton);

    document.body.appendChild(this.element);
  }

  private applyPosition(): void {
    if (!this.element) return;

    const positions = {
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' }
    };

    const position = positions[this.config.position];
    this.addStyles(this.element, position);
  }

  private applyTheme(): void {
    if (!this.element) return;

    const themes = {
      light: {
        background: '#ffffff',
        color: '#333333',
        border: '1px solid #e0e0e0'
      },
      dark: {
        background: '#2d3748',
        color: '#ffffff',
        border: '1px solid #4a5568'
      }
    };

    const theme = themes[this.config.theme === 'auto' ? 'light' : this.config.theme];
    this.addStyles(this.element, theme);
  }

  show(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    if (!this.element) return;

    this.message = message;
    this.type = type;

    // Update content
    const content = this.element.querySelector('.atlas-notification-content') as HTMLElement;
    if (!content) {
      const contentElement = this.createElement('div', 'atlas-notification-content');
      contentElement.textContent = message;
      this.element.insertBefore(contentElement, this.element.firstChild);
    } else {
      content.textContent = message;
    }

    // Apply type-specific styling
    this.applyTypeStyling();

    // Show notification
    this.addStyles(this.element, {
      opacity: '1',
      transform: 'translateY(0)',
      pointerEvents: 'auto'
    });

    this.isVisible = true;

    // Auto-hide after duration
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => {
      this.hide();
    }, this.config.duration);

    this.emit('shown', { message, type });
  }

  hide(): void {
    if (!this.element || !this.isVisible) return;

    this.addStyles(this.element, {
      opacity: '0',
      transform: 'translateY(-10px)',
      pointerEvents: 'none'
    });

    setTimeout(() => {
      this.isVisible = false;
      this.emit('hidden');
    }, 300);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private applyTypeStyling(): void {
    if (!this.element) return;

    const colors = {
      info: { background: '#3b82f6', color: '#ffffff' },
      warning: { background: '#f59e0b', color: '#ffffff' },
      error: { background: '#ef4444', color: '#ffffff' },
      success: { background: '#10b981', color: '#ffffff' }
    };

    const color = colors[this.type];
    this.addStyles(this.element, {
      background: color.background,
      color: color.color
    });
  }

  render(): void {
    // Element is created in constructor
  }

  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}

/**
 * Status Bar Component
 */
export class StatusBarComponent extends UIComponent {
  private statusElement: HTMLElement | null = null;
  private syncIcon: HTMLElement | null = null;
  private networkIcon: HTMLElement | null = null;
  private batteryIcon: HTMLElement | null = null;

  constructor(config: OfflineUIConfig) {
    super(config);
    this.createStatusBar();
  }

  private createStatusBar(): void {
    this.element = this.createElement('div', 'atlas-status-bar', {
      'role': 'status',
      'aria-live': 'polite'
    });

    this.addStyles(this.element, {
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      height: '32px',
      background: this.config.theme === 'dark' ? '#1a202c' : '#f7fafc',
      borderTop: `1px solid ${this.config.theme === 'dark' ? '#2d3748' : '#e2e8f0'}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      fontSize: '12px',
      zIndex: '1000',
      transition: 'all 0.3s ease'
    });

    // Create status indicators
    this.createStatusIndicators();

    document.body.appendChild(this.element);
  }

  private createStatusIndicators(): void {
    if (!this.element) return;

    const leftSection = this.createElement('div', 'atlas-status-left');
    const rightSection = this.createElement('div', 'atlas-status-right');

    // Sync status
    const syncContainer = this.createElement('div', 'atlas-sync-status');
    this.syncIcon = this.createElement('span', 'atlas-sync-icon');
    this.syncIcon.innerHTML = '🔄';
    this.statusElement = this.createElement('span', 'atlas-status-text');
    this.statusElement.textContent = 'Online';

    syncContainer.appendChild(this.syncIcon);
    syncContainer.appendChild(this.statusElement);
    leftSection.appendChild(syncContainer);

    // Network status
    const networkContainer = this.createElement('div', 'atlas-network-status');
    this.networkIcon = this.createElement('span', 'atlas-network-icon');
    this.networkIcon.innerHTML = '📶';
    const networkText = this.createElement('span');
    networkText.textContent = 'Good';

    networkContainer.appendChild(this.networkIcon);
    networkContainer.appendChild(networkText);
    rightSection.appendChild(networkContainer);

    // Battery status (if available)
    if ('getBattery' in navigator) {
      const batteryContainer = this.createElement('div', 'atlas-battery-status');
      this.batteryIcon = this.createElement('span', 'atlas-battery-icon');
      this.batteryIcon.innerHTML = '🔋';
      const batteryText = this.createElement('span');
      batteryText.textContent = '100%';

      batteryContainer.appendChild(this.batteryIcon);
      batteryContainer.appendChild(batteryText);
      rightSection.appendChild(batteryContainer);
    }

    this.element.appendChild(leftSection);
    this.element.appendChild(rightSection);
  }

  updateStatus(status: OfflineStatus): void {
    if (!this.statusElement || !this.syncIcon) return;

    if (status.isOffline) {
      this.statusElement.textContent = 'Offline';
      this.syncIcon.innerHTML = '❌';
      this.addStyles(this.element!, {
        background: '#fef2f2',
        borderColor: '#fecaca'
      });
    } else if (status.isSyncing) {
      this.statusElement.textContent = 'Syncing...';
      this.syncIcon.innerHTML = '🔄';
      this.syncIcon.style.animation = 'spin 1s linear infinite';
    } else if (status.hasPendingChanges) {
      this.statusElement.textContent = 'Pending Sync';
      this.syncIcon.innerHTML = '⏳';
      this.syncIcon.style.animation = 'none';
    } else {
      this.statusElement.textContent = 'Online';
      this.syncIcon.innerHTML = '✅';
      this.syncIcon.style.animation = 'none';
      this.addStyles(this.element!, {
        background: this.config.theme === 'dark' ? '#1a202c' : '#f7fafc',
        borderColor: this.config.theme === 'dark' ? '#2d3748' : '#e2e8f0'
      });
    }
  }

  updateNetworkStatus(quality: string): void {
    if (!this.networkIcon) return;

    const icons = {
      excellent: '📶',
      good: '📶',
      poor: '📡',
      offline: '❌'
    };

    this.networkIcon.innerHTML = icons[quality] || icons.offline;
  }

  updateBatteryStatus(level: number, status: string): void {
    if (!this.batteryIcon) return;

    let icon = '🔋';
    if (level < 20) icon = '🪫';
    if (status === 'charging') icon = '🔌';

    this.batteryIcon.innerHTML = icon;
  }

  show(): void {
    if (this.element) {
      this.element.style.display = 'flex';
    }
  }

  hide(): void {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  render(): void {
    // Element is created in constructor
  }

  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

/**
 * Progress Indicator Component
 */
export class ProgressIndicatorComponent extends UIComponent {
  private progress = 0;
  private message = '';
  private progressBar: HTMLElement | null = null;
  private progressText: HTMLElement | null = null;

  constructor(config: OfflineUIConfig) {
    super(config);
    this.createProgressIndicator();
  }

  private createProgressIndicator(): void {
    this.element = this.createElement('div', 'atlas-progress-container', {
      'role': 'progressbar',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '0'
    });

    this.addStyles(this.element, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      height: '3px',
      background: this.config.theme === 'dark' ? '#374151' : '#e5e7eb',
      zIndex: '9999',
      transition: 'opacity 0.3s ease',
      opacity: '0'
    });

    // Progress bar
    this.progressBar = this.createElement('div', 'atlas-progress-bar');
    this.addStyles(this.progressBar, {
      height: '100%',
      background: '#3b82f6',
      width: '0%',
      transition: 'width 0.3s ease',
      borderRadius: '0 3px 3px 0'
    });

    // Progress text
    this.progressText = this.createElement('div', 'atlas-progress-text');
    this.addStyles(this.progressText, {
      position: 'absolute',
      top: '8px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: this.config.theme === 'dark' ? '#1f2937' : '#ffffff',
      color: this.config.theme === 'dark' ? '#ffffff' : '#1f2937',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      whiteSpace: 'nowrap'
    });

    this.element.appendChild(this.progressBar);
    this.element.appendChild(this.progressText);
    document.body.appendChild(this.element);
  }

  show(message: string = 'Syncing...'): void {
    if (!this.element) return;

    this.message = message;
    this.progress = 0;

    this.addStyles(this.element, { opacity: '1' });
    this.updateProgress(0, message);

    this.isVisible = true;
    this.emit('shown');
  }

  hide(): void {
    if (!this.element) return;

    setTimeout(() => {
      this.addStyles(this.element!, { opacity: '0' });
      this.isVisible = false;
      this.emit('hidden');
    }, 300);
  }

  updateProgress(progress: number, message?: string): void {
    if (!this.progressBar || !this.progressText) return;

    this.progress = Math.max(0, Math.min(100, progress));
    if (message) this.message = message;

    this.progressBar.style.width = `${this.progress}%`;
    this.progressText.textContent = `${this.message} ${Math.round(this.progress)}%`;
    this.element!.setAttribute('aria-valuenow', this.progress.toString());
  }

  render(): void {
    // Element is created in constructor
  }

  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

/**
 * Conflict Dialog Component
 */
export class ConflictDialogComponent extends UIComponent {
  private conflict: Conflict | null = null;
  private onResolve: ((strategy: string) => void) | null = null;

  constructor(config: OfflineUIConfig) {
    super(config);
    this.createConflictDialog();
  }

  private createConflictDialog(): void {
    this.element = this.createElement('div', 'atlas-conflict-dialog');
    this.addStyles(this.element, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '10000',
      opacity: '0',
      pointerEvents: 'none'
    });

    const dialog = this.createElement('div', 'atlas-conflict-dialog-content');
    this.addStyles(dialog, {
      background: this.config.theme === 'dark' ? '#1f2937' : '#ffffff',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '600px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      transform: 'scale(0.9)',
      transition: 'all 0.3s ease'
    });

    // Header
    const header = this.createElement('div', 'atlas-conflict-header');
    const title = this.createElement('h2');
    title.textContent = 'Conflict Detected';
    this.addStyles(title, {
      margin: '0 0 16px 0',
      fontSize: '20px',
      fontWeight: '600',
      color: this.config.theme === 'dark' ? '#ffffff' : '#1f2937'
    });
    header.appendChild(title);

    // Content
    const content = this.createElement('div', 'atlas-conflict-content');
    this.addStyles(content, {
      marginBottom: '24px'
    });

    // Options
    const options = this.createElement('div', 'atlas-conflict-options');
    this.addStyles(options, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    });

    dialog.appendChild(header);
    dialog.appendChild(content);
    dialog.appendChild(options);
    this.element.appendChild(dialog);

    document.body.appendChild(this.element);
  }

  showConflict(conflict: Conflict, onResolve: (strategy: string) => void): void {
    if (!this.element) return;

    this.conflict = conflict;
    this.onResolve = onResolve;

    this.updateDialogContent();
    this.updateDialogOptions();

    // Show dialog
    this.addStyles(this.element, {
      opacity: '1',
      pointerEvents: 'auto'
    });

    const content = this.element.querySelector('.atlas-conflict-dialog-content');
    if (content) {
      this.addStyles(content, {
        transform: 'scale(1)'
      });
    }

    this.isVisible = true;
    this.emit('shown', { conflict });
  }

  hide(): void {
    if (!this.element || !this.isVisible) return;

    this.addStyles(this.element, {
      opacity: '0',
      pointerEvents: 'none'
    });

    const content = this.element.querySelector('.atlas-conflict-dialog-content');
    if (content) {
      this.addStyles(content, {
        transform: 'scale(0.9)'
      });
    }

    setTimeout(() => {
      this.isVisible = false;
      this.conflict = null;
      this.onResolve = null;
      this.emit('hidden');
    }, 300);
  }

  private updateDialogContent(): void {
    if (!this.conflict || !this.element) return;

    const content = this.element.querySelector('.atlas-conflict-content');
    if (!content) return;

    content.innerHTML = '';

    const description = this.createElement('p');
    description.textContent = this.conflict.description;
    this.addStyles(description, {
      margin: '0 0 16px 0',
      fontSize: '14px',
      lineHeight: '1.5',
      color: this.config.theme === 'dark' ? '#d1d5db' : '#4b5563'
    });

    const severity = this.createElement('div');
    severity.textContent = `Severity: ${this.conflict.severity.toUpperCase()}`;
    this.addStyles(severity, {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      marginBottom: '16px',
      background: this.getSeverityColor(this.conflict.severity),
      color: '#ffffff'
    });

    content.appendChild(description);
    content.appendChild(severity);
  }

  private updateDialogOptions(): void {
    if (!this.conflict || !this.element) return;

    const options = this.element.querySelector('.atlas-conflict-options');
    if (!options) return;

    options.innerHTML = '';

    this.conflict.suggestions.forEach(suggestion => {
      const button = this.createElement('button');
      button.textContent = suggestion.description;
      this.addStyles(button, {
        padding: '12px 16px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        background: this.config.theme === 'dark' ? '#374151' : '#f3f4f6',
        color: this.config.theme === 'dark' ? '#ffffff' : '#1f2937',
        transition: 'all 0.2s ease'
      });

      button.addEventListener('mouseenter', () => {
        this.addStyles(button, {
          background: this.config.theme === 'dark' ? '#4b5563' : '#e5e7eb'
        });
      });

      button.addEventListener('mouseleave', () => {
        this.addStyles(button, {
          background: this.config.theme === 'dark' ? '#374151' : '#f3f4f6'
        });
      });

      button.addEventListener('click', () => {
        if (this.onResolve) {
          this.onResolve(suggestion.strategy);
        }
        this.hide();
      });

      options.appendChild(button);
    });
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };
    return colors[severity] || colors.medium;
  }

  render(): void {
    // Element is created in constructor
  }

  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}

/**
 * Main Offline UI Implementation
 */
export class OfflineUI extends EventEmitter implements IOfflineUI {
  private config: OfflineUIConfig;
  private notification: NotificationComponent;
  private statusBar: StatusBarComponent;
  private progressIndicator: ProgressIndicatorComponent;
  private conflictDialog: ConflictDialogComponent;
  private isInitialized = false;

  constructor(config: OfflineUIConfig) {
    super();
    this.config = {
      enableNotifications: true,
      enableToastMessages: true,
      enableModalDialogs: true,
      enableStatusBar: true,
      enableProgressIndicators: true,
      enableAnimations: true,
      theme: 'auto',
      language: 'en',
      position: 'top-right',
      duration: 5000,
      enableKeyboardShortcuts: true,
      enableAccessibility: true,
      ...config
    };

    this.notification = new NotificationComponent(this.config);
    this.statusBar = new StatusBarComponent(this.config);
    this.progressIndicator = new ProgressIndicatorComponent(this.config);
    this.conflictDialog = new ConflictDialogComponent(this.config);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Keyboard shortcuts
    if (this.config.enableKeyboardShortcuts) {
      document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // System theme changes
    if (this.config.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => this.updateTheme());
    }

    // Network status changes
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl/Cmd + S to force sync
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.emit('manualSync');
    }

    // Escape to close dialogs
    if (event.key === 'Escape' && this.conflictDialog.isVisible) {
      this.conflictDialog.hide();
    }
  }

  private handleOnline(): void {
    this.showNotification('You are back online', 'success');
    this.statusBar.updateStatus({
      isOnline: true,
      isOffline: false,
      isSyncing: false,
      hasPendingChanges: false,
      hasConflicts: false,
      lastSyncTime: null,
      nextSyncTime: null,
      connectionQuality: 'excellent',
      batteryStatus: 'discharging',
      storageStatus: 'normal',
      syncHealth: 'healthy'
    });
  }

  private handleOffline(): void {
    this.showNotification('You are offline. Some features may be limited.', 'warning');
    this.statusBar.updateStatus({
      isOnline: false,
      isOffline: true,
      isSyncing: false,
      hasPendingChanges: false,
      hasConflicts: false,
      lastSyncTime: null,
      nextSyncTime: null,
      connectionQuality: 'offline',
      batteryStatus: 'discharging',
      storageStatus: 'normal',
      syncHealth: 'healthy'
    });
  }

  private updateTheme(): void {
    const isDark = this.config.theme === 'dark' ||
                   (this.config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  private showNotification(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    if (this.config.enableNotifications) {
      this.notification.show(message, type);
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Add CSS animations
      this.addGlobalStyles();

      // Initialize theme
      this.updateTheme();

      // Show status bar if enabled
      if (this.config.enableStatusBar) {
        this.statusBar.show();
      }

      this.isInitialized = true;
      this.emit('initialized');

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private addGlobalStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .atlas-offline-notification:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }

      .atlas-conflict-dialog:focus-within {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  async showOfflineNotification(): Promise<void> {
    this.showNotification('You are currently offline. Working in offline mode.', 'warning');
  }

  async showOnlineNotification(): Promise<void> {
    this.showNotification('You are back online!', 'success');
  }

  async showSyncProgress(): Promise<void> {
    if (this.config.enableProgressIndicators) {
      this.progressIndicator.show('Syncing...');
    }
  }

  async hideSyncProgress(): Promise<void> {
    if (this.config.enableProgressIndicators) {
      this.progressIndicator.hide();
    }
  }

  async showSyncError(error: Error): Promise<void> {
    this.showNotification(`Sync failed: ${error.message}`, 'error');
  }

  async showConflictDialog(conflict: Conflict): Promise<void> {
    if (this.config.enableModalDialogs) {
      this.conflictDialog.showConflict(conflict, (strategy) => {
        this.emit('conflictResolved', { conflictId: conflict.id, strategy });
      });
    }
  }

  async hideConflictDialog(): Promise<void> {
    this.conflictDialog.hide();
  }

  async showOperationError(operation: any, error: Error): Promise<void> {
    this.showNotification(`Operation failed: ${error.message}`, 'error');
  }

  async showStorageError(error: Error): Promise<void> {
    this.showNotification(`Storage error: ${error.message}`, 'error');
  }

  async showStorageFullWarning(): Promise<void> {
    this.showNotification('Storage is almost full. Some data may not be saved.', 'warning');
  }

  async showOfflineError(): Promise<void> {
    this.showNotification('This feature requires an internet connection.', 'error');
  }

  async showOfflineModeEnabled(): Promise<void> {
    this.showNotification('Offline mode enabled', 'info');
  }

  async showOfflineModeDisabled(): Promise<void> {
    this.showNotification('Offline mode disabled', 'info');
  }

  async updatePendingOperations(count: number): Promise<void> {
    this.statusBar.updateStatus({
      isOnline: navigator.onLine,
      isOffline: !navigator.onLine,
      isSyncing: false,
      hasPendingChanges: count > 0,
      hasConflicts: false,
      lastSyncTime: null,
      nextSyncTime: null,
      connectionQuality: navigator.onLine ? 'good' : 'offline',
      batteryStatus: 'discharging',
      storageStatus: 'normal',
      syncHealth: 'healthy'
    });
  }

  async updateSyncStatus(status: OfflineStatus): Promise<void> {
    this.statusBar.updateStatus(status);
    this.statusBar.updateNetworkStatus(status.connectionQuality);
  }

  async updateStats(stats: any): Promise<void> {
    // Update status bar with stats if needed
    if (stats.batteryLevel !== undefined) {
      this.statusBar.updateBatteryStatus(stats.batteryLevel, 'discharging');
    }
  }

  async destroy(): Promise<void> {
    this.notification.destroy();
    this.statusBar.destroy();
    this.progressIndicator.destroy();
    this.conflictDialog.destroy();
    this.isInitialized = false;
    this.emit('destroyed');
  }

  public isInitializedCheck(): boolean {
    return this.isInitialized;
  }
}