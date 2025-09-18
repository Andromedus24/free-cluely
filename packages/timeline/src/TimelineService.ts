import { getKv } from '@atlas/core';
import {
  TimelineEntry,
  TimelineFilter,
  TimelineSort,
  TimelineQuery,
  TimelineResponse,
  PaginationOptions,
  TimelineSubscription,
  JobOperation,
  JobOperationType,
  BatchOperationRequest,
  BatchOperationResponse,
  CreateTimelineEntryRequest,
  UpdateTimelineEntryRequest,
  WorkflowInstance,
  MaterializedView,
  TimelineAnalytics,
  SortField,
  JobStatus,
  JobType,
} from './types/TimelineTypes';

export class TimelineService {
  private readonly kv = getKv();
  private readonly ENTRIES_KEY = 'atlas:timeline:entries';
  private readonly SUBSCRIPTIONS_KEY = 'atlas:timeline:subscriptions';
  private readonly WORKFLOWS_KEY = 'atlas:timeline:workflows';
  private readonly VIEWS_KEY = 'atlas:timeline:views';
  private readonly ANALYTICS_KEY = 'atlas:timeline:analytics';
  private readonly CACHE_KEY = 'atlas:timeline:cache';

  private subscriptions: Map<string, TimelineSubscription> = new Map();
  private views: Map<string, MaterializedView> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  async createEntry(request: CreateTimelineEntryRequest): Promise<TimelineEntry> {
    const id = this.generateId();
    const now = new Date();

    const entry: TimelineEntry = {
      id,
      type: request.type,
      status: 'pending',
      title: request.title,
      description: request.description,
      input: request.input,
      tags: request.tags || [],
      metadata: request.metadata || {},
      createdAt: now,
      updatedAt: now,
      priority: request.priority || 'medium',
      parentId: request.parentId,
      dependencies: request.dependencies || [],
      workflowId: request.workflowId,
      estimatedDuration: request.estimatedDuration,
      retryCount: 0,
      maxRetries: request.maxRetries || 3,
    };

    await this.saveEntry(entry);
    await this.invalidateCache();
    await this.notifySubscribers([entry]);

    return entry;
  }

  async updateEntry(id: string, request: UpdateTimelineEntryRequest): Promise<TimelineEntry | null> {
    const entry = await this.getEntry(id);
    if (!entry) return null;

    const updatedEntry: TimelineEntry = {
      ...entry,
      ...request,
      updatedAt: new Date(),
      artifacts: request.artifacts || entry.artifacts,
    };

    if (request.status === 'completed') {
      updatedEntry.completedAt = new Date();
      updatedEntry.duration = updatedEntry.startedAt
        ? Date.now() - updatedEntry.startedAt.getTime()
        : undefined;
    }

    await this.saveEntry(updatedEntry);
    await this.invalidateCache();
    await this.notifySubscribers([updatedEntry]);

    return updatedEntry;
  }

  async getEntry(id: string): Promise<TimelineEntry | null> {
    const cached = this.cache.get(`entry:${id}`);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const entry = await this.kv.hget(this.ENTRIES_KEY, id);
    if (!entry) return null;

    const timelineEntry = this.deserializeEntry(entry);
    this.cache.set(`entry:${id}`, {
      data: timelineEntry,
      timestamp: Date.now(),
      ttl: 60000, // 1 minute
    });

    return timelineEntry;
  }

  async queryTimeline(query: TimelineQuery): Promise<TimelineResponse> {
    const cacheKey = `query:${JSON.stringify(query)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const startTime = Date.now();
    let entries = await this.getAllEntries();

    // Apply filters
    if (query.filter) {
      entries = this.applyFilters(entries, query.filter);
    }

    // Apply aggregations
    let aggregations: Record<string, any> | undefined;
    if (query.aggregations) {
      aggregations = this.applyAggregations(entries, query.aggregations);
    }

    // Apply sorting
    if (query.sort && query.sort.length > 0) {
      entries = this.applySorting(entries, query.sort);
    }

    // Apply pagination
    const pagination = this.applyPagination(entries, query.pagination);

    // Select fields
    if (query.fields) {
      entries = entries.map(entry => this.selectFields(entry, query.fields!));
    }

    const response: TimelineResponse = {
      entries: pagination.entries,
      pagination: pagination.pagination,
      aggregations,
      metadata: {
        queryTime: Date.now() - startTime,
        cacheHit: !!cached,
        filters: query.filter || {},
        sort: query.sort || [],
      },
    };

    // Cache the result
    this.cache.set(cacheKey, {
      data: response,
      timestamp: Date.now(),
      ttl: 30000, // 30 seconds
    });

    return response;
  }

  async searchEntries(query: string, filter?: TimelineFilter): Promise<TimelineEntry[]> {
    const allEntries = await this.getAllEntries();
    let results = allEntries;

    if (filter) {
      results = this.applyFilters(results, filter);
    }

    // Simple text search (in production, use full-text search engine)
    const searchLower = query.toLowerCase();
    results = results.filter(entry =>
      entry.title.toLowerCase().includes(searchLower) ||
      entry.description?.toLowerCase().includes(searchLower) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
      JSON.stringify(entry.input).toLowerCase().includes(searchLower) ||
      JSON.stringify(entry.output).toLowerCase().includes(searchLower)
    );

    return results;
  }

  async batchOperation(request: BatchOperationRequest): Promise<BatchOperationResponse> {
    const startTime = Date.now();
    const success: boolean[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (const id of request.entryIds) {
      try {
        const result = await this.performOperation(id, request.operation, request.payload);
        success.push(result);
      } catch (error) {
        failed.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return {
      success,
      failed,
      totalProcessed: request.entryIds.length,
      operationTime: Date.now() - startTime,
    };
  }

  async subscribe(filter: TimelineFilter, callback: (entries: TimelineEntry[]) => void): Promise<string> {
    const id = this.generateId();
    const subscription: TimelineSubscription = {
      id,
      filter,
      callback,
      isActive: true,
      createdAt: new Date(),
    };

    this.subscriptions.set(id, subscription);
    await this.saveSubscription(subscription);

    return id;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
    await this.kv.hdel(this.SUBSCRIPTIONS_KEY, subscriptionId);
  }

  async getAnalytics(dateRange?: { start: Date; end: Date }): Promise<TimelineAnalytics> {
    const cacheKey = `analytics:${dateRange?.start.getTime()}:${dateRange?.end.getTime()}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const entries = await this.getAllEntries();
    let filteredEntries = entries;

    if (dateRange) {
      filteredEntries = entries.filter(entry =>
        entry.createdAt >= dateRange.start && entry.createdAt <= dateRange.end
      );
    }

    const analytics: TimelineAnalytics = {
      totalJobs: filteredEntries.length,
      completedJobs: filteredEntries.filter(e => e.status === 'completed').length,
      failedJobs: filteredEntries.filter(e => e.status === 'failed').length,
      averageDuration: this.calculateAverageDuration(filteredEntries),
      totalCost: this.calculateTotalCost(filteredEntries),
      averageCost: this.calculateAverageCost(filteredEntries),
      jobsByType: this.groupByType(filteredEntries),
      jobsByStatus: this.groupByStatus(filteredEntries),
      jobsByDay: this.groupByDay(filteredEntries),
      topTags: this.getTopTags(filteredEntries),
      errorRates: this.calculateErrorRates(filteredEntries),
      performanceMetrics: await this.getPerformanceMetrics(),
    };

    this.cache.set(cacheKey, {
      data: analytics,
      timestamp: Date.now(),
      ttl: 300000, // 5 minutes
    });

    return analytics;
  }

  async createMaterializedView(name: string, query: TimelineQuery, refreshInterval?: number): Promise<MaterializedView> {
    const view: MaterializedView = {
      name,
      query,
      refreshInterval,
      lastRefresh: new Date(),
      isStale: false,
      data: [],
    };

    view.data = (await this.queryTimeline(query)).entries;
    this.views.set(name, view);
    await this.saveView(view);

    if (refreshInterval) {
      this.scheduleViewRefresh(name, refreshInterval);
    }

    return view;
  }

  async refreshView(name: string): Promise<MaterializedView> {
    const view = this.views.get(name);
    if (!view) {
      throw new Error(`View ${name} not found`);
    }

    view.data = (await this.queryTimeline(view.query)).entries;
    view.lastRefresh = new Date();
    view.isStale = false;

    await this.saveView(view);
    return view;
  }

  async getWorkflow(workflowId: string): Promise<WorkflowInstance | null> {
    return await this.kv.hget(this.WORKFLOWS_KEY, workflowId);
  }

  async createWorkflow(name: string, jobIds: string[]): Promise<WorkflowInstance> {
    const id = this.generateId();
    const workflow: WorkflowInstance = {
      id,
      name,
      status: 'pending',
      jobs: jobIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };

    await this.kv.hset(this.WORKFLOWS_KEY, id, workflow);
    return workflow;
  }

  // Private helper methods
  private async saveEntry(entry: TimelineEntry): Promise<void> {
    await this.kv.hset(this.ENTRIES_KEY, entry.id, this.serializeEntry(entry));
  }

  private async getAllEntries(): Promise<TimelineEntry[]> {
    const keys = await this.kv.hkeys(this.ENTRIES_KEY);
    const entries: TimelineEntry[] = [];

    for (const key of keys) {
      const entry = await this.kv.hget(this.ENTRIES_KEY, key);
      if (entry) {
        entries.push(this.deserializeEntry(entry));
      }
    }

    return entries;
  }

  private applyFilters(entries: TimelineEntry[], filter: TimelineFilter): TimelineEntry[] {
    return entries.filter(entry => {
      // Type filter
      if (filter.type && !this.matchType(entry.type, filter.type)) return false;

      // Status filter
      if (filter.status && !this.matchStatus(entry.status, filter.status)) return false;

      // Tags filter
      if (filter.tags && !filter.tags.some(tag => entry.tags.includes(tag))) return false;

      // Date range filter
      if (filter.dateRange && !this.isInDateRange(entry.createdAt, filter.dateRange)) return false;
      if (filter.dateFrom && entry.createdAt < filter.dateFrom) return false;
      if (filter.dateTo && entry.createdAt > filter.dateTo) return false;

      // Text filter
      if (filter.text && !this.matchesText(entry, filter.text)) return false;

      // Metadata filter
      if (filter.metadata && !this.matchesMetadata(entry.metadata, filter.metadata)) return false;

      // User/Session filter
      if (filter.userId && entry.userId !== filter.userId) return false;
      if (filter.sessionId && entry.sessionId !== filter.sessionId) return false;

      // Workflow filter
      if (filter.workflowId && entry.workflowId !== filter.workflowId) return false;

      // Parent filter
      if (filter.parentId && entry.parentId !== filter.parentId) return false;

      // Error filter
      if (filter.hasError !== undefined && !!entry.error !== filter.hasError) return false;

      // Artifacts filter
      if (filter.hasArtifacts !== undefined && (!entry.artifacts || entry.artifacts.length === 0) !== filter.hasArtifacts) return false;

      // Priority filter
      if (filter.priority && !this.matchPriority(entry.priority, filter.priority)) return false;

      // Cost range filter
      if (filter.costRange && entry.cost && !this.isInRange(entry.cost, filter.costRange)) return false;

      // Duration range filter
      if (filter.durationRange && entry.duration && !this.isInRange(entry.duration, filter.durationRange)) return false;

      // Confidence range filter
      if (filter.confidenceRange && entry.confidence && !this.isInRange(entry.confidence, filter.confidenceRange)) return false;

      return true;
    });
  }

  private applySorting(entries: TimelineEntry[], sort: TimelineSort[]): TimelineEntry[] {
    return [...entries].sort((a, b) => {
      for (const { field, direction } of sort) {
        const aValue = this.getFieldValue(a, field);
        const bValue = this.getFieldValue(b, field);

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        if (comparison !== 0) {
          return direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });
  }

  private applyPagination(entries: TimelineEntry[], pagination?: PaginationOptions): {
    entries: TimelineEntry[];
    pagination: TimelineResponse['pagination'];
  } {
    const limit = pagination?.limit || 50;
    const cursor = pagination?.cursor;

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = entries.findIndex(e => e.id === cursor);
      startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    }

    const endIndex = Math.min(startIndex + limit, entries.length);
    const paginatedEntries = entries.slice(startIndex, endIndex);

    return {
      entries: paginatedEntries,
      pagination: {
        cursor: paginatedEntries.length > 0 ? paginatedEntries[paginatedEntries.length - 1].id : undefined,
        hasNext: endIndex < entries.length,
        hasPrevious: startIndex > 0,
        total: pagination?.includeTotal ? entries.length : undefined,
        limit,
      },
    };
  }

  private selectFields(entry: TimelineEntry, fields: string[]): Partial<TimelineEntry> {
    const selected: Partial<TimelineEntry> = { id: entry.id };
    for (const field of fields) {
      if (field in entry) {
        (selected as any)[field] = (entry as any)[field];
      }
    }
    return selected;
  }

  private applyAggregations(entries: TimelineEntry[], aggregations: any[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const agg of aggregations) {
      // Implementation of various aggregation operations
      // This is a simplified version - in production, implement all aggregation types
      if (agg.operation === 'count') {
        result[`${agg.field}_count`] = entries.length;
      }
    }

    return result;
  }

  private async performOperation(id: string, operation: JobOperationType, payload?: any): Promise<boolean> {
    const entry = await this.getEntry(id);
    if (!entry) {
      throw new Error(`Entry ${id} not found`);
    }

    switch (operation) {
      case 'resume':
        if (entry.status !== 'paused') throw new Error('Entry is not paused');
        return await this.updateEntry(id, { status: 'running' }) !== null;

      case 'pause':
        if (entry.status !== 'running') throw new Error('Entry is not running');
        return await this.updateEntry(id, { status: 'paused' }) !== null;

      case 'cancel':
        if (['completed', 'failed', 'cancelled'].includes(entry.status)) {
          throw new Error('Entry cannot be cancelled');
        }
        return await this.updateEntry(id, { status: 'cancelled' }) !== null;

      case 'retry':
        if (!['failed', 'cancelled'].includes(entry.status)) {
          throw new Error('Entry cannot be retried');
        }
        return await this.updateEntry(id, {
          status: 'pending',
          retryCount: entry.retryCount + 1
        }) !== null;

      case 'delete':
        await this.kv.hdel(this.ENTRIES_KEY, id);
        return true;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async notifySubscribers(entries: TimelineEntry[]): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.isActive) continue;

      const matchingEntries = this.applyFilters(entries, subscription.filter);
      if (matchingEntries.length > 0) {
        try {
          subscription.callback(matchingEntries);
          subscription.lastEventAt = new Date();
        } catch (error) {
          console.error('Subscription callback error:', error);
        }
      }
    }
  }

  private async invalidateCache(): Promise<void> {
    this.cache.clear();
  }

  // Serialization helpers
  private serializeEntry(entry: TimelineEntry): any {
    return {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      startedAt: entry.startedAt?.toISOString(),
      completedAt: entry.completedAt?.toISOString(),
    };
  }

  private deserializeEntry(data: any): TimelineEntry {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    };
  }

  private async saveSubscription(subscription: TimelineSubscription): Promise<void> {
    await this.kv.hset(this.SUBSCRIPTIONS_KEY, subscription.id, subscription);
  }

  private async saveView(view: MaterializedView): Promise<void> {
    await this.kv.hset(this.VIEWS_KEY, view.name, view);
  }

  private scheduleViewRefresh(name: string, interval: number): void {
    setInterval(async () => {
      try {
        await this.refreshView(name);
      } catch (error) {
        console.error(`Failed to refresh view ${name}:`, error);
      }
    }, interval);
  }

  // Filter matching helpers
  private matchType(entryType: JobType, filterType: JobType | JobType[]): boolean {
    return Array.isArray(filterType) ? filterType.includes(entryType) : entryType === filterType;
  }

  private matchStatus(entryStatus: JobStatus, filterStatus: JobStatus | JobStatus[]): boolean {
    return Array.isArray(filterStatus) ? filterStatus.includes(entryStatus) : entryStatus === filterStatus;
  }

  private matchPriority(entryPriority: string, filterPriority: string | string[]): boolean {
    return Array.isArray(filterPriority) ? filterPriority.includes(entryPriority) : entryPriority === filterPriority;
  }

  private isInDateRange(date: Date, range: { start: Date; end: Date }): boolean {
    return date >= range.start && date <= range.end;
  }

  private isInRange(value: number, range: { min: number; max: number }): boolean {
    return value >= range.min && value <= range.max;
  }

  private matchesText(entry: TimelineEntry, text: string): boolean {
    const searchLower = text.toLowerCase();
    return (
      entry.title.toLowerCase().includes(searchLower) ||
      entry.description?.toLowerCase().includes(searchLower) ||
      JSON.stringify(entry).toLowerCase().includes(searchLower)
    );
  }

  private matchesMetadata(entryMetadata: Record<string, any>, filterMetadata: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filterMetadata)) {
      if (entryMetadata[key] !== value) return false;
    }
    return true;
  }

  private getFieldValue(entry: TimelineEntry, field: SortField): any {
    return (entry as any)[field];
  }

  // Analytics helper methods
  private calculateAverageDuration(entries: TimelineEntry[]): number {
    const completedEntries = entries.filter(e => e.duration !== undefined);
    if (completedEntries.length === 0) return 0;
    const total = completedEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    return total / completedEntries.length;
  }

  private calculateTotalCost(entries: TimelineEntry[]): number {
    return entries.reduce((sum, e) => sum + (e.cost || 0), 0);
  }

  private calculateAverageCost(entries: TimelineEntry[]): number {
    const costEntries = entries.filter(e => e.cost !== undefined);
    if (costEntries.length === 0) return 0;
    return this.calculateTotalCost(costEntries) / costEntries.length;
  }

  private groupByType(entries: TimelineEntry[]): Record<JobType, number> {
    return entries.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {} as Record<JobType, number>);
  }

  private groupByStatus(entries: TimelineEntry[]): Record<JobStatus, number> {
    return entries.reduce((acc, entry) => {
      acc[entry.status] = (acc[entry.status] || 0) + 1;
      return acc;
    }, {} as Record<JobStatus, number>);
  }

  private groupByDay(entries: TimelineEntry[]): Array<{ date: string; count: number }> {
    const groups = entries.reduce((acc, entry) => {
      const date = entry.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(groups).map(([date, count]) => ({ date, count }));
  }

  private getTopTags(entries: TimelineEntry[], limit = 10): Array<{ tag: string; count: number }> {
    const tagCounts = entries.reduce((acc, entry) => {
      entry.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private calculateErrorRates(entries: TimelineEntry[]): Record<string, number> {
    const errorRates: Record<string, number> = {};
    const totalByType = this.groupByType(entries);
    const failedByType = entries
      .filter(e => e.status === 'failed')
      .reduce((acc, entry) => {
        acc[entry.type] = (acc[entry.type] || 0) + 1;
        return acc;
      }, {} as Record<JobType, number>);

    for (const [type, total] of Object.entries(totalByType)) {
      const failed = failedByType[type as JobType] || 0;
      errorRates[type] = total > 0 ? (failed / total) * 100 : 0;
    }

    return errorRates;
  }

  private async getPerformanceMetrics(): Promise<TimelineAnalytics['performanceMetrics']> {
    // In a real implementation, this would track actual query performance
    return {
      avgQueryTime: 50,
      cacheHitRate: 0.85,
      p95QueryTime: 200,
    };
  }

  private generateId(): string {
    return `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}