import { z } from 'zod';
import {
  Subscription,
  SubscriptionStatus,
  Customer,
  Invoice,
  PaymentIntent,
  PaymentStatus,
  Currency,
  PaymentProvider,
  PaymentMethodDetails
} from './PaymentProcessing';
import { PluginPricing, PricingModel, PricingTier } from './MonetizationModels';

export enum SubscriptionEventType {
  CREATED = 'created',
  UPDATED = 'updated',
  CANCELLED = 'cancelled',
  RENEWED = 'renewed',
  PAUSED = 'paused',
  RESUMED = 'resumed',
  PAYMENT_FAILED = 'payment_failed',
  TRIAL_STARTED = 'trial_started',
  TRIAL_ENDED = 'trial_ended',
  PLAN_CHANGED = 'plan_changed'
}

export enum SubscriptionAction {
  UPGRADE = 'upgrade',
  DOWNGRADE = 'downgrade',
  CANCEL = 'cancel',
  PAUSE = 'pause',
  RESUME = 'resume',
  CHANGE_PLAN = 'change_plan',
  CHANGE_PAYMENT_METHOD = 'change_payment_method',
  ADD_SEAT = 'add_seat',
  REMOVE_SEAT = 'remove_seat'
}

export interface SubscriptionEvent {
  id: string;
  subscriptionId: string;
  type: SubscriptionEventType;
  action?: SubscriptionAction;
  data: Record<string, any>;
  timestamp: Date;
  userId: string;
  pluginId: string;
}

export interface SubscriptionPlan {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  pricing: PluginPricing;
  features: string[];
  limits?: Record<string, number>;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  subscriptionId: string;
  pluginId: string;
  period: string; // YYYY-MM format
  metrics: Record<string, number>;
  calculatedAt: Date;
}

export interface SubscriptionChangeRequest {
  subscriptionId: string;
  action: SubscriptionAction;
  newPlanId?: string;
  newPaymentMethodId?: string;
  seats?: number;
  effectiveDate?: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionPauseRequest {
  subscriptionId: string;
  reason: string;
  resumeDate?: Date;
  metadata?: Record<string, any>;
}

export interface SubscriptionUsageLimit {
  metric: string;
  limit: number;
  current: number;
  percentage: number;
  exceeded: boolean;
}

export interface SubscriptionAnalytics {
  subscriptionId: string;
  pluginId: string;
  userId: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  totalRevenue: number;
  currency: Currency;
  usage: SubscriptionUsage;
  limits: SubscriptionUsageLimit[];
  renewalDate: Date;
  daysUntilRenewal: number;
  isActive: boolean;
  isPaused: boolean;
  isTrialing: boolean;
  willCancel: boolean;
}

export interface SubscriptionInvoice {
  id: string;
  subscriptionId: string;
  pluginId: string;
  userId: string;
  customerId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  lines: SubscriptionInvoiceLine[];
  tax: number;
  taxRate: number;
  total: number;
  paid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionInvoiceLine {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  quantity?: number;
  proration: boolean;
  type: 'subscription' | 'usage' | 'setup_fee' | 'discount' | 'tax';
  metadata?: Record<string, any>;
}

export interface SubscriptionSeat {
  id: string;
  subscriptionId: string;
  userId: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'removed';
  invitedAt?: Date;
  joinedAt?: Date;
  removedAt?: Date;
  metadata?: Record<string, any>;
}

// Schemas
export const SubscriptionEventSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  type: z.nativeEnum(SubscriptionEventType),
  action: z.nativeEnum(SubscriptionAction).optional(),
  data: z.record(z.any()),
  timestamp: z.date(),
  userId: z.string(),
  pluginId: z.string()
});

export const SubscriptionPlanSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  name: z.string(),
  description: z.string(),
  pricing: z.any(), // PluginPricing type
  features: z.array(z.string()),
  limits: z.record(z.number()).optional(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const SubscriptionUsageSchema = z.object({
  subscriptionId: z.string(),
  pluginId: z.string(),
  period: z.string(),
  metrics: z.record(z.number()),
  calculatedAt: z.date()
});

export const SubscriptionChangeRequestSchema = z.object({
  subscriptionId: z.string(),
  action: z.nativeEnum(SubscriptionAction),
  newPlanId: z.string().optional(),
  newPaymentMethodId: z.string().optional(),
  seats: z.number().min(1).optional(),
  effectiveDate: z.date().optional(),
  reason: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const SubscriptionPauseRequestSchema = z.object({
  subscriptionId: z.string(),
  reason: z.string(),
  resumeDate: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

export const SubscriptionUsageLimitSchema = z.object({
  metric: z.string(),
  limit: z.number(),
  current: number,
  percentage: z.number().min(0).max(100),
  exceeded: z.boolean()
});

export const SubscriptionAnalyticsSchema = z.object({
  subscriptionId: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  status: z.nativeEnum(SubscriptionStatus),
  plan: SubscriptionPlanSchema,
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  trialEnd: z.date().optional(),
  totalRevenue: z.number(),
  currency: z.nativeEnum(Currency),
  usage: SubscriptionUsageSchema,
  limits: z.array(SubscriptionUsageLimitSchema),
  renewalDate: z.date(),
  daysUntilRenewal: z.number(),
  isActive: z.boolean(),
  isPaused: z.boolean(),
  isTrialing: z.boolean(),
  willCancel: z.boolean()
});

export const SubscriptionInvoiceSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  customerId: z.string(),
  amount: z.number().min(0),
  currency: z.nativeEnum(Currency),
  status: z.nativeEnum(PaymentStatus),
  description: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  lines: z.array(z.object({
    id: z.string(),
    description: z.string(),
    amount: z.number().min(0),
    currency: z.nativeEnum(Currency),
    quantity: z.number().optional(),
    proration: z.boolean(),
    type: z.enum(['subscription', 'usage', 'setup_fee', 'discount', 'tax']),
    metadata: z.record(z.any()).optional()
  })),
  tax: z.number().min(0),
  taxRate: z.number().min(0),
  total: z.number().min(0),
  paid: z.boolean(),
  paidAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const SubscriptionSeatSchema = z.object({
  id: z.string(),
  subscriptionId: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
  status: z.enum(['active', 'invited', 'removed']),
  invitedAt: z.date().optional(),
  joinedAt: z.date().optional(),
  removedAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

// Type exports
export type SubscriptionEventTypeType = z.infer<typeof SubscriptionEventSchema>;
export type SubscriptionPlanType = z.infer<typeof SubscriptionPlanSchema>;
export type SubscriptionUsageType = z.infer<typeof SubscriptionUsageSchema>;
export type SubscriptionChangeRequestType = z.infer<typeof SubscriptionChangeRequestSchema>;
export type SubscriptionPauseRequestType = z.infer<typeof SubscriptionPauseRequestSchema>;
export type SubscriptionUsageLimitType = z.infer<typeof SubscriptionUsageLimitSchema>;
export type SubscriptionAnalyticsType = z.infer<typeof SubscriptionAnalyticsSchema>;
export type SubscriptionInvoiceType = z.infer<typeof SubscriptionInvoiceSchema>;
export type SubscriptionSeatType = z.infer<typeof SubscriptionSeatSchema>;

// Subscription Manager
export class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private plans: Map<string, SubscriptionPlan> = new Map();
  private events: Map<string, SubscriptionEvent> = new Map();
  private usage: Map<string, SubscriptionUsage[]> = new Map();
  private seats: Map<string, SubscriptionSeat[]> = new Map();
  private invoices: Map<string, SubscriptionInvoice> = new Map();

  constructor() {
    this.initializeDefaultPlans();
    this.startPeriodicTasks();
  }

  private initializeDefaultPlans(): void {
    // Initialize default subscription plans
    // This would typically be loaded from configuration or database
  }

  private startPeriodicTasks(): void {
    // Start background tasks for subscription management
    this.startRenewalChecker();
    this.startUsageTracker();
    this.startInvoiceGenerator();
  }

  async createSubscription(
    userId: string,
    pluginId: string,
    planId: string,
    paymentMethodId: string,
    options?: {
      trialPeriodDays?: number;
      seats?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<Subscription> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Subscription plan ${planId} not found`);
    }

    if (!plan.isActive) {
      throw new Error(`Subscription plan ${planId} is not active`);
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const subscription: Subscription = {
      id: subscriptionId,
      pluginId,
      userId,
      status: SubscriptionStatus.INCOMPLETE,
      provider: PaymentProvider.STRIPE, // Default provider
      providerSubscriptionId: '',
      priceId: planId,
      customerId: '', // Would be created or retrieved
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
      metadata: options?.metadata,
      createdAt: now,
      updatedAt: now
    };

    if (options?.trialPeriodDays) {
      const trialEnd = new Date(now.getTime() + options.trialPeriodDays * 24 * 60 * 60 * 1000);
      subscription.trialStart = now;
      subscription.trialEnd = trialEnd;
      subscription.status = SubscriptionStatus.TRIALING;
    }

    this.subscriptions.set(subscriptionId, subscription);

    // Record event
    await this.recordEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId,
      type: SubscriptionEventType.CREATED,
      data: { planId, paymentMethodId, trialPeriodDays: options?.trialPeriodDays },
      timestamp: now,
      userId,
      pluginId
    });

    // Process subscription creation with payment provider
    try {
      const result = await this.processSubscriptionCreation(subscription, paymentMethodId);
      subscription.status = result.status;
      subscription.providerSubscriptionId = result.providerSubscriptionId;
      subscription.customerId = result.customerId;
      subscription.updatedAt = new Date();

      this.subscriptions.set(subscriptionId, subscription);
      return subscription;
    } catch (error) {
      subscription.status = SubscriptionStatus.INCOMPLETE_EXPIRED;
      subscription.updatedAt = new Date();
      this.subscriptions.set(subscriptionId, subscription);

      throw error;
    }
  }

  async changeSubscription(request: SubscriptionChangeRequestType): Promise<Subscription> {
    const subscription = this.subscriptions.get(request.subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${request.subscriptionId} not found`);
    }

    const originalStatus = subscription.status;
    const originalPlan = subscription.priceId;

    switch (request.action) {
      case SubscriptionAction.UPGRADE:
      case SubscriptionAction.DOWNGRADE:
      case SubscriptionAction.CHANGE_PLAN:
        if (!request.newPlanId) {
          throw new Error('newPlanId is required for plan changes');
        }
        await this.changePlan(subscription, request.newPlanId, request.effectiveDate);
        break;

      case SubscriptionAction.CANCEL:
        await this.cancelSubscription(subscription, request.reason);
        break;

      case SubscriptionAction.PAUSE:
        await this.pauseSubscription(subscription, request.reason);
        break;

      case SubscriptionAction.RESUME:
        await this.resumeSubscription(subscription);
        break;

      case SubscriptionAction.CHANGE_PAYMENT_METHOD:
        if (!request.newPaymentMethodId) {
          throw new Error('newPaymentMethodId is required for payment method changes');
        }
        await this.changePaymentMethod(subscription, request.newPaymentMethodId);
        break;

      case SubscriptionAction.ADD_SEAT:
      case SubscriptionAction.REMOVE_SEAT:
        if (!request.seats) {
          throw new Error('seats is required for seat changes');
        }
        await this.changeSeats(subscription, request.seats, request.action);
        break;

      default:
        throw new Error(`Unsupported subscription action: ${request.action}`);
    }

    // Record change event
    await this.recordEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      type: SubscriptionEventType.UPDATED,
      action: request.action,
      data: {
        originalStatus,
        originalPlan,
        newStatus: subscription.status,
        newPlan: subscription.priceId,
        reason: request.reason,
        metadata: request.metadata
      },
      timestamp: new Date(),
      userId: subscription.userId,
      pluginId: subscription.pluginId
    });

    return subscription;
  }

  async cancelSubscription(subscription: Subscription, reason?: string, immediate: boolean = false): Promise<Subscription> {
    if (subscription.status === SubscriptionStatus.CANCELLED || subscription.status === SubscriptionStatus.ENDED) {
      throw new Error('Subscription is already cancelled');
    }

    if (immediate) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.canceledAt = new Date();
      subscription.endedAt = new Date();
    } else {
      subscription.cancelAtPeriodEnd = true;
      subscription.canceledAt = new Date();
    }

    subscription.updatedAt = new Date();
    this.subscriptions.set(subscription.id, subscription);

    await this.recordEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      type: SubscriptionEventType.CANCELLED,
      data: { reason, immediate },
      timestamp: new Date(),
      userId: subscription.userId,
      pluginId: subscription.pluginId
    });

    return subscription;
  }

  async pauseSubscription(subscription: Subscription, reason: string, resumeDate?: Date): Promise<Subscription> {
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new Error('Only active subscriptions can be paused');
    }

    subscription.paused = true;
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscription.id, subscription);

    await this.recordEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      type: SubscriptionEventType.PAUSED,
      data: { reason, resumeDate },
      timestamp: new Date(),
      userId: subscription.userId,
      pluginId: subscription.pluginId
    });

    return subscription;
  }

  async resumeSubscription(subscription: Subscription): Promise<Subscription> {
    if (!subscription.paused) {
      throw new Error('Subscription is not paused');
    }

    subscription.paused = false;
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscription.id, subscription);

    await this.recordEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      type: SubscriptionEventType.RESUMED,
      data: {},
      timestamp: new Date(),
      userId: subscription.userId,
      pluginId: subscription.pluginId
    });

    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(sub => sub.userId === userId);
  }

  async getPluginSubscriptions(pluginId: string): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values()).filter(sub => sub.pluginId === pluginId);
  }

  async getSubscriptionAnalytics(subscriptionId: string): Promise<SubscriptionAnalyticsType | null> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return null;
    }

    const plan = this.plans.get(subscription.priceId);
    if (!plan) {
      return null;
    }

    const usage = this.getCurrentUsage(subscriptionId);
    const limits = this.calculateUsageLimits(subscription, plan, usage);
    const renewalDate = new Date(subscription.currentPeriodEnd);
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return {
      subscriptionId,
      pluginId: subscription.pluginId,
      userId: subscription.userId,
      status: subscription.status,
      plan,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEnd: subscription.trialEnd,
      totalRevenue: this.calculateTotalRevenue(subscriptionId),
      currency: Currency.USD, // Would be from plan
      usage,
      limits,
      renewalDate,
      daysUntilRenewal,
      isActive: subscription.status === SubscriptionStatus.ACTIVE,
      isPaused: subscription.paused || false,
      isTrialing: subscription.status === SubscriptionStatus.TRIALING,
      willCancel: subscription.cancelAtPeriodEnd
    };
  }

  async recordUsage(subscriptionId: string, metrics: Record<string, number>): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const period = new Date().toISOString().substring(0, 7); // YYYY-MM
    let usageList = this.usage.get(subscriptionId) || [];

    let currentUsage = usageList.find(u => u.period === period);
    if (!currentUsage) {
      currentUsage = {
        subscriptionId,
        pluginId: subscription.pluginId,
        period,
        metrics: {},
        calculatedAt: new Date()
      };
      usageList.push(currentUsage);
    }

    // Update metrics
    for (const [key, value] of Object.entries(metrics)) {
      currentUsage.metrics[key] = (currentUsage.metrics[key] || 0) + value;
    }

    currentUsage.calculatedAt = new Date();
    this.usage.set(subscriptionId, usageList);

    // Check for usage limits and send notifications if needed
    await this.checkUsageLimits(subscription, currentUsage);
  }

  async getUsageHistory(subscriptionId: string, periods: number = 12): Promise<SubscriptionUsage[]> {
    const usageList = this.usage.get(subscriptionId) || [];
    return usageList.slice(-periods);
  }

  private async changePlan(subscription: Subscription, newPlanId: string, effectiveDate?: Date): Promise<void> {
    const newPlan = this.plans.get(newPlanId);
    if (!newPlan) {
      throw new Error(`New plan ${newPlanId} not found`);
    }

    if (!newPlan.isActive) {
      throw new Error(`New plan ${newPlanId} is not active`);
    }

    const oldPlan = this.plans.get(subscription.priceId);
    if (!oldPlan) {
      throw new Error(`Current plan ${subscription.priceId} not found`);
    }

    // Handle proration if effective date is immediate
    if (!effectiveDate || effectiveDate <= new Date()) {
      await this.handleProration(subscription, oldPlan, newPlan);
    }

    subscription.priceId = newPlanId;
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscription.id, subscription);
  }

  private async changePaymentMethod(subscription: Subscription, newPaymentMethodId: string): Promise<void> {
    // Update payment method with payment provider
    // This would integrate with the payment processor
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscription.id, subscription);
  }

  private async changeSeats(subscription: Subscription, seats: number, action: SubscriptionAction): Promise<void> {
    // Handle seat changes
    // This would involve proration and updates to the subscription
    subscription.updatedAt = new Date();
    this.subscriptions.set(subscription.id, subscription);
  }

  private async handleProration(subscription: Subscription, oldPlan: SubscriptionPlan, newPlan: SubscriptionPlan): Promise<void> {
    // Calculate prorated amount and create invoice
    // This would integrate with the payment processor
  }

  private async processSubscriptionCreation(subscription: Subscription, paymentMethodId: string): Promise<{
    status: SubscriptionStatus;
    providerSubscriptionId: string;
    customerId: string;
  }> {
    // This would integrate with the payment processor
    return {
      status: subscription.status,
      providerSubscriptionId: `sub_${subscription.provider}_${Date.now()}`,
      customerId: `cus_${subscription.provider}_${Date.now()}`
    };
  }

  private getCurrentUsage(subscriptionId: string): SubscriptionUsageType {
    const period = new Date().toISOString().substring(0, 7); // YYYY-MM
    const usageList = this.usage.get(subscriptionId) || [];
    return usageList.find(u => u.period === period) || {
      subscriptionId,
      pluginId: this.subscriptions.get(subscriptionId)?.pluginId || '',
      period,
      metrics: {},
      calculatedAt: new Date()
    };
  }

  private calculateUsageLimits(subscription: Subscription, plan: SubscriptionPlan, usage: SubscriptionUsage): SubscriptionUsageLimitType[] {
    const limits: SubscriptionUsageLimitType[] = [];

    if (plan.limits) {
      for (const [metric, limit] of Object.entries(plan.limits)) {
        const current = usage.metrics[metric] || 0;
        const percentage = limit > 0 ? (current / limit) * 100 : 0;

        limits.push({
          metric,
          limit,
          current,
          percentage: Math.round(percentage * 100) / 100,
          exceeded: current > limit
        });
      }
    }

    return limits;
  }

  private calculateTotalRevenue(subscriptionId: string): number {
    // Calculate total revenue from subscription invoices
    // This would integrate with the payment processor
    return 0;
  }

  private async checkUsageLimits(subscription: Subscription, usage: SubscriptionUsage): Promise<void> {
    const plan = this.plans.get(subscription.priceId);
    if (!plan || !plan.limits) {
      return;
    }

    const limits = this.calculateUsageLimits(subscription, plan, usage);
    const exceededLimits = limits.filter(limit => limit.exceeded);

    if (exceededLimits.length > 0) {
      // Send notification about exceeded limits
      await this.sendUsageLimitNotification(subscription, exceededLimits);
    }
  }

  private async sendUsageLimitNotification(subscription: Subscription, exceededLimits: SubscriptionUsageLimitType[]): Promise<void> {
    // Send notification to user about exceeded usage limits
    // This would integrate with the notification system
  }

  private async recordEvent(event: SubscriptionEventTypeType): Promise<void> {
    this.events.set(event.id, event);
  }

  private startRenewalChecker(): void {
    // Check for subscriptions that need renewal
    setInterval(async () => {
      const now = new Date();
      const subscriptionsToRenew = Array.from(this.subscriptions.values()).filter(sub =>
        sub.status === SubscriptionStatus.ACTIVE &&
        sub.currentPeriodEnd <= now &&
        !sub.cancelAtPeriodEnd
      );

      for (const subscription of subscriptionsToRenew) {
        await this.processRenewal(subscription);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  private async processRenewal(subscription: Subscription): Promise<void> {
    try {
      // Process renewal with payment provider
      const success = await this.renewSubscriptionWithProvider(subscription);

      if (success) {
        subscription.currentPeriodStart = new Date();
        subscription.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        subscription.updatedAt = new Date();

        await this.recordEvent({
          id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subscriptionId: subscription.id,
          type: SubscriptionEventType.RENEWED,
          data: { renewedUntil: subscription.currentPeriodEnd },
          timestamp: new Date(),
          userId: subscription.userId,
          pluginId: subscription.pluginId
        });
      } else {
        subscription.status = SubscriptionStatus.PAST_DUE;
        subscription.updatedAt = new Date();

        await this.recordEvent({
          id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subscriptionId: subscription.id,
          type: SubscriptionEventType.PAYMENT_FAILED,
          data: { reason: 'Renewal payment failed' },
          timestamp: new Date(),
          userId: subscription.userId,
          pluginId: subscription.pluginId
        });
      }

      this.subscriptions.set(subscription.id, subscription);
    } catch (error) {
      console.error(`Failed to renew subscription ${subscription.id}:`, error);
    }
  }

  private async renewSubscriptionWithProvider(subscription: Subscription): Promise<boolean> {
    // This would integrate with the payment processor
    return true;
  }

  private startUsageTracker(): void {
    // Track usage metrics periodically
    setInterval(async () => {
      // Collect and aggregate usage data
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private startInvoiceGenerator(): void {
    // Generate invoices for subscriptions
    setInterval(async () => {
      const now = new Date();
      const subscriptionsToInvoice = Array.from(this.subscriptions.values()).filter(sub =>
        sub.status === SubscriptionStatus.ACTIVE &&
        sub.currentPeriodEnd <= now &&
        !sub.cancelAtPeriodEnd
      );

      for (const subscription of subscriptionsToInvoice) {
        await this.generateInvoice(subscription);
      }
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private async generateInvoice(subscription: Subscription): Promise<SubscriptionInvoice> {
    // Generate invoice for subscription
    // This would integrate with the payment processor
    const invoice: SubscriptionInvoice = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subscriptionId: subscription.id,
      pluginId: subscription.pluginId,
      userId: subscription.userId,
      customerId: subscription.customerId,
      amount: 0, // Would calculate based on plan
      currency: Currency.USD,
      status: PaymentStatus.PENDING,
      description: `Subscription invoice for ${subscription.pluginId}`,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      lines: [],
      tax: 0,
      taxRate: 0,
      total: 0,
      paid: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.invoices.set(invoice.id, invoice);
    return invoice;
  }
}