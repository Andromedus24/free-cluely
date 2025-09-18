// Moderation System Package Exports
// =================================

// Core Types and Interfaces
export * from './types/ModerationTypes';

// Core Services
export * from './core/ModerationService';
export * from './core/ModerationEngine';

// AI Providers
export * from './providers/AIModerationProvider';

// Storage
export * from './storage/ModerationStorage';

// Notifications
export * from './notifications/ModerationNotifier';

// Audit
export * from './audit/ModerationAudit';

// Default Configuration
export const DEFAULT_MODERATION_CONFIG = {
  enabled: true,
  autoModeration: true,
  humanReviewRequired: false,
  appealProcessEnabled: true,
  escalationEnabled: true,
  notifications: {
    enabled: true,
    channels: ['in_app', 'email'] as const,
    templates: {
      flag: 'flag',
      report: 'report',
      escalation: 'escalation',
      resolution: 'resolution'
    }
  },
  retention: {
    contentDays: 365,
    reportDays: 1825, // 5 years
    decisionDays: 1825,
    appealDays: 1825
  },
  performance: {
    maxConcurrentAnalysis: 10,
    analysisTimeout: 30000, // 30 seconds
    queueSize: 1000
  },
  integrations: {
    aiProviders: ['openai', 'perspective'],
    storageProvider: 'memory',
    notificationProvider: 'internal',
    analyticsProvider: 'internal'
  },
  security: {
    encryptSensitiveData: true,
    auditLogEnabled: true,
    rateLimiting: {
      enabled: true,
      requestsPerMinute: 60
    }
  }
};

// Version Information
export const MODERATION_VERSION = '1.0.0';

// Feature Flags
export const MODERATION_FEATURES = {
  AI_ANALYSIS: true,
  RULE_BASED_FILTERING: true,
  HUMAN_REVIEW: true,
  ESCALATION: true,
  APPEALS: true,
  AUDIT_LOGGING: true,
  REAL_TIME_NOTIFICATIONS: true,
  COMPLIANCE_REPORTING: true,
  PERFORMANCE_MONITORING: true
} as const;

// Supported Content Types
export const SUPPORTED_CONTENT_TYPES = [
  'text',
  'image',
  'video',
  'audio',
  'document',
  'user_profile',
  'comment',
  'message',
  'post',
  'attachment'
] as const;

// Supported Moderation Categories
export const SUPPORTED_CATEGORIES = [
  'hate_speech',
  'harassment',
  'spam',
  'misinformation',
  'violence',
  'adult_content',
  'copyright_violation',
  'personal_info',
  'threats',
  'self_harm',
  'illegal_content',
  'political',
  'religious',
  'custom'
] as const;

// Convenience Factory Functions
// =============================

import { ModerationService } from './core/ModerationService';
import { ModerationEngine } from './core/ModerationEngine';
import { ModerationStorage } from './storage/ModerationStorage';
import { ModerationNotifier } from './notifications/ModerationNotifier';
import { ModerationAudit } from './audit/ModerationAudit';
import { OpenAIModerationProvider, PerspectiveModerationProvider } from './providers/AIModerationProvider';

/**
 * Create a complete moderation system with default components
 */
export function createModerationSystem(config?: Partial<typeof DEFAULT_MODERATION_CONFIG>): ModerationService {
  const finalConfig = { ...DEFAULT_MODERATION_CONFIG, ...config };

  // Create core components
  const engine = new ModerationEngine();
  const storage = new ModerationStorage();
  const notifier = new ModerationNotifier();
  const audit = new ModerationAudit();

  // Create the main service
  const service = new ModerationService(engine, storage, notifier, audit, finalConfig);

  // Add default AI providers if API keys are available
  if (process.env.OPENAI_API_KEY) {
    service.addAIProvider('openai', new OpenAIModerationProvider(process.env.OPENAI_API_KEY));
  }

  if (process.env.PERSPECTIVE_API_KEY) {
    service.addAIProvider('perspective', new PerspectiveModerationProvider(process.env.PERSPECTIVE_API_KEY));
  }

  return service;
}

/**
 * Create a minimal moderation system for testing or light usage
 */
export function createMinimalModerationSystem(): ModerationService {
  const config = {
    ...DEFAULT_MODERATION_CONFIG,
    autoModeration: false,
    humanReviewRequired: false,
    notifications: {
      ...DEFAULT_MODERATION_CONFIG.notifications,
      channels: ['console'] as const
    }
  };

  return createModerationSystem(config);
}

/**
 * Create a high-security moderation system
 */
export function createHighSecurityModerationSystem(): ModerationService {
  const config = {
    ...DEFAULT_MODERATION_CONFIG,
    autoModeration: true,
    humanReviewRequired: true,
    escalationEnabled: true,
    appealProcessEnabled: true,
    security: {
      ...DEFAULT_MODERATION_CONFIG.security,
      encryptSensitiveData: true,
      auditLogEnabled: true,
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 30
      }
    }
  };

  return createModerationSystem(config);
}

// Utility Functions
// ================

/**
 * Validate moderation configuration
 */
export function validateModerationConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (typeof config.autoModeration !== 'boolean') {
    errors.push('autoModeration must be a boolean');
  }

  if (config.retention) {
    if (typeof config.retention.contentDays !== 'number' || config.retention.contentDays < 0) {
      errors.push('retention.contentDays must be a positive number');
    }
    if (typeof config.retention.reportDays !== 'number' || config.retention.reportDays < 0) {
      errors.push('retention.reportDays must be a positive number');
    }
  }

  if (config.performance) {
    if (typeof config.performance.maxConcurrentAnalysis !== 'number' || config.performance.maxConcurrentAnalysis < 1) {
      errors.push('performance.maxConcurrentAnalysis must be a positive number');
    }
    if (typeof config.performance.analysisTimeout !== 'number' || config.performance.analysisTimeout < 1000) {
      errors.push('performance.analysisTimeout must be at least 1000ms');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if content type is supported
 */
export function isContentTypeSupported(contentType: string): boolean {
  return SUPPORTED_CONTENT_TYPES.includes(contentType as any);
}

/**
 * Check if moderation category is supported
 */
export function isCategorySupported(category: string): boolean {
  return SUPPORTED_CATEGORIES.includes(category as any);
}

/**
 * Get severity level description
 */
export function getSeverityDescription(severity: string): string {
  const descriptions = {
    low: 'Low risk content',
    medium: 'Medium risk content - review recommended',
    high: 'High risk content - immediate attention required',
    critical: 'Critical risk content - requires immediate action'
  };

  return descriptions[severity as keyof typeof descriptions] || 'Unknown severity';
}

/**
 * Get action description
 */
export function getActionDescription(action: string): string {
  const descriptions = {
    allow: 'Allow content to proceed',
    flag: 'Flag content for review',
    review: 'Queue content for human review',
    block: 'Block content from being posted',
    remove: 'Remove existing content',
    suspend: 'Suspend user account',
    ban: 'Ban user permanently',
    quarantine: 'Place content in quarantine',
    escalate: 'Escalate to higher authority'
  };

  return descriptions[action as keyof typeof descriptions] || 'Unknown action';
}

// Export version and metadata
export const packageInfo = {
  name: '@atlas/moderation',
  version: MODERATION_VERSION,
  description: 'Comprehensive content moderation system for Atlas AI assistant',
  author: 'Atlas Team',
  license: 'MIT',
  repository: 'https://github.com/atlas-ai/atlas',
  bugs: 'https://github.com/atlas-ai/atlas/issues',
  homepage: 'https://atlas-ai.dev'
};