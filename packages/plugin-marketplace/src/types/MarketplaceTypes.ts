import { z } from 'zod';
import { PluginManifest } from '@free-cluely/shared';

// Marketplace Plugin Types
export const MarketplacePluginSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
  }),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  price: z.object({
    amount: z.number().min(0),
    currency: z.string().default('USD'),
    trialDays: z.number().optional(),
    subscription: z.boolean().default(false),
  }).default({ amount: 0, currency: 'USD' }),
  rating: z.object({
    average: z.number().min(0).max(5).default(0),
    count: z.number().min(0).default(0),
    distribution: z.record(z.number()).default({}),
  }).default({}),
  downloads: z.object({
    total: z.number().min(0).default(0),
    monthly: z.number().min(0).default(0),
    weekly: z.number().min(0).default(0),
  }).default({}),
  manifest: PluginManifestSchema,
  screenshots: z.array(z.object({
    url: z.string(),
    alt: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
  })).default([]),
  repository: z.object({
    url: z.string(),
    type: z.enum(['git', 'npm', 'github', 'gitlab']).default('git'),
    branch: z.string().default('main'),
  }).optional(),
  documentation: z.object({
    url: z.string(),
    readme: z.string().optional(),
    changelog: z.string().optional(),
  }).optional(),
  security: z.object({
    verified: z.boolean().default(false),
    scanResults: z.object({
      vulnerabilities: z.array(z.object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        description: z.string(),
        cve: z.string().optional(),
      })).default([]),
      lastScanned: z.date().optional(),
      score: z.number().min(0).max(100).optional(),
    }).optional(),
    permissions: z.array(z.string()).default([]),
  }).default({}),
  compatibility: z.object({
    os: z.array(z.enum(['windows', 'macos', 'linux'])).default(['windows', 'macos', 'linux']),
    arch: z.array(z.enum(['x64', 'arm64'])).default(['x64', 'arm64']),
    minVersion: z.string().default('1.0.0'),
    maxVersion: z.string().optional(),
  }).default({}),
  features: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  dependencies: z.record(z.string()).optional(),
  publishedAt: z.date(),
  updatedAt: z.date(),
  isFeatured: z.boolean().default(false),
  isOfficial: z.boolean().default(false),
  status: z.enum(['published', 'draft', 'archived', 'rejected']).default('published'),
});

export type MarketplacePlugin = z.infer<typeof MarketplacePluginSchema>;

// Marketplace Query Types
export const MarketplaceQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  price: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    freeOnly: z.boolean().default(false),
    paidOnly: z.boolean().default(false),
  }).optional(),
  rating: z.object({
    min: z.number().min(0).max(5).optional(),
    sort: z.enum(['rating', 'downloads', 'updated', 'published']).default('updated'),
  }).optional(),
  compatibility: z.object({
    os: z.array(z.enum(['windows', 'macos', 'linux'])).optional(),
    arch: z.array(z.enum(['x64', 'arm64'])).optional(),
  }).optional(),
  featured: z.boolean().optional(),
  official: z.boolean().optional(),
  verified: z.boolean().optional(),
  sort: z.enum(['name', 'rating', 'downloads', 'updated', 'published']).default('updated'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

export type MarketplaceQuery = z.infer<typeof MarketplaceQuerySchema>;

// Marketplace Response Types
export const MarketplaceResponseSchema = z.object({
  plugins: z.array(MarketplacePluginSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
  categories: z.array(z.object({
    name: z.string(),
    count: z.number(),
  })).default([]),
  tags: z.array(z.object({
    name: z.string(),
    count: z.number(),
  })).default([]),
});

export type MarketplaceResponse = z.infer<typeof MarketplaceResponseSchema>;

// Installation Types
export const InstallationRequestSchema = z.object({
  pluginId: z.string(),
  version: z.string().optional(),
  source: z.enum(['marketplace', 'url', 'local']).default('marketplace'),
  url: z.string().optional(),
  localPath: z.string().optional(),
});

export type InstallationRequest = z.infer<typeof InstallationRequestSchema>;

export const InstallationStatusSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  status: z.enum(['pending', 'downloading', 'installing', 'verifying', 'completed', 'failed']),
  progress: z.number().min(0).max(100).default(0),
  error: z.string().optional(),
  installedAt: z.date().optional(),
  plugin: MarketplacePluginSchema.optional(),
});

export type InstallationStatus = z.infer<typeof InstallationStatusSchema>;

// Plugin Review Types
export const PluginReviewSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  userId: z.string(),
  userName: z.string(),
  rating: z.number().min(1).max(5),
  title: z.string(),
  content: z.string(),
  helpful: z.number().default(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  verified: z.boolean().default(false),
  reply: z.object({
    content: z.string(),
    author: z.string(),
    createdAt: z.date(),
  }).optional(),
});

export type PluginReview = z.infer<typeof PluginReviewSchema>;

// Marketplace Statistics Types
export const MarketplaceStatsSchema = z.object({
  totalPlugins: z.number(),
  totalDownloads: z.number(),
  totalReviews: z.number(),
  averageRating: z.number(),
  categories: z.record(z.object({
    count: z.number(),
    downloads: z.number(),
    rating: z.number(),
  })),
  trending: z.array(z.object({
    pluginId: z.string(),
    name: z.string(),
    downloads: z.number(),
    growth: z.number(),
  })),
  topRated: z.array(z.object({
    pluginId: z.string(),
    name: z.string(),
    rating: z.number(),
    reviewCount: z.number(),
  })),
});

export type MarketplaceStats = z.infer<typeof MarketplaceStatsSchema>;

// Security Scan Types
export const SecurityScanSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  scanDate: z.date(),
  status: z.enum(['pending', 'scanning', 'completed', 'failed']),
  score: z.number().min(0).max(100).optional(),
  vulnerabilities: z.array(z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    cve: z.string().optional(),
    file: z.string(),
    line: z.number().optional(),
    remediation: z.string().optional(),
  })).default([]),
  dependencies: z.array(z.object({
    name: z.string(),
    version: z.string(),
    vulnerabilities: z.array(z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      description: z.string(),
      cve: z.string().optional(),
    })).default([]),
  })).default([]),
  recommendations: z.array(z.string()).default([]),
});

export type SecurityScan = z.infer<typeof SecurityScanSchema>;

// Monetization Types
export const MonetizationConfigSchema = z.object({
  stripe: z.object({
    publishableKey: z.string(),
    secretKey: z.string(),
    webhookSecret: z.string(),
  }).optional(),
  paypal: z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    sandbox: z.boolean().default(true),
  }).optional(),
  commissions: z.object({
    platformFee: z.number().min(0).max(100).default(30),
    paymentProcessorFee: z.number().min(0).max(100).default(2.9),
    fixedFee: z.number().default(0.30),
  }).default({}),
  payouts: z.object({
    minimumAmount: z.number().default(50),
    schedule: z.enum(['weekly', 'biweekly', 'monthly']).default('monthly'),
    currency: z.string().default('USD'),
  }).default({}),
});

export type MonetizationConfig = z.infer<typeof MonetizationConfigSchema>;

// Marketplace Configuration Types
export const MarketplaceConfigSchema = z.object({
  api: z.object({
    baseUrl: z.string(),
    timeout: z.number().default(30000),
    retries: z.number().default(3),
  }).default({}),
  cache: z.object({
    enabled: z.boolean().default(true),
    ttl: z.number().default(3600000), // 1 hour
    maxSize: z.number().default(1000),
  }).default({}),
  security: z.object({
    enableScanning: z.boolean().default(true),
    requireVerification: z.boolean().default(true),
    sandbox: z.boolean().default(true),
  }).default({}),
  monetization: MonetizationConfigSchema.optional(),
  features: z.object({
    reviews: z.boolean().default(true),
    ratings: z.boolean().default(true),
    featured: z.boolean().default(true),
    categories: z.boolean().default(true),
    search: z.boolean().default(true),
    statistics: z.boolean().default(true),
  }).default({}),
});

export type MarketplaceConfig = z.infer<typeof MarketplaceConfigSchema>;

// User Types
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  purchasedPlugins: z.array(z.object({
    pluginId: z.string(),
    purchasedAt: z.date(),
    expiresAt: z.date().optional(),
    transactionId: z.string(),
  })).default([]),
  installedPlugins: z.array(z.object({
    pluginId: z.string(),
    version: z.string(),
    installedAt: z.date(),
    source: z.enum(['marketplace', 'url', 'local']),
  })).default([]),
  reviews: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Transaction Types
export const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  pluginId: z.string(),
  pluginVersion: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  paymentMethod: z.enum(['stripe', 'paypal']),
  paymentIntentId: z.string(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  refundedAt: z.date().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Error Types
export class MarketplaceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

export class InstallationError extends MarketplaceError {
  constructor(message: string, public pluginId: string, cause?: Error) {
    super(message, 'INSTALLATION_ERROR', cause);
    this.name = 'InstallationError';
  }
}

export class SecurityError extends MarketplaceError {
  constructor(message: string, public pluginId: string) {
    super(message, 'SECURITY_ERROR');
    this.name = 'SecurityError';
  }
}

export class PaymentError extends MarketplaceError {
  constructor(message: string, public transactionId: string, cause?: Error) {
    super(message, 'PAYMENT_ERROR', cause);
    this.name = 'PaymentError';
  }
}