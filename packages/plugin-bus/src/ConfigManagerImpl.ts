import { EventEmitter } from 'events';
import { AppConfig, AppConfigSchema, ConfigError, LogEntry } from '@free-cluely/shared';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigManagerImpl extends EventEmitter implements ConfigManager {
  private config: AppConfig;
  private configPath: string;
  private watchers: fs.FSWatcher[] = [];

  constructor(configPath?: string) {
    super();
    this.configPath = configPath || path.join(process.cwd(), 'config.json');
    this.config = this.loadConfig();
    this.setupConfigWatcher();
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    try {
      const newConfig = { ...this.config, ...updates };
      
      // Validate new config
      const validatedConfig = AppConfigSchema.parse(newConfig);
      
      // Update in-memory config
      this.config = validatedConfig;
      
      // Save to file
      await this.saveConfig(validatedConfig);
      
      // Emit change event
      this.emit('config:changed', validatedConfig);
    } catch (error) {
      throw new ConfigError(
        `Failed to update config: ${error instanceof Error ? error.message : String(error)}`,
        this.configPath
      );
    }
  }

  onConfigChange(handler: (config: AppConfig) => void): () => void {
    this.on('config:changed', handler);
    return () => this.off('config:changed', handler);
  }

  validateConfig(config: unknown): AppConfig {
    try {
      return AppConfigSchema.parse(config);
    } catch (error) {
      throw new ConfigError(
        `Invalid config: ${error instanceof Error ? error.message : String(error)}`,
        this.configPath
      );
    }
  }

  private loadConfig(): AppConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf-8');
        const parsedConfig = JSON.parse(configData);
        return AppConfigSchema.parse(parsedConfig);
      }
      
      // Return default config if file doesn't exist
      const defaultConfig: AppConfig = {
        llm: {
          provider: 'gemini',
          apiKey: '',
          host: 'http://localhost:11434',
          model: 'llama3.2',
        },
        permissions: {
          screen: true,
          clipboard: false,
          automation: false,
          network: true,
        },
        automation: {
          allowlist: [],
          enabled: false,
        },
        dashboard: {
          port: 3000,
          enabled: true,
        },
        telemetry: {
          enabled: false,
          endpoint: '',
        },
      };
      
      // Save default config
      this.saveConfig(defaultConfig);
      return defaultConfig;
    } catch (error) {
      throw new ConfigError(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
        this.configPath
      );
    }
  }

  private async saveConfig(config: AppConfig): Promise<void> {
    try {
      const configData = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configPath, configData, 'utf-8');
    } catch (error) {
      throw new ConfigError(
        `Failed to save config: ${error instanceof Error ? error.message : String(error)}`,
        this.configPath
      );
    }
  }

  private setupConfigWatcher(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const watcher = fs.watch(this.configPath, (eventType) => {
          if (eventType === 'change') {
            try {
              const newConfig = this.loadConfig();
              if (JSON.stringify(this.config) !== JSON.stringify(newConfig)) {
                this.config = newConfig;
                this.emit('config:changed', newConfig);
              }
            } catch (error) {
              console.error('Error reloading config:', error);
            }
          }
        });
        
        this.watchers.push(watcher);
      }
    } catch (error) {
      console.error('Error setting up config watcher:', error);
    }
  }

  // Environment variable overrides
  loadEnvOverrides(): void {
    const env = process.env;
    
    const overrides: Partial<AppConfig> = {};
    
    // LLM configuration
    if (env.GEMINI_API_KEY) {
      overrides.llm = { ...this.config.llm, apiKey: env.GEMINI_API_KEY };
    }
    
    if (env.OLLAMA_HOST) {
      overrides.llm = { ...this.config.llm, host: env.OLLAMA_HOST };
    }
    
    if (env.OLLAMA_MODEL) {
      overrides.llm = { ...this.config.llm, model: env.OLLAMA_MODEL };
    }
    
    // Permissions
    if (env.PERMISSION_SCREEN !== undefined) {
      overrides.permissions = { 
        ...this.config.permissions, 
        screen: env.PERMISSION_SCREEN === 'true' 
      };
    }
    
    if (env.PERMISSION_CLIPBOARD !== undefined) {
      overrides.permissions = { 
        ...this.config.permissions, 
        clipboard: env.PERMISSION_CLIPBOARD === 'true' 
      };
    }
    
    if (env.PERMISSION_AUTOMATION !== undefined) {
      overrides.permissions = { 
        ...this.config.permissions, 
        automation: env.PERMISSION_AUTOMATION === 'true' 
      };
    }
    
    if (env.PERMISSION_NETWORK !== undefined) {
      overrides.permissions = { 
        ...this.config.permissions, 
        network: env.PERMISSION_NETWORK === 'true' 
      };
    }
    
    // Automation
    if (env.AUTOMATION_ALLOWLIST) {
      overrides.automation = { 
        ...this.config.automation, 
        allowlist: env.AUTOMATION_ALLOWLIST.split(',').map(s => s.trim()) 
      };
    }
    
    // Dashboard
    if (env.DASHBOARD_PORT) {
      overrides.dashboard = { 
        ...this.config.dashboard, 
        port: parseInt(env.DASHBOARD_PORT) || 3000 
      };
    }
    
    // Telemetry
    if (env.TELEMETRY_ENABLED !== undefined) {
      overrides.telemetry = { 
        ...this.config.telemetry, 
        enabled: env.TELEMETRY_ENABLED === 'true' 
      };
    }
    
    if (Object.keys(overrides).length > 0) {
      this.config = { ...this.config, ...overrides };
    }
  }

  // Get specific configuration sections
  getLLMConfig() {
    return this.config.llm;
  }

  getPermissions() {
    return this.config.permissions;
  }

  getAutomationConfig() {
    return this.config.automation;
  }

  getDashboardConfig() {
    return this.config.dashboard;
  }

  getTelemetryConfig() {
    return this.config.telemetry;
  }

  // Clean up watchers
  destroy(): void {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers = [];
    this.removeAllListeners();
  }
}