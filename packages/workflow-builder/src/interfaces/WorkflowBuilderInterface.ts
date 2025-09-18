import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowTemplate,
  NodeTemplate,
  ExecutionContext,
  ExecutionHistory,
  WorkflowStatus,
  ExecutionStatus,
  WorkflowNodeType
} from '../types/WorkflowTypes';

export interface WorkflowBuilderInterface {
  // Workflow CRUD operations
  createWorkflow(name: string, description?: string): Promise<Workflow>;
  getWorkflow(id: string): Promise<Workflow | null>;
  updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow>;
  deleteWorkflow(id: string): Promise<void>;
  listWorkflows(filters?: WorkflowFilters): Promise<Workflow[]>;
  duplicateWorkflow(id: string, newName?: string): Promise<Workflow>;

  // Node management
  addNode(workflowId: string, node: Omit<WorkflowNode, 'id'>): Promise<WorkflowNode>;
  updateNode(workflowId: string, nodeId: string, updates: Partial<WorkflowNode>): Promise<WorkflowNode>;
  deleteNode(workflowId: string, nodeId: string): Promise<void>;
  moveNode(workflowId: string, nodeId: string, position: { x: number; y: number }): Promise<void>;

  // Connection management
  addConnection(workflowId: string, connection: Omit<WorkflowConnection, 'id'>): Promise<WorkflowConnection>;
  updateConnection(workflowId: string, connectionId: string, updates: Partial<WorkflowConnection>): Promise<WorkflowConnection>;
  deleteConnection(workflowId: string, connectionId: string): Promise<void>;
  validateConnection(workflowId: string, connection: Omit<WorkflowConnection, 'id'>): Promise<boolean>;

  // Workflow validation
  validateWorkflow(workflowId: string): Promise<WorkflowValidationResult>;
  validateNode(node: WorkflowNode): Promise<NodeValidationResult>;

  // Workflow execution
  executeWorkflow(workflowId: string, input?: any, trigger?: any): Promise<string>;
  stopExecution(executionId: string): Promise<void>;
  getExecutionStatus(executionId: string): Promise<ExecutionStatus>;
  getExecutionHistory(workflowId: string, filters?: ExecutionFilters): Promise<ExecutionHistory[]>;

  // Template management
  createTemplate(workflowId: string, templateData: Omit<WorkflowTemplate, 'id' | 'workflow' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate>;
  getTemplate(id: string): Promise<WorkflowTemplate | null>;
  listTemplates(filters?: TemplateFilters): Promise<WorkflowTemplate[]>;
  applyTemplate(templateId: string): Promise<Workflow>;
  rateTemplate(templateId: string, rating: number): Promise<void>;

  // Node templates
  registerNodeTemplate(template: NodeTemplate): Promise<void>;
  getNodeTemplates(): Promise<NodeTemplate[]>;
  getNodeTemplate(id: string): Promise<NodeTemplate | null>;
  unregisterNodeTemplate(id: string): Promise<void>;

  // Workflow analytics
  getWorkflowAnalytics(workflowId: string, period?: AnalyticsPeriod): Promise<WorkflowAnalytics>;
  getSystemAnalytics(period?: AnalyticsPeriod): Promise<SystemAnalytics>;

  // Import/Export
  exportWorkflow(workflowId: string, format: 'json' | 'yaml' | 'xml'): Promise<string>;
  importWorkflow(data: string, format: 'json' | 'yaml' | 'xml'): Promise<Workflow>;
}

export interface WorkflowFilters {
  status?: WorkflowStatus[];
  tags?: string[];
  createdBy?: string;
  search?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ExecutionFilters {
  status?: ExecutionStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  trigger?: string;
  limit?: number;
  offset?: number;
}

export interface TemplateFilters {
  category?: string;
  tags?: string[];
  search?: string;
  isPublic?: boolean;
  author?: string;
  minRating?: number;
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface NodeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationError {
  type: 'syntax' | 'logic' | 'connection' | 'configuration' | 'security';
  severity: 'error' | 'warning' | 'info';
  message: string;
  nodeId?: string;
  connectionId?: string;
  details?: any;
}

export interface ValidationWarning {
  type: 'performance' | 'best-practice' | 'deprecation' | 'compatibility';
  message: string;
  nodeId?: string;
  details?: any;
}

export interface ValidationSuggestion {
  type: 'optimization' | 'refactoring' | 'security' | 'performance';
  message: string;
  nodeId?: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
}

export interface WorkflowAnalytics {
  workflowId: string;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  executionTrend: {
    date: Date;
    count: number;
    successRate: number;
  }[];
  nodePerformance: {
    nodeId: string;
    averageExecutionTime: number;
    successRate: number;
    errorCount: number;
  }[];
  errorAnalysis: {
    errorType: string;
    count: number;
    lastOccurred: Date;
    affectedNodes: string[];
  }[];
  usageStats: {
    lastUsed: Date;
    mostActiveHour: number;
    dayOfWeekUsage: number[];
  };
}

export interface SystemAnalytics {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  popularNodes: {
    nodeType: WorkflowNodeType;
    usageCount: number;
  }[];
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  performanceMetrics: {
    p95ExecutionTime: number;
    p99ExecutionTime: number;
    throughput: number;
  };
}

// Event types for workflow builder
export interface WorkflowBuilderEvents {
  workflowCreated: { workflowId: string; workflow: Workflow };
  workflowUpdated: { workflowId: string; updates: Partial<Workflow> };
  workflowDeleted: { workflowId: string };
  nodeAdded: { workflowId: string; node: WorkflowNode };
  nodeUpdated: { workflowId: string; nodeId: string; updates: Partial<WorkflowNode> };
  nodeDeleted: { workflowId: string; nodeId: string };
  connectionAdded: { workflowId: string; connection: WorkflowConnection };
  connectionUpdated: { workflowId: string; connectionId: string; updates: Partial<WorkflowConnection> };
  connectionDeleted: { workflowId: string; connectionId: string };
  workflowExecuted: { workflowId: string; executionId: string; input?: any };
  executionCompleted: { workflowId: string; executionId: string; result: any; duration: number };
  executionFailed: { workflowId: string; executionId: string; error: string; duration: number };
  validationCompleted: { workflowId: string; result: WorkflowValidationResult };
}

// Event emitter interface
export interface WorkflowBuilderEventEmitter {
  on<K extends keyof WorkflowBuilderEvents>(
    event: K,
    listener: (data: WorkflowBuilderEvents[K]) => void
  ): void;
  off<K extends keyof WorkflowBuilderEvents>(
    event: K,
    listener: (data: WorkflowBuilderEvents[K]) => void
  ): void;
  emit<K extends keyof WorkflowBuilderEvents>(event: K, data: WorkflowBuilderEvents[K]): void;
}