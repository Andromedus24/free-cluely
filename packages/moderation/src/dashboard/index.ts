// Dashboard Package Exports
// =========================

// Core Services
export * from './ModerationDashboardService';
export * from './DashboardAnalyticsEngine';
export * from './DashboardWidgetService';
export * from './ModerationDashboard';

// Factory Functions
// ==================

import { IModerationService } from '../core/ModerationService';
import { IModerationStorage } from '../storage/ModerationStorage';
import { IModerationNotifier } from '../notifications/ModerationNotifier';
import { IReportManager } from '../reporting/ReportManager';
import { ModerationDashboard } from './ModerationDashboard';
import { DashboardAnalyticsEngine } from './DashboardAnalyticsEngine';
import { DashboardWidgetService } from './DashboardWidgetService';

/**
 * Create a complete moderation dashboard system
 */
export function createModerationDashboard(
  moderationService: IModerationService,
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  reportManager: IReportManager,
  config?: any
): {
  dashboard: ModerationDashboard;
  analyticsEngine: DashboardAnalyticsEngine;
  widgetService: DashboardWidgetService;
} {
  // Create analytics engine
  const analyticsEngine = new DashboardAnalyticsEngine(
    storage,
    config?.analytics
  );

  // Create widget service
  const widgetService = new DashboardWidgetService(
    storage,
    config?.widgets
  );

  // Create main dashboard
  const dashboard = new ModerationDashboard(
    analyticsEngine,
    widgetService,
    moderationService,
    storage,
    notifier,
    reportManager,
    config?.dashboard
  );

  return {
    dashboard,
    analyticsEngine,
    widgetService
  };
}

/**
 * Create a lightweight dashboard for smaller deployments
 */
export function createLightweightDashboard(
  moderationService: IModerationService,
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  reportManager: IReportManager
): {
  dashboard: ModerationDashboard;
  analyticsEngine: DashboardAnalyticsEngine;
  widgetService: DashboardWidgetService;
} {
  return createModerationDashboard(moderationService, storage, notifier, reportManager, {
    dashboard: {
      refreshInterval: 60000, // 1 minute
      alertThresholds: {
        queueBacklog: 50,
        resolutionTime: 48 * 60 * 60 * 1000, // 48 hours
        errorRate: 0.1, // 10%
        systemLoad: 0.9, // 90%
        accuracy: 0.8 // 80%
      }
    },
    analytics: {
      enablePredictions: false,
      enableAnomalyDetection: false,
      maxDataPoints: 1000
    },
    widgets: {
      enableCaching: true,
      cacheTTL: 300000, // 5 minutes
      maxConcurrentUpdates: 5
    }
  });
}

/**
 * Create an enterprise-grade dashboard with all features
 */
export function createEnterpriseDashboard(
  moderationService: IModerationService,
  storage: IModerationStorage,
  notifier: IModerationNotifier,
  reportManager: IReportManager
): {
  dashboard: ModerationDashboard;
  analyticsEngine: DashboardAnalyticsEngine;
  widgetService: DashboardWidgetService;
} {
  return createModerationDashboard(moderationService, storage, notifier, reportManager, {
    dashboard: {
      refreshInterval: 10000, // 10 seconds
      alertThresholds: {
        queueBacklog: 200,
        resolutionTime: 4 * 60 * 60 * 1000, // 4 hours
        errorRate: 0.02, // 2%
        systemLoad: 0.7, // 70%
        accuracy: 0.95 // 95%
      },
      integrations: {
        notifications: [
          {
            type: 'slack',
            enabled: true,
            config: {
              webhook: process.env.SLACK_WEBHOOK_URL
            }
          },
          {
            type: 'email',
            enabled: true,
            config: {
              smtp: {
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: true,
                auth: {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS
                }
              }
            }
          }
        ],
        externalTools: [
          {
            name: 'Splunk',
            type: 'logging',
            enabled: true,
            config: {
              endpoint: process.env.SPLUNK_ENDPOINT,
              token: process.env.SPLUNK_TOKEN
            }
          },
          {
            name: 'Datadog',
            type: 'monitoring',
            enabled: true,
            config: {
              apiKey: process.env.DATADOG_API_KEY,
              appKey: process.env.DATADOG_APP_KEY
            }
          }
        ],
        dataSources: [
          {
            name: 'Elasticsearch',
            type: 'search',
            enabled: true,
            config: {
              node: process.env.ELASTICSEARCH_URL,
              auth: {
                username: process.env.ELASTICSEARCH_USER,
                password: process.env.ELASTICSEARCH_PASS
              }
            }
          }
        ]
      }
    },
    analytics: {
      enablePredictions: true,
      enableAnomalyDetection: true,
      enableCorrelationAnalysis: true,
      maxDataPoints: 10000,
      predictionHorizon: '30d',
      anomalyThreshold: 0.05,
      correlationThreshold: 0.7
    },
    widgets: {
      enableCaching: true,
      cacheTTL: 30000, // 30 seconds
      maxConcurrentUpdates: 20,
      enableRealTimeUpdates: true,
      updateBatchSize: 100
    }
  });
}

// Utility Functions
// ================

import { DashboardOverview, RealTimeMetrics, Alert, TeamPerformance } from './ModerationDashboardService';

/**
 * Calculate dashboard health score
 */
export function calculateDashboardHealth(
  overview: DashboardOverview,
  realTimeMetrics: RealTimeMetrics,
  teamPerformance: TeamPerformance
): {
  score: number;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    impact: 'positive' | 'negative';
  }>;
} {
  const factors = [
    {
      name: 'System Health',
      score: overview.summary.systemHealth.score,
      weight: 0.2,
      impact: overview.summary.systemHealth.score > 80 ? 'positive' as const : 'negative' as const
    },
    {
      name: 'Queue Performance',
      score: Math.max(0, 100 - (overview.queue.total / 10)),
      weight: 0.15,
      impact: overview.queue.total < 50 ? 'positive' as const : 'negative' as const
    },
    {
      name: 'Team Utilization',
      score: Math.max(0, 100 - Math.abs(overview.summary.teamUtilization - 70) * 2),
      weight: 0.15,
      impact: overview.summary.teamUtilization > 60 && overview.summary.teamUtilization < 80 ? 'positive' as const : 'negative' as const
    },
    {
      name: 'Resolution Time',
      score: Math.max(0, 100 - (overview.summary.averageResolutionTime / 3600)), // Convert to hours
      weight: 0.2,
      impact: overview.summary.averageResolutionTime < 7200 ? 'positive' as const : 'negative' as const // 2 hours
    },
    {
      name: 'Accuracy',
      score: overview.summary.accuracy * 100,
      weight: 0.15,
      impact: overview.summary.accuracy > 0.9 ? 'positive' as const : 'negative' as const
    },
    {
      name: 'Error Rate',
      score: Math.max(0, 100 - (realTimeMetrics.errorRate * 1000)),
      weight: 0.15,
      impact: realTimeMetrics.errorRate < 0.05 ? 'positive' as const : 'negative' as const
    }
  ];

  const weightedScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);

  let status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  if (weightedScore >= 90) status = 'excellent';
  else if (weightedScore >= 75) status = 'good';
  else if (weightedScore >= 60) status = 'fair';
  else if (weightedScore >= 40) status = 'poor';
  else status = 'critical';

  return {
    score: Math.round(weightedScore),
    status,
    factors
  };
}

/**
 * Generate dashboard insights from metrics
 */
export function generateDashboardInsights(
  overview: DashboardOverview,
  realTimeMetrics: RealTimeMetrics,
  alerts: Alert[]
): Array<{
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  action?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}> {
  const insights: Array<{
    type: 'warning' | 'info' | 'success' | 'error';
    title: string;
    message: string;
    action?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }> = [];

  // Queue backlog insights
  if (overview.queue.total > 100) {
    insights.push({
      type: 'warning',
      title: 'High Queue Backlog',
      message: `Queue backlog of ${overview.queue.total} items exceeds normal thresholds.`,
      action: 'Consider assigning additional moderators or adjusting workflows.',
      priority: 'high'
    });
  }

  // System load insights
  if (realTimeMetrics.systemMetrics.cpu > 0.8) {
    insights.push({
      type: 'warning',
      title: 'High CPU Usage',
      message: `CPU usage at ${(realTimeMetrics.systemMetrics.cpu * 100).toFixed(1)}% may impact performance.`,
      action: 'Consider scaling resources or optimizing processes.',
      priority: 'medium'
    });
  }

  // Team utilization insights
  if (overview.summary.teamUtilization > 0.9) {
    insights.push({
      type: 'warning',
      title: 'High Team Utilization',
      message: `Team utilization at ${(overview.summary.teamUtilization * 100).toFixed(1)}% may lead to burnout.`,
      action: 'Consider redistributing workload or adding team members.',
      priority: 'medium'
    });
  }

  // Accuracy insights
  if (overview.summary.accuracy > 0.95) {
    insights.push({
      type: 'success',
      title: 'Excellent Accuracy',
      message: `Content analysis accuracy at ${(overview.summary.accuracy * 100).toFixed(1)}% is performing exceptionally well.`,
      priority: 'low'
    });
  }

  // Alert insights
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');
  if (criticalAlerts.length > 0) {
    insights.push({
      type: 'error',
      title: 'Critical Alerts Active',
      message: `${criticalAlerts.length} critical alerts require immediate attention.`,
      action: 'Review and address critical alerts immediately.',
      priority: 'critical'
    });
  }

  // Resolution time insights
  if (overview.summary.averageResolutionTime < 3600) {
    insights.push({
      type: 'success',
      title: 'Fast Resolution Times',
      message: `Average resolution time of ${Math.round(overview.summary.averageResolutionTime / 60)} minutes is excellent.`,
      priority: 'low'
    });
  }

  return insights;
}

/**
 * Optimize dashboard configuration based on usage patterns
 */
export function optimizeDashboardConfiguration(
  currentConfig: any,
  usageData: {
    widgetUsage: Record<string, number>;
    featureUsage: Record<string, number>;
    performanceMetrics: {
      averageLoadTime: number;
      errorRate: number;
      cacheHitRate: number;
    };
  }
): any {
  const optimizedConfig = { ...currentConfig };

  // Optimize refresh interval based on load
  if (usageData.performanceMetrics.averageLoadTime > 2000) {
    optimizedConfig.refreshInterval = Math.max(30000, currentConfig.refreshInterval * 1.5);
  } else if (usageData.performanceMetrics.averageLoadTime < 500) {
    optimizedConfig.refreshInterval = Math.min(5000, currentConfig.refreshInterval * 0.8);
  }

  // Optimize widget configurations
  const topWidgets = Object.entries(usageData.widgetUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([widgetId]) => widgetId);

  optimizedConfig.widgets = currentConfig.widgets.map((widget: any) => ({
    ...widget,
    visible: topWidgets.includes(widget.id),
    config: {
      ...widget.config,
      updateInterval: widget.id in usageData.widgetUsage && usageData.widgetUsage[widget.id] > 50
        ? Math.min(10000, widget.config?.updateInterval || 30000)
        : Math.max(60000, widget.config?.updateInterval || 30000)
    }
  }));

  // Optimize analytics features
  if (usageData.performanceMetrics.cacheHitRate < 0.5) {
    optimizedConfig.analytics = {
      ...currentConfig.analytics,
      maxDataPoints: Math.max(1000, currentConfig.analytics?.maxDataPoints || 5000)
    };
  }

  // Optimize alert thresholds based on historical data
  if (usageData.featureUsage.alerts > 100) {
    optimizedConfig.alertThresholds = {
      ...currentConfig.alertThresholds,
      queueBacklog: Math.min(200, currentConfig.alertThresholds.queueBacklog * 1.2),
      errorRate: Math.min(0.1, currentConfig.alertThresholds.errorRate * 1.1)
    };
  }

  return optimizedConfig;
}

/**
 * Validate dashboard configuration
 */
export function validateDashboardConfiguration(config: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate refresh interval
  if (config.refreshInterval < 1000) {
    errors.push('Refresh interval must be at least 1 second');
  } else if (config.refreshInterval > 300000) {
    warnings.push('Refresh interval over 5 minutes may result in stale data');
  }

  // Validate alert thresholds
  if (config.alertThresholds) {
    if (config.alertThresholds.queueBacklog < 0) {
      errors.push('Queue backlog threshold must be positive');
    }
    if (config.alertThresholds.errorRate < 0 || config.alertThresholds.errorRate > 1) {
      errors.push('Error rate threshold must be between 0 and 1');
    }
    if (config.alertThresholds.systemLoad < 0 || config.alertThresholds.systemLoad > 1) {
      errors.push('System load threshold must be between 0 and 1');
    }
    if (config.alertThresholds.accuracy < 0 || config.alertThresholds.accuracy > 1) {
      errors.push('Accuracy threshold must be between 0 and 1');
    }
  }

  // Validate widget configurations
  if (config.widgets && Array.isArray(config.widgets)) {
    config.widgets.forEach((widget: any, index: number) => {
      if (!widget.id) {
        errors.push(`Widget at index ${index} missing ID`);
      }
      if (!widget.type) {
        errors.push(`Widget ${widget.id} missing type`);
      }
      if (widget.config && typeof widget.config !== 'object') {
        errors.push(`Widget ${widget.id} config must be an object`);
      }
    });
  }

  // Validate permissions
  if (config.permissions) {
    if (!config.permissions.roles || typeof config.permissions.roles !== 'object') {
      errors.push('Permissions roles must be an object');
    }
    if (!config.permissions.defaultRole) {
      warnings.push('No default role specified in permissions');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Constants and Defaults
// ======================

export const DEFAULT_DASHBOARD_CONFIG = {
  refreshInterval: 30000,
  alertThresholds: {
    queueBacklog: 100,
    resolutionTime: 24 * 60 * 60 * 1000,
    errorRate: 0.05,
    systemLoad: 0.8,
    accuracy: 0.9
  },
  enableRealTimeUpdates: true,
  enablePredictions: true,
  enableAnomalyDetection: true,
  enableCaching: true,
  cacheTTL: 300000,
  maxConcurrentUpdates: 10,
  updateBatchSize: 50
} as const;

export const DASHBOARD_WIDGET_TYPES = [
  'overview',
  'metrics',
  'chart',
  'table',
  'alert',
  'timeline',
  'team',
  'queue',
  'compliance',
  'trend',
  'prediction'
] as const;

export const DASHBOARD_EXPORT_FORMATS = [
  'json',
  'csv',
  'xlsx',
  'pdf'
] as const;

export const DASHBOARD_ALERT_SEVERITIES = [
  'low',
  'medium',
  'high',
  'critical'
] as const;

export const DASHBOARD_VIEW_TYPES = [
  'overview',
  'analytics',
  'team',
  'queue',
  'compliance',
  'reports'
] as const;

// Version and Package Info
// ========================

export const DASHBOARD_VERSION = '1.0.0';

export const packageInfo = {
  name: '@atlas/moderation-dashboard',
  version: DASHBOARD_VERSION,
  description: 'Comprehensive dashboard and analytics system for Atlas moderation',
  author: 'Atlas Team',
  license: 'MIT',
  repository: 'https://github.com/atlas-ai/atlas',
  dependencies: [
    '@atlas/moderation',
    '@atlas/logger',
    '@atlas/types'
  ]
};

// Export for backward compatibility
export {
  ModerationDashboard,
  DashboardAnalyticsEngine,
  DashboardWidgetService
};