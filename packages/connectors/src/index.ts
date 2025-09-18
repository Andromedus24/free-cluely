// Core connector interfaces and types
export * from './types/ConnectorTypes';

// Core connector framework
export * from './core/ConnectorService';
export * from './core/ConnectorRegistry';
export * from './core/ConnectorFactory';

// Data synchronization
export * from './sync/DataSynchronizer';
export * from './sync/ConflictResolver';
export * from './sync/SyncScheduler';

// Data transformation
export * from './transformation/DataTransformationService';
export * from './transformation/TransformationBuilder';
export * from './transformation/TransformationTemplates';

// Privacy and compliance
export * from './privacy/DataPrivacyService';
export * from './privacy/ComplianceEngine';

// Development tools and SDK
export * from './development';

// Popular service integrations
export * from './integrations';

// Utilities
export * from './utils/ConnectorUtils';
export * from './utils/ValidationUtils';
export * from './utils/RateLimiter';
export * from './utils/RetryHandler';

// Main connector service
export { ConnectorService } from './core/ConnectorService';

// Development kit entry point
export { ConnectorDevKit } from './development';

// Type definitions for better development experience
export type {
  ConnectorConfig,
  ConnectionStatus,
  AuthenticationMethod,
  SyncConfig,
  SyncResult,
  DataRecord,
  DataSchema,
  ConnectorCapabilities,
  ConnectorMetadata,
  RateLimitConfig,
  PaginationConfig,
  TransformationType,
  ValidationRule,
  EnrichmentRule,
  SyncDirection,
  ConflictResolutionStrategy,
  ComplianceFramework,
  PrivacyLevel,
  DataClassification
} from './types/ConnectorTypes';

// Default configurations
export const DEFAULT_CONNECTOR_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 100,
  enableCompression: true,
  enableEncryption: false,
  logLevel: 'info'
};

// Version information
export const CONNECTORS_VERSION = '1.0.0';

// Supported connector types
export const SUPPORTED_CONNECTOR_TYPES = [
  'database',
  'api',
  'file',
  'crm',
  'erp',
  'marketing',
  'analytics',
  'communication',
  'storage',
  'custom'
] as const;

// Supported authentication methods
export const SUPPORTED_AUTHENTICATION_METHODS = [
  'apiKey',
  'oauth',
  'basic',
  'bearer',
  'jwt',
  'custom'
] as const;

// Re-export for convenience
export type ConnectorType = typeof SUPPORTED_CONNECTOR_TYPES[number];
export type AuthenticationMethodType = typeof SUPPORTED_AUTHENTICATION_METHODS[number];