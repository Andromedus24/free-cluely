import { EventEmitter } from 'events';
import {
  UserReport,
  ReportStatus,
  ReportSeverity,
  ReportType,
  ModerationAnalysis,
  ModerationDecision,
  ReviewWorkflow,
  ReviewAction,
  ReviewPriority
} from '../types/ModerationTypes';
import { IModerationService } from '../core/ModerationService';
import { IModerationStorage } from '../storage/ModerationStorage';
import { IModerationNotifier } from '../notifications/ModerationNotifier';

/**
 * User Reporting Service
 * Handles user-generated content reports and review workflows
 */
export interface IUserReportingService {
  /**
   * Submit a new user report
   */
  submitReport(report: Omit<UserReport, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<UserReport>;

  /**
   * Get report by ID
   */
  getReport(reportId: string): Promise<UserReport | null>;

  /**
   * List reports with filtering
   */
  listReports(filters: ReportFilters): Promise<ReportListResult>;

  /**
   * Update report status
   */
  updateReportStatus(reportId: string, status: ReportStatus, reason?: string): Promise<UserReport>;

  /**
   * Add evidence to a report
   */
  addEvidence(reportId: string, evidence: any[]): Promise<UserReport>;

  /**
   * Get user's report history
   */
  getUserReports(userId: string, limit?: number): Promise<UserReport[]>;

  /**
   * Get similar reports
   */
  getSimilarReports(contentId: string, contentType: string): Promise<UserReport[]>;

  /**
   * Create review workflow for report
   */
  createReviewWorkflow(reportId: string, assignedTo?: string): Promise<ReviewWorkflow>;

  /**
   * Process review action
   */
  processReviewAction(workflowId: string, action: ReviewAction, notes?: string): Promise<ReviewWorkflow>;

  /**
   * Get review queue
   */
  getReviewQueue(filters: ReviewQueueFilters): Promise<ReviewQueueResult>;

  /**
   * Escalate report
   */
  escalateReport(reportId: string, reason: string, priority?: ReviewPriority): Promise<UserReport>;

  /**
   * Get report statistics
   */
  getReportStatistics(timeRange?: { start: Date; end: Date }): Promise<ReportStatistics>;

  /**
   * Bulk update reports
   */
  bulkUpdateReports(reportIds: string[], updates: Partial<UserReport>): Promise<BulkUpdateResult>;
}

export interface ReportFilters {
  status?: ReportStatus[];
  severity?: ReportSeverity[];
  type?: ReportType[];
  category?: string[];
  reporterId?: string;
  assignedTo?: string;
  contentId?: string;
  contentType?: string;
  dateRange?: { start: Date; end: Date };
  priority?: ReviewPriority[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'severity' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface ReportListResult {
  reports: UserReport[];
  total: number;
  hasMore: boolean;
  filters: ReportFilters;
}

export interface ReviewQueueFilters {
  status?: ReviewWorkflow['status'][];
  assignedTo?: string;
  priority?: ReviewPriority[];
  type?: ReportType[];
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

export interface ReviewQueueResult {
  workflows: ReviewWorkflow[];
  total: number;
  hasMore: boolean;
  filters: ReviewQueueFilters;
}

export interface ReportStatistics {
  totalReports: number;
  reportsByStatus: Record<ReportStatus, number>;
  reportsBySeverity: Record<ReportSeverity, number>;
  reportsByType: Record<ReportType, number>;
  reportsByCategory: Record<string, number>;
  averageResolutionTime: number;
  escalationRate: number;
  rejectionRate: number;
  topReporters: Array<{
    userId: string;
    reportCount: number;
    accuracy: number;
  }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface BulkUpdateResult {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * User Reporting Service Implementation
 */
export class UserReportingService extends EventEmitter implements IUserReportingService {
  private reports: Map<string, UserReport> = new Map();
  private workflows: Map<string, ReviewWorkflow> = new Map();
  private reportCounter = 0;
  private workflowCounter = 0;

  constructor(
    private moderationService: IModerationService,
    private storage: IModerationStorage,
    private notifier: IModerationNotifier,
    private config: ReportingConfig = {}
  ) {
    super();
    this.config = {
      autoAssign: true,
      escalationThreshold: 3,
      resolutionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxConcurrentReviews: 5,
      ...config
    };
  }

  async submitReport(reportData: Omit<UserReport, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<UserReport> {
    const reportId = this.generateReportId();
    const now = new Date();

    const report: UserReport = {
      id: reportId,
      ...reportData,
      status: ReportStatus.PENDING,
      createdAt: now,
      updatedAt: now
    };

    // Validate report
    this.validateReport(report);

    // Check for duplicates
    const duplicates = await this.getSimilarReports(report.contentId, report.contentType);
    if (duplicates.length > 0) {
      // Merge with existing report or create as related
      const primaryReport = duplicates[0];
      report.relatedReports = [primaryReport.id, ...duplicates.slice(1).map(r => r.id)];

      // Escalate if multiple reports on same content
      if (duplicates.length >= this.config.escalationThreshold) {
        report.severity = ReportSeverity.HIGH;
        report.priority = ReviewPriority.HIGH;
      }
    }

    // Store report
    this.reports.set(reportId, report);

    // Auto-assign if enabled
    if (this.config.autoAssign) {
      await this.autoAssignReport(report);
    }

    // Analyze content if not already analyzed
    if (!report.analysis) {
      try {
        const analysis = await this.moderationService.analyzeContent(
          report.content,
          report.contentType as any
        );
        report.analysis = analysis;
      } catch (error) {
        console.error('Failed to analyze reported content:', error);
      }
    }

    // Trigger workflow
    await this.createReviewWorkflow(reportId);

    // Notify stakeholders
    await this.notifier.notify('report_submitted', {
      report,
      duplicates: duplicates.length
    });

    this.emit('report_submitted', report);
    return report;
  }

  async getReport(reportId: string): Promise<UserReport | null> {
    return this.reports.get(reportId) || null;
  }

  async listReports(filters: ReportFilters): Promise<ReportListResult> {
    let reports = Array.from(this.reports.values());

    // Apply filters
    if (filters.status) {
      reports = reports.filter(r => filters.status!.includes(r.status));
    }
    if (filters.severity) {
      reports = reports.filter(r => filters.severity!.includes(r.severity));
    }
    if (filters.type) {
      reports = reports.filter(r => filters.type!.includes(r.type));
    }
    if (filters.category) {
      reports = reports.filter(r => filters.category!.includes(r.category));
    }
    if (filters.reporterId) {
      reports = reports.filter(r => r.reporterId === filters.reporterId);
    }
    if (filters.assignedTo) {
      reports = reports.filter(r => r.assignedTo === filters.assignedTo);
    }
    if (filters.contentId) {
      reports = reports.filter(r => r.contentId === filters.contentId);
    }
    if (filters.contentType) {
      reports = reports.filter(r => r.contentType === filters.contentType);
    }
    if (filters.priority) {
      reports = reports.filter(r => filters.priority!.includes(r.priority));
    }
    if (filters.dateRange) {
      reports = reports.filter(r =>
        r.createdAt >= filters.dateRange!.start &&
        r.createdAt <= filters.dateRange!.end
      );
    }

    // Sort
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    reports.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const paginatedReports = reports.slice(offset, offset + limit);

    return {
      reports: paginatedReports,
      total: reports.length,
      hasMore: offset + limit < reports.length,
      filters
    };
  }

  async updateReportStatus(reportId: string, status: ReportStatus, reason?: string): Promise<UserReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const oldStatus = report.status;
    report.status = status;
    report.updatedAt = new Date();

    if (reason) {
      if (!report.resolutionNotes) {
        report.resolutionNotes = [];
      }
      report.resolutionNotes.push({
        note: reason,
        timestamp: new Date(),
        author: 'system'
      });
    }

    // Update related workflow
    const workflow = Array.from(this.workflows.values()).find(w => w.reportId === reportId);
    if (workflow) {
      this.updateWorkflowStatus(workflow, status);
    }

    this.emit('report_status_updated', { report, oldStatus, reason });
    return report;
  }

  async addEvidence(reportId: string, evidence: any[]): Promise<UserReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (!report.evidence) {
      report.evidence = [];
    }

    report.evidence.push(...evidence);
    report.updatedAt = new Date();

    // Re-analyze with new evidence
    if (report.analysis) {
      try {
        const enhancedAnalysis = await this.moderationService.analyzeContent(
          {
            ...report.content,
            evidence: report.evidence
          },
          report.contentType as any
        );
        report.analysis = enhancedAnalysis;
      } catch (error) {
        console.error('Failed to re-analyze with new evidence:', error);
      }
    }

    this.emit('evidence_added', { report, evidence });
    return report;
  }

  async getUserReports(userId: string, limit: number = 50): Promise<UserReport[]> {
    const userReports = Array.from(this.reports.values())
      .filter(r => r.reporterId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return userReports;
  }

  async getSimilarReports(contentId: string, contentType: string): Promise<UserReport[]> {
    return Array.from(this.reports.values()).filter(r =>
      r.contentId === contentId &&
      r.contentType === contentType &&
      r.status !== ReportStatus.REJECTED
    );
  }

  async createReviewWorkflow(reportId: string, assignedTo?: string): Promise<ReviewWorkflow> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const workflowId = this.generateWorkflowId();
    const workflow: ReviewWorkflow = {
      id: workflowId,
      reportId,
      status: 'pending',
      assignedTo: assignedTo || report.assignedTo,
      priority: report.priority,
      type: report.type,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: this.generateReviewSteps(report),
      currentStep: 0
    };

    this.workflows.set(workflowId, workflow);

    // Update report with workflow reference
    report.workflowId = workflowId;
    report.updatedAt = new Date();

    // Notify assignee
    if (workflow.assignedTo) {
      await this.notifier.notify('review_assigned', {
        workflow,
        report
      });
    }

    this.emit('workflow_created', { workflow, report });
    return workflow;
  }

  async processReviewAction(workflowId: string, action: ReviewAction, notes?: string): Promise<ReviewWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const report = this.reports.get(workflow.reportId);
    if (!report) {
      throw new Error(`Report not found for workflow: ${workflowId}`);
    }

    // Add action to history
    if (!workflow.history) {
      workflow.history = [];
    }

    workflow.history.push({
      action,
      timestamp: new Date(),
      performedBy: workflow.assignedTo || 'system',
      notes
    });

    // Process action
    switch (action) {
      case ReviewAction.APPROVE:
        await this.handleApproveAction(workflow, report, notes);
        break;
      case ReviewAction.REJECT:
        await this.handleRejectAction(workflow, report, notes);
        break;
      case ReviewAction.ESCALATE:
        await this.handleEscalateAction(workflow, report, notes);
        break;
      case ReviewAction.REQUEST_MORE_INFO:
        await this.handleRequestMoreInfoAction(workflow, report, notes);
        break;
      default:
        throw new Error(`Unknown review action: ${action}`);
    }

    workflow.updatedAt = new Date();
    this.emit('review_action_processed', { workflow, action, report });
    return workflow;
  }

  async getReviewQueue(filters: ReviewQueueFilters): Promise<ReviewQueueResult> {
    let workflows = Array.from(this.workflows.values());

    // Apply filters
    if (filters.status) {
      workflows = workflows.filter(w => filters.status!.includes(w.status));
    }
    if (filters.assignedTo) {
      workflows = workflows.filter(w => w.assignedTo === filters.assignedTo);
    }
    if (filters.priority) {
      workflows = workflows.filter(w => filters.priority!.includes(w.priority));
    }
    if (filters.type) {
      workflows = workflows.filter(w => w.type === filters.type);
    }
    if (filters.dateRange) {
      workflows = workflows.filter(w =>
        w.createdAt >= filters.dateRange!.start &&
        w.createdAt <= filters.dateRange!.end
      );
    }

    // Sort by priority and creation date
    workflows.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 1;
      const bPriority = priorityOrder[b.priority] || 1;

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Paginate
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const paginatedWorkflows = workflows.slice(offset, offset + limit);

    return {
      workflows: paginatedWorkflows,
      total: workflows.length,
      hasMore: offset + limit < workflows.length,
      filters
    };
  }

  async escalateReport(reportId: string, reason: string, priority: ReviewPriority = ReviewPriority.HIGH): Promise<UserReport> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const oldPriority = report.priority;
    report.priority = priority;
    report.severity = ReportSeverity.HIGH;
    report.escalated = true;
    report.updatedAt = new Date();

    if (!report.resolutionNotes) {
      report.resolutionNotes = [];
    }
    report.resolutionNotes.push({
      note: `Escalated: ${reason}`,
      timestamp: new Date(),
      author: 'system'
    });

    // Update workflow
    const workflow = this.workflows.get(report.workflowId);
    if (workflow) {
      workflow.priority = priority;
      workflow.status = 'escalated';
      workflow.updatedAt = new Date();
    }

    // Notify moderators
    await this.notifier.notify('report_escalated', {
      report,
      reason,
      oldPriority
    });

    this.emit('report_escalated', { report, reason, oldPriority });
    return report;
  }

  async getReportStatistics(timeRange?: { start: Date; end: Date }): Promise<ReportStatistics> {
    let reports = Array.from(this.reports.values());

    if (timeRange) {
      reports = reports.filter(r =>
        r.createdAt >= timeRange.start &&
        r.createdAt <= timeRange.end
      );
    }

    const stats: ReportStatistics = {
      totalReports: reports.length,
      reportsByStatus: {} as Record<ReportStatus, number>,
      reportsBySeverity: {} as Record<ReportSeverity, number>,
      reportsByType: {} as Record<ReportType, number>,
      reportsByCategory: {},
      averageResolutionTime: 0,
      escalationRate: 0,
      rejectionRate: 0,
      topReporters: [],
      timeRange: timeRange || {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      }
    };

    // Calculate statistics
    reports.forEach(report => {
      // Status counts
      stats.reportsByStatus[report.status] = (stats.reportsByStatus[report.status] || 0) + 1;

      // Severity counts
      stats.reportsBySeverity[report.severity] = (stats.reportsBySeverity[report.severity] || 0) + 1;

      // Type counts
      stats.reportsByType[report.type] = (stats.reportsByType[report.type] || 0) + 1;

      // Category counts
      stats.reportsByCategory[report.category] = (stats.reportsByCategory[report.category] || 0) + 1;
    });

    // Calculate rates
    const resolvedReports = reports.filter(r => r.status === ReportStatus.RESOLVED);
    const escalatedReports = reports.filter(r => r.escalated);
    const rejectedReports = reports.filter(r => r.status === ReportStatus.REJECTED);

    stats.escalationRate = reports.length > 0 ? escalatedReports.length / reports.length : 0;
    stats.rejectionRate = reports.length > 0 ? rejectedReports.length / reports.length : 0;

    // Calculate average resolution time
    if (resolvedReports.length > 0) {
      const totalTime = resolvedReports.reduce((sum, report) => {
        const workflow = this.workflows.get(report.workflowId);
        if (workflow && workflow.completedAt) {
          return sum + (workflow.completedAt.getTime() - report.createdAt.getTime());
        }
        return sum;
      }, 0);
      stats.averageResolutionTime = totalTime / resolvedReports.length;
    }

    // Top reporters
    const reporterStats = new Map<string, { count: number; accurate: number }>();
    reports.forEach(report => {
      const current = reporterStats.get(report.reporterId) || { count: 0, accurate: 0 };
      current.count++;
      if (report.status !== ReportStatus.REJECTED) {
        current.accurate++;
      }
      reporterStats.set(report.reporterId, current);
    });

    stats.topReporters = Array.from(reporterStats.entries())
      .map(([userId, stats]) => ({
        userId,
        reportCount: stats.count,
        accuracy: stats.count > 0 ? stats.accurate / stats.count : 0
      }))
      .sort((a, b) => b.reportCount - a.reportCount)
      .slice(0, 10);

    return stats;
  }

  async bulkUpdateReports(reportIds: string[], updates: Partial<UserReport>): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      success: true,
      updatedCount: 0,
      failedCount: 0,
      errors: []
    };

    for (const reportId of reportIds) {
      try {
        const report = this.reports.get(reportId);
        if (!report) {
          result.failedCount++;
          result.errors.push(`Report not found: ${reportId}`);
          continue;
        }

        // Apply updates
        Object.assign(report, updates, { updatedAt: new Date() });
        result.updatedCount++;

      } catch (error) {
        result.failedCount++;
        result.errors.push(`Failed to update report ${reportId}: ${error.message}`);
      }
    }

    result.success = result.failedCount === 0;
    return result;
  }

  // Private Methods
  // ===============

  private validateReport(report: UserReport): void {
    if (!report.content || !report.contentType) {
      throw new Error('Report must include content and contentType');
    }
    if (!report.reporterId) {
      throw new Error('Report must include reporterId');
    }
    if (!report.reason || report.reason.trim().length === 0) {
      throw new Error('Report must include a reason');
    }
  }

  private async autoAssignReport(report: UserReport): Promise<void> {
    // Simple round-robin assignment
    // In production, this would consider workload, expertise, etc.
    const moderators = ['mod1', 'mod2', 'mod3']; // Placeholder
    const assignee = moderators[this.reportCounter % moderators.length];
    this.reportCounter++;

    report.assignedTo = assignee;
  }

  private updateWorkflowStatus(workflow: ReviewWorkflow, reportStatus: ReportStatus): void {
    const statusMap: Record<ReportStatus, ReviewWorkflow['status']> = {
      [ReportStatus.PENDING]: 'pending',
      [ReportStatus.UNDER_REVIEW]: 'in_progress',
      [ReportStatus.RESOLVED]: 'completed',
      [ReportStatus.REJECTED]: 'rejected',
      [ReportStatus.ESCALATED]: 'escalated'
    };

    workflow.status = statusMap[reportStatus] || workflow.status;
    workflow.updatedAt = new Date();

    if (reportStatus === ReportStatus.RESOLVED || reportStatus === ReportStatus.REJECTED) {
      workflow.completedAt = new Date();
    }
  }

  private generateReviewSteps(report: UserReport): ReviewWorkflow['steps'] {
    const baseSteps = [
      {
        id: 'initial_review',
        name: 'Initial Review',
        description: 'Review the reported content and evidence',
        required: true,
        estimatedTime: 5 // minutes
      },
      {
        id: 'content_analysis',
        name: 'Content Analysis',
        description: 'Analyze content against policies',
        required: true,
        estimatedTime: 10
      },
      {
        id: 'decision',
        name: 'Make Decision',
        description: 'Approve, reject, or escalate the report',
        required: true,
        estimatedTime: 5
      }
    ];

    // Add escalation steps if high severity
    if (report.severity === ReportSeverity.HIGH || report.escalated) {
      baseSteps.push({
        id: 'escalation_review',
        name: 'Escalation Review',
        description: 'Senior moderator review required',
        required: true,
        estimatedTime: 15
      });
    }

    return baseSteps;
  }

  private async handleApproveAction(workflow: ReviewWorkflow, report: UserReport, notes?: string): Promise<void> {
    report.status = ReportStatus.RESOLVED;
    workflow.status = 'completed';
    workflow.completedAt = new Date();

    if (!report.resolutionNotes) {
      report.resolutionNotes = [];
    }
    report.resolutionNotes.push({
      note: `Approved: ${notes || 'Report validated'}`,
      timestamp: new Date(),
      author: workflow.assignedTo || 'system'
    });

    // Apply moderation decision
    const decision: ModerationDecision = {
      id: this.generateId(),
      reportId: report.id,
      action: report.recommendedAction || 'remove',
      reason: notes || 'User report validated',
      confidence: 0.9,
      moderatorId: workflow.assignedTo || 'system',
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    await this.moderationService.applyDecision(decision);
  }

  private async handleRejectAction(workflow: ReviewWorkflow, report: UserReport, notes?: string): Promise<void> {
    report.status = ReportStatus.REJECTED;
    workflow.status = 'rejected';
    workflow.completedAt = new Date();

    if (!report.resolutionNotes) {
      report.resolutionNotes = [];
    }
    report.resolutionNotes.push({
      note: `Rejected: ${notes || 'Report not valid'}`,
      timestamp: new Date(),
      author: workflow.assignedTo || 'system'
    });
  }

  private async handleEscalateAction(workflow: ReviewWorkflow, report: UserReport, notes?: string): Promise<void> {
    workflow.status = 'escalated';
    workflow.assignedTo = null; // Clear assignment for re-assignment

    if (!report.resolutionNotes) {
      report.resolutionNotes = [];
    }
    report.resolutionNotes.push({
      note: `Escalated: ${notes}`,
      timestamp: new Date(),
      author: workflow.assignedTo || 'system'
    });

    // Notify escalation team
    await this.notifier.notify('review_escalated', {
      workflow,
      report,
      reason: notes
    });
  }

  private async handleRequestMoreInfoAction(workflow: ReviewWorkflow, report: UserReport, notes?: string): Promise<void> {
    workflow.status = 'waiting_for_info';

    if (!report.resolutionNotes) {
      report.resolutionNotes = [];
    }
    report.resolutionNotes.push({
      note: `More info requested: ${notes}`,
      timestamp: new Date(),
      author: workflow.assignedTo || 'system'
    });

    // Notify reporter
    await this.notifier.notify('info_requested', {
      workflow,
      report,
      request: notes
    });
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Type Definitions
// ================

export interface ReportingConfig {
  autoAssign: boolean;
  escalationThreshold: number;
  resolutionTimeout: number;
  maxConcurrentReviews: number;
}