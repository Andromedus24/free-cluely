import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  ExecutionContext,
  ExecutionStatus,
  WorkflowNodeType
} from '../types/WorkflowTypes';

export interface ConditionalExpression {
  id: string;
  type: 'simple' | 'compound' | 'script';
  operator?: 'equals' | 'not-equals' | 'greater' | 'less' | 'contains' | 'starts-with' | 'ends-with' | 'regex';
  left: string;
  right?: string;
  logic?: 'and' | 'or' | 'not';
  children?: ConditionalExpression[];
  script?: string;
}

export interface BranchPath {
  id: string;
  name: string;
  condition: ConditionalExpression;
  priority: number;
  isDefault?: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface LoopConfig {
  type: 'for-each' | 'while' | 'for' | 'do-while';
  condition: ConditionalExpression;
  collection?: string;
  startIndex?: number;
  endIndex?: number;
  step?: number;
  maxIterations?: number;
  breakConditions?: ConditionalExpression[];
  continueConditions?: ConditionalExpression[];
}

export class ConditionalLogicEngine {
  private variables: Map<string, any> = new Map();
  private context: ExecutionContext;

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  // Evaluate a conditional expression
  async evaluateCondition(expression: ConditionalExpression, variables: Record<string, any>): Promise<boolean> {
    try {
      switch (expression.type) {
        case 'simple':
          return this.evaluateSimpleCondition(expression, variables);
        case 'compound':
          return this.evaluateCompoundCondition(expression, variables);
        case 'script':
          return this.evaluateScriptCondition(expression, variables);
        default:
          return false;
      }
    } catch (error) {
      this.context.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Error evaluating condition: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return false;
    }
  }

  private evaluateSimpleCondition(expression: ConditionalExpression, variables: Record<string, any>): boolean {
    const leftValue = this.resolveValue(expression.left, variables);
    const rightValue = expression.right ? this.resolveValue(expression.right, variables) : undefined;

    if (expression.operator && rightValue !== undefined) {
      switch (expression.operator) {
        case 'equals':
          return leftValue === rightValue;
        case 'not-equals':
          return leftValue !== rightValue;
        case 'greater':
          return Number(leftValue) > Number(rightValue);
        case 'less':
          return Number(leftValue) < Number(rightValue);
        case 'contains':
          return String(leftValue).includes(String(rightValue));
        case 'starts-with':
          return String(leftValue).startsWith(String(rightValue));
        case 'ends-with':
          return String(leftValue).endsWith(String(rightValue));
        case 'regex':
          try {
            const regex = new RegExp(String(rightValue));
            return regex.test(String(leftValue));
          } catch {
            return false;
          }
        default:
          return false;
      }
    }

    // Truthy/falsy evaluation
    return Boolean(leftValue);
  }

  private evaluateCompoundCondition(expression: ConditionalExpression, variables: Record<string, any>): boolean {
    if (!expression.children || expression.children.length === 0) {
      return false;
    }

    const results = await Promise.all(
      expression.children.map(child => this.evaluateCondition(child, variables))
    );

    switch (expression.logic) {
      case 'and':
        return results.every(result => result);
      case 'or':
        return results.some(result => result);
      case 'not':
        return !results[0];
      default:
        return results[0];
    }
  }

  private evaluateScriptCondition(expression: ConditionalExpression, variables: Record<string, any>): boolean {
    if (!expression.script) {
      return false;
    }

    try {
      // Create a safe execution context
      const func = new Function('variables', 'context', `
        "use strict";
        ${expression.script}
      `);

      const result = func(variables, this.context);
      return Boolean(result);
    } catch (error) {
      this.context.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Script execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return false;
    }
  }

  private resolveValue(path: string, variables: Record<string, any>): any {
    // Handle template variables {{variable.path}}
    if (path.startsWith('{{') && path.endsWith('}}')) {
      const variablePath = path.slice(2, -2).trim();
      return this.getNestedValue(variablePath, variables);
    }

    // Handle direct variable references
    if (variables.hasOwnProperty(path)) {
      return variables[path];
    }

    // Handle literal values
    if (path.startsWith('"') && path.endsWith('"')) {
      return path.slice(1, -1);
    }
    if (path.startsWith("'") && path.endsWith("'")) {
      return path.slice(1, -1);
    }
    if (!isNaN(Number(path))) {
      return Number(path);
    }
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

  // Execute branching logic
  async executeBranching(
    workflow: Workflow,
    startNodeId: string,
    variables: Record<string, any>
  ): Promise<{ branchId: string; result: any }> {
    const startNode = workflow.nodes.find(n => n.id === startNodeId);
    if (!startNode || startNode.type !== WorkflowNodeType.CONDITION) {
      throw new Error('Invalid start node for branching');
    }

    const branches = this.parseBranches(workflow, startNodeId);
    let executedBranch: BranchPath | null = null;

    // Find the first matching branch
    for (const branch of branches.sort((a, b) => b.priority - a.priority)) {
      const conditionMet = await this.evaluateCondition(branch.condition, variables);

      if (conditionMet) {
        executedBranch = branch;
        break;
      }
    }

    // If no branch matched, use default if available
    if (!executedBranch) {
      executedBranch = branches.find(b => b.isDefault);
    }

    if (!executedBranch) {
      throw new Error('No matching branch found and no default branch available');
    }

    // Execute the selected branch
    const result = await this.executeBranch(workflow, executedBranch, variables);

    return {
      branchId: executedBranch.id,
      result
    };
  }

  private parseBranches(workflow: Workflow, conditionNodeId: string): BranchPath[] {
    const branches: BranchPath[] = [];
    const outgoingConnections = workflow.connections.filter(c => c.sourceNodeId === conditionNodeId);

    outgoingConnections.forEach((conn, index) => {
      const branchCondition = this.parseConnectionCondition(conn);
      branches.push({
        id: `branch-${index}`,
        name: branchCondition.name || `Branch ${index + 1}`,
        condition: branchCondition.expression,
        priority: branchCondition.priority || 0,
        isDefault: branchCondition.isDefault,
        nodes: this.getBranchNodes(workflow, conn.targetNodeId),
        connections: this.getBranchConnections(workflow, conn.targetNodeId)
      });
    });

    return branches;
  }

  private parseConnectionCondition(connection: WorkflowConnection): {
    expression: ConditionalExpression;
    name?: string;
    priority?: number;
    isDefault?: boolean;
  } {
    const condition = connection.condition || 'true';

    // Parse simple conditions like "status === 'success'"
    if (condition.includes('===') || condition.includes('!==') ||
        condition.includes('>') || condition.includes('<') ||
        condition.includes('>=') || condition.includes('<=')) {

      const operators = ['===', '!==', '>=', '<=', '>', '<'];
      let operator = '';
      let parts: string[] = [];

      for (const op of operators) {
        if (condition.includes(op)) {
          operator = op;
          parts = condition.split(op).map(p => p.trim());
          break;
        }
      }

      if (parts.length === 2) {
        return {
          expression: {
            id: `cond-${connection.id}`,
            type: 'simple',
            operator: this.mapOperator(operator),
            left: parts[0],
            right: parts[1]
          }
        };
      }
    }

    // Default to simple true condition
    return {
      expression: {
        id: `cond-${connection.id}`,
        type: 'simple',
        left: 'true',
        isDefault: true
      }
    };
  }

  private mapOperator(operator: string): ConditionalExpression['operator'] {
    const mapping: Record<string, ConditionalExpression['operator']> = {
      '===': 'equals',
      '!==': 'not-equals',
      '>': 'greater',
      '<': 'less',
      '>=': 'greater',
      '<=': 'less'
    };
    return mapping[operator] || 'equals';
  }

  private getBranchNodes(workflow: Workflow, startNodeId: string): WorkflowNode[] {
    const nodes: WorkflowNode[] = [];
    const visited = new Set<string>();
    const stack = [startNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node) {
        nodes.push(node);
      }

      // Find outgoing connections
      const outgoing = workflow.connections.filter(c => c.sourceNodeId === nodeId);
      for (const conn of outgoing) {
        // Stop at next condition node or merge point
        const targetNode = workflow.nodes.find(n => n.id === conn.targetNodeId);
        if (targetNode && targetNode.type !== WorkflowNodeType.CONDITION) {
          stack.push(conn.targetNodeId);
        }
      }
    }

    return nodes;
  }

  private getBranchConnections(workflow: Workflow, startNodeId: string): WorkflowConnection[] {
    const nodeIds = this.getBranchNodes(workflow, startNodeId).map(n => n.id);
    return workflow.connections.filter(conn =>
      nodeIds.includes(conn.sourceNodeId) && nodeIds.includes(conn.targetNodeId)
    );
  }

  private async executeBranch(
    workflow: Workflow,
    branch: BranchPath,
    variables: Record<string, any>
  ): Promise<any> {
    const branchVariables = { ...variables };
    let result: any = null;

    for (const node of branch.nodes) {
      const nodeResult = await this.executeNode(workflow, node, branchVariables);
      if (nodeResult !== undefined) {
        result = nodeResult;
      }
    }

    return result;
  }

  private async executeNode(
    workflow: Workflow,
    node: WorkflowNode,
    variables: Record<string, any>
  ): Promise<any> {
    // This would integrate with the existing workflow execution engine
    // For now, return a placeholder result
    this.context.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: `Executing node: ${node.name}`,
      nodeId: node.id
    });

    return { executed: true, nodeId: node.id };
  }

  // Execute loop logic
  async executeLoop(
    workflow: Workflow,
    loopNodeId: string,
    variables: Record<string, any>
  ): Promise<{ iterations: number; results: any[] }> {
    const loopNode = workflow.nodes.find(n => n.id === loopNodeId);
    if (!loopNode) {
      throw new Error(`Loop node ${loopNodeId} not found`);
    }

    const loopConfig = this.parseLoopConfig(loopNode);
    const results: any[] = [];
    let iteration = 0;

    while (await this.shouldContinueLoop(loopConfig, variables, iteration)) {
      iteration++;

      if (loopConfig.maxIterations && iteration > loopConfig.maxIterations) {
        this.context.logs.push({
          timestamp: new Date(),
          level: 'warn',
          message: `Loop exceeded maximum iterations (${loopConfig.maxIterations})`
        });
        break;
      }

      // Check break conditions
      if (await this.shouldBreakLoop(loopConfig, variables, iteration)) {
        this.context.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Loop break condition met at iteration ${iteration}`
        });
        break;
      }

      // Execute loop body
      const loopBody = this.getLoopBody(workflow, loopNodeId);
      const result = await this.executeBranch(workflow, {
        id: `loop-iteration-${iteration}`,
        name: `Iteration ${iteration}`,
        condition: { id: 'true', type: 'simple', left: 'true' },
        priority: 0,
        nodes: loopBody.nodes,
        connections: loopBody.connections
      }, variables);

      results.push(result);

      // Update iteration variables
      this.updateIterationVariables(loopConfig, variables, iteration, result);

      // Check continue conditions
      if (await this.shouldContinueLoop(loopConfig, variables, iteration)) {
        continue;
      }
    }

    return { iterations: iteration, results };
  }

  private parseLoopConfig(node: WorkflowNode): LoopConfig {
    const config = node.config || {};

    return {
      type: config.type || 'while',
      condition: config.condition || { id: 'true', type: 'simple', left: 'true' },
      collection: config.collection,
      startIndex: config.startIndex || 0,
      endIndex: config.endIndex,
      step: config.step || 1,
      maxIterations: config.maxIterations,
      breakConditions: config.breakConditions || [],
      continueConditions: config.continueConditions || []
    };
  }

  private async shouldContinueLoop(
    config: LoopConfig,
    variables: Record<string, any>,
    iteration: number
  ): Promise<boolean> {
    switch (config.type) {
      case 'for-each':
        if (!config.collection) return false;
        const collection = this.resolveValue(config.collection, variables);
        return Array.isArray(collection) && iteration <= collection.length;

      case 'for':
        if (config.endIndex === undefined) return false;
        return iteration <= config.endIndex;

      case 'while':
      case 'do-while':
        return await this.evaluateCondition(config.condition, variables);

      default:
        return false;
    }
  }

  private async shouldBreakLoop(
    config: LoopConfig,
    variables: Record<string, any>,
    iteration: number
  ): Promise<boolean> {
    for (const condition of config.breakConditions || []) {
      if (await this.evaluateCondition(condition, variables)) {
        return true;
      }
    }
    return false;
  }

  private getLoopBody(workflow: Workflow, loopNodeId: string): BranchPath {
    // Find nodes that are part of the loop body
    // This is a simplified implementation - in practice, you'd need more sophisticated loop detection
    const outgoing = workflow.connections.find(c => c.sourceNodeId === loopNodeId);
    if (!outgoing) {
      return { id: 'empty', name: 'Empty Loop', condition: { id: 'true', type: 'simple', left: 'true' }, priority: 0, nodes: [], connections: [] };
    }

    return {
      id: 'loop-body',
      name: 'Loop Body',
      condition: { id: 'true', type: 'simple', left: 'true' },
      priority: 0,
      nodes: this.getBranchNodes(workflow, outgoing.targetNodeId),
      connections: this.getBranchConnections(workflow, outgoing.targetNodeId)
    };
  }

  private updateIterationVariables(
    config: LoopConfig,
    variables: Record<string, any>,
    iteration: number,
    result: any
  ): void {
    variables['iteration'] = iteration;
    variables['index'] = iteration - 1;
    variables['result'] = result;

    if (config.type === 'for-each' && config.collection) {
      const collection = this.resolveValue(config.collection, variables);
      if (Array.isArray(collection) && iteration <= collection.length) {
        variables['item'] = collection[iteration - 1];
      }
    }
  }

  // Utility methods for condition building
  static createSimpleCondition(
    left: string,
    operator: ConditionalExpression['operator'],
    right: string
  ): ConditionalExpression {
    return {
      id: `cond-${Date.now()}`,
      type: 'simple',
      operator,
      left,
      right
    };
  }

  static createCompoundCondition(
    logic: 'and' | 'or' | 'not',
    children: ConditionalExpression[]
  ): ConditionalExpression {
    return {
      id: `compound-${Date.now()}`,
      type: 'compound',
      logic,
      children
    };
  }

  static createScriptCondition(script: string): ConditionalExpression {
    return {
      id: `script-${Date.now()}`,
      type: 'script',
      left: 'script',
      script
    };
  }
}