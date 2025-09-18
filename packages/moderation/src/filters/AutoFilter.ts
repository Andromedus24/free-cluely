import {
  ModerationAnalysis,
  ModerationAction,
  ModerationCategory,
  ModerationSeverity,
  ModerationContentType,
  ModerationConfidence
} from '../types/ModerationTypes';
import { FilterManager, FilterResult } from './FilterManager';

/**
 * Automated Content Filtering System
 * Provides real-time content filtering with automatic actions
 */
export class AutoFilter {
  private filterManager: FilterManager;
  private rules: AutoFilterRule[] = [];
  private cache: ContentCache;
  private metrics: AutoFilterMetrics;
  private config: AutoFilterConfig;

  constructor(filterManager: FilterManager, config?: Partial<AutoFilterConfig>) {
    this.filterManager = filterManager;
    this.config = {
      enabled: true,
      cacheEnabled: true,
      cacheSize: 1000,
      cacheTTL: 300000, // 5 minutes
      autoBlockEnabled: true,
      autoFlagEnabled: true,
      autoQuarantineEnabled: true,
      learningEnabled: false,
      sensitivity: 'medium',
      ...config
    };

    this.cache = new ContentCache(this.config.cacheSize, this.config.cacheTTL);
    this.metrics = new AutoFilterMetrics();

    this.initializeDefaultRules();
  }

  /**
   * Automatically filter content and take appropriate action
   */
  async filterAndAct(content: any, type: ModerationContentType, context?: FilterContext): Promise<AutoFilterResult> {
    if (!this.config.enabled) {
      return this.createBypassedResult(content, type, 'filter_disabled');
    }

    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cachedResult = this.cache.get(content, type);
        if (cachedResult) {
          this.metrics.recordCacheHit();
          return {
            ...cachedResult,
            cached: true,
            processingTime: Date.now() - startTime
          };
        }
      }

      this.metrics.recordCacheMiss();

      // Perform filtering
      const filterResult = await this.filterManager.filterContent(content, type);
      const analysis = filterResult.analysis;

      // Apply auto-filter rules
      const ruleResult = await this.applyAutoFilterRules(analysis, context);

      // Execute automatic actions
      const actionResult = await this.executeAutomaticActions(analysis, ruleResult, context);

      // Cache the result
      if (this.config.cacheEnabled && analysis.action === ModerationAction.ALLOW) {
        this.cache.set(content, type, {
          success: true,
          analysis,
          actionResult,
          automaticActions: actionResult.actionsTaken,
          processingTime: Date.now() - startTime,
          timestamp: new Date(),
          cached: false
        });
      }

      const finalResult: AutoFilterResult = {
        success: true,
        analysis,
        ruleResult,
        actionResult,
        automaticActions: actionResult.actionsTaken,
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
        cached: false
      };

      // Record metrics
      this.metrics.recordFilter(finalResult);

      return finalResult;

    } catch (error) {
      this.metrics.recordError(error);

      const errorResult: AutoFilterResult = {
        success: false,
        analysis: this.createErrorAnalysis(content, type, error),
        ruleResult: { rulesMatched: [], rulesTriggered: [] },
        actionResult: { actionsTaken: [], actionTaken: 'error' },
        automaticActions: [],
        processingTime: Date.now() - startTime,
        timestamp: new Date(),
        cached: false,
        error: error.message
      };

      return errorResult;
    }
  }

  /**
   * Add an auto-filter rule
   */
  addRule(rule: AutoFilterRule): void {
    this.rules.push({
      ...rule,
      id: rule.id || this.generateId(),
      createdAt: new Date(),
      enabled: rule.enabled !== false
    });

    this.sortRulesByPriority();
  }

  /**
   * Remove an auto-filter rule
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Update an auto-filter rule
   */
  updateRule(ruleId: string, updates: Partial<AutoFilterRule>): void {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules[index] = { ...this.rules[index], ...updates, updatedAt: new Date() };
      this.sortRulesByPriority();
    }
  }

  /**
   * Get all auto-filter rules
   */
  getRules(): AutoFilterRule[] {
    return [...this.rules];
  }

  /**
   * Enable/disable auto-filter
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get auto-filter metrics
   */
  getMetrics(): AutoFilterMetricsData {
    return this.metrics.getMetrics();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  // Private Methods
  // ==============

  private initializeDefaultRules(): void {
    // High-severity content auto-block rules
    this.addRule({
      name: 'Block Critical Content',
      description: 'Automatically block content with critical severity',
      condition: {
        type: 'severity',
        operator: 'gte',
        value: 'critical'
      },
      action: {
        type: 'block',
        reason: 'Content blocked due to critical severity'
      },
      priority: 100
    });

    this.addRule({
      name: 'Block High-Severity NSFW',
      description: 'Automatically block NSFW content with high severity',
      condition: {
        type: 'category_and_severity',
        category: 'adult_content',
        severity: 'high',
        confidence: 0.8
      },
      action: {
        type: 'block',
        reason: 'NSFW content blocked'
      },
      priority: 95
    });

    // Auto-flag rules
    this.addRule({
      name: 'Flag High-Risk Content',
      description: 'Automatically flag high-risk content for review',
      condition: {
        type: 'severity',
        operator: 'gte',
        value: 'high'
      },
      action: {
        type: 'flag',
        reason: 'High-risk content flagged for review'
      },
      priority: 80
    });

    this.addRule({
      name: 'Flag Personal Information',
      description: 'Automatically flag content containing personal information',
      condition: {
        type: 'category',
        operator: 'equals',
        value: 'personal_info'
      },
      action: {
        type: 'flag',
        reason: 'Personal information detected - review required'
      },
      priority: 70
    });

    // Quarantine rules for suspicious content
    this.addRule({
      name: 'Quarantine Suspicious Patterns',
      description: 'Quarantine content with suspicious patterns',
      condition: {
        type: 'pattern',
        patterns: ['script', 'javascript', 'data:'],
        minMatches: 2
      },
      action: {
        type: 'quarantine',
        reason: 'Suspicious patterns detected - content quarantined'
      },
      priority: 60
    });

    // Learning rule (if enabled)
    if (this.config.learningEnabled) {
      this.addRule({
        name: 'Learn from User Reports',
        description: 'Adjust sensitivity based on user report patterns',
        condition: {
          type: 'user_feedback',
          minReports: 3,
          timeWindow: 3600000 // 1 hour
        },
        action: {
          type: 'adjust_sensitivity',
          adjustment: 'increase',
          reason: 'Multiple user reports detected'
        },
        priority: 50
      });
    }
  }

  private async applyAutoFilterRules(analysis: ModerationAnalysis, context?: FilterContext): Promise<AutoFilterRuleResult> {
    const matchedRules: AutoFilterRule[] = [];
    const triggeredRules: AutoFilterRule[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (await this.evaluateRuleCondition(rule.condition, analysis, context)) {
        matchedRules.push(rule);

        // Check if rule should be triggered based on additional criteria
        if (await this.shouldTriggerRule(rule, analysis, context)) {
          triggeredRules.push(rule);
        }
      }
    }

    return {
      rulesMatched: matchedRules,
      rulesTriggered: triggeredRules,
      highestPriority: triggeredRules.length > 0 ? Math.max(...triggeredRules.map(r => r.priority)) : 0
    };
  }

  private async evaluateRuleCondition(condition: any, analysis: ModerationAnalysis, context?: FilterContext): Promise<boolean> {
    switch (condition.type) {
      case 'severity':
        return this.evaluateSeverityCondition(condition, analysis);
      case 'category':
        return this.evaluateCategoryCondition(condition, analysis);
      case 'category_and_severity':
        return this.evaluateCategoryAndSeverityCondition(condition, analysis);
      case 'confidence':
        return this.evaluateConfidenceCondition(condition, analysis);
      case 'pattern':
        return this.evaluatePatternCondition(condition, analysis);
      case 'user_feedback':
        return this.evaluateUserFeedbackCondition(condition, context);
      default:
        return false;
    }
  }

  private evaluateSeverityCondition(condition: any, analysis: ModerationAnalysis): boolean {
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    const analysisSeverityIndex = severityOrder.indexOf(analysis.severity);
    const conditionSeverityIndex = severityOrder.indexOf(condition.value);

    switch (condition.operator) {
      case 'gte':
        return analysisSeverityIndex >= conditionSeverityIndex;
      case 'gt':
        return analysisSeverityIndex > conditionSeverityIndex;
      case 'eq':
        return analysisSeverityIndex === conditionSeverityIndex;
      case 'lt':
        return analysisSeverityIndex < conditionSeverityIndex;
      case 'lte':
        return analysisSeverityIndex <= conditionSeverityIndex;
      default:
        return false;
    }
  }

  private evaluateCategoryCondition(condition: any, analysis: ModerationAnalysis): boolean {
    switch (condition.operator) {
      case 'equals':
        return analysis.category === condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(analysis.category);
      default:
        return false;
    }
  }

  private evaluateCategoryAndSeverityCondition(condition: any, analysis: ModerationAnalysis): boolean {
    const categoryMatch = analysis.category === condition.category;
    const severityMatch = this.evaluateSeverityCondition({ operator: 'gte', value: condition.severity }, analysis);
    const confidenceMatch = condition.confidence ? analysis.confidence.score >= condition.confidence : true;

    return categoryMatch && severityMatch && confidenceMatch;
  }

  private evaluateConfidenceCondition(condition: any, analysis: ModerationAnalysis): boolean {
    return analysis.confidence.score >= condition.value;
  }

  private evaluatePatternCondition(condition: any, analysis: ModerationAnalysis): boolean {
    const textContent = this.extractTextFromAnalysis(analysis);
    if (!textContent) return false;

    let matchCount = 0;
    for (const pattern of condition.patterns) {
      if (textContent.toLowerCase().includes(pattern.toLowerCase())) {
        matchCount++;
      }
    }

    return matchCount >= (condition.minMatches || 1);
  }

  private evaluateUserFeedbackCondition(condition: any, context?: FilterContext): Promise<boolean> {
    // Placeholder for user feedback evaluation
    // In production, this would query user report data
    return Promise.resolve(false);
  }

  private async shouldTriggerRule(rule: AutoFilterRule, analysis: ModerationAnalysis, context?: FilterContext): Promise<boolean> {
    // Additional logic to prevent false positives
    if (this.config.sensitivity === 'low' && rule.priority < 80) {
      return false;
    }

    if (this.config.sensitivity === 'high' && rule.priority >= 50) {
      return true;
    }

    // Default behavior
    return true;
  }

  private async executeAutomaticActions(
    analysis: ModerationAnalysis,
    ruleResult: AutoFilterRuleResult,
    context?: FilterContext
  ): Promise<AutoFilterActionResult> {
    const actionsTaken: AutoFilterAction[] = [];
    let finalAction: ModerationAction = analysis.action;

    // Sort triggered rules by priority (highest first)
    const sortedRules = ruleResult.rulesTriggered.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const action = rule.action;

      if (this.shouldExecuteAction(action, analysis, context)) {
        const executedAction = await this.executeAction(action, analysis, context);
        actionsTaken.push(executedAction);

        // Update final action based on rule priority
        if (rule.priority >= 90) {
          finalAction = executedAction.actionType as ModerationAction;
        }
      }
    }

    return {
      actionsTaken,
      actionTaken: finalAction,
      rulesApplied: sortedRules.length
    };
  }

  private shouldExecuteAction(action: AutoFilterActionDef, analysis: ModerationAnalysis, context?: FilterContext): boolean {
    switch (action.type) {
      case 'block':
        return this.config.autoBlockEnabled;
      case 'flag':
        return this.config.autoFlagEnabled;
      case 'quarantine':
        return this.config.autoQuarantineEnabled;
      case 'adjust_sensitivity':
        return this.config.learningEnabled;
      default:
        return true;
    }
  }

  private async executeAction(action: AutoFilterActionDef, analysis: ModerationAnalysis, context?: FilterContext): Promise<AutoFilterAction> {
    const executedAction: AutoFilterAction = {
      type: action.type,
      actionType: action.type,
      reason: action.reason,
      timestamp: new Date(),
      ruleId: action.ruleId,
      success: true
    };

    try {
      switch (action.type) {
        case 'block':
          // Execute block action
          executedAction.result = 'content_blocked';
          break;

        case 'flag':
          // Execute flag action
          executedAction.result = 'content_flagged';
          break;

        case 'quarantine':
          // Execute quarantine action
          executedAction.result = 'content_quarantined';
          break;

        case 'adjust_sensitivity':
          // Execute sensitivity adjustment
          this.adjustSensitivity(action.adjustment);
          executedAction.result = 'sensitivity_adjusted';
          break;

        default:
          executedAction.result = 'unknown_action';
          executedAction.success = false;
      }

    } catch (error) {
      executedAction.success = false;
      executedAction.error = error.message;
    }

    return executedAction;
  }

  private adjustSensitivity(adjustment: string): void {
    if (adjustment === 'increase') {
      this.config.sensitivity = this.config.sensitivity === 'low' ? 'medium' : 'high';
    } else if (adjustment === 'decrease') {
      this.config.sensitivity = this.config.sensitivity === 'high' ? 'medium' : 'low';
    }
  }

  private extractTextFromAnalysis(analysis: ModerationAnalysis): string | null {
    // Try to extract text content from analysis
    if (analysis.contentType === ModerationContentType.TEXT) {
      return analysis.metadata.originalContent as string || null;
    }

    // Look for text in evidence
    const textEvidence = analysis.flags
      .filter(flag => flag.evidence && typeof flag.evidence[0] === 'string')
      .flatMap(flag => flag.evidence)
      .join(' ');

    return textEvidence || null;
  }

  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  private createErrorAnalysis(content: any, type: ModerationContentType, error: any): ModerationAnalysis {
    return {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: type,
      category: ModerationCategory.CUSTOM,
      severity: ModerationSeverity.MEDIUM,
      confidence: { score: 0.3, confidence: 'low' },
      action: ModerationAction.REVIEW,
      status: 'error' as any,
      score: 0.5,
      flags: [{
        id: this.generateId(),
        type: 'system_error',
        category: ModerationCategory.CUSTOM,
        severity: ModerationSeverity.MEDIUM,
        message: 'Auto-filter system error',
        evidence: [error.message],
        confidence: { score: 0.5, confidence: 'medium' }
      }],
      suggestions: ['Manual review required due to system error'],
      metadata: {
        error: error.message,
        autoFilterError: true
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: 0
    };
  }

  private createBypassedResult(content: any, type: ModerationContentType, reason: string): AutoFilterResult {
    const analysis: ModerationAnalysis = {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: type,
      category: ModerationCategory.CUSTOM,
      severity: ModerationSeverity.LOW,
      confidence: { score: 1, confidence: 'high' },
      action: ModerationAction.ALLOW,
      status: 'bypassed' as any,
      score: 0,
      flags: [],
      suggestions: ['Auto-filter bypassed'],
      metadata: {
        bypassed: true,
        bypassReason: reason
      },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: 0
    };

    return {
      success: true,
      analysis,
      ruleResult: { rulesMatched: [], rulesTriggered: [] },
      actionResult: { actionsTaken: [], actionTaken: 'allow' },
      automaticActions: [],
      processingTime: 0,
      timestamp: new Date(),
      cached: false
    };
  }

  private generateId(): string {
    return `af_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Supporting Classes
// ==================

class ContentCache {
  private cache: Map<string, CachedResult> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number, ttl: number) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(content: any, type: ModerationContentType): CachedResult | null {
    const key = this.generateKey(content, type);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp.getTime() < this.ttl) {
      return cached;
    }

    this.cache.delete(key);
    return null;
  }

  set(content: any, type: ModerationContentType, result: CachedResult): void {
    const key = this.generateKey(content, type);

    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, result);
  }

  clear(): void {
    this.cache.clear();
  }

  private generateKey(content: any, type: ModerationContentType): string {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    return `${type}_${contentStr.length}_${Date.now()}`;
  }
}

class AutoFilterMetrics {
  private metrics: AutoFilterMetricsData = {
    totalProcessed: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    actionsTaken: {
      block: 0,
      flag: 0,
      quarantine: 0,
      allow: 0
    },
    processingTimes: [],
    topCategories: new Map(),
    startTime: Date.now()
  };

  recordFilter(result: AutoFilterResult): void {
    this.metrics.totalProcessed++;

    if (result.success) {
      const action = result.actionResult.actionTaken;
      this.metrics.actionsTaken[action]++;

      const category = result.analysis.category;
      const count = this.metrics.topCategories.get(category) || 0;
      this.metrics.topCategories.set(category, count + 1);
    }

    this.metrics.processingTimes.push(result.processingTime);

    // Keep only last 1000 processing times
    if (this.metrics.processingTimes.length > 1000) {
      this.metrics.processingTimes = this.metrics.processingTimes.slice(-1000);
    }
  }

  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  recordError(error: any): void {
    this.metrics.errors++;
  }

  getMetrics(): AutoFilterMetricsData {
    const processingTimes = this.metrics.processingTimes;
    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const topCategories = Array.from(this.metrics.topCategories.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      ...this.metrics,
      averageProcessingTime: avgProcessingTime,
      topCategories,
      uptime: Date.now() - this.metrics.startTime
    };
  }
}

// Type Definitions
// ================

export interface AutoFilterConfig {
  enabled: boolean;
  cacheEnabled: boolean;
  cacheSize: number;
  cacheTTL: number;
  autoBlockEnabled: boolean;
  autoFlagEnabled: boolean;
  autoQuarantineEnabled: boolean;
  learningEnabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
}

export interface AutoFilterRule {
  id?: string;
  name: string;
  description: string;
  condition: any;
  action: AutoFilterActionDef;
  priority: number;
  enabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AutoFilterActionDef {
  type: ModerationAction | 'adjust_sensitivity';
  reason: string;
  adjustment?: 'increase' | 'decrease';
  ruleId?: string;
}

export interface AutoFilterResult {
  success: boolean;
  analysis: ModerationAnalysis;
  ruleResult: AutoFilterRuleResult;
  actionResult: AutoFilterActionResult;
  automaticActions: AutoFilterAction[];
  processingTime: number;
  timestamp: Date;
  cached: boolean;
  error?: string;
}

export interface AutoFilterRuleResult {
  rulesMatched: AutoFilterRule[];
  rulesTriggered: AutoFilterRule[];
  highestPriority: number;
}

export interface AutoFilterActionResult {
  actionsTaken: AutoFilterAction[];
  actionTaken: ModerationAction;
  rulesApplied: number;
}

export interface AutoFilterAction {
  type: string;
  actionType: string;
  reason: string;
  timestamp: Date;
  ruleId?: string;
  result?: string;
  success: boolean;
  error?: string;
}

export interface FilterContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
  additionalData?: Record<string, any>;
}

export interface AutoFilterMetricsData {
  totalProcessed: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  actionsTaken: Record<string, number>;
  averageProcessingTime: number;
  processingTimes: number[];
  topCategories: Array<{ category: string; count: number }>;
  startTime: number;
  uptime: number;
}

interface CachedResult {
  success: boolean;
  analysis: ModerationAnalysis;
  actionResult: AutoFilterActionResult;
  automaticActions: AutoFilterAction[];
  processingTime: number;
  timestamp: Date;
}