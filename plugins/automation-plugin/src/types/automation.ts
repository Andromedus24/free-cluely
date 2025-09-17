export interface AutomationTask {
  id: string;
  name: string;
  description: string;
  type: 'scheduled' | 'triggered' | 'manual';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'critical';
  schedule?: TaskSchedule;
  triggers?: TaskTrigger[];
  actions: AutomationAction[];
  conditions?: TaskCondition[];
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  metadata?: Record<string, any>;
  executionCount: number;
  successCount: number;
  failureCount: number;
}

export interface TaskSchedule {
  type: 'cron' | 'interval' | 'once';
  expression: string; // cron expression or interval in ms
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface TaskTrigger {
  id: string;
  type: 'event' | 'webhook' | 'file' | 'api' | 'system';
  source: string;
  condition: string;
  debounce?: number; // milliseconds
  throttle?: number; // milliseconds
}

export interface AutomationAction {
  id: string;
  type: 'http' | 'email' | 'script' | 'plugin' | 'system' | 'notification';
  config: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  dependencies?: string[]; // other action IDs
}

export interface TaskCondition {
  id: string;
  type: 'time' | 'system' | 'data' | 'logic' | 'custom';
  condition: string;
  operator: 'and' | 'or';
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
  multiplier?: number;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  result?: ExecutionResult;
  error?: string;
  logs: ExecutionLog[];
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  data?: any;
  outputs?: Record<string, any>;
  duration: number;
  actions: ActionExecution[];
}

export interface ActionExecution {
  id: string;
  actionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  duration?: number;
  retryCount: number;
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
  source: 'system' | 'action' | 'condition' | 'trigger';
}

export interface AutomationPluginConfig {
  maxConcurrentTasks: number;
  defaultTimeout: number;
  retryPolicy: RetryPolicy;
  enableWebhooks: boolean;
  webhookSecret?: string;
  storagePath: string;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableMetrics: boolean;
  timezone: string;
}