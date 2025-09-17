import { EventEmitter } from 'eventemitter3';
import { AutomationTask, TaskExecution, TaskSchedule, ExecutionLog } from './types/automation';

interface SchedulerEvents {
  task_scheduled: { task: AutomationTask };
  task_started: { execution: TaskExecution };
  task_completed: { execution: TaskExecution };
  task_failed: { execution: TaskExecution; error: Error };
  task_cancelled: { execution: TaskExecution };
}

export class TaskScheduler extends EventEmitter<SchedulerEvents> {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private runningTasks: Map<string, TaskExecution> = new Map();
  private taskHistory: TaskExecution[] = [];
  private isRunning = false;

  constructor(private maxConcurrentTasks: number = 10) {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.emit('scheduler_started', {});
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    // Cancel all scheduled tasks
    for (const [taskId, timeout] of this.scheduledTasks) {
      clearTimeout(timeout);
      this.scheduledTasks.delete(taskId);
    }

    // Wait for running tasks to complete or timeout
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
    const runningPromise = new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.runningTasks.size === 0) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 100);
    });

    await Promise.race([timeoutPromise, runningPromise]);

    this.isRunning = false;
    this.emit('scheduler_stopped', {});
  }

  scheduleTask(task: AutomationTask): void {
    if (!this.isRunning) {
      throw new Error('Scheduler is not running');
    }

    // Cancel existing schedule if any
    this.unscheduleTask(task.id);

    const nextRun = this.calculateNextRun(task.schedule);
    if (!nextRun) return;

    const delay = nextRun.getTime() - Date.now();
    if (delay <= 0) return;

    const timeout = setTimeout(() => {
      this.executeTask(task);
      this.scheduledTasks.delete(task.id);

      // Reschedule if it's a recurring task
      if (task.schedule?.type !== 'once') {
        this.scheduleTask(task);
      }
    }, delay);

    this.scheduledTasks.set(task.id, timeout);
    task.nextRun = nextRun;

    this.emit('task_scheduled', { task });
  }

  unscheduleTask(taskId: string): void {
    const timeout = this.scheduledTasks.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledTasks.delete(taskId);
    }
  }

  private async executeTask(task: AutomationTask): Promise<void> {
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      this.log(task.id, 'warn', 'Task skipped: max concurrent tasks reached');
      return;
    }

    // Check conditions
    if (!(await this.checkConditions(task))) {
      this.log(task.id, 'info', 'Task skipped: conditions not met');
      return;
    }

    const execution: TaskExecution = {
      id: this.generateId(),
      taskId: task.id,
      status: 'running',
      startTime: new Date(),
      logs: []
    };

    this.runningTasks.set(task.id, execution);
    task.lastRun = execution.startTime;
    task.executionCount++;

    this.emit('task_started', { execution });

    try {
      const result = await this.runTaskActions(task, execution);
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.result = result;
      task.successCount++;

      this.emit('task_completed', { execution });
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : String(error);
      task.failureCount++;

      this.emit('task_failed', { execution, error: error as Error });
    }

    this.runningTasks.delete(task.id);
    this.taskHistory.push(execution);

    // Keep only last 1000 executions in memory
    if (this.taskHistory.length > 1000) {
      this.taskHistory = this.taskHistory.slice(-1000);
    }
  }

  private async checkConditions(task: AutomationTask): Promise<boolean> {
    if (!task.conditions || task.conditions.length === 0) {
      return true;
    }

    // Simple condition checking - in real implementation, this would be more sophisticated
    for (const condition of task.conditions) {
      switch (condition.type) {
        case 'time':
          if (!this.checkTimeCondition(condition)) return false;
          break;
        case 'system':
          if (!this.checkSystemCondition(condition)) return false;
          break;
        // Add more condition types as needed
      }
    }

    return true;
  }

  private checkTimeCondition(condition: any): boolean {
    // Implement time-based condition checking
    return true;
  }

  private checkSystemCondition(condition: any): boolean {
    // Implement system-based condition checking
    return true;
  }

  private async runTaskActions(task: AutomationTask, execution: TaskExecution): Promise<any> {
    const results: any = {};
    const actionOrder = this.resolveActionDependencies(task.actions);

    for (const actionId of actionOrder) {
      const action = task.actions.find(a => a.id === actionId);
      if (!action) continue;

      try {
        this.log(execution.id, 'info', `Executing action: ${action.type}`, { actionId });
        const result = await this.executeAction(action, results);
        results[actionId] = result;
      } catch (error) {
        this.log(execution.id, 'error', `Action failed: ${action.type}`, {
          actionId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }

    return results;
  }

  private resolveActionDependencies(actions: any[]): string[] {
    // Simple topological sort for action dependencies
    const resolved: string[] = new Set();
    const visited: string[] = [];

    const visit = (actionId: string) => {
      if (visited.includes(actionId)) return;
      if (resolved.has(actionId)) return;

      visited.push(actionId);

      const action = actions.find(a => a.id === actionId);
      if (action?.dependencies) {
        action.dependencies.forEach(dep => visit(dep));
      }

      resolved.add(actionId);
    };

    actions.forEach(action => visit(action.id));
    return Array.from(resolved);
  }

  private async executeAction(action: any, context: any): Promise<any> {
    // Implement action execution based on type
    switch (action.type) {
      case 'http':
        return this.executeHttpAction(action, context);
      case 'email':
        return this.executeEmailAction(action, context);
      case 'script':
        return this.executeScriptAction(action, context);
      case 'plugin':
        return this.executePluginAction(action, context);
      case 'notification':
        return this.executeNotificationAction(action, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async executeHttpAction(action: any, context: any): Promise<any> {
    // Implement HTTP action execution
    const { url, method = 'GET', headers = {}, body } = action.config;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      throw new Error(`HTTP request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async executeEmailAction(action: any, context: any): Promise<any> {
    // Implement email action execution
    const { to, subject, body } = action.config;

    // In real implementation, use email service
    console.log(`Sending email to ${to}: ${subject}`);

    return { success: true, messageId: this.generateId() };
  }

  private async executeScriptAction(action: any, context: any): Promise<any> {
    // Implement script action execution
    const { script, language = 'javascript' } = action.config;

    // In real implementation, use secure script execution environment
    console.log(`Executing ${language} script`);

    return { success: true, output: 'Script executed' };
  }

  private async executePluginAction(action: any, context: any): Promise<any> {
    // Implement plugin action execution
    const { plugin, method, params = {} } = action.config;

    // In real implementation, call plugin method
    console.log(`Calling plugin ${plugin}.${method()}`);

    return { success: true, result: 'Plugin action completed' };
  }

  private async executeNotificationAction(action: any, context: any): Promise<any> {
    // Implement notification action execution
    const { title, message, type = 'info' } = action.config;

    // In real implementation, send notification
    console.log(`Sending ${type} notification: ${title}`);

    return { success: true, notificationId: this.generateId() };
  }

  private calculateNextRun(schedule?: TaskSchedule): Date | null {
    if (!schedule) return null;

    const now = new Date();

    switch (schedule.type) {
      case 'once':
        return schedule.startDate ? new Date(schedule.startDate) : null;

      case 'interval':
        const interval = parseInt(schedule.expression);
        if (isNaN(interval)) return null;

        const nextInterval = new Date(now.getTime() + interval);
        if (schedule.endDate && nextInterval > schedule.endDate) return null;

        return nextInterval;

      case 'cron':
        // Simple cron implementation - in real implementation, use proper cron library
        return this.parseCronExpression(schedule.expression, now, schedule.timezone);

      default:
        return null;
    }
  }

  private parseCronExpression(expression: string, baseDate: Date, timezone?: string): Date | null {
    // Simplified cron parsing - in real implementation, use node-cron or similar
    try {
      // For now, just return tomorrow at the same time
      const next = new Date(baseDate);
      next.setDate(next.getDate() + 1);
      return next;
    } catch (error) {
      return null;
    }
  }

  private log(taskId: string, level: ExecutionLog['level'], message: string, data?: any): void {
    const log: ExecutionLog = {
      id: this.generateId(),
      timestamp: new Date(),
      level,
      message,
      data,
      source: 'system'
    };

    // Find the running execution for this task and add log
    const execution = this.runningTasks.get(taskId);
    if (execution) {
      execution.logs.push(log);
    }

    console.log(`[${level.toUpperCase()}] ${message}`, data);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Public methods
  getScheduledTasks(): AutomationTask[] {
    return Array.from(this.scheduledTasks.keys());
  }

  getRunningTasks(): TaskExecution[] {
    return Array.from(this.runningTasks.values());
  }

  getTaskHistory(limit: number = 50): TaskExecution[] {
    return this.taskHistory.slice(-limit);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledCount: this.scheduledTasks.size,
      runningCount: this.runningTasks.size,
      maxConcurrentTasks: this.maxConcurrentTasks
    };
  }
}