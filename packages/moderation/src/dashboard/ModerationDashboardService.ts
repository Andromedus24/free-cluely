import { EventEmitter } from 'events';
import {
  ModerationAnalysis,
  ModerationDecision,
  ModerationPolicy,
  UserReport,
  ReviewWorkflow,
  ReportStatus,
  ReportSeverity,
  ReportType,
  ModerationAction
} from '../types/ModerationTypes';
import { IModerationService } from '../core/ModerationService';
import { IModerationStorage } from '../storage/ModerationStorage';
import { IModerationNotifier } from '../notifications/ModerationNotifier';
import { IReportManager } from '../reporting/ReportManager';

/**
 * Moderation Dashboard Service
 * Provides real-time dashboard data, metrics, and management capabilities
 */
export interface IModerationDashboardService {
  /**
   * Get dashboard overview data
   */
  getOverview(options?: OverviewOptions): Promise<DashboardOverview>;

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(timeRange?: TimeRange): Promise<RealTimeMetrics>;

  /**
   * Get content analysis metrics
   */
  getContentAnalysisMetrics(filters?: AnalysisFilters): Promise<ContentAnalysisMetrics>;

  /**
   * Get user reporting metrics
   */
  getReportingMetrics(filters?: ReportingFilters): Promise<ReportingMetrics>;

  /**
   * Get workflow performance metrics
   */
  getWorkflowMetrics(filters?: WorkflowFilters): Promise<WorkflowPerformanceMetrics>;

  /**
   * Get moderation queue status
   */
  getQueueStatus(options?: QueueOptions): Promise<QueueStatus>;

  /**
   * Get trend analysis and predictions
   */
  getTrendAnalysis(options?: TrendAnalysisOptions): Promise<TrendAnalysis>;

  /**
   * Get performance benchmarks
   */
  getPerformanceBenchmarks(timeRange?: TimeRange): Promise<PerformanceBenchmarks>;

  /**
   * Get alerts and notifications
   */
  getAlerts(options?: AlertOptions): Promise<Alert[]>;

  /**
   * Get team performance metrics
   */
  getTeamPerformance(teamId?: string, timeRange?: TimeRange): Promise<TeamPerformance>;

  /**
   * Get policy compliance metrics
   */
  getPolicyComplianceMetrics(timeRange?: TimeRange): Promise<PolicyComplianceMetrics>;

  /**
   * Generate dashboard report
   */
  generateReport(options?: ReportGenerationOptions): Promise<DashboardReport>;

  /**
   * Get dashboard configuration
   */
  getConfiguration(): Promise<DashboardConfiguration>;

  /**
   * Update dashboard configuration
   */
  updateConfiguration(config: Partial<DashboardConfiguration>): Promise<DashboardConfiguration>;

  /**
   * Export dashboard data
   */
  exportData(options?: ExportOptions): Promise<ExportResult>;
}

export interface OverviewOptions {
  timeRange?: TimeRange;
  includeRealTime?: boolean;
  includePredictions?: boolean;
  filters?: OverviewFilters;
}

export interface OverviewFilters {
  contentType?: string[];
  severity?: ReportSeverity[];
  status?: ReportStatus[];
  team?: string[];
}

export interface DashboardOverview {
  summary: OverviewSummary;
  metrics: OverviewMetrics;
  alerts: Alert[];
  trends: TrendData[];
  queue: QueueSnapshot;
  team: TeamSnapshot;
  predictions?: PredictionsData;
  timestamp: Date;
}

export interface OverviewSummary {
  totalReports: number;
  pendingReports: number;
  resolvedToday: number;
  averageResolutionTime: number;
  escalationRate: number;
  accuracy: number;
  teamUtilization: number;
  systemHealth: SystemHealth;
}

export interface OverviewMetrics {
  reportsByStatus: Record<ReportStatus, number>;
  reportsBySeverity: Record<ReportSeverity, number>;
  reportsByType: Record<ReportType, number>;
  resolutionTimes: ResolutionTimeMetrics;
  workload: WorkloadMetrics;
  performance: PerformanceMetrics;
}

export interface ResolutionTimeMetrics {
  average: number;
  median: number;
  p95: number;
  p99: number;
  bySeverity: Record<ReportSeverity, number>;
  byType: Record<ReportType, number>;
}

export interface WorkloadMetrics {
  totalCapacity: number;
  currentUtilization: number;
  assigneeWorkload: AssigneeWorkload[];
  queueBacklog: number;
  estimatedClearTime: number;
}

export interface PerformanceMetrics {
  throughput: number;
  accuracy: number;
  escalationRate: number;
  rejectionRate: number;
  satisfaction: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  score: number;
  issues: HealthIssue[];
  lastCheck: Date;
}

export interface HealthIssue {
  type: 'performance' | 'queue' | 'system' | 'integration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: Date;
}

export interface AssigneeWorkload {
  userId: string;
  name: string;
  activeReports: number;
  activeWorkflows: number;
  capacity: number;
  utilization: number;
  averageResolutionTime: number;
  accuracy: number;
  status: 'available' | 'busy' | 'overloaded';
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface RealTimeMetrics {
  currentLoad: number;
  processingRate: number;
  averageResponseTime: number;
  errorRate: number;
  queueDepth: number;
  activeModerators: number;
  systemMetrics: SystemMetrics;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  database: number;
}

export interface AnalysisFilters {
  contentType?: string[];
  timeRange?: TimeRange;
  severity?: ReportSeverity[];
  category?: string[];
}

export interface ContentAnalysisMetrics {
  totalAnalyzed: number;
  violationsByType: Record<string, number>;
  violationRate: number;
  accuracyByType: Record<string, number>;
  processingTimes: ProcessingTimeMetrics;
  topViolationCategories: ViolationCategory[];
  falsePositiveRate: number;
  detectionAccuracy: DetectionAccuracy;
}

export interface ProcessingTimeMetrics {
  average: number;
  median: number;
  p95: number;
  byContentType: Record<string, number>;
}

export interface ViolationCategory {
  category: string;
  count: number;
  rate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  severity: ReportSeverity;
}

export interface DetectionAccuracy {
  overall: number;
  byContentType: Record<string, number>;
  bySeverity: Record<ReportSeverity, number>;
  falsePositives: number;
  falseNegatives: number;
}

export interface ReportingFilters {
  userId?: string;
  timeRange?: TimeRange;
  status?: ReportStatus[];
  severity?: ReportSeverity[];
}

export interface ReportingMetrics {
  totalReports: number;
  uniqueReporters: number;
  averageReportsPerUser: number;
  reportAccuracy: number;
  topReporters: TopReporter[];
  reportTrends: ReportTrend[];
  reputationDistribution: ReputationDistribution;
}

export interface TopReporter {
  userId: string;
  name: string;
  reportCount: number;
  accuracy: number;
  reputation: number;
  lastActivity: Date;
}

export interface ReportTrend {
  period: 'daily' | 'weekly' | 'monthly';
  data: Array<{
    date: Date;
    count: number;
    accuracy: number;
  }>;
}

export interface ReputationDistribution {
  excellent: number;
  good: number;
  average: number;
  poor: number;
  terrible: number;
}

export interface WorkflowFilters {
  status?: ReviewWorkflow['status'][];
  templateId?: string;
  assigneeId?: string;
  timeRange?: TimeRange;
}

export interface WorkflowPerformanceMetrics {
  totalWorkflows: number;
  completionRate: number;
  averageCompletionTime: number;
  stepCompletionRates: Record<string, number>;
  templatePerformance: TemplatePerformance[];
  bottleneckSteps: BottleneckStep[];
}

export interface TemplatePerformance {
  templateId: string;
  templateName: string;
  usageCount: number;
  averageCompletionTime: number;
  successRate: number;
  escalationRate: number;
}

export interface BottleneckStep {
  stepId: string;
  stepName: string;
  averageTime: number;
  failureRate: number;
  queueDepth: number;
  impact: 'low' | 'medium' | 'high';
}

export interface QueueOptions {
  includeDetails?: boolean;
  sortBy?: 'priority' | 'wait_time' | 'assignee';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface QueueStatus {
  totalQueued: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byAssignee: Record<string, QueueItem[]>;
  averageWaitTime: number;
  oldestItem?: Date;
  throughput: number;
  estimatedClearTime: number;
}

export interface QueueItem {
  id: string;
  type: 'report' | 'workflow';
  priority: string;
  status: string;
  assignee?: string;
  createdAt: Date;
  estimatedTime?: number;
}

export interface TrendAnalysisOptions {
  metrics?: ('reports' | 'resolution_time' | 'accuracy' | 'workload')[];
  period?: 'daily' | 'weekly' | 'monthly';
  includePredictions?: boolean;
  timeRange?: TimeRange;
}

export interface TrendAnalysis {
  trends: Record<string, TrendData>;
  correlations: CorrelationData[];
  anomalies: AnomalyData[];
  predictions?: PredictionData[];
  insights: TrendInsight[];
}

export interface TrendData {
  metric: string;
  period: string;
  data: Array<{
    date: Date;
    value: number;
    change?: number;
    significance?: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  change: number;
  significance: number;
}

export interface CorrelationData {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: number;
  description: string;
}

export interface AnomalyData {
  metric: string;
  date: Date;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PredictionData {
  metric: string;
  timeframe: string;
  prediction: number;
  confidence: number;
  factors: string[];
}

export interface TrendInsight {
  type: 'pattern' | 'anomaly' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  data?: any;
  recommendations?: string[];
}

export interface PerformanceBenchmarks {
  resolutionTime: BenchmarkData;
  accuracy: BenchmarkData;
  throughput: BenchmarkData;
  teamUtilization: BenchmarkData;
  byTeam: Record<string, TeamBenchmark>;
}

export interface BenchmarkData {
  current: number;
  target: number;
  benchmark: number;
  percentile: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface TeamBenchmark {
  resolutionTime: BenchmarkData;
  accuracy: BenchmarkData;
  throughput: BenchmarkData;
  utilization: BenchmarkData;
}

export interface AlertOptions {
  severity?: ('low' | 'medium' | 'high' | 'critical')[];
  type?: Alert['type'][];
  status?: ('active' | 'acknowledged' | 'resolved')[];
  limit?: number;
}

export interface Alert {
  id: string;
  type: 'system' | 'queue' | 'performance' | 'security' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: any;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolutionTime?: number;
  metadata?: Record<string, any>;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  members: TeamMemberPerformance[];
  metrics: TeamMetrics;
  workload: TeamWorkload;
  trends: TeamTrends;
  benchmarks: TeamBenchmark;
}

export interface TeamMemberPerformance {
  userId: string;
  name: string;
  role: string;
  metrics: MemberMetrics;
  workload: MemberWorkload;
  activity: MemberActivity;
}

export interface MemberMetrics {
  reportsProcessed: number;
  averageResolutionTime: number;
  accuracy: number;
  escalationRate: number;
  satisfaction?: number;
}

export interface MemberWorkload {
  activeReports: number;
  capacity: number;
  utilization: number;
  efficiency: number;
}

export interface MemberActivity {
  lastActive: Date;
  reportsToday: number;
  averageDailyReports: number;
  streak: number;
}

export interface TeamMetrics {
  totalReports: number;
  averageResolutionTime: number;
  accuracy: number;
  throughput: number;
  escalationRate: number;
}

export interface TeamWorkload {
  totalCapacity: number;
  currentUtilization: number;
  backlog: number;
  efficiency: number;
}

export interface TeamTrends {
  resolutionTime: TrendData;
  accuracy: TrendData;
  throughput: TrendData;
  workload: TrendData;
}

export interface PolicyComplianceMetrics {
  overallCompliance: number;
  policyCompliance: Record<string, PolicyCompliance>;
  violations: PolicyViolation[];
  auditResults: AuditResult[];
  trends: ComplianceTrend;
}

export interface PolicyCompliance {
  policyId: string;
  policyName: string;
  complianceRate: number;
  violations: number;
  assessments: number;
  lastAssessment: Date;
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reportedBy: string;
  timestamp: Date;
  status: 'open' | 'investigating' | 'resolved';
  resolution?: any;
}

export interface AuditResult {
  id: string;
  policyId: string;
  score: number;
  findings: AuditFinding[];
  recommendations: string[];
  auditor: string;
  timestamp: Date;
}

export interface AuditFinding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any;
  recommendation: string;
}

export interface ComplianceTrend {
  period: 'daily' | 'weekly' | 'monthly';
  data: Array<{
    date: Date;
    compliance: number;
    violations: number;
  }>;
}

export interface ReportGenerationOptions {
  format: 'pdf' | 'html' | 'json';
  timeRange?: TimeRange;
  sections?: ReportSection[];
  includeCharts?: boolean;
  includeRawData?: boolean;
  template?: string;
}

export interface ReportSection {
  type: 'overview' | 'metrics' | 'trends' | 'team' | 'compliance' | 'recommendations';
  title: string;
  config?: any;
}

export interface DashboardReport {
  id: string;
  title: string;
  format: string;
  generatedAt: Date;
  timeRange: TimeRange;
  sections: ReportSectionContent[];
  downloadUrl?: string;
  metadata: Record<string, any>;
}

export interface ReportSectionContent {
  type: string;
  title: string;
  content: any;
  charts?: ChartData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: any;
  options?: any;
}

export interface DashboardConfiguration {
  refreshInterval: number;
  alertThresholds: AlertThresholds;
  widgets: WidgetConfiguration[];
  views: ViewConfiguration[];
  permissions: PermissionConfiguration;
  integrations: IntegrationConfiguration;
}

export interface AlertThresholds {
  queueBacklog: number;
  resolutionTime: number;
  errorRate: number;
  systemLoad: number;
  accuracy: number;
}

export interface WidgetConfiguration {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  visible: boolean;
}

export interface ViewConfiguration {
  id: string;
  name: string;
  description: string;
  widgets: string[];
  filters: any;
  default: boolean;
}

export interface PermissionConfiguration {
  roles: Record<string, RolePermissions>;
  defaultRole: string;
}

export interface RolePermissions {
  canView: string[];
  canEdit: string[];
  canConfigure: string[];
  canExport: boolean;
  canManage: boolean;
}

export interface IntegrationConfiguration {
  notifications: NotificationIntegration[];
  externalTools: ExternalToolIntegration[];
  dataSources: DataSourceIntegration[];
}

export interface NotificationIntegration {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  enabled: boolean;
  config: Record<string, any>;
}

export interface ExternalToolIntegration {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface DataSourceIntegration {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx' | 'pdf';
  timeRange?: TimeRange;
  sections?: string[];
  includeCharts?: boolean;
  compression?: boolean;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileSize?: number;
  recordCount?: number;
  error?: string;
}

// Additional interfaces for snapshots and predictions
export interface QueueSnapshot {
  total: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  averageWaitTime: number;
  oldestItem?: Date;
}

export interface TeamSnapshot {
  totalMembers: number;
  activeMembers: number;
  averageUtilization: number;
  topPerformer: AssigneeWorkload;
  capacityUtilization: number;
}

export interface PredictionsData {
  reportsExpected: number;
  workloadProjection: WorkloadProjection;
  riskAssessment: RiskAssessment;
  recommendations: string[];
}

export interface WorkloadProjection {
  current: number;
  projected: number;
  timeframe: string;
  factors: string[];
}

export interface RiskAssessment {
  overall: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  mitigation: string[];
}

export interface RiskFactor {
  factor: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  description: string;
}