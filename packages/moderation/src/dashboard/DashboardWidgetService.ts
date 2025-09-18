import { EventEmitter } from 'events';
import {
  UserReport,
  ReviewWorkflow,
  ModerationDecision,
  ReportStatus,
  ReportSeverity,
  ReportType
} from '../types/ModerationTypes';
import { IModerationDashboardService } from './ModerationDashboardService';
import { IDashboardAnalyticsEngine } from './DashboardAnalyticsEngine';

/**
 * Dashboard Widget Service
 * Manages dashboard widgets, their configuration, and data retrieval
 */
export interface IDashboardWidgetService {
  /**
   * Get widget data
   */
  getWidgetData(widgetId: string, options?: WidgetOptions): Promise<WidgetData>;

  /**
   * Get multiple widget data in batch
   */
  getBatchWidgetData(widgetIds: string[], options?: WidgetOptions): Promise<BatchWidgetData>;

  /**
   * Register a new widget type
   */
  registerWidgetType(type: string, config: WidgetTypeConfig): void;

  /**
   * Get available widget types
   */
  getWidgetTypes(): WidgetTypeConfig[];

  /**
   * Get widget configuration
   */
  getWidgetConfiguration(widgetId: string): Promise<WidgetConfiguration>;

  /**
   * Update widget configuration
   */
  updateWidgetConfiguration(widgetId: string, config: Partial<WidgetConfiguration>): Promise<WidgetConfiguration>;

  /**
   * Create widget preset
   */
  createWidgetPreset(preset: WidgetPreset): Promise<WidgetPreset>;

  /**
   * Get widget presets
   */
  getWidgetPresets(): WidgetPreset[];

  /**
   * Generate widget recommendations
   */
  generateWidgetRecommendations(context: RecommendationContext): Promise<WidgetRecommendation[]>;

  /**
   * Validate widget configuration
   */
  validateWidgetConfiguration(config: WidgetConfiguration): ValidationResult;

  /**
   * Get widget performance metrics
   */
  getWidgetPerformance(widgetId: string, timeRange?: TimeRange): Promise<WidgetPerformance>;
}

export interface WidgetOptions {
  timeRange?: TimeRange;
  filters?: WidgetFilters;
  refreshInterval?: number;
  cacheKey?: string;
  includeHistorical?: boolean;
}

export interface WidgetFilters {
  contentType?: string[];
  severity?: ReportSeverity[];
  status?: ReportStatus[];
  team?: string[];
  assignee?: string[];
  dateRange?: TimeRange;
}

export interface WidgetData {
  widgetId: string;
  type: string;
  data: any;
  metadata: WidgetMetadata;
  timestamp: Date;
  cacheInfo?: CacheInfo;
}

export interface WidgetMetadata {
  title: string;
  description?: string;
  dataSource: string;
  lastUpdated: Date;
  dataPoints: number;
  refreshInterval: number;
  version: string;
}

export interface CacheInfo {
  cached: boolean;
  cacheTime: Date;
  ttl: number;
  key: string;
}

export interface BatchWidgetData {
  widgets: Record<string, WidgetData>;
  errors: Record<string, string>;
  timestamp: Date;
}

export interface WidgetTypeConfig {
  type: string;
  name: string;
  description: string;
  category: 'overview' | 'metrics' | 'charts' | 'lists' | 'tables';
  supportedDataTypes: string[];
  defaultConfig: Record<string, any>;
  validationSchema: any;
  dataResolver: (config: WidgetConfiguration, options: WidgetOptions) => Promise<any>;
  refreshable: boolean;
  realtime: boolean;
}

export interface WidgetConfiguration {
  id: string;
  type: string;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: Record<string, any>;
  visibility: WidgetVisibility;
  refresh: RefreshConfig;
  filters: WidgetFilters;
  theme: WidgetTheme;
}

export interface WidgetPosition {
  x: number;
  y: number;
  zIndex?: number;
}

export interface WidgetSize {
  width: number; // in grid units
  height: number; // in grid units
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface WidgetVisibility {
  visible: boolean;
  roles?: string[];
  conditions?: VisibilityCondition[];
}

export interface VisibilityCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface RefreshConfig {
  enabled: boolean;
  interval: number; // in seconds
  onEvent?: string[];
  manualOnly?: boolean;
}

export interface WidgetTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  chartTheme?: 'light' | 'dark' | 'colored';
}

export interface WidgetPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  widgets: Omit<WidgetConfiguration, 'id'>[];
  layout: PresetLayout;
  tags: string[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PresetLayout {
  columns: number;
  spacing: number;
  breakpoints?: Record<string, { columns: number; widgetSize: number }>;
}

export interface RecommendationContext {
  userRole: string;
    team?: string;
  currentWidgets: string[];
  dashboardType: 'overview' | 'detailed' | 'team' | 'executive';
  timeRange: TimeRange;
}

export interface WidgetRecommendation {
  widgetType: string;
  reason: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  suggestedPosition?: WidgetPosition;
  suggestedSize?: WidgetSize;
  config?: Record<string, any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WidgetPerformance {
  loadTime: number;
  errorRate: number;
  cacheHitRate: number;
  dataFreshness: number;
  lastUpdated: Date;
  usage: WidgetUsage;
}

export interface WidgetUsage {
  views: number;
  interactions: number;
  lastViewed: Date;
  averageViewTime: number;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

/**
 * Dashboard Widget Service Implementation
 */
export class DashboardWidgetService extends EventEmitter implements IDashboardWidgetService {
  private widgetTypes: Map<string, WidgetTypeConfig> = new Map();
  private widgetConfigs: Map<string, WidgetConfiguration> = new Map();
  private widgetPresets: Map<string, WidgetPreset> = new Map();
  private cache: Map<string, { data: WidgetData; timestamp: Date; ttl: number }> = new Map();
  private performanceMetrics: Map<string, WidgetPerformance> = new Map();

  constructor(
    private dashboardService: IModerationDashboardService,
    private analyticsEngine: IDashboardAnalyticsEngine
  ) {
    super();
    this.initializeWidgetTypes();
    this.initializeDefaultPresets();
  }

  async getWidgetData(widgetId: string, options: WidgetOptions = {}): Promise<WidgetData> {
    const config = this.widgetConfigs.get(widgetId);
    if (!config) {
      throw new Error(`Widget configuration not found: ${widgetId}`);
    }

    // Check cache first
    const cacheKey = options.cacheKey || this.generateCacheKey(widgetId, options);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < cached.ttl) {
      return {
        ...cached.data,
        cacheInfo: {
          cached: true,
          cacheTime: cached.timestamp,
          ttl: cached.ttl,
          key: cacheKey
        }
      };
    }

    // Get widget type
    const widgetType = this.widgetTypes.get(config.type);
    if (!widgetType) {
      throw new Error(`Widget type not found: ${config.type}`);
    }

    // Resolve data
    const startTime = Date.now();
    try {
      const data = await widgetType.dataResolver(config, options);
      const loadTime = Date.now() - startTime;

      const widgetData: WidgetData = {
        widgetId,
        type: config.type,
        data,
        metadata: {
          title: config.title,
          description: config.description,
          dataSource: 'moderation_system',
          lastUpdated: new Date(),
          dataPoints: this.estimateDataPoints(data),
          refreshInterval: config.refresh.interval,
          version: '1.0'
        },
        timestamp: new Date()
      };

      // Cache the result
      const ttl = options.refreshInterval || config.refresh.interval * 1000;
      this.cache.set(cacheKey, {
        data: widgetData,
        timestamp: new Date(),
        ttl
      });

      // Update performance metrics
      this.updatePerformanceMetrics(widgetId, {
        loadTime,
        errorRate: 0,
        cacheHitRate: 0,
        dataFreshness: 100,
        lastUpdated: new Date(),
        usage: this.getUsageMetrics(widgetId)
      });

      return widgetData;

    } catch (error) {
      // Update performance metrics with error
      this.updatePerformanceMetrics(widgetId, {
        loadTime: Date.now() - startTime,
        errorRate: 1,
        cacheHitRate: 0,
        dataFreshness: 0,
        lastUpdated: new Date(),
        usage: this.getUsageMetrics(widgetId)
      });

      throw error;
    }
  }

  async getBatchWidgetData(widgetIds: string[], options: WidgetOptions = {}): Promise<BatchWidgetData> {
    const widgets: Record<string, WidgetData> = {};
    const errors: Record<string, string> = {};

    // Process widgets in parallel
    const promises = widgetIds.map(async (widgetId) => {
      try {
        const data = await this.getWidgetData(widgetId, options);
        widgets[widgetId] = data;
      } catch (error) {
        errors[widgetId] = error.message;
      }
    });

    await Promise.all(promises);

    return {
      widgets,
      errors,
      timestamp: new Date()
    };
  }

  registerWidgetType(type: string, config: WidgetTypeConfig): void {
    this.widgetTypes.set(type, config);
    this.emit('widget_type_registered', { type, config });
  }

  getWidgetTypes(): WidgetTypeConfig[] {
    return Array.from(this.widgetTypes.values());
  }

  async getWidgetConfiguration(widgetId: string): Promise<WidgetConfiguration> {
    const config = this.widgetConfigs.get(widgetId);
    if (!config) {
      throw new Error(`Widget configuration not found: ${widgetId}`);
    }
    return config;
  }

  async updateWidgetConfiguration(widgetId: string, config: Partial<WidgetConfiguration>): Promise<WidgetConfiguration> {
    const existing = this.widgetConfigs.get(widgetId);
    if (!existing) {
      throw new Error(`Widget configuration not found: ${widgetId}`);
    }

    const updated = {
      ...existing,
      ...config,
      id: widgetId // Preserve ID
    };

    // Validate configuration
    const validation = this.validateWidgetConfiguration(updated);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    this.widgetConfigs.set(widgetId, updated);
    this.emit('widget_configuration_updated', { widgetId, config: updated });

    return updated;
  }

  async createWidgetPreset(preset: Omit<WidgetPreset, 'id' | 'createdAt' | 'updatedAt'>): Promise<WidgetPreset> {
    const newPreset: WidgetPreset = {
      ...preset,
      id: this.generatePresetId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.widgetPresets.set(newPreset.id, newPreset);
    this.emit('widget_preset_created', { preset: newPreset });

    return newPreset;
  }

  getWidgetPresets(): WidgetPreset[] {
    return Array.from(this.widgetPresets.values());
  }

  async generateWidgetRecommendations(context: RecommendationContext): Promise<WidgetRecommendation[]> {
    const recommendations: WidgetRecommendation[] = [];

    // Analyze current widget setup
    const currentWidgetTypes = new Set(
      context.currentWidgets.map(id => this.widgetConfigs.get(id)?.type).filter(Boolean)
    );

    // Recommend overview widgets for new dashboards
    if (context.currentWidgets.length === 0) {
      recommendations.push({
        widgetType: 'overview_summary',
        reason: 'Essential overview metrics for new dashboard',
        confidence: 0.95,
        priority: 'high',
        suggestedPosition: { x: 0, y: 0 },
        suggestedSize: { width: 4, height: 2 }
      });
    }

    // Recommend team performance widgets for team dashboards
    if (context.dashboardType === 'team' && !currentWidgetTypes.has('team_performance')) {
      recommendations.push({
        widgetType: 'team_performance',
        reason: 'Team performance metrics are essential for team dashboards',
        confidence: 0.9,
        priority: 'high',
        suggestedPosition: { x: 0, y: 2 },
        suggestedSize: { width: 4, height: 3 }
      });
    }

    // Recommend trend analysis widgets
    if (!currentWidgetTypes.has('trend_analysis') && context.dashboardType === 'detailed') {
      recommendations.push({
        widgetType: 'trend_analysis',
        reason: 'Trend analysis provides valuable insights for detailed dashboards',
        confidence: 0.8,
        priority: 'medium',
        suggestedPosition: { x: 4, y: 0 },
        suggestedSize: { width: 4, height: 3 }
      });
    }

    // Recommend queue status widgets
    if (!currentWidgetTypes.has('queue_status') && context.dashboardType === 'overview') {
      recommendations.push({
        widgetType: 'queue_status',
        reason: 'Queue status is important for operational overview',
        confidence: 0.7,
        priority: 'medium',
        suggestedPosition: { x: 8, y: 0 },
        suggestedSize: { width: 4, height: 2 }
      });
    }

    // Recommend risk assessment widgets for executive dashboards
    if (context.dashboardType === 'executive' && !currentWidgetTypes.has('risk_assessment')) {
      recommendations.push({
        widgetType: 'risk_assessment',
        reason: 'Risk assessment is crucial for executive decision making',
        confidence: 0.85,
        priority: 'high',
        suggestedPosition: { x: 0, y: 5 },
        suggestedSize: { width: 6, height: 3 }
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  validateWidgetConfiguration(config: WidgetConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.type) {
      errors.push('Widget type is required');
    }

    if (!config.title) {
      errors.push('Widget title is required');
    }

    // Validate widget type exists
    if (config.type && !this.widgetTypes.has(config.type)) {
      errors.push(`Unknown widget type: ${config.type}`);
    }

    // Validate position
    if (config.position.x < 0 || config.position.y < 0) {
      errors.push('Widget position must have positive coordinates');
    }

    // Validate size
    if (config.size.width <= 0 || config.size.height <= 0) {
      errors.push('Widget size must be positive');
    }

    // Check against widget type specific validation
    if (config.type) {
      const widgetType = this.widgetTypes.get(config.type);
      if (widgetType && widgetType.validationSchema) {
        const typeValidation = this.validateAgainstSchema(config.config, widgetType.validationSchema);
        errors.push(...typeValidation.errors);
        warnings.push(...typeValidation.warnings);
      }
    }

    // Performance warnings
    if (config.refresh.enabled && config.refresh.interval < 30) {
      warnings.push('Refresh interval less than 30 seconds may impact performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getWidgetPerformance(widgetId: string, timeRange?: TimeRange): Promise<WidgetPerformance> {
    const performance = this.performanceMetrics.get(widgetId);
    if (!performance) {
      // Return default performance metrics
      return {
        loadTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        dataFreshness: 100,
        lastUpdated: new Date(),
        usage: {
          views: 0,
          interactions: 0,
          lastViewed: new Date(),
          averageViewTime: 0
        }
      };
    }

    return performance;
  }

  // Private helper methods
  // =====================

  private initializeWidgetTypes(): void {
    // Overview Summary Widget
    this.registerWidgetType('overview_summary', {
      type: 'overview_summary',
      name: 'Overview Summary',
      description: 'Key metrics and summary statistics',
      category: 'overview',
      supportedDataTypes: ['numeric', 'text'],
      defaultConfig: {
        showCharts: true,
        showTrends: true,
        metricCount: 6
      },
      validationSchema: {
        type: 'object',
        properties: {
          showCharts: { type: 'boolean' },
          showTrends: { type: 'boolean' },
          metricCount: { type: 'number', minimum: 1, maximum: 12 }
        }
      },
      dataResolver: async (config, options) => {
        const overview = await this.dashboardService.getOverview({
          timeRange: options.timeRange,
          includeRealTime: true,
          filters: options.filters
        });
        return overview;
      },
      refreshable: true,
      realtime: true
    });

    // Queue Status Widget
    this.registerWidgetType('queue_status', {
      type: 'queue_status',
      name: 'Queue Status',
      description: 'Current moderation queue status and workload',
      category: 'metrics',
      supportedDataTypes: ['numeric', 'status'],
      defaultConfig: {
        showDetails: true,
        sortBy: 'priority',
        maxItems: 10
      },
      validationSchema: {
        type: 'object',
        properties: {
          showDetails: { type: 'boolean' },
          sortBy: { type: 'string', enum: ['priority', 'wait_time', 'assignee'] },
          maxItems: { type: 'number', minimum: 1, maximum: 50 }
        }
      },
      dataResolver: async (config, options) => {
        const queueStatus = await this.dashboardService.getQueueStatus({
          includeDetails: config.showDetails,
          sortBy: config.sortBy,
          limit: config.maxItems
        });
        return queueStatus;
      },
      refreshable: true,
      realtime: true
    });

    // Team Performance Widget
    this.registerWidgetType('team_performance', {
      type: 'team_performance',
      name: 'Team Performance',
      description: 'Team member performance and workload metrics',
      category: 'metrics',
      supportedDataTypes: ['numeric', 'chart'],
      defaultConfig: {
        showCharts: true,
        sortBy: 'accuracy',
        includeUtilization: true
      },
      validationSchema: {
        type: 'object',
        properties: {
          showCharts: { type: 'boolean' },
          sortBy: { type: 'string', enum: ['accuracy', 'throughput', 'utilization'] },
          includeUtilization: { type: 'boolean' }
        }
      },
      dataResolver: async (config, options) => {
        const teamPerformance = await this.dashboardService.getTeamPerformance(
          options.filters?.team?.[0],
          options.timeRange
        );
        return teamPerformance;
      },
      refreshable: true,
      realtime: false
    });

    // Trend Analysis Widget
    this.registerWidgetType('trend_analysis', {
      type: 'trend_analysis',
      name: 'Trend Analysis',
      description: 'Trend analysis and forecasting',
      category: 'charts',
      supportedDataTypes: ['time_series', 'numeric'],
      defaultConfig: {
        metrics: ['reports', 'resolution_time', 'accuracy'],
        period: 'daily',
        showPredictions: true,
        chartType: 'line'
      },
      validationSchema: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: { type: 'string' }
          },
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          showPredictions: { type: 'boolean' },
          chartType: { type: 'string', enum: ['line', 'area', 'bar'] }
        }
      },
      dataResolver: async (config, options) => {
        const trendAnalysis = await this.dashboardService.getTrendAnalysis({
          metrics: config.metrics,
          period: config.period as any,
          includePredictions: config.showPredictions,
          timeRange: options.timeRange
        });
        return trendAnalysis;
      },
      refreshable: true,
      realtime: false
    });

    // Risk Assessment Widget
    this.registerWidgetType('risk_assessment', {
      type: 'risk_assessment',
      name: 'Risk Assessment',
      description: 'Risk assessment and mitigation strategies',
      category: 'overview',
      supportedDataTypes: ['risk', 'text'],
      defaultConfig: {
        showMitigation: true,
        riskThreshold: 'medium',
        includeDetails: true
      },
      validationSchema: {
        type: 'object',
        properties: {
          showMitigation: { type: 'boolean' },
          riskThreshold: { type: 'string', enum: ['low', 'medium', 'high'] },
          includeDetails: { type: 'boolean' }
        }
      },
      dataResolver: async (config, options) => {
        // Risk assessment would be calculated from analytics engine
        const metrics = await this.analyticsEngine.calculateMetrics(
          options.timeRange || { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
          options.filters
        );
        const trends = await this.analyticsEngine.analyzeTrends(
          ['accuracy', 'resolution_time', 'throughput'],
          options.timeRange || { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() }
        );
        const riskAssessment = await this.analyticsEngine.assessRisk(metrics, trends);
        return riskAssessment;
      },
      refreshable: true,
      realtime: false
    });

    // Content Analysis Widget
    this.registerWidgetType('content_analysis', {
      type: 'content_analysis',
      name: 'Content Analysis',
      description: 'Content analysis and violation metrics',
      category: 'charts',
      supportedDataTypes: ['pie', 'bar', 'numeric'],
      defaultConfig: {
        showChart: true,
        groupBy: 'category',
        showTrends: false
      },
      validationSchema: {
        type: 'object',
        properties: {
          showChart: { type: 'boolean' },
          groupBy: { type: 'string', enum: ['category', 'type', 'severity'] },
          showTrends: { type: 'boolean' }
        }
      },
      dataResolver: async (config, options) => {
        const metrics = await this.dashboardService.getContentAnalysisMetrics(options.filters);
        return metrics;
      },
      refreshable: true,
      realtime: false
    });

    // Alert Widget
    this.registerWidgetType('alerts', {
      type: 'alerts',
      name: 'Alerts',
      description: 'System alerts and notifications',
      category: 'lists',
      supportedDataTypes: ['alert', 'text'],
      defaultConfig: {
        maxAlerts: 10,
        severityFilter: ['high', 'critical'],
        showResolved: false
      },
      validationSchema: {
        type: 'object',
        properties: {
          maxAlerts: { type: 'number', minimum: 1, maximum: 50 },
          severityFilter: { type: 'array', items: { type: 'string' } },
          showResolved: { type: 'boolean' }
        }
      },
      dataResolver: async (config, options) => {
        const alerts = await this.dashboardService.getAlerts({
          severity: config.severityFilter as any,
          status: config.showResolved ? undefined : ['active'],
          limit: config.maxAlerts
        });
        return alerts;
      },
      refreshable: true,
      realtime: true
    });
  }

  private initializeDefaultPresets(): void {
    // Overview Dashboard Preset
    this.widgetPresets.set('overview_dashboard', {
      id: 'overview_dashboard',
      name: 'Overview Dashboard',
      description: 'Comprehensive overview of moderation system',
      category: 'overview',
      isDefault: true,
      tags: ['overview', 'executive'],
      layout: {
        columns: 12,
        spacing: 8
      },
      widgets: [
        {
          type: 'overview_summary',
          title: 'System Overview',
          position: { x: 0, y: 0 },
          size: { width: 8, height: 3 },
          config: { showCharts: true, showTrends: true },
          visibility: { visible: true },
          refresh: { enabled: true, interval: 60 },
          filters: {},
          theme: {}
        },
        {
          type: 'queue_status',
          title: 'Queue Status',
          position: { x: 8, y: 0 },
          size: { width: 4, height: 3 },
          config: { showDetails: true, sortBy: 'priority' },
          visibility: { visible: true },
          refresh: { enabled: true, interval: 30 },
          filters: {},
          theme: {}
        },
        {
          type: 'team_performance',
          title: 'Team Performance',
          position: { x: 0, y: 3 },
          size: { width: 6, height: 4 },
          config: { showCharts: true, includeUtilization: true },
          visibility: { visible: true },
          refresh: { enabled: true, interval: 300 },
          filters: {},
          theme: {}
        },
        {
          type: 'trend_analysis',
          title: 'Trend Analysis',
          position: { x: 6, y: 3 },
          size: { width: 6, height: 4 },
          config: { metrics: ['reports', 'accuracy'], period: 'daily', showPredictions: true },
          visibility: { visible: true },
          refresh: { enabled: true, interval: 600 },
          filters: {},
          theme: {}
        },
        {
          type: 'alerts',
          title: 'System Alerts',
          position: { x: 0, y: 7 },
          size: { width: 12, height: 2 },
          config: { maxAlerts: 10, severityFilter: ['high', 'critical'] },
          visibility: { visible: true },
          refresh: { enabled: true, interval: 60 },
          filters: {},
          theme: {}
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Team Dashboard Preset
    this.widgetPresets.set('team_dashboard', {
      id: 'team_dashboard',
      name: 'Team Dashboard',
      description: 'Team-focused moderation dashboard',
      category: 'team',
      tags: ['team', 'performance'],
      layout: {
        columns: 12,
        spacing: 8
      },
      widgets: [
        {
          type: 'team_performance',
          title: 'Team Performance',
          position: { x: 0, y: 0 },
          size: { width: 8, height: 4 },
          config: { showCharts: true, includeUtilization: true },
          visibility: { visible: true },
          refresh: { enabled: true, interval: 300 },
          filters: {},
          theme: {}
        },
        {
          type: 'queue_status',
          title: 'My Queue',
          position: { x: 8, y: 0 },
          size: { width: 4, height: 4 },
          config: { showDetails: true, sortBy: 'priority' },
          visibility: { visible: true, roles: ['moderator'] },
          refresh: { enabled: true, interval: 30 },
          filters: {},
          theme: {}
        },
        {
          type: 'content_analysis',
          title: 'Content Analysis',
          position: { x: 0, y: 4 },
          size: { width: 6, height: 4 },
          config: { showChart: true, groupBy: 'category' },
          visibility: { visible: true },
          refresh: { enabled: true, interval: 600 },
          filters: {},
          theme: {}
        },
        {
          type: 'risk_assessment',
          title: 'Risk Assessment',
          position: { x: 6, y: 4 },
          size: { width: 6, height: 4 },
          config: { showMitigation: true, riskThreshold: 'medium' },
          visibility: { visible: true, roles: ['team_lead', 'admin'] },
          refresh: { enabled: true, interval: 600 },
          filters: {},
          theme: {}
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  private generateCacheKey(widgetId: string, options: WidgetOptions): string {
    const keyComponents = [
      widgetId,
      JSON.stringify(options.timeRange),
      JSON.stringify(options.filters),
      options.cacheKey || ''
    ];

    return keyComponents.filter(Boolean).join(':');
  }

  private estimateDataPoints(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }

    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    }

    return 1;
  }

  private updatePerformanceMetrics(widgetId: string, metrics: WidgetPerformance): void {
    const existing = this.performanceMetrics.get(widgetId) || {
      loadTime: 0,
      errorRate: 0,
      cacheHitRate: 0,
      dataFreshness: 100,
      lastUpdated: new Date(),
      usage: {
        views: 0,
        interactions: 0,
        lastViewed: new Date(),
        averageViewTime: 0
      }
    };

    // Update with exponential moving average for some metrics
    const updated: WidgetPerformance = {
      ...existing,
      loadTime: this.calculateEMA(metrics.loadTime, existing.loadTime, 0.3),
      errorRate: this.calculateEMA(metrics.errorRate, existing.errorRate, 0.2),
      cacheHitRate: this.calculateEMA(metrics.cacheHitRate, existing.cacheHitRate, 0.1),
      dataFreshness: metrics.dataFreshness,
      lastUpdated: metrics.lastUpdated,
      usage: metrics.usage
    };

    this.performanceMetrics.set(widgetId, updated);
  }

  private getUsageMetrics(widgetId: string): WidgetUsage {
    // Placeholder - in production, this would track actual usage
    return {
      views: Math.floor(Math.random() * 1000),
      interactions: Math.floor(Math.random() * 100),
      lastViewed: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      averageViewTime: Math.random() * 300 // seconds
    };
  }

  private calculateEMA(newValue: number, oldValue: number, alpha: number): number {
    return alpha * newValue + (1 - alpha) * oldValue;
  }

  private validateAgainstSchema(data: any, schema: any): ValidationResult {
    // Placeholder validation - in production, use a proper schema validator
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  private generatePresetId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}