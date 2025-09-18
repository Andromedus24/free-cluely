// Distributed Tracer Implementation
// =================================

import { EventEmitter } from 'events';
import {
  TraceContext,
  Span,
  SpanLink,
  TracingConfig,
  ObservabilityEventType
} from '../types';

/**
 * Distributed tracing service with W3C Trace Context support
 */
export class DistributedTracer extends EventEmitter {
  private config: TracingConfig;
  private activeTraces: Map<string, TraceContext> = new Map();
  private activeSpans: Map<string, Span> = new Map();
  private spanStacks: Map<string, string[]> = new Map();
  private traceSampler: TraceSampler;
  private contextPropagator: ContextPropagator;
  private spanProcessor: SpanProcessor;
  private traceExporter: TraceExporter;

  constructor(config: TracingConfig) {
    super();
    this.config = config;
    this.traceSampler = new TraceSampler(config.sampleRate);
    this.contextPropagator = new ContextPropagator(config.propagationFormat);
    this.spanProcessor = new SpanProcessor(config);
    this.traceExporter = new TraceExporter();
  }

  /**
   * Start a new trace
   */
  startTrace(operation: string, tags: Record<string, any> = {}): TraceContext | null {
    if (!this.config.enabled) {
      return null;
    }

    // Sample the trace
    if (!this.traceSampler.shouldSample()) {
      return null;
    }

    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    const trace: TraceContext = {
      traceId,
      spanId,
      operation,
      startTime: Date.now(),
      status: 'pending',
      tags,
      metadata: {
        samplingDecision: true,
        sampleRate: this.config.sampleRate
      }
    };

    this.activeTraces.set(traceId, trace);
    this.spanStacks.set(traceId, [spanId]);

    this.emit('traceStarted', trace);
    return trace;
  }

  /**
   * Finish a trace
   */
  finishTrace(traceId: string, status: TraceContext['status'] = 'success', tags: Record<string, any> = {}): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;
    trace.tags = { ...trace.tags, ...tags };

    // Finish all remaining spans in the trace
    const spanStack = this.spanStacks.get(traceId) || [];
    spanStack.forEach(spanId => {
      this.finishSpan(spanId, 'cancelled');
    });

    this.activeTraces.delete(traceId);
    this.spanStacks.delete(traceId);

    // Process and export the trace
    this.spanProcessor.processTrace(trace);
    this.traceExporter.exportTrace(trace);

    this.emit('traceFinished', trace);
  }

  /**
   * Start a new span
   */
  startSpan(operation: string, traceId?: string, parentId?: string): Span | null {
    if (!this.config.enabled) {
      return null;
    }

    let finalTraceId = traceId;
    let finalParentId = parentId;

    // If no traceId provided, try to get from current context
    if (!finalTraceId) {
      const context = this.getCurrentContext();
      if (context) {
        finalTraceId = context.traceId;
        finalParentId = context.spanId;
      }
    }

    // If still no traceId, create a new trace
    if (!finalTraceId) {
      const trace = this.startTrace(operation);
      if (!trace) return null;
      finalTraceId = trace.traceId;
      finalParentId = undefined;
    }

    const spanId = this.generateSpanId();

    const span: Span = {
      id: spanId,
      parentId: finalParentId,
      operation,
      startTime: Date.now(),
      status: 'pending',
      tags: {},
      logs: [],
      metrics: [],
      links: []
    };

    this.activeSpans.set(spanId, span);

    // Add to span stack
    const spanStack = this.spanStacks.get(finalTraceId) || [];
    spanStack.push(spanId);
    this.spanStacks.set(finalTraceId, spanStack);

    // Set as current span
    this.setCurrentSpan(spanId);

    this.emit('spanStarted', span);
    return span;
  }

  /**
   * Finish a span
   */
  finishSpan(spanId: string, status: Span['status'] = 'success', tags: Record<string, any> = {}): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    span.tags = { ...span.tags, ...tags };

    this.activeSpans.delete(spanId);

    // Remove from span stack
    for (const [traceId, spanStack] of this.spanStacks.entries()) {
      const index = spanStack.indexOf(spanId);
      if (index !== -1) {
        spanStack.splice(index, 1);
        this.spanStacks.set(traceId, spanStack);
        break;
      }
    }

    // Clear current span if it's the one being finished
    this.clearCurrentSpan(spanId);

    // Process the span
    this.spanProcessor.processSpan(span);

    this.emit('spanFinished', span);
  }

  /**
   * Add a tag to the current span
   */
  addTag(key: string, value: any): void {
    const spanId = this.getCurrentSpanId();
    if (!spanId) return;

    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Add a log entry to the current span
   */
  addLog(message: string, metadata: Record<string, any> = {}): void {
    const spanId = this.getCurrentSpanId();
    if (!spanId) return;

    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: Date.now(),
        level: 'info',
        message,
        source: 'span',
        metadata,
        traceId: this.getTraceIdForSpan(spanId),
        spanId
      });
    }
  }

  /**
   * Add an error to the current span
   */
  addError(error: Error, metadata: Record<string, any> = {}): void {
    const spanId = this.getCurrentSpanId();
    if (!spanId) return;

    const span = this.activeSpans.get(spanId);
    if (span) {
      span.status = 'error';
      span.logs.push({
        timestamp: Date.now(),
        level: 'error',
        message: error.message,
        source: 'span',
        metadata: {
          ...metadata,
          error: {
            name: error.name,
            message: error.message,
            stack: this.config.includeStackTrace ? error.stack : undefined
          }
        },
        traceId: this.getTraceIdForSpan(spanId),
        spanId
      });
    }
  }

  /**
   * Add a metric to the current span
   */
  addMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const spanId = this.getCurrentSpanId();
    if (!spanId) return;

    const span = this.activeSpans.get(spanId);
    if (span) {
      span.metrics.push({
        name,
        value,
        timestamp: Date.now(),
        type: 'gauge',
        tags
      });
    }
  }

  /**
   * Link spans across traces
   */
  linkSpans(sourceSpanId: string, targetTraceId: string, targetSpanId: string, relationship: SpanLink['relationship'] = 'child'): void {
    const sourceSpan = this.activeSpans.get(sourceSpanId);
    if (!sourceSpan) return;

    sourceSpan.links.push({
      traceId: targetTraceId,
      spanId: targetSpanId,
      relationship
    });
  }

  /**
   * Inject trace context into carrier
   */
  injectContext(context: TraceContext, carrier: any): void {
    this.contextPropagator.inject(context, carrier);
  }

  /**
   * Extract trace context from carrier
   */
  extractContext(carrier: any): TraceContext | null {
    return this.contextPropagator.extract(carrier);
  }

  /**
   * Get current trace context
   */
  getCurrentContext(): TraceContext | null {
    const spanId = this.getCurrentSpanId();
    if (!spanId) return null;

    return this.getTraceContextForSpan(spanId);
  }

  /**
   * Get all active traces
   */
  getActiveTraces(): TraceContext[] {
    return Array.from(this.activeTraces.values());
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): TraceContext | null {
    return this.activeTraces.get(traceId) || null;
  }

  /**
   * Get spans for a trace
   */
  getSpansForTrace(traceId: string): Span[] {
    const spans: Span[] = [];
    for (const span of this.activeSpans.values()) {
      if (this.getTraceIdForSpan(span.id) === traceId) {
        spans.push(span);
      }
    }
    return spans;
  }

  /**
   * Get trace statistics
   */
  getTraceStats(): {
    totalTraces: number;
    activeTraces: number;
    totalSpans: number;
    averageSpansPerTrace: number;
    errorRate: number;
  } {
    const totalTraces = this.activeTraces.size;
    const totalSpans = this.activeSpans.size;
    const averageSpansPerTrace = totalTraces > 0 ? totalSpans / totalTraces : 0;

    let errorCount = 0;
    for (const trace of this.activeTraces.values()) {
      if (trace.status === 'error') errorCount++;
    }

    const errorRate = totalTraces > 0 ? errorCount / totalTraces : 0;

    return {
      totalTraces,
      activeTraces: totalTraces,
      totalSpans,
      averageSpansPerTrace,
      errorRate
    };
  }

  // Private methods
  private generateTraceId(): string {
    return this.generateId(32);
  }

  private generateSpanId(): string {
    return this.generateId(16);
  }

  private generateId(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  private getCurrentSpanId(): string | null {
    // In a real implementation, this would use async local storage or similar
    // For now, we'll use a simple approach
    return (global as any).__currentSpanId || null;
  }

  private setCurrentSpan(spanId: string): void {
    (global as any).__currentSpanId = spanId;
  }

  private clearCurrentSpan(spanId: string): void {
    if ((global as any).__currentSpanId === spanId) {
      (global as any).__currentSpanId = undefined;
    }
  }

  private getTraceIdForSpan(spanId: string): string | null {
    for (const [traceId, spanStack] of this.spanStacks.entries()) {
      if (spanStack.includes(spanId)) {
        return traceId;
      }
    }
    return null;
  }

  private getTraceContextForSpan(spanId: string): TraceContext | null {
    const traceId = this.getTraceIdForSpan(spanId);
    if (!traceId) return null;

    const trace = this.activeTraces.get(traceId);
    if (!trace) return null;

    return {
      ...trace,
      spanId
    };
  }
}

/**
 * Trace sampler for sampling decisions
 */
class TraceSampler {
  constructor(private sampleRate: number) {}

  shouldSample(): boolean {
    return Math.random() < this.sampleRate;
  }
}

/**
 * Context propagator for different trace formats
 */
class ContextPropagator {
  constructor(private format: 'w3c' | 'b3' | 'jaeger') {}

  inject(context: TraceContext, carrier: any): void {
    switch (this.format) {
      case 'w3c':
        this.injectW3C(context, carrier);
        break;
      case 'b3':
        this.injectB3(context, carrier);
        break;
      case 'jaeger':
        this.injectJaeger(context, carrier);
        break;
    }
  }

  extract(carrier: any): TraceContext | null {
    switch (this.format) {
      case 'w3c':
        return this.extractW3C(carrier);
      case 'b3':
        return this.extractB3(carrier);
      case 'jaeger':
        return this.extractJaeger(carrier);
      default:
        return null;
    }
  }

  private injectW3C(context: TraceContext, carrier: any): void {
    carrier['traceparent'] = `00-${context.traceId}-${context.spanId}-01`;
    if (Object.keys(context.tags).length > 0) {
      carrier['tracestate'] = Object.entries(context.tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    }
  }

  private extractW3C(carrier: any): TraceContext | null {
    const traceparent = carrier['traceparent'];
    if (!traceparent) return null;

    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    const [, traceId, spanId] = parts;
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

  private injectB3(context: TraceContext, carrier: any): void {
    carrier['X-B3-TraceId'] = context.traceId;
    carrier['X-B3-SpanId'] = context.spanId;
    if (context.parentId) {
      carrier['X-B3-ParentSpanId'] = context.parentId;
    }
    carrier['X-B3-Sampled'] = '1';
  }

  private extractB3(carrier: any): TraceContext | null {
    const traceId = carrier['X-B3-TraceId'];
    const spanId = carrier['X-B3-SpanId'];
    if (!traceId || !spanId) return null;

    return {
      traceId,
      spanId,
      parentId: carrier['X-B3-ParentSpanId'],
      operation: 'extracted',
      startTime: Date.now(),
      status: 'pending',
      tags: {},
      metadata: {}
    };
  }

  private injectJaeger(context: TraceContext, carrier: any): void {
    carrier['uber-trace-id'] = `${context.traceId}:${context.spanId}:${context.parentId || '0'}:1`;
  }

  private extractJaeger(carrier: any): TraceContext | null {
    const uberTraceId = carrier['uber-trace-id'];
    if (!uberTraceId) return null;

    const parts = uberTraceId.split(':');
    if (parts.length < 2) return null;

    const traceId = parts[0];
    const spanId = parts[1];
    const parentId = parts[2] !== '0' ? parts[2] : undefined;

    return {
      traceId,
      spanId,
      parentId,
      operation: 'extracted',
      startTime: Date.now(),
      status: 'pending',
      tags: {},
      metadata: {}
    };
  }
}

/**
 * Span processor for filtering and processing spans
 */
class SpanProcessor {
  constructor(private config: TracingConfig) {}

  processSpan(span: Span): void {
    // Apply filters and transformations
    if (this.shouldProcessSpan(span)) {
      this.enrichSpan(span);
    }
  }

  processTrace(trace: TraceContext): void {
    // Process the entire trace
    this.enrichTrace(trace);
  }

  private shouldProcessSpan(span: Span): boolean {
    // Check if span should be processed based on configuration
    if (span.duration && span.duration > this.config.maxTraceAge) {
      return false;
    }

    return true;
  }

  private enrichSpan(span: Span): void {
    // Add enrichment data
    span.tags['processed_at'] = Date.now();
    span.tags['processor'] = 'distributed-tracer';
  }

  private enrichTrace(trace: TraceContext): void {
    // Add enrichment data to trace
    trace.tags['processed_at'] = Date.now();
    trace.tags['processor'] = 'distributed-tracer';
  }
}

/**
 * Trace exporter for exporting traces to external systems
 */
class TraceExporter {
  private exporters: Map<string, any> = new Map();

  constructor() {
    // Initialize exporters
    this.exporters.set('console', new ConsoleTraceExporter());
    this.exporters.set('jaeger', new JaegerTraceExporter());
    this.exporters.set('zipkin', new ZipkinTraceExporter());
  }

  exportTrace(trace: TraceContext): void {
    // Export to all configured exporters
    for (const exporter of this.exporters.values()) {
      try {
        exporter.export(trace);
      } catch (error) {
        console.error('Failed to export trace:', error);
      }
    }
  }

  addExporter(name: string, exporter: any): void {
    this.exporters.set(name, exporter);
  }

  removeExporter(name: string): void {
    this.exporters.delete(name);
  }
}

/**
 * Console trace exporter
 */
class ConsoleTraceExporter {
  export(trace: TraceContext): void {
    console.log('Trace:', {
      traceId: trace.traceId,
      operation: trace.operation,
      duration: trace.duration,
      status: trace.status,
      tags: trace.tags
    });
  }
}

/**
 * Jaeger trace exporter
 */
class JaegerTraceExporter {
  export(trace: TraceContext): void {
    // In a real implementation, this would send to Jaeger
    console.log('Exporting to Jaeger:', trace.traceId);
  }
}

/**
 * Zipkin trace exporter
 */
class ZipkinTraceExporter {
  export(trace: TraceContext): void {
    // In a real implementation, this would send to Zipkin
    console.log('Exporting to Zipkin:', trace.traceId);
  }
}