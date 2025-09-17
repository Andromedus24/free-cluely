import { z } from 'zod';
import { AppConfig, AppConfigSchema } from '@free-cluely/shared';
import dotenv from 'dotenv';

// Environment variable schemas
const EnvConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // LLM Configuration
  GEMINI_API_KEY: z.string().optional(),
  OLLAMA_HOST: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.2'),
  
  // Permissions
  PERMISSION_SCREEN: z.coerce.boolean().default(true),
  PERMISSION_CLIPBOARD: z.coerce.boolean().default(false),
  PERMISSION_AUTOMATION: z.coerce.boolean().default(false),
  PERMISSION_NETWORK: z.coerce.boolean().default(true),
  
  // Automation
  AUTOMATION_ALLOWLIST: z.string().default(''),
  
  // Dashboard
  DASHBOARD_PORT: z.coerce.number().default(3000),
  DASHBOARD_ENABLED: z.coerce.boolean().default(true),
  
  // Electron
  ELECTRON_PORT: z.coerce.number().default(5180),
  
  // Telemetry
  TELEMETRY_ENABLED: z.coerce.boolean().default(false),
  TELEMETRY_ENDPOINT: z.string().optional(),
  
  // Development
  DEV_TOOLS: z.coerce.boolean().default(false),
  HOT_RELOAD: z.coerce.boolean().default(true),
  
  // Security
  CONTEXT_ISOLATION: z.coerce.boolean().default(true),
  NODE_INTEGRATION: z.coerce.boolean().default(false),
  
  // Paths
  CONFIG_PATH: z.string().optional(),
  LOGS_PATH: z.string().optional(),
  PLUGINS_PATH: z.string().optional(),
  
  // Build
  STATIC_EXPORT: z.coerce.boolean().default(false),
  MINIFY: z.coerce.boolean().default(true),
  SOURCE_MAPS: z.coerce.boolean().default(false),
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export class ConfigManager {
  private env: EnvConfig;
  private appConfig: AppConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env.CONFIG_PATH || './config.json';
    
    // Load environment variables
    dotenv.config();
    
    // Parse environment configuration
    this.env = EnvConfigSchema.parse(process.env);
    
    // Load or create default app configuration
    this.appConfig = this.loadAppConfig();
    
    // Apply environment overrides
    this.applyEnvOverrides();
  }

  private loadAppConfig(): AppConfig {
    const defaultConfig: AppConfig = {
      llm: {
        provider: 'gemini',
        apiKey: this.env.GEMINI_API_KEY || '',
        host: this.env.OLLAMA_HOST,
        model: this.env.OLLAMA_MODEL,
      },
      permissions: {
        screen: this.env.PERMISSION_SCREEN,
        clipboard: this.env.PERMISSION_CLIPBOARD,
        automation: this.env.PERMISSION_AUTOMATION,
        network: this.env.PERMISSION_NETWORK,
      },
      automation: {
        allowlist: this.env.AUTOMATION_ALLOWLIST
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0),
        enabled: this.env.PERMISSION_AUTOMATION,
      },
      dashboard: {
        port: this.env.DASHBOARD_PORT,
        enabled: this.env.DASHBOARD_ENABLED,
      },
      telemetry: {
        enabled: this.env.TELEMETRY_ENABLED,
        endpoint: this.env.TELEMETRY_ENDPOINT,
      },
    };

    try {
      const fs = require('fs');
      const path = require('path');
      
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const parsedConfig = JSON.parse(configData);
        return AppConfigSchema.parse({ ...defaultConfig, ...parsedConfig });
      }
    } catch (error) {
      console.warn(`Failed to load config from ${this.configPath}:`, error);
    }

    return defaultConfig;
  }

  private applyEnvOverrides(): void {
    // LLM Configuration
    if (this.env.GEMINI_API_KEY) {
      this.appConfig.llm.apiKey = this.env.GEMINI_API_KEY;
    }
    
    if (this.env.OLLAMA_HOST) {
      this.appConfig.llm.host = this.env.OLLAMA_HOST;
    }
    
    if (this.env.OLLAMA_MODEL) {
      this.appConfig.llm.model = this.env.OLLAMA_MODEL;
    }
    
    // Permissions
    this.appConfig.permissions.screen = this.env.PERMISSION_SCREEN;
    this.appConfig.permissions.clipboard = this.env.PERMISSION_CLIPBOARD;
    this.appConfig.permissions.automation = this.env.PERMISSION_AUTOMATION;
    this.appConfig.permissions.network = this.env.PERMISSION_NETWORK;
    
    // Automation
    if (this.env.AUTOMATION_ALLOWLIST) {
      this.appConfig.automation.allowlist = this.env.AUTOMATION_ALLOWLIST
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    this.appConfig.automation.enabled = this.env.PERMISSION_AUTOMATION;
    
    // Dashboard
    this.appConfig.dashboard.port = this.env.DASHBOARD_PORT;
    this.appConfig.dashboard.enabled = this.env.DASHBOARD_ENABLED;
    
    // Telemetry
    this.appConfig.telemetry.enabled = this.env.TELEMETRY_ENABLED;
    this.appConfig.telemetry.endpoint = this.env.TELEMETRY_ENDPOINT;
  }

  // Getters
  getEnv(): EnvConfig {
    return { ...this.env };
  }

  getAppConfig(): AppConfig {
    return { ...this.appConfig };
  }

  getLLMConfig() {
    return this.appConfig.llm;
  }

  getPermissions() {
    return this.appConfig.permissions;
  }

  getAutomationConfig() {
    return this.appConfig.automation;
  }

  getDashboardConfig() {
    return this.appConfig.dashboard;
  }

  getTelemetryConfig() {
    return this.appConfig.telemetry;
  }

  // Check if we're in development mode
  isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  // Check if we're in production mode
  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  // Check if we're in test mode
  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  // Validate configuration
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if API key is provided for Gemini
    if (this.appConfig.llm.provider === 'gemini' && !this.appConfig.llm.apiKey) {
      errors.push('GEMINI_API_KEY is required when using Gemini provider');
    }
    
    // Check if automation is enabled but no permissions
    if (this.appConfig.automation.enabled && !this.appConfig.permissions.automation) {
      errors.push('Automation permission is required when automation is enabled');
    }
    
    // Validate automation allowlist domains
    if (this.appConfig.automation.allowlist.length > 0) {
      const invalidDomains = this.appConfig.automation.allowlist.filter(domain => {
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
        return !domainRegex.test(domain) && !domainRegex.test(domain.replace(/^\*\./, ''));
      });
      
      if (invalidDomains.length > 0) {
        errors.push(`Invalid domains in automation allowlist: ${invalidDomains.join(', ')}`);
      }
    }
    
    // Validate port ranges
    if (this.appConfig.dashboard.port < 1 || this.appConfig.dashboard.port > 65535) {
      errors.push('Dashboard port must be between 1 and 65535');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Update configuration
  updateConfig(updates: Partial<AppConfig>): void {
    this.appConfig = { ...this.appConfig, ...updates };
    this.saveConfig();
  }

  // Save configuration to file
  private saveConfig(): void {
    try {
      const fs = require('fs');
      const configData = JSON.stringify(this.appConfig, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf-8');
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  }

  // Export configuration
  exportConfig(format: 'json' | 'env' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.appConfig, null, 2);
    } else if (format === 'env') {
      const envLines = [
        `GEMINI_API_KEY=${this.appConfig.llm.apiKey}`,
        `OLLAMA_HOST=${this.appConfig.llm.host}`,
        `OLLAMA_MODEL=${this.appConfig.llm.model}`,
        `PERMISSION_SCREEN=${this.appConfig.permissions.screen}`,
        `PERMISSION_CLIPBOARD=${this.appConfig.permissions.clipboard}`,
        `PERMISSION_AUTOMATION=${this.appConfig.permissions.automation}`,
        `PERMISSION_NETWORK=${this.appConfig.permissions.network}`,
        `AUTOMATION_ALLOWLIST=${this.appConfig.automation.allowlist.join(',')}`,
        `DASHBOARD_PORT=${this.appConfig.dashboard.port}`,
        `DASHBOARD_ENABLED=${this.appConfig.dashboard.enabled}`,
        `TELEMETRY_ENABLED=${this.appConfig.telemetry.enabled}`,
        `TELEMETRY_ENDPOINT=${this.appConfig.telemetry.endpoint || ''}`,
      ];
      return envLines.join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  // Create .env file
  createEnvFile(path?: string): void {
    const envPath = path || '.env';
    const envContent = this.exportConfig('env');
    
    try {
      const fs = require('fs');
      fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch (error) {
      console.error('Failed to create .env file:', error);
    }
  }

  // Get configuration paths
  getConfigPath(): string {
    return this.configPath;
  }

  getLogsPath(): string {
    return this.env.LOGS_PATH || './logs';
  }

  getPluginsPath(): string {
    return this.env.PLUGINS_PATH || './plugins';
  }

  // Security settings
  getSecuritySettings() {
    return {
      contextIsolation: this.env.CONTEXT_ISOLATION,
      nodeIntegration: this.env.NODE_INTEGRATION,
      devTools: this.env.DEV_TOOLS,
    };
  }

  // Development settings
  getDevelopmentSettings() {
    return {
      hotReload: this.env.HOT_RELOAD,
      devTools: this.env.DEV_TOOLS,
    };
  }

  // Build settings
  getBuildSettings() {
    return {
      staticExport: this.env.STATIC_EXPORT,
      minify: this.env.MINIFY,
      sourceMaps: this.env.SOURCE_MAPS,
    };
  }
}

// Create singleton instance
export const configManager = new ConfigManager();

// Export for testing and multiple instances
export { ConfigManager };