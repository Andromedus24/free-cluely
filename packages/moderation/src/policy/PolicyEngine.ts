import { EventEmitter } from 'events';
import {
  ModerationPolicy,
  PolicyRule,
  PolicyCondition,
  PolicyAction,
  PolicyEvaluation,
  PolicyViolation,
  PolicyTemplate,
  PolicyEnforcement,
  PolicyAnalytics,
  PolicyWorkflow,
  PolicyException,
  PolicyCategory,
  PolicySeverity,
  PolicyStatus
} from '../types/PolicyTypes';
import { IModerationStorage } from '../storage/ModerationStorage';
import { IModerationNotifier } from '../notifications/ModerationNotifier';
import { IComplianceService } from '../compliance/ComplianceService';
import { Logger } from '@atlas/logger';

/**
 * Policy Engine Interface
 * Provides comprehensive policy management, evaluation, and enforcement
 */
export interface IPolicyEngine {
  /**
   * Create a new moderation policy
   */
  createPolicy(policy: Omit<ModerationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationPolicy>;

  /**
   * Update an existing policy
   */
  updatePolicy(id: string, updates: Partial<ModerationPolicy>): Promise<ModerationPolicy>;

  /**
   * Get a policy by ID
   */
  getPolicy(id: string): Promise<ModerationPolicy | null>;

  /**
   * Get all policies with filtering
   */
  getPolicies(filters?: PolicyFilters): Promise<ModerationPolicy[]>;

  /**
   * Delete a policy
   */
  deletePolicy(id: string): Promise<boolean>;

  /**
   * Evaluate content against policies
   */
  evaluateContent(content: ContentToEvaluate): Promise<PolicyEvaluation>;

  /**
   * Evaluate batch content
   */
  evaluateBatchContent(contents: ContentToEvaluate[]): Promise<PolicyEvaluation[]>;

  /**
   * Enforce policy actions
   */
  enforceActions(evaluation: PolicyEvaluation, context?: EnforcementContext): Promise<PolicyEnforcement>;

  /**
   * Create policy template
   */
  createTemplate(template: Omit<PolicyTemplate, 'id' | 'createdAt'>): Promise<PolicyTemplate>;

  /**
   * Get policy templates
   */
  getTemplates(filters?: TemplateFilters): Promise<PolicyTemplate[]>;

  /**
   * Create policy exception
   */
  createException(exception: Omit<PolicyException, 'id' | 'createdAt'>): Promise<PolicyException>;

  /**
   * Get policy exceptions
   */
  getExceptions(filters?: ExceptionFilters): Promise<PolicyException[]>;

  /**
   * Get policy analytics
   */
  getAnalytics(timeRange?: TimeRange): Promise<PolicyAnalytics>;

  /**
   * Test policy effectiveness
   */
  testEffectiveness(policyId: string, testContent: ContentToEvaluate[]): Promise<EffectivenessResult>;

  /**
   * Optimize policy rules
   */
  optimizeRules(policyId: string): Promise<OptimizationResult>;

  /**
   * Import policy from template
   */
  importFromTemplate(templateId: string, config: ImportConfig): Promise<ModerationPolicy>;

  /**
   * Export policy to template
   */
  exportToTemplate(policyId: string): Promise<PolicyTemplate>;

  /**
   * Validate policy configuration
   */
  validatePolicy(policy: ModerationPolicy): Promise<ValidationResult>;
}

export interface ContentToEvaluate {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'link';
  content: string | Buffer;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  context?: Record<string, any>;
}

export interface PolicyFilters {
  category?: PolicyCategory;
  severity?: PolicySeverity;
  status?: PolicyStatus;
  framework?: string;
  tags?: string[];
  active?: boolean;
  limit?: number;
  offset?: number;
}

export interface TemplateFilters {
  category?: PolicyCategory;
  framework?: string;
  tags?: string[];
  limit?: number;
}

export interface ExceptionFilters {
  policyId?: string;
  userId?: string;
  type?: string;
  status?: 'active' | 'expired' | 'revoked';
  startDate?: Date;
  endDate?: Date;
}

export interface EnforcementContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  additionalContext?: Record<string, any>;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface EffectivenessResult {
  policyId: string;
  testResults: Array<{
    contentId: string;
    expectedAction: PolicyAction;
    actualAction: PolicyAction;
    match: boolean;
    confidence: number;
  }>;
  effectiveness: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  recommendations: string[];
  testedAt: Date;
}

export interface OptimizationResult {
  policyId: string;
  optimized: boolean;
  changes: Array<{
    type: 'rule_added' | 'rule_removed' | 'rule_modified' | 'condition_modified';
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  performance: {
    before: EvaluationMetrics;
    after: EvaluationMetrics;
  };
  recommendations: string[];
  optimizedAt: Date;
}

export interface EvaluationMetrics {
  averageEvaluationTime: number;
  accuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  coverage: number;
}

export interface ImportConfig {
  name?: string;
  description?: string;
  overrides?: Partial<ModerationPolicy>;
  customize?: {
    rules?: Array<{
      ruleId: string;
      modifications: Partial<PolicyRule>;
    }>;
    conditions?: Array<{
      conditionId: string;
      modifications: Partial<PolicyCondition>;
    }>;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Policy Engine Implementation
 * Provides enterprise-grade policy management with machine learning optimization
 */
export class PolicyEngine extends EventEmitter implements IPolicyEngine {
  private readonly logger: Logger;
  private readonly storage: IModerationStorage;
  private readonly notifier: IModerationNotifier;
  private readonly complianceService?: IComplianceService;
  private readonly policies: Map<string, ModerationPolicy>;
  private readonly templates: Map<string, PolicyTemplate>;
  private readonly exceptions: Map<string, PolicyException>;
  private readonly evaluationCache: Map<string, { result: PolicyEvaluation; timestamp: number; ttl: number }>;
  private readonly mlModels: Map<string, any>;
  private readonly config: PolicyEngineConfig;

  constructor(
    storage: IModerationStorage,
    notifier: IModerationNotifier,
    complianceService?: IComplianceService,
    config?: Partial<PolicyEngineConfig>
  ) {
    super();
    this.logger = new Logger('PolicyEngine');
    this.storage = storage;
    this.notifier = notifier;
    this.complianceService = complianceService;
    this.policies = new Map();
    this.templates = new Map();
    this.exceptions = new Map();
    this.evaluationCache = new Map();
    this.mlModels = new Map();

    this.config = {
      enableML: true,
      enableOptimization: true,
      enableCaching: true,
      cacheTTL: 300000, // 5 minutes
      maxEvaluationTime: 5000, // 5 seconds
      batchSize: 100,
      enableParallelProcessing: true,
      enableRealTimeLearning: false,
      confidenceThreshold: 0.7,
      maxRulesPerPolicy: 100,
      maxConditionsPerRule: 10,
      ...config
    };

    this.initialize();
  }

  /**
   * Create a new moderation policy
   */
  async createPolicy(policy: Omit<ModerationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationPolicy> {
    try {
      const newPolicy: ModerationPolicy = {
        ...policy,
        id: this.generatePolicyId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Validate policy
      const validation = await this.validatePolicy(newPolicy);
      if (!validation.valid) {
        throw new Error(`Policy validation failed: ${validation.errors.join(', ')}`);
      }

      // Store policy
      await this.storage.storeModerationPolicy(newPolicy);
      this.policies.set(newPolicy.id, newPolicy);

      // Optimize rules if enabled
      if (this.config.enableOptimization) {
        this.optimizeRulesInBackground(newPolicy.id);
      }

      // Log to compliance if available
      if (this.complianceService) {
        await this.complianceService.trackViolation({
          policyId: newPolicy.id,
          type: 'policy_created',
          severity: newPolicy.severity,
          category: newPolicy.category,
          description: `New moderation policy created: ${newPolicy.name}`,
          detectedAt: new Date(),
          detectedBy: 'system',
          affectedResources: [newPolicy.id],
          impact: {
            level: 'low',
            score: 1,
            factors: [],
            likelihood: 'unlikely',
            impact: 'low',
            mitigation: []
          }
        });
      }

      // Emit event
      this.emit('policyCreated', newPolicy);

      return newPolicy;
    } catch (error) {
      this.logger.error('Failed to create moderation policy', error);
      throw error;
    }
  }

  /**
   * Update an existing policy
   */
  async updatePolicy(id: string, updates: Partial<ModerationPolicy>): Promise<ModerationPolicy> {
    try {
      const existingPolicy = await this.getPolicy(id);
      if (!existingPolicy) {
        throw new Error('Policy not found');
      }

      const updatedPolicy: ModerationPolicy = {
        ...existingPolicy,
        ...updates,
        id, // Ensure ID doesn't change
        createdAt: existingPolicy.createdAt, // Preserve creation time
        updatedAt: new Date()
      };

      // Validate updated policy
      const validation = await this.validatePolicy(updatedPolicy);
      if (!validation.valid) {
        throw new Error(`Policy validation failed: ${validation.errors.join(', ')}`);
      }

      // Store updated policy
      await this.storage.updateModerationPolicy(updatedPolicy);
      this.policies.set(id, updatedPolicy);

      // Clear cache for this policy
      this.clearPolicyCache(id);

      // Optimize rules if enabled
      if (this.config.enableOptimization) {
        this.optimizeRulesInBackground(id);
      }

      // Log to compliance if available
      if (this.complianceService) {
        await this.complianceService.trackViolation({
          policyId: id,
          type: 'policy_updated',
          severity: updatedPolicy.severity,
          category: updatedPolicy.category,
          description: `Moderation policy updated: ${updatedPolicy.name}`,
          detectedAt: new Date(),
          detectedBy: 'system',
          affectedResources: [id],
          impact: {
            level: 'low',
            score: 1,
            factors: [],
            likelihood: 'unlikely',
            impact: 'low',
            mitigation: []
          }
        });
      }

      // Emit event
      this.emit('policyUpdated', updatedPolicy);

      return updatedPolicy;
    } catch (error) {
      this.logger.error('Failed to update moderation policy', error);
      throw error;
    }
  }

  /**
   * Get a policy by ID
   */
  async getPolicy(id: string): Promise<ModerationPolicy | null> {
    try {
      // Check cache first
      if (this.policies.has(id)) {
        return this.policies.get(id)!;
      }

      // Load from storage
      const policy = await this.storage.getModerationPolicy(id);
      if (policy) {
        this.policies.set(id, policy);
      }

      return policy;
    } catch (error) {
      this.logger.error('Failed to get moderation policy', error);
      throw error;
    }
  }

  /**
   * Get all policies with filtering
   */
  async getPolicies(filters?: PolicyFilters): Promise<ModerationPolicy[]> {
    try {
      const policies = await this.storage.getModerationPolicies(filters);

      // Update cache
      policies.forEach(policy => {
        this.policies.set(policy.id, policy);
      });

      return policies;
    } catch (error) {
      this.logger.error('Failed to get moderation policies', error);
      throw error;
    }
  }

  /**
   * Delete a policy
   */
  async deletePolicy(id: string): Promise<boolean> {
    try {
      const policy = await this.getPolicy(id);
      if (!policy) {
        return false;
      }

      // Delete policy
      await this.storage.deleteModerationPolicy(id);
      this.policies.delete(id);

      // Clear cache
      this.clearPolicyCache(id);

      // Log to compliance if available
      if (this.complianceService) {
        await this.complianceService.trackViolation({
          policyId: id,
          type: 'policy_deleted',
          severity: policy.severity,
          category: policy.category,
          description: `Moderation policy deleted: ${policy.name}`,
          detectedAt: new Date(),
          detectedBy: 'system',
          affectedResources: [id],
          impact: {
            level: 'low',
            score: 1,
            factors: [],
            likelihood: 'unlikely',
            impact: 'low',
            mitigation: []
          }
        });
      }

      // Emit event
      this.emit('policyDeleted', policy);

      return true;
    } catch (error) {
      this.logger.error('Failed to delete moderation policy', error);
      throw error;
    }
  }

  /**
   * Evaluate content against policies
   */
  async evaluateContent(content: ContentToEvaluate): Promise<PolicyEvaluation> {
    try {
      const startTime = Date.now();

      // Check cache if enabled
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(content);
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Get applicable policies
      const policies = await this.getApplicablePolicies(content);

      // Evaluate against each policy
      const violations: PolicyViolation[] = [];
      const matchedRules: PolicyRule[] = [];
      let highestSeverity: PolicySeverity = 'low';
      let overallConfidence = 0;

      for (const policy of policies) {
        const policyResult = await this.evaluateAgainstPolicy(policy, content);

        if (policyResult.violations.length > 0) {
          violations.push(...policyResult.violations);
          matchedRules.push(...policyResult.matchedRules);

          // Update highest severity
          if (this.compareSeverity(policyResult.highestSeverity, highestSeverity) > 0) {
            highestSeverity = policyResult.highestSeverity;
          }
        }

        overallConfidence = Math.max(overallConfidence, policyResult.confidence);
      }

      // Remove duplicate violations
      const uniqueViolations = this.removeDuplicateViolations(violations);

      // Determine recommended action
      const recommendedAction = this.determineRecommendedAction(uniqueViolations, highestSeverity);

      // Generate evaluation result
      const evaluation: PolicyEvaluation = {
        id: this.generateEvaluationId(),
        contentId: content.id,
        contentType: content.type,
        policiesEvaluated: policies.length,
        violations: uniqueViolations,
        matchedRules: this.removeDuplicateRules(matchedRules),
        recommendedAction,
        highestSeverity,
        confidence: overallConfidence,
        evaluationTime: Date.now() - startTime,
        context: {
          policies: policies.map(p => ({ id: p.id, name: p.name })),
          userId: content.userId,
          timestamp: content.timestamp || new Date(),
          metadata: content.metadata
        },
        evaluatedAt: new Date()
      };

      // Cache result if enabled
      if (this.config.enableCaching) {
        this.setCache(cacheKey, evaluation, this.config.cacheTTL);
      }

      // Emit evaluation event
      this.emit('contentEvaluated', evaluation);

      // Log to compliance if violations found
      if (uniqueViolations.length > 0 && this.complianceService) {
        for (const violation of uniqueViolations) {
          await this.complianceService.trackViolation({
            policyId: violation.policyId,
            type: 'content_violation',
            severity: violation.severity,
            category: violation.category,
            description: `Content violation detected: ${violation.description}`,
            detectedAt: new Date(),
            detectedBy: 'system',
            affectedResources: [content.id],
            evidence: [JSON.stringify(evaluation)],
            impact: {
              level: violation.severity === 'critical' ? 'high' : violation.severity === 'high' ? 'medium' : 'low',
              score: this.getSeverityScore(violation.severity),
              factors: [],
              likelihood: 'likely',
              impact: 'medium',
              mitigation: []
            }
          });
        }
      }

      return evaluation;
    } catch (error) {
      this.logger.error('Failed to evaluate content', error);
      throw error;
    }
  }

  /**
   * Evaluate batch content
   */
  async evaluateBatchContent(contents: ContentToEvaluate[]): Promise<PolicyEvaluation[]> {
    try {
      if (this.config.enableParallelProcessing) {
        // Process in parallel
        return await Promise.all(contents.map(content => this.evaluateContent(content)));
      } else {
        // Process sequentially
        const results: PolicyEvaluation[] = [];
        for (const content of contents) {
          results.push(await this.evaluateContent(content));
        }
        return results;
      }
    } catch (error) {
      this.logger.error('Failed to evaluate batch content', error);
      throw error;
    }
  }

  /**
   * Enforce policy actions
   */
  async enforceActions(evaluation: PolicyEvaluation, context?: EnforcementContext): Promise<PolicyEnforcement> {
    try {
      const enforcement: PolicyEnforcement = {
        evaluationId: evaluation.id,
        actions: [],
        results: [],
        enforcementTime: 0,
        context: context || {},
        enforcedAt: new Date()
      };

      const startTime = Date.now();

      // Execute recommended action
      if (evaluation.recommendedAction) {
        const result = await this.executeAction(evaluation.recommendedAction, evaluation, context);
        enforcement.actions.push(evaluation.recommendedAction);
        enforcement.results.push(result);
      }

      // Execute additional actions based on severity
      if (evaluation.highestSeverity === 'critical') {
        const immediateActions = this.getImmediateActions(evaluation);
        for (const action of immediateActions) {
          const result = await this.executeAction(action, evaluation, context);
          enforcement.actions.push(action);
          enforcement.results.push(result);
        }
      }

      enforcement.enforcementTime = Date.now() - startTime;

      // Emit enforcement event
      this.emit('actionsEnforced', enforcement);

      return enforcement;
    } catch (error) {
      this.logger.error('Failed to enforce policy actions', error);
      throw error;
    }
  }

  /**
   * Create policy template
   */
  async createTemplate(template: Omit<PolicyTemplate, 'id' | 'createdAt'>): Promise<PolicyTemplate> {
    try {
      const newTemplate: PolicyTemplate = {
        ...template,
        id: this.generateTemplateId(),
        createdAt: new Date()
      };

      // Validate template
      const validation = await this.validateTemplate(newTemplate);
      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      // Store template
      await this.storage.storePolicyTemplate(newTemplate);
      this.templates.set(newTemplate.id, newTemplate);

      // Emit event
      this.emit('templateCreated', newTemplate);

      return newTemplate;
    } catch (error) {
      this.logger.error('Failed to create policy template', error);
      throw error;
    }
  }

  /**
   * Get policy templates
   */
  async getTemplates(filters?: TemplateFilters): Promise<PolicyTemplate[]> {
    try {
      const templates = await this.storage.getPolicyTemplates(filters);

      // Update cache
      templates.forEach(template => {
        this.templates.set(template.id, template);
      });

      return templates;
    } catch (error) {
      this.logger.error('Failed to get policy templates', error);
      throw error;
    }
  }

  /**
   * Create policy exception
   */
  async createException(exception: Omit<PolicyException, 'id' | 'createdAt'>): Promise<PolicyException> {
    try {
      const newException: PolicyException = {
        ...exception,
        id: this.generateExceptionId(),
        createdAt: new Date()
      };

      // Validate exception
      const validation = await this.validateException(newException);
      if (!validation.valid) {
        throw new Error(`Exception validation failed: ${validation.errors.join(', ')}`);
      }

      // Store exception
      await this.storage.storePolicyException(newException);
      this.exceptions.set(newException.id, newException);

      // Emit event
      this.emit('exceptionCreated', newException);

      return newException;
    } catch (error) {
      this.logger.error('Failed to create policy exception', error);
      throw error;
    }
  }

  /**
   * Get policy exceptions
   */
  async getExceptions(filters?: ExceptionFilters): Promise<PolicyException[]> {
    try {
      return await this.storage.getPolicyExceptions(filters);
    } catch (error) {
      this.logger.error('Failed to get policy exceptions', error);
      throw error;
    }
  }

  /**
   * Get policy analytics
   */
  async getAnalytics(timeRange?: TimeRange): Promise<PolicyAnalytics> {
    try {
      const effectiveTimeRange = timeRange || this.getDefaultTimeRange();

      // Get basic metrics
      const totalPolicies = await this.storage.getPolicyCount();
      const activePolicies = await this.storage.getPolicyCount({ status: 'active' });
      const totalEvaluations = await this.storage.getEvaluationCount(effectiveTimeRange);
      const totalViolations = await this.storage.getViolationCount(effectiveTimeRange);

      // Get policy performance
      const policyPerformance = await this.getPolicyPerformance(effectiveTimeRange);

      // Get category analytics
      const categoryAnalytics = await this.getCategoryAnalytics(effectiveTimeRange);

      // Get trend data
      const trends = await this.getTrendData(effectiveTimeRange);

      // Get effectiveness metrics
      const effectiveness = await this.getEffectivenessMetrics(effectiveTimeRange);

      return {
        summary: {
          totalPolicies,
          activePolicies,
          totalEvaluations,
          totalViolations,
          violationRate: totalEvaluations > 0 ? totalViolations / totalEvaluations : 0,
          averageEvaluationTime: await this.getAverageEvaluationTime(effectiveTimeRange)
        },
        policyPerformance,
        categoryAnalytics,
        trends,
        effectiveness,
        topViolations: await this.getTopViolations(effectiveTimeRange),
        recommendations: await this.generateAnalyticsRecommendations(effectiveTimeRange),
        timeRange: effectiveTimeRange,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to get policy analytics', error);
      throw error;
    }
  }

  /**
   * Test policy effectiveness
   */
  async testEffectiveness(policyId: string, testContent: ContentToEvaluate[]): Promise<EffectivenessResult> {
    try {
      const policy = await this.getPolicy(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      const testResults: Array<{
        contentId: string;
        expectedAction: PolicyAction;
        actualAction: PolicyAction;
        match: boolean;
        confidence: number;
      }> = [];

      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      for (const content of testContent) {
        const evaluation = await this.evaluateContent(content);
        const expectedAction = this.getExpectedActionForContent(content, policy);
        const actualAction = evaluation.recommendedAction || { type: 'allow' as const };
        const match = this.actionsMatch(expectedAction, actualAction);

        testResults.push({
          contentId: content.id,
          expectedAction,
          actualAction,
          match,
          confidence: evaluation.confidence
        });

        // Update confusion matrix
        if (expectedAction.type === 'block' || expectedAction.type === 'flag') {
          if (match) truePositives++;
          else falseNegatives++;
        } else {
          if (match) trueNegatives++;
          else falsePositives++;
        }
      }

      // Calculate metrics
      const accuracy = (truePositives + trueNegatives) / testContent.length;
      const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
      const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
      const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

      // Generate recommendations
      const recommendations = this.generateEffectivenessRecommendations({
        accuracy,
        precision,
        recall,
        f1Score,
        falsePositives,
        falseNegatives
      });

      return {
        policyId,
        testResults,
        effectiveness: {
          accuracy,
          precision,
          recall,
          f1Score
        },
        recommendations,
        testedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to test policy effectiveness', error);
      throw error;
    }
  }

  /**
   * Optimize policy rules
   */
  async optimizeRules(policyId: string): Promise<OptimizationResult> {
    try {
      const policy = await this.getPolicy(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      const beforeMetrics = await this.getPolicyMetrics(policyId);

      // Analyze current rules
      const analysis = await this.analyzePolicyRules(policy);

      // Generate optimizations
      const optimizations = this.generateRuleOptimizations(analysis);

      // Apply optimizations if beneficial
      let optimized = false;
      const changes: Array<{
        type: 'rule_added' | 'rule_removed' | 'rule_modified' | 'condition_modified';
        description: string;
        impact: 'low' | 'medium' | 'high';
      }> = [];

      if (optimizations.length > 0) {
        const updatedPolicy = this.applyOptimizations(policy, optimizations);
        await this.updatePolicy(policyId, updatedPolicy);
        optimized = true;
        changes = optimizations;
      }

      const afterMetrics = await this.getPolicyMetrics(policyId);

      return {
        policyId,
        optimized,
        changes,
        performance: {
          before: beforeMetrics,
          after: afterMetrics
        },
        recommendations: this.generateOptimizationRecommendations(beforeMetrics, afterMetrics),
        optimizedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to optimize policy rules', error);
      throw error;
    }
  }

  /**
   * Import policy from template
   */
  async importFromTemplate(templateId: string, config: ImportConfig): Promise<ModerationPolicy> {
    try {
      const template = await this.storage.getPolicyTemplate(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Create policy from template
      const policyData: Omit<ModerationPolicy, 'id' | 'createdAt' | 'updatedAt'> = {
        name: config.name || template.name,
        description: config.description || template.description,
        category: template.category,
        severity: template.severity,
        status: 'active',
        framework: template.framework,
        rules: template.rules.map(rule => ({ ...rule })), // Deep copy
        conditions: template.conditions.map(condition => ({ ...condition })), // Deep copy
        actions: template.actions.map(action => ({ ...action })), // Deep copy
        tags: template.tags,
        version: '1.0.0',
        lastEvaluated: new Date(),
        effectiveness: 0,
        lastOptimized: new Date(),
        metadata: {
          ...template.metadata,
          importedFrom: templateId,
          importedAt: new Date()
        }
      };

      // Apply customizations
      if (config.customize) {
        if (config.customize.rules) {
          for (const customization of config.customize.rules) {
            const ruleIndex = policyData.rules.findIndex(r => r.id === customization.ruleId);
            if (ruleIndex !== -1) {
              policyData.rules[ruleIndex] = {
                ...policyData.rules[ruleIndex],
                ...customization.modifications
              };
            }
          }
        }

        if (config.customize.conditions) {
          for (const customization of config.customize.conditions) {
            const conditionIndex = policyData.conditions.findIndex(c => c.id === customization.conditionId);
            if (conditionIndex !== -1) {
              policyData.conditions[conditionIndex] = {
                ...policyData.conditions[conditionIndex],
                ...customization.modifications
              };
            }
          }
        }
      }

      // Apply overrides
      if (config.overrides) {
        Object.assign(policyData, config.overrides);
      }

      // Create the policy
      return await this.createPolicy(policyData);
    } catch (error) {
      this.logger.error('Failed to import policy from template', error);
      throw error;
    }
  }

  /**
   * Export policy to template
   */
  async exportToTemplate(policyId: string): Promise<PolicyTemplate> {
    try {
      const policy = await this.getPolicy(policyId);
      if (!policy) {
        throw new Error('Policy not found');
      }

      const template: PolicyTemplate = {
        id: this.generateTemplateId(),
        name: policy.name,
        description: policy.description,
        category: policy.category,
        severity: policy.severity,
        framework: policy.framework,
        rules: policy.rules.map(rule => ({ ...rule, id: this.generateRuleId() })), // Generate new IDs
        conditions: policy.conditions.map(condition => ({ ...condition, id: this.generateConditionId() })), // Generate new IDs
        actions: policy.actions,
        tags: policy.tags,
        metadata: {
          ...policy.metadata,
          exportedFrom: policyId,
          exportedAt: new Date()
        },
        usageCount: 0,
        rating: 0,
        reviews: [],
        createdAt: new Date()
      };

      // Store template
      await this.storage.storePolicyTemplate(template);

      return template;
    } catch (error) {
      this.logger.error('Failed to export policy to template', error);
      throw error;
    }
  }

  /**
   * Validate policy configuration
   */
  async validatePolicy(policy: ModerationPolicy): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Basic validation
    if (!policy.name || policy.name.trim().length === 0) {
      errors.push('Policy name is required');
    }

    if (!policy.category) {
      errors.push('Policy category is required');
    }

    if (!policy.severity) {
      errors.push('Policy severity is required');
    }

    if (!policy.rules || policy.rules.length === 0) {
      errors.push('Policy must have at least one rule');
    }

    if (policy.rules.length > this.config.maxRulesPerPolicy) {
      warnings.push(`Policy has ${policy.rules.length} rules, which exceeds recommended maximum of ${this.config.maxRulesPerPolicy}`);
    }

    // Validate rules
    for (const rule of policy.rules) {
      const ruleValidation = await this.validateRule(rule);
      errors.push(...ruleValidation.errors);
      warnings.push(...ruleValidation.warnings);
    }

    // Validate conditions
    for (const condition of policy.conditions) {
      const conditionValidation = await this.validateCondition(condition);
      errors.push(...conditionValidation.errors);
      warnings.push(...conditionValidation.warnings);
    }

    // Generate recommendations
    if (errors.length === 0) {
      recommendations.push(
        'Consider testing the policy with sample content',
        'Set up monitoring for policy effectiveness',
        'Review and update policy regularly'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendations
    };
  }

  /**
   * Initialize policy engine
   */
  private async initialize(): Promise<void> {
    try {
      // Load existing policies
      const policies = await this.storage.getModerationPolicies();
      policies.forEach(policy => {
        this.policies.set(policy.id, policy);
      });

      // Load templates
      const templates = await this.storage.getPolicyTemplates();
      templates.forEach(template => {
        this.templates.set(template.id, template);
      });

      // Load exceptions
      const exceptions = await this.storage.getPolicyExceptions();
      exceptions.forEach(exception => {
        this.exceptions.set(exception.id, exception);
      });

      // Initialize ML models if enabled
      if (this.config.enableML) {
        await this.initializeMLModels();
      }

      // Start background processes
      this.startBackgroundProcesses();

      this.logger.info('Policy engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize policy engine', error);
      throw error;
    }
  }

  /**
   * Helper methods for policy evaluation and optimization
   */
  private async getApplicablePolicies(content: ContentToEvaluate): Promise<ModerationPolicy[]> {
    // Get all active policies
    const allPolicies = await this.getPolicies({ active: true });

    // Filter based on content type and other criteria
    return allPolicies.filter(policy => {
      // Check if policy applies to content type
      if (policy.applicableContentTypes && !policy.applicableContentTypes.includes(content.type)) {
        return false;
      }

      // Check exceptions
      const applicableExceptions = Array.from(this.exceptions.values()).filter(exception =>
        exception.policyId === policy.id &&
        exception.status === 'active' &&
        this.exceptionApplies(exception, content)
      );

      return applicableExceptions.length === 0;
    });
  }

  private async evaluateAgainstPolicy(policy: ModerationPolicy, content: ContentToEvaluate): Promise<{
    violations: PolicyViolation[];
    matchedRules: PolicyRule[];
    highestSeverity: PolicySeverity;
    confidence: number;
  }> {
    const violations: PolicyViolation[] = [];
    const matchedRules: PolicyRule[] = [];
    let highestSeverity: PolicySeverity = 'low';
    let confidence = 0;

    // Evaluate each rule
    for (const rule of policy.rules) {
      const ruleResult = await this.evaluateRule(rule, policy, content);

      if (ruleResult.matched) {
        matchedRules.push(rule);
        confidence = Math.max(confidence, ruleResult.confidence);

        if (ruleResult.violation) {
          violations.push(ruleResult.violation);

          // Update highest severity
          if (this.compareSeverity(rule.severity, highestSeverity) > 0) {
            highestSeverity = rule.severity;
          }
        }
      }
    }

    return {
      violations,
      matchedRules,
      highestSeverity,
      confidence
    };
  }

  private async evaluateRule(rule: PolicyRule, policy: ModerationPolicy, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
    violation?: PolicyViolation;
  }> {
    try {
      let matched = false;
      let confidence = 0;

      // Evaluate conditions
      for (const condition of policy.conditions) {
        const conditionResult = await this.evaluateCondition(condition, content);
        if (conditionResult.matched) {
          matched = true;
          confidence = Math.max(confidence, conditionResult.confidence);
        }
      }

      // If no conditions matched, check rule-specific patterns
      if (!matched && rule.patterns) {
        const patternResult = await this.evaluatePatterns(rule.patterns, content);
        matched = patternResult.matched;
        confidence = patternResult.confidence;
      }

      // Use ML model if enabled and confidence is low
      if (this.config.enableML && confidence < this.config.confidenceThreshold) {
        const mlResult = await this.evaluateWithML(rule, content);
        if (mlResult.confidence > confidence) {
          matched = mlResult.matched;
          confidence = mlResult.confidence;
        }
      }

      // Create violation if matched and rule has violation action
      let violation: PolicyViolation | undefined;
      if (matched && (rule.action.type === 'block' || rule.action.type === 'flag')) {
        violation = {
          id: this.generateViolationId(),
          policyId: policy.id,
          ruleId: rule.id,
          type: rule.type,
          severity: rule.severity,
          category: policy.category,
          description: rule.description || `Violation of ${policy.name}`,
          detectedAt: new Date(),
          confidence,
          evidence: [JSON.stringify(content)],
          metadata: {
            contentId: content.id,
            contentType: content.type,
            userId: content.userId,
            ruleType: rule.type
          }
        };
      }

      return {
        matched,
        confidence,
        violation
      };
    } catch (error) {
      this.logger.error('Failed to evaluate rule', error);
      return {
        matched: false,
        confidence: 0
      };
    }
  }

  private async evaluateCondition(condition: PolicyCondition, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    try {
      // This is a simplified condition evaluation
      // In a real implementation, this would be much more sophisticated
      switch (condition.type) {
        case 'keyword':
          return this.evaluateKeywordCondition(condition, content);
        case 'pattern':
          return this.evaluatePatternCondition(condition, content);
        case 'ml_model':
          return this.evaluateMLCondition(condition, content);
        case 'regex':
          return this.evaluateRegexCondition(condition, content);
        case 'composite':
          return this.evaluateCompositeCondition(condition, content);
        default:
          return { matched: false, confidence: 0 };
      }
    } catch (error) {
      this.logger.error('Failed to evaluate condition', error);
      return { matched: false, confidence: 0 };
    }
  }

  private async evaluateKeywordCondition(condition: PolicyCondition, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    if (typeof content.content !== 'string') {
      return { matched: false, confidence: 0 };
    }

    const text = content.content.toLowerCase();
    const keywords = condition.keywords || [];

    let matchedCount = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchedCount++;
      }
    }

    const matched = matchedCount > 0;
    const confidence = Math.min(matchedCount / keywords.length, 1);

    return { matched, confidence };
  }

  private async evaluatePatternCondition(condition: PolicyCondition, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    // Simplified pattern evaluation
    return { matched: false, confidence: 0 };
  }

  private async evaluateMLCondition(condition: PolicyCondition, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    if (!this.config.enableML) {
      return { matched: false, confidence: 0 };
    }

    // Use ML model for evaluation
    const model = this.mlModels.get(condition.modelId || 'default');
    if (!model) {
      return { matched: false, confidence: 0 };
    }

    try {
      const result = await model.predict(content);
      return {
        matched: result.prediction > 0.5,
        confidence: result.confidence
      };
    } catch (error) {
      this.logger.error('ML model evaluation failed', error);
      return { matched: false, confidence: 0 };
    }
  }

  private async evaluateRegexCondition(condition: PolicyCondition, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    if (typeof content.content !== 'string' || !condition.regex) {
      return { matched: false, confidence: 0 };
    }

    try {
      const regex = new RegExp(condition.regex, condition.regexFlags || 'i');
      const matched = regex.test(content.content);
      const confidence = matched ? 1 : 0;

      return { matched, confidence };
    } catch (error) {
      this.logger.error('Regex evaluation failed', error);
      return { matched: false, confidence: 0 };
    }
  }

  private async evaluateCompositeCondition(condition: PolicyCondition, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    // Evaluate sub-conditions with logical operators
    if (!condition.conditions) {
      return { matched: false, confidence: 0 };
    }

    const results = await Promise.all(
      condition.conditions.map(subCondition => this.evaluateCondition(subCondition, content))
    );

    let matched = false;
    let confidence = 0;

    switch (condition.operator) {
      case 'AND':
        matched = results.every(r => r.matched);
        confidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
        break;
      case 'OR':
        matched = results.some(r => r.matched);
        confidence = Math.max(...results.map(r => r.confidence));
        break;
      case 'NOT':
        matched = !results.some(r => r.matched);
        confidence = 1 - Math.max(...results.map(r => r.confidence));
        break;
    }

    return { matched, confidence };
  }

  private async evaluatePatterns(patterns: string[], content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    // Simplified pattern evaluation
    return { matched: false, confidence: 0 };
  }

  private async evaluateWithML(rule: PolicyRule, content: ContentToEvaluate): Promise<{
    matched: boolean;
    confidence: number;
  }> {
    // Use ML model for evaluation
    const model = this.mlModels.get('default');
    if (!model) {
      return { matched: false, confidence: 0 };
    }

    try {
      const result = await model.predict(content);
      return {
        matched: result.prediction > 0.5,
        confidence: result.confidence
      };
    } catch (error) {
      this.logger.error('ML model evaluation failed', error);
      return { matched: false, confidence: 0 };
    }
  }

  private determineRecommendedAction(violations: PolicyViolation[], highestSeverity: PolicySeverity): PolicyAction | null {
    if (violations.length === 0) {
      return { type: 'allow', reason: 'No violations detected' };
    }

    // Determine action based on highest severity
    switch (highestSeverity) {
      case 'critical':
        return { type: 'block', reason: 'Critical policy violation' };
      case 'high':
        return { type: 'block', reason: 'High severity policy violation' };
      case 'medium':
        return { type: 'flag', reason: 'Medium severity policy violation' };
      case 'low':
        return { type: 'flag', reason: 'Low severity policy violation' };
      default:
        return { type: 'flag', reason: 'Policy violation detected' };
    }
  }

  private getImmediateActions(evaluation: PolicyEvaluation): PolicyAction[] {
    const actions: PolicyAction[] = [];

    // Add immediate actions for critical violations
    if (evaluation.highestSeverity === 'critical') {
      actions.push({
        type: 'block',
        reason: 'Immediate action required for critical violation'
      });
    }

    // Add notification actions
    actions.push({
      type: 'notify',
      reason: 'Policy violation requires attention',
      recipients: ['admin', 'moderator']
    });

    return actions;
  }

  private async executeAction(action: PolicyAction, evaluation: PolicyEvaluation, context?: EnforcementContext): Promise<{
    action: PolicyAction;
    success: boolean;
    result?: any;
    error?: string;
    timestamp: Date;
  }> {
    try {
      let result: any;

      switch (action.type) {
        case 'block':
          result = await this.executeBlockAction(evaluation, context);
          break;
        case 'flag':
          result = await this.executeFlagAction(evaluation, context);
          break;
        case 'notify':
          result = await this.executeNotifyAction(action, evaluation, context);
          break;
        case 'quarantine':
          result = await this.executeQuarantineAction(evaluation, context);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return {
        action,
        success: true,
        result,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        action,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  private async executeBlockAction(evaluation: PolicyEvaluation, context?: EnforcementContext): Promise<any> {
    // Implement block action logic
    return { blocked: true, reason: evaluation.recommendedAction?.reason };
  }

  private async executeFlagAction(evaluation: PolicyEvaluation, context?: EnforcementContext): Promise<any> {
    // Implement flag action logic
    return { flagged: true, reason: evaluation.recommendedAction?.reason };
  }

  private async executeNotifyAction(action: PolicyAction, evaluation: PolicyEvaluation, context?: EnforcementContext): Promise<any> {
    // Implement notify action logic
    const recipients = action.recipients || ['admin'];
    for (const recipient of recipients) {
      await this.notifier.sendNotification(recipient, {
        type: 'policy_violation',
        title: 'Policy Violation Detected',
        message: `Content flagged for policy violation: ${evaluation.recommendedAction?.reason}`,
        data: {
          evaluationId: evaluation.id,
          contentId: evaluation.contentId,
          severity: evaluation.highestSeverity,
          violations: evaluation.violations.length
        }
      });
    }
    return { notified: true, recipients };
  }

  private async executeQuarantineAction(evaluation: PolicyEvaluation, context?: EnforcementContext): Promise<any> {
    // Implement quarantine action logic
    return { quarantined: true, reason: evaluation.recommendedAction?.reason };
  }

  private async validateTemplate(template: PolicyTemplate): Promise<ValidationResult> {
    // Simplified template validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };
  }

  private async validateException(exception: PolicyException): Promise<ValidationResult> {
    // Simplified exception validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };
  }

  private async validateRule(rule: PolicyRule): Promise<ValidationResult> {
    // Simplified rule validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };
  }

  private async validateCondition(condition: PolicyCondition): Promise<ValidationResult> {
    // Simplified condition validation
    return {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };
  }

  private exceptionApplies(exception: PolicyException, content: ContentToEvaluate): boolean {
    // Check if exception applies to content
    if (exception.userId && exception.userId !== content.userId) {
      return false;
    }

    if (exception.contentType && exception.contentType !== content.type) {
      return false;
    }

    if (exception.startDate && new Date() < exception.startDate) {
      return false;
    }

    if (exception.endDate && new Date() > exception.endDate) {
      return false;
    }

    return true;
  }

  private removeDuplicateViolations(violations: PolicyViolation[]): PolicyViolation[] {
    const seen = new Set();
    return violations.filter(violation => {
      const key = `${violation.policyId}-${violation.ruleId}-${violation.type}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private removeDuplicateRules(rules: PolicyRule[]): PolicyRule[] {
    const seen = new Set();
    return rules.filter(rule => {
      const key = rule.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private compareSeverity(severity1: PolicySeverity, severity2: PolicySeverity): number {
    const severityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return severityOrder[severity1] - severityOrder[severity2];
  }

  private actionsMatch(action1: PolicyAction, action2: PolicyAction): boolean {
    return action1.type === action2.type;
  }

  private getExpectedActionForContent(content: ContentToEvaluate, policy: ModerationPolicy): PolicyAction {
    // This would be determined by the test data or expected behavior
    return { type: 'allow', reason: 'Default action' };
  }

  private getSeverityScore(severity: PolicySeverity): number {
    const scores = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return scores[severity];
  }

  private generateCacheKey(content: ContentToEvaluate): string {
    return `eval_${content.id}_${content.type}_${Date.now()}`;
  }

  private getFromCache(key: string): PolicyEvaluation | null {
    const cached = this.evaluationCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.evaluationCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: PolicyEvaluation, ttl: number): void {
    this.evaluationCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearPolicyCache(policyId: string): void {
    for (const key of this.evaluationCache.keys()) {
      if (key.includes(policyId)) {
        this.evaluationCache.delete(key);
      }
    }
  }

  private async initializeMLModels(): Promise<void> {
    // Initialize ML models for content evaluation
    // This would load pre-trained models or create new ones
  }

  private startBackgroundProcesses(): void {
    // Start background optimization processes
    if (this.config.enableOptimization) {
      setInterval(() => this.optimizePoliciesInBackground(), 24 * 60 * 60 * 1000); // Daily optimization
    }
  }

  private async optimizePoliciesInBackground(): Promise<void> {
    try {
      const policies = await this.getPolicies({ active: true });
      for (const policy of policies) {
        this.optimizeRulesInBackground(policy.id);
      }
    } catch (error) {
      this.logger.error('Background policy optimization failed', error);
    }
  }

  private optimizeRulesInBackground(policyId: string): void {
    // Run optimization in background
    this.optimizeRules(policyId).catch(error => {
      this.logger.error(`Background optimization failed for policy ${policyId}`, error);
    });
  }

  private async getPolicyPerformance(timeRange: TimeRange): Promise<any> {
    // Get policy performance metrics
    return {};
  }

  private async getCategoryAnalytics(timeRange: TimeRange): Promise<any> {
    // Get category analytics
    return {};
  }

  private async getTrendData(timeRange: TimeRange): Promise<any> {
    // Get trend data
    return {};
  }

  private async getEffectivenessMetrics(timeRange: TimeRange): Promise<any> {
    // Get effectiveness metrics
    return {};
  }

  private async getTopViolations(timeRange: TimeRange): Promise<any[]> {
    // Get top violations
    return [];
  }

  private async generateAnalyticsRecommendations(timeRange: TimeRange): Promise<string[]> {
    // Generate analytics recommendations
    return [];
  }

  private async getAverageEvaluationTime(timeRange: TimeRange): Promise<number> {
    // Get average evaluation time
    return 0;
  }

  private async getPolicyMetrics(policyId: string): Promise<EvaluationMetrics> {
    // Get policy metrics
    return {
      averageEvaluationTime: 0,
      accuracy: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      coverage: 0
    };
  }

  private async analyzePolicyRules(policy: ModerationPolicy): Promise<any> {
    // Analyze policy rules for optimization opportunities
    return {};
  }

  private generateRuleOptimizations(analysis: any): Array<{
    type: 'rule_added' | 'rule_removed' | 'rule_modified' | 'condition_modified';
    description: string;
    impact: 'low' | 'medium' | 'high';
  }> {
    // Generate optimization suggestions
    return [];
  }

  private applyOptimizations(policy: ModerationPolicy, optimizations: any[]): ModerationPolicy {
    // Apply optimizations to policy
    return policy;
  }

  private generateOptimizationRecommendations(before: EvaluationMetrics, after: EvaluationMetrics): string[] {
    // Generate optimization recommendations
    return [];
  }

  private generateEffectivenessRecommendations(metrics: any): string[] {
    // Generate effectiveness recommendations
    return [];
  }

  private getDefaultTimeRange(): TimeRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // 30 days default
    return { start, end };
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExceptionId(): string {
    return `exception_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEvaluationId(): string {
    return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConditionId(): string {
    return `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  public async destroy(): Promise<void> {
    // Clear caches
    this.policies.clear();
    this.templates.clear();
    this.exceptions.clear();
    this.evaluationCache.clear();
    this.mlModels.clear();

    // Remove all listeners
    this.removeAllListeners();
  }
}

export interface PolicyEngineConfig {
  enableML: boolean;
  enableOptimization: boolean;
  enableCaching: boolean;
  cacheTTL: number;
  maxEvaluationTime: number;
  batchSize: number;
  enableParallelProcessing: boolean;
  enableRealTimeLearning: boolean;
  confidenceThreshold: number;
  maxRulesPerPolicy: number;
  maxConditionsPerRule: number;
}