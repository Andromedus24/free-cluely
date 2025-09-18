// Compliance Package Exports
// ========================

// Core Services
export * from './ComplianceService';
export * from './AuditTrail';

// Types and Interfaces
// ====================

// Import compliance types (these would be defined in a separate types file)
export interface ComplianceStatus {
  status: 'compliant' | 'non_compliant' | 'partial' | 'unknown';
  score: number;
  lastAssessed: Date;
  nextReview: Date;
}

export interface CompliancePolicy {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  version: string;
  status: 'active' | 'draft' | 'deprecated' | 'retired';
  requirements: string[];
  controls: string[];
  evidenceRequirements: string[];
  reviewFrequency: number; // days
  effectiveDate: Date;
  reviewDate: Date;
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface ComplianceAudit {
  id: string;
  framework: string;
  policies: string[];
  scope: 'full' | 'partial' | 'targeted';
  depth: 'basic' | 'standard' | 'comprehensive';
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  auditor: string;
  reviewers?: string[];
  findings: AuditFinding[];
  violations: ComplianceViolation[];
  score: number;
  recommendations: string[];
  evidence: EvidenceRecord[];
  metadata?: Record<string, any>;
}

export interface AuditFinding {
  id: string;
  policyId: string;
  controlId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence?: string[];
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'deferred';
  assignee?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceViolation {
  id: string;
  policyId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  detectedAt: Date;
  detectedBy: string;
  affectedResources: string[];
  evidence?: string[];
  status: 'open' | 'investigating' | 'resolved' | 'escalated';
  assignee?: string;
  resolution?: string;
  resolvedAt?: Date;
  impact: RiskAssessment;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  description: string;
  version: string;
  authority: string;
  url?: string;
  requirements: string[];
  categories: string[];
  mappings?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface ComplianceReport {
  id: string;
  title: string;
  framework: string;
  format: 'pdf' | 'html' | 'json' | 'csv';
  generatedAt: Date;
  timeRange: TimeRange;
  executiveSummary: string;
  overview: ReportOverview;
  policyAnalysis: PolicyAnalysis;
  auditResults: AuditResults;
  violationAnalysis: ViolationAnalysis;
  metrics: ComplianceMetrics;
  recommendations: string[];
  attachments: ReportAttachment[];
  metadata: Record<string, any>;
}

export interface ReportOverview {
  totalPolicies: number;
  activePolicies: number;
  totalAudits: number;
  completedAudits: number;
  totalViolations: number;
  openViolations: number;
  overallScore: number;
}

export interface PolicyAnalysis {
  byCategory: Record<string, PolicyCategorySummary>;
  byFramework: Record<string, FrameworkSummary>;
  coverage: CoverageAnalysis;
  trends: TrendData[];
}

export interface PolicyCategorySummary {
  category: string;
  totalPolicies: number;
  activePolicies: number;
  complianceRate: number;
  averageAge: number;
  upcomingReviews: number;
}

export interface FrameworkSummary {
  framework: string;
  totalPolicies: number;
  activePolicies: number;
  complianceScore: number;
  lastAudit?: Date;
}

export interface CoverageAnalysis {
  overallCoverage: number;
  byCategory: Record<string, number>;
  gaps: CoverageGap[];
}

export interface CoverageGap {
  category: string;
  missingControls: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
}

export interface AuditResults {
  totalAudits: number;
  completedAudits: number;
  averageScore: number;
  byType: Record<string, AuditTypeSummary>;
  trends: TrendData[];
}

export interface AuditTypeSummary {
  type: string;
  count: number;
  averageScore: number;
  completionRate: number;
}

export interface ViolationAnalysis {
  totalViolations: number;
  openViolations: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  trends: TrendData[];
  resolutionTimes: ResolutionTimeMetrics;
}

export interface ResolutionTimeMetrics {
  average: number;
  median: number;
  p95: number;
  bySeverity: Record<string, number>;
}

export interface ReportAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  description?: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  factors: RiskFactor[];
  likelihood: 'unlikely' | 'possible' | 'likely' | 'very_likely';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string[];
}

export interface RiskFactor {
  factor: string;
  weight: number;
  score: number;
  description: string;
}

export interface ComplianceMetrics {
  overallScore: number;
  policyMetrics: PolicyMetrics;
  auditMetrics: AuditMetrics;
  violationMetrics: ViolationMetrics;
  trainingMetrics: TrainingMetrics;
  timeRange: TimeRange;
  calculatedAt: Date;
}

export interface PolicyMetrics {
  totalPolicies: number;
  activePolicies: number;
  complianceRate: number;
  reviewCompliance: number;
  averageAge: number;
  byCategory: Record<string, CategoryMetrics>;
}

export interface CategoryMetrics {
  total: number;
  active: number;
  complianceRate: number;
  upcomingReviews: number;
}

export interface AuditMetrics {
  totalAudits: number;
  completedAudits: number;
  averageScore: number;
  completionRate: number;
  averageDuration: number;
  byFramework: Record<string, FrameworkMetrics>;
}

export interface FrameworkMetrics {
  totalAudits: number;
  completedAudits: number;
  averageScore: number;
  lastAuditDate?: Date;
}

export interface ViolationMetrics {
  totalViolations: number;
  openViolations: number;
  violationRate: number;
  averageResolutionTime: number;
  bySeverity: Record<string, SeverityMetrics>;
  byCategory: Record<string, CategoryViolationMetrics>;
}

export interface SeverityMetrics {
  count: number;
  rate: number;
  averageResolutionTime: number;
}

export interface CategoryViolationMetrics {
  count: number;
  rate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface TrainingMetrics {
  totalTrainings: number;
  completedTrainings: number;
  completionRate: number;
  averageScore: number;
  byRole: Record<string, RoleTrainingMetrics>;
}

export interface RoleTrainingMetrics {
  totalTrainings: number;
  completedTrainings: number;
  completionRate: number;
  averageScore: number;
}

export interface EvidenceRecord {
  id: string;
  type: string;
  title: string;
  description?: string;
  content: string;
  format: 'text' | 'document' | 'image' | 'video' | 'audio' | 'other';
  policyId?: string;
  auditId?: string;
  controlId?: string;
  collectedAt: Date;
  collectedBy: string;
  verifiedBy?: string;
  verifiedAt?: Date;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  expiryDate?: Date;
  tags: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ComplianceWorkflow {
  id: string;
  name: string;
  description: string;
  type: 'audit' | 'violation' | 'policy_review' | 'evidence_collection';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  steps: WorkflowStep[];
  currentStep: number;
  startTime?: Date;
  endTime?: Date;
  assignedTo?: string;
  result?: any;
  error?: string;
  executionTime?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'manual' | 'automatic' | 'approval' | 'notification';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  assignedTo?: string;
  input?: any;
  output?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  executionTime?: number;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface ComplianceNotification {
  id: string;
  type: 'violation' | 'audit_due' | 'policy_review' | 'remediation' | 'training';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  recipients: string[];
  channels: NotificationChannel[];
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'teams' | 'webhook' | 'sms';
  config: Record<string, any>;
  status: 'active' | 'inactive';
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  description: string;
  dataType: string;
  retentionPeriod: number; // days
  action: 'delete' | 'archive' | 'anonymize';
  conditions: RetentionCondition[];
  exceptions: RetentionException[];
  approvedBy: string;
  effectiveDate: Date;
  reviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: any;
}

export interface RetentionException {
  condition: string;
  description: string;
  retentionPeriod?: number; // override default
}

export interface PrivacyPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  jurisdiction: string;
  dataCategories: DataCategory[];
  userRights: UserRight[];
  dataProcessing: DataProcessingActivity[];
  thirdPartySharing: ThirdPartySharing[];
  retention: DataRetentionPolicy[];
  securityMeasures: string[];
  approvedBy: string;
  effectiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataCategory {
  name: string;
  description: string;
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  legalBasis: string[];
  retentionPeriod: number;
  processingPurpose: string[];
}

export interface UserRight {
  right: string;
  description: string;
  process: string;
  timeframe: string;
  contact: string;
}

export interface DataProcessingActivity {
  purpose: string;
  dataCategories: string[];
  legalBasis: string;
  retentionPeriod: number;
  thirdParties: string[];
  securityMeasures: string[];
}

export interface ThirdPartySharing {
  recipient: string;
  purpose: string;
  dataCategories: string[];
  legalBasis: string;
  securityMeasures: string[];
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  domains: SecurityDomain[];
  controls: SecurityControl[];
  standards: SecurityStandard[];
  approvedBy: string;
  effectiveDate: Date;
  reviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityDomain {
  name: string;
  description: string;
  objectives: string[];
  risks: SecurityRisk[];
}

export interface SecurityRisk {
  name: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string[];
}

export interface SecurityControl {
  id: string;
  name: string;
  description: string;
  type: 'technical' | 'administrative' | 'physical';
  category: string;
  implementation: string;
  verification: string;
  frequency: string;
  owner: string;
  status: 'implemented' | 'partial' | 'planned' | 'not_applicable';
}

export interface SecurityStandard {
  name: string;
  version: string;
  authority: string;
  mapping: Record<string, string>;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  version: string;
  scope: GovernanceScope;
  principles: GovernancePrinciple[];
  roles: GovernanceRole[];
  processes: GovernanceProcess[];
  oversight: GovernanceOversight;
  approvedBy: string;
  effectiveDate: Date;
  reviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GovernanceScope {
  organizational: string[];
  geographical: string[];
  functional: string[];
}

export interface GovernancePrinciple {
  name: string;
  description: string;
  rationale: string;
  implications: string[];
}

export interface GovernanceRole {
  name: string;
  description: string;
  responsibilities: string[];
  authority: string[];
  accountability: string[];
}

export interface GovernanceProcess {
  name: string;
  description: string;
  frequency: string;
  participants: string[];
  inputs: string[];
  outputs: string[];
  metrics: string[];
}

export interface GovernanceOversight {
  board: OversightBody;
  committees: OversightBody[];
  escalation: EscalationProcess[];
  reporting: ReportingRequirement[];
}

export interface OversightBody {
  name: string;
  purpose: string;
  composition: string[];
  responsibilities: string[];
  meetingFrequency: string;
}

export interface EscalationProcess {
  trigger: string;
  levels: EscalationLevel[];
  timeline: string;
}

export interface EscalationLevel {
  level: number;
  role: string;
  authority: string;
  timeframe: string;
}

export interface ReportingRequirement {
  type: string;
  frequency: string;
  recipients: string[];
  content: string[];
  format: string;
  timeline: string;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface TrendData {
  date: string;
  value: number;
  change?: number;
  significance?: number;
}

// Factory Functions
// ==================

import { IModerationStorage } from '../storage/ModerationStorage';
import { IModerationNotifier } from '../notifications/ModerationNotifier';
import { ComplianceService, IComplianceService } from './ComplianceService';
import { AuditTrail, IAuditTrail, AuditTrailConfig } from './AuditTrail';

/**
 * Create a complete compliance system
 */
export function createComplianceSystem(
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  config?: {
    auditTrail?: Partial<AuditTrailConfig>;
    compliance?: {
      enableAutoAudits?: boolean;
      auditInterval?: number;
    };
  }
): {
  complianceService: ComplianceService;
  auditTrail: AuditTrail;
} {
  // Create audit trail
  const auditTrail = new AuditTrail(storage, config?.auditTrail);

  // Create compliance service
  const complianceService = new ComplianceService(
    storage,
    notifier,
    {
      auditTrail,
      enableAutoAudits: config?.compliance?.enableAutoAudits,
      auditInterval: config?.compliance?.auditInterval
    }
  );

  return {
    complianceService,
    auditTrail
  };
}

/**
 * Create a lightweight compliance system for smaller deployments
 */
export function createLightweightComplianceSystem(
  storage: IModerationStorage,
  notifier: IModerationNotifier
): {
  complianceService: ComplianceService;
  auditTrail: AuditTrail;
} {
  return createComplianceSystem(storage, notifier, {
    auditTrail: {
      enabled: true,
      logLevel: 'info',
      retentionDays: 90,
      enableEncryption: false,
      enableCompression: true,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      includeSensitiveData: false
    },
    compliance: {
      enableAutoAudits: true,
      auditInterval: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  });
}

/**
 * Create an enterprise-grade compliance system
 */
export function createEnterpriseComplianceSystem(
  storage: IModerationStorage,
  notifier: IModerationNotifier
): {
  complianceService: ComplianceService;
  auditTrail: AuditTrail;
} {
  return createComplianceSystem(storage, notifier, {
    auditTrail: {
      enabled: true,
      logLevel: 'debug',
      retentionDays: 2555, // 7 years
      enableEncryption: true,
      enableCompression: true,
      batchSize: 200,
      flushInterval: 5000, // 5 seconds
      includeSensitiveData: false,
      customFields: ['department', 'cost_center', 'project_code']
    },
    compliance: {
      enableAutoAudits: true,
      auditInterval: 24 * 60 * 60 * 1000 // 24 hours
    }
  });
}

// Utility Functions
// ================

import { ComplianceFramework } from './ComplianceService';

/**
 * Validate compliance framework configuration
 */
export function validateFrameworkConfiguration(framework: ComplianceFramework): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!framework.name || framework.name.trim().length === 0) {
    errors.push('Framework name is required');
  }

  if (!framework.id || framework.id.trim().length === 0) {
    errors.push('Framework ID is required');
  }

  if (!framework.requirements || framework.requirements.length === 0) {
    errors.push('Framework must have at least one requirement');
  }

  if (!framework.categories || framework.categories.length === 0) {
    warnings.push('Framework has no categories defined');
  }

  if (!framework.version || framework.version.trim().length === 0) {
    warnings.push('Framework version is not specified');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate compliance maturity level
 */
export function calculateComplianceMaturity(
  metrics: ComplianceMetrics
): {
  level: 'initial' | 'managed' | 'defined' | 'quantified' | 'optimized';
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const score = metrics.overallScore;
  let level: 'initial' | 'managed' | 'defined' | 'quantified' | 'optimized';

  if (score < 20) level = 'initial';
  else if (score < 40) level = 'managed';
  else if (score < 60) level = 'defined';
  else if (score < 80) level = 'quantified';
  else level = 'optimized';

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Analyze strengths and weaknesses
  if (metrics.policyMetrics.complianceRate > 0.8) {
    strengths.push('Strong policy compliance rate');
  } else {
    weaknesses.push('Low policy compliance rate');
    recommendations.push('Implement regular policy reviews and training');
  }

  if (metrics.auditMetrics.completionRate > 0.8) {
    strengths.push('Good audit completion rate');
  } else {
    weaknesses.push('Poor audit completion rate');
    recommendations.push('Improve audit planning and resource allocation');
  }

  if (metrics.violationMetrics.violationRate < 0.1) {
    strengths.push('Low violation rate');
  } else {
    weaknesses.push('High violation rate');
    recommendations.push('Strengthen preventive controls and monitoring');
  }

  if (metrics.trainingMetrics.completionRate > 0.8) {
    strengths.push('Good training completion rate');
  } else {
    weaknesses.push('Low training completion rate');
    recommendations.push('Make training more engaging and mandatory');
  }

  return {
    level,
    score,
    strengths,
    weaknesses,
    recommendations
  };
}

/**
 * Generate compliance roadmap
 */
export function generateComplianceRoadmap(
  currentAssessment: any,
  targetFramework: ComplianceFramework,
  timeframe: number // months
): {
  phases: RoadmapPhase[];
  milestones: RoadmapMilestone[];
  dependencies: string[];
  estimatedCost: number;
  risks: RoadmapRisk[];
} {
  const phases: RoadmapPhase[] = [];
  const milestones: RoadmapMilestone[] = [];
  const dependencies: string[] = [];
  const risks: RoadmapRisk[] = [];

  // Phase 1: Assessment and Planning
  phases.push({
    id: 'phase1',
    name: 'Assessment and Planning',
    description: 'Assess current state and develop implementation plan',
    duration: 1,
    activities: [
      'Gap analysis against target framework',
      'Risk assessment',
      'Resource planning',
      'Stakeholder identification'
    ],
    deliverables: [
      'Compliance gap analysis report',
      'Risk assessment document',
      'Resource allocation plan'
    ],
    dependencies: []
  });

  // Phase 2: Policy Development
  phases.push({
    id: 'phase2',
    name: 'Policy Development',
    description: 'Develop and implement compliance policies',
    duration: 2,
    activities: [
      'Policy drafting',
      'Stakeholder review',
      'Approval process',
      'Policy publication'
    ],
    deliverables: [
      'Compliance policies',
      'Policy documentation',
      'Communication materials'
    ],
    dependencies: ['phase1']
  });

  // Phase 3: Control Implementation
  phases.push({
    id: 'phase3',
    name: 'Control Implementation',
    description: 'Implement technical and administrative controls',
    duration: 3,
    activities: [
      'Control design',
      'Control implementation',
      'Testing and validation',
      'Documentation'
    ],
    deliverables: [
      'Control documentation',
      'Implementation evidence',
      'Test results'
    ],
    dependencies: ['phase2']
  });

  // Phase 4: Training and Awareness
  phases.push({
    id: 'phase4',
    name: 'Training and Awareness',
    description: 'Train staff and raise awareness',
    duration: 1,
    activities: [
      'Training material development',
      'Training delivery',
      'Awareness campaigns',
      'Effectiveness measurement'
    ],
    deliverables: [
      'Training materials',
      'Training records',
      'Awareness metrics'
    ],
    dependencies: ['phase3']
  });

  // Phase 5: Monitoring and Improvement
  phases.push({
    id: 'phase5',
    name: 'Monitoring and Improvement',
    description: 'Establish monitoring and continuous improvement',
    duration: timeframe - 7,
    activities: [
      'Monitoring system implementation',
      'Audit program establishment',
      'Continuous improvement process',
      'Performance measurement'
    ],
    deliverables: [
      'Monitoring procedures',
      'Audit schedules',
      'Improvement plans'
    ],
    dependencies: ['phase4']
  });

  // Generate milestones
  milestones.push(
    {
      id: 'm1',
      name: 'Gap Analysis Complete',
      description: 'Complete compliance gap analysis',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      status: 'pending'
    },
    {
      id: 'm2',
      name: 'Policies Approved',
      description: 'All compliance policies approved',
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      status: 'pending'
    },
    {
      id: 'm3',
      name: 'Controls Implemented',
      description: 'All controls implemented and tested',
      dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
      status: 'pending'
    },
    {
      id: 'm4',
      name: 'Training Complete',
      description: 'All required training completed',
      dueDate: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000), // 210 days
      status: 'pending'
    },
    {
      id: 'm5',
      name: 'Compliance Achieved',
      description: 'Target compliance level achieved',
      dueDate: new Date(Date.now() + timeframe * 30 * 24 * 60 * 60 * 1000),
      status: 'pending'
    }
  );

  // Generate dependencies
  dependencies.push(
    'Executive sponsorship required',
    'Adequate budget allocation',
    'Staff availability',
    'Technology infrastructure',
    'External expertise if needed'
  );

  // Generate risks
  risks.push(
    {
      type: 'resource',
      description: 'Insufficient resources for implementation',
      likelihood: 'medium',
      impact: 'high',
      mitigation: 'Secure executive commitment and adequate funding'
    },
    {
      type: 'timeline',
      description: 'Implementation delays due to complexity',
      likelihood: 'high',
      impact: 'medium',
      mitigation: 'Phased implementation with clear milestones'
    },
    {
      type: 'adoption',
      description: 'Staff resistance to new procedures',
      likelihood: 'medium',
      impact: 'medium',
      mitigation: 'Change management program and stakeholder engagement'
    },
    {
      type: 'technical',
      description: 'Technical challenges with control implementation',
      likelihood: 'medium',
      impact: 'high',
      mitigation: 'Technical assessment and expert consultation'
    }
  );

  return {
    phases,
    milestones,
    dependencies,
    estimatedCost: calculateImplementationCost(phases, targetFramework),
    risks
  };
}

// Helper interfaces
interface RoadmapPhase {
  id: string;
  name: string;
  description: string;
  duration: number; // months
  activities: string[];
  deliverables: string[];
  dependencies: string[];
}

interface RoadmapMilestone {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'completed' | 'delayed';
}

interface RoadmapRisk {
  type: string;
  description: string;
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

function calculateImplementationCost(phases: RoadmapPhase[], framework: ComplianceFramework): number {
  // Simplified cost calculation - in real implementation, this would be more sophisticated
  const baseCost = 50000; // Base implementation cost
  const phaseMultiplier = 10000; // Cost per phase
  const complexityMultiplier = framework.requirements.length * 1000; // Complexity factor

  return baseCost + (phases.length * phaseMultiplier) + complexityMultiplier;
}

// Constants and Defaults
// ======================

export const DEFAULT_COMPLIANCE_CONFIG = {
  auditTrail: {
    enabled: true,
    logLevel: 'info' as const,
    retentionDays: 365,
    enableEncryption: false,
    enableCompression: true,
    batchSize: 100,
    flushInterval: 5000,
    includeSensitiveData: false
  },
  compliance: {
    enableAutoAudits: true,
    auditInterval: 24 * 60 * 60 * 1000, // 24 hours
    enableNotifications: true,
    enableRiskAssessment: true,
    enableReporting: true
  }
} as const;

export const COMPLIANCE_FRAMEWORKS = [
  'gdpr',
  'hipaa',
  'soc2',
  'iso27001',
  'pcidss',
  'sox',
  'ccpa',
  'lgpd'
] as const;

export const COMPLIANCE_CATEGORIES = [
  'privacy',
  'security',
  'data_protection',
  'governance',
  'risk_management',
  'business_continuity',
  'vendor_management',
  'training_awareness'
] as const;

export const COMPLIANCE_STATUSES = [
  'compliant',
  'non_compliant',
  'partial',
  'unknown'
] as const;

export const VIOLATION_SEVERITIES = [
  'low',
  'medium',
  'high',
  'critical'
] as const;

export const AUDIT_TYPES = [
  'internal',
  'external',
  'regulatory',
  'certification',
  'supplier',
  'privacy',
  'security'
] as const;

// Version and Package Info
// ========================

export const COMPLIANCE_VERSION = '1.0.0';

export const packageInfo = {
  name: '@atlas/compliance',
  version: COMPLIANCE_VERSION,
  description: 'Enterprise compliance management and audit trail system for Atlas AI assistant',
  author: 'Atlas Team',
  license: 'MIT',
  repository: 'https://github.com/atlas-ai/atlas',
  dependencies: [
    '@atlas/moderation',
    '@atlas/logger',
    '@atlas/types'
  ]
};

// Export for backward compatibility
export {
  ComplianceService,
  AuditTrail
};