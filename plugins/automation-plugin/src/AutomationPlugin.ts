import { Plugin, PluginBus, ConfigManager, Logger, PluginError, CancellationToken } from '@free-cluely/shared';
import { EventEmitter } from 'eventemitter3';
import { TaskScheduler } from './TaskScheduler';
import { ActionExecutor } from './ActionExecutor';
import {
  AutomationTask,
  AutomationPluginConfig,
  TaskExecution,
  AutomationAction,
  RetryPolicy
} from './types/automation';

export class AutomationPlugin implements Plugin {
  name = 'automation-plugin';
  version = '1.0.0';
  permissions = ['system', 'network', 'filesystem'];

  private config: AutomationPluginConfig;
  private logger: Logger;
  private bus: PluginBus;
  private eventEmitter = new EventEmitter();
  private isInitialized = false;

  private scheduler: TaskScheduler;
  private executor: ActionExecutor;
  private tasks: Map<string, AutomationTask> = new Map();
  private storage: AutomationStorage;

  constructor(config: Partial<AutomationPluginConfig> = {}) {
    this.config = {
      maxConcurrentTasks: 10,
      defaultTimeout: 30000,
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: 'exponential',
        initialDelay: 1000,
        maxDelay: 30000,
        multiplier: 2
      },
      enableWebhooks: true,
      storagePath: './automation-data',
      logLevel: 'info',
      enableMetrics: true,
      timezone: 'UTC',
      ...config
    };

    this.scheduler = new TaskScheduler(this.config.maxConcurrentTasks);
    this.executor = new ActionExecutor(this.config.retryPolicy);
    this.storage = new AutomationStorage(this.config.storagePath);
  }

  async initialize(bus: PluginBus, configManager: ConfigManager, logger: Logger): Promise<void> {
    this.bus = bus;
    this.logger = logger;

    try {
      // Load configuration
      const pluginConfig = configManager.get('automation') as AutomationPluginConfig;
      if (pluginConfig) {
        this.config = { ...this.config, ...pluginConfig };
      }

      // Initialize storage
      await this.storage.initialize();

      // Load saved tasks
      await this.loadTasks();

      // Setup event handlers
      this.setupEventHandlers();

      // Register plugin methods
      this.registerPluginMethods();

      // Start scheduler
      await this.scheduler.start();

      this.isInitialized = true;
      this.logger.info('AutomationPlugin initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize AutomationPlugin:', error);
      throw new PluginError('INITIALIZATION_FAILED', 'Failed to initialize automation plugin');
    }
  }

  private async loadTasks(): Promise<void> {
    try {
      const savedTasks = await this.storage.loadTasks();
      for (const task of savedTasks) {
        this.tasks.set(task.id, task);
        if (task.status === 'pending' || task.status === 'paused') {
          this.scheduler.scheduleTask(task);
        }
      }
      this.logger.info(`Loaded ${savedTasks.length} tasks from storage`);
    } catch (error) {
      this.logger.warn('Failed to load tasks from storage:', error);
    }
  }

  private setupEventHandlers(): void {
    // Handle scheduler events
    this.scheduler.on('task_started', ({ execution }) => {
      this.logger.info(`Task started: ${execution.taskId}`);
      this.emit('task_started', execution);
    });

    this.scheduler.on('task_completed', ({ execution }) => {
      this.logger.info(`Task completed: ${execution.taskId}`);
      this.emit('task_completed', execution);
    });

    this.scheduler.on('task_failed', ({ execution, error }) => {
      this.logger.error(`Task failed: ${execution.taskId}`, error);
      this.emit('task_failed', { execution, error: error.message });
    });

    // Handle action executor events
    this.executor.on('action_started', ({ execution }) => {
      this.logger.debug(`Action started: ${execution.actionId}`);
    });

    this.executor.on('action_completed', ({ execution, result }) => {
      this.logger.debug(`Action completed: ${execution.actionId}`);
    });

    this.executor.on('action_failed', ({ execution, error }) => {
      this.logger.warn(`Action failed: ${execution.actionId}: ${error.message}`);
    });

    // Register for system events
    this.bus.on('system:shutdown', async () => {
      await this.shutdown();
    });

    this.bus.on('automation:create_task', async (data: any) => {
      try {
        const task = await this.createTask(data);
        return { success: true, data: task };
      } catch (error) {
        this.logger.error('Failed to create task:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('automation:execute_task', async (data: { taskId: string }) => {
      try {
        const result = await this.executeTask(data.taskId);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Failed to execute task:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('automation:list_tasks', async () => {
      try {
        const tasks = await this.listTasks();
        return { success: true, data: tasks };
      } catch (error) {
        this.logger.error('Failed to list tasks:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('automation:get_task', async (data: { taskId: string }) => {
      try {
        const task = await this.getTask(data.taskId);
        return { success: true, data: task };
      } catch (error) {
        this.logger.error('Failed to get task:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('automation:update_task', async (data: { taskId: string; updates: Partial<AutomationTask> }) => {
      try {
        const task = await this.updateTask(data.taskId, data.updates);
        return { success: true, data: task };
      } catch (error) {
        this.logger.error('Failed to update task:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('automation:delete_task', async (data: { taskId: string }) => {
      try {
        await this.deleteTask(data.taskId);
        return { success: true };
      } catch (error) {
        this.logger.error('Failed to delete task:', error);
        return { success: false, error: error.message };
      }
    });

    this.bus.on('automation:execute_action', async (data: { action: AutomationAction; context?: any }) => {
      try {
        const result = await this.executeAction(data.action, data.context);
        return { success: true, data: result };
      } catch (error) {
        this.logger.error('Failed to execute action:', error);
        return { success: false, error: error.message };
      }
    });

    // Webhook handler
    if (this.config.enableWebhooks) {
      this.bus.on('webhook:automation', async (data: any) => {
        try {
          await this.handleWebhook(data);
          return { success: true };
        } catch (error) {
          this.logger.error('Failed to handle webhook:', error);
          return { success: false, error: error.message };
        }
      });
    }
  }

  private registerPluginMethods(): void {
    // Plugin methods are registered via event handlers above
  }

  // Public API methods
  async createTask(taskData: Partial<AutomationTask>): Promise<AutomationTask> {
    if (!taskData.name || !taskData.actions || taskData.actions.length === 0) {
      throw new Error('Task must have name and at least one action');
    }

    const task: AutomationTask = {
      id: taskData.id || this.generateId(),
      name: taskData.name,
      description: taskData.description || '',
      type: taskData.type || 'manual',
      status: 'pending',
      priority: taskData.priority || 'medium',
      schedule: taskData.schedule,
      triggers: taskData.triggers,
      actions: taskData.actions,
      conditions: taskData.conditions,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      metadata: taskData.metadata
    };

    // Validate task
    this.validateTask(task);

    // Store task
    this.tasks.set(task.id, task);
    await this.storage.saveTask(task);

    // Schedule if applicable
    if (task.status === 'pending' && (task.schedule || task.type === 'scheduled')) {
      this.scheduler.scheduleTask(task);
    }

    this.logger.info(`Created task: ${task.name} (${task.id})`);
    this.emit('task_created', task);

    return task;
  }

  async executeTask(taskId: string, context?: Record<string, any>): Promise<TaskExecution> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Execute task manually (bypass scheduler)
    return this.scheduler.executeTask(task);
  }

  async listTasks(filter?: {
    status?: AutomationTask['status'];
    type?: AutomationTask['type'];
    priority?: AutomationTask['priority'];
  }): Promise<AutomationTask[]> {
    let tasks = Array.from(this.tasks.values());

    if (filter) {
      tasks = tasks.filter(task => {
        if (filter.status && task.status !== filter.status) return false;
        if (filter.type && task.type !== filter.type) return false;
        if (filter.priority && task.priority !== filter.priority) return false;
        return true;
      });
    }

    return tasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getTask(taskId: string): Promise<AutomationTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return task;
  }

  async updateTask(taskId: string, updates: Partial<AutomationTask>): Promise<AutomationTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };

    // Validate updated task
    this.validateTask(updatedTask);

    this.tasks.set(taskId, updatedTask);
    await this.storage.saveTask(updatedTask);

    // Reschedule if needed
    if (updates.status || updates.schedule) {
      this.scheduler.unscheduleTask(taskId);
      if (updatedTask.status === 'pending' && (updatedTask.schedule || updatedTask.type === 'scheduled')) {
        this.scheduler.scheduleTask(updatedTask);
      }
    }

    this.logger.info(`Updated task: ${updatedTask.name} (${taskId})`);
    this.emit('task_updated', updatedTask);

    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Unschedule task
    this.scheduler.unscheduleTask(taskId);

    // Remove from storage and memory
    await this.storage.deleteTask(taskId);
    this.tasks.delete(taskId);

    this.logger.info(`Deleted task: ${task.name} (${taskId})`);
    this.emit('task_deleted', { taskId, task });
  }

  async executeAction(action: AutomationAction, context?: Record<string, any>): Promise<any> {
    return this.executor.executeAction(action, context);
  }

  async handleWebhook(data: any): Promise<void> {
    // Find tasks with webhook triggers matching this event
    const matchingTasks = Array.from(this.tasks.values()).filter(task =>
      task.triggers?.some(trigger =>
        trigger.type === 'webhook' && this.matchesWebhookTrigger(trigger, data)
      )
    );

    // Execute matching tasks
    for (const task of matchingTasks) {
      try {
        await this.executeTask(task.id, { webhook: data });
      } catch (error) {
        this.logger.error(`Failed to execute webhook-triggered task ${task.id}:`, error);
      }
    }
  }

  private matchesWebhookTrigger(trigger: any, data: any): boolean {
    // Simple webhook matching - in real implementation, this would be more sophisticated
    if (trigger.source && trigger.source !== data.source) return false;
    if (trigger.condition && !this.evaluateCondition(trigger.condition, data)) return false;
    return true;
  }

  private evaluateCondition(condition: string, data: any): boolean {
    // Simple condition evaluation - in real implementation, use proper expression evaluation
    try {
      // This is unsafe for production - implement proper sandboxing
      return new Function('data', `return ${condition}`)(data);
    } catch (error) {
      return false;
    }
  }

  private validateTask(task: AutomationTask): void {
    if (!task.name || task.name.trim() === '') {
      throw new Error('Task name is required');
    }

    if (!task.actions || task.actions.length === 0) {
      throw new Error('Task must have at least one action');
    }

    // Validate actions
    for (const action of task.actions) {
      this.validateAction(action);
    }

    // Validate schedule if present
    if (task.schedule) {
      this.validateSchedule(task.schedule);
    }
  }

  private validateAction(action: AutomationAction): void {
    if (!action.type || !action.config) {
      throw new Error('Action must have type and config');
    }

    // Validate action-specific config
    switch (action.type) {
      case 'http':
        if (!action.config.url) {
          throw new Error('HTTP action requires URL');
        }
        break;
      case 'email':
        if (!action.config.to || !action.config.subject) {
          throw new Error('Email action requires to and subject');
        }
        break;
      // Add more action validations as needed
    }
  }

  private validateSchedule(schedule: any): void {
    if (!schedule.type || !schedule.expression) {
      throw new Error('Schedule must have type and expression');
    }

    const validTypes = ['cron', 'interval', 'once'];
    if (!validTypes.includes(schedule.type)) {
      throw new Error(`Invalid schedule type: ${schedule.type}`);
    }
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event emitter methods
  on(event: string, listener: Function): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: Function): void {
    this.eventEmitter.off(event, listener);
  }

  private emit(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AutomationPlugin');

    // Stop scheduler
    await this.scheduler.stop();

    // Save all tasks
    for (const task of this.tasks.values()) {
      await this.storage.saveTask(task);
    }

    this.isInitialized = false;
    this.logger.info('AutomationPlugin shutdown complete');
  }

  async destroy(): Promise<void> {
    await this.shutdown();
    this.eventEmitter.removeAllListeners();
  }

  // Public status methods
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      taskCount: this.tasks.size,
      schedulerStatus: this.scheduler.getStatus(),
      activeExecutions: this.executor.getActiveExecutions().length
    };
  }

  async getMetrics() {
    if (!this.config.enableMetrics) {
      return null;
    }

    const tasks = Array.from(this.tasks.values());
    const totalExecutions = tasks.reduce((sum, task) => sum + task.executionCount, 0);
    const totalSuccesses = tasks.reduce((sum, task) => sum + task.successCount, 0);
    const totalFailures = tasks.reduce((sum, task) => sum + task.failureCount, 0);

    return {
      totalTasks: tasks.length,
      totalExecutions,
      totalSuccesses,
      totalFailures,
      successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
      tasksByStatus: {
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        failed: tasks.filter(t => t.status === 'failed').length,
        paused: tasks.filter(t => t.status === 'paused').length
      },
      tasksByType: {
        scheduled: tasks.filter(t => t.type === 'scheduled').length,
        triggered: tasks.filter(t => t.type === 'triggered').length,
        manual: tasks.filter(t => t.type === 'manual').length
      }
    };
  }
}

// Simple storage implementation
class AutomationStorage {
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
  }

  async initialize(): Promise<void> {
    // In real implementation, ensure storage directory exists
    console.log(`Initializing automation storage at: ${this.storagePath}`);
  }

  async saveTask(task: AutomationTask): Promise<void> {
    // In real implementation, save to filesystem/database
    console.log(`Saving task: ${task.id}`);
  }

  async loadTasks(): Promise<AutomationTask[]> {
    // In real implementation, load from filesystem/database
    console.log('Loading tasks from storage');
    return [];
  }

  async deleteTask(taskId: string): Promise<void> {
    // In real implementation, delete from filesystem/database
    console.log(`Deleting task: ${taskId}`);
  }
}