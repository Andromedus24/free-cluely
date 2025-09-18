// Tracing Package Exports
// =======================

export { DistributedTracer } from './DistributedTracer';
export {
  TraceMiddleware,
  createTraceMiddleware,
  traceable,
  traceAsync,
  traceSync,
  TraceMiddlewareOptions
} from './TraceMiddleware';

/**
 * Factory Functions
 */

/**
 * Create distributed tracer with default configuration
 */
export function createDistributedTracer(config?: Partial<import('../types').TracingConfig>): DistributedTracer {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().tracing;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new DistributedTracer(finalConfig);
}

/**
 * Create production distributed tracer
 */
export function createProductionDistributedTracer(config?: Partial<import('../types').TracingConfig>): DistributedTracer {
  const { createProductionObservabilityConfig } = require('../index');
  const defaultConfig = createProductionObservabilityConfig().tracing;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new DistributedTracer(finalConfig);
}

/**
 * Create development distributed tracer
 */
export function createDevelopmentDistributedTracer(config?: Partial<import('../types').TracingConfig>): DistributedTracer {
  const { createDevelopmentObservabilityConfig } = require('../index');
  const defaultConfig = createDevelopmentObservabilityConfig().tracing;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new DistributedTracer(finalConfig);
}

/**
 * Utility Functions
 */

/**
 * Extract trace context from various sources
 */
export function extractTraceContext(source: any): import('../types').TraceContext | null {
  // Try different extraction methods
  const extractors = [
    extractFromHeaders,
    extractFromQueryString,
    extractFromCookies,
    extractFromEvent
  ];

  for (const extractor of extractors) {
    const context = extractor(source);
    if (context) {
      return context;
    }
  }

  return null;
}

/**
 * Extract trace context from HTTP headers
 */
function extractFromHeaders(source: any): import('../types').TraceContext | null {
  if (!source.headers) return null;

  const tracer = createDistributedTracer();
  return tracer.extractContext(source.headers);
}

/**
 * Extract trace context from query string
 */
function extractFromQueryString(source: any): import('../types').TraceContext | null {
  if (!source.query) return null;

  const traceId = source.query.trace_id || source.query.traceId;
  const spanId = source.query.span_id || source.query.spanId;

  if (!traceId || !spanId) return null;

  return {
    traceId,
    spanId,
    operation: 'extracted',
    startTime: Date.now(),
    status: 'pending',
    tags: {},
    metadata: {}
  };
}

/**
 * Extract trace context from cookies
 */
function extractFromCookies(source: any): import('../types').TraceContext | null {
  if (!source.cookies) return null;

  const traceId = source.cookies.trace_id;
  const spanId = source.cookies.span_id;

  if (!traceId || !spanId) return null;

  return {
    traceId,
    spanId,
    operation: 'extracted',
    startTime: Date.now(),
    status: 'pending',
    tags: {},
    metadata: {}
  };
}

/**
 * Extract trace context from event (e.g., Lambda, SNS)
 */
function extractFromEvent(source: any): import('../types').TraceContext | null {
  // AWS Lambda
  if (source.requestContext && source.requestContext.traceId) {
    return {
      traceId: source.requestContext.traceId,
      spanId: source.requestContext.requestId || 'unknown',
      operation: 'lambda',
      startTime: Date.now(),
      status: 'pending',
      tags: {},
      metadata: {}
    };
  }

  // AWS SNS
  if (source.Records && source.Records[0]?.Sns) {
    const message = JSON.parse(source.Records[0].Sns.Message);
    if (message.traceId) {
      return {
        traceId: message.traceId,
        spanId: message.spanId || source.Records[0].Sns.MessageId,
        operation: 'sns',
        startTime: Date.now(),
        status: 'pending',
        tags: {},
        metadata: {}
      };
    }
  }

  return null;
}

/**
 * Common trace operations
 */
export const TraceOperations = {
  // HTTP Operations
  HTTP_GET: 'HTTP GET',
  HTTP_POST: 'HTTP POST',
  HTTP_PUT: 'HTTP PUT',
  HTTP_DELETE: 'HTTP DELETE',
  HTTP_PATCH: 'HTTP PATCH',
  HTTP_HEAD: 'HTTP HEAD',
  HTTP_OPTIONS: 'HTTP OPTIONS',

  // Database Operations
  DB_QUERY: 'Database Query',
  DB_INSERT: 'Database Insert',
  DB_UPDATE: 'Database Update',
  DB_DELETE: 'Database Delete',
  DB_TRANSACTION: 'Database Transaction',
  DB_CONNECTION: 'Database Connection',

  // External Service Operations
  EXTERNAL_HTTP: 'External HTTP',
  EXTERNAL_API: 'External API',
  EXTERNAL_WEBHOOK: 'External Webhook',
  EXTERNAL_QUEUE: 'External Queue',

  // Internal Operations
  INTERNAL_PROCESS: 'Internal Process',
  INTERNAL_JOB: 'Internal Job',
  INTERNAL_TASK: 'Internal Task',
  INTERNAL_EVENT: 'Internal Event',

  // WebSocket Operations
  WS_CONNECT: 'WebSocket Connect',
  WS_DISCONNECT: 'WebSocket Disconnect',
  WS_MESSAGE: 'WebSocket Message',
  WS_ERROR: 'WebSocket Error',

  // GraphQL Operations
  GQL_QUERY: 'GraphQL Query',
  GQL_MUTATION: 'GraphQL Mutation',
  GQL_SUBSCRIPTION: 'GraphQL Subscription',

  // File Operations
  FILE_READ: 'File Read',
  FILE_WRITE: 'File Write',
  FILE_DELETE: 'File Delete',
  FILE_UPLOAD: 'File Upload',
  FILE_DOWNLOAD: 'File Download',

  // Cache Operations
  CACHE_GET: 'Cache Get',
  CACHE_SET: 'Cache Set',
  CACHE_DELETE: 'Cache Delete',
  CACHE_CLEAR: 'Cache Clear',

  // Auth Operations
  AUTH_LOGIN: 'Auth Login',
  AUTH_LOGOUT: 'Auth Logout',
  AUTH_REFRESH: 'Auth Refresh',
  AUTH_VALIDATE: 'Auth Validate',

  // Business Logic Operations
  BUSINESS_PROCESS: 'Business Process',
  BUSINESS_CALCULATION: 'Business Calculation',
  BUSINESS_VALIDATION: 'Business Validation',
  BUSINESS_NOTIFICATION: 'Business Notification'
};

/**
 * Common trace tags
 */
export const TraceTags = {
  // HTTP Tags
  HTTP_METHOD: 'http.method',
  HTTP_PATH: 'http.path',
  HTTP_HOST: 'http.host',
  HTTP_SCHEME: 'http.scheme',
  HTTP_STATUS_CODE: 'http.status_code',
  HTTP_USER_AGENT: 'http.user_agent',
  HTTP_CLIENT_IP: 'http.client_ip',
  HTTP_REQUEST_SIZE: 'http.request_size',
  HTTP_RESPONSE_SIZE: 'http.response_size',
  HTTP_RESPONSE_TYPE: 'http.response_type',

  // Database Tags
  DB_OPERATION: 'db.operation',
  DB_STATEMENT: 'db.statement',
  DB_TABLE: 'db.table',
  DB_ROWS_AFFECTED: 'db.rows_affected',
  DB_CONNECTION_ID: 'db.connection_id',
  DB_DATABASE: 'db.database',
  DB_USER: 'db.user',

  // External Service Tags
  EXTERNAL_SERVICE: 'external.service',
  EXTERNAL_METHOD: 'external.method',
  EXTERNAL_URL: 'external.url',
  EXTERNAL_STATUS: 'external.status',
  EXTERNAL_RESPONSE_TIME: 'external.response_time',

  // Error Tags
  ERROR: 'error',
  ERROR_TYPE: 'error.type',
  ERROR_MESSAGE: 'error.message',
  ERROR_STACK: 'error.stack',

  // Performance Tags
  DURATION_MS: 'duration_ms',
  MEMORY_USED: 'memory_used',
  CPU_USED: 'cpu_used',
  THROUGHPUT: 'throughput',

  // Business Tags
  USER_ID: 'user.id',
  USER_TYPE: 'user.type',
  TENANT_ID: 'tenant.id',
  SESSION_ID: 'session.id',
  REQUEST_ID: 'request.id',

  // System Tags
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',
  HOST_NAME: 'host.name',
  POD_NAME: 'pod.name',
  CONTAINER_ID: 'container.id',

  // Custom Tags
  CUSTOM_OPERATION: 'custom.operation',
  CUSTOM_COMPONENT: 'custom.component',
  CUSTOM_ACTION: 'custom.action'
};

/**
 * Sampling strategies
 */
export const SamplingStrategies = {
  /**
   * Always sample (100%)
   */
  ALWAYS: () => true,

  /**
   * Never sample (0%)
   */
  NEVER: () => false,

  /**
   * Sample based on rate (0-1)
   */
  RATE_BASED: (rate: number) => () => Math.random() < rate,

  /**
   * Sample based on operation
   */
  OPERATION_BASED: (operations: string[], rate: number) => (operation: string) =>
    operations.includes(operation) ? Math.random() < rate : false,

  /**
   * Sample based on tags
   */
  TAG_BASED: (tags: Record<string, string>, rate: number) => (spanTags: Record<string, any>) => {
    for (const [key, value] of Object.entries(tags)) {
      if (spanTags[key] === value) {
        return Math.random() < rate;
      }
    }
    return false;
  },

  /**
   * Sample based on error status
   */
  ERROR_BASED: (rate: number) => (status: string) =>
    status === 'error' ? Math.random() < rate : false
};

/**
 * Trace context validation
 */
export function validateTraceContext(context: import('../types').TraceContext): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!context.traceId || typeof context.traceId !== 'string') {
    errors.push('traceId is required and must be a string');
  }

  if (!context.spanId || typeof context.spanId !== 'string') {
    errors.push('spanId is required and must be a string');
  }

  if (!context.operation || typeof context.operation !== 'string') {
    errors.push('operation is required and must be a string');
  }

  if (!context.startTime || typeof context.startTime !== 'number') {
    errors.push('startTime is required and must be a number');
  }

  if (!context.status || !['pending', 'success', 'error', 'cancelled'].includes(context.status)) {
    errors.push('status is required and must be one of: pending, success, error, cancelled');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate trace statistics
 */
export function generateTraceStats(traces: import('../types').TraceContext[]): {
  totalTraces: number;
  averageDuration: number;
  errorRate: number;
  topOperations: Array<{ operation: string; count: number }>;
  durationDistribution: Array<{ range: string; count: number }>;
} {
  if (traces.length === 0) {
    return {
      totalTraces: 0,
      averageDuration: 0,
      errorRate: 0,
      topOperations: [],
      durationDistribution: []
    };
  }

  const durations = traces
    .filter(t => t.duration !== undefined)
    .map(t => t.duration!);

  const errorCount = traces.filter(t => t.status === 'error').length;
  const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  // Top operations
  const operationCounts = traces.reduce((acc, trace) => {
    acc[trace.operation] = (acc[trace.operation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topOperations = Object.entries(operationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([operation, count]) => ({ operation, count }));

  // Duration distribution
  const ranges = [
    { min: 0, max: 100, label: '0-100ms' },
    { min: 100, max: 500, label: '100-500ms' },
    { min: 500, max: 1000, label: '500ms-1s' },
    { min: 1000, max: 5000, label: '1-5s' },
    { min: 5000, max: Infinity, label: '5s+' }
  ];

  const durationDistribution = ranges.map(range => {
    const count = durations.filter(d => d >= range.min && d < range.max).length;
    return { range: range.label, count };
  });

  return {
    totalTraces: traces.length,
    averageDuration,
    errorRate: errorCount / traces.length,
    topOperations,
    durationDistribution
  };
}