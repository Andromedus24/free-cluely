import { z } from 'zod';

// Core workflow types
export enum WorkflowNodeType {
  TRIGGER = 'trigger',
  ACTION = 'action',
  CONDITION = 'condition',
  LOOP = 'loop',
  PARALLEL = 'parallel',
  DELAY = 'delay',
  TRANSFORM = 'transform',
  API = 'api',
  PLUGIN = 'plugin',
  CUSTOM = 'custom'
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ARCHIVED = 'archived',
  ERROR = 'error'
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

// Base node type
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(WorkflowNodeType),
  name: z.string(),
  description: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  inputs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    required: z.boolean().default(true),
    defaultValue: z.any().optional(),
    description: z.string().optional()
  })).default([]),
  outputs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional()
  })).default([]),
  config: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({})
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

// Connection between nodes
export const WorkflowConnectionSchema = z.object({
  id: z.string(),
  sourceNodeId: z.string(),
  sourceOutputId: z.string(),
  targetNodeId: z.string(),
  targetInputId: z.string(),
  condition: z.string().optional(),
  metadata: z.record(z.any()).default({})
});

export type WorkflowConnection = z.infer<typeof WorkflowConnectionSchema>;

// Complete workflow definition
export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.DRAFT),
  nodes: z.array(WorkflowNodeSchema).default([]),
  connections: z.array(WorkflowConnectionSchema).default([]),
  variables: z.array(z.object({
    name: z.string(),
    type: z.string(),
    defaultValue: z.any().optional(),
    description: z.string().optional(),
    isGlobal: z.boolean().default(false)
  })).default([]),
  triggers: z.array(z.object({
    type: z.string(),
    config: z.record(z.any()),
    enabled: z.boolean().default(true)
  })).default([]),
  settings: z.object({
    timeout: z.number().default(300000), // 5 minutes
    retries: z.number().default(3),
    retryDelay: z.number().default(1000),
    parallelExecutions: z.number().default(1),
    logging: z.boolean().default(true),
    errorHandling: z.enum(['stop', 'continue', 'retry']).default('stop')
  }).default({}),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date()),
  createdBy: z.string().optional(),
  tags: z.array(z.string()).default([])
});

export type Workflow = z.infer<typeof WorkflowSchema>;

// Execution context
export const ExecutionContextSchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  executionId: z.string(),
  status: z.nativeEnum(ExecutionStatus).default(ExecutionStatus.PENDING),
  variables: z.record(z.any()).default({}),
  currentNodeId: z.string().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
  logs: z.array(z.object({
    timestamp: z.date(),
    level: z.enum(['info', 'warn', 'error', 'debug']),
    message: z.string(),
    nodeId: z.string().optional(),
    data: z.any().optional()
  })).default([]),
  metadata: z.record(z.any()).default({})
});

export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

// Node execution result
export const NodeExecutionResultSchema = z.object({
  nodeId: z.string(),
  status: z.nativeEnum(ExecutionStatus),
  startTime: z.date(),
  endTime: z.date(),
  duration: z.number(),
  output: z.any().optional(),
  error: z.string().optional(),
  logs: z.array(z.object({
    timestamp: z.date(),
    level: z.enum(['info', 'warn', 'error', 'debug']),
    message: z.string(),
    data: z.any().optional()
  })).default([])
});

export type NodeExecutionResult = z.infer<typeof NodeExecutionResultSchema>;

// Node templates for the builder
export const NodeTemplateSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(WorkflowNodeType),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  icon: z.string().optional(),
  color: z.string().optional(),
  inputs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    required: z.boolean().default(true),
    defaultValue: z.any().optional(),
    description: z.string().optional()
  })).default([]),
  outputs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    description: z.string().optional()
  })).default([]),
  configSchema: z.record(z.any()).default({}),
  execute: z.function().args(z.any(), z.any()).returns(z.promise(z.any())),
  documentation: z.string().optional(),
  examples: z.array(z.record(z.any())).default([])
});

export type NodeTemplate = z.infer<typeof NodeTemplateSchema>;

// Workflow execution history
export const ExecutionHistorySchema = z.object({
  id: z.string(),
  workflowId: z.string(),
  executionId: z.string(),
  status: z.nativeEnum(ExecutionStatus),
  startTime: z.date(),
  endTime: z.date().optional(),
  duration: z.number().optional(),
  trigger: z.record(z.any()).optional(),
  input: z.any().optional(),
  output: z.any().optional(),
  error: z.string().optional(),
  nodeResults: z.array(NodeExecutionResultSchema).default([]),
  logs: z.array(z.object({
    timestamp: z.date(),
    level: z.enum(['info', 'warn', 'error', 'debug']),
    message: z.string(),
    nodeId: z.string().optional(),
    data: z.any().optional()
  })).default([])
});

export type ExecutionHistory = z.infer<typeof ExecutionHistorySchema>;

// Workflow templates
export const WorkflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  version: z.string().default('1.0.0'),
  tags: z.array(z.string()).default([]),
  icon: z.string().optional(),
  preview: z.string().optional(),
  workflow: WorkflowSchema,
  documentation: z.string().optional(),
  author: z.string().optional(),
  isPublic: z.boolean().default(false),
  usageCount: z.number().default(0),
  rating: z.number().min(0).max(5).default(0),
  createdAt: z.date().default(new Date()),
  updatedAt: z.date().default(new Date())
});

export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

// Export all schemas and types
export {
  WorkflowNodeSchema,
  WorkflowConnectionSchema,
  WorkflowSchema,
  ExecutionContextSchema,
  NodeExecutionResultSchema,
  NodeTemplateSchema,
  ExecutionHistorySchema,
  WorkflowTemplateSchema
};