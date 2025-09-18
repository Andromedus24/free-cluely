// Settings Package Exports
// =========================

export { SettingsManager } from './SettingsManager';
export { LocalStorageAdapter } from './adapters/LocalStorageAdapter';
export { IndexDBAdapter } from './adapters/IndexDBAdapter';
export { ValidationAdapter } from './adapters/ValidationAdapter';

// Sync Components
export { SettingsSynchronizer, type SettingsSynchronizerConfig } from './sync/SettingsSynchronizer';
export { SyncManager, type SyncManagerConfig, type SyncAdapterConfig, type BackupInfo } from './sync/SyncManager';
export { CloudSyncAdapter, type CloudSyncAdapterConfig, type CloudSyncResponse } from './sync/adapters/CloudSyncAdapter';
export { FileSystemSyncAdapter, type FileSystemSyncAdapterConfig, type FileSystemMetadata } from './sync/adapters/FileSystemSyncAdapter';
export { WebSocketSyncAdapter, type WebSocketSyncAdapterConfig, type WebSocketMessage, type WebSocketSyncState } from './sync/adapters/WebSocketSyncAdapter';

// UI Components
export { SettingsProvider, useSettings, useSettingsValue, useProfile, usePreferences, useAppearance, useNotifications, usePrivacy, useFeatures, useProviders, useAdvanced } from './ui/SettingsProvider';
export { SettingsNavigation, SettingsNavigationSearch } from './ui/SettingsNavigation';
export { SettingsPanel, SettingsModal, SettingsButton } from './ui/SettingsPanel';
export { SettingsForm } from './ui/SettingsForm';
export { ProfileSettings } from './ui/ProfileSettings';
export { PreferenceSettings } from './ui/PreferenceSettings';
export { SyncSettings } from './ui/SyncSettings';
export type {
  SettingsConfig,
  SettingsData,
  SettingsMetadata,
  SettingsManagerConfig,
  StorageAdapter,
  SyncAdapter,
  ValidationAdapter,
  EncryptionAdapter,
  MigrationAdapter,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SyncConflict,
  SettingsEvent,
  SettingsEventType,
  Migration,
  SettingsSchema,
  UserProfile,
  UserPreferences,
  FeatureFlags,
  ProviderSettings,
  ProviderConfig,
  ModelSettings,
  ModelCapabilities,
  ModerationSettings,
  AppearanceSettings,
  NotificationSettings,
  PrivacySettings,
  AdvancedSettings,
  CustomValidator,
  SettingsSection,
  SettingsField,
  SettingsTemplate
} from './types';

/**
 * Factory Functions
 */

/**
 * Create settings manager with default configuration
 */
export function createSettingsManager(
  config: Partial<import('./types').SettingsConfig> = {}
): SettingsManager {
  const defaultConfig: import('./types').SettingsConfig = {
    storage: {
      type: 'local',
      provider: 'localStorage',
      compression: false,
      backup: {
        enabled: true,
        interval: 300000, // 5 minutes
        maxBackups: 10,
        location: 'local',
        compression: true,
        encryption: false
      }
    },
    validation: {
      enabled: true,
      strict: false,
      customValidators: [],
      preSaveHooks: [],
      postLoadHooks: []
    },
    synchronization: {
      enabled: false,
      mode: 'manual',
      interval: 300000, // 5 minutes
      conflictResolution: 'local-wins',
      providers: [],
      realtime: false,
      offlineSupport: true
    },
    defaults: {
      profile: {
        id: '',
        name: 'User',
        email: '',
        timezone: 'UTC',
        language: 'en',
        createdAt: 0,
        updatedAt: 0
      },
      preferences: {
        theme: 'system',
        fontSize: 'medium',
        density: 'comfortable',
        sidebar: {
          collapsed: false,
          width: 240,
          position: 'left'
        },
        layout: {
          mode: 'tabs',
          showTabs: true,
          showToolbar: true,
          showStatusbar: true
        },
        shortcuts: {
          enabled: true,
          global: [],
          contextSensitive: [],
          custom: []
        }
      },
      features: {
        experimental: false,
        betaFeatures: false,
        aiFeatures: true,
        plugins: true,
        workflows: false,
        collaboration: false,
        analytics: true,
        notifications: true,
        offline: true,
        custom: {}
      },
      providers: {
        defaultProvider: 'openai',
        providers: {},
        models: {},
        moderation: {
          enabled: true,
          provider: 'openai',
          sensitivity: 'medium',
          categories: [],
          customFilters: [],
          action: 'warn'
        }
      },
      appearance: {
        theme: {
          id: 'default',
          name: 'Default',
          mode: 'system',
          custom: false,
          variables: {}
        },
        colors: {
          primary: '#1976d2',
          secondary: '#dc004e',
          accent: '#7c4dff',
          background: '#ffffff',
          surface: '#f5f5f5',
          error: '#f44336',
          warning: '#ff9800',
          success: '#4caf50',
          info: '#2196f3',
          custom: {}
        },
        typography: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 16,
          lineHeight: 1.5,
          fontWeight: 400,
          letterSpacing: 0,
          custom: {}
        },
        layout: {
          density: 'comfortable',
          sidebar: {
            width: 240,
            collapsed: false,
            position: 'left'
          },
          header: {
            height: 64,
            visible: true
          },
          footer: {
            height: 48,
            visible: true
          }
        },
        animations: {
          enabled: true,
          duration: 300,
          easing: 'ease',
          reducedMotion: false,
          custom: {}
        }
      },
      notifications: {
        enabled: true,
        channels: [
          {
            id: 'desktop',
            type: 'desktop',
            enabled: true,
            config: {}
          }
        ],
        rules: [],
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'UTC',
          days: [0, 1, 2, 3, 4, 5, 6]
        },
        frequency: {
          minimumInterval: 1000,
          maxNotifications: 10,
          window: 60000,
          batching: true,
          digest: false
        }
      },
      privacy: {
        dataCollection: false,
        analytics: false,
        crashReporting: true,
        telemetry: false,
        location: false,
        camera: false,
        microphone: false,
        contacts: false,
        files: false,
        thirdParty: {
          enabled: false,
          providers: [],
          dataSharing: {
            enabled: false,
            types: ['anonymous'],
            purposes: [],
            retention: 30
          }
        },
        retention: {
          chatHistory: 90,
          files: 30,
          analytics: 30,
          crashReports: 7,
          custom: {}
        }
      },
      advanced: {
        developer: {
          mode: false,
          console: {
            level: 'info',
            timestamps: true,
            colors: true,
            format: 'text',
            filters: []
          },
          inspector: false,
          hotReload: false,
          sourceMaps: false,
          testing: {
            enabled: false,
            framework: 'jest',
            coverage: false,
            e2e: false,
            unit: true,
            integration: false
          }
        },
        debugging: {
          enabled: false,
          level: 'error',
          breakOnError: false,
          trace: false,
          profiling: false,
          memory: false,
          network: false
        },
        performance: {
          monitoring: false,
          profiling: false,
          metrics: false,
          optimization: false,
          cache: {
            enabled: true,
            strategy: 'lru',
            size: 50,
            ttl: 3600000,
            compression: true
          },
          memory: {
            limit: 512,
            warningThreshold: 80,
            criticalThreshold: 90,
            cleanup: true
          }
        },
        experimental: {
          features: {},
          flags: {},
          labs: []
        }
      }
    },
    schemas: [],
    encryption: {
      enabled: false,
      algorithm: 'AES-GCM',
      keyRotation: true,
      rotationInterval: 90,
      keyDerivation: 'pbkdf2',
      iterations: 100000,
      memory: 65536,
      parallelism: 1,
      saltLength: 16
    },
    migrations: {
      enabled: true,
      autoMigrate: true,
      backup: true,
      versioning: true,
      rollback: true,
      migrations: []
    }
  };

  const finalConfig = {
    ...defaultConfig,
    ...config,
    storage: { ...defaultConfig.storage, ...config.storage },
    validation: { ...defaultConfig.validation, ...config.validation },
    synchronization: { ...defaultConfig.synchronization, ...config.synchronization },
    defaults: { ...defaultConfig.defaults, ...config.defaults },
    encryption: { ...defaultConfig.encryption, ...config.encryption },
    migrations: { ...defaultConfig.migrations, ...config.migrations }
  };

  // Create storage adapter
  let storageAdapter: import('./types').StorageAdapter;
  switch (finalConfig.storage.provider) {
    case 'localStorage':
      storageAdapter = new LocalStorageAdapter('atlas-settings', 'atlas-settings-backup');
      break;
    case 'indexedDB':
      storageAdapter = new IndexDBAdapter();
      break;
    default:
      storageAdapter = new LocalStorageAdapter('atlas-settings', 'atlas-settings-backup');
  }

  // Create validation adapter
  const validationAdapter = new ValidationAdapter(finalConfig.validation.strict);
  validationAdapter.addBuiltInValidators();

  return new SettingsManager({
    config: finalConfig,
    storage: storageAdapter,
    validation: validationAdapter
  });
}

/**
 * Create production settings manager
 */
export function createProductionSettingsManager(
  config: Partial<import('./types').SettingsConfig> = {}
): SettingsManager {
  const productionConfig = {
    ...config,
    validation: {
      enabled: true,
      strict: true,
      customValidators: [],
      preSaveHooks: [],
      postLoadHooks: []
    },
    synchronization: {
      enabled: true,
      mode: 'auto',
      interval: 300000, // 5 minutes
      conflictResolution: 'remote-wins',
      providers: [],
      realtime: true,
      offlineSupport: true
    },
    encryption: {
      enabled: true,
      algorithm: 'AES-GCM',
      keyRotation: true,
      rotationInterval: 30,
      keyDerivation: 'argon2',
      iterations: 3,
      memory: 65536,
      parallelism: 4,
      saltLength: 16
    }
  };

  return createSettingsManager(productionConfig);
}

/**
 * Create development settings manager
 */
export function createDevelopmentSettingsManager(
  config: Partial<import('./types').SettingsConfig> = {}
): SettingsManager {
  const developmentConfig = {
    ...config,
    validation: {
      enabled: true,
      strict: false,
      customValidators: [],
      preSaveHooks: [],
      postLoadHooks: []
    },
    synchronization: {
      enabled: false,
      mode: 'manual',
      interval: 60000, // 1 minute
      conflictResolution: 'local-wins',
      providers: [],
      realtime: false,
      offlineSupport: true
    },
    defaults: {
      profile: {
        id: '',
        name: 'Developer',
        email: 'dev@example.com',
        timezone: 'UTC',
        language: 'en',
        createdAt: 0,
        updatedAt: 0
      },
      features: {
        experimental: true,
        betaFeatures: true,
        aiFeatures: true,
        plugins: true,
        workflows: true,
        collaboration: true,
        analytics: true,
        notifications: true,
        offline: true,
        custom: {}
      },
      advanced: {
        developer: {
          mode: true,
          console: {
            level: 'debug',
            timestamps: true,
            colors: true,
            format: 'text',
            filters: []
          },
          inspector: true,
          hotReload: true,
          sourceMaps: true,
          testing: {
            enabled: true,
            framework: 'jest',
            coverage: true,
            e2e: true,
            unit: true,
            integration: true
          }
        },
        debugging: {
          enabled: true,
          level: 'debug',
          breakOnError: true,
          trace: true,
          profiling: true,
          memory: true,
          network: true
        },
        performance: {
          monitoring: true,
          profiling: true,
          metrics: true,
          optimization: true,
          cache: {
            enabled: true,
            strategy: 'lru',
            size: 100,
            ttl: 1800000,
            compression: true
          },
          memory: {
            limit: 1024,
            warningThreshold: 85,
            criticalThreshold: 95,
            cleanup: true
          }
        },
        experimental: {
          features: {},
          flags: {},
          labs: []
        }
      }
    }
  };

  return createSettingsManager(developmentConfig);
}

/**
 * Settings constants
 */
export const SettingsConstants = {
  // Storage types
  STORAGE_TYPES: ['local', 'remote', 'hybrid'],
  STORAGE_PROVIDERS: ['localStorage', 'indexedDB', 'file', 'database', 'cloud'],

  // Validation modes
  VALIDATION_MODES: ['strict', 'lenient', 'disabled'],
  CONFLICT_RESOLUTION: ['local-wins', 'remote-wins', 'manual', 'merge'],

  // Sync modes
  SYNC_MODES: ['auto', 'manual', 'scheduled'],
  SYNC_PROVIDERS: ['cloud', 'database', 'api', 'file'],

  // Themes
  THEMES: ['light', 'dark', 'auto', 'system'],
  FONT_SIZES: ['small', 'medium', 'large', 'x-large'],
  DENSITY: ['compact', 'comfortable', 'spacious'],

  // Feature flags
  FEATURES: ['experimental', 'betaFeatures', 'aiFeatures', 'plugins', 'workflows', 'collaboration', 'analytics', 'notifications', 'offline'],

  // Encryption algorithms
  ENCRYPTION_ALGORITHMS: ['AES-GCM', 'AES-CBC', 'ChaCha20-Poly1305'],
  KEY_DERIVATION: ['pbkdf2', 'scrypt', 'argon2'],

  // Export formats
  EXPORT_FORMATS: ['json', 'yaml', 'env', 'toml', 'xml'],

  // Notification channels
  NOTIFICATION_CHANNELS: ['desktop', 'email', 'sms', 'push', 'webhook'],

  // Timezones
  TIMEZONES: [
    'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
    'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'
  ],

  // Languages
  LANGUAGES: [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
    'ar', 'hi', 'bn', 'tr', 'vi', 'th', 'nl', 'sv', 'no', 'da'
  ]
} as const;

/**
 * Settings utility functions
 */

/**
 * Create default user profile
 */
export function createDefaultUserProfile(
  overrides: Partial<import('./types').UserProfile> = {}
): import('./types').UserProfile {
  const now = Date.now();
  return {
    id: `user_${now}`,
    name: 'User',
    email: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language.split('-')[0] || 'en',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Validate settings path
 */
export function validateSettingsPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;

  // Basic path validation
  const pathRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/;
  return pathRegex.test(path);
}

/**
 * Deep merge settings objects
 */
export function deepMergeSettings(
  target: any,
  source: any,
  options: { arrayMerge?: 'replace' | 'concat' | 'merge' } = {}
): any {
  const { arrayMerge = 'replace' } = options;

  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return target;

  const output = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (Array.isArray(source[key]) && Array.isArray(output[key])) {
        switch (arrayMerge) {
          case 'concat':
            output[key] = [...output[key], ...source[key]];
            break;
          case 'merge':
            output[key] = deepMergeSettings(output[key], source[key], options);
            break;
          case 'replace':
          default:
            output[key] = source[key];
        }
      } else if (typeof source[key] === 'object' && source[key] !== null) {
        output[key] = deepMergeSettings(output[key], source[key], options);
      } else {
        output[key] = source[key];
      }
    }
  }

  return output;
}

/**
 * Generate unique settings ID
 */
export function generateSettingsId(): string {
  return `settings_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format settings value for display
 */
export function formatSettingsValue(value: any, type?: string): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{Object}';
  return String(value);
}

/**
 * Parse settings value from string
 */
export function parseSettingsValue(value: string, type?: string): any {
  if (!value) return null;

  switch (type) {
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1';
    case 'number':
      return parseFloat(value);
    case 'json':
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    case 'array':
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(v => v.trim());
      }
    default:
      return value;
  }
}

/**
 * Get settings schema for a specific section
 */
export function getSectionSchema(section: string): import('./types').SettingsSchema | null {
  const schemas: Record<string, import('./types').SettingsSchema> = {
    profile: {
      id: 'profile',
      version: '1.0.0',
      description: 'User profile settings',
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        email: { type: 'string', format: 'email' },
        timezone: { type: 'string', enum: SettingsConstants.TIMEZONES },
        language: { type: 'string', enum: SettingsConstants.LANGUAGES }
      },
      required: ['name', 'timezone', 'language']
    },
    preferences: {
      id: 'preferences',
      version: '1.0.0',
      description: 'User preferences',
      type: 'object',
      properties: {
        theme: { type: 'string', enum: SettingsConstants.THEMES },
        fontSize: { type: 'string', enum: SettingsConstants.FONT_SIZES },
        density: { type: 'string', enum: SettingsConstants.DENSITY }
      },
      required: ['theme', 'fontSize', 'density']
    },
    features: {
      id: 'features',
      version: '1.0.0',
      description: 'Feature flags',
      type: 'object',
      properties: {
        experimental: { type: 'boolean' },
        betaFeatures: { type: 'boolean' },
        aiFeatures: { type: 'boolean' },
        plugins: { type: 'boolean' }
      }
    }
  };

  return schemas[section] || null;
}