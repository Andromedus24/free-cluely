import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowTemplate,
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowNodeType
} from '../types/WorkflowTypes';

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export interface TemplateSearchFilters {
  category?: string;
  tags?: string[];
  search?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  type?: 'automation' | 'integration' | 'notification' | 'data-processing';
  rating?: number;
  isPublic?: boolean;
  author?: string;
}

export class WorkflowTemplateLibrary {
  private templates: Map<string, WorkflowTemplate> = new Map();
  private categories: Map<string, TemplateCategory> = new Map();
  private usageStats: Map<string, { usageCount: number; lastUsed: Date }> = new Map();

  constructor() {
    this.initializeCategories();
    this.initializeBuiltInTemplates();
  }

  // Initialize template categories
  private initializeCategories(): void {
    const categories: TemplateCategory[] = [
      {
        id: 'automation',
        name: 'Automation',
        description: 'Automate repetitive tasks and processes',
        icon: '🤖',
        color: '#3b82f6'
      },
      {
        id: 'integration',
        name: 'Integration',
        description: 'Connect different services and APIs',
        icon: '🔗',
        color: '#10b981'
      },
      {
        id: 'notification',
        name: 'Notification',
        description: 'Send alerts and notifications',
        icon: '📢',
        color: '#f59e0b'
      },
      {
        id: 'data-processing',
        name: 'Data Processing',
        description: 'Transform and analyze data',
        icon: '📊',
        color: '#8b5cf6'
      },
      {
        id: 'webhooks',
        name: 'Webhooks',
        description: 'Handle incoming webhooks',
        icon: '🪝',
        color: '#ef4444'
      },
      {
        id: 'scheduling',
        name: 'Scheduling',
        description: 'Time-based workflow triggers',
        icon: '⏰',
        color: '#06b6d4'
      }
    ];

    categories.forEach(category => {
      this.categories.set(category.id, category);
    });
  }

  // Initialize built-in templates
  private initializeBuiltInTemplates(): void {
    const builtInTemplates = this.createBuiltInTemplates();
    builtInTemplates.forEach(template => {
      this.templates.set(template.id, template);
      this.usageStats.set(template.id, { usageCount: 0, lastUsed: new Date() });
    });
  }

  // Create built-in workflow templates
  private createBuiltInTemplates(): WorkflowTemplate[] {
    return [
      // Email Notification Template
      {
        id: 'email-notification',
        name: 'Email Notification',
        description: 'Send email notifications when triggered',
        category: 'notification',
        version: '1.0.0',
        tags: ['email', 'notification', 'automation'],
        icon: '📧',
        preview: 'data:image/svg+xml;base64,...',
        workflow: this.createEmailNotificationWorkflow(),
        documentation: `
# Email Notification Workflow

This template creates a simple workflow that sends email notifications when triggered.

## Features
- HTTP trigger endpoint
- Email sending with customizable content
- Support for attachments
- Error handling and retry logic

## Usage
1. Deploy the workflow
2. Call the HTTP endpoint with your data
3. Email will be sent automatically

## Configuration
- SMTP server settings
- Email template
- Recipient list
        `,
        author: 'Atlas Team',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // API Integration Template
      {
        id: 'api-integration',
        name: 'API Integration',
        description: 'Connect external APIs and process responses',
        category: 'integration',
        version: '1.0.0',
        tags: ['api', 'integration', 'rest'],
        icon: '🌐',
        preview: 'data:image/svg+xml;base64,...',
        workflow: this.createApiIntegrationWorkflow(),
        documentation: `
# API Integration Workflow

This template provides a foundation for integrating with external APIs.

## Features
- HTTP request handling
- Response processing
- Error handling
- Data transformation
- Retry logic

## Usage
1. Configure API endpoint and authentication
2. Set up request/response mapping
3. Deploy and test the integration

## Configuration
- API endpoint URL
- Authentication method
- Request/response mapping
- Error handling rules
        `,
        author: 'Atlas Team',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Scheduled Report Template
      {
        id: 'scheduled-report',
        name: 'Scheduled Report',
        description: 'Generate and send reports on a schedule',
        category: 'scheduling',
        version: '1.0.0',
        tags: ['schedule', 'report', 'automation'],
        icon: '📈',
        preview: 'data:image/svg+xml;base64,...',
        workflow: this.createScheduledReportWorkflow(),
        documentation: `
# Scheduled Report Workflow

This template generates and sends reports on a configurable schedule.

## Features
- Cron-based scheduling
- Data aggregation
- Report generation
- Email delivery
- Multiple format support

## Usage
1. Configure schedule (cron expression)
2. Set up data sources
3. Customize report template
4. Configure delivery settings

## Configuration
- Schedule: 0 9 * * 1 (every Monday at 9 AM)
- Data sources: Database queries, API calls
- Report format: PDF, HTML, CSV
- Delivery: Email, webhook, file storage
        `,
        author: 'Atlas Team',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Data Processing Pipeline
      {
        id: 'data-pipeline',
        name: 'Data Processing Pipeline',
        description: 'ETL pipeline for data transformation',
        category: 'data-processing',
        version: '1.0.0',
        tags: ['etl', 'data', 'transformation'],
        icon: '🔄',
        preview: 'data:image/svg+xml;base64,...',
        workflow: this.createDataPipelineWorkflow(),
        documentation: `
# Data Processing Pipeline

This template creates an ETL pipeline for data transformation.

## Features
- Data extraction from multiple sources
- Transformation and cleaning
- Validation and quality checks
- Loading to destination
- Error handling and logging

## Usage
1. Configure data sources
2. Set up transformation rules
3. Configure destination
4. Set up monitoring and alerts

## Configuration
- Sources: Database, API, files
- Transformations: Mapping, filtering, aggregation
- Destination: Database, file storage, API
- Monitoring: Success/failure alerts
        `,
        author: 'Atlas Team',
        isPublic: true,
        difficulty: 'intermediate',
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Webhook Handler
      {
        id: 'webhook-handler',
        name: 'Webhook Handler',
        description: 'Process incoming webhook data',
        category: 'webhooks',
        version: '1.0.0',
        tags: ['webhook', 'api', 'event-handling'],
        icon: '🪝',
        preview: 'data:image/svg+xml;base64,...',
        workflow: this.createWebhookHandlerWorkflow(),
        documentation: `
# Webhook Handler Workflow

This template processes incoming webhook events.

## Features
- Webhook endpoint creation
- Payload validation
- Event routing
- Data processing
- Response formatting

## Usage
1. Deploy the workflow to get webhook URL
2. Configure external service to send webhooks
3. Test with sample payloads

## Configuration
- Webhook path: /webhook/{{workflow-id}}
- Validation: Signature verification, schema validation
- Processing: Event-based routing, data transformation
        `,
        author: 'Atlas Team',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  // Template creation methods
  private createEmailNotificationWorkflow(): Workflow {
    return {
      id: 'email-notification-workflow',
      name: 'Email Notification',
      description: 'Send email notifications',
      version: '1.0.0',
      status: 'draft' as any,
      nodes: [
        {
          id: 'trigger',
          type: WorkflowNodeType.TRIGGER,
          name: 'HTTP Trigger',
          description: 'HTTP endpoint for triggering emails',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [
            { id: 'request', name: 'Request Data', type: 'object' }
          ],
          config: { method: 'POST', path: '/send-email' }
        },
        {
          id: 'validator',
          type: WorkflowNodeType.CONDITION,
          name: 'Validate Input',
          description: 'Validate email request data',
          position: { x: 300, y: 100 },
          inputs: [
            { id: 'data', name: 'Request Data', type: 'object', required: true }
          ],
          outputs: [
            { id: 'valid', name: 'Valid Data', type: 'object' },
            { id: 'invalid', name: 'Invalid Data', type: 'object' }
          ],
          config: {
            condition: 'data.to && data.subject && data.body'
          }
        },
        {
          id: 'email-sender',
          type: WorkflowNodeType.ACTION,
          name: 'Send Email',
          description: 'Send email using SMTP',
          position: { x: 500, y: 100 },
          inputs: [
            { id: 'to', name: 'To', type: 'string', required: true },
            { id: 'subject', name: 'Subject', type: 'string', required: true },
            { id: 'body', name: 'Body', type: 'string', required: true }
          ],
          outputs: [
            { id: 'result', name: 'Send Result', type: 'object' }
          ],
          config: {
            action: 'email',
            host: '{{smtp.host}}',
            port: '{{smtp.port}}',
            auth: { user: '{{smtp.user}}', pass: '{{smtp.pass}}' }
          }
        }
      ],
      connections: [
        {
          id: 'conn1',
          sourceNodeId: 'trigger',
          sourceOutputId: 'request',
          targetNodeId: 'validator',
          targetInputId: 'data'
        },
        {
          id: 'conn2',
          sourceNodeId: 'validator',
          sourceOutputId: 'valid',
          targetNodeId: 'email-sender',
          targetInputId: 'to',
          condition: 'data.to'
        }
      ],
      variables: [
        { name: 'smtp.host', type: 'string', description: 'SMTP server host' },
        { name: 'smtp.port', type: 'number', description: 'SMTP server port' },
        { name: 'smtp.user', type: 'string', description: 'SMTP username' },
        { name: 'smtp.pass', type: 'string', description: 'SMTP password' }
      ],
      triggers: [
        {
          type: 'http',
          config: { method: 'POST', path: '/send-email' },
          enabled: true
        }
      ],
      settings: {
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        parallelExecutions: 1,
        logging: true,
        errorHandling: 'stop'
      },
      metadata: { category: 'notification', difficulty: 'beginner' },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['email', 'notification']
    };
  }

  private createApiIntegrationWorkflow(): Workflow {
    // Simplified API integration workflow
    return {
      id: 'api-integration-workflow',
      name: 'API Integration',
      description: 'Integrate with external APIs',
      version: '1.0.0',
      status: 'draft' as any,
      nodes: [
        {
          id: 'trigger',
          type: WorkflowNodeType.TRIGGER,
          name: 'HTTP Trigger',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [{ id: 'request', name: 'Request', type: 'object' }],
          config: { method: 'POST', path: '/api-integration' }
        },
        {
          id: 'api-call',
          type: WorkflowNodeType.API,
          name: 'External API Call',
          position: { x: 300, y: 100 },
          inputs: [
            { id: 'url', name: 'API URL', type: 'string', required: true },
            { id: 'method', name: 'Method', type: 'string', defaultValue: 'GET' }
          ],
          outputs: [{ id: 'response', name: 'API Response', type: 'object' }],
          config: { timeout: 30000, headers: {} }
        }
      ],
      connections: [
        {
          id: 'conn1',
          sourceNodeId: 'trigger',
          sourceOutputId: 'request',
          targetNodeId: 'api-call',
          targetInputId: 'url'
        }
      ],
      variables: [],
      triggers: [],
      settings: { timeout: 30000, retries: 3, logging: true, errorHandling: 'stop' },
      metadata: { category: 'integration', difficulty: 'intermediate' },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['api', 'integration']
    };
  }

  private createScheduledReportWorkflow(): Workflow {
    // Simplified scheduled report workflow
    return {
      id: 'scheduled-report-workflow',
      name: 'Scheduled Report',
      description: 'Generate reports on schedule',
      version: '1.0.0',
      status: 'draft' as any,
      nodes: [
        {
          id: 'trigger',
          type: WorkflowNodeType.TRIGGER,
          name: 'Schedule Trigger',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [{ id: 'trigger', name: 'Trigger Info', type: 'object' }],
          config: { cron: '0 9 * * 1' }
        },
        {
          id: 'data-query',
          type: WorkflowNodeType.ACTION,
          name: 'Query Data',
          position: { x: 300, y: 100 },
          inputs: [{ id: 'query', name: 'SQL Query', type: 'string', required: true }],
          outputs: [{ id: 'data', name: 'Query Results', type: 'array' }],
          config: { action: 'database-query' }
        }
      ],
      connections: [
        {
          id: 'conn1',
          sourceNodeId: 'trigger',
          sourceOutputId: 'trigger',
          targetNodeId: 'data-query',
          targetInputId: 'query'
        }
      ],
      variables: [],
      triggers: [{ type: 'schedule', config: { cron: '0 9 * * 1' }, enabled: true }],
      settings: { timeout: 300000, retries: 3, logging: true, errorHandling: 'stop' },
      metadata: { category: 'scheduling', difficulty: 'intermediate' },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['schedule', 'report']
    };
  }

  private createDataPipelineWorkflow(): Workflow {
    // Simplified data pipeline workflow
    return {
      id: 'data-pipeline-workflow',
      name: 'Data Processing Pipeline',
      description: 'ETL pipeline for data transformation',
      version: '1.0.0',
      status: 'draft' as any,
      nodes: [
        {
          id: 'extract',
          type: WorkflowNodeType.TRIGGER,
          name: 'Data Extract',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [{ id: 'rawData', name: 'Raw Data', type: 'array' }],
          config: { source: 'database' }
        },
        {
          id: 'transform',
          type: WorkflowNodeType.TRANSFORM,
          name: 'Data Transform',
          position: { x: 300, y: 100 },
          inputs: [{ id: 'data', name: 'Input Data', type: 'array', required: true }],
          outputs: [{ id: 'cleanData', name: 'Clean Data', type: 'array' }],
          config: { transform: 'clean' }
        }
      ],
      connections: [
        {
          id: 'conn1',
          sourceNodeId: 'extract',
          sourceOutputId: 'rawData',
          targetNodeId: 'transform',
          targetInputId: 'data'
        }
      ],
      variables: [],
      triggers: [],
      settings: { timeout: 600000, retries: 3, logging: true, errorHandling: 'stop' },
      metadata: { category: 'data-processing', difficulty: 'advanced' },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['etl', 'data']
    };
  }

  private createWebhookHandlerWorkflow(): Workflow {
    // Simplified webhook handler workflow
    return {
      id: 'webhook-handler-workflow',
      name: 'Webhook Handler',
      description: 'Process incoming webhooks',
      version: '1.0.0',
      status: 'draft' as any,
      nodes: [
        {
          id: 'webhook',
          type: WorkflowNodeType.TRIGGER,
          name: 'Webhook Receiver',
          position: { x: 100, y: 100 },
          inputs: [],
          outputs: [{ id: 'payload', name: 'Webhook Payload', type: 'object' }],
          config: { method: 'POST', path: '/webhook' }
        },
        {
          id: 'validator',
          type: WorkflowNodeType.CONDITION,
          name: 'Validate Payload',
          position: { x: 300, y: 100 },
          inputs: [{ id: 'payload', name: 'Payload', type: 'object', required: true }],
          outputs: [{ id: 'valid', name: 'Valid Payload', type: 'object' }],
          config: { condition: 'payload.event && payload.data' }
        }
      ],
      connections: [
        {
          id: 'conn1',
          sourceNodeId: 'webhook',
          sourceOutputId: 'payload',
          targetNodeId: 'validator',
          targetInputId: 'payload'
        }
      ],
      variables: [],
      triggers: [{ type: 'http', config: { method: 'POST', path: '/webhook' }, enabled: true }],
      settings: { timeout: 30000, retries: 3, logging: true, errorHandling: 'stop' },
      metadata: { category: 'webhooks', difficulty: 'beginner' },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['webhook', 'api']
    };
  }

  // Public API methods
  async createTemplate(template: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowTemplate> {
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(newTemplate.id, newTemplate);
    this.usageStats.set(newTemplate.id, { usageCount: 0, lastUsed: new Date() });

    return newTemplate;
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(id) || null;
  }

  async updateTemplate(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date()
    };

    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: string): Promise<void> {
    const deleted = this.templates.delete(id);
    if (!deleted) {
      throw new Error(`Template ${id} not found`);
    }
    this.usageStats.delete(id);
  }

  async searchTemplates(filters: TemplateSearchFilters): Promise<WorkflowTemplate[]> {
    let templates = Array.from(this.templates.values());

    if (filters.category) {
      templates = templates.filter(t => t.category === filters.category);
    }

    if (filters.tags?.length) {
      templates = templates.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.difficulty) {
      templates = templates.filter(t => t.difficulty === filters.difficulty);
    }

    if (filters.type) {
      templates = templates.filter(t => t.tags.includes(filters.type!));
    }

    if (filters.rating) {
      templates = templates.filter(t => t.rating >= filters.rating);
    }

    if (filters.isPublic !== undefined) {
      templates = templates.filter(t => t.isPublic === filters.isPublic);
    }

    if (filters.author) {
      templates = templates.filter(t => t.author === filters.author);
    }

    return templates.sort((a, b) => {
      // Sort by usage count and rating
      const aStats = this.usageStats.get(a.id);
      const bStats = this.usageStats.get(b.id);
      const aUsage = aStats?.usageCount || 0;
      const bUsage = bStats?.usageCount || 0;

      if (aUsage !== bUsage) {
        return bUsage - aUsage;
      }

      return (b.rating || 0) - (a.rating || 0);
    });
  }

  async getCategories(): Promise<TemplateCategory[]> {
    return Array.from(this.categories.values());
  }

  async getCategory(id: string): Promise<TemplateCategory | null> {
    return this.categories.get(id) || null;
  }

  async applyTemplate(templateId: string, customizations?: {
    name?: string;
    description?: string;
    variables?: Record<string, any>;
  }): Promise<Workflow> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Clone the workflow and generate new IDs
    const workflow = this.cloneWorkflow(template.workflow);

    // Apply customizations
    if (customizations) {
      if (customizations.name) {
        workflow.name = customizations.name;
      }
      if (customizations.description) {
        workflow.description = customizations.description;
      }
      if (customizations.variables) {
        Object.entries(customizations.variables).forEach(([key, value]) => {
          const variable = workflow.variables.find(v => v.name === key);
          if (variable) {
            variable.defaultValue = value;
          }
        });
      }
    }

    // Update usage stats
    const stats = this.usageStats.get(templateId);
    if (stats) {
      stats.usageCount++;
      stats.lastUsed = new Date();
      this.usageStats.set(templateId, stats);
    }

    return workflow;
  }

  async rateTemplate(templateId: string, rating: number): Promise<void> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    template.rating = rating;
    template.updatedAt = new Date();
    this.templates.set(templateId, template);
  }

  async getTemplateStats(templateId: string): Promise<{
    usageCount: number;
    lastUsed: Date | null;
    rating: number | null;
  }> {
    const stats = this.usageStats.get(templateId);
    const template = this.templates.get(templateId);

    return {
      usageCount: stats?.usageCount || 0,
      lastUsed: stats?.lastUsed || null,
      rating: template?.rating || null
    };
  }

  // Helper methods
  private cloneWorkflow(workflow: Workflow): Workflow {
    const generateNewId = (prefix: string) => `${prefix}_${uuidv4().slice(0, 8)}`;

    const newNode = (node: WorkflowNode): WorkflowNode => ({
      ...node,
      id: generateNewId(node.id),
      position: { ...node.position }
    });

    const nodes = workflow.nodes.map(newNode);

    // Map old node IDs to new node IDs
    const nodeIdMap = new Map<string, string>();
    workflow.nodes.forEach((oldNode, index) => {
      nodeIdMap.set(oldNode.id, nodes[index].id);
    });

    const connections = workflow.connections.map(conn => ({
      ...conn,
      id: generateNewId(conn.id),
      sourceNodeId: nodeIdMap.get(conn.sourceNodeId) || conn.sourceNodeId,
      targetNodeId: nodeIdMap.get(conn.targetNodeId) || conn.targetNodeId
    }));

    return {
      ...workflow,
      id: generateNewId('workflow'),
      nodes,
      connections,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}