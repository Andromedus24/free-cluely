import { z } from 'zod';
import { dialog } from 'electron';

// Define required environment variables per mode
const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Application settings
  DASHBOARD_PORT: z.coerce.number().min(1).max(65535).default(3000),
  ELECTRON_PORT: z.coerce.number().min(1).max(65535).default(5180),
  
  // Security settings
  CONTEXT_ISOLATION: z.coerce.boolean().default(true),
  NODE_INTEGRATION: z.coerce.boolean().default(false),
  
  // Permissions
  PERMISSION_SCREEN: z.coerce.boolean().default(true),
  PERMISSION_CLIPBOARD: z.coerce.boolean().default(false),
  PERMISSION_AUTOMATION: z.coerce.boolean().default(false),
  PERMISSION_NETWORK: z.coerce.boolean().default(true),
  
  // Optional settings
  TELEMETRY_ENABLED: z.coerce.boolean().default(false),
  TELEMETRY_ENDPOINT: z.string().url().optional(),
  DEV_TOOLS: z.coerce.boolean().default(false),
  HOT_RELOAD: z.coerce.boolean().default(true),
  AUTOMATION_ALLOWLIST: z.string().default(''),
});

// AI Provider validation - at least one must be configured
const aiProviderSchema = z.discriminatedUnion('provider', [
  // Gemini configuration
  z.object({
    provider: z.literal('gemini'),
    GEMINI_API_KEY: z.string().min(1, 'Gemini API key is required'),
    USE_OLLAMA: z.literal('false').or(z.undefined()),
  }),
  // Ollama configuration  
  z.object({
    provider: z.literal('ollama'),
    USE_OLLAMA: z.literal('true'),
    OLLAMA_HOST: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('llama3.2'),
    GEMINI_API_KEY: z.string().optional(),
  })
]);

// Production-specific requirements
const productionEnvSchema = baseEnvSchema.extend({
  // In production, we need more strict validation
  TELEMETRY_ENABLED: z.coerce.boolean(),
  
  // Production security requirements
  CONTEXT_ISOLATION: z.literal('true').or(z.coerce.boolean().refine(val => val === true)),
  NODE_INTEGRATION: z.literal('false').or(z.coerce.boolean().refine(val => val === false)),
});

export interface EnvValidationResult {
  success: boolean;
  data?: any;
  errors?: string[];
  warnings?: string[];
}

export class EnvironmentValidator {
  /**
   * Validates environment variables based on NODE_ENV
   */
  static validate(): EnvValidationResult {
    const env = process.env;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate base environment
      const baseSchema = env.NODE_ENV === 'production' ? productionEnvSchema : baseEnvSchema;
      const baseResult = baseSchema.safeParse(env);
      
      if (!baseResult.success) {
        baseResult.error.errors.forEach(error => {
          errors.push(`${error.path.join('.')}: ${error.message}`);
        });
      }

      // Validate AI provider configuration
      const aiConfig = this.validateAIProvider(env);
      if (!aiConfig.success) {
        errors.push(...aiConfig.errors);
      }
      
      // Check for common misconfigurations
      this.checkSecurityMisconfigurations(env, warnings);
      this.checkProductionReadiness(env, warnings);

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      return { 
        success: true, 
        data: { 
          ...baseResult.data, 
          ...aiConfig.data 
        }, 
        warnings: warnings.length > 0 ? warnings : undefined 
      };

    } catch (error) {
      return { 
        success: false, 
        errors: [`Unexpected validation error: ${error.message}`] 
      };
    }
  }

  /**
   * Validates AI provider configuration
   */
  private static validateAIProvider(env: NodeJS.ProcessEnv): { success: boolean; data?: any; errors: string[] } {
    const errors: string[] = [];
    
    const useOllama = env.USE_OLLAMA === 'true';
    const hasGeminiKey = Boolean(env.GEMINI_API_KEY);

    if (useOllama && hasGeminiKey) {
      // Both configured - prefer Ollama
      try {
        const result = aiProviderSchema.safeParse({ 
          ...env, 
          provider: 'ollama' 
        });
        if (result.success) {
          return { success: true, data: result.data, errors: [] };
        }
        errors.push(...result.error.errors.map(e => e.message));
      } catch (error) {
        errors.push('Failed to validate Ollama configuration');
      }
    } else if (useOllama) {
      // Only Ollama configured
      try {
        const result = aiProviderSchema.safeParse({ 
          ...env, 
          provider: 'ollama' 
        });
        if (result.success) {
          return { success: true, data: result.data, errors: [] };
        }
        errors.push(...result.error.errors.map(e => e.message));
      } catch (error) {
        errors.push('Failed to validate Ollama configuration');
      }
    } else if (hasGeminiKey) {
      // Only Gemini configured
      try {
        const result = aiProviderSchema.safeParse({ 
          ...env, 
          provider: 'gemini' 
        });
        if (result.success) {
          return { success: true, data: result.data, errors: [] };
        }
        errors.push(...result.error.errors.map(e => e.message));
      } catch (error) {
        errors.push('Failed to validate Gemini configuration');
      }
    } else {
      errors.push(
        'No AI provider configured. Please set either GEMINI_API_KEY or USE_OLLAMA=true with OLLAMA_HOST'
      );
    }

    return { success: false, errors };
  }

  /**
   * Checks for security misconfigurations
   */
  private static checkSecurityMisconfigurations(env: NodeJS.ProcessEnv, warnings: string[]): void {
    if (env.NODE_INTEGRATION === 'true') {
      warnings.push('SECURITY WARNING: NODE_INTEGRATION is enabled. This poses security risks.');
    }

    if (env.CONTEXT_ISOLATION === 'false') {
      warnings.push('SECURITY WARNING: CONTEXT_ISOLATION is disabled. This poses security risks.');
    }

    if (env.PERMISSION_AUTOMATION === 'true' && !env.AUTOMATION_ALLOWLIST) {
      warnings.push('SECURITY WARNING: Automation is enabled but no allowlist is configured.');
    }

    if (env.NODE_ENV === 'production' && env.DEV_TOOLS === 'true') {
      warnings.push('WARNING: DEV_TOOLS should be disabled in production.');
    }
  }

  /**
   * Checks production readiness
   */
  private static checkProductionReadiness(env: NodeJS.ProcessEnv, warnings: string[]): void {
    if (env.NODE_ENV === 'production') {
      if (env.SOURCE_MAPS === 'true') {
        warnings.push('Consider disabling SOURCE_MAPS in production for security.');
      }

      if (env.HOT_RELOAD === 'true') {
        warnings.push('HOT_RELOAD should typically be disabled in production.');
      }

      if (!env.TELEMETRY_ENDPOINT && env.TELEMETRY_ENABLED === 'true') {
        warnings.push('TELEMETRY_ENABLED is true but no TELEMETRY_ENDPOINT is configured.');
      }
    }
  }

  /**
   * Shows validation errors to the user and optionally exits
   */
  static async showValidationErrors(result: EnvValidationResult, exitOnError = true): Promise<void> {
    if (!result.success && result.errors) {
      const errorMessage = [
        'Environment Configuration Errors:',
        '',
        ...result.errors.map(error => `• ${error}`),
        '',
        'Please check your .env file and ensure all required environment variables are set.',
        'See .env.example for reference.'
      ].join('\n');

      console.error('\n❌ Environment Validation Failed:');
      console.error(errorMessage);

      if (exitOnError) {
        // In Electron context, show dialog before exit
        try {
          await dialog.showMessageBox({
            type: 'error',
            title: 'Configuration Error',
            message: 'Environment configuration is invalid',
            detail: errorMessage,
            buttons: ['Exit']
          });
        } catch (dialogError) {
          // Fallback if dialog fails
          console.error('Failed to show error dialog:', dialogError);
        }
        
        process.exit(1);
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      console.warn('\n⚠️  Environment Warnings:');
      result.warnings.forEach(warning => console.warn(`• ${warning}`));
      console.warn('');
    }

    if (result.success) {
      console.log('✅ Environment validation passed');
      if (result.warnings && result.warnings.length > 0) {
        console.log(`   (${result.warnings.length} warning(s) found)`);
      }
    }
  }

  /**
   * Quick validation function for use at app startup
   */
  static validateOrExit(): any {
    const result = this.validate();
    this.showValidationErrors(result, true);
    return result.data;
  }
}
