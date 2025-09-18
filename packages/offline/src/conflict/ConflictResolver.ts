// Conflict Resolution Service
// =========================

import { EventEmitter } from 'events';
import { IConflictResolver, Conflict, ConflictResolution, ConflictResolutionStrategy } from '../types';
import { IStorageService } from '../storage/StorageService';

/**
 * Conflict Resolver Configuration
 */
export interface ConflictResolverConfig {
  autoResolve: boolean;
  defaultStrategy: ConflictResolutionStrategy;
  enableMergeStrategies: boolean;
  enableVersionTracking: boolean;
  enableConflictLogging: boolean;
  maxConflictHistory: number;
  conflictTimeout: number;
  enableUserPreferences: boolean;
  enableContextAwareResolution: boolean;
  enableMachineLearning: boolean;
  mlConfidenceThreshold: number;
  enableAuditTrail: boolean;
}

/**
 * Merge Strategy
 */
export interface MergeStrategy {
  name: string;
  description: string;
  applicableTo: string[];
  mergeFn: (local: any, server: any, conflict: Conflict) => any;
  confidence: (local: any, server: any, conflict: Conflict) => number;
}

/**
 * Conflict Context
 */
export interface ConflictContext {
  entityType: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  networkConditions?: {
    online: boolean;
    latency: number;
    bandwidth: string;
  };
  deviceInfo?: {
    platform: string;
    version: string;
    type: string;
  };
  userPreferences?: Record<string, any>;
  historicalResolutions?: ConflictResolution[];
}

/**
 * Conflict Resolver Implementation
 */
export class ConflictResolver extends EventEmitter implements IConflictResolver {
  private config: ConflictResolverConfig;
  private storage: IStorageService;
  private conflicts: Map<string, Conflict> = new Map();
  private resolutionHistory: ConflictResolution[] = [];
  private mergeStrategies: Map<string, MergeStrategy> = new Map();
  private userPreferences: Map<string, any> = new Map();
  private isInitialized = false;

  constructor(config: ConflictResolverConfig, storage: IStorageService) {
    super();
    this.config = config;
    this.storage = storage;
    this.initializeMergeStrategies();
  }

  /**
   * Initialize conflict resolver
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load existing conflicts
      await this.loadConflicts();

      // Load resolution history
      await this.loadResolutionHistory();

      // Load user preferences
      if (this.config.enableUserPreferences) {
        await this.loadUserPreferences();
      }

      this.isInitialized = true;
      this.emit('initialized');

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize merge strategies
   */
  private initializeMergeStrategies(): void {
    // Timestamp-based merge
    this.mergeStrategies.set('timestamp_wins', {
      name: 'Timestamp Wins',
      description: 'Use the most recently modified version',
      applicableTo: ['document', 'note', 'task', 'message'],
      mergeFn: (local, server, conflict) => {
        const localTimestamp = new Date(local.timestamp || local.updatedAt).getTime();
        const serverTimestamp = new Date(server.timestamp || server.updatedAt).getTime();
        return localTimestamp > serverTimestamp ? local : server;
      },
      confidence: (local, server, conflict) => {
        const localTimestamp = new Date(local.timestamp || local.updatedAt).getTime();
        const serverTimestamp = new Date(server.timestamp || server.updatedAt).getTime();
        const timeDiff = Math.abs(localTimestamp - serverTimestamp);
        return timeDiff > 60000 ? 0.9 : 0.6; // High confidence if difference > 1 minute
      }
    });

    // Field-level merge
    this.mergeStrategies.set('field_level_merge', {
      name: 'Field Level Merge',
      description: 'Merge changes at the field level',
      applicableTo: ['document', 'settings', 'profile', 'configuration'],
      mergeFn: (local, server, conflict) => {
        return this.mergeObjects(local, server, conflict);
      },
      confidence: (local, server, conflict) => {
        const fieldConflicts = this.identifyFieldConflicts(local, server);
        return fieldConflicts.length === 0 ? 0.9 : 0.5;
      }
    });

    // Priority-based merge
    this.mergeStrategies.set('priority_merge', {
      name: 'Priority Merge',
      description: 'Merge based on field priorities',
      applicableTo: ['task', 'reminder', 'schedule', 'priority_list'],
      mergeFn: (local, server, conflict) => {
        return this.mergeByPriority(local, server, conflict);
      },
      confidence: (local, server, conflict) => {
        return this.hasPriorityFields(local) || this.hasPriorityFields(server) ? 0.8 : 0.3;
      }
    });

    // Concatenation merge
    this.mergeStrategies.set('concatenation_merge', {
      name: 'Concatenation Merge',
      description: 'Concatenate compatible fields',
      applicableTo: ['list', 'array', 'tags', 'comments'],
      mergeFn: (local, server, conflict) => {
        return this.mergeByConcatenation(local, server, conflict);
      },
      confidence: (local, server, conflict) => {
        return this.hasConcatenableFields(local, server) ? 0.7 : 0.2;
      }
    });

    // Smart merge (ML-based)
    this.mergeStrategies.set('smart_merge', {
      name: 'Smart Merge',
      description: 'Intelligent merge using context and patterns',
      applicableTo: ['document', 'message', 'content'],
      mergeFn: (local, server, conflict) => {
        return this.smartMerge(local, server, conflict);
      },
      confidence: (local, server, conflict) => {
        return this.calculateMergeConfidence(local, server, conflict);
      }
    });

    // Union merge
    this.mergeStrategies.set('union_merge', {
      name: 'Union Merge',
      description: 'Take the union of both versions',
      applicableTo: ['set', 'collection', 'tags', 'permissions'],
      mergeFn: (local, server, conflict) => {
        return this.mergeByUnion(local, server, conflict);
      },
      confidence: (local, server, conflict) => {
        return this.hasSetFields(local, server) ? 0.8 : 0.3;
      }
    });
  }

  /**
   * Detect conflicts in operations
   */
  async detectConflicts(operations: any[]): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    for (const operation of operations) {
      try {
        const conflict = await this.detectConflict(operation);
        if (conflict) {
          conflicts.push(conflict);
          this.conflicts.set(conflict.id, conflict);
        }
      } catch (error) {
        this.emit('conflictDetectionError', { operation, error });
      }
    }

    if (conflicts.length > 0) {
      await this.saveConflicts();
      this.emit('conflictsDetected', conflicts);
    }

    return conflicts;
  }

  /**
   * Detect individual conflict
   */
  private async detectConflict(operation: any): Promise<Conflict | null> {
    try {
      // Get server version
      const serverData = await this.fetchServerData(operation.entity, operation.entityId);

      if (!serverData) {
        return null; // No server data, no conflict
      }

      // Check if conflict exists
      if (this.hasConflict(operation.data, serverData)) {
        const context = await this.buildConflictContext(operation, serverData);
        const severity = this.assessConflictSeverity(operation.data, serverData, context);

        return {
          id: `conflict_${operation.entityId}_${Date.now()}`,
          operation: {
            ...operation,
            timestamp: new Date(operation.timestamp)
          },
          serverData,
          localData: operation.data,
          conflictType: operation.type,
          detectedAt: new Date(),
          severity,
          description: this.generateConflictDescription(operation.data, serverData, operation.type),
          suggestions: this.generateConflictSuggestions(operation.data, serverData, context)
        };
      }

      return null;

    } catch (error) {
      this.emit('conflictDetectionError', { operation, error });
      return null;
    }
  }

  /**
   * Check if conflict exists between local and server data
   */
  private hasConflict(localData: any, serverData: any): boolean {
    if (!localData || !serverData) return false;

    // Check timestamps
    const localTimestamp = new Date(localData.timestamp || localData.updatedAt || Date.now()).getTime();
    const serverTimestamp = new Date(serverData.timestamp || serverData.updatedAt || Date.now()).getTime();

    // If server was modified after local was created, potential conflict
    if (serverTimestamp > localTimestamp) {
      return this.hasMeaningfulChanges(localData, serverData);
    }

    return false;
  }

  /**
   * Check if there are meaningful changes between versions
   */
  private hasMeaningfulChanges(localData: any, serverData: any): boolean {
    // Simple comparison - in practice, this would be more sophisticated
    const localJson = JSON.stringify(localData, this.jsonStringifyReplacer);
    const serverJson = JSON.stringify(serverData, this.jsonStringifyReplacer);

    return localJson !== serverJson;
  }

  /**
   * JSON stringify replacer to handle special cases
   */
  private jsonStringifyReplacer(key: string, value: any): any {
    // Skip timestamps and metadata fields
    if (key === 'timestamp' || key === 'updatedAt' || key === 'id' || key === 'version') {
      return undefined;
    }
    return value;
  }

  /**
   * Fetch server data for conflict detection
   */
  private async fetchServerData(entity: string, entityId: string): Promise<any> {
    try {
      // In a real implementation, this would make an API call
      // For now, return null to simulate no conflict
      return null;
    } catch (error) {
      this.emit('fetchServerError', { entity, entityId, error });
      return null;
    }
  }

  /**
   * Build conflict context
   */
  private async buildConflictContext(operation: any, serverData: any): Promise<ConflictContext> {
    const context: ConflictContext = {
      entityType: operation.entity,
      operation: operation.type,
      timestamp: new Date(),
      userId: operation.userId,
      sessionId: operation.sessionId,
      networkConditions: {
        online: navigator.onLine,
        latency: this.measureLatency(),
        bandwidth: this.getBandwidthEstimate()
      },
      deviceInfo: {
        platform: navigator.platform,
        version: navigator.userAgent,
        type: this.getDeviceType()
      }
    };

    // Add user preferences if enabled
    if (this.config.enableUserPreferences) {
      context.userPreferences = this.getUserPreferences(operation.entity);
    }

    // Add historical resolutions
    if (this.config.enableContextAwareResolution) {
      context.historicalResolutions = this.getHistoricalResolutions(operation.entity);
    }

    return context;
  }

  /**
   * Assess conflict severity
   */
  private assessConflictSeverity(localData: any, serverData: any, context: ConflictContext): Conflict['severity'] {
    // Simple heuristic for severity assessment
    const fieldConflicts = this.identifyFieldConflicts(localData, serverData);
    const criticalFields = ['id', 'type', 'status', 'priority'];
    const hasCriticalConflict = fieldConflicts.some(field => criticalFields.includes(field));

    if (hasCriticalConflict) {
      return 'critical';
    }

    if (fieldConflicts.length > 3) {
      return 'high';
    }

    if (fieldConflicts.length > 1) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Identify conflicting fields
   */
  private identifyFieldConflicts(localData: any, serverData: any): string[] {
    const conflicts: string[] = [];

    Object.keys({ ...localData, ...serverData }).forEach(key => {
      if (this.jsonStringifyReplacer(key, localData[key]) !== this.jsonStringifyReplacer(key, serverData[key])) {
        conflicts.push(key);
      }
    });

    return conflicts;
  }

  /**
   * Generate conflict description
   */
  private generateConflictDescription(localData: any, serverData: any, operationType: string): string {
    const fieldConflicts = this.identifyFieldConflicts(localData, serverData);

    if (operationType === 'delete') {
      return `Conflict: Local deletion conflicts with server modifications`;
    }

    if (fieldConflicts.length === 1) {
      return `Conflict: Field '${fieldConflicts[0]}' has conflicting values`;
    }

    return `Conflict: ${fieldConflicts.length} fields have conflicting values (${fieldConflicts.join(', ')})`;
  }

  /**
   * Generate conflict resolution suggestions
   */
  private generateConflictSuggestions(localData: any, serverData: any, context: ConflictContext): Conflict['suggestions'] {
    const suggestions: Conflict['suggestions'] = [];

    // Always suggest basic strategies
    suggestions.push({
      strategy: 'local_wins',
      description: 'Use local version (your changes)',
      confidence: 0.5,
      risk: 'medium'
    });

    suggestions.push({
      strategy: 'server_wins',
      description: 'Use server version (discard your changes)',
      confidence: 0.5,
      risk: 'medium'
    });

    // Suggest merge strategies if enabled
    if (this.config.enableMergeStrategies) {
      this.mergeStrategies.forEach((strategy, name) => {
        const confidence = strategy.confidence(localData, serverData, {
          id: '',
          operation: context.operation,
          serverData,
          localData,
          conflictType: 'update',
          detectedAt: new Date(),
          severity: 'medium',
          description: '',
          suggestions: []
        });

        if (confidence > 0.3) {
          suggestions.push({
            strategy: name as ConflictResolutionStrategy,
            description: strategy.description,
            confidence,
            risk: this.assessMergeRisk(name as ConflictResolutionStrategy, context)
          });
        }
      });
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Assess merge risk
   */
  private assessMergeRisk(strategy: ConflictResolutionStrategy, context: ConflictContext): 'low' | 'medium' | 'high' {
    switch (strategy) {
      case 'local_wins':
      case 'server_wins':
        return 'low';
      case 'timestamp_wins':
        return 'medium';
      case 'merge':
      case 'field_level_merge':
        return 'medium';
      case 'smart_merge':
        return context.networkConditions?.online ? 'medium' : 'high';
      default:
        return 'medium';
    }
  }

  /**
   * Resolve conflict with specific strategy
   */
  async resolveConflict(conflict: Conflict, strategy: ConflictResolutionStrategy): Promise<ConflictResolution> {
    const startTime = Date.now();
    let resolvedData: any;

    try {
      switch (strategy) {
        case 'local_wins':
          resolvedData = conflict.localData;
          break;
        case 'server_wins':
          resolvedData = conflict.serverData;
          break;
        case 'timestamp_wins':
          resolvedData = this.resolveByTimestamp(conflict);
          break;
        case 'merge':
        case 'field_level_merge':
          resolvedData = this.mergeObjects(conflict.localData, conflict.serverData, conflict);
          break;
        case 'manual':
          throw new Error('Manual resolution requires user intervention');
        default:
          // Try to use merge strategy
          const mergeStrategy = this.mergeStrategies.get(strategy);
          if (mergeStrategy) {
            resolvedData = mergeStrategy.mergeFn(conflict.localData, conflict.serverData, conflict);
          } else {
            throw new Error(`Unknown resolution strategy: ${strategy}`);
          }
      }

      const resolution: ConflictResolution = {
        conflictId: conflict.id,
        strategy,
        resolvedData,
        resolutionTime: new Date(),
        resolvedBy: this.config.autoResolve ? 'auto' : 'user',
        confidence: this.calculateResolutionConfidence(conflict, strategy, resolvedData)
      };

      // Record resolution
      this.resolutionHistory.push(resolution);
      if (this.resolutionHistory.length > this.config.maxConflictHistory) {
        this.resolutionHistory = this.resolutionHistory.slice(-this.config.maxConflictHistory);
      }

      // Remove from active conflicts
      this.conflicts.delete(conflict.id);

      // Save changes
      await this.saveResolutionHistory();
      await this.saveConflicts();

      // Log resolution if enabled
      if (this.config.enableConflictLogging) {
        await this.logConflictResolution(conflict, resolution);
      }

      this.emit('conflictResolved', resolution);

      return resolution;

    } catch (error) {
      const resolution: ConflictResolution = {
        conflictId: conflict.id,
        strategy,
        resolvedData: null,
        resolutionTime: new Date(),
        resolvedBy: this.config.autoResolve ? 'auto' : 'user',
        confidence: 0
      };

      this.emit('conflictResolutionError', { conflict, strategy, error });
      throw error;
    }
  }

  /**
   * Auto-resolve conflicts
   */
  async autoResolveConflicts(conflicts: Conflict[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      try {
        // Use best suggestion or default strategy
        const bestSuggestion = conflict.suggestions[0];
        const strategy = bestSuggestion?.strategy || this.config.defaultStrategy;

        // Only auto-resolve if confidence is high enough
        if (bestSuggestion && bestSuggestion.confidence >= this.config.mlConfidenceThreshold) {
          const resolution = await this.resolveConflict(conflict, strategy);
          resolutions.push(resolution);
        } else {
          this.emit('conflictRequiresManualResolution', conflict);
        }
      } catch (error) {
        this.emit('autoResolveError', { conflict, error });
      }
    }

    return resolutions;
  }

  /**
   * Get current conflicts
   */
  getConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Clear all conflicts
   */
  async clearConflicts(): Promise<void> {
    this.conflicts.clear();
    await this.saveConflicts();
    this.emit('conflictsCleared');
  }

  /**
   * Set resolution strategy
   */
  setResolutionStrategy(strategy: ConflictResolutionStrategy): void {
    this.config.defaultStrategy = strategy;
    this.emit('resolutionStrategyChanged', strategy);
  }

  /**
   * Get available resolution strategies
   */
  getResolutionStrategies(): ConflictResolutionStrategy[] {
    const strategies: ConflictResolutionStrategy[] = [
      'local_wins',
      'server_wins',
      'timestamp_wins',
      'merge',
      'manual'
    ];

    // Add merge strategies
    this.mergeStrategies.forEach((strategy, name) => {
      strategies.push(name as ConflictResolutionStrategy);
    });

    return strategies;
  }

  // Merge strategy implementations
  private resolveByTimestamp(conflict: Conflict): any {
    const localTimestamp = new Date(conflict.localData.timestamp || conflict.localData.updatedAt).getTime();
    const serverTimestamp = new Date(conflict.serverData.timestamp || conflict.serverData.updatedAt).getTime();
    return localTimestamp > serverTimestamp ? conflict.localData : conflict.serverData;
  }

  private mergeObjects(local: any, server: any, conflict: Conflict): any {
    const merged = { ...server };
    const conflicts = this.identifyFieldConflicts(local, server);

    conflicts.forEach(field => {
      // Use field-specific merge logic
      if (Array.isArray(local[field]) && Array.isArray(server[field])) {
        merged[field] = this.mergeArrays(local[field], server[field]);
      } else if (typeof local[field] === 'object' && typeof server[field] === 'object') {
        merged[field] = this.mergeObjects(local[field], server[field], conflict);
      } else {
        // For primitive types, use the version with the more recent timestamp
        const localTimestamp = new Date(local.timestamp || local.updatedAt).getTime();
        const serverTimestamp = new Date(server.timestamp || server.updatedAt).getTime();
        merged[field] = localTimestamp > serverTimestamp ? local[field] : server[field];
      }
    });

    return merged;
  }

  private mergeArrays(local: any[], server: any[]): any[] {
    // Simple union merge for arrays
    const combined = [...new Set([...local, ...server])];
    return combined;
  }

  private mergeByPriority(local: any, server: any, conflict: Conflict): any {
    const merged = { ...server };

    // Priority field mapping
    const priorityFields = {
      'priority': { high: 3, medium: 2, low: 1 },
      'status': { urgent: 4, high: 3, medium: 2, low: 1, completed: 0 },
      'importance': { critical: 4, high: 3, medium: 2, low: 1 }
    };

    Object.entries(priorityFields).forEach(([field, priorityMap]) => {
      if (local[field] && server[field]) {
        const localPriority = priorityMap[local[field]] || 0;
        const serverPriority = priorityMap[server[field]] || 0;
        merged[field] = localPriority > serverPriority ? local[field] : server[field];
      }
    });

    return merged;
  }

  private mergeByConcatenation(local: any, server: any, conflict: Conflict): any {
    const merged = { ...server };

    const concatenableFields = ['tags', 'comments', 'notes', 'description'];

    concatenableFields.forEach(field => {
      if (local[field] && server[field]) {
        if (Array.isArray(local[field]) && Array.isArray(server[field])) {
          merged[field] = [...new Set([...local[field], ...server[field]])];
        } else if (typeof local[field] === 'string' && typeof server[field] === 'string') {
          merged[field] = `${server[field]}\n\n${local[field]}`;
        }
      }
    });

    return merged;
  }

  private mergeByUnion(local: any, server: any, conflict: Conflict): any {
    const merged = { ...server };

    Object.keys(local).forEach(key => {
      if (Array.isArray(local[key]) && Array.isArray(server[key])) {
        merged[key] = [...new Set([...local[key], ...server[key]])];
      } else if (typeof local[key] === 'object' && typeof server[key] === 'object') {
        merged[key] = { ...server[key], ...local[key] };
      }
    });

    return merged;
  }

  private smartMerge(local: any, server: any, conflict: Conflict): any {
    // Smart merge using various heuristics
    const context = this.buildSmartMergeContext(local, server, conflict);

    if (context.isTextual && context.hasMinimalOverlap) {
      return this.mergeTextualContent(local, server, conflict);
    }

    if (context.isStructural && context.hasClearHierarchy) {
      return this.mergeStructuralData(local, server, conflict);
    }

    // Fall back to field-level merge
    return this.mergeObjects(local, server, conflict);
  }

  private mergeTextualContent(local: any, server: any, conflict: Conflict): any {
    const merged = { ...server };

    const textFields = ['content', 'description', 'text', 'body'];

    textFields.forEach(field => {
      if (local[field] && server[field] && typeof local[field] === 'string' && typeof server[field] === 'string') {
        merged[field] = this.mergeTextContent(local[field], server[field]);
      }
    });

    return merged;
  }

  private mergeTextContent(localText: string, serverText: string): string {
    // Simple text merge - in practice, this would use diff algorithms
    const localLines = localText.split('\n');
    const serverLines = serverText.split('\n');

    // For now, just concatenate with a separator
    return `${serverText}\n\n--- Local Changes ---\n${localText}`;
  }

  private mergeStructuralData(local: any, server: any, conflict: Conflict): any {
    // Merge hierarchical data structures
    return this.mergeObjects(local, server, conflict);
  }

  // Helper methods
  private hasPriorityFields(data: any): boolean {
    const priorityFields = ['priority', 'status', 'importance', 'urgency'];
    return priorityFields.some(field => data[field] !== undefined);
  }

  private hasConcatenableFields(local: any, server: any): boolean {
    const concatenableFields = ['tags', 'comments', 'notes', 'description'];
    return concatenableFields.some(field =>
      (local[field] && server[field]) &&
      (Array.isArray(local[field]) || typeof local[field] === 'string')
    );
  }

  private hasSetFields(local: any, server: any): boolean {
    return Object.keys(local).some(key =>
      Array.isArray(local[key]) || Array.isArray(server[key])
    );
  }

  private calculateMergeConfidence(local: any, server: any, conflict: Conflict): number {
    // Simple confidence calculation
    const fieldConflicts = this.identifyFieldConflicts(local, server);
    const totalFields = Object.keys({ ...local, ...server }).length;

    if (totalFields === 0) return 0;

    const conflictRatio = fieldConflicts.length / totalFields;
    return Math.max(0, 1 - conflictRatio);
  }

  private calculateResolutionConfidence(conflict: Conflict, strategy: ConflictResolutionStrategy, resolvedData: any): number {
    switch (strategy) {
      case 'local_wins':
      case 'server_wins':
        return 0.9;
      case 'timestamp_wins':
        return 0.8;
      case 'merge':
      case 'field_level_merge':
        return 0.7;
      default:
        return 0.6;
    }
  }

  private buildSmartMergeContext(local: any, server: any, conflict: Conflict): any {
    return {
      isTextual: this.isTextualData(local) || this.isTextualData(server),
      hasMinimalOverlap: this.hasMinimalDataOverlap(local, server),
      isStructural: this.isStructuralData(local) || this.isStructuralData(server),
      hasClearHierarchy: this.hasClearDataHierarchy(local) || this.hasClearDataHierarchy(server)
    };
  }

  private isTextualData(data: any): boolean {
    const textFields = ['content', 'description', 'text', 'body', 'message'];
    return textFields.some(field => typeof data[field] === 'string' && data[field].length > 10);
  }

  private hasMinimalDataOverlap(local: any, server: any): boolean {
    const localJson = JSON.stringify(local, this.jsonStringifyReplacer);
    const serverJson = JSON.stringify(server, this.jsonStringifyReplacer);
    const overlap = this.calculateStringOverlap(localJson, serverJson);
    return overlap < 0.8; // Less than 80% overlap
  }

  private isStructuralData(data: any): boolean {
    return typeof data === 'object' && data !== null && !Array.isArray(data) && Object.keys(data).length > 3;
  }

  private hasClearDataHierarchy(data: any): boolean {
    // Check for hierarchical patterns
    const hasNestedObjects = Object.values(data).some(value =>
      typeof value === 'object' && value !== null && !Array.isArray(value)
    );
    return hasNestedObjects;
  }

  private calculateStringOverlap(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1;

    let overlap = 0;
    for (let i = 0; i <= longer.length - shorter.length; i++) {
      const substring = longer.substr(i, shorter.length);
      if (substring === shorter) {
        overlap = shorter.length;
        break;
      }
    }

    return overlap / longer.length;
  }

  private measureLatency(): number {
    // Simple latency measurement
    const start = Date.now();
    // In a real implementation, this would make a small network request
    return Date.now() - start;
  }

  private getBandwidthEstimate(): string {
    // Simple bandwidth estimation
    if ('connection' in navigator) {
      return (navigator as any).connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  private getDeviceType(): string {
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      return 'mobile';
    }
    if (/Tablet|iPad/i.test(navigator.userAgent)) {
      return 'tablet';
    }
    return 'desktop';
  }

  private getUserPreferences(entityType: string): Record<string, any> {
    return this.userPreferences.get(entityType) || {};
  }

  private getHistoricalResolutions(entityType: string): ConflictResolution[] {
    return this.resolutionHistory.filter(resolution => {
      const conflict = this.conflicts.get(resolution.conflictId);
      return conflict && conflict.operation.entity === entityType;
    });
  }

  // Persistence methods
  private async loadConflicts(): Promise<void> {
    try {
      const saved = await this.storage.load<Conflict[]>('conflicts');
      if (saved) {
        saved.forEach(conflict => {
          this.conflicts.set(conflict.id, {
            ...conflict,
            detectedAt: new Date(conflict.detectedAt)
          });
        });
      }
    } catch (error) {
      this.emit('loadConflictsError', error);
    }
  }

  private async saveConflicts(): Promise<void> {
    try {
      await this.storage.save('conflicts', Array.from(this.conflicts.values()));
    } catch (error) {
      this.emit('saveConflictsError', error);
    }
  }

  private async loadResolutionHistory(): Promise<void> {
    try {
      const saved = await this.storage.load<ConflictResolution[]>('resolution_history');
      if (saved) {
        this.resolutionHistory = saved.map(resolution => ({
          ...resolution,
          resolutionTime: new Date(resolution.resolutionTime)
        }));
      }
    } catch (error) {
      this.emit('loadResolutionHistoryError', error);
    }
  }

  private async saveResolutionHistory(): Promise<void> {
    try {
      await this.storage.save('resolution_history', this.resolutionHistory);
    } catch (error) {
      this.emit('saveResolutionHistoryError', error);
    }
  }

  private async loadUserPreferences(): Promise<void> {
    try {
      const saved = await this.storage.load<Record<string, any>>('user_preferences');
      if (saved) {
        Object.entries(saved).forEach(([key, value]) => {
          this.userPreferences.set(key, value);
        });
      }
    } catch (error) {
      this.emit('loadUserPreferencesError', error);
    }
  }

  private async saveUserPreferences(): Promise<void> {
    try {
      const preferences: Record<string, any> = {};
      this.userPreferences.forEach((value, key) => {
        preferences[key] = value;
      });
      await this.storage.save('user_preferences', preferences);
    } catch (error) {
      this.emit('saveUserPreferencesError', error);
    }
  }

  private async logConflictResolution(conflict: Conflict, resolution: ConflictResolution): Promise<void> {
    try {
      const logEntry = {
        conflictId: conflict.id,
        entityType: conflict.operation.entity,
        operation: conflict.operation.type,
        strategy: resolution.strategy,
        confidence: resolution.confidence,
        timestamp: new Date(),
        details: {
          severity: conflict.severity,
          suggestions: conflict.suggestions,
          resolvedBy: resolution.resolvedBy
        }
      };

      const existingLogs = await this.storage.load<any[]>('conflict_logs') || [];
      existingLogs.push(logEntry);

      if (existingLogs.length > 1000) {
        existingLogs.splice(0, existingLogs.length - 1000);
      }

      await this.storage.save('conflict_logs', existingLogs);
    } catch (error) {
      this.emit('logConflictResolutionError', error);
    }
  }

  /**
   * Destroy conflict resolver
   */
  async destroy(): Promise<void> {
    this.conflicts.clear();
    this.resolutionHistory = [];
    this.userPreferences.clear();
    this.mergeStrategies.clear();
    this.isInitialized = false;
    this.emit('destroyed');
  }

  /**
   * Check if initialized
   */
  public isInitializedCheck(): boolean {
    return this.isInitialized;
  }
}