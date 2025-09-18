import {
  ModerationAnalysis,
  ModerationContentType,
  ModerationFilters
} from '../types/ModerationTypes';
import { IContentFilter, ContentFilterCapabilities } from './ContentFilter';
import { TextContentFilter } from './ContentFilter';
import { ImageContentFilter } from './ImageFilter';

/**
 * Filter Manager
 * Coordinates multiple content filters and provides unified filtering interface
 */
export class FilterManager {
  private filters: Map<string, IContentFilter> = new Map();
  private filterRegistry: Map<ModerationContentType, string[]> = new Map();
  private enabled = true;
  private config: FilterManagerConfig;

  constructor(config?: Partial<FilterManagerConfig>) {
    this.config = {
      maxConcurrentFilters: 5,
      timeout: 30000,
      failOpen: true,
      aggregateResults: true,
      ...config
    };

    this.initializeDefaultFilters();
  }

  /**
   * Filter content using all applicable filters
   */
  async filterContent(content: any, type: ModerationContentType): Promise<FilterResult> {
    if (!this.enabled) {
      return this.createSafeResult(content, type);
    }

    const applicableFilters = this.getApplicableFilters(type);
    if (applicableFilters.length === 0) {
      return this.createSafeResult(content, type);
    }

    const startTime = Date.now();
    const filterPromises: Promise<IndividualFilterResult>[] = [];

    for (const filterName of applicableFilters) {
      const filter = this.filters.get(filterName);
      if (filter) {
        filterPromises.push(this.executeFilter(filter, content, type));
      }
    }

    // Execute filters with timeout
    let filterResults: IndividualFilterResult[] = [];

    try {
      filterResults = await Promise.race([
        Promise.all(filterPromises),
        this.createTimeoutPromise(this.config.timeout)
      ]);

    } catch (error) {
      if (this.config.failOpen) {
        // If timeout and failOpen is true, treat as safe
        return this.createSafeResult(content, type, { timeout: true });
      } else {
        // If timeout and failOpen is false, treat as risky
        return this.createRiskyResult(content, type, { timeout: true });
      }
    }

    // Aggregate results
    const aggregatedResult = this.aggregateResults(filterResults, content, type);
    aggregatedResult.processingTime = Date.now() - startTime;

    return aggregatedResult;
  }

  /**
   * Add a custom filter
   */
  addFilter(filter: IContentFilter): void {
    this.filters.set(filter.name, filter);

    // Update registry
    const capabilities = filter.getCapabilities();
    for (const contentType of capabilities.supportedTypes) {
      const currentFilters = this.filterRegistry.get(contentType) || [];
      if (!currentFilters.includes(filter.name)) {
        currentFilters.push(filter.name);
        this.filterRegistry.set(contentType, currentFilters);
      }
    }

    this.emit('filter_added', { filter });
  }

  /**
   * Remove a filter
   */
  removeFilter(filterName: string): void {
    const filter = this.filters.get(filterName);
    if (filter) {
      this.filters.delete(filterName);

      // Update registry
      for (const [contentType, filterNames] of this.filterRegistry.entries()) {
        const updatedFilters = filterNames.filter(name => name !== filterName);
        this.filterRegistry.set(contentType, updatedFilters);
      }

      this.emit('filter_removed', { filterName });
    }
  }

  /**
   * Get filter by name
   */
  getFilter(filterName: string): IContentFilter | undefined {
    return this.filters.get(filterName);
  }

  /**
   * List all filters
   */
  listFilters(): FilterInfo[] {
    return Array.from(this.filters.values()).map(filter => ({
      name: filter.name,
      version: filter.version,
      description: filter.description,
      capabilities: filter.getCapabilities(),
      configuration: filter.getConfiguration(),
      enabled: this.isFilterEnabled(filter.name)
    }));
  }

  /**
   * Enable/disable a filter
   */
  async setFilterEnabled(filterName: string, enabled: boolean): Promise<void> {
    const filter = this.filters.get(filterName);
    if (filter) {
      await filter.configure({ enabled });
      this.emit('filter_enabled_changed', { filterName, enabled });
    }
  }

  /**
   * Configure a filter
   */
  async configureFilter(filterName: string, config: Record<string, any>): Promise<void> {
    const filter = this.filters.get(filterName);
    if (filter) {
      await filter.configure(config);
      this.emit('filter_configured', { filterName, config });
    }
  }

  /**
   * Enable/disable all filters
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.emit('manager_enabled_changed', { enabled });
  }

  /**
   * Get filter manager status
   */
  getStatus(): FilterManagerStatus {
    return {
      enabled: this.enabled,
      totalFilters: this.filters.size,
      activeFilters: Array.from(this.filters.values()).filter(f => f.getConfiguration().enabled).length,
      config: this.config,
      filterRegistry: Object.fromEntries(this.filterRegistry)
    };
  }

  /**
   * Get filter statistics
   */
  async getStatistics(timeRange?: { start: Date; end: Date }): Promise<FilterStatistics> {
    // In a real implementation, this would track actual usage statistics
    return {
      totalProcessed: 0,
      flaggedContent: 0,
      blockedContent: 0,
      averageProcessingTime: 0,
      filterUsage: {},
      topFlaggedCategories: [],
      timeRange: timeRange || {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      }
    };
  }

  // Private Methods
  // ==============

  private initializeDefaultFilters(): void {
    // Add default filters
    this.addFilter(new TextContentFilter());
    this.addFilter(new ImageContentFilter());

    // Set up default filter registry
    this.filterRegistry.set(ModerationContentType.TEXT, ['text_filter']);
    this.filterRegistry.set(ModerationContentType.IMAGE, ['image_filter']);
  }

  private getApplicableFilters(type: ModerationContentType): string[] {
    const filterNames = this.filterRegistry.get(type) || [];
    return filterNames.filter(name => {
      const filter = this.filters.get(name);
      return filter && filter.getConfiguration().enabled;
    });
  }

  private async executeFilter(
    filter: IContentFilter,
    content: any,
    type: ModerationContentType
  ): Promise<IndividualFilterResult> {
    try {
      const startTime = Date.now();
      const analysis = await filter.filter(content, type);
      const processingTime = Date.now() - startTime;

      return {
        filterName: filter.name,
        success: true,
        analysis,
        processingTime,
        error: null
      };

    } catch (error) {
      return {
        filterName: filter.name,
        success: false,
        analysis: null,
        processingTime: 0,
        error: error.message
      };
    }
  }

  private aggregateResults(
    results: IndividualFilterResult[],
    content: any,
    type: ModerationContentType
  ): FilterResult {
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);

    // If all filters failed, handle accordingly
    if (successfulResults.length === 0) {
      if (this.config.failOpen) {
        return this.createSafeResult(content, type, { filterErrors: failedResults.map(r => r.error) });
      } else {
        return this.createRiskyResult(content, type, { filterErrors: failedResults.map(r => r.error) });
      }
    }

    if (!this.config.aggregateResults) {
      // Return first successful result
      const firstResult = successfulResults[0];
      return {
        success: true,
        analysis: firstResult.analysis!,
        individualResults: results,
        processingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
        aggregationMethod: 'first_success'
      };
    }

    // Aggregate multiple results
    const analyses = successfulResults.map(r => r.analysis!);
    const aggregatedAnalysis = this.aggregateAnalyses(analyses);

    return {
      success: true,
      analysis: aggregatedAnalysis,
      individualResults: results,
      processingTime: results.reduce((sum, r) => sum + r.processingTime, 0),
      aggregationMethod: 'weighted_aggregation'
    };
  }

  private aggregateAnalyses(analyses: ModerationAnalysis[]): ModerationAnalysis {
    if (analyses.length === 1) {
      return analyses[0];
    }

    // Merge flags from all analyses
    const allFlags = analyses.flatMap(a => a.flags);

    // Calculate weighted scores
    const weights = analyses.map(a => a.confidence.score);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    const weightedScore = analyses.reduce((sum, a, index) => {
      return sum + (a.score * weights[index]);
    }, 0) / totalWeight;

    // Determine highest severity
    const severities = analyses.map(a => a.severity);
    const highestSeverity = this.getHighestSeverity(severities);

    // Determine most common category
    const categoryCount = new Map<string, number>();
    analyses.forEach(a => {
      const count = categoryCount.get(a.category) || 0;
      categoryCount.set(a.category, count + 1);
    });

    const dominantCategory = Array.from(categoryCount.entries())
      .sort(([, a], [, b]) => b - a)[0][0];

    // Generate combined suggestions
    const allSuggestions = new Set<string>();
    analyses.forEach(a => a.suggestions.forEach(s => allSuggestions.add(s)));

    return {
      id: this.generateId(),
      contentId: analyses[0].contentId,
      contentType: analyses[0].contentType,
      category: dominantCategory as any,
      severity: highestSeverity,
      confidence: {
        score: weightedScore,
        confidence: weightedScore >= 0.8 ? 'high' : weightedScore >= 0.6 ? 'medium' : 'low'
      },
      action: this.determineAggregatedAction(highestSeverity, weightedScore),
      status: 'completed' as any,
      score: weightedScore,
      flags: allFlags,
      suggestions: Array.from(allSuggestions),
      metadata: {
        aggregatedFrom: analyses.length,
        filters: analyses.map(a => a.metadata.filter),
        ...analyses[0].metadata
      },
      createdAt: analyses[0].createdAt,
      processedAt: new Date(),
      processingTime: analyses.reduce((sum, a) => sum + a.processingTime, 0)
    };
  }

  private getHighestSeverity(severities: any[]): any {
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    for (const severity of severityOrder) {
      if (severities.includes(severity)) {
        return severity;
      }
    }
    return 'low';
  }

  private determineAggregatedAction(severity: any, score: number): any {
    if (severity === 'critical' && score > 0.8) {
      return 'block';
    }
    if (severity === 'high' && score > 0.7) {
      return 'flag';
    }
    if (score > 0.8) {
      return 'review';
    }
    return 'allow';
  }

  private createSafeResult(content: any, type: ModerationContentType, metadata?: any): FilterResult {
    return {
      success: true,
      analysis: {
        id: this.generateId(),
        contentId: this.generateId(),
        contentType: type,
        category: 'custom' as any,
        severity: 'low' as any,
        confidence: { score: 1, confidence: 'high' },
        action: 'allow' as any,
        status: 'completed' as any,
        score: 0,
        flags: [],
        suggestions: ['Content appears safe'],
        metadata: {
          safe: true,
          filtersDisabled: !this.enabled,
          ...metadata
        },
        createdAt: new Date(),
        processedAt: new Date(),
        processingTime: 0
      },
      individualResults: [],
      processingTime: 0,
      aggregationMethod: 'safe_default'
    };
  }

  private createRiskyResult(content: any, type: ModerationContentType, metadata?: any): FilterResult {
    return {
      success: true,
      analysis: {
        id: this.generateId(),
        contentId: this.generateId(),
        contentType: type,
        category: 'custom' as any,
        severity: 'medium' as any,
        confidence: { score: 0.5, confidence: 'medium' },
        action: 'review' as any,
        status: 'completed' as any,
        score: 0.5,
        flags: [{
          id: this.generateId(),
          type: 'filter_error',
          category: 'custom' as any,
          severity: 'medium' as any,
          message: 'Filter processing failed - manual review recommended',
          evidence: [],
          confidence: { score: 0.5, confidence: 'medium' }
        }],
        suggestions: ['Filter processing failed - manual review required'],
        metadata: {
          risky: true,
          filterErrors: true,
          ...metadata
        },
        createdAt: new Date(),
        processedAt: new Date(),
        processingTime: 0
      },
      individualResults: [],
      processingTime: 0,
      aggregationMethod: 'risky_default'
    };
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Filter timeout')), timeout);
    });
  }

  private generateId(): string {
    return `fm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isFilterEnabled(filterName: string): boolean {
    const filter = this.filters.get(filterName);
    return filter ? filter.getConfiguration().enabled : false;
  }

  private emit(event: string, data: any): void {
    // In a real implementation, this would use an EventEmitter
    console.log(`[FilterManager] ${event}:`, data);
  }
}

// Type Definitions
// ================

export interface FilterManagerConfig {
  maxConcurrentFilters: number;
  timeout: number;
  failOpen: boolean;
  aggregateResults: boolean;
}

export interface FilterResult {
  success: boolean;
  analysis: ModerationAnalysis;
  individualResults: IndividualFilterResult[];
  processingTime: number;
  aggregationMethod: string;
}

export interface IndividualFilterResult {
  filterName: string;
  success: boolean;
  analysis: ModerationAnalysis | null;
  processingTime: number;
  error: string | null;
}

export interface FilterInfo {
  name: string;
  version: string;
  description: string;
  capabilities: ContentFilterCapabilities;
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface FilterManagerStatus {
  enabled: boolean;
  totalFilters: number;
  activeFilters: number;
  config: FilterManagerConfig;
  filterRegistry: Record<string, string[]>;
}

export interface FilterStatistics {
  totalProcessed: number;
  flaggedContent: number;
  blockedContent: number;
  averageProcessingTime: number;
  filterUsage: Record<string, number>;
  topFlaggedCategories: Array<{
    category: string;
    count: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}