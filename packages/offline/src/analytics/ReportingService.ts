// Reporting Service
// =================

import { EventEmitter } from 'events';
import { AnalyticsReport, ReportTemplate, TimeRange, ReportFilter } from './OfflineAnalyticsService';
import { IStorageService } from '../storage/StorageService';

/**
 * Report Generation Configuration
 */
export interface ReportGenerationConfig {
  enableScheduledReports: boolean;
  enableRealtimeReports: boolean;
  enableExport: boolean;
  enableSharing: boolean;
  enableNotifications: boolean;
  enableVersioning: boolean;
  maxReportVersions: number;
  defaultFormat: 'pdf' | 'html' | 'csv' | 'json';
  templateCacheEnabled: boolean;
  templateCacheTTL: number;
  renderingTimeout: number;
  maxReportSize: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  watermarkEnabled: boolean;
  brandingEnabled: boolean;
}

/**
 * Report Renderer
 */
export interface ReportRenderer {
  id: string;
  name: string;
  format: string;
  version: string;
  supportedTemplates: string[];
  render: (report: GeneratedReport, options: RenderOptions) => Promise<Blob>;
}

/**
 * Render Options
 */
export interface RenderOptions {
  format: string;
  template?: string;
  theme?: string;
  language?: string;
  timezone?: string;
  includeCharts?: boolean;
  includeImages?: boolean;
  watermark?: string;
  branding?: BrandingConfig;
  compression?: boolean;
  encryption?: boolean;
}

/**
 * Branding Configuration
 */
export interface BrandingConfig {
  logo?: string;
  companyName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  headerTemplate?: string;
  footerTemplate?: string;
}

/**
 * Generated Report
 */
export interface GeneratedReport {
  id: string;
  templateId: string;
  title: string;
  description: string;
  data: any;
  insights: any[];
  charts: ChartConfig[];
  tables: TableConfig[];
  metadata: ReportMetadata;
  generatedAt: Date;
  expiresAt?: Date;
  version: number;
  previousVersion?: string;
  nextVersion?: string;
}

/**
 * Chart Configuration
 */
export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'radar' | 'heatmap' | 'treemap';
  title: string;
  data: ChartData;
  options: ChartOptions;
  position: ChartPosition;
}

/**
 * Chart Data
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Chart Dataset
 */
export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
}

/**
 * Chart Options
 */
export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: ChartPlugins;
  scales?: ChartScales;
  animation?: ChartAnimation;
}

/**
 * Chart Plugins
 */
export interface ChartPlugins {
  legend?: ChartLegend;
  tooltip?: ChartTooltip;
  title?: ChartTitle;
}

/**
 * Chart Legend
 */
export interface ChartLegend {
  display?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Chart Tooltip
 */
export interface ChartTooltip {
  enabled?: boolean;
  mode?: 'index' | 'dataset' | 'point';
  intersect?: boolean;
}

/**
 * Chart Title
 */
export interface ChartTitle {
  display?: boolean;
  text?: string;
  font?: ChartFont;
}

/**
 * Chart Font
 */
export interface ChartFont {
  size?: number;
  weight?: 'normal' | 'bold' | 'bolder' | 'lighter';
  family?: string;
}

/**
 * Chart Scales
 */
export interface ChartScales {
  x?: ChartScale;
  y?: ChartScale;
}

/**
 * Chart Scale
 */
export interface ChartScale {
  type?: 'linear' | 'logarithmic' | 'category' | 'time';
  display?: boolean;
  title?: ChartTitle;
  grid?: ChartGrid;
}

/**
 * Chart Grid
 */
export interface ChartGrid {
  display?: boolean;
  color?: string;
  lineWidth?: number;
}

/**
 * Chart Animation
 */
export interface ChartAnimation {
  duration?: number;
  easing?: string;
  delay?: number;
}

/**
 * Chart Position
 */
export interface ChartPosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Table Configuration
 */
export interface TableConfig {
  id: string;
  title: string;
  columns: TableColumn[];
  data: any[];
  options: TableOptions;
  position: TablePosition;
}

/**
 * Table Column
 */
export interface TableColumn {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  format?: string;
  align?: 'left' | 'center' | 'right';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
}

/**
 * Table Options
 */
export interface TableOptions {
  pagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  filterable?: boolean;
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;
  condensed?: boolean;
}

/**
 * Table Position
 */
export interface TablePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Report Metadata
 */
export interface ReportMetadata {
  author?: string;
  department?: string;
  category?: string;
  tags?: string[];
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  retention?: number;
  accessControl?: AccessControl[];
  auditTrail?: AuditEntry[];
}

/**
 * Access Control
 */
export interface AccessControl {
  userId: string;
  permissions: ('read' | 'write' | 'delete' | 'share')[];
  grantedAt: Date;
  expiresAt?: Date;
}

/**
 * Audit Entry
 */
export interface AuditEntry {
  action: 'created' | 'viewed' | 'modified' | 'deleted' | 'shared' | 'exported';
  userId: string;
  timestamp: Date;
  details?: any;
}

/**
 * Report Schedule
 */
export interface ReportSchedule {
  id: string;
  name: string;
  templateId: string;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  time: string;
  timezone: string;
  recipients: ReportRecipient[];
  filters: ReportFilter[];
  format: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  createdAt: Date;
  createdBy: string;
}

/**
 * Report Recipient
 */
export interface ReportRecipient {
  id: string;
  type: 'email' | 'webhook' | 'slack' | 'teams' | 'discord';
  address: string;
  format?: string;
  language?: string;
  timezone?: string;
  enabled: boolean;
}

/**
 * Report Export
 */
export interface ReportExport {
  id: string;
  reportId: string;
  format: string;
  filename: string;
  size: number;
  checksum: string;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  downloadUrl?: string;
  metadata: any;
}

/**
 * Report Share
 */
export interface ReportShare {
  id: string;
  reportId: string;
  shareId: string;
  token: string;
  permissions: ('read' | 'download')[];
  expiresAt?: Date;
  password?: string;
  maxViews?: number;
  currentViews: number;
  createdBy: string;
  createdAt: Date;
  accessedBy?: string[];
  lastAccessed?: Date;
}

/**
 * Report Template Builder
 */
export interface ReportTemplateBuilder {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'wizard' | 'code' | 'drag_drop';
  config: TemplateBuilderConfig;
  preview: boolean;
  validation: TemplateValidation[];
}

/**
 * Template Builder Configuration
 */
export interface TemplateBuilderConfig {
  sections: TemplateSection[];
  widgets: TemplateWidget[];
  layout: TemplateLayout;
  styling: TemplateStyling;
  dataSources: DataSource[];
}

/**
 * Template Section
 */
export interface TemplateSection {
  id: string;
  name: string;
  type: 'header' | 'footer' | 'content' | 'sidebar';
  required: boolean;
  multiple: boolean;
  widgets: string[];
}

/**
 * Template Widget
 */
export interface TemplateWidget {
  id: string;
  name: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image' | 'spacer';
  config: any;
  validation: WidgetValidation[];
}

/**
 * Template Layout
 */
export interface TemplateLayout {
  type: 'grid' | 'flex' | 'absolute';
  columns: number;
  spacing: number;
  maxWidth: number;
  responsive: boolean;
}

/**
 * Template Styling
 */
export interface TemplateStyling {
  theme: 'light' | 'dark' | 'custom';
  colors: Record<string, string>;
  fonts: Record<string, string>;
  spacing: Record<string, number>;
  borderRadius: number;
  shadows: boolean;
}

/**
 * Template Validation
 */
export interface TemplateValidation {
  type: 'required' | 'format' | 'range' | 'custom';
  field: string;
  message: string;
  validator?: (value: any) => boolean;
}

/**
 * Widget Validation
 */
export interface WidgetValidation {
  type: 'required' | 'format' | 'range' | 'custom';
  field: string;
  message: string;
  validator?: (value: any) => boolean;
}

/**
 * Report Generation Service
 */
export class ReportingService extends EventEmitter {
  private config: ReportGenerationConfig;
  private storage: IStorageService;
  private renderers: Map<string, ReportRenderer> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private schedules: Map<string, ReportSchedule> = new Map();
  private generatedReports: Map<string, GeneratedReport> = new Map();
  private exports: Map<string, ReportExport> = new Map();
  private shares: Map<string, ReportShare> = new Map();
  private initialized = false;
  private scheduleInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: ReportGenerationConfig, storage: IStorageService) {
    super();
    this.config = config;
    this.storage = storage;

    // Setup default renderers
    this.setupDefaultRenderers();
  }

  /**
   * Initialize reporting service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load persisted data
      await this.loadPersistedData();

      // Setup schedules
      if (this.config.enableScheduledReports) {
        this.setupScheduleInterval();
      }

      // Setup cleanup
      this.setupCleanupInterval();

      this.initialized = true;
      this.emit('initialized');

    } catch (error) {
      this.emit('initializationError', error);
      throw error;
    }
  }

  /**
   * Register renderer
   */
  registerRenderer(renderer: ReportRenderer): void {
    this.renderers.set(renderer.id, renderer);
    this.emit('rendererRegistered', renderer);
  }

  /**
   * Unregister renderer
   */
  unregisterRenderer(rendererId: string): void {
    this.renderers.delete(rendererId);
    this.emit('rendererUnregistered', rendererId);
  }

  /**
   * Get renderers
   */
  getRenderers(): ReportRenderer[] {
    return Array.from(this.renderers.values());
  }

  /**
   * Register template
   */
  registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
    this.emit('templateRegistered', template);
  }

  /**
   * Unregister template
   */
  unregisterTemplate(templateId: string): void {
    this.templates.delete(templateId);
    this.emit('templateUnregistered', templateId);
  }

  /**
   * Get templates
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Create schedule
   */
  async createSchedule(schedule: Omit<ReportSchedule, 'id' | 'createdAt' | 'createdBy' | 'runCount' | 'errorCount'>): Promise<string> {
    const newSchedule: ReportSchedule = {
      ...schedule,
      id: this.generateId(),
      createdAt: new Date(),
      createdBy: 'system', // This would come from user context
      runCount: 0,
      errorCount: 0
    };

    this.schedules.set(newSchedule.id, newSchedule);
    await this.persistSchedules();

    // Calculate next run time
    newSchedule.nextRun = this.calculateNextRun(newSchedule);

    this.emit('scheduleCreated', newSchedule);
    return newSchedule.id;
  }

  /**
   * Update schedule
   */
  async updateSchedule(scheduleId: string, updates: Partial<ReportSchedule>): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return false;
    }

    const updatedSchedule = { ...schedule, ...updates };
    updatedSchedule.nextRun = this.calculateNextRun(updatedSchedule);

    this.schedules.set(scheduleId, updatedSchedule);
    await this.persistSchedules();

    this.emit('scheduleUpdated', updatedSchedule);
    return true;
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return false;
    }

    this.schedules.delete(scheduleId);
    await this.persistSchedules();

    this.emit('scheduleDeleted', schedule);
    return true;
  }

  /**
   * Get schedules
   */
  getSchedules(): ReportSchedule[] {
    return Array.from(this.schedules.values()).filter(s => s.enabled);
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId: string): ReportSchedule | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Generate report
   */
  async generateReport(
    templateId: string,
    data: any,
    options: {
      title?: string;
      description?: string;
      filters?: ReportFilter[];
      format?: string;
      renderOptions?: RenderOptions;
      metadata?: Partial<ReportMetadata>;
    } = {}
  ): Promise<GeneratedReport> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const renderOptions: RenderOptions = {
      format: options.format || this.config.defaultFormat,
      ...options.renderOptions
    };

    // Generate report content
    const content = await this.generateReportContent(template, data, options.filters || []);

    // Create generated report
    const report: GeneratedReport = {
      id: this.generateId(),
      templateId,
      title: options.title || template.name,
      description: options.description || template.description,
      data: content.data,
      insights: content.insights,
      charts: content.charts,
      tables: content.tables,
      metadata: {
        ...options.metadata,
        category: template.type,
        auditTrail: [{
          action: 'created',
          userId: 'system', // This would come from user context
          timestamp: new Date()
        }]
      },
      generatedAt: new Date(),
      version: 1
    };

    // Store report
    this.generatedReports.set(report.id, report);
    await this.persistReports();

    // Apply versioning if enabled
    if (this.config.enableVersioning) {
      await this.handleReportVersioning(report);
    }

    this.emit('reportGenerated', report);
    return report;
  }

  /**
   * Render report
   */
  async renderReport(
    reportId: string,
    options: RenderOptions
  ): Promise<Blob> {
    const report = this.generatedReports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const renderer = this.renderers.get(options.format);
    if (!renderer) {
      throw new Error(`Renderer not found for format: ${options.format}`);
    }

    // Check if template is supported
    if (!renderer.supportedTemplates.includes(report.templateId)) {
      throw new Error(`Template ${report.templateId} not supported by renderer ${renderer.id}`);
    }

    try {
      const blob = await renderer.render(report, options);
      this.emit('reportRendered', { reportId, format: options.format, size: blob.size });
      return blob;
    } catch (error) {
      this.emit('renderError', { reportId, format: options.format, error });
      throw error;
    }
  }

  /**
   * Export report
   */
  async exportReport(
    reportId: string,
    format: string,
    options: {
      filename?: string;
      watermark?: string;
      branding?: BrandingConfig;
      compression?: boolean;
      encryption?: boolean;
      expiresAt?: Date;
    } = {}
  ): Promise<ReportExport> {
    const report = this.generatedReports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const renderOptions: RenderOptions = {
      format,
      watermark: options.watermark,
      branding: options.branding,
      compression: options.compression,
      encryption: options.encryption
    };

    // Render report
    const blob = await this.renderReport(reportId, renderOptions);

    // Create export record
    const exportRecord: ReportExport = {
      id: this.generateId(),
      reportId,
      format,
      filename: options.filename || `${report.title}.${format}`,
      size: blob.size,
      checksum: await this.calculateChecksum(blob),
      createdAt: new Date(),
      expiresAt: options.expiresAt,
      metadata: {
        compression: options.compression,
        encryption: options.encryption,
        watermark: options.watermark
      }
    };

    // Store export
    this.exports.set(exportRecord.id, exportRecord);
    await this.persistExports();

    this.emit('reportExported', exportRecord);
    return exportRecord;
  }

  /**
   * Share report
   */
  async shareReport(
    reportId: string,
    options: {
      permissions?: ('read' | 'download')[];
      expiresAt?: Date;
      password?: string;
      maxViews?: number;
    } = {}
  ): Promise<ReportShare> {
    const report = this.generatedReports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const share: ReportShare = {
      id: this.generateId(),
      reportId,
      shareId: this.generateShareId(),
      token: this.generateToken(),
      permissions: options.permissions || ['read'],
      expiresAt: options.expiresAt,
      password: options.password,
      maxViews: options.maxViews,
      currentViews: 0,
      createdBy: 'system', // This would come from user context
      createdAt: new Date()
    };

    // Store share
    this.shares.set(share.id, share);
    await this.persistShares();

    this.emit('reportShared', share);
    return share;
  }

  /**
   * Access shared report
   */
  async accessSharedReport(
    shareId: string,
    token: string,
    password?: string
  ): Promise<GeneratedReport | null> {
    const share = Array.from(this.shares.values()).find(s => s.shareId === shareId);
    if (!share || share.token !== token) {
      return null;
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < new Date()) {
      return null;
    }

    // Check password
    if (share.password && share.password !== password) {
      return null;
    }

    // Check view limit
    if (share.maxViews && share.currentViews >= share.maxViews) {
      return null;
    }

    // Update access tracking
    share.currentViews++;
    share.lastAccessed = new Date();
    if (!share.accessedBy) {
      share.accessedBy = [];
    }
    share.accessedBy.push('anonymous'); // This would be the actual user

    await this.persistShares();

    // Return report
    return this.generatedReports.get(share.reportId) || null;
  }

  /**
   * Get generated reports
   */
  getGeneratedReports(options: {
    templateId?: string;
    timeRange?: { start: Date; end: Date };
    limit?: number;
  } = {}): GeneratedReport[] {
    let reports = Array.from(this.generatedReports.values());

    // Apply filters
    if (options.templateId) {
      reports = reports.filter(r => r.templateId === options.templateId);
    }

    if (options.timeRange) {
      reports = reports.filter(r =>
        r.generatedAt >= options.timeRange!.start &&
        r.generatedAt <= options.timeRange!.end
      );
    }

    // Sort by generation time
    reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    // Apply limit
    if (options.limit) {
      reports = reports.slice(0, options.limit);
    }

    return reports;
  }

  /**
   * Get report exports
   */
  getReportExports(reportId?: string): ReportExport[] {
    let exports = Array.from(this.exports.values());

    if (reportId) {
      exports = exports.filter(e => e.reportId === reportId);
    }

    return exports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get report shares
   */
  getReportShares(reportId?: string): ReportShare[] {
    let shares = Array.from(this.shares.values());

    if (reportId) {
      shares = shares.filter(s => s.reportId === reportId);
    }

    return shares.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<boolean> {
    const report = this.generatedReports.get(reportId);
    if (!report) {
      return false;
    }

    // Delete from storage
    this.generatedReports.delete(reportId);

    // Delete related exports
    const relatedExports = this.getReportExports(reportId);
    relatedExports.forEach(exp => this.exports.delete(exp.id));

    // Delete related shares
    const relatedShares = this.getReportShares(reportId);
    relatedShares.forEach(share => this.shares.delete(share.id));

    // Persist changes
    await this.persistReports();
    await this.persistExports();
    await this.persistShares();

    this.emit('reportDeleted', report);
    return true;
  }

  /**
   * Setup default renderers
   */
  private setupDefaultRenderers(): void {
    // HTML Renderer
    this.registerRenderer({
      id: 'html',
      name: 'HTML Renderer',
      format: 'html',
      version: '1.0.0',
      supportedTemplates: ['*'],
      render: async (report, options) => {
        const html = this.generateHTMLReport(report, options);
        return new Blob([html], { type: 'text/html' });
      }
    });

    // JSON Renderer
    this.registerRenderer({
      id: 'json',
      name: 'JSON Renderer',
      format: 'json',
      version: '1.0.0',
      supportedTemplates: ['*'],
      render: async (report, options) => {
        const json = JSON.stringify(report, null, 2);
        return new Blob([json], { type: 'application/json' });
      }
    });

    // CSV Renderer
    this.registerRenderer({
      id: 'csv',
      name: 'CSV Renderer',
      format: 'csv',
      version: '1.0.0',
      supportedTemplates: ['*'],
      render: async (report, options) => {
        const csv = this.generateCSVReport(report);
        return new Blob([csv], { type: 'text/csv' });
      }
    });
  }

  /**
   * Setup schedule interval
   */
  private setupScheduleInterval(): void {
    this.scheduleInterval = setInterval(async () => {
      await this.processScheduledReports();
    }, 60000); // Check every minute
  }

  /**
   * Setup cleanup interval
   */
  private setupCleanupInterval(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredReports();
    }, 3600000); // Cleanup every hour
  }

  /**
   * Process scheduled reports
   */
  private async processScheduledReports(): Promise<void> {
    const now = new Date();

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled || !schedule.nextRun) {
        continue;
      }

      if (now >= schedule.nextRun) {
        try {
          await this.executeSchedule(schedule);
        } catch (error) {
          console.error('Failed to execute schedule:', error);
          schedule.errorCount++;
        }
      }
    }
  }

  /**
   * Execute schedule
   */
  private async executeSchedule(schedule: ReportSchedule): Promise<void> {
    // Update schedule
    schedule.lastRun = new Date();
    schedule.nextRun = this.calculateNextRun(schedule);
    schedule.runCount++;

    // Generate report data (this would fetch from analytics service)
    const data = {}; // This would come from analytics service

    // Generate report
    const report = await this.generateReport(
      schedule.templateId,
      data,
      {
        format: schedule.format,
        filters: schedule.filters
      }
    );

    // Export report
    const exportRecord = await this.exportReport(
      report.id,
      schedule.format,
      {
        filename: `${schedule.name}_${new Date().toISOString().split('T')[0]}.${schedule.format}`
      }
    );

    // Send to recipients
    for (const recipient of schedule.recipients) {
      if (recipient.enabled) {
        await this.sendReportToRecipient(exportRecord, recipient);
      }
    }

    await this.persistSchedules();
    this.emit('scheduleExecuted', schedule);
  }

  /**
   * Send report to recipient
   */
  private async sendReportToRecipient(exportRecord: ReportExport, recipient: ReportRecipient): Promise<void> {
    // This would implement actual sending logic based on recipient type
    switch (recipient.type) {
      case 'email':
        await this.sendEmailReport(exportRecord, recipient);
        break;
      case 'webhook':
        await this.sendWebhookReport(exportRecord, recipient);
        break;
      // Add other recipient types
    }
  }

  /**
   * Send email report
   */
  private async sendEmailReport(exportRecord: ReportExport, recipient: ReportRecipient): Promise<void> {
    // This would implement email sending
    console.log(`Sending report ${exportRecord.filename} to ${recipient.address}`);
  }

  /**
   * Send webhook report
   */
  private async sendWebhookReport(exportRecord: ReportExport, recipient: ReportRecipient): Promise<void> {
    // This would implement webhook sending
    console.log(`Sending report ${exportRecord.filename} to webhook ${recipient.address}`);
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    let nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    // If the time has passed today, schedule for next occurrence
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    // Adjust based on frequency
    switch (schedule.frequency) {
      case 'hourly':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
      case 'yearly':
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        break;
    }

    return nextRun;
  }

  /**
   * Generate report content
   */
  private async generateReportContent(
    template: ReportTemplate,
    data: any,
    filters: ReportFilter[]
  ): Promise<{
    data: any;
    insights: any[];
    charts: ChartConfig[];
    tables: TableConfig[];
  }> {
    // This would generate charts and tables based on template configuration
    const charts: ChartConfig[] = [];
    const tables: TableConfig[] = [];
    const insights: any[] = [];

    // Generate charts based on template metrics
    for (const metric of template.metrics) {
      const chart: ChartConfig = {
        id: `chart_${metric}`,
        type: 'line',
        title: metric,
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: metric,
            data: [65, 59, 80, 81, 56, 55],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          }
        },
        position: {
          page: 1,
          x: 0,
          y: 0,
          width: 800,
          height: 400
        }
      };
      charts.push(chart);
    }

    // Generate summary table
    const table: TableConfig = {
      id: 'summary_table',
      title: 'Summary',
      columns: [
        { key: 'metric', label: 'Metric', type: 'string' },
        { key: 'value', label: 'Value', type: 'number' },
        { key: 'change', label: 'Change', type: 'number' }
      ],
      data: [
        { metric: 'Total Operations', value: 1234, change: 5.2 },
        { metric: 'Success Rate', value: 98.5, change: 1.2 },
        { metric: 'Average Latency', value: 245, change: -12.3 }
      ],
      options: {
        pagination: false,
        sortable: true,
        bordered: true
      },
      position: {
        page: 1,
        x: 0,
        y: 420,
        width: 800,
        height: 200
      }
    };
    tables.push(table);

    return {
      data,
      insights,
      charts,
      tables
    };
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(report: GeneratedReport, options: RenderOptions): string {
    const charts = report.charts.map(chart => `
      <div class="chart" style="width: ${chart.position.width}px; height: ${chart.position.height}px;">
        <h3>${chart.title}</h3>
        <canvas id="${chart.id}"></canvas>
      </div>
    `).join('');

    const tables = report.tables.map(table => `
      <div class="table">
        <h3>${table.title}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              ${table.columns.map(col => `<th style="border: 1px solid #ddd; padding: 8px;">${col.label}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${table.data.map(row => `
              <tr>
                ${table.columns.map(col => `<td style="border: 1px solid #ddd; padding: 8px;">${row[col.key]}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { margin-bottom: 30px; }
        .chart, .table { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>${report.description}</p>
        <p>Generated: ${report.generatedAt.toLocaleString()}</p>
    </div>
    <div class="content">
        ${charts}
        ${tables}
    </div>
    <script>
        // Initialize charts
        ${report.charts.map(chart => `
            new Chart(document.getElementById('${chart.id}'), {
                type: '${chart.type}',
                data: ${JSON.stringify(chart.data)},
                options: ${JSON.stringify(chart.options)}
            });
        `).join('')}
    </script>
</body>
</html>
    `;
  }

  /**
   * Generate CSV report
   */
  private generateCSVReport(report: GeneratedReport): string {
    const rows: string[] = [];

    // Add header
    rows.push('Report Title,Description,Generated At,Template');
    rows.push(`"${report.title}","${report.description}","${report.generatedAt.toISOString()}","${report.templateId}"`);

    // Add empty row
    rows.push('');

    // Add charts data
    report.charts.forEach(chart => {
      rows.push(`Chart: ${chart.title}`);
      rows.push('Label,Dataset,Value');
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        dataset.data.forEach((value, index) => {
          rows.push(`"${chart.data.labels[index]}","${dataset.label}",${value}`);
        });
      });
      rows.push('');
    });

    // Add tables data
    report.tables.forEach(table => {
      rows.push(`Table: ${table.title}`);
      rows.push(table.columns.map(col => col.label).join(','));
      table.data.forEach(row => {
        rows.push(table.columns.map(col => {
          const value = row[col.key];
          return typeof value === 'string' ? `"${value}"` : value;
        }).join(','));
      });
      rows.push('');
    });

    return rows.join('\n');
  }

  /**
   * Handle report versioning
   */
  private async handleReportVersioning(report: GeneratedReport): Promise<void> {
    // Find previous versions
    const previousVersions = Array.from(this.generatedReports.values())
      .filter(r => r.templateId === report.templateId && r.id !== report.id)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, this.config.maxReportVersions - 1);

    // Update version numbers
    previousVersions.forEach((prev, index) => {
      prev.version = index + 2;
      if (index === 0) {
        report.previousVersion = prev.id;
        prev.nextVersion = report.id;
      }
    });
  }

  /**
   * Calculate checksum
   */
  private async calculateChecksum(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Cleanup expired reports
   */
  private async cleanupExpiredReports(): Promise<void> {
    const now = new Date();
    let cleanupCount = 0;

    // Cleanup expired reports
    for (const [id, report] of this.generatedReports) {
      if (report.metadata.retention &&
          now.getTime() - report.generatedAt.getTime() > report.metadata.retention) {
        await this.deleteReport(id);
        cleanupCount++;
      }
    }

    // Cleanup expired exports
    for (const [id, exportRecord] of this.exports) {
      if (exportRecord.expiresAt && exportRecord.expiresAt < now) {
        this.exports.delete(id);
        cleanupCount++;
      }
    }

    // Cleanup expired shares
    for (const [id, share] of this.shares) {
      if (share.expiresAt && share.expiresAt < now) {
        this.shares.delete(id);
        cleanupCount++;
      }
    }

    if (cleanupCount > 0) {
      await this.persistReports();
      await this.persistExports();
      await this.persistShares();
      this.emit('cleanupCompleted', { cleanupCount });
    }
  }

  /**
   * Load persisted data
   */
  private async loadPersistedData(): Promise<void> {
    try {
      // Load schedules
      const schedules = await this.storage.load<ReportSchedule[]>('report_schedules');
      if (schedules) {
        schedules.forEach(schedule => {
          this.schedules.set(schedule.id, {
            ...schedule,
            createdAt: new Date(schedule.createdAt),
            lastRun: schedule.lastRun ? new Date(schedule.lastRun) : undefined,
            nextRun: schedule.nextRun ? new Date(schedule.nextRun) : undefined
          });
        });
      }

      // Load reports
      const reports = await this.storage.load<GeneratedReport[]>('generated_reports');
      if (reports) {
        reports.forEach(report => {
          this.generatedReports.set(report.id, {
            ...report,
            generatedAt: new Date(report.generatedAt),
            expiresAt: report.expiresAt ? new Date(report.expiresAt) : undefined
          });
        });
      }

      // Load exports
      const exports = await this.storage.load<ReportExport[]>('report_exports');
      if (exports) {
        exports.forEach(exp => {
          this.exports.set(exp.id, {
            ...exp,
            createdAt: new Date(exp.createdAt),
            expiresAt: exp.expiresAt ? new Date(exp.expiresAt) : undefined
          });
        });
      }

      // Load shares
      const shares = await this.storage.load<ReportShare[]>('report_shares');
      if (shares) {
        shares.forEach(share => {
          this.shares.set(share.id, {
            ...share,
            createdAt: new Date(share.createdAt),
            expiresAt: share.expiresAt ? new Date(share.expiresAt) : undefined,
            lastAccessed: share.lastAccessed ? new Date(share.lastAccessed) : undefined
          });
        });
      }
    } catch (error) {
      console.error('Failed to load persisted reporting data:', error);
    }
  }

  /**
   * Persist schedules
   */
  private async persistSchedules(): Promise<void> {
    try {
      await this.storage.save('report_schedules', Array.from(this.schedules.values()));
    } catch (error) {
      console.error('Failed to persist schedules:', error);
    }
  }

  /**
   * Persist reports
   */
  private async persistReports(): Promise<void> {
    try {
      await this.storage.save('generated_reports', Array.from(this.generatedReports.values()));
    } catch (error) {
      console.error('Failed to persist reports:', error);
    }
  }

  /**
   * Persist exports
   */
  private async persistExports(): Promise<void> {
    try {
      await this.storage.save('report_exports', Array.from(this.exports.values()));
    } catch (error) {
      console.error('Failed to persist exports:', error);
    }
  }

  /**
   * Persist shares
   */
  private async persistShares(): Promise<void> {
    try {
      await this.storage.save('report_shares', Array.from(this.shares.values()));
    } catch (error) {
      console.error('Failed to persist shares:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate share ID
   */
  private generateShareId(): string {
    return Math.random().toString(36).substr(2, 12);
  }

  /**
   * Generate token
   */
  private generateToken(): string {
    return crypto.randomUUID();
  }

  /**
   * Destroy reporting service
   */
  async destroy(): Promise<void> {
    // Clear intervals
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Persist final state
    await this.persistSchedules();
    await this.persistReports();
    await this.persistExports();
    await this.persistShares();

    this.initialized = false;
    this.emit('destroyed');
  }
}