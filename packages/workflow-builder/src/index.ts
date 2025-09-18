// Core types and interfaces
export * from './types/WorkflowTypes';
export * from './interfaces/WorkflowBuilderInterface';

// Core service
export { WorkflowBuilderService } from './core/WorkflowBuilderService';

// Components
export { default as WorkflowBuilder } from './components/WorkflowBuilder';

// Templates
export { BUILTIN_NODE_TEMPLATES, registerBuiltInTemplates } from './templates/NodeTemplates';

// Utilities
export { WorkflowUtils } from './utils/WorkflowUtils';

// Version
export const version = '1.0.0';

// Default export for the main component
export default WorkflowBuilder;