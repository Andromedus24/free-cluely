// Dashboard Package Exports
// =========================

export { ObservabilityDashboard } from './ObservabilityDashboard';
export { DashboardService } from './DashboardService';
export { DashboardRenderer } from './DashboardRenderer';
export type {
  DashboardConfig,
  DashboardWidget,
  DashboardLayout,
  DashboardTheme,
  DashboardExport,
  DashboardShareSettings,
  MetricData,
  LogData,
  TraceData,
  AlertData,
  PerformanceData
} from '../types';

/**
 * Factory Functions
 */

/**
 * Create observability dashboard with default configuration
 */
export function createObservabilityDashboard(
  config: Partial<import('../types').DashboardConfig> = {},
  services: {
    observabilityService: import('../ObservabilityService').ObservabilityService;
    metricsCollector: import('../metrics/MetricsCollector').MetricsCollector;
    logAggregator: import('../logging/LogAggregator').LogAggregator;
    alertManager: import('../alerting/AlertManager').AlertManager;
    performanceMonitor: import('../performance/PerformanceMonitor').PerformanceMonitor;
    tracer: import('../tracing/DistributedTracer').DistributedTracer;
  }
): ObservabilityDashboard {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().dashboard;

  const finalConfig: import('../types').DashboardConfig = {
    autoRefresh: true,
    refreshInterval: 5000,
    defaultLayout: 'default',
    defaultTheme: 'default',
    maxWidgets: 50,
    exportFormats: ['json', 'csv', 'pdf'],
    sharingEnabled: true,
    ...defaultConfig,
    ...config
  };

  return new ObservabilityDashboard(
    finalConfig,
    services.observabilityService,
    services.metricsCollector,
    services.logAggregator,
    services.alertManager,
    services.performanceMonitor,
    services.tracer
  );
}

/**
 * Create production observability dashboard
 */
export function createProductionObservabilityDashboard(
  config: Partial<import('../types').DashboardConfig> = {},
  services: {
    observabilityService: import('../ObservabilityService').ObservabilityService;
    metricsCollector: import('../metrics/MetricsCollector').MetricsCollector;
    logAggregator: import('../logging/LogAggregator').LogAggregator;
    alertManager: import('../alerting/AlertManager').AlertManager;
    performanceMonitor: import('../performance/PerformanceMonitor').PerformanceMonitor;
    tracer: import('../tracing/DistributedTracer').DistributedTracer;
  }
): ObservabilityDashboard {
  const { createProductionObservabilityConfig } = require('../index');
  const defaultConfig = createProductionObservabilityConfig().dashboard;

  const finalConfig: import('../types').DashboardConfig = {
    autoRefresh: true,
    refreshInterval: 10000,
    defaultLayout: 'performance',
    defaultTheme: 'default',
    maxWidgets: 100,
    exportFormats: ['json', 'csv', 'pdf'],
    sharingEnabled: true,
    ...defaultConfig,
    ...config
  };

  return new ObservabilityDashboard(
    finalConfig,
    services.observabilityService,
    services.metricsCollector,
    services.logAggregator,
    services.alertManager,
    services.performanceMonitor,
    services.tracer
  );
}

/**
 * Create development observability dashboard
 */
export function createDevelopmentObservabilityDashboard(
  config: Partial<import('../types').DashboardConfig> = {},
  services: {
    observabilityService: import('../ObservabilityService').ObservabilityService;
    metricsCollector: import('../metrics/MetricsCollector').MetricsCollector;
    logAggregator: import('../logging/LogAggregator').LogAggregator;
    alertManager: import('../alerting/AlertManager').AlertManager;
    performanceMonitor: import('../performance/PerformanceMonitor').PerformanceMonitor;
    tracer: import('../tracing/DistributedTracer').DistributedTracer;
  }
): ObservabilityDashboard {
  const { createDevelopmentObservabilityConfig } = require('../index');
  const defaultConfig = createDevelopmentObservabilityConfig().dashboard;

  const finalConfig: import('../types').DashboardConfig = {
    autoRefresh: true,
    refreshInterval: 2000,
    defaultLayout: 'debugging',
    defaultTheme: 'default',
    maxWidgets: 50,
    exportFormats: ['json', 'csv'],
    sharingEnabled: false,
    ...defaultConfig,
    ...config
  };

  return new ObservabilityDashboard(
    finalConfig,
    services.observabilityService,
    services.metricsCollector,
    services.logAggregator,
    services.alertManager,
    services.performanceMonitor,
    services.tracer
  );
}

/**
 * Create dashboard service
 */
export function createDashboardService(
  config: Partial<import('../types').DashboardConfig> = {},
  services: {
    observabilityService: import('../ObservabilityService').ObservabilityService;
    metricsCollector: import('../metrics/MetricsCollector').MetricsCollector;
    logAggregator: import('../logging/LogAggregator').LogAggregator;
    alertManager: import('../alerting/AlertManager').AlertManager;
    performanceMonitor: import('../performance/PerformanceMonitor').PerformanceMonitor;
    tracer: import('../tracing/DistributedTracer').DistributedTracer;
  }
): DashboardService {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().dashboard;

  const finalConfig: import('../types').DashboardConfig = {
    autoRefresh: true,
    refreshInterval: 5000,
    defaultLayout: 'default',
    defaultTheme: 'default',
    maxWidgets: 50,
    exportFormats: ['json', 'csv', 'pdf'],
    sharingEnabled: true,
    ...defaultConfig,
    ...config
  };

  return new DashboardService(
    finalConfig,
    services.observabilityService,
    services.metricsCollector,
    services.logAggregator,
    services.alertManager,
    services.performanceMonitor,
    services.tracer
  );
}

/**
 * Create dashboard renderer
 */
export function createDashboardRenderer(): DashboardRenderer {
  return new DashboardRenderer();
}

/**
 * Dashboard widget types
 */
export const DashboardWidgetTypes = {
  // Metric widgets
  GAUGE: 'gauge',
  LINE_CHART: 'line-chart',
  BAR_CHART: 'bar-chart',
  PIE_CHART: 'pie-chart',
  SCORE_CARD: 'score-card',
  COUNTER: 'counter',
  AREA_CHART: 'area-chart',
  SCATTER_PLOT: 'scatter-plot',
  HEATMAP: 'heatmap',

  // Log widgets
  LOG_LIST: 'log-list',
  LOG_SUMMARY: 'log-summary',
  LOG_TREND: 'log-trend',
  LOG_PATTERN: 'log-pattern',

  // Alert widgets
  ALERT_LIST: 'alert-list',
  ALERT_SUMMARY: 'alert-summary',
  ALERT_TREND: 'alert-trend',
  ALERT_DISTRIBUTION: 'alert-distribution',

  // Trace widgets
  TRACE_LIST: 'trace-list',
  TRACE_TIMELINE: 'trace-timeline',
  TRACE_DEPENDENCY: 'trace-dependency',
  TRACE_PERFORMANCE: 'trace-performance',

  // System widgets
  HEALTH_STATUS: 'health-status',
  SYSTEM_INFO: 'system-info',
  RESOURCE_USAGE: 'resource-usage',
  SERVICE_STATUS: 'service-status',

  // Custom widgets
  CUSTOM: 'custom',
  HTML: 'html',
  IFRAME: 'iframe',
  MARKDOWN: 'markdown'
} as const;

/**
 * Dashboard layout presets
 */
export const DashboardLayoutPresets = {
  DEFAULT: 'default',
  PERFORMANCE: 'performance',
  DEBUGGING: 'debugging',
  SECURITY: 'security',
  BUSINESS: 'business',
  OPERATIONS: 'operations',
  DEVELOPMENT: 'development',
  MONITORING: 'monitoring'
} as const;

/**
 * Dashboard themes
 */
export const DashboardThemes = {
  DEFAULT: 'default',
  DARK: 'dark',
  LIGHT: 'light',
  HIGH_CONTRAST: 'high-contrast',
  MINIMAL: 'minimal',
  CORPORATE: 'corporate'
} as const;

/**
 * Dashboard visualization types
 */
export const DashboardVisualizationTypes = {
  // Charts
  LINE: 'line-chart',
  BAR: 'bar-chart',
  PIE: 'pie-chart',
  DOUGHNUT: 'doughnut-chart',
  RADAR: 'radar-chart',
  POLAR: 'polar-chart',
  SCATTER: 'scatter-plot',
  BUBBLE: 'bubble-chart',
  AREA: 'area-chart',
  HEATMAP: 'heatmap',
  TREEMAP: 'treemap',
  FUNNEL: 'funnel-chart',
  GAUGE: 'gauge',
  SOLID_GAUGE: 'solid-gauge',

  // Tables
  TABLE: 'table',
  PIVOT_TABLE: 'pivot-table',
  DATA_TABLE: 'data-table',

  // Cards
  CARD: 'card',
  STAT_CARD: 'stat-card',
  INFO_CARD: 'info-card',
  ALERT_CARD: 'alert-card',

  // Lists
  LIST: 'list',
  LOG_LIST: 'log-list',
  ALERT_LIST: 'alert-list',
  TRACE_LIST: 'trace-list',

  // Specialized
  TIMELINE: 'timeline',
  GANTT: 'gantt-chart',
  NETWORK: 'network-graph',
  SANKEY: 'sankey-diagram',
  WORD_CLOUD: 'word-cloud',
  GEO_MAP: 'geo-map',
  CALENDAR: 'calendar',
  KANBAN: 'kanban-board',

  // Custom
  CUSTOM: 'custom',
  HTML: 'html',
  IFRAME: 'iframe',
  MARKDOWN: 'markdown',
  REACT: 'react',
  VUE: 'vue',
  ANGULAR: 'angular'
} as const;

/**
 * Dashboard time ranges
 */
export const DashboardTimeRanges = {
  // Real-time
  REAL_TIME: 'real-time',
  LAST_5_MINUTES: '5m',
  LAST_15_MINUTES: '15m',
  LAST_30_MINUTES: '30m',
  LAST_HOUR: '1h',
  LAST_2_HOURS: '2h',
  LAST_6_HOURS: '6h',
  LAST_12_HOURS: '12h',

  // Daily
  LAST_24_HOURS: '24h',
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: '7d',
  LAST_30_DAYS: '30d',

  // Weekly
  THIS_WEEK: 'this-week',
  LAST_WEEK: 'last-week',
  LAST_4_WEEKS: '4w',
  LAST_12_WEEKS: '12w',

  // Monthly
  THIS_MONTH: 'this-month',
  LAST_MONTH: 'last-month',
  LAST_3_MONTHS: '3m',
  LAST_6_MONTHS: '6m',
  LAST_12_MONTHS: '12m',

  // Yearly
  THIS_YEAR: 'this-year',
  LAST_YEAR: 'last-year',
  ALL_TIME: 'all-time',

  // Custom
  CUSTOM: 'custom'
} as const;

/**
 * Dashboard export formats
 */
export const DashboardExportFormats = {
  JSON: 'json',
  CSV: 'csv',
  PDF: 'pdf',
  PNG: 'png',
  SVG: 'svg',
  HTML: 'html',
  XML: 'xml',
  EXCEL: 'excel',
  POWERPOINT: 'powerpoint',
  WORD: 'word',
  MARKDOWN: 'markdown'
} as const;

/**
 * Dashboard aggregation types
 */
export const DashboardAggregationTypes = {
  // Basic aggregations
  SUM: 'sum',
  AVG: 'avg',
  MIN: 'min',
  MAX: 'max',
  COUNT: 'count',
  DISTINCT_COUNT: 'distinct_count',

  // Statistical aggregations
  MEDIAN: 'median',
  MODE: 'mode',
  STD_DEV: 'std_dev',
  VARIANCE: 'variance',
  PERCENTILE: 'percentile',
  QUANTILE: 'quantile',

  // Rate aggregations
  RATE: 'rate',
  INCREASE: 'increase',
  DELTA: 'delta',

  // Time aggregations
  TIME_SERIES: 'time_series',
  MOVING_AVERAGE: 'moving_average',
  EXPONENTIAL_MOVING_AVERAGE: 'exponential_moving_average',
  CUMULATIVE_SUM: 'cumulative_sum',

  // Advanced aggregations
  GROUP_BY: 'group_by',
  PIVOT: 'pivot',
  ROLLUP: 'rollup',
  CUBE: 'cube',
  WINDOW: 'window'
} as const;

/**
 * Utility Functions
 */

/**
 * Create dashboard widget
 */
export function createDashboardWidget(
  id: string,
  type: string,
  title: string,
  config: Partial<import('../types').DashboardWidget> = {}
): import('../types').DashboardWidget {
  return {
    id,
    type,
    title,
    description: config.description || '',
    visualization: config.visualization || 'custom',
    refreshInterval: config.refreshInterval || 5000,
    timeRange: config.timeRange || '1h',
    maxEntries: config.maxEntries || 10,
    thresholds: config.thresholds || [],
    aggregation: config.aggregation,
    logLevel: config.logLevel,
    customContent: config.customContent,
    format: config.format,
    ...config
  };
}

/**
 * Create dashboard layout
 */
export function createDashboardLayout(
  id: string,
  name: string,
  description: string,
  widgetIds: string[],
  positions: Record<string, { x: number; y: number; width: number; height: number }>,
  config: Partial<import('../types').DashboardLayout> = {}
): import('../types').DashboardLayout {
  return {
    id,
    name,
    description,
    widgets: widgetIds,
    grid: {
      columns: 12,
      rows: 8,
      cellSize: { width: 100, height: 80 },
      gaps: { horizontal: 10, vertical: 10 },
      ...config.grid
    },
    positions,
    ...config
  };
}

/**
 * Create dashboard theme
 */
export function createDashboardTheme(
  id: string,
  name: string,
  colors: Partial<import('../types').DashboardTheme['colors']>,
  config: Partial<import('../types').DashboardTheme> = {}
): import('../types').DashboardTheme {
  return {
    id,
    name,
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      info: '#2196f3',
      background: '#ffffff',
      surface: '#f5f5f5',
      text: '#000000',
      textSecondary: '#666666',
      ...colors
    },
    typography: {
      fontFamily: 'Arial, sans-serif',
      fontSize: {
        xs: '12px',
        sm: '14px',
        md: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px'
      },
      ...config.typography
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      '2xl': '48px',
      ...config.spacing
    },
    ...config
  };
}

/**
 * Validate dashboard widget
 */
export function validateDashboardWidget(widget: import('../types').DashboardWidget): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!widget.id || typeof widget.id !== 'string') {
    errors.push('Widget ID is required and must be a string');
  }

  if (!widget.type || typeof widget.type !== 'string') {
    errors.push('Widget type is required and must be a string');
  }

  if (!widget.title || typeof widget.title !== 'string') {
    errors.push('Widget title is required and must be a string');
  }

  if (widget.refreshInterval !== undefined && (typeof widget.refreshInterval !== 'number' || widget.refreshInterval < 1000)) {
    errors.push('Refresh interval must be a number greater than or equal to 1000');
  }

  if (widget.maxEntries !== undefined && (typeof widget.maxEntries !== 'number' || widget.maxEntries < 1)) {
    errors.push('Max entries must be a number greater than or equal to 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate dashboard layout
 */
export function validateDashboardLayout(layout: import('../types').DashboardLayout): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!layout.id || typeof layout.id !== 'string') {
    errors.push('Layout ID is required and must be a string');
  }

  if (!layout.name || typeof layout.name !== 'string') {
    errors.push('Layout name is required and must be a string');
  }

  if (!Array.isArray(layout.widgets)) {
    errors.push('Layout widgets must be an array');
  }

  if (!layout.positions || typeof layout.positions !== 'object') {
    errors.push('Layout positions must be an object');
  }

  // Validate positions
  if (layout.positions) {
    for (const [widgetId, position] of Object.entries(layout.positions)) {
      if (!layout.widgets.includes(widgetId)) {
        errors.push(`Position defined for widget '${widgetId}' but widget not in layout`);
      }

      if (typeof position.x !== 'number' || position.x < 0) {
        errors.push(`Invalid x position for widget '${widgetId}'`);
      }

      if (typeof position.y !== 'number' || position.y < 0) {
        errors.push(`Invalid y position for widget '${widgetId}'`);
      }

      if (typeof position.width !== 'number' || position.width < 1) {
        errors.push(`Invalid width for widget '${widgetId}'`);
      }

      if (typeof position.height !== 'number' || position.height < 1) {
        errors.push(`Invalid height for widget '${widgetId}'`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate dashboard theme
 */
export function validateDashboardTheme(theme: import('../types').DashboardTheme): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!theme.id || typeof theme.id !== 'string') {
    errors.push('Theme ID is required and must be a string');
  }

  if (!theme.name || typeof theme.name !== 'string') {
    errors.push('Theme name is required and must be a string');
  }

  if (!theme.colors || typeof theme.colors !== 'object') {
    errors.push('Theme colors are required and must be an object');
  }

  if (!theme.typography || typeof theme.typography !== 'object') {
    errors.push('Theme typography is required and must be an object');
  }

  if (!theme.spacing || typeof theme.spacing !== 'object') {
    errors.push('Theme spacing is required and must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}