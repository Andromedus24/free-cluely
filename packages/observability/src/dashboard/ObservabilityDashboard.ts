// Observability Dashboard Implementation
// =====================================

import { EventEmitter } from 'events';
import {
  DashboardConfig,
  DashboardWidget,
  DashboardLayout,
  MetricData,
  LogData,
  TraceData,
  AlertData,
  PerformanceData,
  DashboardExport,
  DashboardTheme
} from '../types';
import { ObservabilityService } from '../ObservabilityService';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { LogAggregator } from '../logging/LogAggregator';
import { AlertManager } from '../alerting/AlertManager';
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { DistributedTracer } from '../tracing/DistributedTracer';

export class ObservabilityDashboard extends EventEmitter {
  private config: DashboardConfig;
  private observabilityService: ObservabilityService;
  private metricsCollector: MetricsCollector;
  private logAggregator: LogAggregator;
  private alertManager: AlertManager;
  private performanceMonitor: PerformanceMonitor;
  private tracer: DistributedTracer;
  private widgets: Map<string, DashboardWidget>;
  private layouts: Map<string, DashboardLayout>;
  private themes: Map<string, DashboardTheme>;
  private activeTheme: string;
  private refreshInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(
    config: DashboardConfig,
    observabilityService: ObservabilityService,
    metricsCollector: MetricsCollector,
    logAggregator: LogAggregator,
    alertManager: AlertManager,
    performanceMonitor: PerformanceMonitor,
    tracer: DistributedTracer
  ) {
    super();
    this.config = config;
    this.observabilityService = observabilityService;
    this.metricsCollector = metricsCollector;
    this.logAggregator = logAggregator;
    this.alertManager = alertManager;
    this.performanceMonitor = performanceMonitor;
    this.tracer = tracer;
    this.widgets = new Map();
    this.layouts = new Map();
    this.themes = new Map();
    this.activeTheme = config.defaultTheme || 'default';

    this.initializeDefaultWidgets();
    this.initializeDefaultLayouts();
    this.initializeDefaultThemes();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start auto-refresh if enabled
      if (this.config.autoRefresh && this.config.refreshInterval) {
        this.startAutoRefresh(this.config.refreshInterval);
      }

      // Setup event listeners
      this.setupEventListeners();

      // Load saved dashboard state
      await this.loadDashboardState();

      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private initializeDefaultWidgets(): void {
    // Metrics widgets
    this.widgets.set('cpu-usage', {
      id: 'cpu-usage',
      type: 'metric',
      title: 'CPU Usage',
      description: 'Current CPU utilization',
      metric: 'cpu_usage',
      visualization: 'gauge',
      refreshInterval: 5000,
      thresholds: [
        { level: 'warning', value: 70, color: '#ff9800' },
        { level: 'critical', value: 85, color: '#f44336' }
      ]
    });

    this.widgets.set('memory-usage', {
      id: 'memory-usage',
      type: 'metric',
      title: 'Memory Usage',
      description: 'Current memory utilization',
      metric: 'memory_usage',
      visualization: 'gauge',
      refreshInterval: 5000,
      thresholds: [
        { level: 'warning', value: 80, color: '#ff9800' },
        { level: 'critical', value: 90, color: '#f44336' }
      ]
    });

    this.widgets.set('response-time', {
      id: 'response-time',
      type: 'metric',
      title: 'Response Time',
      description: 'Average response time',
      metric: 'response_time',
      visualization: 'line-chart',
      refreshInterval: 10000,
      timeRange: '1h'
    });

    this.widgets.set('error-rate', {
      id: 'error-rate',
      type: 'metric',
      title: 'Error Rate',
      description: 'HTTP error rate percentage',
      metric: 'error_rate',
      visualization: 'line-chart',
      refreshInterval: 10000,
      timeRange: '1h'
    });

    this.widgets.set('throughput', {
      id: 'throughput',
      type: 'metric',
      title: 'Throughput',
      description: 'Requests per second',
      metric: 'throughput',
      visualization: 'line-chart',
      refreshInterval: 10000,
      timeRange: '1h'
    });

    // Log widgets
    this.widgets.set('recent-errors', {
      id: 'recent-errors',
      type: 'log',
      title: 'Recent Errors',
      description: 'Latest error logs',
      logLevel: 'error',
      maxEntries: 10,
      refreshInterval: 5000
    });

    this.widgets.set('log-summary', {
      id: 'log-summary',
      type: 'log',
      title: 'Log Summary',
      description: 'Log levels distribution',
      visualization: 'pie-chart',
      refreshInterval: 30000,
      timeRange: '1h'
    });

    // Alert widgets
    this.widgets.set('active-alerts', {
      id: 'active-alerts',
      type: 'alert',
      title: 'Active Alerts',
      description: 'Currently active alerts',
      maxEntries: 10,
      refreshInterval: 5000
    });

    // Trace widgets
    this.widgets.set('recent-traces', {
      id: 'recent-traces',
      type: 'trace',
      title: 'Recent Traces',
      description: 'Latest distributed traces',
      maxEntries: 10,
      refreshInterval: 10000
    });

    // Performance widgets
    this.widgets.set('performance-score', {
      id: 'performance-score',
      type: 'performance',
      title: 'Performance Score',
      description: 'Overall system performance score',
      metric: 'performance_score',
      visualization: 'score-card',
      refreshInterval: 30000
    });

    // System widgets
    this.widgets.set('system-health', {
      id: 'system-health',
      type: 'system',
      title: 'System Health',
      description: 'Overall system health status',
      visualization: 'health-status',
      refreshInterval: 10000
    });
  }

  private initializeDefaultLayouts(): void {
    // Default layout
    this.layouts.set('default', {
      id: 'default',
      name: 'Default Dashboard',
      description: 'Standard observability dashboard layout',
      widgets: [
        'cpu-usage',
        'memory-usage',
        'response-time',
        'error-rate',
        'throughput',
        'recent-errors',
        'active-alerts',
        'performance-score',
        'system-health'
      ],
      grid: {
        columns: 12,
        rows: 8,
        cellSize: { width: 100, height: 80 },
        gaps: { horizontal: 10, vertical: 10 }
      },
      positions: {
        'cpu-usage': { x: 0, y: 0, width: 3, height: 2 },
        'memory-usage': { x: 3, y: 0, width: 3, height: 2 },
        'response-time': { x: 6, y: 0, width: 6, height: 2 },
        'error-rate': { x: 0, y: 2, width: 6, height: 2 },
        'throughput': { x: 6, y: 2, width: 6, height: 2 },
        'recent-errors': { x: 0, y: 4, width: 6, height: 2 },
        'active-alerts': { x: 6, y: 4, width: 6, height: 2 },
        'performance-score': { x: 0, y: 6, width: 3, height: 2 },
        'system-health': { x: 3, y: 6, width: 9, height: 2 }
      }
    });

    // Performance-focused layout
    this.layouts.set('performance', {
      id: 'performance',
      name: 'Performance Dashboard',
      description: 'Focused on performance metrics',
      widgets: [
        'cpu-usage',
        'memory-usage',
        'response-time',
        'throughput',
        'performance-score',
        'system-health'
      ],
      grid: {
        columns: 12,
        rows: 6,
        cellSize: { width: 100, height: 80 },
        gaps: { horizontal: 10, vertical: 10 }
      },
      positions: {
        'cpu-usage': { x: 0, y: 0, width: 4, height: 2 },
        'memory-usage': { x: 4, y: 0, width: 4, height: 2 },
        'response-time': { x: 8, y: 0, width: 4, height: 2 },
        'throughput': { x: 0, y: 2, width: 6, height: 2 },
        'performance-score': { x: 6, y: 2, width: 3, height: 2 },
        'system-health': { x: 9, y: 2, width: 3, height: 2 }
      }
    });

    // Debugging layout
    this.layouts.set('debugging', {
      id: 'debugging',
      name: 'Debugging Dashboard',
      description: 'Focused on logs and traces for debugging',
      widgets: [
        'recent-errors',
        'log-summary',
        'recent-traces',
        'active-alerts'
      ],
      grid: {
        columns: 12,
        rows: 6,
        cellSize: { width: 100, height: 80 },
        gaps: { horizontal: 10, vertical: 10 }
      },
      positions: {
        'recent-errors': { x: 0, y: 0, width: 6, height: 3 },
        'log-summary': { x: 6, y: 0, width: 3, height: 3 },
        'recent-traces': { x: 9, y: 0, width: 3, height: 3 },
        'active-alerts': { x: 0, y: 3, width: 12, height: 3 }
      }
    });
  }

  private initializeDefaultThemes(): void {
    this.themes.set('default', {
      id: 'default',
      name: 'Default Theme',
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
        textSecondary: '#666666'
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
        }
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px'
      }
    });

    this.themes.set('dark', {
      id: 'dark',
      name: 'Dark Theme',
      colors: {
        primary: '#90caf9',
        secondary: '#f48fb1',
        success: '#81c784',
        warning: '#ffb74d',
        error: '#e57373',
        info: '#64b5f6',
        background: '#121212',
        surface: '#1e1e1e',
        text: '#ffffff',
        textSecondary: '#b0b0b0'
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
        }
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px'
      }
    });
  }

  private setupEventListeners(): void {
    // Listen to metrics updates
    this.metricsCollector.on('metrics-collected', (metrics: MetricData[]) => {
      this.emit('metrics-updated', metrics);
      this.updateWidgets('metric', metrics);
    });

    // Listen to log updates
    this.logAggregator.on('logs-aggregated', (logs: LogData[]) => {
      this.emit('logs-updated', logs);
      this.updateWidgets('log', logs);
    });

    // Listen to alert updates
    this.alertManager.on('alert-triggered', (alert: AlertData) => {
      this.emit('alert-triggered', alert);
      this.updateWidgets('alert', [alert]);
    });

    // Listen to performance updates
    this.performanceMonitor.on('performance-alert', (alert: any) => {
      this.emit('performance-alert', alert);
      this.updateWidgets('performance', [alert]);
    });
  }

  private updateWidgets(type: string, data: any[]): void {
    for (const [widgetId, widget] of this.widgets) {
      if (widget.type === type) {
        this.emit('widget-updated', { widgetId, data, widget });
      }
    }
  }

  async getWidgetData(widgetId: string): Promise<any> {
    const widget = this.widgets.get(widgetId);
    if (!widget) {
      throw new Error(`Widget ${widgetId} not found`);
    }

    switch (widget.type) {
      case 'metric':
        return await this.getMetricWidgetData(widget);
      case 'log':
        return await this.getLogWidgetData(widget);
      case 'alert':
        return await this.getAlertWidgetData(widget);
      case 'trace':
        return await this.getTraceWidgetData(widget);
      case 'performance':
        return await this.getPerformanceWidgetData(widget);
      case 'system':
        return await this.getSystemWidgetData(widget);
      default:
        throw new Error(`Unsupported widget type: ${widget.type}`);
    }
  }

  private async getMetricWidgetData(widget: DashboardWidget): Promise<MetricData[]> {
    const query: any = {
      metric: widget.metric,
      timeRange: widget.timeRange || '1h'
    };

    if (widget.aggregation) {
      query.aggregation = widget.aggregation;
    }

    return await this.metricsCollector.queryMetrics(query);
  }

  private async getLogWidgetData(widget: DashboardWidget): Promise<LogData[]> {
    const query: any = {
      limit: widget.maxEntries || 10,
      timeRange: widget.timeRange || '1h'
    };

    if (widget.logLevel) {
      query.level = widget.logLevel;
    }

    return await this.logAggregator.queryLogs(query);
  }

  private async getAlertWidgetData(widget: DashboardWidget): Promise<AlertData[]> {
    const query: any = {
      limit: widget.maxEntries || 10,
      status: 'active'
    };

    return await this.alertManager.queryAlerts(query);
  }

  private async getTraceWidgetData(widget: DashboardWidget): Promise<TraceData[]> {
    const query: any = {
      limit: widget.maxEntries || 10,
      timeRange: widget.timeRange || '1h'
    };

    return await this.tracer.queryTraces(query);
  }

  private async getPerformanceWidgetData(widget: DashboardWidget): Promise<PerformanceData[]> {
    return await this.performanceMonitor.getPerformanceHistory(widget.timeRange || '1h');
  }

  private async getSystemWidgetData(widget: DashboardWidget): Promise<any> {
    const health = await this.observabilityService.getHealthStatus();
    const metrics = await this.metricsCollector.getSystemMetrics();
    const alerts = await this.alertManager.getActiveAlerts();

    return {
      health,
      metrics,
      activeAlerts: alerts.length,
      lastUpdated: Date.now()
    };
  }

  getLayout(layoutId: string): DashboardLayout | undefined {
    return this.layouts.get(layoutId);
  }

  getAllLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values());
  }

  addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
    this.emit('widget-added', widget);
  }

  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.widgets.get(widgetId);
    if (widget) {
      const updatedWidget = { ...widget, ...updates };
      this.widgets.set(widgetId, updatedWidget);
      this.emit('widget-updated', { widgetId, widget: updatedWidget });
    }
  }

  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
    this.emit('widget-removed', widgetId);
  }

  getWidget(widgetId: string): DashboardWidget | undefined {
    return this.widgets.get(widgetId);
  }

  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  setActiveTheme(themeId: string): void {
    if (this.themes.has(themeId)) {
      this.activeTheme = themeId;
      this.emit('theme-changed', themeId);
    }
  }

  getActiveTheme(): DashboardTheme {
    return this.themes.get(this.activeTheme) || this.themes.get('default')!;
  }

  addTheme(theme: DashboardTheme): void {
    this.themes.set(theme.id, theme);
    this.emit('theme-added', theme);
  }

  exportDashboard(): DashboardExport {
    return {
      config: this.config,
      widgets: Array.from(this.widgets.values()),
      layouts: Array.from(this.layouts.values()),
      themes: Array.from(this.themes.values()),
      activeTheme: this.activeTheme,
      exportedAt: Date.now(),
      version: '1.0.0'
    };
  }

  importDashboard(exportData: DashboardExport): void {
    this.config = exportData.config;

    // Import widgets
    this.widgets.clear();
    for (const widget of exportData.widgets) {
      this.widgets.set(widget.id, widget);
    }

    // Import layouts
    this.layouts.clear();
    for (const layout of exportData.layouts) {
      this.layouts.set(layout.id, layout);
    }

    // Import themes
    this.themes.clear();
    for (const theme of exportData.themes) {
      this.themes.set(theme.id, theme);
    }

    this.activeTheme = exportData.activeTheme;
    this.emit('dashboard-imported', exportData);
  }

  private async loadDashboardState(): Promise<void> {
    // Implementation would load saved dashboard state from persistent storage
    // This is a placeholder for the actual implementation
  }

  startAutoRefresh(intervalMs: number): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(async () => {
      try {
        // Refresh all active widgets
        const layout = this.layouts.get(this.config.defaultLayout || 'default');
        if (layout) {
          for (const widgetId of layout.widgets) {
            try {
              const data = await this.getWidgetData(widgetId);
              this.emit('widget-refreshed', { widgetId, data });
            } catch (error) {
              this.emit('widget-refresh-error', { widgetId, error });
            }
          }
        }
      } catch (error) {
        this.emit('refresh-error', error);
      }
    }, intervalMs);

    this.emit('auto-refresh-started', intervalMs);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
      this.emit('auto-refresh-stopped');
    }
  }

  async createCustomLayout(
    name: string,
    description: string,
    widgetIds: string[],
    positions: Record<string, { x: number; y: number; width: number; height: number }>
  ): Promise<DashboardLayout> {
    const layoutId = `custom-${Date.now()}`;
    const layout: DashboardLayout = {
      id: layoutId,
      name,
      description,
      widgets: widgetIds,
      grid: {
        columns: 12,
        rows: 8,
        cellSize: { width: 100, height: 80 },
        gaps: { horizontal: 10, vertical: 10 }
      },
      positions
    };

    this.layouts.set(layoutId, layout);
    this.emit('layout-created', layout);
    return layout;
  }

  async deleteLayout(layoutId: string): Promise<void> {
    if (layoutId === 'default' || layoutId === 'performance' || layoutId === 'debugging') {
      throw new Error('Cannot delete default layouts');
    }

    this.layouts.delete(layoutId);
    this.emit('layout-deleted', layoutId);
  }

  async getDashboardSummary(): Promise<{
    totalWidgets: number;
    activeLayouts: number;
    totalThemes: number;
    activeAlerts: number;
    systemHealth: string;
    lastUpdated: number;
  }> {
    const activeAlerts = await this.alertManager.getActiveAlerts();
    const health = await this.observabilityService.getHealthStatus();

    return {
      totalWidgets: this.widgets.size,
      activeLayouts: this.layouts.size,
      totalThemes: this.themes.size,
      activeAlerts: activeAlerts.length,
      systemHealth: health.status,
      lastUpdated: Date.now()
    };
  }

  async destroy(): Promise<void> {
    this.stopAutoRefresh();
    this.removeAllListeners();
    this.isInitialized = false;
    this.emit('destroyed');
  }
}