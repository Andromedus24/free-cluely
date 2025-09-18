import {
  IModerationNotifier,
  ModerationAnalysis,
  UserReport,
  ModerationQueueItem,
  ModerationDecision,
  ModerationAppeal
} from '../types/ModerationTypes';

/**
 * Moderation Notification Service
 * Handles sending notifications for various moderation events
 */
export class ModerationNotifier implements IModerationNotifier {
  private channels: Map<string, NotificationChannel> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private enabled = true;

  constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
  }

  async notifyFlag(analysis: ModerationAnalysis): Promise<void> {
    if (!this.enabled) return;

    const template = this.templates.get('flag');
    if (!template) return;

    const context = {
      analysis,
      contentId: analysis.contentId,
      contentType: analysis.contentType,
      severity: analysis.severity,
      category: analysis.category,
      score: analysis.score,
      flags: analysis.flags,
      timestamp: analysis.createdAt
    };

    await this.sendNotification('flag', context, template);
  }

  async notifyReport(report: UserReport): Promise<void> {
    if (!this.enabled) return;

    const template = this.templates.get('report');
    if (!template) return;

    const context = {
      report,
      contentId: report.contentId,
      contentType: report.contentType,
      reporterId: report.reporterId,
      reason: report.reason,
      category: report.category,
      severity: report.severity,
      timestamp: report.createdAt
    };

    await this.sendNotification('report', context, template);
  }

  async notifyEscalation(queueItem: ModerationQueueItem): Promise<void> {
    if (!this.enabled) return;

    const template = this.templates.get('escalation');
    if (!template) return;

    const context = {
      queueItem,
      contentId: queueItem.contentId,
      contentType: queueItem.contentType,
      priority: queueItem.priority,
      escalationLevel: queueItem.escalationLevel || 1,
      analysis: queueItem.analysis,
      report: queueItem.report,
      timestamp: queueItem.createdAt
    };

    await this.sendNotification('escalation', context, template);
  }

  async notifyResolution(decision: ModerationDecision): Promise<void> {
    if (!this.enabled) return;

    const template = this.templates.get('resolution');
    if (!template) return;

    const context = {
      decision,
      contentId: decision.contentId,
      moderatorId: decision.moderatorId,
      action: decision.action,
      reason: decision.reason,
      reviewTime: decision.reviewTime,
      timestamp: decision.createdAt
    };

    await this.sendNotification('resolution', context, template);
  }

  async notifyAppeal(appeal: ModerationAppeal): Promise<void> {
    if (!this.enabled) return;

    const template = this.templates.get('appeal');
    if (!template) return;

    const context = {
      appeal,
      decisionId: appeal.decisionId,
      appellantId: appeal.appellantId,
      reason: appeal.reason,
      status: appeal.status,
      timestamp: appeal.createdAt
    };

    await this.sendNotification('appeal', context, template);
  }

  // Channel management
  addChannel(name: string, channel: NotificationChannel): void {
    this.channels.set(name, channel);
  }

  removeChannel(name: string): void {
    this.channels.delete(name);
  }

  getChannel(name: string): NotificationChannel | undefined {
    return this.channels.get(name);
  }

  // Template management
  addTemplate(name: string, template: NotificationTemplate): void {
    this.templates.set(name, template);
  }

  removeTemplate(name: string): void {
    this.templates.delete(name);
  }

  getTemplate(name: string): NotificationTemplate | undefined {
    return this.templates.get(name);
  }

  // Enable/disable notifications
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  // Send notification to all channels
  private async sendNotification(type: string, context: any, template: NotificationTemplate): Promise<void> {
    const notifications: Promise<void>[] = [];

    for (const [channelName, channel] of this.channels) {
      if (channel.enabled) {
        try {
          const message = this.renderTemplate(template, context);
          const notification: Notification = {
            id: this.generateId(),
            type,
            channel: channelName,
            message,
            subject: this.renderTemplate(template.subjectTemplate || '', context),
            priority: this.determinePriority(type, context),
            timestamp: new Date(),
            data: context,
            retries: 0,
            maxRetries: 3
          };

          notifications.push(this.sendToChannel(channel, notification));
        } catch (error) {
          console.error(`Failed to send ${type} notification via ${channelName}:`, error);
        }
      }
    }

    await Promise.allSettled(notifications);
  }

  private async sendToChannel(channel: NotificationChannel, notification: Notification): Promise<void> {
    try {
      await channel.send(notification);
    } catch (error) {
      if (notification.retries < notification.maxRetries) {
        notification.retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * notification.retries));
        await this.sendToChannel(channel, notification);
      } else {
        throw error;
      }
    }
  }

  private renderTemplate(template: string, context: any): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(context, key);
      return value !== undefined ? String(value) : match;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private determinePriority(type: string, context: any): 'low' | 'medium' | 'high' | 'urgent' {
    switch (type) {
      case 'escalation':
        return context.escalationLevel > 2 ? 'urgent' : 'high';
      case 'flag':
        return context.severity === 'critical' ? 'urgent' : context.severity === 'high' ? 'high' : 'medium';
      case 'report':
        return context.severity === 'critical' ? 'urgent' : context.severity === 'high' ? 'high' : 'medium';
      case 'appeal':
        return 'medium';
      case 'resolution':
        return context.action === 'block' || context.action === 'ban' ? 'high' : 'low';
      default:
        return 'medium';
    }
  }

  private initializeDefaultChannels(): void {
    // Console channel for development
    this.addChannel('console', new ConsoleNotificationChannel());

    // Email channel (placeholder - would integrate with email service)
    this.addChannel('email', new EmailNotificationChannel());

    // In-app notification channel
    this.addChannel('in_app', new InAppNotificationChannel());

    // Webhook channel
    this.addChannel('webhook', new WebhookNotificationChannel());
  }

  private initializeDefaultTemplates(): void {
    // Flag notification template
    this.addTemplate('flag', {
      name: 'flag',
      subjectTemplate: 'Content Flagged: {{contentType}} - {{severity}} Severity',
      messageTemplate: `
Content has been flagged by the moderation system:

Content ID: {{contentId}}
Content Type: {{contentType}}
Severity: {{severity}}
Category: {{category}}
Score: {{score}}
Timestamp: {{timestamp}}

Flags:
{{#flags}}
- {{type}}: {{message}} ({{confidence}})
{{/flags}}

Please review this content and take appropriate action.
      `.trim(),
      enabled: true
    });

    // Report notification template
    this.addTemplate('report', {
      name: 'report',
      subjectTemplate: 'User Report: {{reason}} - {{contentType}}',
      messageTemplate: `
A user has reported content:

Report ID: {{report.id}}
Reporter: {{reporterId}}
Content ID: {{contentId}}
Content Type: {{contentType}}
Reason: {{reason}}
Category: {{category}}
Severity: {{severity}}
Description: {{report.description}}

Evidence:
{{#report.evidence}}
- {{.}}
{{/report.evidence}}

Please review this report and take appropriate action.
      `.trim(),
      enabled: true
    });

    // Escalation notification template
    this.addTemplate('escalation', {
      name: 'escalation',
      subjectTemplate: 'ESCALATION: Level {{escalationLevel}} - {{contentType}}',
      messageTemplate: `
CONTENT HAS BEEN ESCALATED:

Queue Item ID: {{queueItem.id}}
Content ID: {{contentId}}
Content Type: {{contentType}}
Priority: {{priority}}
Escalation Level: {{escalationLevel}}

Original Analysis:
- Severity: {{analysis.severity}}
- Category: {{analysis.category}}
- Score: {{analysis.score}}
- Action: {{analysis.action}}

{{#report}}
User Report:
- Reason: {{reason}}
- Description: {{description}}
{{/report}}

IMMEDIATE ATTENTION REQUIRED!
      `.trim(),
      enabled: true
    });

    // Resolution notification template
    this.addTemplate('resolution', {
      name: 'resolution',
      subjectTemplate: 'Content Resolved: {{action}} by {{moderatorId}}',
      messageTemplate: `
Content has been reviewed and resolved:

Decision ID: {{decision.id}}
Content ID: {{contentId}}
Moderator: {{moderatorId}}
Action: {{action}}
Reason: {{reason}}
Review Time: {{reviewTime}}ms
Timestamp: {{timestamp}}

{{#decision.notes}}
Notes: {{.}}
{{/decision.notes}}
      `.trim(),
      enabled: true
    });

    // Appeal notification template
    this.addTemplate('appeal', {
      name: 'appeal',
      subjectTemplate: 'Appeal Filed: {{reason}}',
      messageTemplate: `
A user has appealed a moderation decision:

Appeal ID: {{appeal.id}}
Decision ID: {{decisionId}}
Appellant: {{appellantId}}
Reason: {{reason}}
Status: {{status}}
Timestamp: {{timestamp}}

Description: {{appeal.description}}

Evidence:
{{#appeal.evidence}}
- {{.}}
{{/appeal.evidence}}

Please review this appeal and make a determination.
      `.trim(),
      enabled: true
    });
  }

  private generateId(): string {
    return `not_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Notification Channel Interfaces
// ==============================

export interface NotificationChannel {
  name: string;
  enabled: boolean;
  send(notification: Notification): Promise<void>;
  configure(config: any): Promise<void>;
}

export interface NotificationTemplate {
  name: string;
  subjectTemplate: string;
  messageTemplate: string;
  enabled: boolean;
}

export interface Notification {
  id: string;
  type: string;
  channel: string;
  message: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  timestamp: Date;
  data: any;
  retries: number;
  maxRetries: number;
}

// Concrete Channel Implementations
// =================================

class ConsoleNotificationChannel implements NotificationChannel {
  name = 'console';
  enabled = true;

  async send(notification: Notification): Promise<void> {
    const timestamp = notification.timestamp.toISOString();
    const priority = notification.priority.toUpperCase().padEnd(8, ' ');

    console.log(`[${timestamp}] [${priority}] ${notification.channel}: ${notification.subject}`);
    console.log(notification.message);
    console.log('─'.repeat(80));
  }

  async configure(config: any): Promise<void> {
    this.enabled = config.enabled !== false;
  }
}

class EmailNotificationChannel implements NotificationChannel {
  name = 'email';
  enabled = true;
  private smtpConfig?: any;

  async send(notification: Notification): Promise<void> {
    // Placeholder for email implementation
    // In production, this would integrate with nodemailer or similar
    console.log(`[EMAIL] Would send email: ${notification.subject}`);
    console.log(`To: moderation@example.com`);
    console.log(`Subject: ${notification.subject}`);
    console.log(`Body: ${notification.message}`);
  }

  async configure(config: any): Promise<void> {
    this.smtpConfig = config.smtp;
    this.enabled = config.enabled !== false;
  }
}

class InAppNotificationChannel implements NotificationChannel {
  name = 'in_app';
  enabled = true;
  private notifications: Notification[] = [];

  async send(notification: Notification): Promise<void> {
    this.notifications.push(notification);

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(-100);
    }

    // Emit event for real-time updates
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('moderation_notification', {
        detail: notification
      }));
    }
  }

  async configure(config: any): Promise<void> {
    this.enabled = config.enabled !== false;
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  clearNotifications(): void {
    this.notifications.length = 0;
  }
}

class WebhookNotificationChannel implements NotificationChannel {
  name = 'webhook';
  enabled = true;
  private webhookUrl?: string;
  private headers: Record<string, string> = {};

  async send(notification: Notification): Promise<void> {
    if (!this.webhookUrl) {
      console.log('[WEBHOOK] No webhook URL configured');
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers
        },
        body: JSON.stringify({
          notification: {
            id: notification.id,
            type: notification.type,
            subject: notification.subject,
            message: notification.message,
            priority: notification.priority,
            timestamp: notification.timestamp.toISOString()
          },
          data: notification.data
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('[WEBHOOK] Failed to send notification:', error);
      throw error;
    }
  }

  async configure(config: any): Promise<void> {
    this.webhookUrl = config.url;
    this.headers = config.headers || {};
    this.enabled = config.enabled !== false;
  }
}

// Export for use in other modules
export type { NotificationChannel, NotificationTemplate, Notification };