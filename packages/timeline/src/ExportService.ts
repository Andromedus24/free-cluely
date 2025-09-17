import { TimelineService } from './TimelineService';
import { SearchService } from './SearchService';
import {
  TimelineEntry,
  ExportOptions,
  ExportJob,
  ExportFormat,
  ExportStatus,
  TimelineFilter,
  TimelineAnalytics,
} from './types/TimelineTypes';

export class ExportService {
  private timelineService: TimelineService;
  private searchService: SearchService;
  private exportJobs: Map<string, ExportJob> = new Map();
  private exportTemplates: Map<string, ExportTemplate> = new Map();

  constructor(timelineService: TimelineService, searchService: SearchService) {
    this.timelineService = timelineService;
    this.searchService = searchService;
    this.initializeDefaultTemplates();
  }

  async createExport(options: ExportOptions): Promise<ExportJob> {
    const id = this.generateExportId();
    const job: ExportJob = {
      id,
      status: 'pending',
      format: options.format,
      filter: options.filter || {},
      options,
      progress: 0,
      createdAt: new Date(),
    };

    this.exportJobs.set(id, job);

    // Start export process asynchronously
    this.processExport(id).catch(error => {
      console.error(`Export failed: ${id}`, error);
      this.updateJobStatus(id, 'failed', error.message);
    });

    return job;
  }

  async getExportJob(id: string): Promise<ExportJob | null> {
    return this.exportJobs.get(id) || null;
  }

  async cancelExport(id: string): Promise<boolean> {
    const job = this.exportJobs.get(id);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.exportJobs.set(id, job);
    return true;
  }

  async listExportJobs(limit = 50, offset = 0): Promise<ExportJob[]> {
    return Array.from(this.exportJobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async exportToFormat(entries: TimelineEntry[], format: ExportFormat, options: ExportOptions): Promise<{
    data: any;
    filename: string;
    mimeType: string;
  }> {
    switch (format) {
      case 'json':
        return this.exportToJson(entries, options);
      case 'csv':
        return this.exportToCsv(entries, options);
      case 'pdf':
        return this.exportToPdf(entries, options);
      case 'xml':
        return this.exportToXml(entries, options);
      case 'xlsx':
        return this.exportToExcel(entries, options);
      case 'html':
        return this.exportToHtml(entries, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async createExportTemplate(name: string, template: ExportTemplate): Promise<void> {
    this.exportTemplates.set(name, template);
  }

  async getExportTemplate(name: string): Promise<ExportTemplate | null> {
    return this.exportTemplates.get(name) || null;
  }

  async listExportTemplates(): Promise<Array<{ name: string; template: ExportTemplate }>> {
    return Array.from(this.exportTemplates.entries()).map(([name, template]) => ({
      name,
      template,
    }));
  }

  async exportAnalytics(filter?: TimelineFilter): Promise<string> {
    const analytics = await this.timelineService.getAnalytics();
    const analyticsFilter = filter ? { ...filter } : {};

    const exportData = {
      analytics,
      filter: analyticsFilter,
      exportedAt: new Date(),
      summary: this.generateAnalyticsSummary(analytics),
    };

    return JSON.stringify(exportData, null, 2);
  }

  async batchExport(requests: ExportOptions[]): Promise<ExportJob[]> {
    const jobs: ExportJob[] = [];

    for (const options of requests) {
      try {
        const job = await this.createExport(options);
        jobs.push(job);
      } catch (error) {
        console.error('Batch export job creation failed:', error);
      }
    }

    return jobs;
  }

  async exportWithSearch(query: string, format: ExportFormat, options: Partial<ExportOptions> = {}): Promise<ExportJob> {
    const searchResults = await this.searchService.search({
      text: query,
      limit: 10000,
    });

    const exportOptions: ExportOptions = {
      format,
      filter: {}, // Search results are already filtered
      ...options,
    };

    // Store the entry IDs for the export
    exportOptions.filter = {
      ...exportOptions.filter,
      // In a real implementation, we'd need to filter by the specific entry IDs
    };

    return this.createExport(exportOptions);
  }

  async validateExportOptions(options: ExportOptions): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate format
    const supportedFormats: ExportFormat[] = ['json', 'csv', 'pdf', 'xml', 'xlsx', 'html'];
    if (!supportedFormats.includes(options.format)) {
      errors.push(`Unsupported format: ${options.format}`);
    }

    // Validate filter
    if (options.filter) {
      try {
        // Test the filter with a small query
        await this.timelineService.queryTimeline({
          filter: options.filter,
          pagination: { limit: 1 },
        });
      } catch (error) {
        errors.push(`Invalid filter: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Validate template
    if (options.template && !this.exportTemplates.has(options.template)) {
      errors.push(`Template not found: ${options.template}`);
    }

    // Validate encryption
    if (options.encryption?.enabled && !options.encryption.key) {
      errors.push('Encryption key is required when encryption is enabled');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async getExportFormats(): Promise<Array<{
    format: ExportFormat;
    name: string;
    description: string;
    mimeType: string;
    extension: string;
  }>> {
    return [
      {
        format: 'json',
        name: 'JSON',
        description: 'JavaScript Object Notation format',
        mimeType: 'application/json',
        extension: 'json',
      },
      {
        format: 'csv',
        name: 'CSV',
        description: 'Comma-separated values format',
        mimeType: 'text/csv',
        extension: 'csv',
      },
      {
        format: 'pdf',
        name: 'PDF',
        description: 'Portable Document Format',
        mimeType: 'application/pdf',
        extension: 'pdf',
      },
      {
        format: 'xml',
        name: 'XML',
        description: 'eXtensible Markup Language format',
        mimeType: 'application/xml',
        extension: 'xml',
      },
      {
        format: 'xlsx',
        name: 'Excel',
        description: 'Microsoft Excel format',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      },
      {
        format: 'html',
        name: 'HTML',
        description: 'HyperText Markup Language format',
        mimeType: 'text/html',
        extension: 'html',
      },
    ];
  }

  // Private helper methods
  private async processExport(id: string): Promise<void> {
    const job = this.exportJobs.get(id);
    if (!job) throw new Error(`Export job not found: ${id}`);

    try {
      job.status = 'processing';
      job.progress = 0;

      // Get entries based on filter
      const entries = await this.timelineService.queryTimeline({
        filter: job.filter,
        pagination: { limit: 10000 },
      }).then(result => result.entries);

      job.progress = 20;

      // Apply template if specified
      let processedEntries = entries;
      if (job.options.template) {
        const template = this.exportTemplates.get(job.options.template);
        if (template) {
          processedEntries = this.applyTemplate(entries, template);
        }
      }

      job.progress = 40;

      // Export to format
      const exportResult = await this.exportToFormat(processedEntries, job.format, job.options);
      job.progress = 80;

      // Handle compression if requested
      let data = exportResult.data;
      let filename = exportResult.filename;
      if (job.options.compression) {
        const compressed = await this.compressData(data);
        data = compressed.data;
        filename = `${filename}.gz`;
      }

      // Handle encryption if requested
      if (job.options.encryption?.enabled) {
        const encrypted = await this.encryptData(data, job.options.encryption.key);
        data = encrypted.data;
        filename = `${filename}.enc`;
      }

      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();
      job.fileSize = Buffer.byteLength(JSON.stringify(data));
      job.downloadUrl = `/api/timeline/exports/${id}/download`;

      this.exportJobs.set(id, job);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.exportJobs.set(id, job);
      throw error;
    }
  }

  private updateJobStatus(id: string, status: ExportStatus, error?: string): void {
    const job = this.exportJobs.get(id);
    if (job) {
      job.status = status;
      if (error) job.error = error;
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        job.completedAt = new Date();
      }
      this.exportJobs.set(id, job);
    }
  }

  private async exportToJson(entries: TimelineEntry[], options: ExportOptions): Promise<{
    data: any;
    filename: string;
    mimeType: string;
  }> {
    const data = {
      export: {
        format: 'json',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        totalEntries: entries.length,
        filter: options.filter,
        options: {
          includeArtifacts: options.includeArtifacts,
          includeMetadata: options.includeMetadata,
        },
      },
      entries: entries.map(entry => this.serializeEntryForExport(entry, options)),
    };

    return {
      data,
      filename: `timeline-export-${Date.now()}.json`,
      mimeType: 'application/json',
    };
  }

  private async exportToCsv(entries: TimelineEntry[], options: ExportOptions): Promise<{
    data: string;
    filename: string;
    mimeType: string;
  }> {
    const headers = this.getCsvHeaders(options);
    const rows = entries.map(entry => this.convertEntryToCsvRow(entry, options));

    const csvContent = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(header =>
          this.escapeCsvValue(row[header] || '')
        ).join(',')
      )
    ].join('\n');

    return {
      data: csvContent,
      filename: `timeline-export-${Date.now()}.csv`,
      mimeType: 'text/csv',
    };
  }

  private async exportToPdf(entries: TimelineEntry[], options: ExportOptions): Promise<{
    data: string;
    filename: string;
    mimeType: string;
  }> {
    // Simplified PDF export - in production, use a proper PDF library
    const htmlContent = this.generateHtmlReport(entries, options);

    return {
      data: htmlContent, // This would be actual PDF data in production
      filename: `timeline-export-${Date.now()}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  private async exportToXml(entries: TimelineEntry[], options: ExportOptions): Promise<{
    data: string;
    filename: string;
    mimeType: string;
  }> {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<timelineExport>
  <metadata>
    <format>xml</format>
    <version>1.0</version>
    <exportedAt>${new Date().toISOString()}</exportedAt>
    <totalEntries>${entries.length}</totalEntries>
  </metadata>
  <entries>
    ${entries.map(entry => this.convertEntryToXml(entry, options)).join('\n    ')}
  </entries>
</timelineExport>`;

    return {
      data: xmlContent,
      filename: `timeline-export-${Date.now()}.xml`,
      mimeType: 'application/xml',
    };
  }

  private async exportToExcel(entries: TimelineEntry[], options: ExportOptions): Promise<{
    data: any;
    filename: string;
    mimeType: string;
  }> {
    // Simplified Excel export - in production, use a proper Excel library
    const data = {
      sheets: {
        Timeline: entries.map(entry => this.serializeEntryForExport(entry, options)),
        Summary: this.generateSummaryData(entries),
      },
    };

    return {
      data,
      filename: `timeline-export-${Date.now()}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private async exportToHtml(entries: TimelineEntry[], options: ExportOptions): Promise<{
    data: string;
    filename: string;
    mimeType: string;
  }> {
    const htmlContent = this.generateHtmlReport(entries, options);

    return {
      data: htmlContent,
      filename: `timeline-export-${Date.now()}.html`,
      mimeType: 'text/html',
    };
  }

  private serializeEntryForExport(entry: TimelineEntry, options: ExportOptions): any {
    const serialized: any = {
      id: entry.id,
      type: entry.type,
      status: entry.status,
      title: entry.title,
      description: entry.description,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      tags: entry.tags,
      duration: entry.duration,
      cost: entry.cost,
      confidence: entry.confidence,
      priority: entry.priority,
    };

    if (options.includeMetadata) {
      serialized.metadata = entry.metadata;
    }

    if (options.includeArtifacts && entry.artifacts) {
      serialized.artifacts = entry.artifacts;
    }

    if (options.fields) {
      const filtered: any = {};
      for (const field of options.fields) {
        if (field in serialized) {
          filtered[field] = serialized[field];
        }
      }
      return filtered;
    }

    return serialized;
  }

  private getCsvHeaders(options: ExportOptions): string[] {
    const baseHeaders = [
      'id', 'type', 'status', 'title', 'description', 'createdAt', 'updatedAt',
      'duration', 'cost', 'confidence', 'priority', 'tags',
    ];

    if (options.includeMetadata) {
      baseHeaders.push('metadata');
    }

    if (options.includeArtifacts) {
      baseHeaders.push('artifacts');
    }

    if (options.fields) {
      return options.fields.filter(field => baseHeaders.includes(field));
    }

    return baseHeaders;
  }

  private convertEntryToCsvRow(entry: TimelineEntry, options: ExportOptions): Record<string, string> {
    const row: Record<string, string> = {
      id: entry.id,
      type: entry.type,
      status: entry.status,
      title: entry.title,
      description: entry.description || '',
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      duration: entry.duration?.toString() || '',
      cost: entry.cost?.toString() || '',
      confidence: entry.confidence?.toString() || '',
      priority: entry.priority || '',
      tags: entry.tags.join(';'),
    };

    if (options.includeMetadata) {
      row.metadata = JSON.stringify(entry.metadata);
    }

    if (options.includeArtifacts && entry.artifacts) {
      row.artifacts = JSON.stringify(entry.artifacts);
    }

    return row;
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private convertEntryToXml(entry: TimelineEntry, options: ExportOptions): string {
    const serialized = this.serializeEntryForExport(entry, options);
    const xmlParts = ['<entry>'];

    for (const [key, value] of Object.entries(serialized)) {
      xmlParts.push(`  <${key}>${this.escapeXmlValue(value)}</${key}>`);
    }

    xmlParts.push('</entry>');
    return xmlParts.join('\n');
  }

  private escapeXmlValue(value: any): string {
    if (typeof value === 'string') {
      return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    return String(value);
  }

  private generateHtmlReport(entries: TimelineEntry[], options: ExportOptions): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Timeline Export Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; margin-bottom: 20px; }
        .entry { border: 1px solid #ddd; margin: 10px 0; padding: 15px; }
        .entry-header { font-weight: bold; color: #333; }
        .entry-meta { color: #666; font-size: 0.9em; margin: 5px 0; }
        .entry-description { margin: 10px 0; }
        .entry-tags { margin: 10px 0; }
        .tag { background: #e0e0e0; padding: 2px 6px; margin: 2px; border-radius: 3px; font-size: 0.8em; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Timeline Export Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Total Entries: ${entries.length}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Title</th>
                <th>Created</th>
                <th>Duration</th>
                <th>Cost</th>
            </tr>
        </thead>
        <tbody>
            ${entries.map(entry => `
                <tr>
                    <td>${entry.id}</td>
                    <td>${entry.type}</td>
                    <td>${entry.status}</td>
                    <td>${entry.title}</td>
                    <td>${entry.createdAt.toLocaleString()}</td>
                    <td>${entry.duration || '-'}</td>
                    <td>${entry.cost || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="entries">
        ${entries.map(entry => `
            <div class="entry">
                <div class="entry-header">${entry.title}</div>
                <div class="entry-meta">
                    Type: ${entry.type} | Status: ${entry.status} |
                    Created: ${entry.createdAt.toLocaleString()}
                    ${entry.duration ? `| Duration: ${entry.duration}ms` : ''}
                    ${entry.cost ? `| Cost: $${entry.cost}` : ''}
                </div>
                ${entry.description ? `<div class="entry-description">${entry.description}</div>` : ''}
                ${entry.tags.length > 0 ? `
                    <div class="entry-tags">
                        ${entry.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  private generateSummaryData(entries: TimelineEntry[]): any[] {
    const summary = [
      {
        Metric: 'Total Entries',
        Value: entries.length,
      },
      {
        Metric: 'Completed',
        Value: entries.filter(e => e.status === 'completed').length,
      },
      {
        Metric: 'Failed',
        Value: entries.filter(e => e.status === 'failed').length,
      },
      {
        Metric: 'Average Duration',
        Value: this.calculateAverageDuration(entries),
      },
      {
        Metric: 'Total Cost',
        Value: this.calculateTotalCost(entries),
      },
    ];

    return summary;
  }

  private generateAnalyticsSummary(analytics: TimelineAnalytics): any {
    return {
      totalJobs: analytics.totalJobs,
      successRate: ((analytics.completedJobs / analytics.totalJobs) * 100).toFixed(2) + '%',
      averageDuration: analytics.averageDuration.toFixed(2) + 'ms',
      totalCost: '$' + analytics.totalCost.toFixed(2),
      topJobType: Object.entries(analytics.jobsByType).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A',
    };
  }

  private calculateAverageDuration(entries: TimelineEntry[]): number {
    const completedEntries = entries.filter(e => e.duration !== undefined);
    if (completedEntries.length === 0) return 0;
    const total = completedEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    return total / completedEntries.length;
  }

  private calculateTotalCost(entries: TimelineEntry[]): number {
    return entries.reduce((sum, e) => sum + (e.cost || 0), 0);
  }

  private applyTemplate(entries: TimelineEntry[], template: ExportTemplate): TimelineEntry[] {
    return entries.map(entry => {
      const processed = { ...entry };

      if (template.fieldMappings) {
        for (const [source, target] of Object.entries(template.fieldMappings)) {
          if (source in processed) {
            (processed as any)[target] = (processed as any)[source];
            delete (processed as any)[source];
          }
        }
      }

      if (template.transformations) {
        for (const transformation of template.transformations) {
          if (transformation.field in processed) {
            (processed as any)[transformation.field] = transformation.value;
          }
        }
      }

      return processed;
    });
  }

  private async compressData(data: any): Promise<{ data: any }> {
    // Simplified compression - in production, use actual compression libraries
    return { data };
  }

  private async encryptData(data: any, key: string): Promise<{ data: any }> {
    // Simplified encryption - in production, use actual encryption libraries
    return { data: `encrypted:${key}:${JSON.stringify(data)}` };
  }

  private initializeDefaultTemplates(): void {
    const minimalTemplate: ExportTemplate = {
      name: 'minimal',
      description: 'Minimal export with only essential fields',
      fields: ['id', 'type', 'status', 'title', 'createdAt'],
    };

    const detailedTemplate: ExportTemplate = {
      name: 'detailed',
      description: 'Detailed export with all fields and artifacts',
      includeArtifacts: true,
      includeMetadata: true,
    };

    const analyticsTemplate: ExportTemplate = {
      name: 'analytics',
      description: 'Analytics-focused export with performance metrics',
      fields: ['id', 'type', 'status', 'duration', 'cost', 'confidence', 'createdAt'],
      transformations: [
        { field: 'duration', value: 'ms' },
        { field: 'cost', value: 'USD' },
      ],
    };

    this.exportTemplates.set('minimal', minimalTemplate);
    this.exportTemplates.set('detailed', detailedTemplate);
    this.exportTemplates.set('analytics', analyticsTemplate);
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface ExportTemplate {
  name: string;
  description: string;
  fields?: string[];
  includeArtifacts?: boolean;
  includeMetadata?: boolean;
  fieldMappings?: Record<string, string>;
  transformations?: Array<{
    field: string;
    value: any;
  }>;
}