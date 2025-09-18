/**
 * Production-Ready Logging System for Atlas
 * Replaces all console statements with structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxEntries: number;
  remoteEndpoint?: string;
  categories: {
    include: string[];
    exclude: string[];
  };
}

class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private storageKey = 'atlas-logs';

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      maxEntries: 1000,
      categories: {
        include: ['*'],
        exclude: []
      },
      ...config
    };

    this.loadFromStorage();
  }

  private shouldLog(category: string, level: LogLevel): boolean {
    // Check level
    if (level < this.config.level) return false;

    // Check category filters
    const { include, exclude } = this.config.categories;

    if (exclude.includes(category)) return false;
    if (include.includes('*') || include.includes(category)) return true;

    return false;
  }

  private createEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stack: error?.stack,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId()
    };
  }

  private logEntry(entry: LogEntry): void {
    if (!this.shouldLog(entry.category, entry.level)) return;

    // Store in memory
    this.entries.push(entry);

    // Trim to max entries
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Local storage
    if (this.config.enableStorage) {
      this.saveToStorage();
    }

    // Remote logging
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(entry).catch(err => {
        // Don't use logger here to avoid infinite recursion
        console.error('Failed to send log to remote:', err);
      });
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${entry.category.toUpperCase()}]`;

    const message = entry.data
      ? `${prefix} ${entry.message} ${entry.data}`
      : `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data || '');
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      // Silently fail to avoid disrupting the application
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const recentEntries = this.entries.slice(-100); // Save only recent entries
      localStorage.setItem(this.storageKey, JSON.stringify(recentEntries));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private loadFromStorage(): void {
    // Skip localStorage in Node.js environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const entries = JSON.parse(stored);
          this.entries = entries.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }));
        }
      } catch (error) {
        console.warn('Failed to load logs from storage:', error);
      }
    }
  }

  private getCurrentUserId(): string | undefined {
    // Skip localStorage in Node.js environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const userStr = localStorage.getItem('atlas-user');
        return userStr ? JSON.parse(userStr).id : undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private getCurrentSessionId(): string | undefined {
    // Skip localStorage in Node.js environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem('atlas-session-id') || undefined;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  // Public API
  debug(category: string, message: string, data?: Record<string, unknown>): void {
    this.logEntry(this.createEntry(LogLevel.DEBUG, category, message, data));
  }

  info(category: string, message: string, data?: Record<string, unknown>): void {
    this.logEntry(this.createEntry(LogLevel.INFO, category, message, data));
  }

  warn(category: string, message: string, data?: Record<string, unknown>): void {
    this.logEntry(this.createEntry(LogLevel.WARN, category, message, data));
  }

  error(category: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.logEntry(this.createEntry(LogLevel.ERROR, category, message, data, error));
  }

  // Query methods
  getEntries(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filtered = this.entries;

    if (level !== undefined) {
      filtered = filtered.filter(entry => entry.level >= level);
    }

    if (category) {
      filtered = filtered.filter(entry => entry.category === category);
    }

    if (limit) {
      filtered = filtered.slice(-limit);
    }

    return filtered;
  }

  getErrors(limit?: number): LogEntry[] {
    return this.getEntries(LogLevel.ERROR, undefined, limit);
  }

  getStats(): {
    total: number;
    debug: number;
    info: number;
    warn: number;
    error: number;
    categories: Record<string, number>;
  } {
    const stats = {
      total: this.entries.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      categories: {} as Record<string, number>
    };

    this.entries.forEach(entry => {
      switch (entry.level) {
        case LogLevel.DEBUG:
          stats.debug++;
          break;
        case LogLevel.INFO:
          stats.info++;
          break;
        case LogLevel.WARN:
          stats.warn++;
          break;
        case LogLevel.ERROR:
          stats.error++;
          break;
      }

      stats.categories[entry.category] = (stats.categories[entry.category] || 0) + 1;
    });

    return stats;
  }

  clear(): void {
    this.entries = [];
    localStorage.removeItem(this.storageKey);
  }

  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  exportLogs(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  importLogs(logsJson: string): void {
    try {
      const entries = JSON.parse(logsJson);
      this.entries = entries.map((entry: any) => ({
        ...entry,
        timestamp: new Date(entry.timestamp)
      }));
      this.saveToStorage();
    } catch (error) {
      this.error('logger', 'Failed to import logs', error as Error);
    }
  }
}

// Create default instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.WARN : LogLevel.DEBUG,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxEntries: 1000,
  categories: {
    include: ['*'],
    exclude: []
  }
});

// Export for easy import
export default Logger;