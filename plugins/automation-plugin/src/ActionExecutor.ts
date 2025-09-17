import { EventEmitter } from 'eventemitter3';
import { AutomationAction, ActionExecution, RetryPolicy } from './types/automation';

interface ExecutorEvents {
  action_started: { execution: ActionExecution };
  action_completed: { execution: ActionExecution; result: any };
  action_failed: { execution: ActionExecution; error: Error };
  action_retried: { execution: ActionExecution; attempt: number };
}

export class ActionExecutor extends EventEmitter<ExecutorEvents> {
  private activeExecutions: Map<string, ActionExecution> = new Map();

  constructor(private defaultRetryPolicy: RetryPolicy) {
    super();
  }

  async executeAction(
    action: AutomationAction,
    context: Record<string, any> = {},
    executionId?: string
  ): Promise<any> {
    const execution: ActionExecution = {
      id: executionId || this.generateExecutionId(),
      actionId: action.id,
      status: 'running',
      startTime: new Date(),
      retryCount: 0
    };

    this.activeExecutions.set(execution.id, execution);
    this.emit('action_started', { execution });

    try {
      const result = await this.executeWithRetry(action, context, execution);

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.emit('action_completed', { execution, result });
      return result;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : String(error);
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.emit('action_failed', { execution, error: error as Error });
      throw error;

    } finally {
      this.activeExecutions.delete(execution.id);
    }
  }

  private async executeWithRetry(
    action: AutomationAction,
    context: Record<string, any>,
    execution: ActionExecution
  ): Promise<any> {
    const retryPolicy = action.retryPolicy || this.defaultRetryPolicy;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        const result = await this.executeSingleAttempt(action, context, execution, attempt);
        return result;

      } catch (error) {
        lastError = error as Error;
        execution.retryCount = attempt;

        if (attempt < retryPolicy.maxAttempts) {
          this.emit('action_retried', { execution, attempt });

          const delay = this.calculateRetryDelay(retryPolicy, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Action execution failed after all retry attempts');
  }

  private async executeSingleAttempt(
    action: AutomationAction,
    context: Record<string, any>,
    execution: ActionExecution,
    attempt: number
  ): Promise<any> {
    const timeout = action.timeout || 30000; // Default 30 seconds

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Action timed out after ${timeout}ms`));
      }, timeout);
    });

    const executionPromise = this.performAction(action, context, attempt);

    return Promise.race([executionPromise, timeoutPromise]);
  }

  private async performAction(
    action: AutomationAction,
    context: Record<string, any>,
    attempt: number
  ): Promise<any> {
    // Substitute context variables in action config
    const processedConfig = this.substituteVariables(action.config, context);

    switch (action.type) {
      case 'http':
        return this.executeHttpAction(processedConfig, attempt);
      case 'email':
        return this.executeEmailAction(processedConfig, attempt);
      case 'script':
        return this.executeScriptAction(processedConfig, attempt);
      case 'plugin':
        return this.executePluginAction(processedConfig, attempt);
      case 'system':
        return this.executeSystemAction(processedConfig, attempt);
      case 'notification':
        return this.executeNotificationAction(processedConfig, attempt);
      case 'webhook':
        return this.executeWebhookAction(processedConfig, attempt);
      case 'file':
        return this.executeFileAction(processedConfig, attempt);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private substituteVariables(config: Record<string, any>, context: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        processed[key] = this.replaceVariables(value, context);
      } else if (typeof value === 'object' && value !== null) {
        processed[key] = this.substituteVariables(value, context);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  private replaceVariables(text: string, context: Record<string, any>): string {
    return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async executeHttpAction(config: any, attempt: number): Promise<any> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      auth,
      validate
    } = config;

    const requestHeaders: Record<string, string> = {};

    // Add default headers
    if (body && !headers['Content-Type']) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    // Add auth headers
    if (auth) {
      switch (auth.type) {
        case 'bearer':
          requestHeaders['Authorization'] = `Bearer ${auth.token}`;
          break;
        case 'basic':
          requestHeaders['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`;
          break;
        case 'custom':
          requestHeaders[auth.header] = auth.value;
          break;
      }
    }

    // Add custom headers
    Object.assign(requestHeaders, headers);

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, requestOptions);

    // Validate response if validation rules are provided
    if (validate) {
      this.validateResponse(response, validate);
    }

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    };
  }

  private validateResponse(response: Response, validate: any): void {
    if (validate.statusCode && response.status !== validate.statusCode) {
      throw new Error(`Expected status ${validate.statusCode}, got ${response.status}`);
    }

    if (validate.headers) {
      for (const [header, expected] of Object.entries(validate.headers)) {
        const actual = response.headers.get(header);
        if (actual !== expected) {
          throw new Error(`Expected header ${header}: ${expected}, got: ${actual}`);
        }
      }
    }
  }

  private async executeEmailAction(config: any, attempt: number): Promise<any> {
    const { to, cc, bcc, subject, body, attachments = [] } = config;

    // In a real implementation, integrate with email service
    console.log(`Sending email to ${to}: ${subject}`);

    // Simulate email sending
    await this.sleep(100);

    return {
      messageId: this.generateId(),
      recipients: { to, cc, bcc },
      subject,
      timestamp: new Date().toISOString()
    };
  }

  private async executeScriptAction(config: any, attempt: number): Promise<any> {
    const { script, language = 'javascript', timeout = 10000, env = {} } = config;

    // In a real implementation, use secure script execution (e.g., VM2)
    console.log(`Executing ${language} script`);

    // Simulate script execution
    await this.sleep(500);

    // This is a simplified example - real implementation would need proper sandboxing
    try {
      // WARNING: This is unsafe for production use
      const result = eval(script);
      return { output: result, executionTime: Date.now() };
    } catch (error) {
      throw new Error(`Script execution failed: ${error}`);
    }
  }

  private async executePluginAction(config: any, attempt: number): Promise<any> {
    const { plugin, method, params = {}, timeout = 30000 } = config;

    // In a real implementation, call plugin through plugin manager
    console.log(`Calling plugin ${plugin}.${method()}`);

    // Simulate plugin call
    await this.sleep(200);

    return {
      plugin,
      method,
      params,
      result: `Plugin action completed`,
      timestamp: new Date().toISOString()
    };
  }

  private async executeSystemAction(config: any, attempt: number): Promise<any> {
    const { command, args = [], cwd, timeout = 30000 } = config;

    // In a real implementation, execute system command securely
    console.log(`Executing system command: ${command} ${args.join(' ')}`);

    // Simulate system command execution
    await this.sleep(300);

    return {
      command,
      args,
      exitCode: 0,
      stdout: 'Command executed successfully',
      stderr: '',
      executionTime: Date.now()
    };
  }

  private async executeNotificationAction(config: any, attempt: number): Promise<any> {
    const { title, message, type = 'info', priority = 'normal', channel = 'system' } = config;

    // In a real implementation, send through notification system
    console.log(`Sending ${type} notification: ${title}`);

    // Simulate notification sending
    await this.sleep(100);

    return {
      notificationId: this.generateId(),
      type,
      priority,
      channel,
      title,
      message,
      timestamp: new Date().toISOString()
    };
  }

  private async executeWebhookAction(config: any, attempt: number): Promise<any> {
    const { url, method = 'POST', headers = {}, payload, secret } = config;

    const webhookHeaders = { ...headers };
    if (secret) {
      // Add webhook signature
      const signature = this.generateWebhookSignature(payload, secret);
      webhookHeaders['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(url, {
      method,
      headers: webhookHeaders,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return {
      webhookId: this.generateId(),
      url,
      status: response.status,
      timestamp: new Date().toISOString()
    };
  }

  private async executeFileAction(config: any, attempt: number): Promise<any> {
    const { action, path, content, encoding = 'utf8' } = config;

    // In a real implementation, perform file operations securely
    console.log(`File operation: ${action} on ${path}`);

    // Simulate file operation
    await this.sleep(150);

    return {
      action,
      path,
      timestamp: new Date().toISOString(),
      result: 'File operation completed'
    };
  }

  private generateWebhookSignature(payload: any, secret: string): string {
    // Simple HMAC signature - in real implementation, use proper crypto
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  private calculateRetryDelay(policy: RetryPolicy, attempt: number): number {
    let delay = policy.initialDelay;

    switch (policy.backoffStrategy) {
      case 'exponential':
        delay = policy.initialDelay * Math.pow(policy.multiplier || 2, attempt - 1);
        break;
      case 'linear':
        delay = policy.initialDelay + (attempt - 1) * (policy.multiplier || 1000);
        break;
      case 'fixed':
      default:
        delay = policy.initialDelay;
        break;
    }

    return Math.min(delay, policy.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public methods
  getActiveExecutions(): ActionExecution[] {
    return Array.from(this.activeExecutions.values());
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution) {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      this.activeExecutions.delete(executionId);
      return true;
    }
    return false;
  }
}