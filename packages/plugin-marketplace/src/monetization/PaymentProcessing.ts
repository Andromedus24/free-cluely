import { z } from 'zod';
import { PluginPricing, PricingModel, Currency, DiscountModel, BundleModel } from './MonetizationModels';

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple-pay',
  GOOGLE_PAY = 'google-pay',
  CREDIT_CARD = 'credit-card',
  BANK_TRANSFER = 'bank-transfer',
  CRYPTO = 'crypto'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially-refunded'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit-card',
  DEBIT_CARD = 'debit-card',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple-pay',
  GOOGLE_PAY = 'google-pay',
  BANK_ACCOUNT = 'bank-account',
  CRYPTO_WALLET = 'crypto-wallet',
  GIFT_CARD = 'gift-card'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past-due',
  CANCELLED = 'cancelled',
  UNPAID = 'unpaid',
  TRIALING = 'trialing',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete-expired'
}

export interface PaymentMethodDetails {
  id: string;
  type: PaymentMethod;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  brand?: string;
  country?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerIntentId: string;
  pluginId: string;
  userId: string;
  description: string;
  metadata?: Record<string, any>;
  paymentMethodId?: string;
  customerId?: string;
  invoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  failureReason?: string;
  refundAmount?: number;
  refundReason?: string;
}

export interface Subscription {
  id: string;
  pluginId: string;
  userId: string;
  status: SubscriptionStatus;
  provider: PaymentProvider;
  providerSubscriptionId: string;
  priceId: string;
  customerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart?: Date;
  trialEnd?: Date;
  cancelAtPeriodEnd: boolean;
  paused?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  canceledAt?: Date;
  endedAt?: Date;
}

export interface Invoice {
  id: string;
  subscriptionId?: string;
  pluginId: string;
  userId: string;
  customerId: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  providerInvoiceId: string;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  lines: InvoiceLine[];
  tax?: number;
  taxRate?: number;
  total: number;
  paid: boolean;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLine {
  id: string;
  description: string;
  amount: number;
  currency: Currency;
  quantity?: number;
  proration?: boolean;
  metadata?: Record<string, any>;
}

export interface Customer {
  id: string;
  userId: string;
  email: string;
  name?: string;
  providerCustomerId: string;
  provider: PaymentProvider;
  paymentMethods: PaymentMethodDetails[];
  defaultPaymentMethod?: string;
  balance?: number;
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentProviderConfig {
  provider: PaymentProvider;
  apiKey: string;
  webhookSecret?: string;
  sandbox: boolean;
  supportedCurrencies: Currency[];
  supportedMethods: PaymentMethod[];
  fees: {
    percentage: number;
    fixed: number;
    currency: Currency;
  };
  features: {
    subscriptions: boolean;
    refunds: boolean;
    disputes: boolean;
    instantPayouts: boolean;
  };
}

export interface PaymentRequest {
  pluginId: string;
  amount: number;
  currency: Currency;
  paymentMethodId?: string;
  customerId?: string;
  description: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface RefundRequest {
  paymentIntentId: string;
  amount?: number; // Partial refund if specified
  reason: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionRequest {
  pluginId: string;
  priceId: string;
  customerId: string;
  paymentMethodId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntent?: PaymentIntent;
  clientSecret?: string;
  redirectUrl?: string;
  error?: string;
  requiresAction?: boolean;
  nextAction?: {
    type: 'redirect' | 'use_stripe_sdk' | 'confirm_card';
    data?: any;
  };
}

export interface WebhookEvent {
  id: string;
  type: string;
  provider: PaymentProvider;
  data: any;
  receivedAt: Date;
  processed: boolean;
  processedAt?: Date;
}

// Schemas
export const PaymentMethodDetailsSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(PaymentMethod),
  last4: z.string().optional(),
  expiryMonth: z.number().min(1).max(12).optional(),
  expiryYear: z.number().min(new Date().getFullYear()).optional(),
  brand: z.string().optional(),
  country: z.string().optional(),
  isDefault: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const PaymentIntentSchema = z.object({
  id: z.string(),
  amount: z.number().min(0),
  currency: z.nativeEnum(Currency),
  status: z.nativeEnum(PaymentStatus),
  provider: z.nativeEnum(PaymentProvider),
  providerIntentId: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
  paymentMethodId: z.string().optional(),
  customerId: z.string().optional(),
  invoiceId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  processedAt: z.date().optional(),
  failureReason: z.string().optional(),
  refundAmount: z.number().min(0).optional(),
  refundReason: z.string().optional()
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  status: z.nativeEnum(SubscriptionStatus),
  provider: z.nativeEnum(PaymentProvider),
  providerSubscriptionId: z.string(),
  priceId: z.string(),
  customerId: z.string(),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  trialStart: z.date().optional(),
  trialEnd: z.date().optional(),
  cancelAtPeriodEnd: z.boolean(),
  paused: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  canceledAt: z.date().optional(),
  endedAt: z.date().optional()
});

export const InvoiceSchema = z.object({
  id: z.string(),
  subscriptionId: z.string().optional(),
  pluginId: z.string(),
  userId: z.string(),
  customerId: z.string(),
  amount: z.number().min(0),
  currency: z.nativeEnum(Currency),
  status: z.nativeEnum(PaymentStatus),
  providerInvoiceId: z.string(),
  description: z.string(),
  periodStart: z.date(),
  periodEnd: z.date(),
  lines: z.array(z.object({
    id: z.string(),
    description: z.string(),
    amount: z.number().min(0),
    currency: z.nativeEnum(Currency),
    quantity: z.number().optional(),
    proration: z.boolean().optional(),
    metadata: z.record(z.any()).optional()
  })),
  tax: z.number().min(0).optional(),
  taxRate: z.number().min(0).optional(),
  total: z.number().min(0),
  paid: z.boolean(),
  paidAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const CustomerSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  providerCustomerId: z.string(),
  provider: z.nativeEnum(PaymentProvider),
  paymentMethods: z.array(PaymentMethodDetailsSchema),
  defaultPaymentMethod: z.string().optional(),
  balance: z.number().optional(),
  currency: z.nativeEnum(Currency),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const PaymentProviderConfigSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  apiKey: z.string(),
  webhookSecret: z.string().optional(),
  sandbox: z.boolean(),
  supportedCurrencies: z.array(z.nativeEnum(Currency)),
  supportedMethods: z.array(z.nativeEnum(PaymentMethod)),
  fees: z.object({
    percentage: z.number().min(0).max(100),
    fixed: z.number().min(0),
    currency: z.nativeEnum(Currency)
  }),
  features: z.object({
    subscriptions: z.boolean(),
    refunds: z.boolean(),
    disputes: z.boolean(),
    instantPayouts: z.boolean()
  })
});

export const PaymentRequestSchema = z.object({
  pluginId: z.string(),
  amount: z.number().min(0),
  currency: z.nativeEnum(Currency),
  paymentMethodId: z.string().optional(),
  customerId: z.string().optional(),
  description: z.string(),
  metadata: z.record(z.any()).optional(),
  returnUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional()
});

export const RefundRequestSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().min(0).optional(),
  reason: z.string(),
  metadata: z.record(z.any()).optional()
});

export const SubscriptionRequestSchema = z.object({
  pluginId: z.string(),
  priceId: z.string(),
  customerId: z.string(),
  paymentMethodId: z.string(),
  trialPeriodDays: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional()
});

export const PaymentResultSchema = z.object({
  success: z.boolean(),
  paymentIntent: PaymentIntentSchema.optional(),
  clientSecret: z.string().optional(),
  redirectUrl: z.string().url().optional(),
  error: z.string().optional(),
  requiresAction: z.boolean().optional(),
  nextAction: z.object({
    type: z.enum(['redirect', 'use_stripe_sdk', 'confirm_card']),
    data: z.any().optional()
  }).optional()
});

export const WebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  provider: z.nativeEnum(PaymentProvider),
  data: z.any(),
  receivedAt: z.date(),
  processed: z.boolean(),
  processedAt: z.date().optional()
});

// Type exports
export type PaymentMethodDetailsType = z.infer<typeof PaymentMethodDetailsSchema>;
export type PaymentIntentType = z.infer<typeof PaymentIntentSchema>;
export type SubscriptionType = z.infer<typeof SubscriptionSchema>;
export type InvoiceType = z.infer<typeof InvoiceSchema>;
export type CustomerType = z.infer<typeof CustomerSchema>;
export type PaymentProviderConfigType = z.infer<typeof PaymentProviderConfigSchema>;
export type PaymentRequestType = z.infer<typeof PaymentRequestSchema>;
export type RefundRequestType = z.infer<typeof RefundRequestSchema>;
export type SubscriptionRequestType = z.infer<typeof SubscriptionRequestSchema>;
export type PaymentResultType = z.infer<typeof PaymentResultSchema>;
export type WebhookEventType = z.infer<typeof WebhookEventSchema>;

// Payment Processing Service
export class PaymentProcessor {
  private providers: Map<PaymentProvider, any> = new Map();
  private configs: Map<PaymentProvider, PaymentProviderConfig> = new Map();
  private customers: Map<string, Customer> = new Map();
  private paymentIntents: Map<string, PaymentIntent> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize payment provider adapters
    // This would be implemented with actual provider SDKs
  }

  async processPayment(request: PaymentRequestType, provider: PaymentProvider): Promise<PaymentResultType> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Payment provider ${provider} not configured`);
    }

    // Validate payment request
    PaymentRequestSchema.parse(request);

    // Create payment intent
    const paymentIntent: PaymentIntentType = {
      id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: request.amount,
      currency: request.currency,
      status: PaymentStatus.PENDING,
      provider,
      providerIntentId: '',
      pluginId: request.pluginId,
      userId: '', // Would be extracted from auth context
      description: request.description,
      metadata: request.metadata,
      paymentMethodId: request.paymentMethodId,
      customerId: request.customerId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.paymentIntents.set(paymentIntent.id, paymentIntent);

    // Process with provider
    try {
      const result = await this.processWithProvider(paymentIntent, config);

      if (result.success) {
        paymentIntent.status = PaymentStatus.SUCCEEDED;
        paymentIntent.processedAt = new Date();
        paymentIntent.providerIntentId = result.providerIntentId || '';
      } else {
        paymentIntent.status = PaymentStatus.FAILED;
        paymentIntent.failureReason = result.error;
      }

      paymentIntent.updatedAt = new Date();
      this.paymentIntents.set(paymentIntent.id, paymentIntent);

      return result;
    } catch (error) {
      paymentIntent.status = PaymentStatus.FAILED;
      paymentIntent.failureReason = error instanceof Error ? error.message : 'Unknown error';
      paymentIntent.updatedAt = new Date();
      this.paymentIntents.set(paymentIntent.id, paymentIntent);

      return {
        success: false,
        error: paymentIntent.failureReason
      };
    }
  }

  async processRefund(request: RefundRequestType): Promise<PaymentResultType> {
    const paymentIntent = this.paymentIntents.get(request.paymentIntentId);
    if (!paymentIntent) {
      throw new Error(`Payment intent ${request.paymentIntentId} not found`);
    }

    if (paymentIntent.status !== PaymentStatus.SUCCEEDED) {
      throw new Error(`Cannot refund payment with status ${paymentIntent.status}`);
    }

    const refundAmount = request.amount || paymentIntent.amount;
    if (refundAmount > paymentIntent.amount) {
      throw new Error('Refund amount cannot exceed original payment amount');
    }

    // Process refund with provider
    try {
      const result = await this.processRefundWithProvider(paymentIntent, refundAmount, request.reason);

      if (result.success) {
        paymentIntent.refundAmount = refundAmount;
        paymentIntent.refundReason = request.reason;
        paymentIntent.status = refundAmount === paymentIntent.amount ?
          PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;
      }

      paymentIntent.updatedAt = new Date();
      this.paymentIntents.set(paymentIntent.id, paymentIntent);

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async createSubscription(request: SubscriptionRequestType, provider: PaymentProvider): Promise<SubscriptionType> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Payment provider ${provider} not configured`);
    }

    if (!config.features.subscriptions) {
      throw new Error(`Provider ${provider} does not support subscriptions`);
    }

    SubscriptionRequestSchema.parse(request);

    const subscription: SubscriptionType = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      pluginId: request.pluginId,
      userId: '', // Would be extracted from auth context
      status: SubscriptionStatus.INCOMPLETE,
      provider,
      providerSubscriptionId: '',
      priceId: request.priceId,
      customerId: request.customerId,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      cancelAtPeriodEnd: false,
      metadata: request.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (request.trialPeriodDays) {
      const trialEnd = new Date(Date.now() + request.trialPeriodDays * 24 * 60 * 60 * 1000);
      subscription.trialStart = new Date();
      subscription.trialEnd = trialEnd;
      subscription.status = SubscriptionStatus.TRIALING;
    }

    this.subscriptions.set(subscription.id, subscription);

    try {
      const result = await this.createSubscriptionWithProvider(subscription, config);
      subscription.providerSubscriptionId = result.providerSubscriptionId;
      subscription.status = result.status;
      subscription.updatedAt = new Date();

      this.subscriptions.set(subscription.id, subscription);
      return subscription;
    } catch (error) {
      subscription.status = SubscriptionStatus.INCOMPLETE_EXPIRED;
      subscription.updatedAt = new Date();
      this.subscriptions.set(subscription.id, subscription);

      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<SubscriptionType> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.status === SubscriptionStatus.CANCELLED || subscription.status === SubscriptionStatus.ENDED) {
      throw new Error(`Subscription ${subscriptionId} is already cancelled`);
    }

    try {
      await this.cancelSubscriptionWithProvider(subscription, cancelAtPeriodEnd);

      subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
      subscription.status = cancelAtPeriodEnd ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELLED;
      subscription.canceledAt = cancelAtPeriodEnd ? undefined : new Date();
      subscription.updatedAt = new Date();

      this.subscriptions.set(subscription.id, subscription);
      return subscription;
    } catch (error) {
      throw error;
    }
  }

  async createCustomer(userId: string, email: string, name?: string, provider: PaymentProvider): Promise<CustomerType> {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Payment provider ${provider} not configured`);
    }

    const customer: CustomerType = {
      id: `cus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      email,
      name,
      providerCustomerId: '',
      provider,
      paymentMethods: [],
      currency: Currency.USD,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const result = await this.createCustomerWithProvider(customer, config);
      customer.providerCustomerId = result.providerCustomerId;
      customer.updatedAt = new Date();

      this.customers.set(customer.id, customer);
      return customer;
    } catch (error) {
      throw error;
    }
  }

  async addPaymentMethod(customerId: string, paymentMethod: PaymentMethodDetailsType): Promise<CustomerType> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    customer.paymentMethods.push(paymentMethod);
    customer.updatedAt = new Date();

    this.customers.set(customer.id, customer);
    return customer;
  }

  async getPaymentStatus(paymentIntentId: string): Promise<PaymentIntentType | null> {
    return this.paymentIntents.get(paymentIntentId) || null;
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionType | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethodDetailsType[]> {
    const customer = this.customers.get(customerId);
    return customer?.paymentMethods || [];
  }

  private async processWithProvider(paymentIntent: PaymentIntentType, config: PaymentProviderConfigType): Promise<PaymentResultType> {
    // This would integrate with actual payment provider SDKs
    // For now, return a mock result
    return {
      success: true,
      paymentIntent,
      providerIntentId: `pi_${paymentIntent.provider}_${Date.now()}`
    };
  }

  private async processRefundWithProvider(paymentIntent: PaymentIntentType, amount: number, reason: string): Promise<PaymentResultType> {
    // This would integrate with actual payment provider SDKs
    return {
      success: true
    };
  }

  private async createSubscriptionWithProvider(subscription: SubscriptionType, config: PaymentProviderConfigType): Promise<{ providerSubscriptionId: string; status: SubscriptionStatus }> {
    // This would integrate with actual payment provider SDKs
    return {
      providerSubscriptionId: `sub_${subscription.provider}_${Date.now()}`,
      status: SubscriptionStatus.ACTIVE
    };
  }

  private async cancelSubscriptionWithProvider(subscription: SubscriptionType, cancelAtPeriodEnd: boolean): Promise<void> {
    // This would integrate with actual payment provider SDKs
  }

  private async createCustomerWithProvider(customer: CustomerType, config: PaymentProviderConfigType): Promise<{ providerCustomerId: string }> {
    // This would integrate with actual payment provider SDKs
    return {
      providerCustomerId: `cus_${customer.provider}_${Date.now()}`
    };
  }

  // Utility methods
  calculateFees(amount: number, provider: PaymentProvider): number {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`Payment provider ${provider} not configured`);
    }

    const percentageFee = (amount * config.fees.percentage) / 100;
    const fixedFee = config.fees.fixed;

    return percentageFee + fixedFee;
  }

  getSupportedCurrencies(provider: PaymentProvider): Currency[] {
    const config = this.configs.get(provider);
    return config?.supportedCurrencies || [];
  }

  getSupportedPaymentMethods(provider: PaymentProvider): PaymentMethod[] {
    const config = this.configs.get(provider);
    return config?.supportedMethods || [];
  }

  isFeatureSupported(provider: PaymentProvider, feature: keyof PaymentProviderConfigType['features']): boolean {
    const config = this.configs.get(provider);
    return config?.features[feature] || false;
  }
}