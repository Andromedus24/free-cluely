import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  ExecutionContext,
  ExecutionStatus,
  NodeExecutionResult,
  WorkflowNodeType
} from '../types/WorkflowTypes';
import { ConditionalLogicEngine } from './ConditionalLogic';

export interface ExecutionOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  debugMode?: boolean;
  dryRun?: boolean;
  maxConcurrency?: number;
}

export interface ExecutionEvent {
  type: 'start' | 'complete' | 'error' | 'node_start' | 'node_complete' | 'node_error' | 'pause' | 'resume';
  executionId: string;
  nodeId?: string;
  timestamp: Date;
  data?: any;
}

export class WorkflowExecutionEngine extends EventEmitter {
  private executions: Map<string, ExecutionContext> = new Map();
  private activeExecutions: Set<string> = new Set();
  private executionQueue: Array<{ workflowId: string; input?: any; options?: ExecutionOptions }> = [];
  private isProcessingQueue = false;
  private conditionalEngine: ConditionalLogicEngine;

  constructor() {
    super();
    this.conditionalEngine = new ConditionalLogicEngine({} as ExecutionContext);
  }

  // Execute a workflow
  async executeWorkflow(
    workflow: Workflow,
    input?: any,
    options: ExecutionOptions = {}
  ): Promise<string> {
    const executionId = uuidv4();

    // Create execution context
    const context: ExecutionContext = {
      id: executionId,
      workflowId: workflow.id,
      executionId,
      status: ExecutionStatus.PENDING,
      variables: { ...input, ...workflow.variables.reduce((acc, v) => ({ ...acc, [v.name]: v.defaultValue }), {}) },
      startTime: new Date(),
      logs: []
    };

    this.executions.set(executionId, context);

    // Add to execution queue
    this.executionQueue.push({
      workflowId: workflow.id,
      input,
      options
    });

    // Start processing queue if not already running
    if (!this.isProcessingQueue) {
      this.processExecutionQueue();
    }

    this.emitEvent({
      type: 'start',
      executionId,
      timestamp: new Date(),
      data: { workflowId: workflow.id, input }
    });

    return executionId;
  }

  // Stop a running execution
  async stopExecution(executionId: string): Promise<void> {
    const context = this.executions.get(executionId);
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (context.status === ExecutionStatus.RUNNING) {
      context.status = ExecutionStatus.CANCELLED;
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();

      this.activeExecutions.delete(executionId);

      this.emitEvent({
        type: 'pause',
        executionId,
        timestamp: new Date()
      });
    }
  }

  // Get execution status
  async getExecutionStatus(executionId: string): Promise<ExecutionStatus> {
    const context = this.executions.get(executionId);
    return context?.status || ExecutionStatus.PENDING;
  }

  // Get execution context
  async getExecutionContext(executionId: string): Promise<ExecutionContext | null> {
    return this.executions.get(executionId) || null;
  }

  // Process execution queue
  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    while (this.executionQueue.length > 0) {
      const { workflowId, input, options } = this.executionQueue.shift()!;

      // Check concurrency limit
      if (options.maxConcurrency && this.activeExecutions.size >= options.maxConcurrency) {
        // Re-queue for later
        this.executionQueue.unshift({ workflowId, input, options });
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Execute workflow
      this.executeWorkflowInternal(workflowId, input, options).catch(error => {
        console.error('Workflow execution failed:', error);
      });
    }

    this.isProcessingQueue = false;
  }

  // Internal workflow execution
  private async executeWorkflowInternal(
    workflowId: string,
    input?: any,
    options: ExecutionOptions = {}
  ): Promise<void> {
    // In a real implementation, you would fetch the workflow from a service
    // For now, we'll assume we have access to it
    const workflow = await this.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const executionId = this.getActiveExecutionForWorkflow(workflowId);
    if (!executionId) {
      throw new Error(`No active execution found for workflow ${workflowId}`);
    }

    const context = this.executions.get(executionId)!;
    context.status = ExecutionStatus.RUNNING;
    this.activeExecutions.add(executionId);

    try {
      if (options.dryRun) {
        await this.executeDryRun(workflow, context, options);
      } else {
        await this.executeNodes(workflow, context, options);
      }

      context.status = ExecutionStatus.COMPLETED;
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();

      this.emitEvent({
        type: 'complete',
        executionId,
        timestamp: new Date(),
        data: { result: context.variables, duration: context.duration }
      });
    } catch (error) {
      context.status = ExecutionStatus.FAILED;
      context.error = error instanceof Error ? error.message : 'Unknown error';
      context.endTime = new Date();
      context.duration = context.endTime.getTime() - context.startTime.getTime();

      this.emitEvent({
        type: 'error',
        executionId,
        timestamp: new Date(),
        data: { error: context.error }
      });
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  // Execute workflow nodes
  private async executeNodes(
    workflow: Workflow,
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<void> {
    const visitedNodes = new Set<string>();
    const executionStack: string[] = [];

    // Find trigger nodes to start execution
    const triggerNodes = workflow.nodes.filter(n => n.type === WorkflowNodeType.TRIGGER);
    if (triggerNodes.length === 0) {
      throw new Error('Workflow must have at least one trigger node');
    }

    // Start with trigger nodes
    for (const triggerNode of triggerNodes) {
      executionStack.push(triggerNode.id);
    }

    while (executionStack.length > 0) {
      const nodeId = executionStack.pop()!;

      if (visitedNodes.has(nodeId)) {
        continue;
      }

      visitedNodes.add(nodeId);
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Execute node with retries
      const result = await this.executeNodeWithRetry(node, context, options);

      // Find next nodes to execute
      const nextNodes = this.findNextNodes(workflow, nodeId, result, context.variables);
      executionStack.push(...nextNodes);
    }
  }

  // Execute a single node with retry logic
  private async executeNodeWithRetry(
    node: WorkflowNode,
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<NodeExecutionResult> {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= maxRetries) {
      attempt++;
      context.currentNodeId = node.id;

      this.emitEvent({
        type: 'node_start',
        executionId: context.executionId,
        nodeId: node.id,
        timestamp: new Date(),
        data: { attempt }
      });

      try {
        const result = await this.executeNode(node, context, options);

        this.emitEvent({
          type: 'node_complete',
          executionId: context.executionId,
          nodeId: node.id,
          timestamp: new Date(),
          data: { result, duration: result.duration, attempt }
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        context.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `Node ${node.name} failed (attempt ${attempt}): ${lastError.message}`,
          nodeId: node.id
        });

        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    // All retries failed
    this.emitEvent({
      type: 'node_error',
      executionId: context.executionId,
      nodeId: node.id,
      timestamp: new Date(),
      data: { error: lastError?.message, attempts: attempt }
    });

    throw lastError || new Error(`Node ${node.name} failed after ${maxRetries} retries`);
  }

  // Execute a single node
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext,
    options: ExecutionOptions
  ): Promise<NodeExecutionResult> {
    const startTime = new Date();

    // Check timeout
    if (options.timeout) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Node ${node.name} timed out after ${options.timeout}ms`)), options.timeout);
      });

      return Promise.race([this.executeNodeLogic(node, context), timeoutPromise]) as Promise<NodeExecutionResult>;
    }

    return this.executeNodeLogic(node, context);
  }

  // Execute node logic based on type
  private async executeNodeLogic(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const startTime = new Date();

    switch (node.type) {
      case WorkflowNodeType.TRIGGER:
        return await this.executeTriggerNode(node, context);
      case WorkflowNodeType.ACTION:
        return await this.executeActionNode(node, context);
      case WorkflowNodeType.CONDITION:
        return await this.executeConditionNode(node, context);
      case WorkflowNodeType.LOOP:
        return await this.executeLoopNode(node, context);
      case WorkflowNodeType.PARALLEL:
        return await this.executeParallelNode(node, context);
      case WorkflowNodeType.DELAY:
        return await this.executeDelayNode(node, context);
      case WorkflowNodeType.TRANSFORM:
        return await this.executeTransformNode(node, context);
      case WorkflowNodeType.API:
        return await this.executeApiNode(node, context);
      case WorkflowNodeType.PLUGIN:
        return await this.executePluginNode(node, context);
      default:
        return await this.executeCustomNode(node, context);
    }
  }

  // Node execution methods
  private async executeTriggerNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    // Trigger nodes just pass through with metadata
    const result = {
      triggered: true,
      triggerType: node.config.type || 'manual',
      timestamp: new Date().toISOString()
    };

    context.variables.triggerResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeActionNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    // Execute action based on configuration
    const action = node.config.action || 'log';
    let result: any;

    switch (action) {
      case 'log':
        console.log(`[Workflow] ${node.config.message || 'Action executed'}`);
        result = { logged: true };
        break;
      case 'email':
        // Placeholder for email sending
        result = { sent: true, messageId: `msg_${Date.now()}` };
        break;
      case 'notification':
        // Placeholder for notification sending
        result = { sent: true, delivered: true };
        break;
      default:
        result = { executed: true, action };
    }

    context.variables.actionResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeConditionNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    // Parse and evaluate condition
    const condition = node.config.condition || 'true';
    let result: any;

    try {
      // Simple condition evaluation
      const conditionResult = this.evaluateSimpleCondition(condition, context.variables);
      result = { conditionMet: conditionResult, condition };
    } catch (error) {
      throw new Error(`Condition evaluation failed: ${error}`);
    }

    context.variables.conditionResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeLoopNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    const loopType = node.config.type || 'while';
    const maxIterations = node.config.maxIterations || 100;
    const results: any[] = [];
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;

      if (loopType === 'for-each') {
        const collection = this.resolveValue(node.config.collection, context.variables);
        if (!Array.isArray(collection) || iteration > collection.length) {
          break;
        }
        context.variables.item = collection[iteration - 1];
      }

      // Execute loop body (simplified - in practice, this would be more complex)
      const loopResult = { iteration, item: context.variables.item };
      results.push(loopResult);
      context.variables.loopResult = loopResult;

      // Check break condition
      if (node.config.breakCondition) {
        const shouldBreak = this.evaluateSimpleCondition(node.config.breakCondition, context.variables);
        if (shouldBreak) break;
      }
    }

    const result = { iterations: iteration, results };

    context.variables.loopResults = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeParallelNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    const tasks = node.config.tasks || [];
    const maxConcurrency = node.config.maxConcurrency || 3;
    const results: any[] = [];

    // Execute tasks in parallel with concurrency limit
    for (let i = 0; i < tasks.length; i += maxConcurrency) {
      const batch = tasks.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map(task => this.executeParallelTask(task, context))
      );
      results.push(...batchResults);
    }

    const result = { completed: results.length, results };

    context.variables.parallelResults = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeDelayNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    const duration = node.config.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));

    const result = { delayed: duration, timestamp: new Date().toISOString() };

    context.variables.delayResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeTransformNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    const input = this.resolveValue(node.config.input, context.variables);
    const transform = node.config.transform || 'identity';
    let result: any;

    switch (transform) {
      case 'json':
        try {
          result = JSON.parse(JSON.stringify(input));
        } catch {
          result = input;
        }
        break;
      case 'uppercase':
        result = String(input).toUpperCase();
        break;
      case 'lowercase':
        result = String(input).toLowerCase();
        break;
      default:
        result = input;
    }

    context.variables.transformResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeApiNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    // Placeholder for API execution
    const result = {
      method: node.config.method || 'GET',
      url: node.config.url || '',
      status: 200,
      data: { success: true }
    };

    context.variables.apiResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executePluginNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    // Placeholder for plugin execution
    const result = {
      plugin: node.config.plugin || 'unknown',
      executed: true,
      output: node.config.output || {}
    };

    context.variables.pluginResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  private async executeCustomNode(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = new Date();

    // Execute custom node logic
    const result = {
      custom: true,
      nodeId: node.id,
      executed: true
    };

    context.variables.customResult = result;

    return {
      nodeId: node.id,
      status: ExecutionStatus.COMPLETED,
      startTime,
      endTime: new Date(),
      duration: new Date().getTime() - startTime.getTime(),
      output: result
    };
  }

  // Helper methods
  private executeDryRun(workflow: Workflow, context: ExecutionContext, options: ExecutionOptions): Promise<void> {
    // Simulate execution without actually running nodes
    return new Promise((resolve) => {
      setTimeout(() => {
        context.status = ExecutionStatus.COMPLETED;
        context.endTime = new Date();
        context.duration = context.endTime.getTime() - context.startTime.getTime();
        resolve();
      }, 100);
    });
  }

  private async executeParallelTask(task: any, context: ExecutionContext): Promise<any> {
    // Placeholder for parallel task execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    return { taskId: task.id, completed: true };
  }

  private findNextNodes(
    workflow: Workflow,
    currentNodeId: string,
    currentNodeResult: any,
    variables: Record<string, any>
  ): string[] {
    const connections = workflow.connections.filter(c => c.sourceNodeId === currentNodeId);
    const nextNodes: string[] = [];

    for (const connection of connections) {
      // Check connection condition
      if (connection.condition) {
        try {
          const conditionMet = this.evaluateSimpleCondition(connection.condition, variables);
          if (!conditionMet) continue;
        } catch {
          continue;
        }
      }

      nextNodes.push(connection.targetNodeId);
    }

    return nextNodes;
  }

  private evaluateSimpleCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple condition evaluation (in production, use a proper expression evaluator)
    try {
      // Handle basic comparisons
      if (condition.includes('===')) {
        const [left, right] = condition.split('===').map(s => s.trim());
        const leftValue = this.resolveValue(left, variables);
        const rightValue = this.resolveValue(right, variables);
        return leftValue === rightValue;
      }

      // Handle truthy/falsy evaluation
      const value = this.resolveValue(condition, variables);
      return Boolean(value);
    } catch {
      return false;
    }
  }

  private resolveValue(path: string, variables: Record<string, any>): any {
    // Handle template variables
    if (path.startsWith('{{') && path.endsWith('}}')) {
      const variablePath = path.slice(2, -2).trim();
      return this.getNestedValue(variablePath, variables);
    }

    // Handle direct variable access
    if (variables.hasOwnProperty(path)) {
      return variables[path];
    }

    // Handle literals
    if (path.startsWith('"') && path.endsWith('"')) return path.slice(1, -1);
    if (path.startsWith("'") && path.endsWith("'")) return path.slice(1, -1);
    if (!isNaN(Number(path))) return Number(path);
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;

    return path;
  }

  private getNestedValue(path: string, obj: any): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private getActiveExecutionForWorkflow(workflowId: string): string | null {
    for (const [executionId, context] of this.executions) {
      if (context.workflowId === workflowId && context.status === ExecutionStatus.RUNNING) {
        return executionId;
      }
    }
    return null;
  }

  private async getWorkflow(workflowId: string): Promise<Workflow | null> {
    // Placeholder - in practice, fetch from workflow service
    return null;
  }

  private emitEvent(event: ExecutionEvent): void {
    this.emit('execution', event);
  }

  // Public methods for monitoring
  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions);
  }

  getExecutionQueue(): Array<{ workflowId: string; input?: any; options?: ExecutionOptions }> {
    return [...this.executionQueue];
  }

  clearExecutionHistory(): void {
    const completedExecutions = Array.from(this.executions.entries())
      .filter(([_, context]) =>
        context.status === ExecutionStatus.COMPLETED ||
        context.status === ExecutionStatus.FAILED ||
        context.status === ExecutionStatus.CANCELLED
      )
      .map(([id]) => id);

    completedExecutions.forEach(id => this.executions.delete(id));
  }
}