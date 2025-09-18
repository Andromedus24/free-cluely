import { z } from 'zod';
import * as crypto from 'crypto';
import { Subscription, SubscriptionStatus } from './SubscriptionManager';
import { PaymentProvider } from './PaymentProcessing';

export enum LicenseType {
  PERPETUAL = 'perpetual',
  SUBSCRIPTION = 'subscription',
  TRIAL = 'trial',
  VOLUME = 'volume',
  ENTERPRISE = 'enterprise',
  EDUCATIONAL = 'educational',
  NON_PROFIT = 'non-profit'
}

export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  PENDING = 'pending',
  INACTIVE = 'inactive'
}

export enum LicenseValidationResult {
  VALID = 'valid',
  INVALID = 'invalid',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  REVOKED = 'revoked',
  MACHINE_LIMIT_EXCEEDED = 'machine_limit_exceeded',
  USER_LIMIT_EXCEEDED = 'user_limit_exceeded',
  USAGE_LIMIT_EXCEEDED = 'usage_limit_exceeded',
  OFFLINE_VALIDATION_FAILED = 'offline_validation_failed',
  NETWORK_ERROR = 'network_error'
}

export interface LicenseKey {
  id: string;
  key: string;
  type: LicenseType;
  status: LicenseStatus;
  pluginId: string;
  userId?: string;
  subscriptionId?: string;
  metadata: Record<string, any>;
  restrictions: LicenseRestrictions;
  createdAt: Date;
  expiresAt?: Date;
  updatedAt: Date;
  revokedAt?: Date;
  suspendedAt?: Date;
}

export interface LicenseRestrictions {
  maxActivations?: number;
  maxUsers?: number;
  maxMachines?: number;
  allowedFeatures?: string[];
  restrictedFeatures?: string[];
  allowedEnvironments?: ('development' | 'staging' | 'production')[];
  geographicalRestrictions?: string[];
  ipRestrictions?: string[];
  domainRestrictions?: string[];
  timeRestrictions?: {
    allowedHours?: [number, number]; // [startHour, endHour]
    allowedDays?: number[]; // 0-6 (Sunday-Saturday)
    timezone?: string;
  };
  usageRestrictions?: {
    maxApiCalls?: number;
    maxStorage?: number; // in MB
    maxBandwidth?: number; // in GB
    period: 'daily' | 'weekly' | 'monthly';
  };
  customRestrictions?: Record<string, any>;
}

export interface LicenseActivation {
  id: string;
  licenseKeyId: string;
  machineId: string;
  userId?: string;
  activationToken: string;
  status: LicenseStatus;
  activatedAt: Date;
  expiresAt?: Date;
  lastValidatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  metadata?: Record<string, any>;
}

export interface LicenseValidation {
  id: string;
  licenseKeyId: string;
  activationId?: string;
  machineId: string;
  result: LicenseValidationResult;
  validatedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface LicenseUsage {
  id: string;
  licenseKeyId: string;
  activationId: string;
  metric: string;
  value: number;
  timestamp: Date;
  period: string; // YYYY-MM-DD
}

export interface LicenseOfflineLease {
  id: string;
  licenseKeyId: string;
  activationId: string;
  machineId: string;
  leaseToken: string;
  grantedAt: Date;
  expiresAt: Date;
  maxOfflineDays: number;
  usageData: Record<string, number>;
}

export interface LicenseCertificate {
  id: string;
  licenseKeyId: string;
  serialNumber: string;
  issuedAt: Date;
  expiresAt?: Date;
  issuedTo: {
    name: string;
    email: string;
    organization?: string;
  };
  issuer: {
    name: string;
    email: string;
    organization: string;
  };
  terms: string[];
  restrictions: LicenseRestrictions;
  signature: string;
  publicKey: string;
}

// Schemas
export const LicenseKeySchema = z.object({
  id: z.string(),
  key: z.string(),
  type: z.nativeEnum(LicenseType),
  status: z.nativeEnum(LicenseStatus),
  pluginId: z.string(),
  userId: z.string().optional(),
  subscriptionId: z.string().optional(),
  metadata: z.record(z.any()),
  restrictions: z.object({
    maxActivations: z.number().min(1).optional(),
    maxUsers: z.number().min(1).optional(),
    maxMachines: z.number().min(1).optional(),
    allowedFeatures: z.array(z.string()).optional(),
    restrictedFeatures: z.array(z.string()).optional(),
    allowedEnvironments: z.array(z.enum(['development', 'staging', 'production'])).optional(),
    geographicalRestrictions: z.array(z.string()).optional(),
    ipRestrictions: z.array(z.string()).optional(),
    domainRestrictions: z.array(z.string()).optional(),
    timeRestrictions: z.object({
      allowedHours: z.tuple([z.number().min(0).max(23), z.number().min(0).max(23)]).optional(),
      allowedDays: z.array(z.number().min(0).max(6)).optional(),
      timezone: z.string().optional()
    }).optional(),
    usageRestrictions: z.object({
      maxApiCalls: z.number().min(0).optional(),
      maxStorage: z.number().min(0).optional(),
      maxBandwidth: z.number().min(0).optional(),
      period: z.enum(['daily', 'weekly', 'monthly'])
    }).optional(),
    customRestrictions: z.record(z.any()).optional()
  }),
  createdAt: z.date(),
  expiresAt: z.date().optional(),
  updatedAt: z.date(),
  revokedAt: z.date().optional(),
  suspendedAt: z.date().optional()
});

export const LicenseActivationSchema = z.object({
  id: z.string(),
  licenseKeyId: z.string(),
  machineId: z.string(),
  userId: z.string().optional(),
  activationToken: z.string(),
  status: z.nativeEnum(LicenseStatus),
  activatedAt: z.date(),
  expiresAt: z.date().optional(),
  lastValidatedAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  location: z.object({
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional()
  }).optional(),
  metadata: z.record(z.any()).optional()
});

export const LicenseValidationSchema = z.object({
  id: z.string(),
  licenseKeyId: z.string(),
  activationId: z.string().optional(),
  machineId: z.string(),
  result: z.nativeEnum(LicenseValidationResult),
  validatedAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const LicenseUsageSchema = z.object({
  id: z.string(),
  licenseKeyId: z.string(),
  activationId: z.string(),
  metric: string(),
  value: z.number(),
  timestamp: z.date(),
  period: z.string()
});

export const LicenseOfflineLeaseSchema = z.object({
  id: z.string(),
  licenseKeyId: z.string(),
  activationId: z.string(),
  machineId: z.string(),
  leaseToken: z.string(),
  grantedAt: z.date(),
  expiresAt: z.date(),
  maxOfflineDays: z.number().min(1),
  usageData: z.record(z.number())
});

export const LicenseCertificateSchema = z.object({
  id: z.string(),
  licenseKeyId: z.string(),
  serialNumber: z.string(),
  issuedAt: z.date(),
  expiresAt: z.date().optional(),
  issuedTo: z.object({
    name: z.string(),
    email: z.string().email(),
    organization: z.string().optional()
  }),
  issuer: z.object({
    name: z.string(),
    email: z.string().email(),
    organization: z.string()
  }),
  terms: z.array(z.string()),
  restrictions: LicenseKeySchema.shape.restrictions,
  signature: z.string(),
  publicKey: z.string()
});

// Type exports
export type LicenseKeyType = z.infer<typeof LicenseKeySchema>;
export type LicenseActivationType = z.infer<typeof LicenseActivationSchema>;
export type LicenseValidationType = z.infer<typeof LicenseValidationSchema>;
export type LicenseUsageType = z.infer<typeof LicenseUsageSchema>;
export type LicenseOfflineLeaseType = z.infer<typeof LicenseOfflineLeaseSchema>;
export type LicenseCertificateType = z.infer<typeof LicenseCertificateSchema>;

// License Validation Service
export class LicenseValidator {
  private licenseKeys: Map<string, LicenseKey> = new Map();
  private activations: Map<string, LicenseActivation> = new Map();
  private validations: Map<string, LicenseValidation> = new Map();
  private usage: Map<string, LicenseUsage[]> = new Map();
  private offlineLeases: Map<string, LicenseOfflineLease> = new Map();
  private certificates: Map<string, LicenseCertificate> = new Map();

  constructor() {
    this.initializeSecurityKeys();
    this.startPeriodicTasks();
  }

  private initializeSecurityKeys(): void {
    // Initialize cryptographic keys for license signing and validation
    // In production, these would be securely stored and managed
  }

  private startPeriodicTasks(): void {
    // Start background tasks for license management
    this.startExpirationChecker();
    this.startUsageAggregator();
    this.startCleanupTask();
  }

  async generateLicenseKey(
    pluginId: string,
    type: LicenseType,
    restrictions: LicenseRestrictions,
    options?: {
      userId?: string;
      subscriptionId?: string;
      expiresAt?: Date;
      metadata?: Record<string, any>;
    }
  ): Promise<LicenseKey> {
    const licenseKeyId = `lic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rawKey = this.generateRawLicenseKey();
    const encryptedKey = this.encryptLicenseKey(rawKey, restrictions);

    const licenseKey: LicenseKey = {
      id: licenseKeyId,
      key: encryptedKey,
      type,
      status: LicenseStatus.PENDING,
      pluginId,
      userId: options?.userId,
      subscriptionId: options?.subscriptionId,
      metadata: options?.metadata || {},
      restrictions,
      createdAt: new Date(),
      expiresAt: options?.expiresAt,
      updatedAt: new Date()
    };

    this.licenseKeys.set(licenseKeyId, licenseKey);
    return licenseKey;
  }

  async activateLicense(
    licenseKey: string,
    machineId: string,
    options?: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      location?: {
        country?: string;
        region?: string;
        city?: string;
      };
      metadata?: Record<string, any>;
    }
  ): Promise<LicenseActivation> {
    // Find license key by encrypted key
    const licenseKeyObj = Array.from(this.licenseKeys.values()).find(lic => lic.key === licenseKey);
    if (!licenseKeyObj) {
      throw new Error('Invalid license key');
    }

    // Check if license is valid
    const validationResult = await this.validateLicenseKey(licenseKeyObj);
    if (validationResult !== LicenseValidationResult.VALID) {
      throw new Error(`License validation failed: ${validationResult}`);
    }

    // Check activation limits
    const existingActivations = Array.from(this.activations.values())
      .filter(act => act.licenseKeyId === licenseKeyObj.id && act.status === LicenseStatus.ACTIVE);

    if (licenseKeyObj.restrictions.maxActivations &&
        existingActivations.length >= licenseKeyObj.restrictions.maxActivations) {
      throw new Error('Maximum number of activations exceeded');
    }

    // Check machine limits
    if (licenseKeyObj.restrictions.maxMachines) {
      const uniqueMachines = new Set(existingActivations.map(act => act.machineId));
      if (uniqueMachines.size >= licenseKeyObj.restrictions.maxMachines) {
        throw new Error('Maximum number of machines exceeded');
      }
    }

    // Create activation
    const activationId = `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const activationToken = this.generateActivationToken();

    const activation: LicenseActivation = {
      id: activationId,
      licenseKeyId: licenseKeyObj.id,
      machineId,
      userId: options?.userId,
      activationToken,
      status: LicenseStatus.ACTIVE,
      activatedAt: new Date(),
      expiresAt: licenseKeyObj.expiresAt,
      lastValidatedAt: new Date(),
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      location: options?.location,
      metadata: options?.metadata
    };

    this.activations.set(activationId, activation);

    // Update license status
    licenseKeyObj.status = LicenseStatus.ACTIVE;
    licenseKeyObj.updatedAt = new Date();
    this.licenseKeys.set(licenseKeyObj.id, licenseKeyObj);

    return activation;
  }

  async validateLicense(licenseKey: string, machineId: string, activationToken?: string): Promise<LicenseValidationResult> {
    try {
      // Find license key
      const licenseKeyObj = Array.from(this.licenseKeys.values()).find(lic => lic.key === licenseKey);
      if (!licenseKeyObj) {
        return LicenseValidationResult.INVALID;
      }

      // Check activation
      let activation: LicenseActivation | undefined;
      if (activationToken) {
        activation = Array.from(this.activations.values()).find(act =>
          act.licenseKeyId === licenseKeyObj.id &&
          act.activationToken === activationToken &&
          act.machineId === machineId
        );
      } else {
        activation = Array.from(this.activations.values()).find(act =>
          act.licenseKeyId === licenseKeyObj.id &&
          act.machineId === machineId &&
          act.status === LicenseStatus.ACTIVE
        );
      }

      if (!activation) {
        return LicenseValidationResult.INVALID;
      }

      // Perform comprehensive validation
      const result = await this.validateLicenseKey(licenseKeyObj, activation, machineId);

      // Record validation
      await this.recordValidation({
        id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        licenseKeyId: licenseKeyObj.id,
        activationId: activation.id,
        machineId,
        result,
        validatedAt: new Date()
      });

      // Update activation
      activation.lastValidatedAt = new Date();
      this.activations.set(activation.id, activation);

      return result;
    } catch (error) {
      return LicenseValidationResult.NETWORK_ERROR;
    }
  }

  async deactivateLicense(licenseKey: string, machineId: string): Promise<void> {
    const licenseKeyObj = Array.from(this.licenseKeys.values()).find(lic => lic.key === licenseKey);
    if (!licenseKeyObj) {
      throw new Error('Invalid license key');
    }

    const activation = Array.from(this.activations.values()).find(act =>
      act.licenseKeyId === licenseKeyObj.id &&
      act.machineId === machineId &&
      act.status === LicenseStatus.ACTIVE
    );

    if (!activation) {
      throw new Error('No active activation found for this machine');
    }

    activation.status = LicenseStatus.INACTIVE;
    activation.expiresAt = new Date();
    this.activations.set(activation.id, activation);
  }

  async revokeLicense(licenseKeyId: string, reason: string): Promise<void> {
    const licenseKey = this.licenseKeys.get(licenseKeyId);
    if (!licenseKey) {
      throw new Error('License key not found');
    }

    licenseKey.status = LicenseStatus.REVOKED;
    licenseKey.revokedAt = new Date();
    licenseKey.updatedAt = new Date();
    this.licenseKeys.set(licenseKeyId, licenseKey);

    // Deactivate all associated activations
    const activations = Array.from(this.activations.values())
      .filter(act => act.licenseKeyId === licenseKeyId && act.status === LicenseStatus.ACTIVE);

    for (const activation of activations) {
      activation.status = LicenseStatus.REVOKED;
      activation.expiresAt = new Date();
      this.activations.set(activation.id, activation);
    }
  }

  async suspendLicense(licenseKeyId: string, reason: string): Promise<void> {
    const licenseKey = this.licenseKeys.get(licenseKeyId);
    if (!licenseKey) {
      throw new Error('License key not found');
    }

    licenseKey.status = LicenseStatus.SUSPENDED;
    licenseKey.suspendedAt = new Date();
    licenseKey.updatedAt = new Date();
    this.licenseKeys.set(licenseKeyId, licenseKey);

    // Suspend all associated activations
    const activations = Array.from(this.activations.values())
      .filter(act => act.licenseKeyId === licenseKeyId && act.status === LicenseStatus.ACTIVE);

    for (const activation of activations) {
      activation.status = LicenseStatus.SUSPENDED;
      this.activations.set(activation.id, activation);
    }
  }

  async requestOfflineLease(licenseKey: string, machineId: string, maxOfflineDays: number = 30): Promise<LicenseOfflineLease> {
    // Validate license first
    const validationResult = await this.validateLicense(licenseKey, machineId);
    if (validationResult !== LicenseValidationResult.VALID) {
      throw new Error(`Cannot grant offline lease: ${validationResult}`);
    }

    // Find activation
    const activation = Array.from(this.activations.values()).find(act =>
      act.machineId === machineId && act.status === LicenseStatus.ACTIVE
    );

    if (!activation) {
      throw new Error('No active activation found');
    }

    // Check existing lease
    const existingLease = Array.from(this.offlineLeases.values()).find(lease =>
      lease.activationId === activation.id &&
      lease.expiresAt > new Date()
    );

    if (existingLease) {
      return existingLease;
    }

    // Create new lease
    const leaseId = `lease_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const leaseToken = this.generateLeaseToken();

    const lease: LicenseOfflineLease = {
      id: leaseId,
      licenseKeyId: activation.licenseKeyId,
      activationId: activation.id,
      machineId,
      leaseToken,
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + maxOfflineDays * 24 * 60 * 60 * 1000),
      maxOfflineDays,
      usageData: {}
    };

    this.offlineLeases.set(leaseId, lease);
    return lease;
  }

  async validateOfflineLease(leaseToken: string, machineId: string): Promise<LicenseValidationResult> {
    const lease = Array.from(this.offlineLeases.values()).find(l =>
      l.leaseToken === leaseToken && l.machineId === machineId
    );

    if (!lease) {
      return LicenseValidationResult.INVALID;
    }

    if (lease.expiresAt < new Date()) {
      return LicenseValidationResult.EXPIRED;
    }

    // Additional offline validation checks
    const licenseKey = this.licenseKeys.get(lease.licenseKeyId);
    if (!licenseKey || licenseKey.status !== LicenseStatus.ACTIVE) {
      return LicenseValidationResult.INVALID;
    }

    return LicenseValidationResult.VALID;
  }

  async recordUsage(licenseKey: string, machineId: string, metric: string, value: number): Promise<void> {
    const licenseKeyObj = Array.from(this.licenseKeys.values()).find(lic => lic.key === licenseKey);
    if (!licenseKeyObj) {
      throw new Error('Invalid license key');
    }

    const activation = Array.from(this.activations.values()).find(act =>
      act.licenseKeyId === licenseKeyObj.id &&
      act.machineId === machineId &&
      act.status === LicenseStatus.ACTIVE
    );

    if (!activation) {
      throw new Error('No active activation found');
    }

    const period = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
    let usageList = this.usage.get(activation.id) || [];

    const usage: LicenseUsage = {
      id: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      licenseKeyId: licenseKeyObj.id,
      activationId: activation.id,
      metric,
      value,
      timestamp: new Date(),
      period
    };

    usageList.push(usage);
    this.usage.set(activation.id, usageList);

    // Check usage restrictions
    await this.checkUsageRestrictions(licenseKeyObj, activation, metric, value);
  }

  async getLicenseInfo(licenseKey: string): Promise<LicenseKey | null> {
    const licenseKeyObj = Array.from(this.licenseKeys.values()).find(lic => lic.key === licenseKey);
    return licenseKeyObj || null;
  }

  async getActivations(licenseKeyId: string): Promise<LicenseActivation[]> {
    return Array.from(this.activations.values()).filter(act => act.licenseKeyId === licenseKeyId);
  }

  async getUsageHistory(activationId: string, days: number = 30): Promise<LicenseUsage[]> {
    const usageList = this.usage.get(activationId) || [];
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return usageList.filter(usage => usage.timestamp >= cutoffDate);
  }

  private async validateLicenseKey(
    licenseKey: LicenseKey,
    activation?: LicenseActivation,
    machineId?: string
  ): Promise<LicenseValidationResult> {
    // Check license status
    if (licenseKey.status === LicenseStatus.REVOKED) {
      return LicenseValidationResult.REVOKED;
    }

    if (licenseKey.status === LicenseStatus.SUSPENDED) {
      return LicenseValidationResult.SUSPENDED;
    }

    // Check expiration
    if (licenseKey.expiresAt && licenseKey.expiresAt < new Date()) {
      return LicenseValidationResult.EXPIRED;
    }

    // Check activation status
    if (activation && activation.status !== LicenseStatus.ACTIVE) {
      return LicenseValidationResult.INVALID;
    }

    // Check subscription status if linked
    if (licenseKey.subscriptionId) {
      // In a real implementation, this would check the subscription status
      // For now, assume it's valid
    }

    // Check geographical restrictions
    if (activation?.location && licenseKey.restrictions.geographicalRestrictions) {
      const { country, region } = activation.location;
      if (country && !licenseKey.restrictions.geographicalRestrictions.includes(country)) {
        return LicenseValidationResult.INVALID;
      }
    }

    // Check IP restrictions
    if (activation?.ipAddress && licenseKey.restrictions.ipRestrictions) {
      if (!licenseKey.restrictions.ipRestrictions.some(restriction =>
        this.isIpInRange(activation.ipAddress!, restriction)
      )) {
        return LicenseValidationResult.INVALID;
      }
    }

    // Check time restrictions
    if (licenseKey.restrictions.timeRestrictions) {
      const now = new Date();
      const restrictions = licenseKey.restrictions.timeRestrictions;

      if (restrictions.allowedHours) {
        const [startHour, endHour] = restrictions.allowedHours;
        const currentHour = parseInt(now.toLocaleTimeString('en-US', {
          hour12: false,
          timeZone: restrictions.timezone || 'UTC'
        }).split(':')[0]);

        if (currentHour < startHour || currentHour > endHour) {
          return LicenseValidationResult.INVALID;
        }
      }

      if (restrictions.allowedDays) {
        const currentDay = now.getDay();
        if (!restrictions.allowedDays.includes(currentDay)) {
          return LicenseValidationResult.INVALID;
        }
      }
    }

    // Check usage restrictions
    if (licenseKey.restrictions.usageRestrictions && activation) {
      const currentUsage = await this.getCurrentUsage(activation.id, licenseKey.restrictions.usageRestrictions.period);
      const restrictions = licenseKey.restrictions.usageRestrictions;

      if (restrictions.maxApiCalls && currentUsage.apiCalls >= restrictions.maxApiCalls) {
        return LicenseValidationResult.USAGE_LIMIT_EXCEEDED;
      }

      if (restrictions.maxStorage && currentUsage.storage >= restrictions.maxStorage) {
        return LicenseValidationResult.USAGE_LIMIT_EXCEEDED;
      }

      if (restrictions.maxBandwidth && currentUsage.bandwidth >= restrictions.maxBandwidth) {
        return LicenseValidationResult.USAGE_LIMIT_EXCEEDED;
      }
    }

    return LicenseValidationResult.VALID;
  }

  private async getCurrentUsage(activationId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<{
    apiCalls: number;
    storage: number;
    bandwidth: number;
  }> {
    const usageList = this.usage.get(activationId) || [];
    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case 'daily':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const recentUsage = usageList.filter(usage => usage.timestamp >= cutoffDate);

    return {
      apiCalls: recentUsage.filter(u => u.metric === 'api_calls').reduce((sum, u) => sum + u.value, 0),
      storage: recentUsage.filter(u => u.metric === 'storage').reduce((sum, u) => sum + u.value, 0),
      bandwidth: recentUsage.filter(u => u.metric === 'bandwidth').reduce((sum, u) => sum + u.value, 0)
    };
  }

  private async checkUsageRestrictions(
    licenseKey: LicenseKey,
    activation: LicenseActivation,
    metric: string,
    value: number
  ): Promise<void> {
    if (!licenseKey.restrictions.usageRestrictions) {
      return;
    }

    const currentUsage = await this.getCurrentUsage(activation.id, licenseKey.restrictions.usageRestrictions.period);
    const restrictions = licenseKey.restrictions.usageRestrictions;

    let limitExceeded = false;
    let limit = 0;
    let current = 0;

    switch (metric) {
      case 'api_calls':
        limit = restrictions.maxApiCalls || 0;
        current = currentUsage.apiCalls + value;
        limitExceeded = limit > 0 && current > limit;
        break;
      case 'storage':
        limit = restrictions.maxStorage || 0;
        current = currentUsage.storage + value;
        limitExceeded = limit > 0 && current > limit;
        break;
      case 'bandwidth':
        limit = restrictions.maxBandwidth || 0;
        current = currentUsage.bandwidth + value;
        limitExceeded = limit > 0 && current > limit;
        break;
    }

    if (limitExceeded) {
      // Send notification about usage limit exceeded
      await this.sendUsageLimitNotification(licenseKey, activation, metric, current, limit);
    }
  }

  private async sendUsageLimitNotification(
    licenseKey: LicenseKey,
    activation: LicenseActivation,
    metric: string,
    current: number,
    limit: number
  ): Promise<void> {
    // Send notification about usage limit exceeded
    // This would integrate with the notification system
  }

  private generateRawLicenseKey(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  private encryptLicenseKey(rawKey: string, restrictions: LicenseRestrictions): string {
    // In a real implementation, this would use proper encryption
    const data = {
      key: rawKey,
      restrictions,
      timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private generateActivationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateLeaseToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private isIpInRange(ip: string, range: string): boolean {
    // Simple IP range checking
    // In a real implementation, this would be more sophisticated
    return ip.startsWith(range.split('/')[0]);
  }

  private async recordValidation(validation: Omit<LicenseValidationType, 'id'>): Promise<void> {
    const fullValidation: LicenseValidationType = {
      ...validation,
      id: `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    this.validations.set(fullValidation.id, fullValidation);
  }

  private startExpirationChecker(): void {
    // Check for expired licenses and activations
    setInterval(async () => {
      const now = new Date();

      // Check expired license keys
      for (const [id, licenseKey] of this.licenseKeys.entries()) {
        if (licenseKey.expiresAt && licenseKey.expiresAt <= now &&
            licenseKey.status === LicenseStatus.ACTIVE) {
          licenseKey.status = LicenseStatus.EXPIRED;
          licenseKey.updatedAt = now;
          this.licenseKeys.set(id, licenseKey);
        }
      }

      // Check expired activations
      for (const [id, activation] of this.activations.entries()) {
        if (activation.expiresAt && activation.expiresAt <= now &&
            activation.status === LicenseStatus.ACTIVE) {
          activation.status = LicenseStatus.EXPIRED;
          this.activations.set(id, activation);
        }
      }

      // Clean up expired offline leases
      for (const [id, lease] of this.offlineLeases.entries()) {
        if (lease.expiresAt <= now) {
          this.offlineLeases.delete(id);
        }
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  private startUsageAggregator(): void {
    // Aggregate usage data periodically
    setInterval(async () => {
      // Aggregate usage data for reporting and analytics
    }, 24 * 60 * 60 * 1000); // Daily
  }

  private startCleanupTask(): void {
    // Clean up old validation records and usage data
    setInterval(async () => {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

      // Clean up old validations
      for (const [id, validation] of this.validations.entries()) {
        if (validation.validatedAt < cutoffDate) {
          this.validations.delete(id);
        }
      }

      // Clean up old usage data
      for (const [activationId, usageList] of this.usage.entries()) {
        const filteredUsage = usageList.filter(usage => usage.timestamp >= cutoffDate);
        if (filteredUsage.length !== usageList.length) {
          this.usage.set(activationId, filteredUsage);
        }
      }
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }
}