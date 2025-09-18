// Trace Middleware Implementation
// ===============================

import { Request, Response, NextFunction } from 'express';
import { DistributedTracer } from './DistributedTracer';
import { TraceContext } from '../types';

/**
 * Express middleware for automatic HTTP request tracing
 */
export class TraceMiddleware {
  private tracer: DistributedTracer;
  private options: TraceMiddlewareOptions;

  constructor(tracer: DistributedTracer, options: TraceMiddlewareOptions = {}) {
    this.tracer = tracer;
    this.options = {
      pathPatterns: ['*'],
      excludePaths: ['/health', '/metrics'],
      headers: true,
      queryParams: true,
      body: false,
      response: false,
      ...options
    };
  }

  /**
   * Create Express middleware
   */
  middleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip excluded paths
      if (this.shouldSkipPath(req.path)) {
        return next();
      }

      // Extract or create trace context
      const context = this.extractOrCreateContext(req);

      // Start span for the request
      const span = this.tracer.startSpan('HTTP ' + req.method, context.traceId, context.spanId);

      if (!span) {
        return next();
      }

      // Add request information to span
      this.addRequestInfo(span, req);

      // Inject trace context into response headers
      this.injectResponseHeaders(res, context);

      // Override res.end to capture response
      this.wrapResponseEnd(res, span);

      // Continue with request
      next();
    };
  }

  /**
   * Create middleware for specific routes
   */
  routeMiddleware(operation: string): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const context = this.tracer.getCurrentContext();
      const span = this.tracer.startSpan(operation, context?.traceId, context?.spanId);

      if (!span) {
        return next();
      }

      this.wrapResponseEnd(res, span);
      next();
    };
  }

  /**
   * Create middleware for async operations
   */
  asyncMiddleware(operation: string): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      const context = this.tracer.getCurrentContext();
      const span = this.tracer.startSpan(operation, context?.traceId, context?.spanId);

      if (!span) {
        return next();
      }

      try {
        // Override next to capture async operations
        const originalNext = next;
        next = (err?: any) => {
          if (err) {
            this.tracer.addTag('error', true);
            this.tracer.addError(err);
          }
          originalNext(err);
        };

        await new Promise<void>((resolve, reject) => {
          const originalEnd = res.end;
          res.end = function(chunk?: any) {
            originalEnd.call(this, chunk);
            resolve();
          };

          next();
        });

        this.tracer.finishSpan(span.id, 'success');
      } catch (error) {
        this.tracer.addTag('error', true);
        this.tracer.addError(error as Error);
        this.tracer.finishSpan(span.id, 'error');
        throw error;
      }
    };
  }

  /**
   * WebSocket middleware for socket tracing
   */
  websocketMiddleware(): (socket: any, next: Function) => void {
    return (socket: any, next: Function) => {
      const span = this.tracer.startSpan('WebSocket Connection');

      if (!span) {
        return next();
      }

      // Add socket info to span
      this.tracer.addTag('socket.id', socket.id);
      this.tracer.addTag('socket.handshake.address', socket.handshake?.address);

      // Track socket events
      this.trackSocketEvents(socket, span);

      next();
    };
  }

  /**
   * GraphQL middleware for tracing GraphQL operations
   */
  graphqlMiddleware(): (resolve: any, root: any, args: any, context: any, info: any) => any {
    return (resolve: any, root: any, args: any, context: any, info: any) => {
      const operation = info.operation.operation;
      const fieldName = info.fieldName;

      const span = this.tracer.startSpan(`GraphQL ${operation} ${fieldName}`);

      if (!span) {
        return resolve(root, args, context, info);
      }

      this.tracer.addTag('graphql.operation', operation);
      this.tracer.addTag('graphql.field', fieldName);

      return resolve(root, args, context, info)
        .then((result: any) => {
          this.tracer.finishSpan(span.id, 'success');
          return result;
        })
        .catch((error: any) => {
          this.tracer.addTag('error', true);
          this.tracer.addError(error);
          this.tracer.finishSpan(span.id, 'error');
          throw error;
        });
    };
  }

  /**
   * Database middleware for tracing database operations
   */
  databaseMiddleware(operation: string): (query: string, params?: any[]) => Promise<any> {
    return (query: string, params?: any[]) => {
      const span = this.tracer.startSpan(`Database ${operation}`);

      if (!span) {
        // Execute original query
        return Promise.reject('Tracer not available');
      }

      this.tracer.addTag('db.operation', operation);
      this.tracer.addTag('db.statement', query);
      if (params && params.length > 0) {
        this.tracer.addTag('db.parameters_count', params.length);
      }

      const startTime = Date.now();

      // Return a mock promise for demonstration
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const duration = Date.now() - startTime;
          this.tracer.addMetric('db.duration', duration);
          this.tracer.finishSpan(span.id, 'success');
          resolve({ rows: [], duration });
        }, Math.random() * 100);
      });
    };
  }

  /**
   * External service middleware for tracing HTTP calls
   */
  externalServiceMiddleware(service: string): (options: any) => Promise<any> => {
    return (options: any) => {
      const span = this.tracer.startSpan(`External ${service}`);

      if (!span) {
        return Promise.reject('Tracer not available');
      }

      this.tracer.addTag('external.service', service);
      this.tracer.addTag('external.method', options.method || 'GET');
      this.tracer.addTag('external.url', options.url);

      const startTime = Date.now();

      // Return a mock promise for demonstration
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const duration = Date.now() - startTime;
          this.tracer.addMetric('external.duration', duration);
          this.tracer.finishSpan(span.id, 'success');
          resolve({ data: {}, duration });
        }, Math.random() * 200);
      });
    };
  }

  // Private methods
  private shouldSkipPath(path: string): boolean {
    return this.options.excludePaths?.some(pattern => {
      if (pattern === '*') return false;
      if (pattern.endsWith('*')) {
        return path.startsWith(pattern.slice(0, -1));
      }
      return path === pattern;
    }) ?? false;
  }

  private extractOrCreateContext(req: Request): TraceContext {
    // Try to extract context from headers
    const context = this.tracer.extractContext(req.headers);

    if (context) {
      return context;
    }

    // Create new context
    const newContext = this.tracer.startTrace(`${req.method} ${req.path}`, {
      'http.method': req.method,
      'http.path': req.path,
      'http.host': req.hostname
    });

    return newContext || {
      traceId: 'unknown',
      spanId: 'unknown',
      operation: 'unknown',
      startTime: Date.now(),
      status: 'pending',
      tags: {},
      metadata: {}
    };
  }

  private addRequestInfo(span: any, req: Request): void {
    this.tracer.addTag('http.method', req.method);
    this.tracer.addTag('http.path', req.path);
    this.tracer.addTag('http.host', req.hostname);
    this.tracer.addTag('http.scheme', req.protocol);
    this.tracer.addTag('http.user_agent', req.get('user-agent') || 'unknown');
    this.tracer.addTag('http.client_ip', req.ip || req.connection.remoteAddress || 'unknown');

    if (this.options.headers && req.headers) {
      const headers = { ...req.headers };
      // Remove sensitive headers
      delete headers.authorization;
      delete headers.cookie;
      this.tracer.addTag('http.headers', JSON.stringify(headers));
    }

    if (this.options.queryParams && req.query && Object.keys(req.query).length > 0) {
      this.tracer.addTag('http.query_params', JSON.stringify(req.query));
    }

    if (this.options.body && req.body) {
      try {
        const bodyStr = JSON.stringify(req.body);
        if (bodyStr.length < 1000) { // Don't log large bodies
          this.tracer.addTag('http.body', bodyStr);
        } else {
          this.tracer.addTag('http.body_size', bodyStr.length);
        }
      } catch (error) {
        // Ignore JSON serialization errors
      }
    }
  }

  private injectResponseHeaders(res: Response, context: TraceContext): void {
    res.setHeader('X-Trace-Id', context.traceId);
    res.setHeader('X-Span-Id', context.spanId);
  }

  private wrapResponseEnd(res: Response, span: any): void {
    const originalEnd = res.end;
    const originalJson = res.json;

    res.end = function(chunk?: any) {
      const startTime = span.startTime;
      const duration = Date.now() - startTime;

      this.tracer.addTag('http.status_code', res.statusCode);
      this.tracer.addMetric('http.duration', duration);

      if (res.statusCode >= 400) {
        this.tracer.addTag('error', true);
        this.tracer.finishSpan(span.id, 'error');
      } else {
        this.tracer.finishSpan(span.id, 'success');
      }

      return originalEnd.call(this, chunk);
    }.bind(this);

    res.json = function(obj: any) {
      const startTime = span.startTime;
      const duration = Date.now() - startTime;

      this.tracer.addTag('http.status_code', res.statusCode);
      this.tracer.addMetric('http.duration', duration);
      this.tracer.addTag('http.response_type', 'json');

      if (res.statusCode >= 400) {
        this.tracer.addTag('error', true);
        this.tracer.finishSpan(span.id, 'error');
      } else {
        this.tracer.finishSpan(span.id, 'success');
      }

      return originalJson.call(this, obj);
    }.bind(this);
  }

  private trackSocketEvents(socket: any, span: any): void {
    const events = ['connect', 'disconnect', 'error', 'message'];

    events.forEach(event => {
      socket.on(event, (data: any) => {
        this.tracer.addLog(`Socket ${event}`, {
          event,
          data: typeof data === 'object' ? JSON.stringify(data) : data
        });
      });
    });

    socket.on('disconnect', (reason: string) => {
      this.tracer.addTag('socket.disconnect_reason', reason);
      this.tracer.finishSpan(span.id, 'success');
    });

    socket.on('error', (error: Error) => {
      this.tracer.addTag('error', true);
      this.tracer.addError(error);
      this.tracer.finishSpan(span.id, 'error');
    });
  }
}

/**
 * Middleware options
 */
export interface TraceMiddlewareOptions {
  pathPatterns?: string[];
  excludePaths?: string[];
  headers?: boolean;
  queryParams?: boolean;
  body?: boolean;
  response?: boolean;
 CustomAttributes?: Record<string, any>;
}

/**
 * Create trace middleware
 */
export function createTraceMiddleware(tracer: DistributedTracer, options?: TraceMiddlewareOptions): TraceMiddleware {
  return new TraceMiddleware(tracer, options);
}

/**
 * Decorator for automatic method tracing
 */
export function traceable(operation: string, tags?: Record<string, any>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracer = (this as any).__tracer;
      if (!tracer) {
        return originalMethod.apply(this, args);
      }

      const span = tracer.startSpan(operation);
      if (!span) {
        return originalMethod.apply(this, args);
      }

      // Add tags
      if (tags) {
        Object.entries(tags).forEach(([key, value]) => {
          tracer.addTag(key, value);
        });
      }

      // Add method info
      tracer.addTag('method.name', propertyKey);
      tracer.addTag('method.class', target.constructor.name);

      try {
        const result = originalMethod.apply(this, args);

        if (result instanceof Promise) {
          return result
            .then((resolved: any) => {
              tracer.finishSpan(span.id, 'success');
              return resolved;
            })
            .catch((error: any) => {
              tracer.addTag('error', true);
              tracer.addError(error);
              tracer.finishSpan(span.id, 'error');
              throw error;
            });
        } else {
          tracer.finishSpan(span.id, 'success');
          return result;
        }
      } catch (error) {
        tracer.addTag('error', true);
        tracer.addError(error as Error);
        tracer.finishSpan(span.id, 'error');
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility function to trace async operations
 */
export async function traceAsync<T>(
  tracer: DistributedTracer,
  operation: string,
  fn: () => Promise<T>,
  tags?: Record<string, any>
): Promise<T> {
  const span = tracer.startSpan(operation);
  if (!span) {
    return fn();
  }

  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      tracer.addTag(key, value);
    });
  }

  try {
    const result = await fn();
    tracer.finishSpan(span.id, 'success');
    return result;
  } catch (error) {
    tracer.addTag('error', true);
    tracer.addError(error as Error);
    tracer.finishSpan(span.id, 'error');
    throw error;
  }
}

/**
 * Utility function to trace sync operations
 */
export function traceSync<T>(
  tracer: DistributedTracer,
  operation: string,
  fn: () => T,
  tags?: Record<string, any>
): T {
  const span = tracer.startSpan(operation);
  if (!span) {
    return fn();
  }

  if (tags) {
    Object.entries(tags).forEach(([key, value]) => {
      tracer.addTag(key, value);
    });
  }

  try {
    const result = fn();
    tracer.finishSpan(span.id, 'success');
    return result;
  } catch (error) {
    tracer.addTag('error', true);
    tracer.addError(error as Error);
    tracer.finishSpan(span.id, 'error');
    throw error;
  }
}