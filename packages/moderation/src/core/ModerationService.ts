import { EventEmitter } from 'events';
import {
  IModerationService,
  IModerationEngine,
  IModerationAIProvider,
  IModerationStorage,
  IModerationNotifier,
  IModerationAudit,
  ModerationAnalysis,
  ModerationPolicy,
  ModerationRule,
  ModerationQueueItem,
  ModerationDecision,
  UserReport,
  ModerationAppeal,
  ModerationStats,
  ModerationEvent,
  ModerationConfig,
  ModerationFilters,
  ModerationContentType,
  ModerationAction,
  ModerationStatus,
  ModerationPriority,
  ModerationCategory,
  ModerationSeverity
} from '../types/ModerationTypes';

/**
 * Core Moderation Service
 * Provides comprehensive content moderation capabilities
 */
export class ModerationService extends EventEmitter implements IModerationService {
  private engine: IModerationEngine;
  private storage: IModerationStorage;
  private notifier: IModerationNotifier;
  private audit: IModerationAudit;
  private aiProviders: Map<string, IModerationAIProvider> = new Map();
  private config: ModerationConfig;
  private policies: Map<string, ModerationPolicy> = new Map();
  private rules: Map<string, ModerationRule> = new Map();
  private queue: ModerationQueueItem[] = [];
  private isProcessing = false;

  constructor(
    engine: IModerationEngine,
    storage: IModerationStorage,
    notifier: IModerationNotifier,
    audit: IModerationAudit,
    config: ModerationConfig
  ) {
    super();
    this.engine = engine;
    this.storage = storage;
    this.notifier = notifier;
    this.audit = audit;
    this.config = config;

    this.startProcessing();
  }

  // Content Analysis Methods
  // ========================

  async analyzeContent(content: any, type: ModerationContentType): Promise<ModerationAnalysis> {
    if (!this.config.enabled) {
      return this.createSafeAnalysis(content, type);
    }

    try {
      const startTime = Date.now();

      // Get active policies and rules
      const activeRules = await this.getActiveRules();

      // Process content through engine
      const analysis = await this.engine.processContent(content, type);

      // Apply rules
      const ruleBasedAnalysis = await this.engine.applyRules(content, activeRules);

      // Merge analyses
      const mergedAnalysis = this.mergeAnalyses(analysis, ruleBasedAnalysis);

      // Calculate final score and action
      mergedAnalysis.score = this.engine.calculateScore(mergedAnalysis);
      mergedAnalysis.action = this.engine.determineAction(mergedAnalysis);
      mergedAnalysis.processingTime = Date.now() - startTime;
      mergedAnalysis.processedAt = new Date();

      // Save analysis
      await this.storage.saveAnalysis(mergedAnalysis);

      // Log event
      await this.logEvent('analysis_completed', {
        contentId: mergedAnalysis.contentId,
        contentType: type,
        analysisId: mergedAnalysis.id,
        score: mergedAnalysis.score,
        action: mergedAnalysis.action,
        processingTime: mergedAnalysis.processingTime
      });

      // Handle action
      await this.handleAnalysisAction(mergedAnalysis);

      this.emit('analysis_completed', mergedAnalysis);
      return mergedAnalysis;

    } catch (error) {
      this.emit('analysis_error', { error, content, type });
      throw new Error(`Content analysis failed: ${error.message}`);
    }
  }

  async analyzeText(text: string): Promise<ModerationAnalysis> {
    return this.analyzeContent(text, ModerationContentType.TEXT);
  }

  async analyzeImage(imageData: Buffer | string): Promise<ModerationAnalysis> {
    return this.analyzeContent(imageData, ModerationContentType.IMAGE);
  }

  // Policy Management Methods
  // =========================

  async createPolicy(policy: Omit<ModerationPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationPolicy> {
    const newPolicy: ModerationPolicy = {
      ...policy,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.policies.set(newPolicy.id, newPolicy);

    await this.audit.logAction('policy_created', {
      policyId: newPolicy.id,
      name: newPolicy.name,
      rulesCount: newPolicy.rules.length
    });

    this.emit('policy_created', newPolicy);
    return newPolicy;
  }

  async updatePolicy(id: string, policy: Partial<ModerationPolicy>): Promise<ModerationPolicy> {
    const existing = this.policies.get(id);
    if (!existing) {
      throw new Error(`Policy not found: ${id}`);
    }

    const updated: ModerationPolicy = {
      ...existing,
      ...policy,
      updatedAt: new Date()
    };

    this.policies.set(id, updated);

    await this.audit.logAction('policy_updated', {
      policyId: id,
      changes: policy
    });

    this.emit('policy_updated', updated);
    return updated;
  }

  async deletePolicy(id: string): Promise<void> {
    const policy = this.policies.get(id);
    if (!policy) {
      throw new Error(`Policy not found: ${id}`);
    }

    this.policies.delete(id);

    await this.audit.logAction('policy_deleted', {
      policyId: id,
      name: policy.name
    });

    this.emit('policy_deleted', { id });
  }

  async getPolicy(id: string): Promise<ModerationPolicy> {
    const policy = this.policies.get(id);
    if (!policy) {
      throw new Error(`Policy not found: ${id}`);
    }
    return policy;
  }

  async listPolicies(): Promise<ModerationPolicy[]> {
    return Array.from(this.policies.values());
  }

  // Rule Management Methods
  // =======================

  async createRule(rule: Omit<ModerationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModerationRule> {
    const newRule: ModerationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(newRule.id, newRule);

    await this.audit.logAction('rule_created', {
      ruleId: newRule.id,
      name: newRule.name,
      category: newRule.category
    });

    this.emit('rule_created', newRule);
    return newRule;
  }

  async updateRule(id: string, rule: Partial<ModerationRule>): Promise<ModerationRule> {
    const existing = this.rules.get(id);
    if (!existing) {
      throw new Error(`Rule not found: ${id}`);
    }

    const updated: ModerationRule = {
      ...existing,
      ...rule,
      updatedAt: new Date()
    };

    this.rules.set(id, updated);

    await this.audit.logAction('rule_updated', {
      ruleId: id,
      changes: rule
    });

    this.emit('rule_updated', updated);
    return updated;
  }

  async deleteRule(id: string): Promise<void> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule not found: ${id}`);
    }

    this.rules.delete(id);

    await this.audit.logAction('rule_deleted', {
      ruleId: id,
      name: rule.name
    });

    this.emit('rule_deleted', { id });
  }

  async getRule(id: string): Promise<ModerationRule> {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule not found: ${id}`);
    }
    return rule;
  }

  async listRules(filters?: ModerationFilters): Promise<ModerationRule[]> {
    let rules = Array.from(this.rules.values());

    if (filters) {
      rules = this.filterRules(rules, filters);
    }

    return rules;
  }

  // Queue Management Methods
  // ========================

  async getQueue(filters?: ModerationFilters): Promise<ModerationQueueItem[]> {
    let queue = [...this.queue];

    if (filters) {
      queue = this.filterQueueItems(queue, filters);
    }

    return queue;
  }

  async assignToModerator(queueItemId: string, moderatorId: string): Promise<void> {
    const item = this.queue.find(item => item.id === queueItemId);
    if (!item) {
      throw new Error(`Queue item not found: ${queueItemId}`);
    }

    item.assignedTo = moderatorId;
    item.assignedAt = new Date();
    item.status = ModerationStatus.REVIEWING;

    await this.audit.logAction('queue_assigned', {
      queueItemId,
      moderatorId,
      contentId: item.contentId
    });

    this.emit('queue_assigned', { item, moderatorId });
  }

  async escalateItem(queueItemId: string, reason: string): Promise<void> {
    const item = this.queue.find(item => item.id === queueItemId);
    if (!item) {
      throw new Error(`Queue item not found: ${queueItemId}`);
    }

    item.escalated = true;
    item.escalationLevel = (item.escalationLevel || 0) + 1;
    item.priority = this.escalatePriority(item.priority);

    await this.audit.logAction('queue_escalated', {
      queueItemId,
      reason,
      escalationLevel: item.escalationLevel
    });

    await this.notifier.notifyEscalation(item);
    this.emit('queue_escalated', { item, reason });
  }

  // Decision Making Methods
  // =======================

  async makeDecision(decision: Omit<ModerationDecision, 'id' | 'createdAt'>): Promise<ModerationDecision> {
    const newDecision: ModerationDecision = {
      ...decision,
      id: this.generateId(),
      createdAt: new Date()
    };

    await this.storage.saveDecision(newDecision);

    // Remove from queue
    this.queue = this.queue.filter(item => item.contentId !== newDecision.contentId);

    await this.audit.logAction('decision_made', {
      decisionId: newDecision.id,
      contentId: newDecision.contentId,
      moderatorId: newDecision.moderatorId,
      action: newDecision.action
    });

    await this.notifier.notifyResolution(newDecision);
    this.emit('decision_made', newDecision);

    return newDecision;
  }

  async getDecision(id: string): Promise<ModerationDecision> {
    return this.storage.getDecision(id);
  }

  async listDecisions(filters?: ModerationFilters): Promise<ModerationDecision[]> {
    // Implementation would filter decisions from storage
    return [];
  }

  // Reports and Appeals Methods
  // ===========================

  async createReport(report: Omit<UserReport, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<UserReport> {
    const newReport: UserReport = {
      ...report,
      id: this.generateId(),
      status: ModerationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storage.saveReport(newReport);

    // Add to queue if needs review
    if (this.config.humanReviewRequired) {
      await this.addToQueue(newReport);
    }

    await this.audit.logAction('report_created', {
      reportId: newReport.id,
      contentId: newReport.contentId,
      reporterId: newReport.reporterId
    });

    await this.notifier.notifyReport(newReport);
    this.emit('report_created', newReport);

    return newReport;
  }

  async updateReport(id: string, report: Partial<UserReport>): Promise<UserReport> {
    const existing = await this.storage.getReport(id);
    const updated: UserReport = {
      ...existing,
      ...report,
      updatedAt: new Date()
    };

    await this.storage.saveReport(updated);

    await this.audit.logAction('report_updated', {
      reportId: id,
      changes: report
    });

    this.emit('report_updated', updated);
    return updated;
  }

  async getReport(id: string): Promise<UserReport> {
    return this.storage.getReport(id);
  }

  async listReports(filters?: ModerationFilters): Promise<UserReport[]> {
    // Implementation would filter reports from storage
    return [];
  }

  async createAppeal(appeal: Omit<ModerationAppeal, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ModerationAppeal> {
    const newAppeal: ModerationAppeal = {
      ...appeal,
      id: this.generateId(),
      status: ModerationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storage.saveAppeal(newAppeal);

    await this.audit.logAction('appeal_created', {
      appealId: newAppeal.id,
      decisionId: newAppeal.decisionId,
      appellantId: newAppeal.appellantId
    });

    await this.notifier.notifyAppeal(newAppeal);
    this.emit('appeal_created', newAppeal);

    return newAppeal;
  }

  async updateAppeal(id: string, appeal: Partial<ModerationAppeal>): Promise<ModerationAppeal> {
    const existing = await this.storage.getAppeal(id);
    const updated: ModerationAppeal = {
      ...existing,
      ...appeal,
      updatedAt: new Date()
    };

    await this.storage.saveAppeal(updated);

    await this.audit.logAction('appeal_updated', {
      appealId: id,
      changes: appeal
    });

    this.emit('appeal_updated', updated);
    return updated;
  }

  async getAppeal(id: string): Promise<ModerationAppeal> {
    return this.storage.getAppeal(id);
  }

  async listAppeals(filters?: ModerationFilters): Promise<ModerationAppeal[]> {
    // Implementation would filter appeals from storage
    return [];
  }

  // Analytics Methods
  // =================

  async getStats(timeRange?: { start: Date; end: Date }): Promise<ModerationStats> {
    return this.storage.getStats(timeRange || {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      end: new Date()
    });
  }

  async getEvents(filters?: ModerationFilters): Promise<ModerationEvent[]> {
    return this.storage.getEvents(filters || {});
  }

  // Configuration Methods
  // ====================

  async getConfig(): Promise<ModerationConfig> {
    return { ...this.config };
  }

  async updateConfig(config: Partial<ModerationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };

    await this.audit.logAction('config_updated', {
      changes: config
    });

    this.emit('config_updated', this.config);
  }

  // AI Provider Management
  // ======================

  addAIProvider(name: string, provider: IModerationAIProvider): void {
    this.aiProviders.set(name, provider);
    this.emit('ai_provider_added', { name, provider });
  }

  removeAIProvider(name: string): void {
    this.aiProviders.delete(name);
    this.emit('ai_provider_removed', { name });
  }

  // Private Helper Methods
  // =====================

  private async getActiveRules(): Promise<ModerationRule[]> {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  private createSafeAnalysis(content: any, type: ModerationContentType): ModerationAnalysis {
    return {
      id: this.generateId(),
      contentId: this.generateId(),
      contentType: type,
      category: ModerationCategory.CUSTOM,
      severity: ModerationSeverity.LOW,
      confidence: { score: 1, confidence: 'high' },
      action: ModerationAction.ALLOW,
      status: ModerationStatus.APPROVED,
      score: 0,
      flags: [],
      suggestions: [],
      metadata: { safe: true },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: 0
    };
  }

  private mergeAnalyses(analysis1: ModerationAnalysis, analysis2: ModerationAnalysis): ModerationAnalysis {
    // Merge flags and take the highest severity
    const mergedFlags = [...analysis1.flags, ...analysis2.flags];
    const highestSeverity = this.getHighestSeverity([...analysis1.flags, ...analysis2.flags]);

    return {
      ...analysis1,
      flags: mergedFlags,
      severity: highestSeverity,
      category: this.determineDominantCategory(mergedFlags)
    };
  }

  private getHighestSeverity(flags: any[]): ModerationSeverity {
    // Implementation would find highest severity from flags
    return ModerationSeverity.LOW;
  }

  private determineDominantCategory(flags: any[]): ModerationCategory {
    // Implementation would determine dominant category from flags
    return ModerationCategory.CUSTOM;
  }

  private async handleAnalysisAction(analysis: ModerationAnalysis): Promise<void> {
    switch (analysis.action) {
      case ModerationAction.FLAG:
        await this.notifier.notifyFlag(analysis);
        if (this.config.humanReviewRequired) {
          await this.addToQueue(analysis);
        }
        break;
      case ModerationAction.REVIEW:
        await this.addToQueue(analysis);
        break;
      case ModerationAction.BLOCK:
      case ModerationAction.REMOVE:
        // Handle blocking/removal actions
        break;
    }
  }

  private async addToQueue(analysis: ModerationAnalysis): Promise<void> {
    const queueItem: ModerationQueueItem = {
      id: this.generateId(),
      contentId: analysis.contentId,
      contentType: analysis.contentType,
      analysis,
      priority: this.determinePriority(analysis),
      status: ModerationStatus.PENDING,
      createdAt: new Date()
    };

    this.queue.push(queueItem);
    this.queue.sort((a, b) => this.comparePriority(b.priority, a.priority));

    this.emit('queue_item_added', queueItem);
  }

  private async addToQueue(report: UserReport): Promise<void> {
    const queueItem: ModerationQueueItem = {
      id: this.generateId(),
      contentId: report.contentId,
      contentType: report.contentType,
      analysis: await this.createAnalysisFromReport(report),
      report,
      priority: report.priority,
      status: ModerationStatus.PENDING,
      createdAt: new Date()
    };

    this.queue.push(queueItem);
    this.queue.sort((a, b) => this.comparePriority(b.priority, a.priority));

    this.emit('queue_item_added', queueItem);
  }

  private async createAnalysisFromReport(report: UserReport): Promise<ModerationAnalysis> {
    return {
      id: this.generateId(),
      contentId: report.contentId,
      contentType: report.contentType,
      category: report.category,
      severity: report.severity,
      confidence: { score: 0.8, confidence: 'medium' },
      action: ModerationAction.REVIEW,
      status: ModerationStatus.PENDING,
      score: 0.7,
      flags: [{
        id: this.generateId(),
        type: 'user_report',
        category: report.category,
        severity: report.severity,
        message: report.description,
        evidence: report.evidence,
        confidence: { score: 0.8, confidence: 'medium' }
      }],
      suggestions: ['Review user report'],
      metadata: { reportId: report.id },
      createdAt: new Date(),
      processedAt: new Date(),
      processingTime: 0
    };
  }

  private determinePriority(analysis: ModerationAnalysis): ModerationPriority {
    if (analysis.severity === ModerationSeverity.CRITICAL) {
      return ModerationPriority.URGENT;
    } else if (analysis.severity === ModerationSeverity.HIGH) {
      return ModerationPriority.HIGH;
    } else if (analysis.score > 0.7) {
      return ModerationPriority.NORMAL;
    } else {
      return ModerationPriority.LOW;
    }
  }

  private escalatePriority(priority: ModerationPriority): ModerationPriority {
    const escalationMap: Record<ModerationPriority, ModerationPriority> = {
      [ModerationPriority.LOW]: ModerationPriority.NORMAL,
      [ModerationPriority.NORMAL]: ModerationPriority.HIGH,
      [ModerationPriority.HIGH]: ModerationPriority.URGENT,
      [ModerationPriority.URGENT]: ModerationPriority.URGENT
    };

    return escalationMap[priority];
  }

  private comparePriority(a: ModerationPriority, b: ModerationPriority): number {
    const priorityOrder = {
      [ModerationPriority.URGENT]: 4,
      [ModerationPriority.HIGH]: 3,
      [ModerationPriority.NORMAL]: 2,
      [ModerationPriority.LOW]: 1
    };

    return priorityOrder[a] - priorityOrder[b];
  }

  private filterRules(rules: ModerationRule[], filters: ModerationFilters): ModerationRule[] {
    return rules.filter(rule => {
      if (filters.categories && !filters.categories.includes(rule.category)) return false;
      if (filters.severities && !filters.severities.includes(rule.severity)) return false;
      if (filters.actions && !filters.actions.includes(rule.action)) return false;
      return true;
    });
  }

  private filterQueueItems(items: ModerationQueueItem[], filters: ModerationFilters): ModerationQueueItem[] {
    return items.filter(item => {
      if (filters.contentTypes && !filters.contentTypes.includes(item.contentType)) return false;
      if (filters.statuses && !filters.statuses.includes(item.status)) return false;
      if (filters.priorities && !filters.priorities.includes(item.priority)) return false;
      return true;
    });
  }

  private async logEvent(type: ModerationEvent['type'], data: Record<string, any>): Promise<void> {
    const event: ModerationEvent = {
      id: this.generateId(),
      type,
      contentId: data.contentId,
      contentType: data.contentType,
      userId: data.userId,
      data,
      timestamp: new Date(),
      severity: data.severity,
      category: data.category
    };

    await this.storage.saveEvent(event);
  }

  private startProcessing(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.isProcessing && this.queue.length > 0) {
      const item = this.queue[0];

      if (item.status === ModerationStatus.PENDING && this.config.autoModeration) {
        // Auto-process if configured
        try {
          await this.processQueueItem(item);
        } catch (error) {
          this.emit('queue_processing_error', { item, error });
        }
      }

      // Remove processed items
      this.queue = this.queue.filter(i => i.id !== item.id);

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.queue.length === 0) {
      this.isProcessing = false;
    } else {
      // Continue processing
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  private async processQueueItem(item: ModerationQueueItem): Promise<void> {
    // Implementation would process queue item based on configuration
    // This could include auto-moderation, escalation, etc.
  }

  private generateId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event handlers for cleanup
  public destroy(): void {
    this.isProcessing = false;
    this.removeAllListeners();
    this.aiProviders.clear();
    this.policies.clear();
    this.rules.clear();
    this.queue.length = 0;
  }
}