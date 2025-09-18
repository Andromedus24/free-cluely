/**
 * Security utilities for Atlas application
 * Includes input validation, sanitization, and security headers
 */

import { z } from 'zod';

// Input validation schemas
export const UserInputSchema = z.object({
  text: z.string().max(10000, 'Input too long').transform(val => val.trim()),
  email: z.string().email('Invalid email format').optional().nullable(),
  url: z.string().url('Invalid URL format').optional().nullable(),
  number: z.number().min(-999999999).max(999999999).optional(),
  boolean: z.boolean().optional(),
});

export const MessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message too long'),
  channelId: z.string().min(1, 'Channel ID required'),
  messageType: z.enum(['text', 'image', 'file', 'system']).default('text'),
});

export const SearchQuerySchema = z.object({
  query: z.string().min(1, 'Search query required').max(200, 'Query too long').transform(val => val.trim()),
  filters: z.record(z.string(), z.unknown()).optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const FileUploadSchema = z.object({
  file: z.instanceof(File, 'Invalid file'),
  maxSize: z.number().max(50 * 1024 * 1024, 'File too large').default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/gif', 'application/pdf']),
});

// Security headers configuration
export interface SecurityHeadersConfig {
  enableCSP: boolean;
  enableHSTS: boolean;
  enableXSSProtection: boolean;
  enableContentTypeSniffing: boolean;
  enableFrameOptions: boolean;
  cspDirectives: {
    'default-src'?: string;
    'script-src'?: string;
    'style-src'?: string;
    'img-src'?: string;
    'font-src'?: string;
    'connect-src'?: string;
    'media-src'?: string;
    'object-src'?: string;
    'child-src'?: string;
    'form-action'?: string;
    'frame-ancestors'?: string;
    'base-uri'?: string;
    'sandbox'?: string;
    'report-uri'?: string;
  };
}

export const defaultSecurityConfig: SecurityHeadersConfig = {
  enableCSP: true,
  enableHSTS: true,
  enableXSSProtection: true,
  enableContentTypeSniffing: true,
  enableFrameOptions: true,
  cspDirectives: {
    'default-src': "'self'",
    'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    'style-src': "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    'img-src': "'self' data: https: https://*.supabase.co",
    'font-src': "'self' data: https://cdn.jsdelivr.net",
    'connect-src': "'self' https://*.supabase.co wss://*.supabase.co",
    'media-src': "'self' https://*.supabase.co",
    'object-src': "'none'",
    'child-src': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
    'base-uri': "'self'",
    'sandbox': 'allow-scripts allow-same-origin',
  },
};

// Input sanitization
export class InputSanitizer {
  private static htmlEscapeRegex = /[&<>"']/g;
  private static htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  static escapeHtml(unsafe: string): string {
    return unsafe.replace(this.htmlEscapeRegex, char => this.htmlEscapeMap[char]);
  }

  static sanitizeHtml(unsafe: string): string {
    // Remove potentially dangerous HTML elements and attributes
    return unsafe
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*>/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/data:\s*text\/html/gi, ''); // Remove data HTML
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Only allow specific protocols
      const allowedProtocols = ['https:', 'http:', 'mailto:', 'tel:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return '#invalid-url';
      }

      // Remove credentials from URL
      parsed.username = '';
      parsed.password = '';

      return parsed.toString();
    } catch {
      return '#invalid-url';
    }
  }

  static sanitizeFileName(filename: string): string {
    // Remove path traversal characters and dangerous characters
    return filename
      .replace(/[\/\\:*?"<>|]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/^\.+/, '')
      .replace(/\.+$/, '')
      .trim() || 'unnamed_file';
  }

  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type) ||
           allowedTypes.some(type => type.endsWith('/*') && file.type.startsWith(type.split('/*')[0]));
  }

  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }
}

// CSP Header generation
export class CSPGenerator {
  static generateCSPHeader(directives: Record<string, string>): string {
    const policies = Object.entries(directives)
      .map(([key, value]) => `${key} ${value}`)
      .join('; ');

    return policies;
  }

  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  static generateReportOnlyCSP(directives: Record<string, string>, reportUri: string): string {
    const policies = Object.entries(directives)
      .map(([key, value]) => `${key} ${value}`)
      .concat([`report-uri ${reportUri}`])
      .join('; ');

    return policies;
  }
}

// Security headers middleware
export function generateSecurityHeaders(config: SecurityHeadersConfig = defaultSecurityConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  // Content Security Policy
  if (config.enableCSP) {
    const csp = CSPGenerator.generateCSPHeader(config.cspDirectives);
    headers['Content-Security-Policy'] = csp;
  }

  // HTTP Strict Transport Security
  if (config.enableHSTS) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // XSS Protection
  if (config.enableXSSProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }

  // Content Type Options
  if (config.enableContentTypeSniffing) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }

  // Frame Options
  if (config.enableFrameOptions) {
    headers['X-Frame-Options'] = 'DENY';
  }

  // Additional security headers
  headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Embedder-Policy'] = 'require-corp';

  return headers;
}

// Rate limiting utilities
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

export class RateLimiter {
  private stores = new Map<string, { count: number; resetTime: number }>();

  constructor(private config: RateLimitConfig) {}

  isAllowed(request: Request): boolean {
    const key = this.config.keyGenerator ? this.config.keyGenerator(request) : this.getDefaultKey(request);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Clean up old entries
    this.cleanup(windowStart);

    let entry = this.stores.get(key);

    if (!entry || entry.resetTime <= windowStart) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs
      };
      this.stores.set(key, entry);
      return true;
    }

    if (entry.count >= this.config.maxRequests) {
      return false; // Rate limit exceeded
    }

    entry.count++;
    return true;
  }

  private getDefaultKey(request: Request): string {
    // Use IP address or user agent as fallback
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded || realIp || 'unknown';
    return ip;
  }

  private cleanup(windowStart: number): void {
    for (const [key, entry] of this.stores.entries()) {
      if (entry.resetTime <= windowStart) {
        this.stores.delete(key);
      }
    }
  }

  getRemainingRequests(request: Request): number {
    const key = this.config.keyGenerator ? this.config.keyGenerator(request) : this.getDefaultKey(request);
    const entry = this.stores.get(key);

    if (!entry) return this.config.maxRequests;

    return Math.max(0, this.config.maxRequests - entry.count);
  }

  getResetTime(request: Request): number | null {
    const key = this.config.keyGenerator ? this.config.keyGenerator(request) : this.getDefaultKey(request);
    const entry = this.stores.get(key);

    return entry ? entry.resetTime : null;
  }
}

// Validation utilities
export class SecurityValidator {
  static validateUserInput(input: unknown): z.infer<typeof UserInputSchema> {
    return UserInputSchema.parse(input);
  }

  static validateMessage(input: unknown): z.infer<typeof MessageSchema> {
    return MessageSchema.parse(input);
  }

  static validateSearchQuery(input: unknown): z.infer<typeof SearchQuerySchema> {
    return SearchQuerySchema.parse(input);
  }

  static validateFileUpload(input: unknown): z.infer<typeof FileUploadSchema> {
    return FileUploadSchema.parse(input);
  }

  static isSafeRedirectUrl(url: string): boolean {
    try {
      const parsed = new URL(url, window.location.origin);

      // Must be same origin
      return parsed.origin === window.location.origin;
    } catch {
      return false;
    }
  }

  static hasSqlInjection(str: string): boolean {
    const sqlPatterns = [
      /(\s|^)(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|WHERE)(\s|$)/i,
      /(\s|^)(OR|AND)\s+\d+\s*=\s*\d+/i,
      /(\s|^)(OR|AND)\s+\w+\s*=\s*\w+/i,
      /\/\*|\*\/|--|;/i,
      /x'?x'?\s*=\s*'?x'?/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(str));
  }

  static hasXss(str: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<\s*\/?\s*script\s*>/gi,
      /<\s*\/?\s*iframe\s*>/gi,
      /data:\s*text\/html/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(str));
  }
}

// Export convenience functions
export const sanitize = {
  html: InputSanitizer.escapeHtml,
  htmlContent: InputSanitizer.sanitizeHtml,
  url: InputSanitizer.sanitizeUrl,
  fileName: InputSanitizer.sanitizeFileName,
};

export const validate = {
  userInput: SecurityValidator.validateUserInput,
  message: SecurityValidator.validateMessage,
  searchQuery: SecurityValidator.validateSearchQuery,
  fileUpload: SecurityValidator.validateFileUpload,
  redirectUrl: SecurityValidator.isSafeRedirectUrl,
};

export const security = {
  hasSqlInjection: SecurityValidator.hasSqlInjection,
  hasXss: SecurityValidator.hasXss,
  generateHeaders: generateSecurityHeaders,
  createRateLimiter: (config: RateLimitConfig) => new RateLimiter(config),
};

export default {
  sanitize,
  validate,
  security,
  InputSanitizer,
  CSPGenerator,
  RateLimiter,
  SecurityValidator,
};