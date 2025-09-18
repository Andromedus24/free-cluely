// User Reporting Package Exports
// ==================================

// Core Services
export * from './UserReportingService';
export * from './ReviewWorkflowService';
export * from './ReportManager';

// Factory Functions
// ==================

import { IModerationService } from '../core/ModerationService';
import { IModerationStorage } from '../storage/ModerationStorage';
import { IModerationNotifier } from '../notifications/ModerationNotifier';
import { UserReportingService } from './UserReportingService';
import { ReviewWorkflowService } from './ReviewWorkflowService';
import { ReportManager } from './ReportManager';

/**
 * Create a complete user reporting system
 */
export function createUserReportingSystem(
  moderationService: IModerationService,
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  config?: {
    reporting?: any;
    workflow?: any;
  }
): {
  reportingService: UserReportingService;
  workflowService: ReviewWorkflowService;
  reportManager: ReportManager;
} {
  // Create reporting service
  const reportingService = new UserReportingService(
    moderationService,
    storage,
    notifier,
    config?.reporting
  );

  // Create workflow service
  const workflowService = new ReviewWorkflowService(reportingService);

  // Create report manager
  const reportManager = new ReportManager(reportingService, workflowService);

  return {
    reportingService,
    workflowService,
    reportManager
  };
}

/**
 * Create a minimal reporting system for testing
 */
export function createMinimalReportingSystem(
  moderationService: IModerationService,
  storage: IModerationStorage,
  notifier: IModerationNotifier
): {
  reportingService: UserReportingService;
  workflowService: ReviewWorkflowService;
  reportManager: ReportManager;
} {
  return createUserReportingSystem(moderationService, storage, notifier, {
    reporting: {
      autoAssign: false,
      escalationThreshold: 5,
      resolutionTimeout: 60 * 60 * 1000, // 1 hour
      maxConcurrentReviews: 2
    }
  });
}

/**
 * Create a high-volume reporting system
 */
export function createHighVolumeReportingSystem(
  moderationService: IModerationService,
  storage: IModerationStorage,
  notifier: IModerationNotifier
): {
  reportingService: UserReportingService;
  workflowService: ReviewWorkflowService;
  reportManager: ReportManager;
} {
  return createUserReportingSystem(moderationService, storage, notifier, {
    reporting: {
      autoAssign: true,
      escalationThreshold: 2,
      resolutionTimeout: 15 * 60 * 1000, // 15 minutes
      maxConcurrentReviews: 20
    }
  });
}

// Utility Functions
// ================

import { UserReport, ReportType, ReportSeverity } from '../types/ModerationTypes';

/**
 * Validate report submission data
 */
export function validateReportSubmission(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.content) {
    errors.push('Content is required');
  }

  if (!data.contentType) {
    errors.push('Content type is required');
  }

  if (!data.reporterId) {
    errors.push('Reporter ID is required');
  }

  if (!data.reason || data.reason.trim().length === 0) {
    errors.push('Reason is required');
  }

  if (!data.type || !Object.values(ReportType).includes(data.type)) {
    errors.push('Valid report type is required');
  }

  if (!data.severity || !Object.values(ReportSeverity).includes(data.severity)) {
    errors.push('Valid severity level is required');
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push('Category is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate report priority based on severity and other factors
 */
export function calculateReportPriority(
  severity: ReportSeverity,
  type: ReportType,
  factors?: {
    isRepeatOffender?: boolean;
    hasMultipleReports?: boolean;
    isUrgent?: boolean;
  }
): 'low' | 'medium' | 'high' {
  let score = 0;

  // Base score from severity
  switch (severity) {
    case ReportSeverity.CRITICAL:
      score += 100;
      break;
    case ReportSeverity.HIGH:
      score += 75;
      break;
    case ReportSeverity.MEDIUM:
      score += 50;
      break;
    case ReportSeverity.LOW:
      score += 25;
      break;
  }

  // Adjust based on report type
  switch (type) {
    case ReportType.HARASSMENT:
    case ReportType.HATE_SPEECH:
      score += 20;
      break;
    case ReportType.SPAM:
      score += 5;
      break;
    case ReportType.COPYRIGHT:
      score += 10;
      break;
  }

  // Apply additional factors
  if (factors?.isRepeatOffender) score += 30;
  if (factors?.hasMultipleReports) score += 25;
  if (factors?.isUrgent) score += 40;

  // Determine priority
  if (score >= 100) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/**
 * Generate report summary for notifications
 */
export function generateReportSummary(report: UserReport): string {
  const typeLabels = {
    [ReportType.SPAM]: 'Spam',
    [ReportType.HARASSMENT]: 'Harassment',
    [ReportType.HATE_SPEECH]: 'Hate Speech',
    [ReportType.INAPPROPRIATE_CONTENT]: 'Inappropriate Content',
    [ReportType.COPYRIGHT]: 'Copyright',
    [ReportType.PRIVACY]: 'Privacy Violation',
    [ReportType.VIOLENCE]: 'Violence',
    [ReportType.TERRORISM]: 'Terrorism',
    [ReportType.SELF_HARM]: 'Self Harm',
    [ReportType.FAKE_NEWS]: 'Fake News',
    [ReportType.BULLYING]: 'Bullying',
    [ReportType.OTHER]: 'Other'
  };

  const severityLabels = {
    [ReportSeverity.LOW]: 'Low',
    [ReportSeverity.MEDIUM]: 'Medium',
    [ReportSeverity.HIGH]: 'High',
    [ReportSeverity.CRITICAL]: 'Critical'
  };

  return `${typeLabels[report.type]} - ${severityLabels[report.severity]} severity in ${report.category}`;
}

/**
 * Check if report should be automatically escalated
 */
export function shouldAutoEscalate(report: UserReport, context: {
  userReportCount?: number;
  contentReportCount?: number;
  recentEscalations?: number;
}): boolean {
  // Auto-escalate critical severity
  if (report.severity === ReportSeverity.CRITICAL) {
    return true;
  }

  // Auto-escalate high severity with multiple reports
  if (report.severity === ReportSeverity.HIGH && context.contentReportCount && context.contentReportCount >= 3) {
    return true;
  }

  // Auto-escalate repeat offenders
  if (context.userReportCount && context.userReportCount >= 10) {
    return true;
  }

  // Auto-escalate if recent escalation rate is high
  if (context.recentEscalations && context.recentEscalations >= 5) {
    return true;
  }

  return false;
}

/**
 * Calculate user reputation score based on reporting history
 */
export function calculateUserReputation(reports: UserReport[]): number {
  if (reports.length === 0) return 50; // Neutral score

  const totalReports = reports.length;
  const approvedReports = reports.filter(r => r.status === 'resolved').length;
  const rejectedReports = reports.filter(r => r.status === 'rejected').length;
  const escalatedReports = reports.filter(r => r.escalated).length;

  // Base accuracy score (0-100)
  const accuracyScore = totalReports > 0 ? (approvedReports / totalReports) * 100 : 50;

  // Deductions for rejected reports
  const rejectionPenalty = totalReports > 0 ? (rejectedReports / totalReports) * 30 : 0;

  // Bonus for successful escalations
  const escalationBonus = totalReports > 0 ? (escalatedReports / totalReports) * 10 : 0;

  // Volume bonus (for consistent reporters)
  const volumeBonus = totalReports >= 10 ? 10 : 0;

  // Calculate final score
  let finalScore = accuracyScore - rejectionPenalty + escalationBonus + volumeBonus;
  finalScore = Math.max(0, Math.min(100, finalScore));

  return Math.round(finalScore);
}

/**
 * Generate workflow recommendations based on report characteristics
 */
export function generateWorkflowRecommendations(report: UserReport): Array<{
  templateId: string;
  reason: string;
  confidence: number;
}> {
  const recommendations = [];

  // Recommend urgent workflow for critical severity
  if (report.severity === ReportSeverity.CRITICAL) {
    recommendations.push({
      templateId: 'urgent_review',
      reason: 'Critical severity requires immediate attention',
      confidence: 0.95
    });
  }

  // Recommend specialized workflows for certain types
  if (report.type === ReportType.COPYRIGHT) {
    recommendations.push({
      templateId: 'copyright_review',
      reason: 'Copyright infringement requires legal review',
      confidence: 0.85
    });
  }

  if (report.type === ReportType.PRIVACY) {
    recommendations.push({
      templateId: 'privacy_review',
      reason: 'Privacy violations require careful handling',
      confidence: 0.80
    });
  }

  // Default to standard review
  if (recommendations.length === 0) {
    recommendations.push({
      templateId: 'standard_review',
      reason: 'Standard content review process',
      confidence: 0.70
    });
  }

  return recommendations;
}

// Constants and Defaults
// ======================

export const DEFAULT_REPORTING_CONFIG = {
  autoAssign: true,
  escalationThreshold: 3,
  resolutionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  maxConcurrentReviews: 10,
  enableBulkProcessing: true,
  enableAnalytics: true,
  enableNotifications: true
};

export const REPORTING_SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const REPORTING_ACTION_TYPES = {
  SUBMIT: 'submit',
  REVIEW: 'review',
  APPROVE: 'approve',
  REJECT: 'reject',
  ESCALATE: 'escalate',
  REQUEST_MORE_INFO: 'request_more_info',
  REASSIGN: 'reassign',
  COMPLETE: 'complete'
} as const;

export const SUPPORTED_REPORT_TYPES = [
  'spam',
  'harassment',
  'hate_speech',
  'inappropriate_content',
  'copyright',
  'privacy',
  'violence',
  'terrorism',
  'self_harm',
  'fake_news',
  'bullying',
  'other'
] as const;

export const WORKFLOW_STEP_TYPES = [
  'manual',
  'automatic',
  'approval',
  'escalation'
] as const;

// Version and Package Info
// =========================

export const REPORTING_VERSION = '1.0.0';

export const packageInfo = {
  name: '@atlas/user-reporting',
  version: REPORTING_VERSION,
  description: 'Advanced user reporting and review workflow system for Atlas AI assistant',
  author: 'Atlas Team',
  license: 'MIT',
  repository: 'https://github.com/atlas-ai/atlas',
  dependencies: [
    '@atlas/moderation',
    '@atlas/types'
  ]
};

// Export for backward compatibility
export {
  UserReportingService,
  ReviewWorkflowService,
  ReportManager
};