import { v4 as uuidv4 } from 'uuid';
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
  WorkflowNodeType,
  WorkflowFilters,
  ExecutionFilters,
  TemplateFilters,
  WorkflowValidationResult,
  NodeValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  WorkflowAnalytics,
  SystemAnalytics,
  AnalyticsPeriod
} from '../types/WorkflowTypes';
import { WorkflowBuilderInterface } from '../interfaces/WorkflowBuilderInterface';

export class WorkflowBuilderService implements WorkflowBuilderInterface {
  private workflows: Map<string, Workflow> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private nodeTemplates: Map<string, NodeTemplate> = new Map();
  private executions: Map<string, ExecutionContext> = new Map();
  private executionHistory: Map<string, ExecutionHistory[]> = new Map();
  private analytics: Map<string, WorkflowAnalytics> = new Map();

  // Workflow CRUD operations
  async createWorkflow(name: string, description?: string): Promise<Workflow> {
    const workflow: Workflow = {
      id: uuidv4(),
      name,
      description,
      version: '1.0.0',
      status: WorkflowStatus.DRAFT,
      nodes: [],
      connections: [],
      variables: [],
      triggers: [],
      settings: {
        timeout: 300000,
        retries: 3,
        retryDelay: 1000,
        parallelExecutions: 1,
        logging: true,
        errorHandling: 'stop'
      },
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.workflows.get(id) || null;
  }

  async updateWorkflow(id: string, updates: Partial<Workflow>): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    const updatedWorkflow = {
      ...workflow,
      ...updates,
      updatedAt: new Date()
    };

    this.workflows.set(id, updatedWorkflow);
    return updatedWorkflow;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const deleted = this.workflows.delete(id);
    if (!deleted) {
      throw new Error(`Workflow ${id} not found`);
    }

    // Clean up related data
    this.executionHistory.delete(id);
    this.analytics.delete(id);
  }

  async listWorkflows(filters?: WorkflowFilters): Promise<Workflow[]> {
    let workflows = Array.from(this.workflows.values());

    if (filters) {
      if (filters.status?.length) {
        workflows = workflows.filter(w => filters.status!.includes(w.status));
      }
      if (filters.tags?.length) {
        workflows = workflows.filter(w => filters.tags!.some(tag => w.tags.includes(tag)));
      }
      if (filters.createdBy) {
        workflows = workflows.filter(w => w.createdBy === filters.createdBy);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        workflows = workflows.filter(w =>
          w.name.toLowerCase().includes(searchLower) ||
          w.description?.toLowerCase().includes(searchLower)
        );
      }
      if (filters.category) {
        workflows = workflows.filter(w => w.metadata.category === filters.category);
      }
      if (filters.dateRange) {
        workflows = workflows.filter(w =>
          w.createdAt >= filters.dateRange!.start &&
          w.createdAt <= filters.dateRange!.end
        );
      }
    }

    return workflows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async duplicateWorkflow(id: string, newName?: string): Promise<Workflow> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      throw new Error(`Workflow ${id} not found`);
    }

    const duplicated: Workflow = {
      ...workflow,
      id: uuidv4(),
      name: newName || `${workflow.name} (Copy)`,
      status: WorkflowStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflows.set(duplicated.id, duplicated);
    return duplicated;
  }

  // Node management
  async addNode(workflowId: string, node: Omit<WorkflowNode, 'id'>): Promise<WorkflowNode> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const newNode: WorkflowNode = {
      ...node,
      id: uuidv4()
    };

    workflow.nodes.push(newNode);
    workflow.updatedAt = new Date();

    this.workflows.set(workflowId, workflow);
    return newNode;
  }

  async updateNode(workflowId: string, nodeId: string, updates: Partial<WorkflowNode>): Promise<WorkflowNode> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const nodeIndex = workflow.nodes.findIndex(n => n.id === nodeId);
    if (nodeIndex === -1) {
      throw new Error(`Node ${nodeId} not found in workflow ${workflowId}`);
    }

    workflow.nodes[nodeIndex] = {
      ...workflow.nodes[nodeIndex],
      ...updates
    };

    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);

    return workflow.nodes[nodeIndex];
  }

  async deleteNode(workflowId: string, nodeId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.nodes = workflow.nodes.filter(n => n.id !== nodeId);
    workflow.connections = workflow.connections.filter(c =>
      c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId
    );

    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);
  }

  async moveNode(workflowId: string, nodeId: string, position: { x: number; y: number }): Promise<void> {
    await this.updateNode(workflowId, nodeId, { position });
  }

  // Connection management
  async addConnection(workflowId: string, connection: Omit<WorkflowConnection, 'id'>): Promise<WorkflowConnection> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const isValid = await this.validateConnection(workflowId, connection);
    if (!isValid) {
      throw new Error('Invalid connection');
    }

    const newConnection: WorkflowConnection = {
      ...connection,
      id: uuidv4()
    };

    workflow.connections.push(newConnection);
    workflow.updatedAt = new Date();

    this.workflows.set(workflowId, workflow);
    return newConnection;
  }

  async updateConnection(workflowId: string, connectionId: string, updates: Partial<WorkflowConnection>): Promise<WorkflowConnection> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const connectionIndex = workflow.connections.findIndex(c => c.id === connectionId);
    if (connectionIndex === -1) {
      throw new Error(`Connection ${connectionId} not found in workflow ${workflowId}`);
    }

    workflow.connections[connectionIndex] = {
      ...workflow.connections[connectionIndex],
      ...updates
    };

    workflow.updatedAt = new Date();
    this.workflows.set(workflowId, workflow);

    return workflow.connections[connectionIndex];
  }

  async deleteConnection(workflowId: string, connectionId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.connections = workflow.connections.filter(c => c.id !== connectionId);
    workflow.updatedAt = new Date();

    this.workflows.set(workflowId, workflow);
  }

  async validateConnection(workflowId: string, connection: Omit<WorkflowConnection, 'id'>): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
    const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);

    if (!sourceNode || !targetNode) {
      return false;
    }

    // Check if source output exists
    const sourceOutput = sourceNode.outputs.find(o => o.id === connection.sourceOutputId);
    if (!sourceOutput) {
      return false;
    }

    // Check if target input exists
    const targetInput = targetNode.inputs.find(i => i.id === connection.targetInputId);
    if (!targetInput) {
      return false;
    }

    // Check for cycles
    if (this.wouldCreateCycle(workflow, connection.sourceNodeId, connection.targetNodeId)) {
      return false;
    }

    return true;
  }

  // Workflow validation
  async validateWorkflow(workflowId: string): Promise<WorkflowValidationResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Validate each node
    for (const node of workflow.nodes) {
      const nodeResult = await this.validateNode(node);
      errors.push(...nodeResult.errors);
      warnings.push(...nodeResult.warnings);
      suggestions.push(...nodeResult.suggestions);
    }

    // Validate connections
    for (const connection of workflow.connections) {
      const sourceNode = workflow.nodes.find(n => n.id === connection.sourceNodeId);
      const targetNode = workflow.nodes.find(n => n.id === connection.targetNodeId);

      if (!sourceNode || !targetNode) {
        errors.push({
          type: 'connection',
          severity: 'error',
          message: 'Connection references non-existent node',
          connectionId: connection.id
        });
      }
    }

    // Check for disconnected nodes
    const connectedNodeIds = new Set([
      ...workflow.connections.map(c => c.sourceNodeId),
      ...workflow.connections.map(c => c.targetNodeId)
    ]);

    for (const node of workflow.nodes) {
      if (node.type !== WorkflowNodeType.TRIGGER && !connectedNodeIds.has(node.id)) {
        warnings.push({
          type: 'logic',
          message: `Node '${node.name}' is disconnected`,
          nodeId: node.id
        });
      }
    }

    // Check for multiple trigger nodes
    const triggerNodes = workflow.nodes.filter(n => n.type === WorkflowNodeType.TRIGGER);
    if (triggerNodes.length === 0) {
      errors.push({
        type: 'logic',
        severity: 'error',
        message: 'Workflow must have at least one trigger node'
      });
    } else if (triggerNodes.length > 1) {
      warnings.push({
        type: 'best-practice',
        message: 'Multiple trigger nodes detected - ensure this is intentional'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  async validateNode(node: WorkflowNode): Promise<NodeValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Validate required inputs
    for (const input of node.inputs) {
      if (input.required && !node.config[input.id]) {
        errors.push({
          type: 'configuration',
          severity: 'error',
          message: `Required input '${input.name}' is not configured`,
          nodeId: node.id,
          details: { inputId: input.id }
        });
      }
    }

    // Validate node-specific configuration
    switch (node.type) {
      case WorkflowNodeType.API:
        if (!node.config.url) {
          errors.push({
            type: 'configuration',
            severity: 'error',
            message: 'API node requires a URL',
            nodeId: node.id
          });
        }
        break;
      case WorkflowNodeType.DELAY:
        if (!node.config.duration || node.config.duration <= 0) {
          errors.push({
            type: 'configuration',
            severity: 'error',
            message: 'Delay node requires a positive duration',
            nodeId: node.id
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // Workflow execution
  async executeWorkflow(workflowId: string, input?: any, trigger?: any): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = uuidv4();
    const context: ExecutionContext = {
      id: executionId,
      workflowId,
      executionId,
      status: ExecutionStatus.PENDING,
      variables: { ...input },
      startTime: new Date(),
      logs: []
    };

    this.executions.set(executionId, context);

    // Start execution (simplified for now)
    this.executeWorkflowAsync(workflow, context);

    return executionId;
  }

  private async executeWorkflowAsync(workflow: Workflow, context: ExecutionContext): Promise<void> {
    context.status = ExecutionStatus.RUNNING;
    context.startTime = new Date();

    try {
      // Find trigger nodes and start execution
      const triggerNodes = workflow.nodes.filter(n => n.type === WorkflowNodeType.TRIGGER);

      for (const triggerNode of triggerNodes) {
        await this.executeNode(workflow, triggerNode, context);
      }

      context.status = ExecutionStatus.COMPLETED;
    } catch (error) {
      context.status = ExecutionStatus.FAILED;
      context.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();

      // Save to execution history
      const history = this.executionHistory.get(workflow.id) || [];
      history.push({
        id: uuidv4(),
        workflowId: workflow.id,
        executionId: context.executionId,
        status: context.status,
        startTime: context.startTime,
        endTime: context.endTime,
        duration: context.duration,
        input: context.variables,
        error: context.error,
        logs: context.logs
      });
      this.executionHistory.set(workflow.id, history);
    }
  }

  private async executeNode(workflow: Workflow, node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const startTime = new Date();
    context.currentNodeId = node.id;

    try {
      let result: any;

      switch (node.type) {
        case WorkflowNodeType.TRIGGER:
          result = { triggered: true, timestamp: new Date() };
          break;
        case WorkflowNodeType.ACTION:
          result = await this.executeActionNode(node, context);
          break;
        case WorkflowNodeType.CONDITION:
          result = await this.executeConditionNode(node, context);
          break;
        case WorkflowNodeType.API:
          result = await this.executeApiNode(node, context);
          break;
        case WorkflowNodeType.DELAY:
          result = await this.executeDelayNode(node, context);
          break;
        default:
          result = { executed: true };
      }

      context.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `Node ${node.name} executed successfully`,
        nodeId: node.id
      });

      return result;
    } catch (error) {
      context.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Node ${node.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nodeId: node.id
      });
      throw error;
    }
  }

  private async executeActionNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Placeholder for action node execution
    return { action: 'executed' };
  }

  private async executeConditionNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Placeholder for condition node execution
    return { condition: true };
  }

  private async executeApiNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    // Placeholder for API node execution
    return { response: 'api_response' };
  }

  private async executeDelayNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
    const duration = node.config.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
    return { delayed: duration };
  }

  async stopExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = ExecutionStatus.CANCELLED;
      execution.endTime = new Date();
    }
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    const execution = this.executions.get(executionId);
    return execution?.status || ExecutionStatus.PENDING;
  }

  async getExecutionHistory(workflowId: string, filters?: ExecutionFilters): Promise<ExecutionHistory[]> {
    let history = this.executionHistory.get(workflowId) || [];

    if (filters) {
      if (filters.status?.length) {
        history = history.filter(h => filters.status!.includes(h.status));
      }
      if (filters.dateRange) {
        history = history.filter(h =>
          h.startTime >= filters.dateRange!.start &&
          h.startTime <= filters.dateRange!.end
        );
      }
      if (filters.trigger) {
        history = history.filter(h => h.trigger?.type === filters.trigger);
      }
      if (filters.limit) {
        const offset = filters.offset || 0;
        history = history.slice(offset, offset + filters.limit);
      }
    }

    return history.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Template management
  async createTemplate(workflowId: string, templateData: Omit<WorkflowTemplate, 'id' | 'workflow' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const template: WorkflowTemplate = {
      ...templateData,
      id: uuidv4(),
      workflow,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(template.id, template);
    return template;
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(id) || null;
  }

  async listTemplates(filters?: TemplateFilters): Promise<WorkflowTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.category) {
        templates = templates.filter(t => t.category === filters.category);
      }
      if (filters.tags?.length) {
        templates = templates.filter(t => filters.tags!.some(tag => t.tags.includes(tag)));
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        templates = templates.filter(t =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower)
        );
      }
      if (filters.isPublic !== undefined) {
        templates = templates.filter(t => t.isPublic === filters.isPublic);
      }
      if (filters.author) {
        templates = templates.filter(t => t.author === filters.author);
      }
      if (filters.minRating) {
        templates = templates.filter(t => t.rating >= filters.minRating);
      }
    }

    return templates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async applyTemplate(templateId: string): Promise<Workflow> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const workflow = await this.createWorkflow(
      `${template.name} (from template)`,
      template.description
    );

    // Copy nodes and connections
    workflow.nodes = template.workflow.nodes.map(node => ({
      ...node,
      id: uuidv4() // Generate new IDs for nodes
    }));

    workflow.connections = template.workflow.connections.map(conn => ({
      ...conn,
      id: uuidv4(),
      sourceNodeId: this.getNewNodeId(conn.sourceNodeId, template.workflow.nodes, workflow.nodes),
      targetNodeId: this.getNewNodeId(conn.targetNodeId, template.workflow.nodes, workflow.nodes)
    }));

    await this.updateWorkflow(workflow.id, workflow);
    return workflow;
  }

  private getNewNodeId(oldId: string, oldNodes: WorkflowNode[], newNodes: WorkflowNode[]): string {
    const oldIndex = oldNodes.findIndex(n => n.id === oldId);
    return oldIndex >= 0 ? newNodes[oldIndex].id : oldId;
  }

  async rateTemplate(templateId: string, rating: number): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    template.rating = rating;
    template.updatedAt = new Date();
    this.templates.set(templateId, template);
  }

  // Node templates
  async registerNodeTemplate(template: NodeTemplate): Promise<void> {
    this.nodeTemplates.set(template.id, template);
  }

  async getNodeTemplates(): Promise<NodeTemplate[]> {
    return Array.from(this.nodeTemplates.values());
  }

  async getNodeTemplate(id: string): Promise<NodeTemplate | null> {
    return this.nodeTemplates.get(id) || null;
  }

  async unregisterNodeTemplate(id: string): Promise<void> {
    this.nodeTemplates.delete(id);
  }

  // Analytics
  async getWorkflowAnalytics(workflowId: string, period?: AnalyticsPeriod): Promise<WorkflowAnalytics> {
    // Placeholder implementation
    return {
      workflowId,
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      executionTrend: [],
      nodePerformance: [],
      errorAnalysis: [],
      usageStats: {
        lastUsed: new Date(),
        mostActiveHour: 0,
        dayOfWeekUsage: Array(7).fill(0)
      }
    };
  }

  async getSystemAnalytics(period?: AnalyticsPeriod): Promise<SystemAnalytics> {
    // Placeholder implementation
    return {
      totalWorkflows: this.workflows.size,
      activeWorkflows: Array.from(this.workflows.values()).filter(w => w.status === WorkflowStatus.ACTIVE).length,
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      popularNodes: [],
      systemHealth: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0
      },
      performanceMetrics: {
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        throughput: 0
      }
    };
  }

  // Import/Export
  async exportWorkflow(workflowId: string, format: 'json' | 'yaml' | 'xml'): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(workflow, null, 2);
      case 'yaml':
        // Placeholder for YAML export
        return JSON.stringify(workflow, null, 2);
      case 'xml':
        // Placeholder for XML export
        return JSON.stringify(workflow, null, 2);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async importWorkflow(data: string, format: 'json' | 'yaml' | 'xml'): Promise<Workflow> {
    let workflow: Workflow;

    try {
      switch (format) {
        case 'json':
          workflow = JSON.parse(data);
          break;
        case 'yaml':
          // Placeholder for YAML import
          workflow = JSON.parse(data);
          break;
        case 'xml':
          // Placeholder for XML import
          workflow = JSON.parse(data);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw new Error('Invalid workflow data');
    }

    // Generate new IDs
    workflow.id = uuidv4();
    workflow.nodes = workflow.nodes.map(node => ({
      ...node,
      id: uuidv4()
    }));
    workflow.connections = workflow.connections.map(conn => ({
      ...conn,
      id: uuidv4()
    }));

    workflow.createdAt = new Date();
    workflow.updatedAt = new Date();

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  // Helper methods
  private wouldCreateCycle(workflow: Workflow, sourceNodeId: string, targetNodeId: string): boolean {
    const visited = new Set<string>();
    const stack = [targetNodeId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceNodeId) {
        return true; // Cycle detected
      }

      if (visited.has(current)) {
        continue;
      }

      visited.add(current);

      // Find all nodes that have connections to current node
      const incomingConnections = workflow.connections.filter(c => c.targetNodeId === current);
      for (const conn of incomingConnections) {
        stack.push(conn.sourceNodeId);
      }
    }

    return false;
  }
}