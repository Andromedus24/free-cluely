// Logging Package Exports
// =======================

export { LogAggregator } from './LogAggregator';
export { LogAnalyzer } from './LogAnalyzer';
export type {
  LogEntry,
  LogLevel,
  LogQuery,
  LogAggregationConfig,
  LogStats,
  LogExportFormat,
  AnalysisResult,
  PatternMatch,
  AnomalyDetection,
  TrendAnalysis,
  CorrelationAnalysis
} from '../types';

/**
 * Factory Functions
 */

/**
 * Create log aggregator with default configuration
 */
export function createLogAggregator(config?: Partial<import('../types').LogAggregationConfig>): LogAggregator {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().logging;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new LogAggregator(finalConfig);
}

/**
 * Create production log aggregator
 */
export function createProductionLogAggregator(config?: Partial<import('../types').LogAggregationConfig>): LogAggregator {
  const { createProductionObservabilityConfig } = require('../index');
  const defaultConfig = createProductionObservabilityConfig().logging;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new LogAggregator(finalConfig);
}

/**
 * Create development log aggregator
 */
export function createDevelopmentLogAggregator(config?: Partial<import('../types').LogAggregationConfig>): LogAggregator {
  const { createDevelopmentObservabilityConfig } = require('../index');
  const defaultConfig = createDevelopmentObservabilityConfig().logging;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new LogAggregator(finalConfig);
}

/**
 * Create log analyzer with default configuration
 */
export function createLogAnalyzer(config?: Partial<import('./LogAnalyzer').prototype.config>): LogAnalyzer {
  return new LogAnalyzer(config);
}

/**
 * Common log levels
 */
export const LogLevels = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
} as const;

/**
 * Common log sources
 */
export const LogSources = {
  // Application Sources
  APPLICATION: 'application',
  API: 'api',
  WEB: 'web',
  WORKER: 'worker',
  SCHEDULER: 'scheduler',
  BACKGROUND: 'background',

  // Infrastructure Sources
  DATABASE: 'database',
  CACHE: 'cache',
  QUEUE: 'queue',
  FILESYSTEM: 'filesystem',
  NETWORK: 'network',
  SECURITY: 'security',

  // External Sources
  EXTERNAL_API: 'external_api',
  THIRD_PARTY: 'third_party',
  WEBHOOK: 'webhook',
  EMAIL: 'email',
  SMS: 'sms',

  // Monitoring Sources
  MONITORING: 'monitoring',
  METRICS: 'metrics',
  TRACING: 'tracing',
  HEALTH_CHECK: 'health_check',
  AUDIT: 'audit',

  // Development Sources
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  DEBUG: 'debug',
  VERBOSE: 'verbose',

  // User Activity
  USER_ACTION: 'user_action',
  USER_SESSION: 'user_session',
  USER_AUTH: 'user_auth',
  USER_ERROR: 'user_error',

  // System Sources
  SYSTEM: 'system',
  KERNEL: 'kernel',
  PROCESS: 'process',
  MEMORY: 'memory',
  CPU: 'cpu',
  DISK: 'disk'
};

/**
 * Common log patterns
 */
export const LogPatterns = {
  // Error Patterns
  ERROR_TIMEOUT: 'timeout|timed out|connection timeout',
  ERROR_CONNECTION: 'connection.*failed|connection.*refused|connection.*reset',
  ERROR_AUTH: 'authentication.*failed|authorization.*failed|unauthorized|forbidden',
  ERROR_VALIDATION: 'validation.*failed|invalid.*parameter|invalid.*input',
  ERROR_DATABASE: 'database.*error|sql.*error|query.*failed',
  ERROR_MEMORY: 'out.*of.*memory|memory.*exceeded|heap.*overflow',
  ERROR_DISK: 'disk.*full|no.*space|storage.*full',
  ERROR_NETWORK: 'network.*error|socket.*error|dns.*failed',

  // Success Patterns
  SUCCESS_REQUEST: 'request.*completed|operation.*successful|successfully',
  SUCCESS_CONNECTION: 'connection.*established|connected.*successfully',
  SUCCESS_AUTH: 'authentication.*successful|login.*successful',
  SUCCESS_TRANSACTION: 'transaction.*completed|committed.*successfully',

  // Performance Patterns
  PERF_RESPONSE_TIME: 'response.*time|duration|elapsed.*time',
  PERF_THROUGHPUT: 'throughput|requests.*per.*second|rps',
  PERF_MEMORY: 'memory.*usage|heap.*used|memory.*allocated',
  PERF_CPU: 'cpu.*usage|processor.*time|load.*average',

  // Security Patterns
  SECURITY_LOGIN: 'login|logout|authentication|sign.*in|sign.*out',
  SECURITY_AUTH: 'authorization|permission|access.*denied|access.*granted',
  SECURITY_RATE_LIMIT: 'rate.*limit|throttled|too.*many.*requests',
  SECURITY_BLOCKED: 'blocked|suspended|banned|blacklisted',

  // Business Patterns
  BUSINESS_PAYMENT: 'payment|transaction|billing|invoice',
  BUSINESS_USER: 'user.*created|user.*updated|user.*deleted',
  BUSINESS_ORDER: 'order.*created|order.*updated|order.*cancelled',
  BUSINESS_EMAIL: 'email.*sent|email.*delivered|email.*failed',

  // System Patterns
  SYSTEM_STARTUP: 'starting|started|initializing|initialized',
  SYSTEM_SHUTDOWN: 'shutting.*down|stopped|terminated',
  SYSTEM_CONFIG: 'configuration|config.*loaded|settings.*updated',
  SYSTEM_HEALTH: 'health.*check|status|alive|ready'
};

/**
 * Log field names
 */
export const LogFields = {
  // Standard Fields
  TIMESTAMP: 'timestamp',
  LEVEL: 'level',
  MESSAGE: 'message',
  SOURCE: 'source',
  SERVICE: 'service',
  VERSION: 'version',
  ENVIRONMENT: 'environment',

  // Context Fields
  CORRELATION_ID: 'correlation_id',
  TRACE_ID: 'trace_id',
  SPAN_ID: 'span_id',
  USER_ID: 'user_id',
  SESSION_ID: 'session_id',
  REQUEST_ID: 'request_id',

  // Request Fields
  METHOD: 'method',
  PATH: 'path',
  URL: 'url',
  STATUS_CODE: 'status_code',
  USER_AGENT: 'user_agent',
  IP_ADDRESS: 'ip_address',
  REFERRER: 'referrer',

  // Response Fields
  RESPONSE_TIME: 'response_time',
  RESPONSE_SIZE: 'response_size',
  CONTENT_TYPE: 'content_type',

  // Error Fields
  ERROR_TYPE: 'error_type',
  ERROR_MESSAGE: 'error_message',
  ERROR_STACK: 'error_stack',
  ERROR_CODE: 'error_code',

  // Performance Fields
  DURATION: 'duration',
  MEMORY_USED: 'memory_used',
  CPU_USED: 'cpu_used',
  THROUGHPUT: 'throughput',

  // Business Fields
  ACTION: 'action',
  ENTITY_TYPE: 'entity_type',
  ENTITY_ID: 'entity_id',
  BUSINESS_UNIT: 'business_unit',

  // Custom Fields
  CUSTOM_FIELD_PREFIX: 'custom_',
  METADATA: 'metadata'
};

/**
 * Utility Functions
 */

/**
 * Create log entry
 */
export function createLogEntry(
  level: LogLevel,
  message: string,
  source: string,
  config?: Partial<LogEntry>
): LogEntry {
  return {
    level,
    message,
    source,
    timestamp: Date.now(),
    service: undefined,
    correlationId: undefined,
    traceId: undefined,
    metadata: {},
    ...config
  };
}

/**
 * Create error log entry
 */
export function createErrorLogEntry(
  message: string,
  source: string,
  error?: Error,
  config?: Partial<LogEntry>
): LogEntry {
  const logEntry: LogEntry = createLogEntry('error', message, source, config);

  if (error) {
    logEntry.metadata = {
      ...logEntry.metadata,
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack
    };
  }

  return logEntry;
}

/**
 * Create request log entry
 */
export function createRequestLogEntry(
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  source: string,
  config?: Partial<LogEntry>
): LogEntry {
  const logEntry: LogEntry = createLogEntry(
    statusCode >= 400 ? 'error' : 'info',
    `${method} ${path} ${statusCode}`,
    source,
    config
  );

  logEntry.metadata = {
    ...logEntry.metadata,
    method,
    path,
    status_code: statusCode,
    response_time: responseTime
  };

  return logEntry;
}

/**
 * Validate log entry
 */
export function validateLogEntry(entry: LogEntry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entry.level || !Object.values(LogLevel).includes(entry.level)) {
    errors.push('Invalid log level');
  }

  if (!entry.message || typeof entry.message !== 'string') {
    errors.push('Message is required and must be a string');
  }

  if (!entry.source || typeof entry.source !== 'string') {
    errors.push('Source is required and must be a string');
  }

  if (!entry.timestamp || typeof entry.timestamp !== 'number') {
    errors.push('Timestamp is required and must be a number');
  }

  if (entry.metadata && typeof entry.metadata !== 'object') {
    errors.push('Metadata must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize log message
 */
export function sanitizeLogMessage(message: string): string {
  // Remove sensitive information
  let sanitized = message;

  // Remove passwords
  sanitized = sanitized.replace(/password["\s]*[:=]["\s]*[^\s"]+/gi, 'password="[REDACTED]"');
  sanitized = sanitized.replace(/pwd["\s]*[:=]["\s]*[^\s"]+/gi, 'pwd="[REDACTED]"');

  // Remove API keys
  sanitized = sanitized.replace(/api[_-]?key["\s]*[:=]["\s]*[^\s"]+/gi, 'api_key="[REDACTED]"');
  sanitized = sanitized.replace(/apikey["\s]*[:=]["\s]*[^\s"]+/gi, 'apikey="[REDACTED]"');

  // Remove tokens
  sanitized = sanitized.replace(/token["\s]*[:=]["\s]*[^\s"]+/gi, 'token="[REDACTED]"');
  sanitized = sanitized.replace(/bearer["\s]*[:=]["\s]*[^\s"]+/gi, 'bearer="[REDACTED]"');

  // Remove authorization headers
  sanitized = sanitized.replace(/authorization["\s]*[:=]["\s]*[^\s"]+/gi, 'authorization="[REDACTED]"');
  sanitized = sanitized.replace(/auth["\s]*[:=]["\s]*[^\s"]+/gi, 'auth="[REDACTED]"');

  // Remove session IDs
  sanitized = sanitized.replace(/session[_-]?id["\s]*[:=]["\s]*[^\s"]+/gi, 'session_id="[REDACTED]"');

  // Remove credit card numbers (basic pattern)
  sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CREDIT_CARD_REDACTED]');

  // Remove SSN (basic pattern)
  sanitized = sanitized.replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[SSN_REDACTED]');

  // Remove email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');

  // Remove phone numbers (basic pattern)
  sanitized = sanitized.replace(/\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g, '[PHONE_REDACTED]');

  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_REDACTED]');

  return sanitized;
}

/**
 * Format log entry for display
 */
export function formatLogEntry(entry: LogEntry, format: 'text' | 'json' | 'compact' = 'text'): string {
  const date = new Date(entry.timestamp).toISOString();
  const level = entry.level.toUpperCase();
  const source = entry.source;
  const service = entry.service ? `[${entry.service}]` : '';
  const message = entry.message;

  switch (format) {
    case 'text':
      return `${date} [${level}] ${service} ${source}: ${message}`;

    case 'json':
      return JSON.stringify({
        timestamp: date,
        level,
        source,
        service: entry.service,
        message,
        correlation_id: entry.correlationId,
        trace_id: entry.traceId,
        metadata: entry.metadata
      }, null, 2);

    case 'compact':
      return `${date} ${level} ${source} ${message}`;

    default:
      return message;
  }
}

/**
 * Extract log level from string
 */
export function extractLogLevel(message: string): LogLevel | null {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('debug')) return 'debug';
  if (lowerMessage.includes('info')) return 'info';
  if (lowerMessage.includes('warn') || lowerMessage.includes('warning')) return 'warn';
  if (lowerMessage.includes('error') || lowerMessage.includes('err')) return 'error';
  if (lowerMessage.includes('fatal') || lowerMessage.includes('crit')) return 'fatal';

  return null;
}

/**
 * Calculate log severity score
 */
export function calculateLogSeverity(entry: LogEntry): number {
  const severityMap = {
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5
  };

  let score = severityMap[entry.level];

  // Increase score for certain keywords
  const message = entry.message.toLowerCase();
  if (message.includes('critical')) score += 1;
  if (message.includes('urgent')) score += 1;
  if (message.includes('emergency')) score += 2;
  if (message.includes('security')) score += 1;
  if (message.includes('breach')) score += 2;

  return Math.min(10, score);
}

/**
 * Group logs by correlation ID
 */
export function groupLogsByCorrelation(logs: LogEntry[]): Map<string, LogEntry[]> {
  const groups = new Map<string, LogEntry[]>();

  for (const log of logs) {
    const correlationId = log.correlationId || 'uncorrelated';
    if (!groups.has(correlationId)) {
      groups.set(correlationId, []);
    }
    groups.get(correlationId)!.push(log);
  }

  return groups;
}

/**
 * Calculate log statistics
 */
export function calculateLogStats(logs: LogEntry[]): {
  total: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<string, number>;
  byService: Record<string, number>;
  timeRange: { start: number; end: number };
  averageInterval: number;
} {
  const stats = {
    total: logs.length,
    byLevel: { debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
    bySource: {} as Record<string, number>,
    byService: {} as Record<string, number>,
    timeRange: { start: Infinity, end: -Infinity },
    averageInterval: 0
  };

  if (logs.length === 0) {
    stats.timeRange = { start: 0, end: 0 };
    return stats;
  }

  for (const log of logs) {
    stats.byLevel[log.level]++;
    stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1;

    if (log.service) {
      stats.byService[log.service] = (stats.byService[log.service] || 0) + 1;
    }

    if (log.timestamp < stats.timeRange.start) {
      stats.timeRange.start = log.timestamp;
    }
    if (log.timestamp > stats.timeRange.end) {
      stats.timeRange.end = log.timestamp;
    }
  }

  // Calculate average interval between logs
  if (logs.length > 1) {
    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    let totalInterval = 0;
    for (let i = 1; i < sortedLogs.length; i++) {
      totalInterval += sortedLogs[i].timestamp - sortedLogs[i - 1].timestamp;
    }
    stats.averageInterval = totalInterval / (sortedLogs.length - 1);
  }

  return stats;
}

/**
 * Create log correlation ID
 */
export function createCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract structured data from log message
 */
export function extractStructuredData(message: string): Record<string, any> {
  const data: Record<string, any> = {};

  // Extract key-value pairs
  const kvPattern = /(\w+)=([^\s]+)/g;
  let match;

  while ((match = kvPattern.exec(message)) !== null) {
    const [, key, value] = match;
    data[key] = value;
  }

  // Extract JSON objects
  const jsonPattern = /\{[^}]+\}/g;
  const jsonMatches = message.match(jsonPattern);

  if (jsonMatches) {
    for (const jsonMatch of jsonMatches) {
      try {
        const parsed = JSON.parse(jsonMatch);
        Object.assign(data, parsed);
      } catch (error) {
        // Ignore invalid JSON
      }
    }
  }

  return data;
}

/**
 * Compress log message for storage
 */
export function compressLogMessage(message: string): string {
  // Remove extra whitespace
  let compressed = message.replace(/\s+/g, ' ').trim();

  // Remove common prefixes/suffixes
  compressed = compressed.replace(/^((Request|Response|Error|Info|Warning|Debug):\s*)/i, '');

  // Remove timestamps (common formats)
  compressed = compressed.replace(/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})?\s*/, '');

  // Remove IP addresses
  compressed = compressed.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

  // Remove UUIDs
  compressed = compressed.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, '[UUID]');

  // Remove long numbers (potential IDs)
  compressed = compressed.replace(/\b\d{10,}\b/g, '[ID]');

  return compressed;
}