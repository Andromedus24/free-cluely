import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowNodeType,
  ExecutionContext
} from '../types/WorkflowTypes';

export class WorkflowUtils {
  // Generate a unique ID for workflow components
  static generateId(prefix: string = 'wf'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Deep clone a workflow object
  static cloneWorkflow(workflow: Workflow): Workflow {
    return JSON.parse(JSON.stringify(workflow));
  }

  // Find all nodes of a specific type
  static findNodesByType(workflow: Workflow, type: WorkflowNodeType): WorkflowNode[] {
    return workflow.nodes.filter(node => node.type === type);
  }

  // Find all connections to/from a specific node
  static findConnectionsForNode(workflow: Workflow, nodeId: string): {
    incoming: WorkflowConnection[];
    outgoing: WorkflowConnection[];
  } {
    const incoming = workflow.connections.filter(conn => conn.targetNodeId === nodeId);
    const outgoing = workflow.connections.filter(conn => conn.sourceNodeId === nodeId);
    return { incoming, outgoing };
  }

  // Get the execution path from a trigger node
  static getExecutionPath(workflow: Workflow, startNodeId: string): WorkflowNode[] {
    const visited = new Set<string>();
    const path: WorkflowNode[] = [];
    const stack = [startNodeId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      const node = workflow.nodes.find(n => n.id === nodeId);
      if (node) {
        path.push(node);
      }

      // Find all outgoing connections
      const outgoing = workflow.connections.filter(conn => conn.sourceNodeId === nodeId);
      for (const conn of outgoing) {
        stack.push(conn.targetNodeId);
      }
    }

    return path;
  }

  // Check if a workflow has cycles
  static hasCycles(workflow: Workflow): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoing = workflow.connections.filter(conn => conn.sourceNodeId === nodeId);
      for (const conn of outgoing) {
        if (hasCycle(conn.targetNodeId)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (hasCycle(node.id)) return true;
    }

    return false;
  }

  // Get all isolated nodes (no connections)
  static getIsolatedNodes(workflow: Workflow): WorkflowNode[] {
    const connectedNodes = new Set<string>();

    workflow.connections.forEach(conn => {
      connectedNodes.add(conn.sourceNodeId);
      connectedNodes.add(conn.targetNodeId);
    });

    return workflow.nodes.filter(node => !connectedNodes.has(node.id));
  }

  // Calculate workflow complexity metrics
  static calculateComplexity(workflow: Workflow): {
    nodeCount: number;
    connectionCount: number;
    cyclomaticComplexity: number;
    depth: number;
    fanOut: Map<string, number>;
  } {
    const nodeCount = workflow.nodes.length;
    const connectionCount = workflow.connections.length;
    const cyclomaticComplexity = connectionCount - nodeCount + 2;

    // Calculate workflow depth (longest path)
    const depth = this.calculateWorkflowDepth(workflow);

    // Calculate fan-out for each node
    const fanOut = new Map<string, number>();
    workflow.nodes.forEach(node => {
      const outgoing = workflow.connections.filter(conn => conn.sourceNodeId === node.id);
      fanOut.set(node.id, outgoing.length);
    });

    return {
      nodeCount,
      connectionCount,
      cyclomaticComplexity,
      depth,
      fanOut
    };
  }

  // Calculate the maximum depth of the workflow
  private static calculateWorkflowDepth(workflow: Workflow): number {
    const depths = new Map<string, number>();

    const calculateDepth = (nodeId: string): number => {
      if (depths.has(nodeId)) return depths.get(nodeId)!;

      const incoming = workflow.connections.filter(conn => conn.targetNodeId === nodeId);
      if (incoming.length === 0) {
        depths.set(nodeId, 0);
        return 0;
      }

      let maxDepth = 0;
      for (const conn of incoming) {
        const sourceDepth = calculateDepth(conn.sourceNodeId);
        maxDepth = Math.max(maxDepth, sourceDepth + 1);
      }

      depths.set(nodeId, maxDepth);
      return maxDepth;
    };

    let maxDepth = 0;
    workflow.nodes.forEach(node => {
      maxDepth = Math.max(maxDepth, calculateDepth(node.id));
    });

    return maxDepth;
  }

  // Extract variables used in workflow configuration
  static extractVariables(workflow: Workflow): string[] {
    const variables = new Set<string>();

    workflow.nodes.forEach(node => {
      this.extractVariablesFromObject(node.config, variables);
      this.extractVariablesFromObject(node.metadata, variables);
    });

    workflow.connections.forEach(conn => {
      this.extractVariablesFromObject(conn.metadata, variables);
    });

    return Array.from(variables);
  }

  private static extractVariablesFromObject(obj: any, variables: Set<string>): void {
    if (typeof obj === 'string') {
      // Extract {{variable}} patterns
      const matches = obj.match(/\{\{([^}]+)\}\}/g);
      if (matches) {
        matches.forEach(match => {
          const variable = match.slice(2, -2).trim();
          variables.add(variable);
        });
      }
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => {
        this.extractVariablesFromObject(value, variables);
      });
    }
  }

  // Validate node configuration against schema
  static validateNodeConfig(node: WorkflowNode, schema: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!schema) {
      return { isValid: true, errors: [] };
    }

    // Check required properties
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach((prop: string) => {
        if (!(prop in node.config)) {
          errors.push(`Missing required property: ${prop}`);
        }
      });
    }

    // Check property types
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([prop, propSchema]: [string, any]) => {
        if (prop in node.config) {
          const value = node.config[prop];
          const expectedType = propSchema.type;
          const actualType = Array.isArray(value) ? 'array' : typeof value;

          if (expectedType && actualType !== expectedType) {
            errors.push(`Property '${prop}' should be ${expectedType}, got ${actualType}`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Format execution time in human-readable format
  static formatDuration(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(1)}s`;
    } else if (milliseconds < 3600000) {
      return `${(milliseconds / 60000).toFixed(1)}m`;
    } else {
      return `${(milliseconds / 3600000).toFixed(1)}h`;
    }
  }

  // Calculate workflow statistics
  static calculateWorkflowStats(workflows: Workflow[]): {
    totalWorkflows: number;
    activeWorkflows: number;
    averageNodeCount: number;
    averageConnectionCount: number;
    mostUsedNodeTypes: Array<{ type: WorkflowNodeType; count: number }>;
    workflowsByStatus: Record<string, number>;
  } {
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => w.status === 'active').length;

    const totalNodes = workflows.reduce((sum, w) => sum + w.nodes.length, 0);
    const totalConnections = workflows.reduce((sum, w) => sum + w.connections.length, 0);

    const averageNodeCount = totalWorkflows > 0 ? totalNodes / totalWorkflows : 0;
    const averageConnectionCount = totalWorkflows > 0 ? totalConnections / totalWorkflows : 0;

    // Count node types
    const nodeTypeCounts = new Map<WorkflowNodeType, number>();
    workflows.forEach(workflow => {
      workflow.nodes.forEach(node => {
        nodeTypeCounts.set(node.type, (nodeTypeCounts.get(node.type) || 0) + 1);
      });
    });

    const mostUsedNodeTypes = Array.from(nodeTypeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Count by status
    const workflowsByStatus: Record<string, number> = {};
    workflows.forEach(workflow => {
      workflowsByStatus[workflow.status] = (workflowsByStatus[workflow.status] || 0) + 1;
    });

    return {
      totalWorkflows,
      activeWorkflows,
      averageNodeCount,
      averageConnectionCount,
      mostUsedNodeTypes,
      workflowsByStatus
    };
  }

  // Generate workflow preview image (placeholder)
  static generatePreview(workflow: Workflow): string {
    // This would typically generate an SVG or canvas representation
    // For now, return a placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgZmlsbD0iI2Y1ZjVmNSIgc3Ryb2tlPSIjZGRkIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxMDAiIHk9Ijc1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiPldvcmtmbG93IFByZXZpZXc8L3RleHQ+Cjwvc3ZnPg==';
  }

  // Export workflow to different formats
  static exportWorkflow(workflow: Workflow, format: 'json' | 'yaml' | 'xml'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(workflow, null, 2);
      case 'yaml':
        // Simple YAML conversion (in production, use a proper YAML library)
        return this.objectToYaml(workflow);
      case 'xml':
        return this.objectToXml(workflow);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Simple YAML converter (placeholder)
  private static objectToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      obj.forEach(item => {
        yaml += `${spaces}- ${this.objectToYaml(item, indent + 1)}\n`;
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          yaml += `${spaces}${key}:\n${this.objectToYaml(value, indent + 1)}`;
        } else {
          yaml += `${spaces}${key}: ${value}\n`;
        }
      });
    } else {
      yaml += `${spaces}${obj}\n`;
    }

    return yaml;
  }

  // Simple XML converter (placeholder)
  private static objectToXml(obj: any, rootName: string = 'workflow'): string {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>`;

    const addObjectToXml = (obj: any, tagName: string): string => {
      if (Array.isArray(obj)) {
        return obj.map(item => addObjectToXml(item, tagName)).join('');
      } else if (typeof obj === 'object' && obj !== null) {
        let innerXml = '';
        Object.entries(obj).forEach(([key, value]) => {
          innerXml += addObjectToXml(value, key);
        });
        return `<${tagName}>${innerXml}</${tagName}>`;
      } else {
        return `<${tagName}>${obj}</${tagName}>`;
      }
    };

    xml += addObjectToXml(obj, 'workflow');
    xml += `</${rootName}>`;
    return xml;
  }

  // Safe execution wrapper
  static async safeExecution<T>(
    fn: () => Promise<T>,
    context: ExecutionContext,
    errorMessage: string = 'Execution failed'
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : errorMessage;
      context.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: errorMsg
      });
      throw error;
    }
  }

  // Template string replacement
  static replaceTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return variables[trimmedKey] !== undefined ? String(variables[trimmedKey]) : match;
    });
  }

  // Debounce function for workflow execution
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  // Throttle function for workflow execution
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}