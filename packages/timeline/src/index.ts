import { TimelineService } from './TimelineService';
import { SearchService } from './SearchService';
import { ExportService } from './ExportService';
import {
  TimelineEntry,
  TimelineFilter,
  TimelineQuery,
  TimelineResponse,
  SearchQuery,
  SearchResult,
  ExportOptions,
  ExportJob,
  CreateTimelineEntryRequest,
  UpdateTimelineEntryRequest,
  BatchOperationRequest,
  BatchOperationResponse,
  TimelineAnalytics,
  TimelineSubscription,
  WorkflowInstance,
  MaterializedView,
  SearchFacet,
  SearchAnalytics,
  ExportTemplate,
} from './types/TimelineTypes';

export interface TimelineAPIConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  searchEnabled?: boolean;
  exportEnabled?: boolean;
  realtimeEnabled?: boolean;
  maxEntriesPerQuery?: number;
  maxExportSize?: number;
  supportedFormats?: string[];
}

export class TimelineAPI {
  private timelineService: TimelineService;
  private searchService: SearchService;
  private exportService: ExportService;
  private config: TimelineAPIConfig;

  constructor(config: TimelineAPIConfig = {}) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutes
      searchEnabled: true,
      exportEnabled: true,
      realtimeEnabled: true,
      maxEntriesPerQuery: 1000,
      maxExportSize: 50000,
      supportedFormats: ['json', 'csv', 'pdf', 'xml', 'xlsx', 'html'],
      ...config,
    };

    this.timelineService = new TimelineService();
    this.searchService = new SearchService(this.timelineService);
    this.exportService = new ExportService(this.timelineService, this.searchService);

    // Initialize the system
    this.initialize();
  }

  // Timeline Management Methods
  async createEntry(request: CreateTimelineEntryRequest): Promise<TimelineEntry> {
    this.validateConfig('timeline');
    return await this.timelineService.createEntry(request);
  }

  async updateEntry(id: string, request: UpdateTimelineEntryRequest): Promise<TimelineEntry | null> {
    this.validateConfig('timeline');
    return await this.timelineService.updateEntry(id, request);
  }

  async getEntry(id: string): Promise<TimelineEntry | null> {
    this.validateConfig('timeline');
    return await this.timelineService.getEntry(id);
  }

  async queryTimeline(query: TimelineQuery): Promise<TimelineResponse> {
    this.validateConfig('timeline');

    // Apply query limits
    if (query.pagination) {
      query.pagination.limit = Math.min(
        query.pagination.limit,
        this.config.maxEntriesPerQuery!
      );
    }

    return await this.timelineService.queryTimeline(query);
  }

  async deleteEntry(id: string): Promise<boolean> {
    this.validateConfig('timeline');
    return await this.timelineService.batchOperation({
      operation: 'delete',
      entryIds: [id],
    }).then(result => result.success.length > 0);
  }

  async batchOperation(request: BatchOperationRequest): Promise<BatchOperationResponse> {
    this.validateConfig('timeline');
    return await this.timelineService.batchOperation(request);
  }

  // Search Methods
  async search(query: SearchQuery): Promise<SearchResult> {
    this.validateConfig('search');
    return await this.searchService.search(query);
  }

  async advancedSearch(options: {
    query: string;
    filters?: TimelineFilter;
    mustMatch?: string[];
    shouldMatch?: string[];
    mustNotMatch?: string[];
    fuzzy?: boolean;
    boostFields?: Record<string, number>;
    minimumShouldMatch?: number;
  }): Promise<SearchResult> {
    this.validateConfig('search');
    return await this.searchService.advancedSearch(options);
  }

  async getSearchFacets(filter?: TimelineFilter): Promise<SearchFacet[]> {
    this.validateConfig('search');
    return await this.searchService.getSearchFacets(filter);
  }

  async getSearchSuggestions(query: string, limit?: number): Promise<Array<{
    text: string;
    type: string;
    score: number;
    context?: string;
  }>> {
    this.validateConfig('search');
    return await this.searchService.getSuggestions(query, limit);
  }

  async reindexSearch(): Promise<void> {
    this.validateConfig('search');
    return await this.searchService.reindex();
  }

  async getSearchAnalytics(): Promise<SearchAnalytics> {
    this.validateConfig('search');
    return await this.searchService.getSearchAnalytics();
  }

  // Export Methods
  async createExport(options: ExportOptions): Promise<ExportJob> {
    this.validateConfig('export');

    // Validate export size
    const entries = await this.timelineService.queryTimeline({
      filter: options.filter,
      pagination: { limit: this.config.maxExportSize! },
    }).then(result => result.entries);

    if (entries.length > this.config.maxExportSize!) {
      throw new Error(`Export size exceeds maximum limit of ${this.config.maxExportSize} entries`);
    }

    return await this.exportService.createExport(options);
  }

  async getExportJob(id: string): Promise<ExportJob | null> {
    this.validateConfig('export');
    return await this.exportService.getExportJob(id);
  }

  async cancelExport(id: string): Promise<boolean> {
    this.validateConfig('export');
    return await this.exportService.cancelExport(id);
  }

  async listExportJobs(limit?: number, offset?: number): Promise<ExportJob[]> {
    this.validateConfig('export');
    return await this.exportService.listExportJobs(limit, offset);
  }

  async batchExport(requests: ExportOptions[]): Promise<ExportJob[]> {
    this.validateConfig('export');
    return await this.exportService.batchExport(requests);
  }

  async exportWithSearch(query: string, format: any, options?: Partial<ExportOptions>): Promise<ExportJob> {
    this.validateConfig(['search', 'export']);
    return await this.exportService.exportWithSearch(query, format, options);
  }

  async validateExportOptions(options: ExportOptions): Promise<{ valid: boolean; errors: string[] }> {
    this.validateConfig('export');
    return await this.exportService.validateExportOptions(options);
  }

  async getExportFormats(): Promise<Array<{
    format: string;
    name: string;
    description: string;
    mimeType: string;
    extension: string;
  }>> {
    this.validateConfig('export');
    return await this.exportService.getExportFormats();
  }

  // Analytics Methods
  async getAnalytics(dateRange?: { start: Date; end: Date }): Promise<TimelineAnalytics> {
    this.validateConfig('timeline');
    return await this.timelineService.getAnalytics(dateRange);
  }

  async exportAnalytics(filter?: TimelineFilter): Promise<string> {
    this.validateConfig(['timeline', 'export']);
    return await this.exportService.exportAnalytics(filter);
  }

  // Real-time Methods
  async subscribe(filter: TimelineFilter, callback: (entries: TimelineEntry[]) => void): Promise<string> {
    this.validateConfig('realtime');
    return await this.timelineService.subscribe(filter, callback);
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.validateConfig('realtime');
    return await this.timelineService.unsubscribe(subscriptionId);
  }

  // Workflow Methods
  async createWorkflow(name: string, jobIds: string[]): Promise<WorkflowInstance> {
    this.validateConfig('timeline');
    return await this.timelineService.createWorkflow(name, jobIds);
  }

  async getWorkflow(workflowId: string): Promise<WorkflowInstance | null> {
    this.validateConfig('timeline');
    return await this.timelineService.getWorkflow(workflowId);
  }

  // Materialized Views
  async createMaterializedView(name: string, query: TimelineQuery, refreshInterval?: number): Promise<MaterializedView> {
    this.validateConfig('timeline');
    return await this.timelineService.createMaterializedView(name, query, refreshInterval);
  }

  async refreshView(name: string): Promise<MaterializedView> {
    this.validateConfig('timeline');
    return await this.timelineService.refreshView(name);
  }

  // Export Templates
  async createExportTemplate(name: string, template: ExportTemplate): Promise<void> {
    this.validateConfig('export');
    return await this.exportService.createExportTemplate(name, template);
  }

  async getExportTemplate(name: string): Promise<ExportTemplate | null> {
    this.validateConfig('export');
    return await this.exportService.getExportTemplate(name);
  }

  async listExportTemplates(): Promise<Array<{ name: string; template: ExportTemplate }>> {
    this.validateConfig('export');
    return await this.exportService.listExportTemplates();
  }

  // Utility Methods
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    metrics: {
      totalEntries: number;
      cacheSize: number;
      searchIndexSize: number;
      activeExports: number;
      activeSubscriptions: number;
    };
    uptime: number;
  }> {
    const timeline = await this.checkTimelineHealth();
    const search = await this.checkSearchHealth();
    const export_ = await this.checkExportHealth();

    const services = { timeline, search, export: export_ };
    const overallStatus = Object.values(services).every(s => s === 'healthy')
      ? 'healthy'
      : Object.values(services).some(s => s === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';

    return {
      status: overallStatus,
      services,
      metrics: await this.getSystemMetrics(),
      uptime: process.uptime() * 1000,
    };
  }

  async getSystemMetrics(): Promise<{
    totalEntries: number;
    cacheSize: number;
    searchIndexSize: number;
    activeExports: number;
    activeSubscriptions: number;
  }> {
    const entries = await this.timelineService.queryTimeline({
      pagination: { limit: 1 },
    });

    const activeExports = (await this.exportService.listExportJobs(1000))
      .filter(job => job.status === 'processing' || job.status === 'pending').length;

    return {
      totalEntries: entries.pagination.total || 0,
      cacheSize: this.calculateCacheSize(),
      searchIndexSize: this.calculateSearchIndexSize(),
      activeExports,
      activeSubscriptions: this.getActiveSubscriptions(),
    };
  }

  async clearCache(): Promise<void> {
    try {
      // Clear in-memory cache
      this.cache.clear();

      // Clear search index cache
      this.searchService.clearCache();

      // Clear any stored cache data
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('timeline-cache');
        localStorage.removeItem('timeline-search-cache');
      }

      // Clear file system cache if available
      if (this.config.cache?.enabled && this.config.cache.ttl) {
        // Cache will be automatically cleared on next access due to TTL
      }
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  async getStatistics(): Promise<{
    totalQueries: number;
    averageQueryTime: number;
    cacheHitRate: number;
    popularQueries: Array<{ query: string; count: number }>;
    exportStats: {
      totalExports: number;
      averageExportTime: number;
      popularFormats: Array<{ format: string; count: number }>;
    };
  }> {
    try {
      // Get search statistics
      const searchStats = await this.searchService.getStatistics();

      // Get export statistics
      const exportJobs = await this.exportService.listExportJobs(1000);
      const completedExports = exportJobs.filter(job => job.status === 'completed');

      // Calculate export statistics
      const exportStats = {
        totalExports: exportJobs.length,
        averageExportTime: completedExports.length > 0
          ? completedExports.reduce((sum, job) => sum + (job.completedAt ? job.completedAt.getTime() - job.createdAt.getTime() : 0), 0) / completedExports.length
          : 0,
        popularFormats: this.getPopularFormats(exportJobs),
      };

      return {
        totalQueries: searchStats.totalQueries,
        averageQueryTime: searchStats.averageQueryTime,
        cacheHitRate: searchStats.cacheHitRate,
        popularQueries: searchStats.popularQueries,
        exportStats,
      };
    } catch (error) {
      console.warn('Failed to get statistics:', error);
      return {
        totalQueries: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        popularQueries: [],
        exportStats: {
          totalExports: 0,
          averageExportTime: 0,
          popularFormats: [],
        },
      };
    }
  }

  // Configuration Methods
  updateConfig(config: Partial<TimelineAPIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TimelineAPIConfig {
    return { ...this.config };
  }

  // Private helper methods
  private calculateCacheSize(): number {
    try {
      // Calculate in-memory cache size
      let cacheSize = 0;
      this.cache.forEach((value, key) => {
        cacheSize += key.length + JSON.stringify(value).length;
      });

      // Add localStorage cache size if available
      if (typeof localStorage !== 'undefined') {
        const cacheData = localStorage.getItem('timeline-cache');
        if (cacheData) {
          cacheSize += cacheData.length;
        }
      }

      return cacheSize; // Return size in bytes
    } catch (error) {
      return 0;
    }
  }

  private calculateSearchIndexSize(): number {
    try {
      // Calculate search index size based on the search service
      return this.searchService.getIndexSize() || 0;
    } catch (error) {
      return 0;
    }
  }

  private getActiveSubscriptions(): number {
    try {
      // Count active event subscriptions
      return this.eventListeners.size;
    } catch (error) {
      return 0;
    }
  }

  private getPopularFormats(exportJobs: any[]): Array<{ format: string; count: number }> {
    const formatCounts = new Map<string, number>();

    exportJobs.forEach(job => {
      if (job.format) {
        formatCounts.set(job.format, (formatCounts.get(job.format) || 0) + 1);
      }
    });

    return Array.from(formatCounts.entries())
      .map(([format, count]) => ({ format, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 formats
  }

  private async initialize(): Promise<void> {
    // Initialize search index
    if (this.config.searchEnabled) {
      try {
        await this.searchService.reindex();
        console.log('Timeline search index initialized');
      } catch (error) {
        console.error('Failed to initialize search index:', error);
      }
    }

    // Initialize default export templates
    if (this.config.exportEnabled) {
      try {
        await this.exportService.createExportTemplate('minimal', {
          name: 'minimal',
          description: 'Minimal export with only essential fields',
          fields: ['id', 'type', 'status', 'title', 'createdAt'],
        });
        console.log('Export templates initialized');
      } catch (error) {
        console.error('Failed to initialize export templates:', error);
      }
    }

    console.log('Timeline API initialized successfully');
  }

  private validateConfig(feature: string | string[]): void {
    const features = Array.isArray(feature) ? feature : [feature];

    for (const f of features) {
      switch (f) {
        case 'timeline':
          if (!this.config.cacheEnabled) {
            throw new Error('Timeline service requires cache to be enabled');
          }
          break;
        case 'search':
          if (!this.config.searchEnabled) {
            throw new Error('Search service is not enabled');
          }
          break;
        case 'export':
          if (!this.config.exportEnabled) {
            throw new Error('Export service is not enabled');
          }
          break;
        case 'realtime':
          if (!this.config.realtimeEnabled) {
            throw new Error('Realtime features are not enabled');
          }
          break;
      }
    }
  }

  private async checkTimelineHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      await this.timelineService.queryTimeline({
        pagination: { limit: 1 },
      });
      return 'healthy';
    } catch (error) {
      console.error('Timeline health check failed:', error);
      return 'unhealthy';
    }
  }

  private async checkSearchHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    if (!this.config.searchEnabled) return 'healthy';

    try {
      await this.searchService.search({
        text: 'health_check',
        limit: 1,
      });
      return 'healthy';
    } catch (error) {
      console.error('Search health check failed:', error);
      return 'degraded';
    }
  }

  private async checkExportHealth(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    if (!this.config.exportEnabled) return 'healthy';

    try {
      await this.exportService.validateExportOptions({
        format: 'json',
        filter: {},
      });
      return 'healthy';
    } catch (error) {
      console.error('Export health check failed:', error);
      return 'degraded';
    }
  }
}

// Export convenience functions
export function createTimelineAPI(config?: TimelineAPIConfig): TimelineAPI {
  return new TimelineAPI(config);
}

// Export types and classes for direct usage
export {
  TimelineService,
  SearchService,
  ExportService,
};

// Export all types
export * from './types/TimelineTypes';

// Default export
export default TimelineAPI;