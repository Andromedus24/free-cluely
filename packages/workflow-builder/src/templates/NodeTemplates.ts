import {
  NodeTemplate,
  WorkflowNodeType,
  WorkflowNode,
  ExecutionContext
} from '../types/WorkflowTypes';

// Built-in node templates
export const BUILTIN_NODE_TEMPLATES: NodeTemplate[] = [
  // Trigger nodes
  {
    id: 'trigger-http',
    type: WorkflowNodeType.TRIGGER,
    name: 'HTTP Trigger',
    description: 'Trigger workflow via HTTP request',
    category: 'Triggers',
    icon: '🌐',
    inputs: [],
    outputs: [
      { id: 'request', name: 'Request', type: 'HttpRequest' },
      { id: 'headers', name: 'Headers', type: 'Record<string, string>' },
      { id: 'body', name: 'Body', type: 'any' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          default: 'POST'
        },
        path: {
          type: 'string',
          description: 'HTTP path for the trigger'
        },
        auth: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['none', 'bearer', 'basic', 'api-key']
            },
            token: {
              type: 'string',
              description: 'Authentication token'
            }
          }
        }
      }
    },
    execute: async (config: any, context: ExecutionContext) => {
      return {
        method: config.method,
        path: config.path,
        timestamp: new Date().toISOString()
      };
    },
    documentation: 'Triggers workflow execution when an HTTP request is received at the specified path.',
    examples: [
      {
        name: 'Simple Webhook',
        config: { method: 'POST', path: '/webhook' }
      }
    ]
  },

  {
    id: 'trigger-schedule',
    type: WorkflowNodeType.TRIGGER,
    name: 'Schedule Trigger',
    description: 'Trigger workflow on a schedule',
    category: 'Triggers',
    icon: '⏰',
    inputs: [],
    outputs: [
      { id: 'triggerTime', name: 'Trigger Time', type: 'Date' },
      { id: 'schedule', name: 'Schedule Info', type: 'ScheduleInfo' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        cron: {
          type: 'string',
          description: 'Cron expression for scheduling'
        },
        timezone: {
          type: 'string',
          default: 'UTC'
        },
        startDate: {
          type: 'string',
          format: 'date-time'
        },
        endDate: {
          type: 'string',
          format: 'date-time'
        }
      },
      required: ['cron']
    },
    execute: async (config: any, context: ExecutionContext) => {
      return {
        cron: config.cron,
        timezone: config.timezone,
        triggerTime: new Date()
      };
    },
    documentation: 'Triggers workflow execution based on a cron schedule.',
    examples: [
      {
        name: 'Daily at 9 AM',
        config: { cron: '0 9 * * *' }
      },
      {
        name: 'Every 5 minutes',
        config: { cron: '*/5 * * * *' }
      }
    ]
  },

  {
    id: 'trigger-manual',
    type: WorkflowNodeType.TRIGGER,
    name: 'Manual Trigger',
    description: 'Trigger workflow manually',
    category: 'Triggers',
    icon: '👆',
    inputs: [],
    outputs: [
      { id: 'triggerData', name: 'Trigger Data', type: 'any' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string'
        }
      }
    },
    execute: async (config: any, context: ExecutionContext) => {
      return {
        triggeredBy: 'manual',
        timestamp: new Date().toISOString()
      };
    },
    documentation: 'Allows manual triggering of the workflow.',
    examples: [
      {
        name: 'Simple Manual Trigger',
        config: { description: 'Manual workflow trigger' }
      }
    ]
  },

  // Action nodes
  {
    id: 'action-log',
    type: WorkflowNodeType.ACTION,
    name: 'Log Message',
    description: 'Log a message to the console',
    category: 'Actions',
    icon: '📝',
    inputs: [
      { id: 'message', name: 'Message', type: 'string', required: true },
      { id: 'level', name: 'Level', type: 'string', defaultValue: 'info' }
    ],
    outputs: [
      { id: 'logged', name: 'Logged', type: 'boolean' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string'
        },
        level: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error'],
          default: 'info'
        }
      },
      required: ['message']
    },
    execute: async (config: any, context: ExecutionContext) => {
      console.log(`[${config.level.toUpperCase()}] ${config.message}`);
      context.logs.push({
        timestamp: new Date(),
        level: config.level,
        message: config.message
      });
      return { logged: true };
    },
    documentation: 'Logs a message to the console with the specified log level.',
    examples: [
      {
        name: 'Simple Info Log',
        config: { message: 'Workflow started', level: 'info' }
      }
    ]
  },

  {
    id: 'action-email',
    type: WorkflowNodeType.ACTION,
    name: 'Send Email',
    description: 'Send an email message',
    category: 'Actions',
    icon: '📧',
    inputs: [
      { id: 'to', name: 'To', type: 'string', required: true },
      { id: 'subject', name: 'Subject', type: 'string', required: true },
      { id: 'body', name: 'Body', type: 'string', required: true }
    ],
    outputs: [
      { id: 'sent', name: 'Sent', type: 'boolean' },
      { id: 'messageId', name: 'Message ID', type: 'string' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          format: 'email'
        },
        subject: {
          type: 'string'
        },
        body: {
          type: 'string'
        },
        from: {
          type: 'string',
          format: 'email'
        },
        html: {
          type: 'boolean',
          default: false
        }
      },
      required: ['to', 'subject', 'body']
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for email sending logic
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        sent: true,
        messageId,
        timestamp: new Date().toISOString()
      };
    },
    documentation: 'Sends an email message to the specified recipient.',
    examples: [
      {
        name: 'Simple Email',
        config: {
          to: 'user@example.com',
          subject: 'Workflow Notification',
          body: 'Your workflow has completed successfully.'
        }
      }
    ]
  },

  {
    id: 'action-notification',
    type: WorkflowNodeType.ACTION,
    name: 'Send Notification',
    description: 'Send a push notification',
    category: 'Actions',
    icon: '🔔',
    inputs: [
      { id: 'title', name: 'Title', type: 'string', required: true },
      { id: 'message', name: 'Message', type: 'string', required: true },
      { id: 'deviceTokens', name: 'Device Tokens', type: 'string[]' }
    ],
    outputs: [
      { id: 'sent', name: 'Sent', type: 'boolean' },
      { id: 'failedTokens', name: 'Failed Tokens', type: 'string[]' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string'
        },
        message: {
          type: 'string'
        },
        deviceTokens: {
          type: 'array',
          items: { type: 'string' }
        },
        priority: {
          type: 'string',
          enum: ['low', 'normal', 'high'],
          default: 'normal'
        }
      },
      required: ['title', 'message']
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for notification sending logic
      return {
        sent: true,
        failedTokens: [],
        timestamp: new Date().toISOString()
      };
    },
    documentation: 'Sends a push notification to specified devices.',
    examples: [
      {
        name: 'Simple Notification',
        config: {
          title: 'Workflow Alert',
          message: 'Your workflow requires attention.'
        }
      }
    ]
  },

  // API nodes
  {
    id: 'api-http-request',
    type: WorkflowNodeType.API,
    name: 'HTTP Request',
    description: 'Make an HTTP request',
    category: 'API',
    icon: '🌐',
    inputs: [
      { id: 'url', name: 'URL', type: 'string', required: true },
      { id: 'method', name: 'Method', type: 'string', defaultValue: 'GET' },
      { id: 'headers', name: 'Headers', type: 'Record<string, string>' },
      { id: 'body', name: 'Body', type: 'any' }
    ],
    outputs: [
      { id: 'response', name: 'Response', type: 'HttpResponse' },
      { id: 'status', name: 'Status', type: 'number' },
      { id: 'data', name: 'Data', type: 'any' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri'
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
          default: 'GET'
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        body: {
          type: 'object'
        },
        timeout: {
          type: 'number',
          default: 30000
        }
      },
      required: ['url']
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for HTTP request logic
      const response = {
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { success: true }
      };
      return {
        response,
        status: response.status,
        data: response.data
      };
    },
    documentation: 'Makes an HTTP request to the specified URL with the given method and data.',
    examples: [
      {
        name: 'GET Request',
        config: {
          url: 'https://api.example.com/data',
          method: 'GET'
        }
      },
      {
        name: 'POST Request',
        config: {
          url: 'https://api.example.com/submit',
          method: 'POST',
          body: { key: 'value' }
        }
      }
    ]
  },

  {
    id: 'api-webhook',
    type: WorkflowNodeType.API,
    name: 'Webhook',
    description: 'Send data to a webhook URL',
    category: 'API',
    icon: '🪝',
    inputs: [
      { id: 'url', name: 'Webhook URL', type: 'string', required: true },
      { id: 'data', name: 'Data', type: 'any', required: true }
    ],
    outputs: [
      { id: 'sent', name: 'Sent', type: 'boolean' },
      { id: 'response', name: 'Response', type: 'any' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri'
        },
        data: {
          type: 'object'
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        retries: {
          type: 'number',
          default: 3
        }
      },
      required: ['url', 'data']
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for webhook sending logic
      return {
        sent: true,
        response: { success: true },
        timestamp: new Date().toISOString()
      };
    },
    documentation: 'Sends data to a webhook URL with retry logic.',
    examples: [
      {
        name: 'Discord Webhook',
        config: {
          url: 'https://discord.com/api/webhooks/xxx/yyy',
          data: { content: 'Workflow completed!' }
        }
      }
    ]
  },

  // Logic nodes
  {
    id: 'condition-if',
    type: WorkflowNodeType.CONDITION,
    name: 'If Condition',
    description: 'Conditional logic branching',
    category: 'Logic',
    icon: '🔀',
    inputs: [
      { id: 'condition', name: 'Condition', type: 'boolean', required: true },
      { id: 'value', name: 'Value', type: 'any' }
    ],
    outputs: [
      { id: 'true', name: 'True', type: 'any' },
      { id: 'false', name: 'False', type: 'any' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        condition: {
          type: 'string',
          description: 'JavaScript expression to evaluate'
        }
      },
      required: ['condition']
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for condition evaluation
      const condition = config.condition === 'true' || config.condition === true;
      return {
        condition,
        result: condition ? 'true' : 'false'
      };
    },
    documentation: 'Evaluates a condition and routes execution based on the result.',
    examples: [
      {
        name: 'Simple Condition',
        config: {
          condition: 'status === "success"'
        }
      }
    ]
  },

  {
    id: 'condition-switch',
    type: WorkflowNodeType.CONDITION,
    name: 'Switch',
    description: 'Multi-branch conditional logic',
    category: 'Logic',
    icon: '🎛️',
    inputs: [
      { id: 'value', name: 'Value', type: 'any', required: true }
    ],
    outputs: [
      { id: 'default', name: 'Default', type: 'any' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        cases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              value: { type: 'any' },
              output: { type: 'string' }
            }
          }
        }
      },
      required: ['cases']
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for switch logic
      return {
        value: config.value,
        matchedCase: 'default'
      };
    },
    documentation: 'Routes execution based on multiple case conditions.',
    examples: [
      {
        name: 'Status Switch',
        config: {
          cases: [
            { value: 'success', output: 'success' },
            { value: 'error', output: 'error' }
          ]
        }
      }
    ]
  },

  // Control flow nodes
  {
    id: 'delay',
    type: WorkflowNodeType.DELAY,
    name: 'Delay',
    description: 'Wait for a specified duration',
    category: 'Control Flow',
    icon: '⏱️',
    inputs: [
      { id: 'duration', name: 'Duration (ms)', type: 'number', required: true }
    ],
    outputs: [
      { id: 'completed', name: 'Completed', type: 'boolean' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        duration: {
          type: 'number',
          minimum: 0,
          description: 'Delay duration in milliseconds'
        }
      },
      required: ['duration']
    },
    execute: async (config: any, context: ExecutionContext) => {
      await new Promise(resolve => setTimeout(resolve, config.duration));
      return {
        completed: true,
        actualDuration: config.duration
      };
    },
    documentation: 'Pauses workflow execution for the specified duration.',
    examples: [
      {
        name: '5 Second Delay',
        config: { duration: 5000 }
      }
    ]
  },

  {
    id: 'parallel',
    type: WorkflowNodeType.PARALLEL,
    name: 'Parallel Execution',
    description: 'Execute multiple branches in parallel',
    category: 'Control Flow',
    icon: '⚡',
    inputs: [
      { id: 'tasks', name: 'Tasks', type: 'any[]', required: true }
    ],
    outputs: [
      { id: 'results', name: 'Results', type: 'any[]' },
      { id: 'errors', name: 'Errors', type: 'any[]' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        maxConcurrency: {
          type: 'number',
          default: 5
        },
        failFast: {
          type: 'boolean',
          default: false
        }
      }
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for parallel execution
      return {
        results: [],
        errors: [],
        completed: true
      };
    },
    documentation: 'Executes multiple tasks in parallel with configurable concurrency.',
    examples: [
      {
        name: 'Parallel API Calls',
        config: {
          maxConcurrency: 3,
          failFast: true
        }
      }
    ]
  },

  // Data transformation nodes
  {
    id: 'transform-json',
    type: WorkflowNodeType.TRANSFORM,
    name: 'Transform JSON',
    description: 'Transform JSON data using a template',
    category: 'Data',
    icon: '🔄',
    inputs: [
      { id: 'data', name: 'Input Data', type: 'any', required: true },
      { id: 'template', name: 'Template', type: 'string' }
    ],
    outputs: [
      { id: 'result', name: 'Transformed Data', type: 'any' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        template: {
          type: 'string',
          description: 'JSON transformation template'
        }
      },
      required: ['template']
    },
    execute: async (config: any, context: ExecutionContext) => {
      // Placeholder for JSON transformation
      return {
        result: config.data,
        template: config.template
      };
    },
    documentation: 'Transforms input data using a JSON template.',
    examples: [
      {
        name: 'Simple Mapping',
        config: {
          template: '{"output": "{{input}}"}'
        }
      }
    ]
  },

  {
    id: 'transform-regex',
    type: WorkflowNodeType.TRANSFORM,
    name: 'Regex Transform',
    description: 'Transform text using regular expressions',
    category: 'Data',
    icon: '🔤',
    inputs: [
      { id: 'text', name: 'Input Text', type: 'string', required: true },
      { id: 'pattern', name: 'Pattern', type: 'string', required: true },
      { id: 'replacement', name: 'Replacement', type: 'string', required: true }
    ],
    outputs: [
      { id: 'result', name: 'Result', type: 'string' },
      { id: 'matches', name: 'Matches', type: 'any[]' }
    ],
    configSchema: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regular expression pattern'
        },
        replacement: {
          type: 'string',
          description: 'Replacement string'
        },
        flags: {
          type: 'string',
          description: 'Regex flags (g, i, m, etc.)'
        }
      },
      required: ['pattern', 'replacement']
    },
    execute: async (config: any, context: ExecutionContext) => {
      const flags = config.flags || 'g';
      const regex = new RegExp(config.pattern, flags);
      const result = config.text.replace(regex, config.replacement);
      const matches = config.text.match(regex) || [];

      return {
        result,
        matches,
        pattern: config.pattern,
        replacement: config.replacement
      };
    },
    documentation: 'Transforms text using regular expression replacement.',
    examples: [
      {
        name: 'Extract Numbers',
        config: {
          pattern: '\\d+',
          replacement: 'NUMBER',
          flags: 'g'
        }
      }
    ]
  }
];

// Helper function to register built-in templates
export function registerBuiltInTemplates(service: any): Promise<void> {
  return new Promise((resolve) => {
    BUILTIN_NODE_TEMPLATES.forEach(template => {
      service.registerNodeTemplate(template);
    });
    resolve();
  });
}