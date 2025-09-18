// Analytics Package Exports
// =========================

export { OfflineAnalyticsService } from './OfflineAnalyticsService';
export { ReportingService } from './ReportingService';

export type {
  AnalyticsConfig,
  AlertThresholds,
  ReportTemplate,
  ReportFilter,
  ReportSchedule,
  DashboardConfig,
  DashboardLayout,
  WidgetConfig,
  WidgetType,
  WidgetPosition,
  WidgetSize,
  WidgetConfigData,
  DataSource,
  TimeRange,
  AnalyticsDataPoint,
  AnalyticsAggregation,
  AnalyticsInsight,
  AnalyticsReport,
  ReportGenerationConfig,
  ReportRenderer,
  RenderOptions,
  BrandingConfig,
  GeneratedReport,
  ChartConfig,
  ChartData,
  ChartDataset,
  ChartOptions,
  ChartPlugins,
  ChartLegend,
  ChartTooltip,
  ChartTitle,
  ChartFont,
  ChartScales,
  ChartScale,
  ChartGrid,
  ChartAnimation,
  ChartPosition,
  TableConfig,
  TableColumn,
  TableOptions,
  TablePosition,
  ReportMetadata,
  AccessControl,
  AuditEntry,
  ReportRecipient,
  ReportExport,
  ReportShare,
  ReportTemplateBuilder,
  TemplateBuilderConfig,
  TemplateSection,
  TemplateWidget,
  TemplateLayout,
  TemplateStyling,
  TemplateValidation,
  WidgetValidation
} from './OfflineAnalyticsService';

/**
 * Analytics Factory Functions
 */

/**
 * Create default analytics configuration
 */
export function createDefaultAnalyticsConfig(): AnalyticsConfig {
  return {
    enableRealtimeAnalytics: true,
    enablePredictiveAnalytics: true,
    enableAnomalyDetection: true,
    enableUsageTracking: true,
    enablePerformanceMonitoring: true,
    enableCostTracking: true,
    enableUserBehaviorTracking: true,
    enableNetworkAnalytics: true,
    enableStorageAnalytics: true,
    enableSyncAnalytics: true,
    enableConflictAnalytics: true,
    dataRetentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
    aggregationInterval: 5 * 60 * 1000, // 5 minutes
    samplingRate: 1.0,
    maxDataPoints: 100000,
    enableCompression: true,
    enableEncryption: false,
    enableExport: true,
    enableAlerting: true,
    alertThresholds: {
      highErrorRate: 0.1,
      lowSuccessRate: 0.8,
      highLatency: 10000,
      lowThroughput: 10,
      highMemoryUsage: 0.8,
      highStorageUsage: 0.85,
      highConflictRate: 0.2,
      lowNetworkQuality: 0.3
    },
    reportTemplates: [
      {
        id: 'daily_summary',
        name: 'Daily Summary',
        description: 'Daily system performance summary',
        type: 'summary',
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'hour'
        },
        metrics: ['operations', 'success_rate', 'latency', 'throughput'],
        filters: [],
        format: 'pdf',
        enabled: true
      },
      {
        id: 'weekly_trends',
        name: 'Weekly Trends',
        description: 'Weekly usage and performance trends',
        type: 'trend',
        timeRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'day'
        },
        metrics: ['operations', 'data_transferred', 'active_users'],
        filters: [],
        format: 'html',
        enabled: true
      }
    ],
    dashboardConfigs: [
      {
        id: 'system_health',
        name: 'System Health Dashboard',
        description: 'Real-time system health monitoring',
        layout: {
          type: 'grid',
          columns: 4,
          spacing: 16,
          responsive: true
        },
        widgets: [
          {
            id: 'storage_usage',
            type: 'gauge',
            title: 'Storage Usage',
            description: 'Current storage utilization',
            position: { row: 0, column: 0 },
            size: { width: 1, height: 1 },
            config: {
              thresholds: [70, 85, 95]
            },
            dataSource: {
              type: 'query',
              query: 'storage_usage',
              refreshInterval: 30000,
              cache: true
            },
            refreshInterval: 30000,
            enabled: true
          },
          {
            id: 'success_rate',
            type: 'metric',
            title: 'Success Rate',
            description: 'Operation success percentage',
            position: { row: 0, column: 1 },
            size: { width: 1, height: 1 },
            config: {
              aggregation: 'avg'
            },
            dataSource: {
              type: 'query',
              query: 'success_rate',
              refreshInterval: 30000,
              cache: true
            },
            refreshInterval: 30000,
            enabled: true
          }
        ],
        refreshInterval: 30000,
        enableRealtime: true,
        enableExport: true,
        enabled: true
      }
    ]
  };
}

/**
 * Create performance analytics configuration
 */
export function createPerformanceAnalyticsConfig(): AnalyticsConfig {
  const config = createDefaultAnalyticsConfig();

  return {
    ...config,
    enablePredictiveAnalytics: true,
    enableAnomalyDetection: true,
    dataRetentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
    aggregationInterval: 1 * 60 * 1000, // 1 minute
    maxDataPoints: 1000000,
    alertThresholds: {
      ...config.alertThresholds,
      highLatency: 5000,
      lowThroughput: 50,
      highMemoryUsage: 0.7,
      highStorageUsage: 0.8
    },
    reportTemplates: [
      ...config.reportTemplates,
      {
        id: 'performance_analysis',
        name: 'Performance Analysis',
        description: 'Detailed performance metrics and analysis',
        type: 'detailed',
        timeRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date(),
          granularity: 'minute'
        },
        metrics: ['latency', 'throughput', 'cpu_usage', 'memory_usage'],
        filters: [],
        format: 'pdf',
        enabled: true
      }
    ]
  };
}

/**
 * Create basic analytics configuration
 */
export function createBasicAnalyticsConfig(): AnalyticsConfig {
  const config = createDefaultAnalyticsConfig();

  return {
    ...config,
    enablePredictiveAnalytics: false,
    enableAnomalyDetection: false,
    enableCostTracking: false,
    enableUserBehaviorTracking: false,
    dataRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    aggregationInterval: 15 * 60 * 1000, // 15 minutes
    samplingRate: 0.1,
    maxDataPoints: 10000,
    enableAlerting: false,
    reportTemplates: config.reportTemplates.filter(t => t.id === 'daily_summary'),
    dashboardConfigs: config.dashboardConfigs.filter(d => d.id === 'system_health')
  };
}

/**
 * Create default report generation configuration
 */
export function createDefaultReportGenerationConfig(): ReportGenerationConfig {
  return {
    enableScheduledReports: true,
    enableRealtimeReports: true,
    enableExport: true,
    enableSharing: true,
    enableNotifications: true,
    enableVersioning: true,
    maxReportVersions: 5,
    defaultFormat: 'pdf',
    templateCacheEnabled: true,
    templateCacheTTL: 3600000, // 1 hour
    renderingTimeout: 30000,
    maxReportSize: 50 * 1024 * 1024, // 50MB
    compressionEnabled: true,
    encryptionEnabled: false,
    watermarkEnabled: false,
    brandingEnabled: false
  };
}

/**
 * Create secure report generation configuration
 */
export function createSecureReportGenerationConfig(): ReportGenerationConfig {
  return {
    ...createDefaultReportGenerationConfig(),
    encryptionEnabled: true,
    watermarkEnabled: true,
    brandingEnabled: true,
    maxReportSize: 10 * 1024 * 1024, // 10MB
    enableSharing: false,
    enableNotifications: false
  };
}

/**
 * Create offline analytics service
 */
export function createOfflineAnalyticsService(
  config: AnalyticsConfig = createDefaultAnalyticsConfig(),
  storage: IStorageService,
  syncService: ISyncService,
  conflictResolver: IConflictResolver,
  offlineUI: IOfflineUI,
  queue: BackgroundSyncQueue
): OfflineAnalyticsService {
  return new OfflineAnalyticsService(config, storage, syncService, conflictResolver, offlineUI, queue);
}

/**
 * Create reporting service
 */
export function createReportingService(
  config: ReportGenerationConfig = createDefaultReportGenerationConfig(),
  storage: IStorageService
): ReportingService {
  return new ReportingService(config, storage);
}

/**
 * Analytics Utilities
 */

/**
 * Create time range
 */
export function createTimeRange(
  start: Date | string,
  end: Date | string,
  granularity: TimeRange['granularity'] = 'hour'
): TimeRange {
  return {
    start: typeof start === 'string' ? new Date(start) : start,
    end: typeof end === 'string' ? new Date(end) : end,
    granularity
  };
}

/**
 * Create daily time range
 */
export function createDailyTimeRange(days: number = 1): TimeRange {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return createTimeRange(start, end, 'hour');
}

/**
 * Create weekly time range
 */
export function createWeeklyTimeRange(weeks: number = 1): TimeRange {
  const end = new Date();
  const start = new Date(end.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
  return createTimeRange(start, end, 'day');
}

/**
 * Create monthly time range
 */
export function createMonthlyTimeRange(months: number = 1): TimeRange {
  const end = new Date();
  const start = new Date(end.getTime() - months * 30 * 24 * 60 * 60 * 1000);
  return createTimeRange(start, end, 'day');
}

/**
 * Validate analytics configuration
 */
export function validateAnalyticsConfig(config: AnalyticsConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.dataRetentionPeriod <= 0) {
    errors.push('dataRetentionPeriod must be greater than 0');
  }

  if (config.aggregationInterval <= 0) {
    errors.push('aggregationInterval must be greater than 0');
  }

  if (config.samplingRate < 0 || config.samplingRate > 1) {
    errors.push('samplingRate must be between 0 and 1');
  }

  if (config.maxDataPoints <= 0) {
    errors.push('maxDataPoints must be greater than 0');
  }

  if (config.alertThresholds.highErrorRate < 0 || config.alertThresholds.highErrorRate > 1) {
    errors.push('highErrorRate must be between 0 and 1');
  }

  if (config.alertThresholds.lowSuccessRate < 0 || config.alertThresholds.lowSuccessRate > 1) {
    errors.push('lowSuccessRate must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate report template
 */
export function validateReportTemplate(template: ReportTemplate): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!template.id) {
    errors.push('Template ID is required');
  }

  if (!template.name) {
    errors.push('Template name is required');
  }

  if (!template.metrics || template.metrics.length === 0) {
    errors.push('Template must have at least one metric');
  }

  if (template.timeRange.start >= template.timeRange.end) {
    errors.push('Time range start must be before end');
  }

  if (!['summary', 'detailed', 'trend', 'comparison', 'forecast'].includes(template.type)) {
    errors.push('Invalid template type');
  }

  if (!['pdf', 'csv', 'json', 'html'].includes(template.format)) {
    errors.push('Invalid template format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate dashboard configuration
 */
export function validateDashboardConfig(config: DashboardConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Dashboard ID is required');
  }

  if (!config.name) {
    errors.push('Dashboard name is required');
  }

  if (!config.widgets || config.widgets.length === 0) {
    errors.push('Dashboard must have at least one widget');
  }

  if (config.refreshInterval <= 0) {
    errors.push('refreshInterval must be greater than 0');
  }

  // Validate widgets
  config.widgets.forEach((widget, index) => {
    if (!widget.id) {
      errors.push(`Widget ${index + 1} ID is required`);
    }

    if (!widget.type) {
      errors.push(`Widget ${index + 1} type is required`);
    }

    if (!widget.dataSource) {
      errors.push(`Widget ${index + 1} dataSource is required`);
    }

    if (widget.refreshInterval <= 0) {
      errors.push(`Widget ${index + 1} refreshInterval must be greater than 0`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate analytics metrics
 */
export function calculateAnalyticsMetrics(dataPoints: AnalyticsDataPoint[]): {
  totalDataPoints: number;
  dateRange: { start: Date; end: Date };
  uniqueMetrics: string[];
  dataQuality: { good: number; warning: number; error: number };
  volumeByMetric: Record<string, number>;
} {
  const totalDataPoints = dataPoints.length;

  const timestamps = dataPoints.map(d => d.timestamp);
  const dateRange = {
    start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
    end: new Date(Math.max(...timestamps.map(t => t.getTime())))
  };

  const uniqueMetrics = [...new Set(dataPoints.map(d => d.metric))];

  const dataQuality = dataPoints.reduce((acc, d) => {
    acc[d.quality]++;
    return acc;
  }, { good: 0, warning: 0, error: 0 });

  const volumeByMetric = dataPoints.reduce((acc, d) => {
    acc[d.metric] = (acc[d.metric] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalDataPoints,
    dateRange,
    uniqueMetrics,
    dataQuality,
    volumeByMetric
  };
}

/**
 * Generate analytics insights
 */
export function generateAnalyticsInsights(
  dataPoints: AnalyticsDataPoint[],
  timeRange: TimeRange
): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = [];

  // Calculate basic statistics
  const metrics = calculateAnalyticsMetrics(dataPoints);

  // Generate data volume insight
  if (metrics.totalDataPoints < 100) {
    insights.push({
      id: 'low_data_volume',
      type: 'recommendation',
      title: 'Low Data Volume',
      description: `Only ${metrics.totalDataPoints} data points collected in the specified time range`,
      confidence: 0.8,
      severity: 'low',
      impact: 'low',
      data: { totalDataPoints: metrics.totalDataPoints },
      recommendations: [
        'Consider increasing data collection frequency',
        'Check if data collection is working properly'
      ],
      timestamp: new Date()
    });
  }

  // Generate data quality insight
  const errorRate = metrics.dataQuality.error / metrics.totalDataPoints;
  if (errorRate > 0.1) {
    insights.push({
      id: 'high_error_rate',
      type: 'anomaly',
      title: 'High Error Rate',
      description: `${(errorRate * 100).toFixed(1)}% of data points have error quality`,
      confidence: 0.9,
      severity: 'high',
      impact: 'high',
      data: { errorRate, errors: metrics.dataQuality.error },
      recommendations: [
        'Investigate the source of data quality issues',
        'Implement data validation and error handling'
      ],
      timestamp: new Date()
    });
  }

  // Generate trend insight
  const trendData = analyzeDataTrend(dataPoints);
  if (trendData.trend !== 'stable') {
    insights.push({
      id: 'significant_trend',
      type: 'trend',
      title: `Significant ${trendData.trend} Trend Detected`,
      description: `${trendData.metric} shows a ${trendData.trend} trend of ${trendData.changePercent.toFixed(1)}%`,
      confidence: Math.abs(trendData.changePercent) / 100,
      severity: Math.abs(trendData.changePercent) > 20 ? 'high' : 'medium',
      impact: 'medium',
      data: trendData,
      recommendations: [
        'Monitor this trend closely',
        'Investigate the underlying causes'
      ],
      timestamp: new Date()
    });
  }

  return insights;
}

/**
 * Analyze data trend
 */
function analyzeDataTrend(dataPoints: AnalyticsDataPoint[]): {
  trend: 'increasing' | 'decreasing' | 'stable';
  metric: string;
  changePercent: number;
  data: any;
} {
  if (dataPoints.length < 2) {
    return {
      trend: 'stable',
      metric: 'unknown',
      changePercent: 0,
      data: {}
    };
  }

  // Group by metric and calculate trend
  const metricGroups = dataPoints.reduce((acc, d) => {
    if (!acc[d.metric]) {
      acc[d.metric] = [];
    }
    acc[d.metric].push(d);
    return acc;
  }, {} as Record<string, AnalyticsDataPoint[]>);

  // Find metric with most significant trend
  let mostSignificantTrend = {
    trend: 'stable' as 'increasing' | 'decreasing' | 'stable',
    metric: 'unknown',
    changePercent: 0,
    data: {}
  };

  for (const [metric, points] of Object.entries(metricGroups)) {
    if (points.length < 2) continue;

    // Sort by timestamp
    points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate simple linear regression
    const n = points.length;
    const sumX = points.reduce((sum, _, i) => sum + i, 0);
    const sumY = points.reduce((sum, p) => sum + p.value, 0);
    const sumXY = points.reduce((sum, p, i) => sum + i * p.value, 0);
    const sumXX = points.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate trend
    const firstValue = points[0].value;
    const lastValue = points[points.length - 1].value;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(changePercent) > 5) {
      trend = changePercent > 0 ? 'increasing' : 'decreasing';
    }

    if (Math.abs(changePercent) > Math.abs(mostSignificantTrend.changePercent)) {
      mostSignificantTrend = {
        trend,
        metric,
        changePercent,
        data: { slope, intercept, firstValue, lastValue }
      };
    }
  }

  return mostSignificantTrend;
}

/**
 * Import required interfaces
 */
import { IStorageService, ISyncService, IConflictResolver, IOfflineUI } from '../types';
import { BackgroundSyncQueue } from '../queue/BackgroundSyncQueue';