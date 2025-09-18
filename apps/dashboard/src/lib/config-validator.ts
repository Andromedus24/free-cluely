/**
 * Production Configuration Validation System
 * Ensures all required environment variables are present and valid
 */

import { z } from 'zod';

// Environment configuration schema
export const EnvConfigSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'Supabase URL is required and must be a valid URL'
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'Supabase anonymous key is required'
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'Supabase service role key is required'
  }),

  // AI Provider (At least one required)
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_HOST: z.string().url().optional(),
  OLLAMA_MODEL: z.string().optional(),

  // Feature Flags
  PERMISSION_SCREEN: z.coerce.boolean().default(true),
  PERMISSION_CLIPBOARD: z.coerce.boolean().default(false),
  PERMISSION_AUTOMATION: z.coerce.boolean().default(false),
  PERMISSION_NETWORK: z.coerce.boolean().default(true),

  // Security
  AUTOMATION_ALLOWLIST: z.string().optional(),
  CONTEXT_ISOLATION: z.coerce.boolean().default(true),
  NODE_INTEGRATION: z.coerce.boolean().default(false),

  // Performance
  DASHBOARD_PORT: z.coerce.number().min(1).max(65535).default(3000),
  ELECTRON_PORT: z.coerce.number().min(1).max(65535).default(5180),

  // Development/Production
  DEV_TOOLS: z.coerce.boolean().default(false),
  HOT_RELOAD: z.coerce.boolean().default(false),
  TELEMETRY_ENABLED: z.coerce.boolean().default(false),

  // Paths
  CONFIG_PATH: z.string().default('./config.json'),
  LOGS_PATH: z.string().default('./logs'),
  PLUGINS_PATH: z.string().default('./plugins'),

  // Build
  STATIC_EXPORT: z.coerce.boolean().default(false),
  MINIFY: z.coerce.boolean().default(true),
  SOURCE_MAPS: z.coerce.boolean().default(false),

  // Plugins
  PLUGIN_DEV_MODE: z.coerce.boolean().default(false),
  PLUGIN_AUTO_RELOAD: z.coerce.boolean().default(false),
}).refine(
  (data) => {
    // At least one AI provider must be configured
    return !!(data.GEMINI_API_KEY || data.OLLAMA_HOST);
  },
  {
    message: 'At least one AI provider (Gemini or Ollama) must be configured',
    path: ['aiProvider']
  }
);

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvConfig>;
}

class ConfigValidator {
  private cachedConfig: EnvConfig | null = null;
  private lastValidation: ValidationResult | null = null;

  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get environment variables
      const envVars = {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        OLLAMA_HOST: process.env.OLLAMA_HOST,
        OLLAMA_MODEL: process.env.OLLAMA_MODEL,
        PERMISSION_SCREEN: process.env.PERMISSION_SCREEN,
        PERMISSION_CLIPBOARD: process.env.PERMISSION_CLIPBOARD,
        PERMISSION_AUTOMATION: process.env.PERMISSION_AUTOMATION,
        PERMISSION_NETWORK: process.env.PERMISSION_NETWORK,
        AUTOMATION_ALLOWLIST: process.env.AUTOMATION_ALLOWLIST,
        CONTEXT_ISOLATION: process.env.CONTEXT_ISOLATION,
        NODE_INTEGRATION: process.env.NODE_INTEGRATION,
        DASHBOARD_PORT: process.env.DASHBOARD_PORT,
        ELECTRON_PORT: process.env.ELECTRON_PORT,
        DEV_TOOLS: process.env.DEV_TOOLS,
        HOT_RELOAD: process.env.HOT_RELOAD,
        TELEMETRY_ENABLED: process.env.TELEMETRY_ENABLED,
        CONFIG_PATH: process.env.CONFIG_PATH,
        LOGS_PATH: process.env.LOGS_PATH,
        PLUGINS_PATH: process.env.PLUGINS_PATH,
        STATIC_EXPORT: process.env.STATIC_EXPORT,
        MINIFY: process.env.MINIFY,
        SOURCE_MAPS: process.env.SOURCE_MAPS,
        PLUGIN_DEV_MODE: process.env.PLUGIN_DEV_MODE,
        PLUGIN_AUTO_RELOAD: process.env.PLUGIN_AUTO_RELOAD,
      };

      // Validate using Zod schema
      const result = EnvConfigSchema.safeParse(envVars);

      if (!result.success) {
        errors.push(...result.error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ));
      }

      const config = result.success ? result.data : envVars;

      // Additional validation checks
      this.validateSecurityConfig(config, errors, warnings);
      this.validatePerformanceConfig(config, errors, warnings);
      this.validateFeatureConfig(config, errors, warnings);

      // Check for missing required configs in production
      if (process.env.NODE_ENV === 'production') {
        this.validateProductionConfig(config, errors, warnings);
      }

      this.lastValidation = {
        isValid: errors.length === 0,
        errors,
        warnings,
        config
      };

      if (errors.length === 0) {
        this.cachedConfig = config as EnvConfig;
      }

      return this.lastValidation;
    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.lastValidation = {
        isValid: false,
        errors,
        warnings,
        config: envVars
      };

      return this.lastValidation;
    }
  }

  private validateSecurityConfig(
    config: Partial<EnvConfig>,
    errors: string[],
    warnings: string[]
  ): void {
    // Security checks
    if (config.PERMISSION_AUTOMATION && !config.AUTOMATION_ALLOWLIST) {
      warnings.push(
        'Automation is enabled but no allowlist is configured. This may be a security risk.'
      );
    }

    if (config.NODE_INTEGRATION) {
      warnings.push(
        'Node integration is enabled. This increases security risks and should only be used in trusted environments.'
      );
    }

    if (config.DEV_TOOLS && config.NODE_ENV === 'production') {
      errors.push(
        'Dev tools should not be enabled in production environments'
      );
    }
  }

  private validatePerformanceConfig(
    config: Partial<EnvConfig>,
    errors: string[],
    warnings: string[]
  ): void {
    // Performance checks
    if (config.DASHBOARD_PORT === config.ELECTRON_PORT) {
      errors.push(
        'Dashboard and Electron ports cannot be the same'
      );
    }

    if (config.SOURCE_MAPS && config.NODE_ENV === 'production') {
      warnings.push(
        'Source maps are enabled in production. This may expose sensitive code structure.'
      );
    }

    if (!config.MINIFY && config.NODE_ENV === 'production') {
      warnings.push(
        'Code minification is disabled in production. This will affect performance.'
      );
    }
  }

  private validateFeatureConfig(
    config: Partial<EnvConfig>,
    errors: string[],
    warnings: string[]
  ): void {
    // Feature compatibility checks
    if (config.PERMISSION_SCREEN && typeof window === 'undefined') {
      warnings.push(
        'Screen permission is enabled but running in server-side environment'
      );
    }

    if (config.TELEMETRY_ENABLED && !config.NEXT_PUBLIC_SUPABASE_URL) {
      warnings.push(
        'Telemetry is enabled but Supabase is not configured'
      );
    }
  }

  private validateProductionConfig(
    config: Partial<EnvConfig>,
    errors: string[],
    warnings: string[]
  ): void {
    // Production-specific checks
    if (!config.NEXT_PUBLIC_SUPABASE_URL) {
      errors.push(
        'Supabase URL is required in production'
      );
    }

    if (!config.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      errors.push(
        'Supabase anonymous key is required in production'
      );
    }

    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      errors.push(
        'Supabase service role key is required in production'
      );
    }

    if (config.DEV_TOOLS) {
      errors.push(
        'Development tools must be disabled in production'
      );
    }

    if (config.HOT_RELOAD) {
      errors.push(
        'Hot reload must be disabled in production'
      );
    }
  }

  getConfig(): EnvConfig {
    if (this.cachedConfig) {
      return this.cachedConfig;
    }

    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(
        `Configuration is invalid:\\n${validation.errors.join('\\n')}`
      );
    }

    return validation.config as EnvConfig;
  }

  getLastValidation(): ValidationResult | null {
    return this.lastValidation;
  }

  // Environment-specific defaults
  getDevelopmentDefaults(): Partial<EnvConfig> {
    return {
      NODE_ENV: 'development',
      DEV_TOOLS: true,
      HOT_RELOAD: true,
      SOURCE_MAPS: true,
      MINIFY: false,
      TELEMETRY_ENABLED: false,
    };
  }

  getProductionDefaults(): Partial<EnvConfig> {
    return {
      NODE_ENV: 'production',
      DEV_TOOLS: false,
      HOT_RELOAD: false,
      SOURCE_MAPS: false,
      MINIFY: true,
      PERMISSION_CLIPBOARD: false,
      PERMISSION_AUTOMATION: false,
      CONTEXT_ISOLATION: true,
      NODE_INTEGRATION: false,
    };
  }

  // Generate .env.example content
  generateEnvExample(): string {
    const lines = [
      '# Atlas Configuration',
      '# Copy this file to .env.local and fill in your values',
      '',
      '# Application Settings',
      'NODE_ENV=development',
      'NEXT_PUBLIC_APP_URL=http://localhost:3000',
      '',
      '# Supabase Configuration (Required)',
      'NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key',
      'SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key',
      '',
      '# AI Provider Configuration (At least one required)',
      '# GEMINI_API_KEY=your_gemini_api_key_here',
      '# OLLAMA_HOST=http://localhost:11434',
      '# OLLAMA_MODEL=llama3.2',
      '',
      '# Feature Permissions',
      'PERMISSION_SCREEN=true',
      'PERMISSION_CLIPBOARD=false',
      'PERMISSION_AUTOMATION=false',
      'PERMISSION_NETWORK=true',
      '',
      '# Security Settings',
      'AUTOMATION_ALLOWLIST=example.com,*.trusted-domain.com',
      'CONTEXT_ISOLATION=true',
      'NODE_INTEGRATION=false',
      '',
      '# Port Configuration',
      'DASHBOARD_PORT=3000',
      'ELECTRON_PORT=5180',
      '',
      '# Development Features',
      'DEV_TOOLS=true',
      'HOT_RELOAD=true',
      'TELEMETRY_ENABLED=false',
      '',
      '# File Paths',
      'CONFIG_PATH=./config.json',
      'LOGS_PATH=./logs',
      'PLUGINS_PATH=./plugins',
      '',
      '# Build Settings',
      'STATIC_EXPORT=false',
      'MINIFY=false',
      'SOURCE_MAPS=true',
      '',
      '# Plugin Development',
      'PLUGIN_DEV_MODE=true',
      'PLUGIN_AUTO_RELOAD=true',
    ];

    return lines.join('\\n');
  }
}

// Export singleton instance
export const configValidator = new ConfigValidator();

// Convenience functions
export function validateConfig(): ValidationResult {
  return configValidator.validate();
}

export function getConfig(): EnvConfig {
  return configValidator.getConfig();
}

export function getValidationErrors(): string[] {
  return configValidator.getLastValidation()?.errors || [];
}

export function getValidationWarnings(): string[] {
  return configValidator.getLastValidation()?.warnings || [];
}

export function isConfigValid(): boolean {
  return configValidator.getLastValidation()?.isValid ?? false;
}

export default ConfigValidator;