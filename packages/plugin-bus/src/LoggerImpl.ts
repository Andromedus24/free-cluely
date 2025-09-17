import { EventEmitter } from 'events';
import { Logger, LogEntry, createLogEntry } from '@free-cluely/shared';

export class LoggerImpl extends EventEmitter implements Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000; // Maximum number of logs to keep in memory
  private logLevel: LogEntry['level'] = 'info';

  constructor(logLevel: LogEntry['level'] = 'info') {
    super();
    this.logLevel = logLevel;
  }

  debug(message: string, metadata?: Record<string, unknown>, plugin?: string): void {
    this.log('debug', message, metadata, plugin);
  }

  info(message: string, metadata?: Record<string, unknown>, plugin?: string): void {
    this.log('info', message, metadata, plugin);
  }

  warn(message: string, metadata?: Record<string, unknown>, plugin?: string): void {
    this.log('warn', message, metadata, plugin);
  }

  error(message: string, metadata?: Record<string, unknown>, plugin?: string): void {
    this.log('error', message, metadata, plugin);
  }

  private log(level: LogEntry['level'], message: string, metadata?: Record<string, unknown>, plugin?: string): void {
    // Check if we should log this level
    if (!this.shouldLogLevel(level)) {
      return;
    }

    const entry = createLogEntry(level, message, plugin, metadata);
    
    // Add to logs array
    this.logs.push(entry);
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Emit log event
    this.emit('log', entry);
    
    // Also emit level-specific events
    this.emit(`log:${level}`, entry);
    
    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      this.logToConsole(entry);
    }
  }

  getLogs(level?: LogEntry['level'], limit?: number): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }

  onLogEntry(handler: (entry: LogEntry) => void): () => void {
    this.on('log', handler);
    return () => this.off('log', handler);
  }

  // Level-specific listeners
  onDebug(handler: (entry: LogEntry) => void): () => void {
    this.on('log:debug', handler);
    return () => this.off('log:debug', handler);
  }

  onInfo(handler: (entry: LogEntry) => void): () => void {
    this.on('log:info', handler);
    return () => this.off('log:info', handler);
  }

  onWarn(handler: (entry: LogEntry) => void): () => void {
    this.on('log:warn', handler);
    return () => this.off('log:warn', handler);
  }

  onError(handler: (entry: LogEntry) => void): () => void {
    this.on('log:error', handler);
    return () => this.off('log:error', handler);
  }

  // Clear logs
  clearLogs(): void {
    this.logs = [];
    this.emit('logs:cleared');
  }

  // Export logs
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else if (format === 'csv') {
      const headers = ['id', 'level', 'message', 'plugin', 'timestamp', 'metadata'];
      const rows = this.logs.map(log => [
        log.id,
        log.level,
        log.message.replace(/"/g, '""'), // Escape quotes for CSV
        log.plugin || '',
        log.timestamp,
        JSON.stringify(log.metadata || {})
      ]);
      
      return [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  // Filter logs by plugin
  getLogsByPlugin(pluginName: string, level?: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => 
      log.plugin === pluginName && (!level || log.level === level)
    );
  }

  // Filter logs by time range
  getLogsByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.logs.filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  // Get log statistics
  getLogStats(): {
    total: number;
    byLevel: Record<LogEntry['level'], number>;
    byPlugin: Record<string, number>;
    recentErrors: LogEntry[];
  } {
    const byLevel: Record<LogEntry['level'], number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    };
    
    const byPlugin: Record<string, number> = {};
    
    this.logs.forEach(log => {
      byLevel[log.level]++;
      
      if (log.plugin) {
        byPlugin[log.plugin] = (byPlugin[log.plugin] || 0) + 1;
      }
    });
    
    const recentErrors = this.logs
      .filter(log => log.level === 'error')
      .slice(-10);
    
    return {
      total: this.logs.length,
      byLevel,
      byPlugin,
      recentErrors
    };
  }

  // Set log level
  setLogLevel(level: LogEntry['level']): void {
    this.logLevel = level;
    this.emit('logLevel:changed', level);
  }

  // Get current log level
  getLogLevel(): LogEntry['level'] {
    return this.logLevel;
  }

  // Check if we should log this level
  private shouldLogLevel(level: LogEntry['level']): boolean {
    const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error'];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    
    return messageIndex >= currentIndex;
  }

  // Log to console with appropriate styling
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}]${entry.plugin ? `[${entry.plugin}]` : ''}`;
    
    switch (entry.level) {
      case 'debug':
        console.debug(`${prefix} DEBUG: ${entry.message}`, entry.metadata || '');
        break;
      case 'info':
        console.info(`${prefix} INFO: ${entry.message}`, entry.metadata || '');
        break;
      case 'warn':
        console.warn(`${prefix} WARN: ${entry.message}`, entry.metadata || '');
        break;
      case 'error':
        console.error(`${prefix} ERROR: ${entry.message}`, entry.metadata || '');
        break;
    }
  }

  // Search logs
  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      (log.plugin && log.plugin.toLowerCase().includes(lowerQuery)) ||
      (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(lowerQuery))
    );
  }
}