import { EventEmitter } from 'events';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  ExecutionContext,
  ExecutionStatus
} from '../types/WorkflowTypes';
import { WorkflowExecutionEngine, ExecutionOptions } from '../core/WorkflowExecutionEngine';

export interface ScheduleConfig {
  id: string;
  workflowId: string;
  name: string;
  cronExpression: string;
  timezone?: string;
  enabled: boolean;
  input?: any;
  options?: ExecutionOptions;
  startDate?: Date;
  endDate?: Date;
  maxRuns?: number;
  runCount: number;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledJob {
  id: string;
  scheduleId: string;
  executionId: string;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input?: any;
  output?: any;
  error?: string;
}

export interface TriggerEvent {
  id: string;
  type: 'http' | 'webhook' | 'manual' | 'api' | 'scheduled';
  workflowId: string;
  data: any;
  timestamp: Date;
  source?: string;
}

export class WorkflowScheduler extends EventEmitter {
  private schedules: Map<string, ScheduleConfig> = new Map();
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private cronTasks: Map<string, any> = new Map();
  private executionEngine: WorkflowExecutionEngine;
  private triggerQueue: TriggerEvent[] = [];
  private isProcessingTriggers = false;

  constructor(executionEngine: WorkflowExecutionEngine) {
    super();
    this.executionEngine = executionEngine;
    this.setupEventListeners();
  }

  // Schedule management
  async createSchedule(config: Omit<ScheduleConfig, 'id' | 'runCount' | 'createdAt' | 'updatedAt'>): Promise<ScheduleConfig> {
    const schedule: ScheduleConfig = {
      ...config,
      id: uuidv4(),
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate cron expression
    if (!cron.validate(config.cronExpression)) {
      throw new Error(`Invalid cron expression: ${config.cronExpression}`);
    }

    this.schedules.set(schedule.id, schedule);

    if (schedule.enabled) {
      await this.enableSchedule(schedule.id);
    }

    this.emit('scheduleCreated', schedule);
    return schedule;
  }

  async updateSchedule(id: string, updates: Partial<ScheduleConfig>): Promise<ScheduleConfig> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`);
    }

    // Check if cron expression changed
    if (updates.cronExpression && updates.cronExpression !== schedule.cronExpression) {
      if (!cron.validate(updates.cronExpression)) {
        throw new Error(`Invalid cron expression: ${updates.cronExpression}`);
      }

      // Disable and re-enable with new cron
      if (schedule.enabled) {
        await this.disableSchedule(id);
      }
    }

    const updatedSchedule = {
      ...schedule,
      ...updates,
      updatedAt: new Date()
    };

    this.schedules.set(id, updatedSchedule);

    // Re-enable if necessary
    if (updatedSchedule.enabled && !schedule.enabled) {
      await this.enableSchedule(id);
    } else if (!updatedSchedule.enabled && schedule.enabled) {
      await this.disableSchedule(id);
    }

    this.emit('scheduleUpdated', updatedSchedule);
    return updatedSchedule;
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`);
    }

    await this.disableSchedule(id);
    this.schedules.delete(id);

    this.emit('scheduleDeleted', schedule);
  }

  async enableSchedule(id: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`);
    }

    if (schedule.enabled && this.cronTasks.has(id)) {
      return; // Already enabled
    }

    const task = cron.schedule(schedule.cronExpression, async () => {
      await this.executeScheduledRun(schedule.id);
    }, {
      scheduled: false,
      timezone: schedule.timezone || 'UTC'
    });

    task.start();
    this.cronTasks.set(id, task);

    // Update next run time
    schedule.nextRun = this.getNextRunTime(schedule.cronExpression, schedule.timezone);
    schedule.enabled = true;
    schedule.updatedAt = new Date();

    this.schedules.set(id, schedule);

    this.emit('scheduleEnabled', schedule);
  }

  async disableSchedule(id: string): Promise<void> {
    const schedule = this.schedules.get(id);
    if (!schedule) {
      throw new Error(`Schedule ${id} not found`);
    }

    const task = this.cronTasks.get(id);
    if (task) {
      task.stop();
      this.cronTasks.delete(id);
    }

    schedule.enabled = false;
    schedule.nextRun = undefined;
    schedule.updatedAt = new Date();

    this.schedules.set(id, schedule);

    this.emit('scheduleDisabled', schedule);
  }

  // Trigger management
  async addTrigger(trigger: Omit<TriggerEvent, 'id' | 'timestamp'>): Promise<void> {
    const triggerEvent: TriggerEvent = {
      ...trigger,
      id: uuidv4(),
      timestamp: new Date()
    };

    this.triggerQueue.push(triggerEvent);

    if (!this.isProcessingTriggers) {
      this.processTriggerQueue();
    }

    this.emit('triggerAdded', triggerEvent);
  }

  async addHttpTrigger(workflowId: string, data: any, source?: string): Promise<void> {
    await this.addTrigger({
      type: 'http',
      workflowId,
      data,
      source
    });
  }

  async addWebhookTrigger(workflowId: string, data: any, source?: string): Promise<void> {
    await this.addTrigger({
      type: 'webhook',
      workflowId,
      data,
      source
    });
  }

  async addManualTrigger(workflowId: string, data?: any): Promise<void> {
    await this.addTrigger({
      type: 'manual',
      workflowId,
      data: data || {}
    });
  }

  // Job management
  async getScheduledJobs(filters?: {
    scheduleId?: string;
    status?: ScheduledJob['status'];
    limit?: number;
    offset?: number;
  }): Promise<ScheduledJob[]> {
    let jobs = Array.from(this.scheduledJobs.values());

    if (filters) {
      if (filters.scheduleId) {
        jobs = jobs.filter(job => job.scheduleId === filters.scheduleId);
      }
      if (filters.status) {
        jobs = jobs.filter(job => job.status === filters.status);
      }
      if (filters.limit) {
        const offset = filters.offset || 0;
        jobs = jobs.slice(offset, offset + filters.limit);
      }
    }

    return jobs.sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }

  async getScheduledJob(id: string): Promise<ScheduledJob | null> {
    return this.scheduledJobs.get(id) || null;
  }

  async cancelScheduledJob(id: string): Promise<void> {
    const job = this.scheduledJobs.get(id);
    if (!job) {
      throw new Error(`Scheduled job ${id} not found`);
    }

    if (job.status === 'pending') {
      job.status = 'cancelled';
      this.scheduledJobs.set(id, job);
      this.emit('jobCancelled', job);
    }
  }

  // Schedules API
  async getSchedules(filters?: {
    enabled?: boolean;
    workflowId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScheduleConfig[]> {
    let schedules = Array.from(this.schedules.values());

    if (filters) {
      if (filters.enabled !== undefined) {
        schedules = schedules.filter(s => s.enabled === filters.enabled);
      }
      if (filters.workflowId) {
        schedules = schedules.filter(s => s.workflowId === filters.workflowId);
      }
      if (filters.limit) {
        const offset = filters.offset || 0;
        schedules = schedules.slice(offset, offset + filters.limit);
      }
    }

    return schedules.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async getSchedule(id: string): Promise<ScheduleConfig | null> {
    return this.schedules.get(id) || null;
  }

  // Utility methods
  private async executeScheduledRun(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.enabled) {
      return;
    }

    // Check run limit
    if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) {
      await this.disableSchedule(scheduleId);
      this.emit('scheduleLimitReached', schedule);
      return;
    }

    // Check date range
    const now = new Date();
    if (schedule.startDate && now < schedule.startDate) {
      return;
    }
    if (schedule.endDate && now > schedule.endDate) {
      await this.disableSchedule(scheduleId);
      this.emit('scheduleExpired', schedule);
      return;
    }

    // Create scheduled job
    const job: ScheduledJob = {
      id: uuidv4(),
      scheduleId: schedule.id,
      executionId: '',
      scheduledAt: now,
      status: 'pending',
      input: schedule.input
    };

    this.scheduledJobs.set(job.id, job);

    try {
      // Execute workflow
      const executionId = await this.executionEngine.executeWorkflow(
        { id: schedule.workflowId } as Workflow, // In practice, fetch full workflow
        schedule.input,
        schedule.options
      );

      job.executionId = executionId;
      job.status = 'running';
      job.startedAt = new Date();
      this.scheduledJobs.set(job.id, job);

      // Wait for execution to complete
      const context = await this.executionEngine.getExecutionContext(executionId);
      if (context) {
        job.status = context.status === ExecutionStatus.COMPLETED ? 'completed' : 'failed';
        job.completedAt = new Date();
        job.output = context.variables;
        job.error = context.error;
      }

      // Update schedule
      schedule.runCount++;
      schedule.lastRun = now;
      schedule.nextRun = this.getNextRunTime(schedule.cronExpression, schedule.timezone);
      schedule.updatedAt = new Date();

      this.schedules.set(scheduleId, schedule);
      this.scheduledJobs.set(job.id, job);

      this.emit('scheduledRunCompleted', { schedule, job });
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.scheduledJobs.set(job.id, job);

      this.emit('scheduledRunFailed', { schedule, job, error });
    }
  }

  private async processTriggerQueue(): Promise<void> {
    if (this.isProcessingTriggers) return;

    this.isProcessingTriggers = true;

    while (this.triggerQueue.length > 0) {
      const trigger = this.triggerQueue.shift()!;

      try {
        await this.executionEngine.executeWorkflow(
          { id: trigger.workflowId } as Workflow, // In practice, fetch full workflow
          trigger.data
        );

        this.emit('triggerProcessed', trigger);
      } catch (error) {
        this.emit('triggerFailed', { trigger, error });
      }
    }

    this.isProcessingTriggers = false;
  }

  private getNextRunTime(cronExpression: string, timezone?: string): Date {
    try {
      // This is a simplified calculation
      // In practice, use a proper cron library that can calculate next run times
      const now = new Date();
      const task = cron.schedule(cronExpression, () => {}, {
        scheduled: false,
        timezone: timezone || 'UTC'
      });

      // This is a placeholder - actual implementation depends on the cron library
      return new Date(now.getTime() + 60000); // Default to 1 minute from now
    } catch {
      return new Date();
    }
  }

  private setupEventListeners(): void {
    this.executionEngine.on('execution', (event) => {
      // Handle execution events
      if (event.type === 'complete' || event.type === 'error') {
        // Update corresponding scheduled job if this was a scheduled execution
        for (const [jobId, job] of this.scheduledJobs) {
          if (job.executionId === event.executionId) {
            job.status = event.type === 'complete' ? 'completed' : 'failed';
            job.completedAt = new Date();
            this.scheduledJobs.set(jobId, job);
            break;
          }
        }
      }
    });
  }

  // Statistics and monitoring
  async getSchedulerStats(): Promise<{
    totalSchedules: number;
    enabledSchedules: number;
    totalJobs: number;
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    triggerQueueSize: number;
  }> {
    const schedules = Array.from(this.schedules.values());
    const jobs = Array.from(this.scheduledJobs.values());

    return {
      totalSchedules: schedules.length,
      enabledSchedules: schedules.filter(s => s.enabled).length,
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      completedJobs: jobs.filter(j => j.status === 'completed').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      triggerQueueSize: this.triggerQueue.length
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Stop all cron tasks
    for (const [id, task] of this.cronTasks) {
      task.stop();
    }
    this.cronTasks.clear();

    // Clear queues
    this.triggerQueue = [];
    this.isProcessingTriggers = false;

    this.emit('cleanup');
  }
}