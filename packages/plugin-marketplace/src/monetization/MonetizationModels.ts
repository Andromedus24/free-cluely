import { z } from 'zod';

export enum PricingModel {
  FREE = 'free',
  PAID = 'paid',
  FREEMIUM = 'freemium',
  SUBSCRIPTION = 'subscription',
  USAGE_BASED = 'usage-based',
  TIERED = 'tiered',
  PAY_WHAT_YOU_WANT = 'pay-what-you-want',
  TRIAL = 'trial'
}

export enum BillingCycle {
  ONETIME = 'onetime',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  QUARTERLY = 'quarterly'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CAD = 'CAD',
  AUD = 'AUD'
}

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: Currency;
  billingCycle: BillingCycle;
  features: string[];
  limits?: Record<string, number>;
  metadata?: Record<string, any>;
  isPopular?: boolean;
  sortOrder: number;
}

export interface UsageBasedPricing {
  unit: string;
  basePrice: number;
  currency: Currency;
  tiers: UsageTier[];
  includedUnits?: number;
  freeTier?: UsageTier;
}

export interface UsageTier {
  minUnits: number;
  maxUnits?: number;
  pricePerUnit: number;
  currency: Currency;
}

export interface FreemiumModel {
  freeFeatures: string[];
  paidFeatures: string[];
  upgradePrompt?: string;
  trialDays?: number;
}

export interface PayWhatYouWantModel {
  suggestedPrice: number;
  currency: Currency;
  minimumPrice?: number;
  maximumPrice?: number;
}

export interface TrialModel {
  duration: number; // in days
  features: string[];
  limits?: Record<string, number>;
  autoConvertTo?: PricingModel;
  conversionPrice?: number;
}

export interface PluginPricing {
  model: PricingModel;
  tiers?: PricingTier[];
  usageBased?: UsageBasedPricing;
  freemium?: FreemiumModel;
  payWhatYouWant?: PayWhatYouWantModel;
  trial?: TrialModel;
  currency: Currency;
  taxIncluded: boolean;
  refundPolicy?: {
    days: number;
    conditions: string[];
  };
}

export interface LicenseModel {
  type: 'perpetual' | 'subscription' | 'usage' | 'trial';
  duration?: number; // in days for subscription/trial
  maxActivations?: number;
  maxUsers?: number;
  allowedFeatures?: string[];
  restrictions?: string[];
  transferable?: boolean;
  commercialUse?: boolean;
  redistribution?: boolean;
}

export interface DiscountModel {
  id: string;
  name: string;
  type: 'percentage' | 'fixed' | 'free_trial';
  value: number;
  currency?: Currency;
  validFrom: Date;
  validUntil?: Date;
  maxUses?: number;
  usedCount?: number;
  conditions?: string[];
  applicableTiers?: string[];
  autoApply?: boolean;
}

export interface BundleModel {
  id: string;
  name: string;
  description: string;
  plugins: string[];
  totalPrice: number;
  discountedPrice: number;
  currency: Currency;
  savings: number;
  features: string[];
  limitedTime?: boolean;
  expiresAt?: Date;
}

// Schemas
export const PricingTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().min(0),
  currency: z.nativeEnum(Currency),
  billingCycle: z.nativeEnum(BillingCycle),
  features: z.array(z.string()),
  limits: z.record(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
  isPopular: z.boolean().optional(),
  sortOrder: z.number()
});

export const UsageBasedPricingSchema = z.object({
  unit: z.string(),
  basePrice: z.number().min(0),
  currency: z.nativeEnum(Currency),
  tiers: z.array(z.object({
    minUnits: z.number().min(0),
    maxUnits: z.number().min(0).optional(),
    pricePerUnit: z.number().min(0),
    currency: z.nativeEnum(Currency)
  })),
  includedUnits: z.number().min(0).optional(),
  freeTier: z.object({
    minUnits: z.number().min(0),
    maxUnits: z.number().min(0).optional(),
    pricePerUnit: z.literal(0),
    currency: z.nativeEnum(Currency)
  }).optional()
});

export const FreemiumModelSchema = z.object({
  freeFeatures: z.array(z.string()),
  paidFeatures: z.array(z.string()),
  upgradePrompt: z.string().optional(),
  trialDays: z.number().min(0).optional()
});

export const PayWhatYouWantModelSchema = z.object({
  suggestedPrice: z.number().min(0),
  currency: z.nativeEnum(Currency),
  minimumPrice: z.number().min(0).optional(),
  maximumPrice: z.number().min(0).optional()
});

export const TrialModelSchema = z.object({
  duration: z.number().min(0),
  features: z.array(z.string()),
  limits: z.record(z.number()).optional(),
  autoConvertTo: z.nativeEnum(PricingModel).optional(),
  conversionPrice: z.number().min(0).optional()
});

export const PluginPricingSchema = z.object({
  model: z.nativeEnum(PricingModel),
  tiers: z.array(PricingTierSchema).optional(),
  usageBased: UsageBasedPricingSchema.optional(),
  freemium: FreemiumModelSchema.optional(),
  payWhatYouWant: PayWhatYouWantModelSchema.optional(),
  trial: TrialModelSchema.optional(),
  currency: z.nativeEnum(Currency),
  taxIncluded: z.boolean(),
  refundPolicy: z.object({
    days: z.number().min(0),
    conditions: z.array(z.string())
  }).optional()
});

export const LicenseModelSchema = z.object({
  type: z.enum(['perpetual', 'subscription', 'usage', 'trial']),
  duration: z.number().min(0).optional(),
  maxActivations: z.number().min(0).optional(),
  maxUsers: z.number().min(0).optional(),
  allowedFeatures: z.array(z.string()).optional(),
  restrictions: z.array(z.string()).optional(),
  transferable: z.boolean().optional(),
  commercialUse: z.boolean().optional(),
  redistribution: z.boolean().optional()
});

export const DiscountModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['percentage', 'fixed', 'free_trial']),
  value: z.number(),
  currency: z.nativeEnum(Currency).optional(),
  validFrom: z.date(),
  validUntil: z.date().optional(),
  maxUses: z.number().min(0).optional(),
  usedCount: z.number().min(0).optional(),
  conditions: z.array(z.string()).optional(),
  applicableTiers: z.array(z.string()).optional(),
  autoApply: z.boolean().optional()
});

export const BundleModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  plugins: z.array(z.string()),
  totalPrice: z.number().min(0),
  discountedPrice: z.number().min(0),
  currency: z.nativeEnum(Currency),
  savings: z.number(),
  features: z.array(z.string()),
  limitedTime: z.boolean().optional(),
  expiresAt: z.date().optional()
});

// Type exports
export type PricingTierType = z.infer<typeof PricingTierSchema>;
export type UsageBasedPricingType = z.infer<typeof UsageBasedPricingSchema>;
export type FreemiumModelType = z.infer<typeof FreemiumModelSchema>;
export type PayWhatYouWantModelType = z.infer<typeof PayWhatYouWantModelSchema>;
export type TrialModelType = z.infer<typeof TrialModelSchema>;
export type PluginPricingType = z.infer<typeof PluginPricingSchema>;
export type LicenseModelType = z.infer<typeof LicenseModelSchema>;
export type DiscountModelType = z.infer<typeof DiscountModelSchema>;
export type BundleModelType = z.infer<typeof BundleModelSchema>;

// Pricing Calculator
export class PricingCalculator {
  static calculateUsageBasedPrice(
    usage: number,
    pricing: UsageBasedPricing,
    currency: Currency = pricing.currency
  ): number {
    let totalCost = 0;
    let remainingUnits = usage;

    // Apply included units
    if (pricing.includedUnits) {
      remainingUnits = Math.max(0, remainingUnits - pricing.includedUnits);
    }

    // Apply free tier
    if (pricing.freeTier && remainingUnits > 0) {
      const freeUnits = Math.min(remainingUnits, (pricing.freeTier.maxUnits || Infinity) - pricing.freeTier.minUnits);
      remainingUnits = Math.max(0, remainingUnits - freeUnits);
    }

    // Calculate cost for paid tiers
    for (const tier of pricing.tiers) {
      if (remainingUnits <= 0) break;

      const tierUnits = Math.min(
        remainingUnits,
        (tier.maxUnits || Infinity) - tier.minUnits
      );

      if (tierUnits > 0) {
        totalCost += tierUnits * tier.pricePerUnit;
        remainingUnits -= tierUnits;
      }
    }

    // Add base price
    totalCost += pricing.basePrice;

    // Currency conversion (simplified)
    if (currency !== pricing.currency) {
      totalCost = this.convertCurrency(totalCost, pricing.currency, currency);
    }

    return Math.round(totalCost * 100) / 100;
  }

  static calculateSubscriptionPrice(
    tier: PricingTier,
    billingCycle: BillingCycle,
    months: number = 1
  ): number {
    let monthlyPrice = tier.price;

    // Convert to monthly price
    switch (tier.billingCycle) {
      case BillingCycle.YEARLY:
        monthlyPrice = tier.price / 12;
        break;
      case BillingCycle.QUARTERLY:
        monthlyPrice = tier.price / 3;
        break;
    }

    // Calculate for requested duration
    return monthlyPrice * months;
  }

  static applyDiscount(
    price: number,
    discount: DiscountModel,
    currency: Currency
  ): number {
    if (discount.currency && discount.currency !== currency) {
      // Convert discount to target currency
      return price;
    }

    let discountedPrice = price;

    switch (discount.type) {
      case 'percentage':
        discountedPrice = price * (1 - discount.value / 100);
        break;
      case 'fixed':
        discountedPrice = Math.max(0, price - discount.value);
        break;
      case 'free_trial':
        discountedPrice = 0;
        break;
    }

    return Math.round(discountedPrice * 100) / 100;
  }

  static calculateBundleSavings(bundle: BundleModel): number {
    const individualTotal = bundle.totalPrice;
    const bundlePrice = bundle.discountedPrice;
    return individualTotal - bundlePrice;
  }

  static validatePricing(pricing: PluginPricing): string[] {
    const errors: string[] = [];

    // Validate pricing model configuration
    switch (pricing.model) {
      case PricingModel.FREE:
        if (pricing.tiers?.length) {
          errors.push('Free plugins cannot have pricing tiers');
        }
        break;

      case PricingModel.PAID:
        if (!pricing.tiers?.length) {
          errors.push('Paid plugins must have at least one pricing tier');
        }
        break;

      case PricingModel.SUBSCRIPTION:
        if (!pricing.tiers?.length) {
          errors.push('Subscription plugins must have at least one pricing tier');
        }
        if (pricing.tiers?.some(tier => tier.billingCycle === BillingCycle.ONETIME)) {
          errors.push('Subscription plugins cannot have one-time billing tiers');
        }
        break;

      case PricingModel.USAGE_BASED:
        if (!pricing.usageBased) {
          errors.push('Usage-based plugins must define usage-based pricing');
        }
        break;

      case PricingModel.FREEMIUM:
        if (!pricing.freemium) {
          errors.push('Freemium plugins must define freemium features');
        }
        break;

      case PricingModel.PAY_WHAT_YOU_WANT:
        if (!pricing.payWhatYouWant) {
          errors.push('Pay-what-you-want plugins must define pricing model');
        }
        break;
    }

    // Validate currency consistency
    if (pricing.tiers?.length) {
      const tierCurrencies = pricing.tiers.map(tier => tier.currency);
      if (tierCurrencies.some(currency => currency !== pricing.currency)) {
        errors.push('All pricing tiers must use the same currency as the plugin');
      }
    }

    return errors;
  }

  private static convertCurrency(amount: number, from: Currency, to: Currency): number {
    // Simplified currency conversion
    // In a real implementation, this would use live exchange rates
    const exchangeRates: Record<Currency, number> = {
      [Currency.USD]: 1.0,
      [Currency.EUR]: 0.85,
      [Currency.GBP]: 0.73,
      [Currency.JPY]: 110.0,
      [Currency.CAD]: 1.25,
      [Currency.AUD]: 1.35
    };

    const fromRate = exchangeRates[from] || 1.0;
    const toRate = exchangeRates[to] || 1.0;

    return (amount / fromRate) * toRate;
  }
}