import { EventEmitter } from 'events';
import {
  ReviewWorkflow,
  ReviewAction,
  ReviewPriority,
  ReviewStep,
  ReviewStepStatus,
  UserReport,
  ModerationDecision
} from '../types/ModerationTypes';
import { IUserReportingService } from './UserReportingService';

/**
 * Review Workflow Service
 * Manages complex review workflows with multiple steps, approvals, and routing
 */
export interface IReviewWorkflowService {
  /**
   * Create a custom review workflow
   */
  createWorkflow(template: WorkflowTemplate, context: WorkflowContext): Promise<ReviewWorkflow>;

  /**
   * Execute workflow step
   */
  executeStep(workflowId: string, stepId: string, action: WorkflowStepAction, data?: any): Promise<ReviewWorkflow>;

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Promise<ReviewWorkflow | null>;

  /**
   * List active workflows
   */
  listActiveWorkflows(filters?: WorkflowFilters): Promise<ReviewWorkflow[]>;

  /**
   * Pause/resume workflow
   */
  setWorkflowStatus(workflowId: string, status: 'paused' | 'active'): Promise<ReviewWorkflow>;

  /**
   * Reassign workflow
   */
  reassignWorkflow(workflowId: string, newAssignee: string, reason?: string): Promise<ReviewWorkflow>;

  /**
   * Add custom step to workflow
   */
  addCustomStep(workflowId: string, step: Omit<ReviewStep, 'id' | 'status'>): Promise<ReviewWorkflow>;

  /**
   * Get workflow templates
   */
  getWorkflowTemplates(): Promise<WorkflowTemplate[]>;

  /**
   * Create custom workflow template
   */
  createWorkflowTemplate(template: Omit<WorkflowTemplate, 'id' | 'version'>): Promise<WorkflowTemplate>;

  /**
   * Get workflow execution history
   */
  getWorkflowHistory(workflowId: string): Promise<WorkflowExecutionHistory[]>;

  /**
   * Calculate workflow metrics
   */
  getWorkflowMetrics(timeRange?: { start: Date; end: Date }): Promise<WorkflowMetrics>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  steps: WorkflowStepDefinition[];
  conditions: WorkflowCondition[];
  escalations: WorkflowEscalationRule[];
  estimatedDuration: number; // in minutes
  requiredRoles: string[];
  autoAdvance: boolean;
  notificationRules: NotificationRule[];
}

export interface WorkflowStepDefinition {
  id: string;
  name: string;
  description: string;
  type: 'manual' | 'automatic' | 'approval' | 'escalation';
  required: boolean;
  estimatedTime: number;
  assigneeRole?: string;
  conditions: WorkflowCondition[];
  actions: WorkflowStepAction[];
  dependencies?: string[]; // step IDs that must complete first
  retryPolicy?: RetryPolicy;
  timeout?: number; // in minutes
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface WorkflowEscalationRule {
  condition: WorkflowCondition;
  action: 'escalate' | 'notify' | 'reassign';
  target: string;
  message: string;
}

export interface WorkflowStepAction {
  type: 'approve' | 'reject' | 'request_changes' | 'escalate' | 'skip' | 'complete';
  label: string;
  nextStep?: string;
  conditions?: WorkflowCondition[];
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  maxDelay: number; // in minutes
}

export interface NotificationRule {
  event: 'created' | 'assigned' | 'completed' | 'escalated' | 'failed';
  recipients: string[];
  template: string;
  channels: ('email' | 'in_app' | 'webhook')[];
}

export interface WorkflowContext {
  report: UserReport;
  assignedTo?: string;
  priority: ReviewPriority;
  metadata?: Record<string, any>;
}

export interface WorkflowFilters {
  status?: ReviewWorkflow['status'][];
  assignedTo?: string;
  priority?: ReviewPriority[];
  type?: string;
  dateRange?: { start: Date; end: Date };
  limit?: number;
  offset?: number;
}

export interface WorkflowExecutionHistory {
  id: string;
  workflowId: string;
  stepId: string;
  action: string;
  performer: string;
  timestamp: Date;
  data: any;
  duration?: number;
  result: 'success' | 'failure' | 'skipped';
  error?: string;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  averageCompletionTime: number;
  stepCompletionRates: Record<string, number>;
  commonFailurePoints: Array<{
    stepId: string;
    failureCount: number;
    failureRate: number;
  }>;
  assigneeWorkload: Array<{
    assignee: string;
    activeWorkflows: number;
    completedWorkflows: number;
    averageTime: number;
  }>;
  templateUsage: Record<string, number>;
  escalationRates: Record<string, number>;
}

/**
 * Review Workflow Service Implementation
 */
export class ReviewWorkflowService extends EventEmitter implements IReviewWorkflowService {
  private workflows: Map<string, ReviewWorkflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private executionHistory: WorkflowExecutionHistory[] = [];
  private workflowCounter = 0;

  constructor(private reportingService: IUserReportingService) {
    super();
    this.initializeDefaultTemplates();
  }

  async createWorkflow(template: WorkflowTemplate, context: WorkflowContext): Promise<ReviewWorkflow> {
    const workflowId = this.generateWorkflowId();
    const now = new Date();

    const workflow: ReviewWorkflow = {
      id: workflowId,
      reportId: context.report.id,
      status: 'pending',
      assignedTo: context.assignedTo,
      priority: context.priority,
      type: context.report.type,
      templateId: template.id,
      templateVersion: template.version,
      createdAt: now,
      updatedAt: now,
      steps: this.createStepsFromTemplate(template.steps, context),
      currentStep: 0,
      metadata: {
        ...context.metadata,
        templateName: template.name,
        estimatedDuration: template.estimatedDuration
      }
    };

    // Validate workflow
    this.validateWorkflow(workflow, template);

    // Store workflow
    this.workflows.set(workflowId, workflow);

    // Start workflow if auto-advance is enabled
    if (template.autoAdvance) {
      await this.startWorkflow(workflow);
    }

    this.emit('workflow_created', { workflow, template, context });
    return workflow;
  }

  async executeStep(workflowId: string, stepId: string, action: WorkflowStepAction, data?: any): Promise<ReviewWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Step not found: ${stepId}`);
    }

    const step = workflow.steps[stepIndex];
    const startTime = Date.now();

    // Record execution attempt
    const historyEntry: WorkflowExecutionHistory = {
      id: this.generateHistoryId(),
      workflowId,
      stepId,
      action: action.type,
      performer: workflow.assignedTo || 'system',
      timestamp: new Date(),
      data,
      result: 'success'
    };

    try {
      // Execute step action
      const result = await this.executeStepAction(workflow, step, action, data);

      // Update step status
      step.status = this.determineStepStatus(action.type);
      step.completedAt = new Date();

      // Record result
      historyEntry.duration = Date.now() - startTime;
      historyEntry.result = result.success ? 'success' : 'failure';
      if (!result.success) {
        historyEntry.error = result.error;
      }

      // Handle workflow progression
      if (result.success) {
        await this.handleSuccessfulStepExecution(workflow, step, action, data);
      } else {
        await this.handleFailedStepExecution(workflow, step, result.error);
      }

      workflow.updatedAt = new Date();

    } catch (error) {
      // Handle execution failure
      historyEntry.result = 'failure';
      historyEntry.error = error.message;
      historyEntry.duration = Date.now() - startTime;

      step.status = 'failed';
      step.error = error.message;
      workflow.updatedAt = new Date();

      this.emit('step_execution_failed', { workflow, step, error });
    }

    // Store history
    this.executionHistory.push(historyEntry);

    this.emit('step_executed', { workflow, step, action, data });
    return workflow;
  }

  async getWorkflow(workflowId: string): Promise<ReviewWorkflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  async listActiveWorkflows(filters?: WorkflowFilters): Promise<ReviewWorkflow[]> {
    let workflows = Array.from(this.workflows.values())
      .filter(w => w.status !== 'completed' && w.status !== 'rejected');

    if (filters) {
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
    }

    return workflows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async setWorkflowStatus(workflowId: string, status: 'paused' | 'active'): Promise<ReviewWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const oldStatus = workflow.status;
    workflow.status = status;
    workflow.updatedAt = new Date();

    if (status === 'active' && oldStatus === 'paused') {
      // Resume workflow
      await this.resumeWorkflow(workflow);
    }

    this.emit('workflow_status_changed', { workflow, oldStatus, newStatus: status });
    return workflow;
  }

  async reassignWorkflow(workflowId: string, newAssignee: string, reason?: string): Promise<ReviewWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const oldAssignee = workflow.assignedTo;
    workflow.assignedTo = newAssignee;
    workflow.updatedAt = new Date();

    // Add reassignment note to history
    if (!workflow.history) {
      workflow.history = [];
    }

    workflow.history.push({
      action: ReviewAction.REQUEST_MORE_INFO, // Using this as a generic action
      timestamp: new Date(),
      performedBy: oldAssignee || 'system',
      notes: `Reassigned to ${newAssignee}: ${reason || 'No reason provided'}`
    });

    this.emit('workflow_reassigned', { workflow, oldAssignee, newAssignee, reason });
    return workflow;
  }

  async addCustomStep(workflowId: string, stepData: Omit<ReviewStep, 'id' | 'status'>): Promise<ReviewWorkflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const step: ReviewStep = {
      ...stepData,
      id: this.generateStepId(),
      status: 'pending'
    };

    workflow.steps.push(step);
    workflow.updatedAt = new Date();

    this.emit('custom_step_added', { workflow, step });
    return workflow;
  }

  async getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values());
  }

  async createWorkflowTemplate(templateData: Omit<WorkflowTemplate, 'id' | 'version'>): Promise<WorkflowTemplate> {
    const template: WorkflowTemplate = {
      ...templateData,
      id: this.generateTemplateId(),
      version: '1.0.0'
    };

    this.templates.set(template.id, template);
    this.emit('template_created', { template });
    return template;
  }

  async getWorkflowHistory(workflowId: string): Promise<WorkflowExecutionHistory[]> {
    return this.executionHistory
      .filter(h => h.workflowId === workflowId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getWorkflowMetrics(timeRange?: { start: Date; end: Date }): Promise<WorkflowMetrics> {
    let workflows = Array.from(this.workflows.values());

    if (timeRange) {
      workflows = workflows.filter(w =>
        w.createdAt >= timeRange.start &&
        w.createdAt <= timeRange.end
      );
    }

    const completedWorkflows = workflows.filter(w => w.status === 'completed');
    const history = this.executionHistory.filter(h =>
      workflows.some(w => w.id === h.workflowId)
    );

    const metrics: WorkflowMetrics = {
      totalWorkflows: workflows.length,
      averageCompletionTime: this.calculateAverageCompletionTime(completedWorkflows),
      stepCompletionRates: this.calculateStepCompletionRates(history),
      commonFailurePoints: this.identifyFailurePoints(history),
      assigneeWorkload: this.calculateAssigneeWorkload(workflows, history),
      templateUsage: this.calculateTemplateUsage(workflows),
      escalationRates: this.calculateEscalationRates(workflows)
    };

    return metrics;
  }

  // Private Methods
  // ===============

  private initializeDefaultTemplates(): void {
    // Standard review template
    const standardTemplate: WorkflowTemplate = {
      id: 'standard_review',
      name: 'Standard Content Review',
      description: 'Standard workflow for content moderation review',
      version: '1.0.0',
      category: 'content_moderation',
      steps: [
        {
          id: 'initial_assessment',
          name: 'Initial Assessment',
          description: 'Assess the reported content and evidence',
          type: 'manual',
          required: true,
          estimatedTime: 5,
          conditions: [],
          actions: [
            { type: 'complete', label: 'Complete Assessment' },
            { type: 'escalate', label: 'Escalate to Senior' }
          ]
        },
        {
          id: 'policy_check',
          name: 'Policy Violation Check',
          description: 'Check content against community guidelines',
          type: 'manual',
          required: true,
          estimatedTime: 10,
          dependencies: ['initial_assessment'],
          conditions: [],
          actions: [
            { type: 'approve', label: 'No Violation' },
            { type: 'reject', label: 'Violation Found' }
          ]
        },
        {
          id: 'decision',
          name: 'Final Decision',
          description: 'Make final moderation decision',
          type: 'manual',
          required: true,
          estimatedTime: 5,
          dependencies: ['policy_check'],
          conditions: [],
          actions: [
            { type: 'complete', label: 'Approve Content' },
            { type: 'complete', label: 'Remove Content' },
            { type: 'complete', label: 'Issue Warning' }
          ]
        }
      ],
      conditions: [],
      escalations: [
        {
          condition: { field: 'priority', operator: 'equals', value: 'high' },
          action: 'notify',
          target: 'senior_moderators',
          message: 'High priority review requires attention'
        }
      ],
      estimatedDuration: 20,
      requiredRoles: ['moderator'],
      autoAdvance: true,
      notificationRules: [
        {
          event: 'created',
          recipients: ['assigned_moderator'],
          template: 'workflow_assigned',
          channels: ['in_app', 'email']
        }
      ]
    };

    // Urgent review template
    const urgentTemplate: WorkflowTemplate = {
      id: 'urgent_review',
      name: 'Urgent Content Review',
      description: 'Urgent workflow for high-priority content',
      version: '1.0.0',
      category: 'content_moderation',
      steps: [
        {
          id: 'immediate_review',
          name: 'Immediate Review',
          description: 'Immediate review of urgent content',
          type: 'manual',
          required: true,
          estimatedTime: 15,
          assigneeRole: 'senior_moderator',
          conditions: [],
          actions: [
            { type: 'complete', label: 'Handle Immediately' },
            { type: 'escalate', label: 'Escalate to Admin' }
          ]
        },
        {
          id: 'admin_approval',
          name: 'Admin Approval',
          description: 'Admin approval required for urgent decisions',
          type: 'approval',
          required: true,
          estimatedTime: 10,
          assigneeRole: 'admin',
          dependencies: ['immediate_review'],
          conditions: [],
          actions: [
            { type: 'approve', label: 'Approve Decision' },
            { type: 'request_changes', label: 'Request Changes' }
          ]
        }
      ],
      conditions: [
        { field: 'priority', operator: 'equals', value: 'high' }
      ],
      escalations: [
        {
          condition: { field: 'severity', operator: 'equals', value: 'critical' },
          action: 'escalate',
          target: 'emergency_team',
          message: 'Critical severity content requires immediate attention'
        }
      ],
      estimatedDuration: 25,
      requiredRoles: ['senior_moderator', 'admin'],
      autoAdvance: true,
      notificationRules: [
        {
          event: 'created',
          recipients: ['senior_moderators', 'admins'],
          template: 'urgent_review_created',
          channels: ['in_app', 'email', 'webhook']
        }
      ]
    };

    this.templates.set(standardTemplate.id, standardTemplate);
    this.templates.set(urgentTemplate.id, urgentTemplate);
  }

  private createStepsFromTemplate(definitions: WorkflowStepDefinition[], context: WorkflowContext): ReviewStep[] {
    return definitions.map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      required: def.required,
      estimatedTime: def.estimatedTime,
      status: 'pending',
      assignee: def.assigneeRole ? this.resolveAssignee(def.assigneeRole, context) : context.assignedTo,
      dependencies: def.dependencies,
      timeout: def.timeout
    }));
  }

  private resolveAssignee(role: string, context: WorkflowContext): string {
    // Simple role resolution - in production this would query a user service
    const roleMap: Record<string, string> = {
      'moderator': 'mod1',
      'senior_moderator': 'senior_mod1',
      'admin': 'admin1',
      'emergency_team': 'emergency_team'
    };

    return roleMap[role] || context.assignedTo || 'unassigned';
  }

  private validateWorkflow(workflow: ReviewWorkflow, template: WorkflowTemplate): void {
    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Check required roles
    if (template.requiredRoles.length > 0 && !workflow.assignedTo) {
      throw new Error('Workflow requires assigned user with required roles');
    }

    // Check dependencies
    const stepIds = new Set(workflow.steps.map(s => s.id));
    workflow.steps.forEach(step => {
      if (step.dependencies) {
        step.dependencies.forEach(dep => {
          if (!stepIds.has(dep)) {
            throw new Error(`Invalid dependency: ${dep} not found in workflow steps`);
          }
        });
      }
    });
  }

  private async startWorkflow(workflow: ReviewWorkflow): Promise<void> {
    if (workflow.steps.length === 0) return;

    const firstStep = workflow.steps[0];
    if (this.canExecuteStep(workflow, firstStep)) {
      workflow.status = 'in_progress';
      workflow.currentStep = 0;
      this.emit('workflow_started', { workflow });
    }
  }

  private async resumeWorkflow(workflow: ReviewWorkflow): Promise<void> {
    // Resume from current step or find next executable step
    const currentStep = workflow.steps[workflow.currentStep];
    if (currentStep && currentStep.status === 'pending') {
      if (this.canExecuteStep(workflow, currentStep)) {
        await this.executeStep(workflow.id, currentStep.id, {
          type: 'complete',
          label: 'Resume Workflow'
        });
      }
    }
  }

  private canExecuteStep(workflow: ReviewWorkflow, step: ReviewStep): boolean {
    // Check if dependencies are met
    if (step.dependencies) {
      for (const depId of step.dependencies) {
        const depStep = workflow.steps.find(s => s.id === depId);
        if (!depStep || depStep.status !== 'completed') {
          return false;
        }
      }
    }

    // Check if step is not already completed
    return step.status !== 'completed';
  }

  private async executeStepAction(workflow: ReviewWorkflow, step: ReviewStep, action: WorkflowStepAction, data?: any): Promise<{ success: boolean; error?: string }> {
    // Validate action is allowed for this step
    if (!this.isValidActionForStep(step, action.type)) {
      return { success: false, error: `Invalid action ${action.type} for step ${step.id}` };
    }

    try {
      // Execute action-specific logic
      switch (action.type) {
        case 'approve':
          return await this.handleApproveAction(workflow, step, data);
        case 'reject':
          return await this.handleRejectAction(workflow, step, data);
        case 'escalate':
          return await this.handleEscalateAction(workflow, step, data);
        case 'complete':
          return await this.handleCompleteAction(workflow, step, data);
        default:
          return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private isValidActionForStep(step: ReviewStep, actionType: string): boolean {
    // Simple validation - in production this would check step definition
    const validActions = ['approve', 'reject', 'escalate', 'complete', 'request_changes', 'skip'];
    return validActions.includes(actionType);
  }

  private async handleApproveAction(workflow: ReviewWorkflow, step: ReviewStep, data?: any): Promise<{ success: boolean; error?: string }> {
    // Handle approval logic
    await this.reportingService.processReviewAction(workflow.id, ReviewAction.APPROVE, data?.notes);
    return { success: true };
  }

  private async handleRejectAction(workflow: ReviewWorkflow, step: ReviewStep, data?: any): Promise<{ success: boolean; error?: string }> {
    // Handle rejection logic
    await this.reportingService.processReviewAction(workflow.id, ReviewAction.REJECT, data?.notes);
    return { success: true };
  }

  private async handleEscalateAction(workflow: ReviewWorkflow, step: ReviewStep, data?: any): Promise<{ success: boolean; error?: string }> {
    // Handle escalation logic
    const report = await this.reportingService.getReport(workflow.reportId);
    if (report) {
      await this.reportingService.escalateReport(report.id, data?.reason || 'Step escalation');
    }
    return { success: true };
  }

  private async handleCompleteAction(workflow: ReviewWorkflow, step: ReviewStep, data?: any): Promise<{ success: boolean; error?: string }> {
    // Handle completion logic
    return { success: true };
  }

  private determineStepStatus(actionType: string): ReviewStepStatus {
    const statusMap: Record<string, ReviewStepStatus> = {
      'approve': 'completed',
      'reject': 'completed',
      'complete': 'completed',
      'escalate': 'escalated',
      'request_changes': 'pending',
      'skip': 'skipped'
    };

    return statusMap[actionType] || 'completed';
  }

  private async handleSuccessfulStepExecution(workflow: ReviewWorkflow, step: ReviewStep, action: WorkflowStepAction, data?: any): Promise<void> {
    // Move to next step
    const nextStepIndex = this.findNextStep(workflow, step);
    if (nextStepIndex !== -1) {
      workflow.currentStep = nextStepIndex;
      workflow.status = 'in_progress';

      // Auto-execute if configured
      const nextStep = workflow.steps[nextStepIndex];
      if (nextStep && this.shouldAutoExecute(nextStep)) {
        await this.executeStep(workflow.id, nextStep.id, {
          type: 'complete',
          label: 'Auto-executed'
        });
      }
    } else {
      // Workflow completed
      workflow.status = 'completed';
      workflow.completedAt = new Date();
      this.emit('workflow_completed', { workflow });
    }
  }

  private async handleFailedStepExecution(workflow: ReviewWorkflow, step: ReviewStep, error: string): Promise<void> {
    workflow.status = 'failed';
    this.emit('workflow_failed', { workflow, step, error });
  }

  private findNextStep(workflow: ReviewWorkflow, currentStep: ReviewStep): number {
    const currentIndex = workflow.steps.indexOf(currentStep);

    // Find next step with satisfied dependencies
    for (let i = currentIndex + 1; i < workflow.steps.length; i++) {
      const nextStep = workflow.steps[i];
      if (this.canExecuteStep(workflow, nextStep)) {
        return i;
      }
    }

    return -1; // No more steps
  }

  private shouldAutoExecute(step: ReviewStep): boolean {
    // Check if step should auto-execute (e.g., automatic steps)
    return false; // Default to manual execution
  }

  private calculateAverageCompletionTime(workflows: ReviewWorkflow[]): number {
    if (workflows.length === 0) return 0;

    const totalTime = workflows.reduce((sum, w) => {
      if (w.completedAt) {
        return sum + (w.completedAt.getTime() - w.createdAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / workflows.length;
  }

  private calculateStepCompletionRates(history: WorkflowExecutionHistory[]): Record<string, number> {
    const stepStats = new Map<string, { total: number; completed: number }>();

    history.forEach(entry => {
      const stats = stepStats.get(entry.stepId) || { total: 0, completed: 0 };
      stats.total++;

      if (entry.result === 'success') {
        stats.completed++;
      }

      stepStats.set(entry.stepId, stats);
    });

    const rates: Record<string, number> = {};
    stepStats.forEach((stats, stepId) => {
      rates[stepId] = stats.total > 0 ? stats.completed / stats.total : 0;
    });

    return rates;
  }

  private identifyFailurePoints(history: WorkflowExecutionHistory[]): Array<{ stepId: string; failureCount: number; failureRate: number }> {
    const stepFailures = new Map<string, number>();
    const stepTotals = new Map<string, number>();

    history.forEach(entry => {
      const total = stepTotals.get(entry.stepId) || 0;
      stepTotals.set(entry.stepId, total + 1);

      if (entry.result === 'failure') {
        const failures = stepFailures.get(entry.stepId) || 0;
        stepFailures.set(entry.stepId, failures + 1);
      }
    });

    const failurePoints: Array<{ stepId: string; failureCount: number; failureRate: number }> = [];
    stepFailures.forEach((failures, stepId) => {
      const total = stepTotals.get(stepId) || 1;
      failurePoints.push({
        stepId,
        failureCount: failures,
        failureRate: failures / total
      });
    });

    return failurePoints.sort((a, b) => b.failureRate - a.failureRate);
  }

  private calculateAssigneeWorkload(workflows: ReviewWorkflow[], history: WorkflowExecutionHistory[]): Array<{ assignee: string; activeWorkflows: number; completedWorkflows: number; averageTime: number }> {
    const workload = new Map<string, { active: number; completed: number; totalTime: number }>();

    workflows.forEach(w => {
      if (w.assignedTo) {
        const stats = workload.get(w.assignedTo) || { active: 0, completed: 0, totalTime: 0 };

        if (w.status === 'completed' && w.completedAt) {
          stats.completed++;
          stats.totalTime += w.completedAt.getTime() - w.createdAt.getTime();
        } else if (w.status !== 'completed' && w.status !== 'rejected') {
          stats.active++;
        }

        workload.set(w.assignedTo, stats);
      }
    });

    return Array.from(workload.entries()).map(([assignee, stats]) => ({
      assignee,
      activeWorkflows: stats.active,
      completedWorkflows: stats.completed,
      averageTime: stats.completed > 0 ? stats.totalTime / stats.completed : 0
    }));
  }

  private calculateTemplateUsage(workflows: ReviewWorkflow[]): Record<string, number> {
    const usage = new Map<string, number>();

    workflows.forEach(w => {
      if (w.templateId) {
        usage.set(w.templateId, (usage.get(w.templateId) || 0) + 1);
      }
    });

    return Object.fromEntries(usage);
  }

  private calculateEscalationRates(workflows: ReviewWorkflow[]): Record<string, number> {
    const escalationStats = new Map<string, { total: number; escalated: number }>();

    workflows.forEach(w => {
      if (w.templateId) {
        const stats = escalationStats.get(w.templateId) || { total: 0, escalated: 0 };
        stats.total++;

        if (w.status === 'escalated') {
          stats.escalated++;
        }

        escalationStats.set(w.templateId, stats);
      }
    });

    const rates: Record<string, number> = {};
    escalationStats.forEach((stats, templateId) => {
      rates[templateId] = stats.total > 0 ? stats.escalated / stats.total : 0;
    });

    return rates;
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateHistoryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}