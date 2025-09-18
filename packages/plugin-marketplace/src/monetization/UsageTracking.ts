import { z } from 'zod';
import { Currency, PluginPricing, PricingModel } from './MonetizationModels';
import { Subscription, SubscriptionStatus } from './SubscriptionManager';
import { PaymentStatus, PaymentProvider } from './PaymentProcessing';

export enum MetricType {
  API_CALLS = 'api_calls',
  STORAGE_BYTES = 'storage_bytes',
  BANDWIDTH_BYTES = 'bandwidth_bytes',
  COMPUTE_TIME = 'compute_time',
  REQUEST_COUNT = 'request_count',
  USER_COUNT = 'user_count',
  FILE_UPLOADS = 'file_uploads',
  EXPORT_COUNT = 'export_count',
  CUSTOM_METRIC = 'custom_metric'
}

export enum AggregationType {
  SUM = 'sum',
  AVERAGE = 'average',
  MAX = 'max',
  MIN = 'min',
  COUNT = 'count',
  UNIQUE_COUNT = 'unique_count'
}

export enum BillingCycle {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_PAID = 'partially_paid'
}

export interface UsageMetric {
  id: string;
  pluginId: string;
  userId: string;
  subscriptionId?: string;
  type: MetricType;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UsageQuota {
  id: string;
  pluginId: string;
  userId: string;
  subscriptionId?: string;
  metricType: MetricType;
  limit: number;
  period: BillingCycle;
  current: number;
  percentage: number;
  resetDate: Date;
  isUnlimited: boolean;
  alerts: {
    warningThreshold: number;
    criticalThreshold: number;
    lastWarningAt?: Date;
    lastCriticalAt?: Date;
  };
}

export interface UsageTier {
  id: string;
  pluginId: string;
  metricType: MetricType;
  minUnits: number;
  maxUnits?: number;
  pricePerUnit: number;
  currency: Currency;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

export interface BillingPlan {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  pricing: PluginPricing;
  usageTiers: UsageTier[];
  quotas: UsageQuota[];
  billingCycle: BillingCycle;
  currency: Currency;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageAggregation {
  id: string;
  pluginId: string;
  userId: string;
  subscriptionId?: string;
  metricType: MetricType;
  aggregationType: AggregationType;
  period: string; // YYYY-MM-DD
  value: number;
  unit: string;
  calculatedAt: Date;
  metadata?: Record<string, any>;
}

export interface BillingInvoice {
  id: string;
  pluginId: string;
  userId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  items: BillingInvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  currency: Currency;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  paymentId?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: Currency;
  type: 'usage' | 'subscription' | 'setup_fee' | 'discount' | 'tax' | 'adjustment';
  metricType?: MetricType;
  period?: {
    start: Date;
    end: Date;
  };
  metadata?: Record<string, any>;
}

export interface UsageAlert {
  id: string;
  pluginId: string;
  userId: string;
  subscriptionId?: string;
  metricType: MetricType;
  thresholdType: 'warning' | 'critical';
  current: number;
  limit: number;
  percentage: number;
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface UsageReport {
  id: string;
  pluginId: string;
  userId: string;
  subscriptionId?: string;
  period: string; // YYYY-MM
  metrics: {
    metricType: MetricType;
    total: number;
    unit: string;
    breakdown: {
      date: string;
      value: number;
    }[];
  }[];
  cost: {
    subtotal: number;
    tax: number;
    total: number;
    currency: Currency;
    breakdown: {
      metricType: MetricType;
      cost: number;
    }[];
  };
  generatedAt: Date;
}

export interface UsagePrediction {
  id: string;
  pluginId: string;
  userId: string;
  subscriptionId?: string;
  metricType: MetricType;
  period: BillingCycle;
  predictedValue: number;
  confidence: number;
  predictionDate: Date;
  forPeriod: string; // YYYY-MM
  basedOnData: {
    period: string;
    value: number;
  }[];
}

// Schemas
export const UsageMetricSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  type: z.nativeEnum(MetricType),
  value: z.number(),
  unit: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional()
});

export const UsageQuotaSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  metricType: z.nativeEnum(MetricType),
  limit: z.number(),
  period: z.nativeEnum(BillingCycle),
  current: z.number(),
  percentage: z.number().min(0).max(100),
  resetDate: z.date(),
  isUnlimited: z.boolean(),
  alerts: z.object({
    warningThreshold: z.number().min(0).max(100),
    criticalThreshold: z.number().min(0).max(100),
    lastWarningAt: z.date().optional(),
    lastCriticalAt: z.date().optional()
  })
});

export const UsageTierSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  metricType: z.nativeEnum(MetricType),
  minUnits: z.number().min(0),
  maxUnits: z.number().min(0).optional(),
  pricePerUnit: z.number().min(0),
  currency: z.nativeEnum(Currency),
  description: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number()
});

export const BillingPlanSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  name: z.string(),
  description: z.string(),
  pricing: z.any(), // PluginPricing type
  usageTiers: z.array(UsageTierSchema),
  quotas: z.array(UsageQuotaSchema),
  billingCycle: z.nativeEnum(BillingCycle),
  currency: z.nativeEnum(Currency),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const UsageAggregationSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  metricType: z.nativeEnum(MetricType),
  aggregationType: z.nativeEnum(AggregationType),
  period: z.string(),
  value: z.number(),
  unit: z.string(),
  calculatedAt: z.date(),
  metadata: z.record(z.any()).optional()
});

export const BillingInvoiceSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  invoiceNumber: z.string(),
  status: z.nativeEnum(InvoiceStatus),
  billingPeriod: z.object({
    start: z.date(),
    end: z.date()
  }),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    currency: z.nativeEnum(Currency),
    type: z.enum(['usage', 'subscription', 'setup_fee', 'discount', 'tax', 'adjustment']),
    metricType: z.nativeEnum(MetricType).optional(),
    period: z.object({
      start: z.date(),
      end: z.date()
    }).optional(),
    metadata: z.record(z.any()).optional()
  })),
  subtotal: z.number().min(0),
  tax: z.number().min(0),
  taxRate: z.number().min(0),
  total: z.number().min(0),
  currency: z.nativeEnum(Currency),
  dueDate: z.date(),
  paidAt: z.date().optional(),
  paymentMethod: z.string().optional(),
  paymentId: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const UsageAlertSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  metricType: z.nativeEnum(MetricType),
  thresholdType: z.enum(['warning', 'critical']),
  current: z.number(),
  limit: z.number(),
  percentage: z.number(),
  message: z.string(),
  triggeredAt: z.date(),
  acknowledged: z.boolean(),
  acknowledgedAt: z.date().optional(),
  resolvedAt: z.date().optional()
});

export const UsageReportSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  period: z.string(),
  metrics: z.array(z.object({
    metricType: z.nativeEnum(MetricType),
    total: z.number(),
    unit: z.string(),
    breakdown: z.array(z.object({
      date: z.string(),
      value: z.number()
    }))
  })),
  cost: z.object({
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    currency: z.nativeEnum(Currency),
    breakdown: z.array(z.object({
      metricType: z.nativeEnum(MetricType),
      cost: z.number()
    }))
  }),
  generatedAt: z.date()
});

export const UsagePredictionSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  subscriptionId: z.string().optional(),
  metricType: z.nativeEnum(MetricType),
  period: z.nativeEnum(BillingCycle),
  predictedValue: z.number(),
  confidence: z.number().min(0).max(1),
  predictionDate: z.date(),
  forPeriod: z.string(),
  basedOnData: z.array(z.object({
    period: z.string(),
    value: z.number()
  }))
});

// Type exports
export type UsageMetricType = z.infer<typeof UsageMetricSchema>;
export type UsageQuotaType = z.infer<typeof UsageQuotaSchema>;
export type UsageTierType = z.infer<typeof UsageTierSchema>;
export type BillingPlanType = z.infer<typeof BillingPlanSchema>;
export type UsageAggregationType = z.infer<typeof UsageAggregationSchema>;
export type BillingInvoiceType = z.infer<typeof BillingInvoiceSchema>;
export type UsageAlertType = z.infer<typeof UsageAlertSchema>;
export type UsageReportType = z.infer<typeof UsageReportSchema>;
export type UsagePredictionType = z.infer<typeof UsagePredictionSchema>;

// Usage Tracking Service
export class UsageTracker {
  private metrics: Map<string, UsageMetric[]> = new Map();
  private quotas: Map<string, UsageQuota> = new Map();
  private tiers: Map<string, UsageTier[]> = new Map();
  private plans: Map<string, BillingPlan> = new Map();
  private aggregations: Map<string, UsageAggregation[]> = new Map();
  private invoices: Map<string, BillingInvoice> = new Map();
  private alerts: Map<string, UsageAlert> = new Map();

  constructor() {
    this.initializeDefaultTiers();
    this.startPeriodicTasks();
  }

  private initializeDefaultTiers(): void {
    // Initialize default usage tiers
    // This would typically be loaded from configuration or database
  }

  private startPeriodicTasks(): void {
    // Start background tasks for usage tracking
    this.startAggregationTask();
    this.startBillingTask();
    this.startQuotaChecker();
    this.startPredictionTask();
  }

  async recordUsage(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    value: number,
    options?: {
      unit?: string;
      subscriptionId?: string;
      metadata?: Record<string, any>;
      tags?: string[];
    }
  ): Promise<void> {
    const metric: UsageMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pluginId,
      userId,
      subscriptionId: options?.subscriptionId,
      type: metricType,
      value,
      unit: options?.unit || 'units',
      timestamp: new Date(),
      metadata: options?.metadata,
      tags: options?.tags
    };

    // Store metric
    const key = `${pluginId}:${userId}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key)!.push(metric);

    // Update quota
    await this.updateQuota(pluginId, userId, metricType, value, options?.subscriptionId);

    // Check quota limits
    await this.checkQuotaLimits(pluginId, userId, metricType, options?.subscriptionId);

    // Process real-time aggregation
    await this.processRealTimeAggregation(metric);
  }

  async getUsage(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    options?: {
      period?: BillingCycle;
      startDate?: Date;
      endDate?: Date;
      subscriptionId?: string;
    }
  ): Promise<UsageMetric[]> {
    const key = `${pluginId}:${userId}`;
    const userMetrics = this.metrics.get(key) || [];

    let filteredMetrics = userMetrics.filter(metric => metric.type === metricType);

    if (options?.subscriptionId) {
      filteredMetrics = filteredMetrics.filter(metric => metric.subscriptionId === options.subscriptionId);
    }

    if (options?.startDate) {
      filteredMetrics = filteredMetrics.filter(metric => metric.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      filteredMetrics = filteredMetrics.filter(metric => metric.timestamp <= options.endDate!);
    }

    return filteredMetrics;
  }

  async getAggregatedUsage(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    aggregationType: AggregationType,
    period: string
  ): Promise<UsageAggregation | null> {
    const key = `${pluginId}:${userId}`;
    const aggregations = this.aggregations.get(key) || [];

    return aggregations.find(agg =>
      agg.metricType === metricType &&
      agg.aggregationType === aggregationType &&
      agg.period === period
    ) || null;
  }

  async getCurrentQuota(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    subscriptionId?: string
  ): Promise<UsageQuota | null> {
    const key = `${pluginId}:${userId}:${metricType}:${subscriptionId || 'default'}`;
    return this.quotas.get(key) || null;
  }

  async calculateCost(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    usage: number,
    period: string
  ): Promise<number> {
    const tiers = this.tiers.get(pluginId) || [];
    const relevantTiers = tiers.filter(tier => tier.metricType === metricType && tier.isActive);

    if (relevantTiers.length === 0) {
      return 0;
    }

    // Sort tiers by sortOrder
    relevantTiers.sort((a, b) => a.sortOrder - b.sortOrder);

    let totalCost = 0;
    let remainingUsage = usage;

    for (const tier of relevantTiers) {
      if (remainingUsage <= 0) break;

      const tierUnits = Math.min(
        remainingUsage,
        (tier.maxUnits || Infinity) - tier.minUnits
      );

      if (tierUnits > 0) {
        totalCost += tierUnits * tier.pricePerUnit;
        remainingUsage -= tierUnits;
      }
    }

    return totalCost;
  }

  async generateInvoice(
    pluginId: string,
    userId: string,
    billingPeriod: { start: Date; end: Date },
    subscriptionId?: string
  ): Promise<BillingInvoice> {
    const plan = this.plans.get(`${pluginId}:${subscriptionId || 'default'}`);
    if (!plan) {
      throw new Error('Billing plan not found');
    }

    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const invoiceNumber = this.generateInvoiceNumber();

    const invoice: BillingInvoice = {
      id: invoiceId,
      pluginId,
      userId,
      subscriptionId,
      invoiceNumber,
      status: InvoiceStatus.DRAFT,
      billingPeriod,
      items: [],
      subtotal: 0,
      tax: 0,
      taxRate: 0, // Would be calculated based on location
      total: 0,
      currency: plan.currency,
      dueDate: new Date(billingPeriod.end.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days after period end
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate usage-based costs
    const usageCosts = await this.calculateUsageCosts(pluginId, userId, billingPeriod, subscriptionId);

    for (const cost of usageCosts) {
      const item: BillingInvoiceItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: `${cost.metricType} usage (${cost.unit})`,
        quantity: cost.quantity,
        unitPrice: cost.unitPrice,
        totalPrice: cost.totalCost,
        currency: plan.currency,
        type: 'usage',
        metricType: cost.metricType,
        period: billingPeriod
      };

      invoice.items.push(item);
      invoice.subtotal += cost.totalCost;
    }

    // Add subscription fee if applicable
    if (plan.pricing.model === PricingModel.SUBSCRIPTION && plan.pricing.tiers) {
      const subscriptionTier = plan.pricing.tiers[0]; // Assuming single tier for subscription
      const item: BillingInvoiceItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        description: `Subscription fee - ${subscriptionTier.name}`,
        quantity: 1,
        unitPrice: subscriptionTier.price,
        totalPrice: subscriptionTier.price,
        currency: plan.currency,
        type: 'subscription',
        period: billingPeriod
      };

      invoice.items.push(item);
      invoice.subtotal += subscriptionTier.price;
    }

    // Calculate tax
    invoice.tax = Math.round(invoice.subtotal * invoice.taxRate * 100) / 100;
    invoice.total = invoice.subtotal + invoice.tax;

    this.invoices.set(invoiceId, invoice);
    return invoice;
  }

  async getUsageReport(
    pluginId: string,
    userId: string,
    period: string,
    subscriptionId?: string
  ): Promise<UsageReport | null> {
    const key = `${pluginId}:${userId}`;
    const userMetrics = this.metrics.get(key) || [];

    if (subscriptionId) {
      userMetrics.filter(metric => metric.subscriptionId === subscriptionId);
    }

    // Filter by period
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const periodMetrics = userMetrics.filter(metric =>
      metric.timestamp >= startDate && metric.timestamp < endDate
    );

    // Group by metric type
    const metricGroups = new Map<MetricType, UsageMetric[]>();
    for (const metric of periodMetrics) {
      if (!metricGroups.has(metric.type)) {
        metricGroups.set(metric.type, []);
      }
      metricGroups.get(metric.type)!.push(metric);
    }

    const metrics = [];
    let totalCost = 0;
    const costBreakdown = [];

    for (const [metricType, group] of metricGroups.entries()) {
      const total = group.reduce((sum, metric) => sum + metric.value, 0);
      const unit = group[0]?.unit || 'units';

      // Calculate daily breakdown
      const dailyBreakdown = [];
      for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
        const dayStart = new Date(year, month - 1, day);
        const dayEnd = new Date(year, month - 1, day + 1);

        const dayValue = group
          .filter(metric => metric.timestamp >= dayStart && metric.timestamp < dayEnd)
          .reduce((sum, metric) => sum + metric.value, 0);

        dailyBreakdown.push({
          date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
          value: dayValue
        });
      }

      metrics.push({
        metricType,
        total,
        unit,
        breakdown: dailyBreakdown
      });

      // Calculate cost
      const cost = await this.calculateCost(pluginId, userId, metricType, total, period);
      totalCost += cost;
      costBreakdown.push({ metricType, cost });
    }

    const plan = this.plans.get(`${pluginId}:${subscriptionId || 'default'}`);
    const currency = plan?.currency || Currency.USD;
    const taxRate = 0.1; // 10% tax rate

    const report: UsageReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pluginId,
      userId,
      subscriptionId,
      period,
      metrics,
      cost: {
        subtotal: totalCost,
        tax: Math.round(totalCost * taxRate * 100) / 100,
        total: totalCost + Math.round(totalCost * taxRate * 100) / 100,
        currency,
        breakdown: costBreakdown
      },
      generatedAt: new Date()
    };

    return report;
  }

  async predictUsage(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    period: BillingCycle,
    forPeriod: string
  ): Promise<UsagePrediction> {
    const key = `${pluginId}:${userId}`;
    const userMetrics = this.metrics.get(key) || [];
    const metricData = userMetrics.filter(metric => metric.type === metricType);

    if (metricData.length < 2) {
      throw new Error('Insufficient data for prediction');
    }

    // Simple linear regression prediction
    const prediction = this.performLinearPrediction(metricData, period, forPeriod);

    return {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pluginId,
      userId,
      metricType,
      period,
      predictedValue: prediction.value,
      confidence: prediction.confidence,
      predictionDate: new Date(),
      forPeriod,
      basedOnData: prediction.basedOnData
    };
  }

  private async updateQuota(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    value: number,
    subscriptionId?: string
  ): Promise<void> {
    const key = `${pluginId}:${userId}:${metricType}:${subscriptionId || 'default'}`;
    let quota = this.quotas.get(key);

    if (!quota) {
      // Create default quota
      quota = {
        id: `quota_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pluginId,
        userId,
        subscriptionId,
        metricType,
        limit: 1000, // Default limit
        period: BillingCycle.MONTHLY,
        current: 0,
        percentage: 0,
        resetDate: this.getNextResetDate(BillingCycle.MONTHLY),
        isUnlimited: false,
        alerts: {
          warningThreshold: 80,
          criticalThreshold: 95
        }
      };
      this.quotas.set(key, quota);
    }

    quota.current += value;
    quota.percentage = Math.min(100, (quota.current / quota.limit) * 100);
    this.quotas.set(key, quota);
  }

  private async checkQuotaLimits(
    pluginId: string,
    userId: string,
    metricType: MetricType,
    subscriptionId?: string
  ): Promise<void> {
    const key = `${pluginId}:${userId}:${metricType}:${subscriptionId || 'default'}`;
    const quota = this.quotas.get(key);

    if (!quota || quota.isUnlimited) {
      return;
    }

    // Check warning threshold
    if (quota.percentage >= quota.alerts.warningThreshold && !quota.alerts.lastWarningAt) {
      await this.createUsageAlert({
        pluginId,
        userId,
        subscriptionId,
        metricType,
        thresholdType: 'warning',
        current: quota.current,
        limit: quota.limit,
        percentage: quota.percentage,
        message: `Warning: ${metricType} usage has reached ${quota.percentage.toFixed(1)}% of limit`
      });

      quota.alerts.lastWarningAt = new Date();
      this.quotas.set(key, quota);
    }

    // Check critical threshold
    if (quota.percentage >= quota.alerts.criticalThreshold && !quota.alerts.lastCriticalAt) {
      await this.createUsageAlert({
        pluginId,
        userId,
        subscriptionId,
        metricType,
        thresholdType: 'critical',
        current: quota.current,
        limit: quota.limit,
        percentage: quota.percentage,
        message: `Critical: ${metricType} usage has reached ${quota.percentage.toFixed(1)}% of limit`
      });

      quota.alerts.lastCriticalAt = new Date();
      this.quotas.set(key, quota);
    }
  }

  private async createUsageAlert(alertData: Omit<UsageAlert, 'id' | 'triggeredAt' | 'acknowledged'>): Promise<void> {
    const alert: UsageAlert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggeredAt: new Date(),
      acknowledged: false
    };

    this.alerts.set(alert.id, alert);

    // Send notification
    await this.sendUsageAlert(alert);
  }

  private async sendUsageAlert(alert: UsageAlert): Promise<void> {
    // Send notification about usage alert
    // This would integrate with the notification system
  }

  private async processRealTimeAggregation(metric: UsageMetric): Promise<void> {
    // Process real-time aggregation for immediate insights
    // This could update dashboards or trigger immediate actions
  }

  private async calculateUsageCosts(
    pluginId: string,
    userId: string,
    billingPeriod: { start: Date; end: Date },
    subscriptionId?: string
  ): Promise<Array<{
    metricType: MetricType;
    quantity: number;
    unitPrice: number;
    totalCost: number;
    unit: string;
  }>> {
    const costs = [];
    const key = `${pluginId}:${userId}`;
    const userMetrics = this.metrics.get(key) || [];

    if (subscriptionId) {
      userMetrics.filter(metric => metric.subscriptionId === subscriptionId);
    }

    const periodMetrics = userMetrics.filter(metric =>
      metric.timestamp >= billingPeriod.start && metric.timestamp <= billingPeriod.end
    );

    // Group by metric type
    const metricGroups = new Map<MetricType, UsageMetric[]>();
    for (const metric of periodMetrics) {
      if (!metricGroups.has(metric.type)) {
        metricGroups.set(metric.type, []);
      }
      metricGroups.get(metric.type)!.push(metric);
    }

    for (const [metricType, group] of metricGroups.entries()) {
      const total = group.reduce((sum, metric) => sum + metric.value, 0);
      const unit = group[0]?.unit || 'units';
      const unitPrice = await this.calculateCost(pluginId, userId, metricType, 1, 'current');
      const totalCost = await this.calculateCost(pluginId, userId, metricType, total, 'current');

      costs.push({
        metricType,
        quantity: total,
        unitPrice,
        totalCost,
        unit
      });
    }

    return costs;
  }

  private performLinearPrediction(
    metricData: UsageMetric[],
    period: BillingCycle,
    forPeriod: string
  ): { value: number; confidence: number; basedOnData: Array<{ period: string; value: number }> } {
    // Group data by period
    const periodMap = new Map<string, number>();

    for (const metric of metricData) {
      const periodKey = this.getPeriodKey(metric.timestamp, period);
      periodMap.set(periodKey, (periodMap.get(periodKey) || 0) + metric.value);
    }

    const sortedData = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6); // Use last 6 periods for prediction

    if (sortedData.length < 2) {
      return { value: 0, confidence: 0, basedOnData: [] };
    }

    // Simple linear regression
    const n = sortedData.length;
    const xValues = sortedData.map((_, i) => i);
    const yValues = sortedData.map(([_, value]) => value);

    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

    const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean), 0);
    const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Predict next period
    const predictedValue = intercept + slope * n;

    // Calculate confidence based on R-squared
    const ssRes = yValues.reduce((sum, y, i) => {
      const predicted = intercept + slope * i;
      return sum + Math.pow(y - predicted, 2);
    }, 0);

    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

    return {
      value: Math.max(0, predictedValue),
      confidence: Math.max(0, Math.min(1, rSquared)),
      basedOnData: sortedData.map(([period, value]) => ({ period, value }))
    };
  }

  private getPeriodKey(date: Date, period: BillingCycle): string {
    switch (period) {
      case BillingCycle.DAILY:
        return date.toISOString().substring(0, 10); // YYYY-MM-DD
      case BillingCycle.WEEKLY:
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().substring(0, 10);
      case BillingCycle.MONTHLY:
        return date.toISOString().substring(0, 7); // YYYY-MM
      case BillingCycle.QUARTERLY:
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `${date.getFullYear()}-Q${quarter}`;
      case BillingCycle.YEARLY:
        return date.getFullYear().toString();
      default:
        return date.toISOString().substring(0, 10);
    }
  }

  private getNextResetDate(period: BillingCycle): Date {
    const now = new Date();

    switch (period) {
      case BillingCycle.DAILY:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case BillingCycle.WEEKLY:
        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + (7 - now.getDay()));
        return nextWeek;
      case BillingCycle.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case BillingCycle.QUARTERLY:
        return new Date(now.getFullYear(), now.getMonth() + 3, 1);
      case BillingCycle.YEARLY:
        return new Date(now.getFullYear() + 1, 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random.toString().padStart(3, '0')}`;
  }

  private startAggregationTask(): void {
    // Aggregate usage data periodically
    setInterval(async () => {
      await this.aggregateUsageData();
    }, 60 * 60 * 1000); // Hourly
  }

  private startBillingTask(): void {
    // Generate invoices periodically
    setInterval(async () => {
      await this.generatePeriodicInvoices();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private startQuotaChecker(): void {
    // Check quota limits periodically
    setInterval(async () => {
      await this.checkAllQuotas();
    }, 60 * 60 * 1000); // Hourly
  }

  private startPredictionTask(): void {
    // Generate usage predictions periodically
    setInterval(async () => {
      await this.generateUsagePredictions();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private async aggregateUsageData(): Promise<void> {
    // Aggregate usage data for all users and plugins
    // This would process raw metrics into aggregated form
  }

  private async generatePeriodicInvoices(): Promise<void> {
    // Generate invoices for all active subscriptions
    // This would run at the end of billing periods
  }

  private async checkAllQuotas(): Promise<void> {
    // Check all quotas and generate alerts if needed
    // This would run periodically to ensure quota limits are respected
  }

  private async generateUsagePredictions(): Promise<void> {
    // Generate usage predictions for all active users
    // This would help with capacity planning and budgeting
  }
}