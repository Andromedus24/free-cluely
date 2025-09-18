// Dashboard Renderer Implementation
// =================================

import {
  DashboardWidget,
  DashboardLayout,
  DashboardTheme,
  MetricData,
  LogData,
  AlertData,
  TraceData,
  PerformanceData
} from '../types';

export interface RenderContext {
  container: HTMLElement;
  theme: DashboardTheme;
  locale: string;
  timezone: string;
}

export interface WidgetRenderer {
  widget: DashboardWidget;
  data: any;
  context: RenderContext;
}

export class DashboardRenderer {
  private renderers: Map<string, (widget: WidgetRenderer) => HTMLElement> = new Map();
  private stylesheets: Set<string> = new Set();
  private scripts: Set<string> = new Set();

  constructor() {
    this.initializeRenderers();
  }

  private initializeRenderers(): void {
    // Metric renderers
    this.renderers.set('gauge', this.renderGauge.bind(this));
    this.renderers.set('line-chart', this.renderLineChart.bind(this));
    this.renderers.set('bar-chart', this.renderBarChart.bind(this));
    this.renderers.set('pie-chart', this.renderPieChart.bind(this));
    this.renderers.set('score-card', this.renderScoreCard.bind(this));
    this.renderers.set('counter', this.renderCounter.bind(this));

    // Log renderers
    this.renderers.set('log-list', this.renderLogList.bind(this));
    this.renderers.set('log-summary', this.renderLogSummary.bind(this));

    // Alert renderers
    this.renderers.set('alert-list', this.renderAlertList.bind(this));
    this.renderers.set('alert-summary', this.renderAlertSummary.bind(this));

    // Trace renderers
    this.renderers.set('trace-list', this.renderTraceList.bind(this));
    this.renderers.set('trace-timeline', this.renderTraceTimeline.bind(this));

    // System renderers
    this.renderers.set('health-status', this.renderHealthStatus.bind(this));
    this.renderers.set('system-info', this.renderSystemInfo.bind(this));

    // Custom renderer
    this.renderers.set('custom', this.renderCustom.bind(this));
  }

  renderDashboard(
    layout: DashboardLayout,
    widgetData: Map<string, any>,
    context: RenderContext
  ): HTMLElement {
    const dashboard = document.createElement('div');
    dashboard.className = 'observability-dashboard';
    dashboard.style.cssText = this.getDashboardStyles(context.theme);

    const grid = document.createElement('div');
    grid.className = 'dashboard-grid';
    grid.style.cssText = this.getGridStyles(layout.grid);

    for (const widgetId of layout.widgets) {
      const widget = layout.widgets.find(w => w === widgetId);
      if (!widget) continue;

      const position = layout.positions[widgetId];
      if (!position) continue;

      const widgetContainer = document.createElement('div');
      widgetContainer.className = 'widget-container';
      widgetContainer.style.cssText = this.getWidgetPositionStyles(position);

      const data = widgetData.get(widgetId);
      const widgetElement = this.renderWidget(
        { id: widgetId, type: 'metric' } as DashboardWidget,
        data,
        context
      );

      widgetContainer.appendChild(widgetElement);
      grid.appendChild(widgetContainer);
    }

    dashboard.appendChild(grid);
    return dashboard;
  }

  renderWidget(widget: DashboardWidget, data: any, context: RenderContext): HTMLElement {
    const renderer = this.renderers.get(widget.visualization || 'custom');
    if (!renderer) {
      return this.renderError('No renderer available for widget type', context);
    }

    try {
      return renderer({ widget, data, context });
    } catch (error) {
      return this.renderError(`Error rendering widget: ${error}`, context);
    }
  }

  private renderGauge({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget gauge-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const gaugeContainer = document.createElement('div');
    gaugeContainer.className = 'gauge-container';
    gaugeContainer.style.cssText = `
      width: 200px;
      height: 200px;
      margin: 0 auto;
      position: relative;
    `;

    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    gaugeContainer.appendChild(canvas);

    const value = this.extractMetricValue(data);
    const percentage = Math.min(100, Math.max(0, value * 100));

    this.drawGauge(canvas, percentage, widget.thresholds, context.theme);

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'gauge-value';
    valueDisplay.textContent = `${percentage.toFixed(1)}%`;
    valueDisplay.style.cssText = `
      position: absolute;
      top: 70%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: ${context.theme.typography.fontSize.lg};
      font-weight: bold;
      color: ${context.theme.colors.text};
    `;

    gaugeContainer.appendChild(valueDisplay);
    container.appendChild(title);
    container.appendChild(gaugeContainer);

    return container;
  }

  private renderLineChart({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget line-chart-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.cssText = `
      width: 100%;
      height: 300px;
      position: relative;
    `;

    const canvas = document.createElement('canvas');
    canvas.width = chartContainer.offsetWidth;
    canvas.height = 300;
    chartContainer.appendChild(canvas);

    this.drawLineChart(canvas, data, context.theme);

    container.appendChild(title);
    container.appendChild(chartContainer);

    return container;
  }

  private renderLogList({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget log-list-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    logContainer.style.cssText = `
      max-height: 300px;
      overflow-y: auto;
      font-family: monospace;
      font-size: ${context.theme.typography.fontSize.sm};
    `;

    if (Array.isArray(data)) {
      data.slice(0, widget.maxEntries || 10).forEach((log: LogData) => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.style.cssText = `
          padding: ${context.theme.spacing.sm};
          border-bottom: 1px solid ${context.theme.colors.textSecondary}33;
          color: ${this.getLogLevelColor(log.level, context.theme)};
        `;

        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${log.message}`;
        logContainer.appendChild(logEntry);
      });
    }

    container.appendChild(title);
    container.appendChild(logContainer);

    return container;
  }

  private renderAlertList({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget alert-list-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const alertContainer = document.createElement('div');
    alertContainer.className = 'alert-container';
    alertContainer.style.cssText = `
      max-height: 300px;
      overflow-y: auto;
    `;

    if (Array.isArray(data)) {
      data.slice(0, widget.maxEntries || 10).forEach((alert: AlertData) => {
        const alertEntry = document.createElement('div');
        alertEntry.className = 'alert-entry';
        alertEntry.style.cssText = `
          padding: ${context.theme.spacing.sm};
          margin-bottom: ${context.theme.spacing.sm};
          border-left: 4px solid ${this.getAlertColor(alert.severity, context.theme)};
          background-color: ${context.theme.colors.surface};
          border-radius: 4px;
        `;

        const alertTitle = document.createElement('div');
        alertTitle.className = 'alert-title';
        alertTitle.textContent = alert.name;
        alertTitle.style.cssText = `
          font-weight: bold;
          color: ${context.theme.colors.text};
        `;

        const alertMessage = document.createElement('div');
        alertMessage.className = 'alert-message';
        alertMessage.textContent = alert.message;
        alertMessage.style.cssText = `
          color: ${context.theme.colors.textSecondary};
          font-size: ${context.theme.typography.fontSize.sm};
        `;

        alertEntry.appendChild(alertTitle);
        alertEntry.appendChild(alertMessage);
        alertContainer.appendChild(alertEntry);
      });
    }

    container.appendChild(title);
    container.appendChild(alertContainer);

    return container;
  }

  private renderHealthStatus({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget health-status-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const healthContainer = document.createElement('div');
    healthContainer.className = 'health-container';
    healthContainer.style.cssText = `
      text-align: center;
      padding: ${context.theme.spacing.lg};
    `;

    const status = data?.health?.status || 'unknown';
    const statusColor = this.getHealthColor(status, context.theme);

    const statusIcon = document.createElement('div');
    statusIcon.className = 'health-icon';
    statusIcon.innerHTML = this.getHealthIcon(status);
    statusIcon.style.cssText = `
      font-size: 48px;
      color: ${statusColor};
      margin-bottom: ${context.theme.spacing.md};
    `;

    const statusText = document.createElement('div');
    statusText.className = 'health-text';
    statusText.textContent = status.toUpperCase();
    statusText.style.cssText = `
      font-size: ${context.theme.typography.fontSize.lg};
      font-weight: bold;
      color: ${statusColor};
    `;

    healthContainer.appendChild(statusIcon);
    healthContainer.appendChild(statusText);
    container.appendChild(title);
    container.appendChild(healthContainer);

    return container;
  }

  private renderScoreCard({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget score-card-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const scoreContainer = document.createElement('div');
    scoreContainer.className = 'score-container';
    scoreContainer.style.cssText = `
      text-align: center;
      padding: ${context.theme.spacing.lg};
    `;

    const score = this.extractMetricValue(data);
    const scoreColor = this.getScoreColor(score, context.theme);

    const scoreValue = document.createElement('div');
    scoreValue.className = 'score-value';
    scoreValue.textContent = score.toFixed(1);
    scoreValue.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: ${scoreColor};
    `;

    const scoreLabel = document.createElement('div');
    scoreLabel.className = 'score-label';
    scoreLabel.textContent = 'Performance Score';
    scoreLabel.style.cssText = `
      color: ${context.theme.colors.textSecondary};
      font-size: ${context.theme.typography.fontSize.md};
    `;

    scoreContainer.appendChild(scoreValue);
    scoreContainer.appendChild(scoreLabel);
    container.appendChild(title);
    container.appendChild(scoreContainer);

    return container;
  }

  private renderBarChart({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget bar-chart-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.cssText = `
      width: 100%;
      height: 300px;
      position: relative;
    `;

    const canvas = document.createElement('canvas');
    canvas.width = chartContainer.offsetWidth;
    canvas.height = 300;
    chartContainer.appendChild(canvas);

    this.drawBarChart(canvas, data, context.theme);

    container.appendChild(title);
    container.appendChild(chartContainer);

    return container;
  }

  private renderPieChart({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget pie-chart-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';
    chartContainer.style.cssText = `
      width: 100%;
      height: 300px;
      position: relative;
    `;

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    chartContainer.appendChild(canvas);

    this.drawPieChart(canvas, data, context.theme);

    container.appendChild(title);
    container.appendChild(chartContainer);

    return container;
  }

  private renderCounter({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget counter-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const valueContainer = document.createElement('div');
    valueContainer.className = 'counter-container';
    valueContainer.style.cssText = `
      text-align: center;
      padding: ${context.theme.spacing.lg};
    `;

    const value = this.extractMetricValue(data);
    const formattedValue = this.formatValue(value, widget.format);

    const valueDisplay = document.createElement('div');
    valueDisplay.className = 'counter-value';
    valueDisplay.textContent = formattedValue;
    valueDisplay.style.cssText = `
      font-size: 36px;
      font-weight: bold;
      color: ${context.theme.colors.primary};
    `;

    valueContainer.appendChild(valueDisplay);
    container.appendChild(title);
    container.appendChild(valueContainer);

    return container;
  }

  private renderError(message: string, context: RenderContext): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget error-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const errorDisplay = document.createElement('div');
    errorDisplay.className = 'error-message';
    errorDisplay.textContent = message;
    errorDisplay.style.cssText = `
      color: ${context.theme.colors.error};
      padding: ${context.theme.spacing.md};
      text-align: center;
    `;

    container.appendChild(errorDisplay);
    return container;
  }

  private renderCustom({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget custom-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const customContent = document.createElement('div');
    customContent.className = 'custom-content';
    customContent.innerHTML = widget.customContent || 'Custom widget content';
    customContent.style.cssText = `
      padding: ${context.theme.spacing.md};
    `;

    container.appendChild(title);
    container.appendChild(customContent);

    return container;
  }

  // Canvas drawing methods
  private drawGauge(
    canvas: HTMLCanvasElement,
    percentage: number,
    thresholds: any[] = [],
    theme: DashboardTheme
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 20;
    ctx.strokeStyle = theme.colors.textSecondary + '33';
    ctx.stroke();

    // Draw value arc
    const endAngle = Math.PI + (percentage / 100) * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle);
    ctx.lineWidth = 20;
    ctx.strokeStyle = this.getThresholdColor(percentage, thresholds, theme);
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = theme.colors.text;
    ctx.fill();
  }

  private drawLineChart(canvas: HTMLCanvasElement, data: any[], theme: DashboardTheme): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || !Array.isArray(data) || data.length === 0) return;

    const padding = 40;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Extract values
    const values = data.map(d => this.extractMetricValue(d));
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    // Draw axes
    ctx.strokeStyle = theme.colors.textSecondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = theme.colors.primary;
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1)) * width;
      const y = canvas.height - padding - ((value - minValue) / range) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    ctx.fillStyle = theme.colors.primary;
    values.forEach((value, index) => {
      const x = padding + (index / (values.length - 1)) * width;
      const y = canvas.height - padding - ((value - minValue) / range) * height;

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });
  }

  private drawBarChart(canvas: HTMLCanvasElement, data: any[], theme: DashboardTheme): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || !Array.isArray(data) || data.length === 0) return;

    const padding = 40;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Extract values
    const values = data.map(d => this.extractMetricValue(d));
    const maxValue = Math.max(...values);
    const barWidth = width / values.length * 0.8;
    const barSpacing = width / values.length * 0.2;

    // Draw axes
    ctx.strokeStyle = theme.colors.textSecondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw bars
    ctx.fillStyle = theme.colors.primary;
    values.forEach((value, index) => {
      const barHeight = (value / maxValue) * height;
      const x = padding + index * (barWidth + barSpacing) + barSpacing / 2;
      const y = canvas.height - padding - barHeight;

      ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  private drawPieChart(canvas: HTMLCanvasElement, data: any[], theme: DashboardTheme): void {
    const ctx = canvas.getContext('2d');
    if (!ctx || !Array.isArray(data) || data.length === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Extract values
    const values = data.map(d => this.extractMetricValue(d));
    const total = values.reduce((sum, val) => sum + val, 0) || 1;

    // Colors
    const colors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.success,
      theme.colors.warning,
      theme.colors.error,
      theme.colors.info
    ];

    let currentAngle = 0;
    values.forEach((value, index) => {
      const sliceAngle = (value / total) * 2 * Math.PI;

      ctx.fillStyle = colors[index % colors.length];
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      currentAngle += sliceAngle;
    });
  }

  // Helper methods
  private extractMetricValue(data: any): number {
    if (!data) return 0;
    if (typeof data === 'number') return data;
    if (data.value !== undefined) return data.value;
    if (data.metric !== undefined) return data.metric;
    return 0;
  }

  private formatValue(value: number, format?: string): string {
    if (!format) return value.toString();

    switch (format) {
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'bytes':
        return this.formatBytes(value);
      case 'duration':
        return this.formatDuration(value);
      default:
        return value.toString();
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  private getThresholdColor(value: number, thresholds: any[], theme: DashboardTheme): string {
    for (const threshold of thresholds || []) {
      if (value >= threshold.value) {
        return threshold.color || theme.colors.error;
      }
    }
    return theme.colors.success;
  }

  private getLogLevelColor(level: string, theme: DashboardTheme): string {
    switch (level) {
      case 'error':
      case 'fatal':
        return theme.colors.error;
      case 'warn':
        return theme.colors.warning;
      case 'info':
        return theme.colors.info;
      case 'debug':
        return theme.colors.textSecondary;
      default:
        return theme.colors.text;
    }
  }

  private getAlertColor(severity: string, theme: DashboardTheme): string {
    switch (severity) {
      case 'critical':
      case 'emergency':
        return theme.colors.error;
      case 'warning':
        return theme.colors.warning;
      case 'info':
        return theme.colors.info;
      default:
        return theme.colors.textSecondary;
    }
  }

  private getHealthColor(status: string, theme: DashboardTheme): string {
    switch (status) {
      case 'healthy':
        return theme.colors.success;
      case 'degraded':
        return theme.colors.warning;
      case 'unhealthy':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  }

  private getScoreColor(score: number, theme: DashboardTheme): string {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  }

  private getHealthIcon(status: string): string {
    switch (status) {
      case 'healthy':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'unhealthy':
        return '✗';
      default:
        return '?';
    }
  }

  // Style methods
  private getDashboardStyles(theme: DashboardTheme): string {
    return `
      font-family: ${theme.typography.fontFamily};
      background-color: ${theme.colors.background};
      color: ${theme.colors.text};
      padding: ${theme.spacing.lg};
    `;
  }

  private getGridStyles(grid: any): string {
    return `
      display: grid;
      grid-template-columns: repeat(${grid.columns}, ${grid.cellSize.width}px);
      grid-auto-rows: ${grid.cellSize.height}px;
      gap: ${grid.gaps.horizontal}px ${grid.gaps.vertical}px;
      justify-content: center;
    `;
  }

  private getWidgetPositionStyles(position: any): string {
    return `
      grid-column: ${position.x + 1} / span ${position.width};
      grid-row: ${position.y + 1} / span ${position.height};
    `;
  }

  private getWidgetStyles(theme: DashboardTheme): string {
    return `
      background-color: ${theme.colors.surface};
      border: 1px solid ${theme.colors.textSecondary}33;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    `;
  }

  private getTitleStyles(theme: DashboardTheme): string {
    return `
      padding: ${theme.spacing.md};
      font-size: ${theme.typography.fontSize.md};
      font-weight: bold;
      border-bottom: 1px solid ${theme.colors.textSecondary}33;
      background-color: ${theme.colors.background};
    `;
  }

  // Additional renderers for completeness
  private renderLogSummary({ widget, data, context }: WidgetRenderer): HTMLElement {
    return this.renderPieChart({ widget, data, context });
  }

  private renderAlertSummary({ widget, data, context }: WidgetRenderer): HTMLElement {
    return this.renderCounter({ widget, data, context });
  }

  private renderTraceList({ widget, data, context }: WidgetRenderer): HTMLElement {
    return this.renderLogList({ widget, data, context });
  }

  private renderTraceTimeline({ widget, data, context }: WidgetRenderer): HTMLElement {
    return this.renderLineChart({ widget, data, context });
  }

  private renderSystemInfo({ widget, data, context }: WidgetRenderer): HTMLElement {
    const container = document.createElement('div');
    container.className = 'widget system-info-widget';
    container.style.cssText = this.getWidgetStyles(context.theme);

    const title = document.createElement('div');
    title.className = 'widget-title';
    title.textContent = widget.title;
    title.style.cssText = this.getTitleStyles(context.theme);

    const infoContainer = document.createElement('div');
    infoContainer.className = 'info-container';
    infoContainer.style.cssText = `
      padding: ${theme.spacing.md};
      font-size: ${theme.typography.fontSize.sm};
    `;

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        const infoRow = document.createElement('div');
        infoRow.style.cssText = `
          display: flex;
          justify-content: space-between;
          padding: ${theme.spacing.xs} 0;
          border-bottom: 1px solid ${theme.colors.textSecondary}33;
        `;

        const label = document.createElement('span');
        label.textContent = key;
        label.style.cssText = `color: ${theme.colors.textSecondary};`;

        const value = document.createElement('span');
        value.textContent = String(value);
        value.style.cssText = `color: ${theme.colors.text}; font-weight: bold;`;

        infoRow.appendChild(label);
        infoRow.appendChild(value);
        infoContainer.appendChild(infoRow);
      });
    }

    container.appendChild(title);
    container.appendChild(infoContainer);

    return container;
  }
}