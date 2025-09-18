// Policy Engine Package Exports
// =============================

// Core Services
export * from './PolicyEngine';

// Types and Interfaces
export * from './types';

// Templates and Configuration
export * from './PolicyTemplates';

// Machine Learning Integration
export * from './PolicyML';

// Factory Functions
// ==================

import { PolicyEngine } from './PolicyEngine';
import { MLModelRegistry, BuiltInModels } from './PolicyML';
import { PolicyTemplate, getPolicyTemplate, createCustomPolicyTemplate } from './PolicyTemplates';
import { Policy, PolicyCategory, PolicySeverity, PolicyAction } from './types';
import { IModerationStorage } from '../storage/ModerationStorage';
import { IModerationNotifier } from '../notifications/ModerationNotifier';
import { IComplianceService } from '../compliance/ComplianceService';

/**
 * Create a basic policy engine with built-in models
 */
export function createBasicPolicyEngine(
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  config?: any
): PolicyEngine {
  const modelRegistry = new MLModelRegistry();

  // Register built-in models
  BuiltInModels.getAllModels().forEach(model => {
    modelRegistry.registerModel(model);
  });

  return new PolicyEngine(
    storage,
    modelRegistry,
    notifier,
    null, // compliance service (optional)
    {
      enableML: true,
      enableCaching: true,
      enableBatching: true,
      cacheTTL: 300000, // 5 minutes
      maxBatchSize: 100,
      confidenceThreshold: 0.7,
      autoOptimize: true,
      ...config
    }
  );
}

/**
 * Create an enterprise-grade policy engine with all features
 */
export function createEnterprisePolicyEngine(
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  complianceService: IComplianceService,
  config?: any
): PolicyEngine {
  const modelRegistry = new MLModelRegistry();

  // Register built-in models
  BuiltInModels.getAllModels().forEach(model => {
    modelRegistry.registerModel(model);
  });

  return new PolicyEngine(
    storage,
    modelRegistry,
    notifier,
    complianceService,
    {
      enableML: true,
      enableCaching: true,
      enableBatching: true,
      enableRealTimeOptimization: true,
      enableAdvancedAnalytics: true,
      enableAutoEscalation: true,
      enableComplianceIntegration: true,
      cacheTTL: 60000, // 1 minute
      maxBatchSize: 500,
      confidenceThreshold: 0.8,
      autoOptimize: true,
      optimizationInterval: 3600000, // 1 hour
      maxConcurrentEvaluations: 50,
      enableEnsembleModels: true,
      ensembleThreshold: 0.7,
      enableAdaptiveThresholds: true,
      adaptiveLearningRate: 0.1,
      enableModelHealthMonitoring: true,
      healthCheckInterval: 300000, // 5 minutes
      enablePerformanceMetrics: true,
      metricsRetentionPeriod: 2592000000, // 30 days
      enableAuditLogging: true,
      auditLogLevel: 'detailed',
      enableReporting: true,
      reportingInterval: 86400000, // 24 hours
      enableAlerting: true,
      alertThresholds: {
        errorRate: 0.05,
        latencyThreshold: 1000,
        accuracyThreshold: 0.85,
        modelFailureRate: 0.1
      },
      ...config
    }
  );
}

/**
 * Create a lightweight policy engine for smaller deployments
 */
export function createLightweightPolicyEngine(
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  config?: any
): PolicyEngine {
  const modelRegistry = new MLModelRegistry();

  // Register only essential models
  [
    BuiltInModels.createExplicitContentDetector(),
    BuiltInModels.createSpamDetector(),
    BuiltInModels.createToxicityDetector()
  ].forEach(model => {
    modelRegistry.registerModel(model);
  });

  return new PolicyEngine(
    storage,
    modelRegistry,
    notifier,
    null,
    {
      enableML: true,
      enableCaching: true,
      enableBatching: false,
      cacheTTL: 600000, // 10 minutes
      maxBatchSize: 10,
      confidenceThreshold: 0.6,
      autoOptimize: false,
      enableRealTimeOptimization: false,
      enableAdvancedAnalytics: false,
      enableAutoEscalation: false,
      enableComplianceIntegration: false,
      ...config
    }
  );
}

/**
 * Create a custom policy engine with specific configuration
 */
export function createCustomPolicyEngine(
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  options: {
    models?: any[];
    policies?: Policy[];
    templates?: PolicyTemplate[];
    mlConfig?: any;
    evaluationConfig?: any;
    cachingConfig?: any;
    analyticsConfig?: any;
    complianceConfig?: any;
  }
): PolicyEngine {
  const modelRegistry = new MLModelRegistry();

  // Register custom models or use built-in
  if (options.models && options.models.length > 0) {
    options.models.forEach(model => {
      modelRegistry.registerModel(model);
    });
  } else {
    BuiltInModels.getAllModels().forEach(model => {
      modelRegistry.registerModel(model);
    });
  }

  const engine = new PolicyEngine(
    storage,
    modelRegistry,
    notifier,
    null,
    {
      enableML: options.mlConfig?.enableML ?? true,
      enableCaching: options.cachingConfig?.enableCaching ?? true,
      enableBatching: options.cachingConfig?.enableBatching ?? true,
      cacheTTL: options.cachingConfig?.cacheTTL ?? 300000,
      maxBatchSize: options.cachingConfig?.maxBatchSize ?? 100,
      confidenceThreshold: options.evaluationConfig?.confidenceThreshold ?? 0.7,
      autoOptimize: options.mlConfig?.autoOptimize ?? true,
      ...options.evaluationConfig,
      ...options.mlConfig,
      ...options.cachingConfig,
      ...options.analyticsConfig,
      ...options.complianceConfig
    }
  );

  // Add custom policies if provided
  if (options.policies && options.policies.length > 0) {
    options.policies.forEach(policy => {
      engine.addPolicy(policy);
    });
  }

  // Add templates if provided
  if (options.templates && options.templates.length > 0) {
    options.templates.forEach(template => {
      engine.addPolicyTemplate(template);
    });
  }

  return engine;
}

/**
 * Create a policy engine from template
 */
export function createPolicyEngineFromTemplate(
  templateId: string,
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  complianceService?: IComplianceService,
  customizations?: {
    name?: string;
    rules?: any[];
    configuration?: any;
    severity?: PolicySeverity;
  }
): PolicyEngine {
  const template = getPolicyTemplate(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Create customized template if needed
  const finalTemplate = customizations
    ? createCustomPolicyTemplate(
        customizations.name || template.name,
        template.description,
        template.category,
        customizations.severity || template.severity,
        customizations.rules || template.rules,
        customizations.configuration || template.configuration
      )
    : template;

  const modelRegistry = new MLModelRegistry();

  // Register required models
  BuiltInModels.getAllModels().forEach(model => {
    if (finalTemplate.mlModels.includes(model.id)) {
      modelRegistry.registerModel(model);
    }
  });

  const engine = new PolicyEngine(
    storage,
    modelRegistry,
    notifier,
    complianceService,
    finalTemplate.configuration
  );

  // Add policy from template
  engine.addPolicyFromTemplate(finalTemplate);

  return engine;
}

/**
 * Create industry-specific policy engine
 */
export function createIndustryPolicyEngine(
  industry: string,
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  complianceService?: IComplianceService,
  config?: any
): PolicyEngine {
  const modelRegistry = new MLModelRegistry();

  // Register industry-specific models
  switch (industry.toLowerCase()) {
    case 'healthcare':
      [
        BuiltInModels.createPIIDetector(),
        BuiltInModels.createExplicitContentDetector(),
        BuiltInModels.createToxicityDetector()
      ].forEach(model => {
        modelRegistry.registerModel(model);
      });
      break;
    case 'finance':
      [
        BuiltInModels.createPIIDetector(),
        BuiltInModels.createSpamDetector(),
        BuiltInModels.createToxicityDetector()
      ].forEach(model => {
        modelRegistry.registerModel(model);
      });
      break;
    case 'education':
      [
        BuiltInModels.createExplicitContentDetector(),
        BuiltInModels.createToxicityDetector(),
        BuiltInModels.createHateSpeechDetector()
      ].forEach(model => {
        modelRegistry.registerModel(model);
      });
      break;
    default:
      BuiltInModels.getAllModels().forEach(model => {
        modelRegistry.registerModel(model);
      });
  }

  const industryConfig = {
    healthcare: {
      confidenceThreshold: 0.9,
      enableComplianceIntegration: true,
      enableHIPAACompliance: true,
      strictPIIDetection: true,
      autoEscalateHighRisk: true,
      ...config
    },
    finance: {
      confidenceThreshold: 0.85,
      enableComplianceIntegration: true,
      enableFINRACompliance: true,
      strictFinancialAdvice: true,
      enableFraudDetection: true,
      ...config
    },
    education: {
      confidenceThreshold: 0.75,
      enableAgeAppropriateFiltering: true,
      enableEducationalContentScoring: true,
      strictSafetyPolicies: true,
      ...config
    },
    default: config
  };

  return new PolicyEngine(
    storage,
    modelRegistry,
    notifier,
    complianceService,
    industryConfig[industry.toLowerCase()] || industryConfig.default
  );
}

// Utility Functions
// ================

import { PolicyEvaluationResult } from './types';

/**
 * Calculate policy violation risk score
 */
export function calculatePolicyRiskScore(
  results: PolicyEvaluationResult[]
): {
  overallRisk: number;
  riskFactors: Array<{
    category: string;
    risk: number;
    severity: string;
    confidence: number;
  }>;
  recommendation: 'allow' | 'review' | 'block' | 'escalate';
} {
  if (results.length === 0) {
    return {
      overallRisk: 0,
      riskFactors: [],
      recommendation: 'allow'
    };
  }

  const riskFactors = results.map(result => ({
    category: result.category,
    risk: result.confidence * (result.severity === 'critical' ? 1.0 :
                               result.severity === 'high' ? 0.8 :
                               result.severity === 'medium' ? 0.6 : 0.4),
    severity: result.severity,
    confidence: result.confidence
  }));

  const overallRisk = Math.min(riskFactors.reduce((sum, factor) => sum + factor.risk, 0), 1.0);

  let recommendation: 'allow' | 'review' | 'block' | 'escalate';
  if (overallRisk >= 0.8) {
    recommendation = 'block';
  } else if (overallRisk >= 0.6) {
    recommendation = 'escalate';
  } else if (overallRisk >= 0.4) {
    recommendation = 'review';
  } else {
    recommendation = 'allow';
  }

  return {
    overallRisk,
    riskFactors,
    recommendation
  };
}

/**
 * Generate policy violation explanation
 */
export function generateViolationExplanation(results: PolicyEvaluationResult[]): {
  explanation: string;
  severity: string;
  suggestedActions: string[];
  confidence: number;
} {
  if (results.length === 0) {
    return {
      explanation: 'No policy violations detected',
      severity: 'none',
      suggestedActions: [],
      confidence: 1.0
    };
  }

  const violations = results.filter(r => r.violation);
  const highestSeverity = violations.reduce((max, r) =>
    r.severity === 'critical' ? 'critical' :
    r.severity === 'high' && max !== 'critical' ? 'high' :
    r.severity === 'medium' && !['critical', 'high'].includes(max) ? 'medium' :
    'low', 'low');

  const confidence = violations.reduce((sum, r) => sum + r.confidence, 0) / violations.length;

  const explanations = violations.map(r => r.explanation).filter(Boolean);
  const explanation = explanations.length > 0
    ? `Detected ${violations.length} policy violation(s): ${explanations.join('; ')}`
    : `Detected ${violations.length} policy violation(s)`;

  const suggestedActions = violations.flatMap(r => r.suggestedActions || []);

  return {
    explanation,
    severity: highestSeverity,
    suggestedActions,
    confidence
  };
}

/**
 * Optimize policy configuration based on performance data
 */
export function optimizePolicyConfiguration(
  currentConfig: any,
  performanceData: {
    evaluationCount: number;
    averageLatency: number;
    errorRate: number;
    accuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    modelPerformance: Record<string, {
      accuracy: number;
      latency: number;
      errorRate: number;
    }>;
  }
): any {
  const optimizedConfig = { ...currentConfig };

  // Adjust confidence threshold based on accuracy
  if (performanceData.accuracy < 0.8) {
    optimizedConfig.confidenceThreshold = Math.min(0.9, currentConfig.confidenceThreshold + 0.05);
  } else if (performanceData.accuracy > 0.95 && performanceData.falsePositiveRate > 0.1) {
    optimizedConfig.confidenceThreshold = Math.max(0.5, currentConfig.confidenceThreshold - 0.05);
  }

  // Adjust caching based on latency
  if (performanceData.averageLatency > 1000) {
    optimizedConfig.cacheTTL = Math.min(600000, currentConfig.cacheTTL * 1.5);
  } else if (performanceData.averageLatency < 100) {
    optimizedConfig.cacheTTL = Math.max(60000, currentConfig.cacheTTL * 0.8);
  }

  // Adjust batching based on load
  if (performanceData.evaluationCount > 1000) {
    optimizedConfig.maxBatchSize = Math.min(1000, currentConfig.maxBatchSize * 1.5);
  } else if (performanceData.evaluationCount < 100) {
    optimizedConfig.maxBatchSize = Math.max(10, currentConfig.maxBatchSize * 0.8);
  }

  // Disable problematic models
  Object.entries(performanceData.modelPerformance).forEach(([modelId, perf]) => {
    if (perf.errorRate > 0.2 || perf.accuracy < 0.6) {
      optimizedConfig.disabledModels = optimizedConfig.disabledModels || [];
      if (!optimizedConfig.disabledModels.includes(modelId)) {
        optimizedConfig.disabledModels.push(modelId);
      }
    }
  });

  return optimizedConfig;
}

/**
 * Validate policy engine configuration
 */
export function validatePolicyEngineConfiguration(config: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate basic configuration
  if (config.confidenceThreshold < 0 || config.confidenceThreshold > 1) {
    errors.push('Confidence threshold must be between 0 and 1');
  }

  if (config.cacheTTL < 0) {
    errors.push('Cache TTL must be positive');
  } else if (config.cacheTTL > 3600000) {
    warnings.push('Cache TTL over 1 hour may result in stale data');
  }

  if (config.maxBatchSize < 1) {
    errors.push('Max batch size must be at least 1');
  } else if (config.maxBatchSize > 10000) {
    warnings.push('Large batch sizes may impact performance');
  }

  // Validate ML configuration
  if (config.enableML && (!config.models || config.models.length === 0)) {
    warnings.push('ML enabled but no models configured');
  }

  // Validate compliance configuration
  if (config.enableComplianceIntegration && !config.complianceService) {
    warnings.push('Compliance integration enabled but no compliance service provided');
  }

  // Validate alert thresholds
  if (config.alertThresholds) {
    Object.entries(config.alertThresholds).forEach(([key, value]) => {
      if (typeof value === 'number' && (value < 0 || value > 1)) {
        errors.push(`Alert threshold ${key} must be between 0 and 1`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Constants and Defaults
// =====================

export const DEFAULT_POLICY_ENGINE_CONFIG = {
  enableML: true,
  enableCaching: true,
  enableBatching: true,
  enableRealTimeOptimization: false,
  enableAdvancedAnalytics: false,
  enableAutoEscalation: false,
  enableComplianceIntegration: false,
  cacheTTL: 300000,
  maxBatchSize: 100,
  confidenceThreshold: 0.7,
  autoOptimize: false,
  optimizationInterval: 3600000,
  maxConcurrentEvaluations: 10,
  enableEnsembleModels: false,
  ensembleThreshold: 0.7,
  enableAdaptiveThresholds: false,
  adaptiveLearningRate: 0.1,
  enableModelHealthMonitoring: true,
  healthCheckInterval: 300000,
  enablePerformanceMetrics: true,
  metricsRetentionPeriod: 2592000000,
  enableAuditLogging: true,
  auditLogLevel: 'basic',
  enableReporting: true,
  reportingInterval: 86400000,
  enableAlerting: true,
  alertThresholds: {
    errorRate: 0.1,
    latencyThreshold: 2000,
    accuracyThreshold: 0.8,
    modelFailureRate: 0.2
  }
} as const;

export const POLICY_ENGINE_VERSION = '1.0.0';

export const packageInfo = {
  name: '@atlas/policy-engine',
  version: POLICY_ENGINE_VERSION,
  description: 'Advanced policy engine for content moderation with ML integration',
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
  PolicyEngine,
  MLModelRegistry,
  BuiltInModels,
  MLModelEnsemble
};