// Alerting Package Exports
// ========================

export { AlertManager } from './AlertManager';
export type {
  AlertConfig,
  AlertRule,
  AlertCondition,
  NotificationChannel,
  EscalationPolicy,
  SuppressionRule,
  AlertHistory,
  AlertStats,
  AlertQuery,
  AlertState
} from './AlertManager';

/**
 * Factory Functions
 */

/**
 * Create alert manager with default configuration
 */
export function createAlertManager(config?: Partial<import('../types').AlertingConfig>): AlertManager {
  const { createDefaultObservabilityConfig } = require('../index');
  const defaultConfig = createDefaultObservabilityConfig().alerting;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new AlertManager(finalConfig);
}

/**
 * Create production alert manager
 */
export function createProductionAlertManager(config?: Partial<import('../types').AlertingConfig>): AlertManager {
  const { createProductionObservabilityConfig } = require('../index');
  const defaultConfig = createProductionObservabilityConfig().alerting;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new AlertManager(finalConfig);
}

/**
 * Create development alert manager
 */
export function createDevelopmentAlertManager(config?: Partial<import('../types').AlertingConfig>): AlertManager {
  const { createDevelopmentObservabilityConfig } = require('../index');
  const defaultConfig = createDevelopmentObservabilityConfig().alerting;

  const finalConfig = {
    ...defaultConfig,
    ...config
  };

  return new AlertManager(finalConfig);
}

/**
 * Common alert conditions
 */
export const AlertConditions = {
  // Metric Conditions
  METRIC_ABOVE: 'metric_above',
  METRIC_BELOW: 'metric_below',
  METRIC_EQUALS: 'metric_equals',
  METRIC_NOT_EQUALS: 'metric_not_equals',
  METRIC_INCREASING: 'metric_increasing',
  METRIC_DECREASING: 'metric_decreasing',
  METRIC_RATE_HIGH: 'metric_rate_high',
  METRIC_RATE_LOW: 'metric_rate_low',

  // Threshold Conditions
  THRESHOLD_EXCEEDED: 'threshold_exceeded',
  THRESHOLD_BREACHED: 'threshold_breached',
  THRESHOLD_RECOVERED: 'threshold_recovered',

  // Trend Conditions
  TREND_UP: 'trend_up',
  TREND_DOWN: 'trend_down',
  TREND_FLAT: 'trend_flat',
  TREND_VOLATILE: 'trend_volatile',

  // Pattern Conditions
  PATTERN_DETECTED: 'pattern_detected',
  PATTERN_MISSING: 'pattern_missing',
  PATTERN_ANOMALY: 'pattern_anomaly',

  // Error Conditions
  ERROR_RATE_HIGH: 'error_rate_high',
  ERROR_COUNT_HIGH: 'error_count_high',
  ERROR_TYPE_DETECTED: 'error_type_detected',

  // Performance Conditions
  RESPONSE_TIME_HIGH: 'response_time_high',
  THROUGHPUT_LOW: 'throughput_low',
  LATENCY_SPIKE: 'latency_spike',

  // Availability Conditions
  AVAILABILITY_LOW: 'availability_low',
  DOWNTIME_DETECTED: 'downtime_detected',
  HEALTH_CHECK_FAILED: 'health_check_failed',

  // Capacity Conditions
  CAPACITY_HIGH: 'capacity_high',
  MEMORY_HIGH: 'memory_high',
  CPU_HIGH: 'cpu_high',
  DISK_HIGH: 'disk_high',

  // Business Conditions
  BUSINESS_METRIC_LOW: 'business_metric_low',
  BUSINESS_METRIC_HIGH: 'business_metric_high',
  REVENUE_IMPACT: 'revenue_impact',
  USER_IMPACT: 'user_impact',

  // Security Conditions
  SECURITY_EVENT: 'security_event',
  AUTH_FAILURE: 'auth_failure',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded'
};

/**
 * Alert severity levels
 */
export const AlertSeverity = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1
} as const;

/**
 * Alert priorities
 */
export const AlertPriority = {
  EMERGENCY: 'emergency',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
} as const;

/**
 * Common alert tags
 */
export const AlertTags = {
  // General Tags
  SEVERITY: 'severity',
  PRIORITY: 'priority',
  CATEGORY: 'category',
  SOURCE: 'source',
  TEAM: 'team',
  SERVICE: 'service',
  ENVIRONMENT: 'environment',

  // Metric Tags
  METRIC_NAME: 'metric.name',
  METRIC_TYPE: 'metric.type',
  METRIC_VALUE: 'metric.value',
  THRESHOLD: 'threshold',
  DURATION: 'duration',

  // Performance Tags
  RESPONSE_TIME: 'response_time',
  THROUGHPUT: 'throughput',
  ERROR_RATE: 'error_rate',
  AVAILABILITY: 'availability',

  // Business Tags
  BUSINESS_IMPACT: 'business.impact',
  REVENUE_IMPACT: 'revenue.impact',
  USER_IMPACT: 'user.impact',
  CUSTOMER_IMPACT: 'customer.impact',

  // System Tags
  HOST: 'host',
  POD: 'pod',
  CONTAINER: 'container',
  REGION: 'region',
  ZONE: 'zone',

  // Custom Tags
  CUSTOM_RULE: 'custom.rule',
  CUSTOM_CONDITION: 'custom.condition',
  CUSTOM_THRESHOLD: 'custom.threshold'
};

/**
 * Notification channel types
 */
export const NotificationChannelTypes = {
  WEBHOOK: 'webhook',
  EMAIL: 'email',
  SLACK: 'slack',
  PAGER_DUTY: 'pager_duty',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
  MICROSOFT_TEAMS: 'microsoft_teams',
  SMS: 'sms',
  PHONE: 'phone',
  WEB_SOCKET: 'web_socket',
  CUSTOM: 'custom'
} as const;

/**
 * Escalation levels
 */
export const EscalationLevels = {
  LEVEL_1: 'level_1',
  LEVEL_2: 'level_2',
  LEVEL_3: 'level_3',
  LEVEL_4: 'level_4',
  LEVEL_5: 'level_5'
} as const;

/**
 * Suppression types
 */
export const SuppressionTypes = {
  TIME_BASED: 'time_based',
  COUNT_BASED: 'count_based',
  DEPENDENCY_BASED: 'dependency_based',
  MAINTENANCE_BASED: 'maintenance_based',
  CUSTOM: 'custom'
} as const;

/**
 * Utility Functions
 */

/**
 * Create alert configuration
 */
export function createAlertConfig(
  name: string,
  condition: string,
  severity: number,
  channels: string[],
  config?: Partial<import('../types').AlertConfig>
): import('../types').AlertConfig {
  return {
    name,
    condition,
    severity,
    channels,
    enabled: true,
    description: '',
    tags: {},
    ...config
  };
}

/**
 * Create notification channel
 */
export function createNotificationChannel(
  name: string,
  type: string,
  config: Record<string, any>
): import('../types').NotificationChannel {
  return {
    name,
    type,
    config,
    enabled: true,
    description: '',
    tags: {}
  };
}

/**
 * Create escalation policy
 */
export function createEscalationPolicy(
  name: string,
  levels: import('../types').EscalationLevel[]
): import('../types').EscalationPolicy {
  return {
    name,
    levels,
    enabled: true,
    description: '',
    tags: {}
  };
}

/**
 * Create suppression rule
 */
export function createSuppressionRule(
  name: string,
  type: string,
  condition: string
): import('../types').SuppressionRule {
  return {
    name,
    type,
    condition,
    enabled: true,
    description: '',
    tags: {}
  };
}

/**
 * Validate alert configuration
 */
export function validateAlertConfig(config: import('../types').AlertConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || typeof config.name !== 'string') {
    errors.push('Alert name is required and must be a string');
  }

  if (!config.condition || typeof config.condition !== 'string') {
    errors.push('Alert condition is required and must be a string');
  }

  if (!config.severity || typeof config.severity !== 'number' || config.severity < 1 || config.severity > 5) {
    errors.push('Alert severity is required and must be a number between 1 and 5');
  }

  if (!config.channels || !Array.isArray(config.channels) || config.channels.length === 0) {
    errors.push('Alert channels are required and must be a non-empty array');
  }

  if (config.duration && (typeof config.duration !== 'number' || config.duration < 0)) {
    errors.push('Alert duration must be a positive number');
  }

  if (config.cooldown && (typeof config.cooldown !== 'number' || config.cooldown < 0)) {
    errors.push('Alert cooldown must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate notification channel
 */
export function validateNotificationChannel(channel: import('../types').NotificationChannel): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!channel.name || typeof channel.name !== 'string') {
    errors.push('Channel name is required and must be a string');
  }

  if (!channel.type || typeof channel.type !== 'string') {
    errors.push('Channel type is required and must be a string');
  }

  if (!channel.config || typeof channel.config !== 'object') {
    errors.push('Channel config is required and must be an object');
  }

  // Validate specific channel types
  switch (channel.type) {
    case 'webhook':
      if (!channel.config.url || typeof channel.config.url !== 'string') {
        errors.push('Webhook channel requires a valid URL');
      }
      break;
    case 'email':
      if (!channel.config.recipients || !Array.isArray(channel.config.recipients)) {
        errors.push('Email channel requires recipients array');
      }
      break;
    case 'slack':
      if (!channel.config.webhook_url || typeof channel.config.webhook_url !== 'string') {
        errors.push('Slack channel requires webhook_url');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Calculate alert severity based on impact
 */
export function calculateAlertSeverity(
  businessImpact: 'critical' | 'high' | 'medium' | 'low',
  userImpact: 'critical' | 'high' | 'medium' | 'low',
  systemImpact: 'critical' | 'high' | 'medium' | 'low'
): number {
  const impactMap = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2
  };

  const businessScore = impactMap[businessImpact];
  const userScore = impactMap[userImpact];
  const systemScore = impactMap[systemImpact];

  // Calculate weighted average (business impact has highest weight)
  const weightedScore = (businessScore * 0.5 + userScore * 0.3 + systemScore * 0.2);

  return Math.round(weightedScore);
}

/**
 * Generate alert summary
 */
export function generateAlertSummary(alerts: import('../types').AlertHistory[]): {
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  alertsByService: Record<string, number>;
  alertsBySeverity: Record<number, number>;
  averageResolutionTime: number;
} {
  const totalAlerts = alerts.length;
  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const criticalAlerts = alerts.filter(a => a.severity === 5).length;
  const highAlerts = alerts.filter(a => a.severity === 4).length;
  const mediumAlerts = alerts.filter(a => a.severity === 3).length;
  const lowAlerts = alerts.filter(a => a.severity === 2).length;

  const alertsByService = alerts.reduce((acc, alert) => {
    const service = alert.tags?.service || 'unknown';
    acc[service] = (acc[service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const alertsBySeverity = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const resolvedAlerts = alerts.filter(a => a.resolvedAt);
  const averageResolutionTime = resolvedAlerts.length > 0
    ? resolvedAlerts.reduce((sum, alert) => {
        const resolutionTime = alert.resolvedAt! - alert.triggeredAt;
        return sum + resolutionTime;
      }, 0) / resolvedAlerts.length
    : 0;

  return {
    totalAlerts,
    activeAlerts,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    lowAlerts,
    alertsByService,
    alertsBySeverity,
    averageResolutionTime
  };
}

/**
 * Format alert message
 */
export function formatAlertMessage(
  alert: import('../types').AlertHistory,
  template: string = 'default'
): string {
  const severityText = {
    5: 'CRITICAL',
    4: 'HIGH',
    3: 'MEDIUM',
    2: 'LOW',
    1: 'INFO'
  }[alert.severity];

  const templates = {
    default: `🚨 ${severityText} Alert: ${alert.name}

${alert.description}

Service: ${alert.tags?.service || 'unknown'}
Severity: ${severityText}
Triggered: ${new Date(alert.triggeredAt).toISOString()}
Status: ${alert.status}

Tags: ${Object.entries(alert.tags || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
`,
    slack: `🚨 *${severityText} Alert: ${alert.name}*

${alert.description}

*Service:* ${alert.tags?.service || 'unknown'}
*Severity:* ${severityText}
*Triggered:* ${new Date(alert.triggeredAt).toISOString()}
*Status:* ${alert.status}

*Tags:* ${Object.entries(alert.tags || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
`,
    short: `${severityText}: ${alert.name} - ${alert.description}`
  };

  return templates[template as keyof typeof templates] || templates.default;
}