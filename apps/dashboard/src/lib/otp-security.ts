import { randomInt } from 'crypto';
import { createHash, randomBytes, scryptSync } from 'crypto';
import { z } from 'zod';

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_WINDOW_MINUTES: 15,
  MAX_REQUESTS_PER_WINDOW: 5,
};

// Input validation schemas
export const EmailSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
});

export const OTPVerificationSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d+$/, 'OTP must contain only digits'),
});

// OTP Security utilities
export class OTPSecurity {
  /**
   * Generates a cryptographically secure 6-digit OTP
   */
  static generateOTP(): string {
    return randomInt(100000, 999999).toString();
  }

  /**
   * Hashes an OTP with a salt for secure storage
   */
  static hashOTP(otp: string): { hash: string; salt: string } {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(otp, salt, 32).toString('hex');
    return { hash, salt };
  }

  /**
   * Verifies an OTP against its hash
   */
  static verifyOTP(otp: string, hash: string, salt: string): boolean {
    try {
      const otpHash = scryptSync(otp, salt, 32).toString('hex');
      return otpHash === hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates an expiry timestamp for OTP (current time + expiry minutes)
   */
  static createExpiryTime(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + OTP_CONFIG.EXPIRY_MINUTES);
    return expiry;
  }

  /**
   * Checks if OTP has expired
   */
  static isExpired(expiryTime: Date): boolean {
    return new Date() > expiryTime;
  }

  /**
   * Creates a rate limiting key for an email
   */
  static createRateLimitKey(email: string): string {
    return `otp_rate_limit:${createHash('sha256').update(email.toLowerCase()).digest('hex')}`;
  }

  /**
   * Validates email input and returns sanitized email
   */
  static validateEmail(email: any): string {
    const result = EmailSchema.safeParse({ email });
    if (!result.success) {
      throw new Error('Invalid email format');
    }
    return result.data.email.toLowerCase().trim();
  }

  /**
   * Validates OTP verification input
   */
  static validateOTPVerification(data: any): { email: string; otp: string } {
    const result = OTPVerificationSchema.safeParse(data);
    if (!result.success) {
      throw new Error('Invalid input format');
    }
    return {
      email: result.data.email.toLowerCase().trim(),
      otp: result.data.otp,
    };
  }
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: Date }>();

export class RateLimiter {
  /**
   * Checks if request is within rate limit
   */
  static checkRateLimit(email: string): { allowed: boolean; remainingAttempts?: number; resetTime?: Date } {
    const key = OTPSecurity.createRateLimitKey(email);
    const now = new Date();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      // Create new rate limit entry
      const resetTime = new Date(now.getTime() + OTP_CONFIG.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
      rateLimitStore.set(key, { count: 1, resetTime });
      return { 
        allowed: true, 
        remainingAttempts: OTP_CONFIG.MAX_REQUESTS_PER_WINDOW - 1,
        resetTime 
      };
    }

    if (entry.count >= OTP_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      return { 
        allowed: false, 
        remainingAttempts: 0,
        resetTime: entry.resetTime 
      };
    }

    // Increment counter
    entry.count++;
    rateLimitStore.set(key, entry);

    return { 
      allowed: true, 
      remainingAttempts: OTP_CONFIG.MAX_REQUESTS_PER_WINDOW - entry.count,
      resetTime: entry.resetTime 
    };
  }

  /**
   * Cleanup expired rate limit entries
   */
  static cleanup(): void {
    const now = new Date();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }
}

// Run cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    RateLimiter.cleanup();
  }, 60 * 60 * 1000);
}

// Generic error responses to prevent user enumeration
export const GENERIC_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
  SERVER_ERROR: 'An unexpected error occurred',
  OTP_SENT: 'If an account exists with this email, you will receive an OTP',
  VERIFICATION_FAILED: 'Verification failed. Please check your code and try again',
} as const;
