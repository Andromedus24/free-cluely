// Alert Manager Implementation
// =========================

import { EventEmitter } from 'events';
import {
  AlertConfig,
  AlertEvent,
  AlertCondition,
  AlertSeverity,
  AlertAction,
  NotificationChannel,
  AlertingConfig,
  ObservabilityEventType,
  Metric
} from '../types';
import { MetricsCollector } from '../metrics/MetricsCollector';

/**
 * Enterprise-grade alerting system with sophisticated rules and notifications
 */
export class AlertManager extends EventEmitter {
  private config: AlertingConfig;
  private alerts: Map<string, AlertConfig> = new Map();
  private alertHistory: AlertEvent[] = [];
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private cooldowns: Map<string, number> = new Map();
  private suppressionRules: Map<string, SuppressionRule> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private metricsCollector?: MetricsCollector;
  private evaluationTimer?: NodeJS.Timeout;
  private notificationTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: AlertingConfig, metricsCollector?: MetricsCollector) {
    super();
    this.config = config;
    this.metricsCollector = metricsCollector;
    this.initializeNotificationChannels();
    this.initializeDefaultAlerts();
    this.initializeEscalationPolicies();
  }

  /**
   * Start alert manager
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startEvaluation();
    this.startNotificationProcessing();

    this.emit('started');
  }

  /**
   * Stop alert manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.stopEvaluation();
    this.stopNotificationProcessing();

    this.emit('stopped');
  }

  /**
   * Create a new alert
   */
  async createAlert(alert: AlertConfig): Promise<void> {
    this.validateAlert(alert);

    // Check for duplicate alerts
    if (this.alerts.has(alert.id)) {
      throw new Error(`Alert with ID '${alert.id}' already exists`);
    }

    this.alerts.set(alert.id, alert);
    this.alertRules.set(alert.id, this.createAlertRule(alert));

    this.emit('alertCreated', alert);
    this.info(`Alert created: ${alert.name} (${alert.id})`);
  }

  /**
   * Update an existing alert
   */
  async updateAlert(id: string, updates: Partial<AlertConfig>): Promise<void> {
    const existing = this.alerts.get(id);
    if (!existing) {
      throw new Error(`Alert not found: ${id}`);
    }

    const updated = { ...existing, ...updates };
    this.validateAlert(updated);

    this.alerts.set(id, updated);
    this.alertRules.set(id, this.createAlertRule(updated));

    this.emit('alertUpdated', { id, oldAlert: existing, newAlert: updated });
    this.info(`Alert updated: ${updated.name} (${id})`);
  }

  /**
   * Delete an alert
   */
  async deleteAlert(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    this.alerts.delete(id);
    this.alertRules.delete(id);
    this.activeAlerts.delete(id);
    this.cooldowns.delete(id);

    this.emit('alertDeleted', alert);
    this.info(`Alert deleted: ${alert.name} (${id})`);
  }

  /**
   * Get all alerts
   */
  getAlerts(): AlertConfig[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get alert by ID
   */
  getAlert(id: string): AlertConfig | null {
    return this.alerts.get(id) || null;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(filter: AlertHistoryFilter = {}): AlertEvent[] {
    let history = [...this.alertHistory];

    if (filter.alertId) {
      history = history.filter(event => event.alertId === filter.alertId);
    }

    if (filter.severity) {
      history = history.filter(event => event.severity === filter.severity);
    }

    if (filter.resolved !== undefined) {
      history = history.filter(event => event.resolved === filter.resolved);
    }

    if (filter.startTime) {
      history = history.filter(event => event.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      history = history.filter(event => event.timestamp <= filter.endTime!);
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (filter.limit) {
      history = history.slice(0, filter.limit);
    }

    return history;
  }

  /**
   * Manually trigger an alert
   */
  async triggerAlert(id: string, metadata: Record<string, any> = {}): Promise<void> {
    const alert = this.alerts.get(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    await this.evaluateAndTrigger(alert, metadata);
  }

  /**
   * Manually resolve an alert
   */
  async resolveAlert(id: string, reason?: string): Promise<void> {
    const activeAlert = this.activeAlerts.get(id);
    if (!activeAlert) {
      throw new Error(`No active alert found: ${id}`);
    }

    await this.resolveAlertEvent(activeAlert, reason);
  }

  /**
   * Add a notification channel
   */
  async addNotificationChannel(channel: NotificationChannel): Promise<void> {
    this.validateNotificationChannel(channel);

    if (this.notificationChannels.has(channel.id)) {
      throw new Error(`Notification channel with ID '${channel.id}' already exists`);
    }

    this.notificationChannels.set(channel.id, channel);
    this.emit('notificationChannelAdded', channel);
    this.info(`Notification channel added: ${channel.name} (${channel.id})`);
  }

  /**
   * Update a notification channel
   */
  async updateNotificationChannel(id: string, updates: Partial<NotificationChannel>): Promise<void> {
    const existing = this.notificationChannels.get(id);
    if (!existing) {
      throw new Error(`Notification channel not found: ${id}`);
    }

    const updated = { ...existing, ...updates };
    this.validateNotificationChannel(updated);

    this.notificationChannels.set(id, updated);
    this.emit('notificationChannelUpdated', { id, oldChannel: existing, newChannel: updated });
    this.info(`Notification channel updated: ${updated.name} (${id})`);
  }

  /**
   * Delete a notification channel
   */
  async deleteNotificationChannel(id: string): Promise<void> {
    const channel = this.notificationChannels.get(id);
    if (!channel) {
      throw new Error(`Notification channel not found: ${id}`);
    }

    this.notificationChannels.delete(id);
    this.emit('notificationChannelDeleted', channel);
    this.info(`Notification channel deleted: ${channel.name} (${id})`);
  }

  /**
   * Get notification channels
   */
  getNotificationChannels(): NotificationChannel[] {
    return Array.from(this.notificationChannels.values());
  }

  /**
   * Add a suppression rule
   */
  async addSuppressionRule(rule: SuppressionRule): Promise<void> {
    this.suppressionRules.set(rule.id, rule);
    this.emit('suppressionRuleAdded', rule);
    this.info(`Suppression rule added: ${rule.name} (${rule.id})`);
  }

  /**
   * Remove a suppression rule
   */
  async removeSuppressionRule(id: string): Promise<void> {
    const rule = this.suppressionRules.get(id);
    if (!rule) {
      throw new Error(`Suppression rule not found: ${id}`);
    }

    this.suppressionRules.delete(id);
    this.emit('suppressionRuleRemoved', rule);
    this.info(`Suppression rule removed: ${rule.name} (${id})`);
  }

  /**
   * Get suppression rules
   */
  getSuppressionRules(): SuppressionRule[] {
    return Array.from(this.suppressionRules.values());
  }

  /**
   * Add an escalation policy
   */
  async addEscalationPolicy(policy: EscalationPolicy): Promise<void> {
    this.escalationPolicies.set(policy.id, policy);
    this.emit('escalationPolicyAdded', policy);
    this.info(`Escalation policy added: ${policy.name} (${policy.id})`);
  }

  /**
   * Get escalation policies
   */
  getEscalationPolicies(): EscalationPolicy[] {
    return Array.from(this.escalationPolicies.values());
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    totalAlerts: number;
    activeAlerts: number;
    alertHistory: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    alertsByType: Record<string, number>;
    averageResolutionTime: number;
    alertFrequency: number;
  } {
    const totalAlerts = this.alerts.size;
    const activeAlerts = this.activeAlerts.size;
    const alertHistory = this.alertHistory.length;

    const alertsBySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    };

    const alertsByType: Record<string, number> = {};

    // Count active alerts by severity
    for (const alert of this.activeAlerts.values()) {
      alertsBySeverity[alert.severity]++;
    }

    // Count alerts by type (metric)
    for (const alert of this.alerts.values()) {
      const type = alert.condition.metric;
      alertsByType[type] = (alertsByType[type] || 0) + 1;
    }

    // Calculate average resolution time
    const resolvedAlerts = this.alertHistory.filter(event => event.resolved);
    const averageResolutionTime = resolvedAlerts.length > 0 ?
      resolvedAlerts.reduce((sum, event) => {
        const resolutionTime = (event.resolvedAt || 0) - event.timestamp;
        return sum + resolutionTime;
      }, 0) / resolvedAlerts.length : 0;

    // Calculate alert frequency (alerts per hour)
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentAlerts = this.alertHistory.filter(event => event.timestamp > oneHourAgo);
    const alertFrequency = recentAlerts.length;

    return {
      totalAlerts,
      activeAlerts,
      alertHistory,
      alertsBySeverity,
      alertsByType,
      averageResolutionTime,
      alertFrequency
    };
  }

  // Private methods
  private initializeNotificationChannels(): void {
    // Add default notification channels from config
    this.config.notificationChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }

  private initializeDefaultAlerts(): void {
    // Add some default alerts for common scenarios
    const defaultAlerts = this.createDefaultAlerts();
    defaultAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert);
      this.alertRules.set(alert.id, this.createAlertRule(alert));
    });
  }

  private initializeEscalationPolicies(): void {
    // Add default escalation policies
    const defaultPolicies = this.createDefaultEscalationPolicies();
    defaultPolicies.forEach(policy => {
      this.escalationPolicies.set(policy.id, policy);
    });
  }

  private startEvaluation(): void {
    this.evaluationTimer = setInterval(() => {
      this.evaluateAllAlerts();
    }, this.config.evaluationInterval);
  }

  private stopEvaluation(): void {
    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }
  }

  private startNotificationProcessing(): void {
    this.notificationTimer = setInterval(() => {
      this.processNotifications();
    }, 1000); // Process notifications every second
  }

  private stopNotificationProcessing(): void {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = undefined;
    }
  }

  private evaluateAllAlerts(): void {
    for (const alert of this.alerts.values()) {
      if (!alert.enabled) continue;

      try {
        this.evaluateAlert(alert);
      } catch (error) {
        this.emit('error', new Error(`Failed to evaluate alert ${alert.id}: ${error}`));
      }
    }
  }

  private async evaluateAlert(alert: AlertConfig): Promise<void> {
    // Check suppression rules
    if (this.isAlertSuppressed(alert)) {
      return;
    }

    // Check cooldown
    if (this.isInCooldown(alert.id)) {
      return;
    }

    // Evaluate condition
    const triggered = await this.evaluateCondition(alert.condition);
    if (!triggered) {
      return;
    }

    // Trigger the alert
    await this.evaluateAndTrigger(alert);
  }

  private async evaluateCondition(condition: AlertCondition): Promise<boolean> {
    if (!this.metricsCollector) {
      return false;
    }

    const metrics = this.metricsCollector.getMetrics(condition.metric);
    if (metrics.length === 0) {
      return false;
    }

    // Get the latest metric value
    const latestMetric = metrics[metrics.length - 1];
    let value = latestMetric.value;

    // Apply aggregation if specified
    if (condition.aggregation && condition.aggregation !== 'count') {
      value = this.aggregateMetrics(metrics, condition.aggregation);
    }

    // Apply duration-based evaluation
    if (condition.duration && condition.duration > 0) {
      const cutoffTime = Date.now() - condition.duration;
      const recentMetrics = metrics.filter(m => m.timestamp >= cutoffTime);

      if (recentMetrics.length === 0) {
        return false;
      }

      // Check if condition has been true for the entire duration
      return recentMetrics.every(metric => {
        const metricValue = condition.aggregation && condition.aggregation !== 'count' ?
          this.aggregateMetrics(recentMetrics, condition.aggregation) : metric.value;
        return this.evaluateOperator(metricValue, condition.operator, condition.threshold);
      });
    }

    return this.evaluateOperator(value, condition.operator, condition.threshold);
  }

  private evaluateOperator(value: number, operator: AlertCondition['operator'], threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'ne': return value !== threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      default: return false;
    }
  }

  private aggregateMetrics(metrics: Metric[], aggregation: AlertCondition['aggregation']): number {
    if (metrics.length === 0) return 0;

    const values = metrics.map(m => m.value);

    switch (aggregation) {
      case 'avg':
        return values.reduce((sum, val) => sum + val, 0) / values.length;
      case 'max':
        return Math.max(...values);
      case 'min':
        return Math.min(...values);
      case 'sum':
        return values.reduce((sum, val) => sum + val, 0);
      case 'count':
        return values.length;
      default:
        return values[values.length - 1];
    }
  }

  private async evaluateAndTrigger(alert: AlertConfig, metadata: Record<string, any> = {}): Promise<void> {
    const existingActive = this.activeAlerts.get(alert.id);

    if (existingActive) {
      // Alert is already active, just update it
      existingActive.metadata = { ...existingActive.metadata, ...metadata };
      existingActive.timestamp = Date.now();
      this.emit('alertUpdated', existingActive);
      return;
    }

    // Create new alert event
    const event: AlertEvent = {
      id: this.generateId(),
      alertId: alert.id,
      timestamp: Date.now(),
      severity: alert.severity,
      message: alert.description,
      metric: alert.condition.metric,
      value: 0, // Would be calculated based on condition
      threshold: alert.condition.threshold,
      resolved: false,
      metadata
    };

    // Get actual value
    if (this.metricsCollector) {
      const metrics = this.metricsCollector.getMetrics(alert.condition.metric);
      if (metrics.length > 0) {
        event.value = metrics[metrics.length - 1].value;
      }
    }

    // Add to active alerts and history
    this.activeAlerts.set(alert.id, event);
    this.alertHistory.push(event);

    // Set cooldown
    this.setCooldown(alert.id, alert.cooldown);

    // Process notifications
    await this.processAlertNotifications(alert, event);

    // Check for escalation
    await this.checkEscalation(alert, event);

    this.emit('alertTriggered', event);
    this.warn(`Alert triggered: ${alert.name} (${alert.id})`);
  }

  private async resolveAlertEvent(event: AlertEvent, reason?: string): Promise<void> {
    event.resolved = true;
    event.resolvedAt = Date.now();
    if (reason) {
      event.metadata.resolutionReason = reason;
    }

    // Remove from active alerts
    this.activeAlerts.delete(event.alertId);

    // Send resolution notifications
    const alert = this.alerts.get(event.alertId);
    if (alert) {
      await this.sendResolutionNotifications(alert, event);
    }

    this.emit('alertResolved', event);
    this.info(`Alert resolved: ${event.alertId}`);
  }

  private async processAlertNotifications(alert: AlertConfig, event: AlertEvent): Promise<void> {
    for (const action of alert.actions) {
      if (!action.enabled) continue;

      try {
        await this.executeAlertAction(action, event, alert);
      } catch (error) {
        this.emit('error', new Error(`Failed to execute alert action for ${alert.id}: ${error}`));
      }
    }
  }

  private async executeAlertAction(action: AlertAction, event: AlertEvent, alert: AlertConfig): Promise<void> {
    const channel = this.notificationChannels.get(action.type);
    if (!channel) {
      this.emit('error', new Error(`Notification channel not found: ${action.type}`));
      return;
    }

    if (!channel.enabled) {
      return;
    }

    const notification: AlertNotification = {
      id: this.generateId(),
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      message: alert.description,
      metric: alert.condition.metric,
      value: event.value,
      threshold: alert.condition.threshold,
      timestamp: event.timestamp,
      metadata: event.metadata,
      channel: channel.type,
      config: channel.config
    };

    await this.sendNotification(channel, notification);
  }

  private async sendNotification(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
    // This would integrate with actual notification services
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhookNotification(channel, notification);
        break;
      case 'email':
        await this.sendEmailNotification(channel, notification);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, notification);
        break;
      case 'pagerduty':
        await this.sendPagerDutyNotification(channel, notification);
        break;
      case 'log':
        this.logNotification(notification);
        break;
      default:
        throw new Error(`Unsupported notification channel type: ${channel.type}`);
    }
  }

  private async sendResolutionNotifications(alert: AlertConfig, event: AlertEvent): Promise<void> {
    // Similar to processAlertNotifications but for resolution
    for (const action of alert.actions) {
      if (!action.enabled) continue;

      try {
        await this.sendResolutionNotification(action, event, alert);
      } catch (error) {
        this.emit('error', new Error(`Failed to send resolution notification for ${alert.id}: ${error}`));
      }
    }
  }

  private async sendResolutionNotification(action: AlertAction, event: AlertEvent, alert: AlertConfig): Promise<void> {
    const channel = this.notificationChannels.get(action.type);
    if (!channel || !channel.enabled) return;

    const notification: AlertNotification = {
      id: this.generateId(),
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      message: `Resolved: ${alert.description}`,
      metric: alert.condition.metric,
      value: event.value,
      threshold: alert.condition.threshold,
      timestamp: event.timestamp,
      metadata: {
        ...event.metadata,
        resolved: true,
        resolutionReason: event.metadata.resolutionReason
      },
      channel: channel.type,
      config: channel.config
    };

    await this.sendNotification(channel, notification);
  }

  private async checkEscalation(alert: AlertConfig, event: AlertEvent): Promise<void> {
    const policy = this.escalationPolicies.get(alert.id);
    if (!policy) return;

    const activeDuration = Date.now() - event.timestamp;
    if (activeDuration < policy.escalationTime) return;

    // Escalate the alert
    for (const escalation of policy.escalations) {
      if (activeDuration >= escalation.delay) {
        await this.escalateAlert(alert, event, escalation);
      }
    }
  }

  private async escalateAlert(alert: AlertConfig, event: AlertEvent, escalation: EscalationLevel): Promise<void> {
    const escalationEvent: AlertEvent = {
      ...event,
      id: this.generateId(),
      severity: escalation.severity,
      message: `Escalated: ${alert.description}`,
      metadata: {
        ...event.metadata,
        escalationLevel: escalation.level,
        escalationReason: escalation.reason
      }
    };

    this.emit('alertEscalated', escalationEvent);
    this.warn(`Alert escalated: ${alert.name} to level ${escalation.level}`);
  }

  private processNotifications(): void {
    // Process any pending notifications
    // This could include retries, batching, etc.
  }

  private isAlertSuppressed(alert: AlertConfig): boolean {
    for (const rule of this.suppressionRules.values()) {
      if (rule.enabled && this.matchesSuppressionRule(alert, rule)) {
        return true;
      }
    }
    return false;
  }

  private matchesSuppressionRule(alert: AlertConfig, rule: SuppressionRule): boolean {
    if (rule.alertIds && !rule.alertIds.includes(alert.id)) {
      return false;
    }

    if (rule.severities && !rule.severities.includes(alert.severity)) {
      return false;
    }

    if (rule.timeWindow) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      if (rule.timeWindow.days && !rule.timeWindow.days.includes(currentDay)) {
        return false;
      }

      if (rule.timeWindow.startHour && rule.timeWindow.endHour) {
        if (currentHour < rule.timeWindow.startHour || currentHour > rule.timeWindow.endHour) {
          return false;
        }
      }
    }

    return true;
  }

  private isInCooldown(alertId: string): boolean {
    const cooldownEnd = this.cooldowns.get(alertId);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  private setCooldown(alertId: string, duration: number): void {
    this.cooldowns.set(alertId, Date.now() + duration);
  }

  private validateAlert(alert: AlertConfig): void {
    if (!alert.id || !alert.name || !alert.description) {
      throw new Error('Alert must have id, name, and description');
    }

    if (!alert.condition || !alert.condition.metric) {
      throw new Error('Alert must have a valid condition');
    }

    if (!alert.severity || !['info', 'warning', 'error', 'critical'].includes(alert.severity)) {
      throw new Error('Alert must have a valid severity');
    }
  }

  private validateNotificationChannel(channel: NotificationChannel): void {
    if (!channel.id || !channel.name || !channel.type) {
      throw new Error('Notification channel must have id, name, and type');
    }

    if (!['webhook', 'email', 'slack', 'pagerduty', 'log'].includes(channel.type)) {
      throw new Error('Invalid notification channel type');
    }
  }

  private createAlertRule(alert: AlertConfig): AlertRule {
    return {
      id: alert.id,
      name: alert.name,
      condition: alert.condition,
      severity: alert.severity,
      enabled: alert.enabled,
      lastEvaluated: 0,
      evaluationCount: 0,
      triggerCount: 0
    };
  }

  private createDefaultAlerts(): AlertConfig[] {
    return [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Application error rate exceeds threshold',
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          threshold: 0.05,
          duration: 300000 // 5 minutes
        },
        severity: 'error',
        actions: [
          {
            type: 'log',
            config: {},
            enabled: true
          }
        ],
        cooldown: 300000,
        enabled: true,
        tags: {}
      },
      {
        id: 'high-response-time',
        name: 'High Response Time',
        description: 'Application response time exceeds threshold',
        condition: {
          metric: 'response_time_p95',
          operator: 'gt',
          threshold: 1000,
          duration: 300000 // 5 minutes
        },
        severity: 'warning',
        actions: [
          {
            type: 'log',
            config: {},
            enabled: true
          }
        ],
        cooldown: 300000,
        enabled: true,
        tags: {}
      }
    ];
  }

  private createDefaultEscalationPolicies(): EscalationPolicy[] {
    return [
      {
        id: 'default-escalation',
        name: 'Default Escalation Policy',
        escalationTime: 1800000, // 30 minutes
        escalations: [
          {
            level: 1,
            delay: 1800000, // 30 minutes
            severity: 'error',
            reason: 'Alert has been active for 30 minutes'
          },
          {
            level: 2,
            delay: 3600000, // 1 hour
            severity: 'critical',
            reason: 'Alert has been active for 1 hour'
          }
        ],
        enabled: true
      }
    ];
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  private info(message: string): void {
    this.emit('log', { level: 'info', message, source: 'AlertManager' });
  }

  private warn(message: string): void {
    this.emit('log', { level: 'warn', message, source: 'AlertManager' });
  }

  private async sendWebhookNotification(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
    // Implementation for webhook notifications
    this.info(`Sending webhook notification for alert ${notification.alertId}`);
  }

  private async sendEmailNotification(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
    // Implementation for email notifications
    this.info(`Sending email notification for alert ${notification.alertId}`);
  }

  private async sendSlackNotification(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
    // Implementation for Slack notifications
    this.info(`Sending Slack notification for alert ${notification.alertId}`);
  }

  private async sendPagerDutyNotification(channel: NotificationChannel, notification: AlertNotification): Promise<void> {
    // Implementation for PagerDuty notifications
    this.info(`Sending PagerDuty notification for alert ${notification.alertId}`);
  }

  private logNotification(notification: AlertNotification): void {
    this.info(`Alert notification: ${notification.alertName} - ${notification.message}`);
  }
}

// Supporting interfaces
export interface AlertHistoryFilter {
  alertId?: string;
  severity?: AlertSeverity;
  resolved?: boolean;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  lastEvaluated: number;
  evaluationCount: number;
  triggerCount: number;
}

export interface SuppressionRule {
  id: string;
  name: string;
  enabled: boolean;
  alertIds?: string[];
  severities?: AlertSeverity[];
  timeWindow?: {
    days?: number[];
    startHour?: number;
    endHour?: number;
  };
  reason?: string;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  escalationTime: number;
  escalations: EscalationLevel[];
  enabled: boolean;
}

export interface EscalationLevel {
  level: number;
  delay: number;
  severity: AlertSeverity;
  reason: string;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  alertName: string;
  severity: AlertSeverity;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  metadata: Record<string, any>;
  channel: string;
  config: Record<string, any>;
}