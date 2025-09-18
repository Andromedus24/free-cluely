import { DataRecord, ConflictResolutionStrategy } from '../types/ConnectorTypes';
import { Conflict } from './SynchronizationEngine';

export interface ConflictResolutionRule {
  id: string;
  name: string;
  description: string;
  condition: ConflictCondition;
  action: ConflictResolutionAction;
  priority: number;
  isActive: boolean;
}

export interface ConflictCondition {
  field?: string;
  dataType?: string;
  recordType?: string;
  timeThreshold?: number; // milliseconds
  userRole?: string;
  customCondition?: (conflict: Conflict) => boolean;
}

export interface ConflictResolutionAction {
  type: 'use_local' | 'use_remote' | 'merge' | 'manual' | 'custom';
  mergeStrategy?: 'union' | 'intersection' | 'latest' | 'priority' | 'custom';
  customLogic?: (conflict: Conflict) => DataRecord;
  priorityFields?: string[];
}

export interface ConflictResolutionResult {
  success: boolean;
  resolvedRecord?: DataRecord;
  error?: string;
  resolutionApplied: string;
  timestamp: Date;
}

export class ConflictResolutionService {
  private rules: Map<string, ConflictResolutionRule> = new Map();
  private resolutionHistory: ConflictResolutionResult[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  // Rule management
  addRule(rule: ConflictResolutionRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  updateRule(ruleId: string, updates: Partial<ConflictResolutionRule>): void {
    const existing = this.rules.get(ruleId);
    if (existing) {
      this.rules.set(ruleId, { ...existing, ...updates });
    }
  }

  getRules(): ConflictResolutionRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.isActive);
  }

  getRule(ruleId: string): ConflictResolutionRule | undefined {
    return this.rules.get(ruleId);
  }

  // Resolution methods
  async resolveConflict(
    conflict: Conflict,
    strategy?: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult> {
    try {
      // First, try to find a matching rule
      const matchingRule = this.findMatchingRule(conflict);

      if (matchingRule) {
        return await this.applyRule(conflict, matchingRule);
      }

      // If no rule matches, use the provided strategy
      if (strategy) {
        return await this.applyStrategy(conflict, strategy);
      }

      // Default resolution: use remote
      return await this.applyStrategy(conflict, { type: 'use_remote' });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        resolutionApplied: 'none',
        timestamp: new Date()
      };
    }
  }

  async batchResolveConflicts(
    conflicts: Conflict[],
    strategy?: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult[]> {
    const results: ConflictResolutionResult[] = [];

    // Sort conflicts by priority and timestamp
    const sortedConflicts = conflicts.sort((a, b) => {
      // Prioritize conflicts with more recent changes
      const aTime = Math.max(
        a.localRecord?.updatedAt.getTime() || 0,
        a.remoteRecord?.updatedAt.getTime() || 0
      );
      const bTime = Math.max(
        b.localRecord?.updatedAt.getTime() || 0,
        b.remoteRecord?.updatedAt.getTime() || 0
      );
      return bTime - aTime;
    });

    // Process conflicts in batches to avoid overwhelming the system
    const batchSize = 50;
    for (let i = 0; i < sortedConflicts.length; i += batchSize) {
      const batch = sortedConflicts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(conflict => this.resolveConflict(conflict, strategy))
      );
      results.push(...batchResults);
    }

    return results;
  }

  // Advanced resolution strategies
  async smartResolveConflict(conflict: Conflict): Promise<ConflictResolutionResult> {
    // Analyze the conflict to determine the best resolution strategy
    const analysis = await this.analyzeConflict(conflict);

    // Apply the recommended strategy
    return await this.resolveConflict(conflict, analysis.recommendedStrategy);
  }

  private async analyzeConflict(conflict: Conflict): Promise<{
    severity: 'low' | 'medium' | 'high';
    recommendedStrategy: ConflictResolutionStrategy;
    reasoning: string;
  }> {
    const analysis = {
      severity: 'medium' as 'low' | 'medium' | 'high',
      recommendedStrategy: { type: 'manual' } as ConflictResolutionStrategy,
      reasoning: 'Default analysis'
    };

    // Analyze the type of conflict
    if (!conflict.localRecord) {
      analysis.severity = 'low';
      analysis.recommendedStrategy = { type: 'use_remote' };
      analysis.reasoning = 'Local record missing, using remote';
    } else if (!conflict.remoteRecord) {
      analysis.severity = 'low';
      analysis.recommendedStrategy = { type: 'use_local' };
      analysis.reasoning = 'Remote record missing, using local';
    } else {
      // Compare timestamps
      const localTime = conflict.localRecord.updatedAt.getTime();
      const remoteTime = conflict.remoteRecord.updatedAt.getTime();
      const timeDiff = Math.abs(localTime - remoteTime);

      if (timeDiff < 60000) { // Less than 1 minute
        analysis.severity = 'low';
        analysis.recommendedStrategy = { type: 'merge' };
        analysis.reasoning = 'Records modified within 1 minute, safe to merge';
      } else if (timeDiff < 300000) { // Less than 5 minutes
        analysis.severity = 'medium';
        analysis.recommendedStrategy = { type: 'use_remote' };
        analysis.reasoning = 'Records modified within 5 minutes, using newer remote';
      } else {
        analysis.severity = 'high';
        analysis.recommendedStrategy = { type: 'manual' };
        analysis.reasoning = 'Records modified more than 5 minutes apart, manual review needed';
      }
    }

    // Analyze data types and fields
    if (conflict.localRecord && conflict.remoteRecord) {
      const localData = conflict.localRecord.data;
      const remoteData = conflict.remoteRecord.data;

      const fieldConflicts = Object.keys({ ...localData, ...remoteData }).filter(key => {
        const localValue = JSON.stringify(localData[key]);
        const remoteValue = JSON.stringify(remoteData[key]);
        return localValue !== remoteValue;
      });

      if (fieldConflicts.length === 1) {
        analysis.severity = 'low';
        analysis.recommendedStrategy = fieldConflicts[0] === 'updated_at'
          ? { type: 'use_remote' }
          : { type: 'merge' };
        analysis.reasoning = 'Single field conflict, safe to merge';
      }
    }

    return analysis;
  }

  // Private helper methods
  private findMatchingRule(conflict: Conflict): ConflictResolutionRule | undefined {
    const activeRules = this.getRules().sort((a, b) => b.priority - a.priority);

    for (const rule of activeRules) {
      if (this.matchesRule(conflict, rule)) {
        return rule;
      }
    }

    return undefined;
  }

  private matchesRule(conflict: Conflict, rule: ConflictResolutionRule): boolean {
    const condition = rule.condition;

    // Check field-specific conditions
    if (condition.field && conflict.localRecord && conflict.remoteRecord) {
      const localData = conflict.localRecord.data;
      const remoteData = conflict.remoteRecord.data;

      if (!(condition.field in localData) || !(condition.field in remoteData)) {
        return false;
      }

      const localValue = JSON.stringify(localData[condition.field]);
      const remoteValue = JSON.stringify(remoteData[condition.field]);

      if (localValue === remoteValue) {
        return false; // No conflict in this field
      }
    }

    // Check data type conditions
    if (condition.dataType && conflict.localRecord) {
      if (conflict.localRecord.dataType !== condition.dataType) {
        return false;
      }
    }

    // Check time threshold
    if (condition.timeThreshold && conflict.localRecord && conflict.remoteRecord) {
      const localTime = conflict.localRecord.updatedAt.getTime();
      const remoteTime = conflict.remoteRecord.updatedAt.getTime();
      const timeDiff = Math.abs(localTime - remoteTime);

      if (timeDiff > condition.timeThreshold) {
        return false;
      }
    }

    // Check custom condition
    if (condition.customCondition) {
      try {
        return condition.customCondition(conflict);
      } catch (error) {
        console.error('Error in custom condition:', error);
        return false;
      }
    }

    return true;
  }

  private async applyRule(conflict: Conflict, rule: ConflictResolutionRule): Promise<ConflictResolutionResult> {
    try {
      const action = rule.action;

      switch (action.type) {
        case 'use_local':
          return this.applyUseLocal(conflict);
        case 'use_remote':
          return this.applyUseRemote(conflict);
        case 'merge':
          return this.applyMerge(conflict, action);
        case 'manual':
          return this.applyManual(conflict);
        case 'custom':
          return this.applyCustom(conflict, action);
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        resolutionApplied: 'rule_failed',
        timestamp: new Date()
      };
    }
  }

  private async applyStrategy(conflict: Conflict, strategy: ConflictResolutionStrategy): Promise<ConflictResolutionResult> {
    try {
      switch (strategy.type) {
        case 'use_local':
          return this.applyUseLocal(conflict);
        case 'use_remote':
          return this.applyUseRemote(conflict);
        case 'merge':
          return this.applyMerge(conflict, strategy);
        case 'manual':
          return this.applyManual(conflict);
        default:
          throw new Error(`Unknown strategy type: ${strategy.type}`);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        resolutionApplied: 'strategy_failed',
        timestamp: new Date()
      };
    }
  }

  private async applyUseLocal(conflict: Conflict): Promise<ConflictResolutionResult> {
    const result: ConflictResolutionResult = {
      success: true,
      resolvedRecord: conflict.localRecord,
      resolutionApplied: 'use_local',
      timestamp: new Date()
    };

    this.resolutionHistory.push(result);
    return result;
  }

  private async applyUseRemote(conflict: Conflict): Promise<ConflictResolutionResult> {
    const result: ConflictResolutionResult = {
      success: true,
      resolvedRecord: conflict.remoteRecord,
      resolutionApplied: 'use_remote',
      timestamp: new Date()
    };

    this.resolutionHistory.push(result);
    return result;
  }

  private async applyMerge(
    conflict: Conflict,
    strategy: ConflictResolutionStrategy | ConflictResolutionAction
  ): Promise<ConflictResolutionResult> {
    if (!conflict.localRecord || !conflict.remoteRecord) {
      throw new Error('Both local and remote records are required for merge');
    }

    const mergeStrategy = (strategy as any).mergeStrategy || 'union';
    const priorityFields = (strategy as any).priorityFields || [];

    let mergedData: Record<string, any>;

    switch (mergeStrategy) {
      case 'union':
        mergedData = this.mergeUnion(conflict.localRecord.data, conflict.remoteRecord.data);
        break;
      case 'intersection':
        mergedData = this.mergeIntersection(conflict.localRecord.data, conflict.remoteRecord.data);
        break;
      case 'latest':
        mergedData = this.mergeLatest(conflict.localRecord, conflict.remoteRecord, priorityFields);
        break;
      case 'priority':
        mergedData = this.mergePriority(conflict.localRecord.data, conflict.remoteRecord.data, priorityFields);
        break;
      default:
        throw new Error(`Unknown merge strategy: ${mergeStrategy}`);
    }

    const mergedRecord: DataRecord = {
      ...conflict.localRecord,
      data: mergedData,
      updatedAt: new Date(),
      version: conflict.localRecord.version + 1
    };

    const result: ConflictResolutionResult = {
      success: true,
      resolvedRecord: mergedRecord,
      resolutionApplied: `merge_${mergeStrategy}`,
      timestamp: new Date()
    };

    this.resolutionHistory.push(result);
    return result;
  }

  private async applyManual(conflict: Conflict): Promise<ConflictResolutionResult> {
    const result: ConflictResolutionResult = {
      success: true,
      resolutionApplied: 'manual',
      timestamp: new Date()
    };

    this.resolutionHistory.push(result);
    return result;
  }

  private async applyCustom(conflict: Conflict, action: ConflictResolutionAction): Promise<ConflictResolutionResult> {
    if (!action.customLogic) {
      throw new Error('Custom logic function is required for custom resolution');
    }

    try {
      const resolvedRecord = action.customLogic(conflict);

      const result: ConflictResolutionResult = {
        success: true,
        resolvedRecord,
        resolutionApplied: 'custom',
        timestamp: new Date()
      };

      this.resolutionHistory.push(result);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Custom logic failed',
        resolutionApplied: 'custom_failed',
        timestamp: new Date()
      };
    }
  }

  // Merge strategies
  private mergeUnion(local: Record<string, any>, remote: Record<string, any>): Record<string, any> {
    return { ...local, ...remote };
  }

  private mergeIntersection(local: Record<string, any>, remote: Record<string, any>): Record<string, any> {
    const merged: Record<string, any> = {};

    Object.keys(local).forEach(key => {
      if (key in remote && JSON.stringify(local[key]) === JSON.stringify(remote[key])) {
        merged[key] = local[key];
      }
    });

    return merged;
  }

  private mergeLatest(local: DataRecord, remote: DataRecord, priorityFields: string[]): Record<string, any> {
    const merged: Record<string, any> = {};
    const localTime = local.updatedAt.getTime();
    const remoteTime = remote.updatedAt.getTime();

    Object.keys({ ...local.data, ...remote.data }).forEach(key => {
      if (priorityFields.includes(key)) {
        // Priority fields always come from the newer record
        merged[key] = localTime > remoteTime ? local.data[key] : remote.data[key];
      } else {
        // For non-priority fields, merge if different
        const localValue = JSON.stringify(local.data[key]);
        const remoteValue = JSON.stringify(remote.data[key]);

        if (localValue === remoteValue) {
          merged[key] = local.data[key];
        } else if (localTime > remoteTime) {
          merged[key] = local.data[key];
        } else {
          merged[key] = remote.data[key];
        }
      }
    });

    return merged;
  }

  private mergePriority(local: Record<string, any>, remote: Record<string, any>, priorityFields: string[]): Record<string, any> {
    const merged: Record<string, any> = { ...remote };

    priorityFields.forEach(field => {
      if (field in local) {
        merged[field] = local[field];
      }
    });

    return merged;
  }

  private initializeDefaultRules(): void {
    // Default conflict resolution rules
    const defaultRules: ConflictResolutionRule[] = [
      {
        id: 'rule_auto_merge_simple',
        name: 'Auto-merge simple conflicts',
        description: 'Automatically merge conflicts involving only non-critical fields',
        condition: {
          customCondition: (conflict: Conflict) => {
            if (!conflict.localRecord || !conflict.remoteRecord) return false;

            const criticalFields = ['id', 'created_at', 'status', 'amount'];
            const localData = conflict.localRecord.data;
            const remoteData = conflict.remoteRecord.data;

            const conflictFields = Object.keys({ ...localData, ...remoteData }).filter(key => {
              const localValue = JSON.stringify(localData[key]);
              const remoteValue = JSON.stringify(remoteData[key]);
              return localValue !== remoteValue;
            });

            return !conflictFields.some(field => criticalFields.includes(field));
          }
        },
        action: {
          type: 'merge',
          mergeStrategy: 'union'
        },
        priority: 100,
        isActive: true
      },
      {
        id: 'rule_prefer_recent',
        name: 'Prefer recent changes',
        description: 'Use the most recently modified version for conflicts within 5 minutes',
        condition: {
          timeThreshold: 300000 // 5 minutes
        },
        action: {
          type: 'merge',
          mergeStrategy: 'latest'
        },
        priority: 90,
        isActive: true
      },
      {
        id: 'rule_manual_complex',
        name: 'Manual resolution for complex conflicts',
        description: 'Require manual resolution for complex conflicts with multiple field changes',
        condition: {
          customCondition: (conflict: Conflict) => {
            if (!conflict.localRecord || !conflict.remoteRecord) return false;

            const localData = conflict.localRecord.data;
            const remoteData = conflict.remoteRecord.data;

            const conflictFields = Object.keys({ ...localData, ...remoteData }).filter(key => {
              const localValue = JSON.stringify(localData[key]);
              const remoteValue = JSON.stringify(remoteData[key]);
              return localValue !== remoteValue;
            });

            return conflictFields.length > 3;
          }
        },
        action: {
          type: 'manual'
        },
        priority: 10,
        isActive: true
      }
    ];

    defaultRules.forEach(rule => this.addRule(rule));
  }

  // Analytics and reporting
  getResolutionStatistics(): {
    totalResolutions: number;
    successRate: number;
    averageResolutionTime: number;
    mostUsedStrategy: string;
    resolutionByType: Record<string, number>;
  } {
    const totalResolutions = this.resolutionHistory.length;
    const successfulResolutions = this.resolutionHistory.filter(r => r.success).length;
    const successRate = totalResolutions > 0 ? (successfulResolutions / totalResolutions) * 100 : 0;

    const resolutionTimes = this.resolutionHistory.map(r => r.timestamp.getTime()).sort((a, b) => a - b);
    const averageResolutionTime = resolutionTimes.length > 1
      ? (resolutionTimes[resolutionTimes.length - 1] - resolutionTimes[0]) / resolutionTimes.length
      : 0;

    const strategyCount = this.resolutionHistory.reduce((acc, r) => {
      acc[r.resolutionApplied] = (acc[r.resolutionApplied] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedStrategy = Object.entries(strategyCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalResolutions,
      successRate,
      averageResolutionTime,
      mostUsedStrategy,
      resolutionByType: strategyCount
    };
  }

  clearHistory(): void {
    this.resolutionHistory = [];
  }

  exportRules(): ConflictResolutionRule[] {
    return this.getRules();
  }

  importRules(rules: ConflictResolutionRule[]): void {
    rules.forEach(rule => this.addRule(rule));
  }
}