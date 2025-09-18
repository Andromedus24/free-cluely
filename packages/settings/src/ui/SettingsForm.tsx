// Settings Form Implementation
// =============================

import React, { useState, useCallback, useEffect } from 'react';
import { useSettings } from './SettingsProvider';

interface SettingsFormProps {
  section: string;
  onSave: () => void;
  onReset: () => void;
  className?: string;
}

interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'toggle' | 'textarea' | 'color' | 'date' | 'time' | 'range';
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

const formSections: Record<string, FormSection> = {
  profile: {
    id: 'profile',
    title: 'Profile Settings',
    description: 'Manage your personal information and account preferences',
    fields: [
      {
        id: 'name',
        name: 'profile.name',
        type: 'text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        required: true,
        validation: { minLength: 2, maxLength: 100 }
      },
      {
        id: 'email',
        name: 'profile.email',
        type: 'email',
        label: 'Email Address',
        placeholder: 'your.email@example.com',
        validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
      },
      {
        id: 'timezone',
        name: 'profile.timezone',
        type: 'select',
        label: 'Timezone',
        options: [
          { value: 'UTC', label: 'UTC' },
          { value: 'America/New_York', label: 'Eastern Time (ET)' },
          { value: 'America/Chicago', label: 'Central Time (CT)' },
          { value: 'America/Denver', label: 'Mountain Time (MT)' },
          { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
          { value: 'Europe/London', label: 'London' },
          { value: 'Europe/Paris', label: 'Paris' },
          { value: 'Asia/Tokyo', label: 'Tokyo' },
          { value: 'Asia/Shanghai', label: 'Shanghai' }
        ]
      },
      {
        id: 'language',
        name: 'profile.language',
        type: 'select',
        label: 'Language',
        options: [
          { value: 'en', label: 'English' },
          { value: 'es', label: 'Español' },
          { value: 'fr', label: 'Français' },
          { value: 'de', label: 'Deutsch' },
          { value: 'it', label: 'Italiano' },
          { value: 'pt', label: 'Português' },
          { value: 'ru', label: 'Русский' },
          { value: 'ja', label: '日本語' },
          { value: 'ko', label: '한국어' },
          { value: 'zh', label: '中文' }
        ]
      }
    ]
  },
  preferences: {
    id: 'preferences',
    title: 'Preferences',
    description: 'Customize your application experience',
    fields: [
      {
        id: 'theme',
        name: 'preferences.theme',
        type: 'select',
        label: 'Theme',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto (System)' },
          { value: 'system', label: 'System Default' }
        ]
      },
      {
        id: 'fontSize',
        name: 'preferences.fontSize',
        type: 'select',
        label: 'Font Size',
        options: [
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' },
          { value: 'x-large', label: 'Extra Large' }
        ]
      },
      {
        id: 'density',
        name: 'preferences.density',
        type: 'select',
        label: 'Interface Density',
        options: [
          { value: 'compact', label: 'Compact' },
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'spacious', label: 'Spacious' }
        ]
      },
      {
        id: 'sidebar.collapsed',
        name: 'preferences.sidebar.collapsed',
        type: 'toggle',
        label: 'Collapse Sidebar by Default'
      },
      {
        id: 'sidebar.width',
        name: 'preferences.sidebar.width',
        type: 'range',
        label: 'Sidebar Width',
        min: 180,
        max: 400,
        step: 10,
        defaultValue: 240
      },
      {
        id: 'sidebar.position',
        name: 'preferences.sidebar.position',
        type: 'select',
        label: 'Sidebar Position',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' }
        ]
      },
      {
        id: 'shortcuts.enabled',
        name: 'preferences.shortcuts.enabled',
        type: 'toggle',
        label: 'Enable Keyboard Shortcuts'
      }
    ]
  },
  appearance: {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize colors, fonts, and visual elements',
    fields: [
      {
        id: 'colors.primary',
        name: 'appearance.colors.primary',
        type: 'color',
        label: 'Primary Color',
        defaultValue: '#1976d2'
      },
      {
        id: 'colors.secondary',
        name: 'appearance.colors.secondary',
        type: 'color',
        label: 'Secondary Color',
        defaultValue: '#dc004e'
      },
      {
        id: 'colors.accent',
        name: 'appearance.colors.accent',
        type: 'color',
        label: 'Accent Color',
        defaultValue: '#7c4dff'
      },
      {
        id: 'typography.fontFamily',
        name: 'appearance.typography.fontFamily',
        type: 'text',
        label: 'Font Family',
        placeholder: 'Inter, system-ui, sans-serif',
        defaultValue: 'Inter, system-ui, sans-serif'
      },
      {
        id: 'typography.fontSize',
        name: 'appearance.typography.fontSize',
        type: 'number',
        label: 'Base Font Size (px)',
        min: 12,
        max: 24,
        defaultValue: 16
      },
      {
        id: 'typography.lineHeight',
        name: 'appearance.typography.lineHeight',
        type: 'number',
        label: 'Line Height',
        min: 1.0,
        max: 2.0,
        step: 0.1,
        defaultValue: 1.5
      },
      {
        id: 'animations.enabled',
        name: 'appearance.animations.enabled',
        type: 'toggle',
        label: 'Enable Animations',
        defaultValue: true
      },
      {
        id: 'animations.duration',
        name: 'appearance.animations.duration',
        type: 'number',
        label: 'Animation Duration (ms)',
        min: 0,
        max: 1000,
        step: 50,
        defaultValue: 300
      },
      {
        id: 'animations.reducedMotion',
        name: 'appearance.animations.reducedMotion',
        type: 'toggle',
        label: 'Reduce Motion',
        description: 'Minimize animations for accessibility'
      }
    ]
  },
  features: {
    id: 'features',
    title: 'Features',
    description: 'Enable or disable application features',
    fields: [
      {
        id: 'experimental',
        name: 'features.experimental',
        type: 'toggle',
        label: 'Experimental Features',
        description: 'Enable early access to experimental features'
      },
      {
        id: 'betaFeatures',
        name: 'features.betaFeatures',
        type: 'toggle',
        label: 'Beta Features',
        description: 'Enable beta features for testing'
      },
      {
        id: 'aiFeatures',
        name: 'features.aiFeatures',
        type: 'toggle',
        label: 'AI Features',
        description: 'Enable AI-powered features and suggestions',
        defaultValue: true
      },
      {
        id: 'plugins',
        name: 'features.plugins',
        type: 'toggle',
        label: 'Plugin System',
        description: 'Enable plugin support',
        defaultValue: true
      },
      {
        id: 'workflows',
        name: 'features.workflows',
        type: 'toggle',
        label: 'Workflows',
        description: 'Enable workflow automation'
      },
      {
        id: 'collaboration',
        name: 'features.collaboration',
        type: 'toggle',
        label: 'Collaboration',
        description: 'Enable real-time collaboration features'
      },
      {
        id: 'analytics',
        name: 'features.analytics',
        type: 'toggle',
        label: 'Analytics',
        description: 'Enable usage analytics and reporting',
        defaultValue: true
      },
      {
        id: 'notifications',
        name: 'features.notifications',
        type: 'toggle',
        label: 'Notifications',
        description: 'Enable notification system',
        defaultValue: true
      },
      {
        id: 'offline',
        name: 'features.offline',
        type: 'toggle',
        label: 'Offline Mode',
        description: 'Enable offline functionality',
        defaultValue: true
      }
    ]
  },
  providers: {
    id: 'providers',
    title: 'AI Providers',
    description: 'Configure AI model providers and settings',
    fields: [
      {
        id: 'defaultProvider',
        name: 'providers.defaultProvider',
        type: 'select',
        label: 'Default Provider',
        options: [
          { value: 'openai', label: 'OpenAI' },
          { value: 'anthropic', label: 'Anthropic' },
          { value: 'google', label: 'Google Gemini' },
          { value: 'ollama', label: 'Ollama' }
        ]
      },
      {
        id: 'moderation.enabled',
        name: 'providers.moderation.enabled',
        type: 'toggle',
        label: 'Enable Content Moderation',
        defaultValue: true
      },
      {
        id: 'moderation.provider',
        name: 'providers.moderation.provider',
        type: 'select',
        label: 'Moderation Provider',
        options: [
          { value: 'openai', label: 'OpenAI' },
          { value: 'anthropic', label: 'Anthropic' }
        ]
      },
      {
        id: 'moderation.sensitivity',
        name: 'providers.moderation.sensitivity',
        type: 'select',
        label: 'Sensitivity Level',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' }
        ]
      }
    ]
  },
  notifications: {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage notification preferences and delivery',
    fields: [
      {
        id: 'enabled',
        name: 'notifications.enabled',
        type: 'toggle',
        label: 'Enable Notifications',
        defaultValue: true
      },
      {
        id: 'desktop.enabled',
        name: 'notifications.channels[0].enabled',
        type: 'toggle',
        label: 'Desktop Notifications',
        defaultValue: true
      },
      {
        id: 'quietHours.enabled',
        name: 'notifications.quietHours.enabled',
        type: 'toggle',
        label: 'Quiet Hours'
      },
      {
        id: 'quietHours.start',
        name: 'notifications.quietHours.start',
        type: 'time',
        label: 'Quiet Hours Start',
        defaultValue: '22:00'
      },
      {
        id: 'quietHours.end',
        name: 'notifications.quietHours.end',
        type: 'time',
        label: 'Quiet Hours End',
        defaultValue: '08:00'
      },
      {
        id: 'frequency.minInterval',
        name: 'notifications.frequency.minInterval',
        type: 'number',
        label: 'Minimum Interval (ms)',
        min: 100,
        max: 300000,
        step: 100,
        defaultValue: 1000
      }
    ]
  },
  privacy: {
    id: 'privacy',
    title: 'Privacy & Security',
    description: 'Manage your privacy and security settings',
    fields: [
      {
        id: 'dataCollection',
        name: 'privacy.dataCollection',
        type: 'toggle',
        label: 'Data Collection',
        description: 'Allow anonymous data collection for improvement'
      },
      {
        id: 'analytics',
        name: 'privacy.analytics',
        type: 'toggle',
        label: 'Usage Analytics',
        description: 'Collect usage analytics'
      },
      {
        id: 'crashReporting',
        name: 'privacy.crashReporting',
        type: 'toggle',
        label: 'Crash Reporting',
        description: 'Send crash reports automatically',
        defaultValue: true
      },
      {
        id: 'telemetry',
        name: 'privacy.telemetry',
        type: 'toggle',
        label: 'Telemetry',
        description: 'Send performance and usage telemetry'
      },
      {
        id: 'retention.chatHistory',
        name: 'privacy.retention.chatHistory',
        type: 'number',
        label: 'Chat History Retention (days)',
        min: 1,
        max: 365,
        defaultValue: 90
      },
      {
        id: 'retention.files',
        name: 'privacy.retention.files',
        type: 'number',
        label: 'File Retention (days)',
        min: 1,
        max: 365,
        defaultValue: 30
      }
    ]
  },
  advanced: {
    id: 'advanced',
    title: 'Advanced Settings',
    description: 'Advanced configuration and developer options',
    fields: [
      {
        id: 'developer.mode',
        name: 'advanced.developer.mode',
        type: 'toggle',
        label: 'Developer Mode'
      },
      {
        id: 'developer.console.level',
        name: 'advanced.developer.console.level',
        type: 'select',
        label: 'Console Log Level',
        options: [
          { value: 'error', label: 'Error' },
          { value: 'warn', label: 'Warning' },
          { value: 'info', label: 'Info' },
          { value: 'debug', label: 'Debug' }
        ]
      },
      {
        id: 'debugging.enabled',
        name: 'advanced.debugging.enabled',
        type: 'toggle',
        label: 'Debug Mode'
      },
      {
        id: 'debugging.level',
        name: 'advanced.debugging.level',
        type: 'select',
        label: 'Debug Level',
        options: [
          { value: 'error', label: 'Error' },
          { value: 'warn', label: 'Warning' },
          { value: 'info', label: 'Info' },
          { value: 'debug', label: 'Debug' }
        ]
      },
      {
        id: 'performance.monitoring',
        name: 'advanced.performance.monitoring',
        type: 'toggle',
        label: 'Performance Monitoring'
      },
      {
        id: 'cache.enabled',
        name: 'advanced.performance.cache.enabled',
        type: 'toggle',
        label: 'Enable Caching',
        defaultValue: true
      },
      {
        id: 'cache.size',
        name: 'advanced.performance.cache.size',
        type: 'number',
        label: 'Cache Size (MB)',
        min: 10,
        max: 1000,
        defaultValue: 50
      }
    ]
  }
};

export function SettingsForm({ section, onSave, onReset, className = '' }: SettingsFormProps) {
  const { state, get, set } = useSettings();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const formSection = formSections[section];

  useEffect(() => {
    const loadFormData = async () => {
      if (!formSection) return;

      const data: Record<string, any> = {};
      for (const field of formSection.fields) {
        try {
          const value = await get(field.name);
          data[field.id] = value !== undefined ? value : field.defaultValue;
        } catch (error) {
          console.error(`Failed to load field ${field.name}:`, error);
          data[field.id] = field.defaultValue;
        }
      }
      setFormData(data);
    };

    loadFormData();
  }, [section, formSection, get]);

  const handleFieldChange = useCallback(async (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));

    // Clear error when field changes
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }

    // Try to save the value
    try {
      const field = formSection?.fields.find(f => f.id === fieldId);
      if (field) {
        await set(field.name, value);
      }
    } catch (error) {
      console.error(`Failed to save field ${fieldId}:`, error);
      setErrors(prev => ({ ...prev, [fieldId]: (error as Error).message }));
    }
  }, [set, formSection, errors]);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }

    if (field.validation) {
      const { pattern, minLength, maxLength, min, max } = field.validation;

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return `${field.label} format is invalid`;
        }
      }

      if (minLength && typeof value === 'string' && value.length < minLength) {
        return `${field.label} must be at least ${minLength} characters`;
      }

      if (maxLength && typeof value === 'string' && value.length > maxLength) {
        return `${field.label} must be at most ${maxLength} characters`;
      }

      if (min !== undefined && typeof value === 'number' && value < min) {
        return `${field.label} must be at least ${min}`;
      }

      if (max !== undefined && typeof value === 'number' && value > max) {
        return `${field.label} must be at most ${max}`;
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    if (!formSection) return true;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    for (const field of formSection.fields) {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onSave();
    } catch (error) {
      console.error('Failed to save settings:', error);
      setErrors(prev => ({ ...prev, form: (error as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await onReset();
      // Reload form data
      const data: Record<string, any> = {};
      if (formSection) {
        for (const field of formSection.fields) {
          try {
            const value = await get(field.name);
            data[field.id] = value !== undefined ? value : field.defaultValue;
          } catch (error) {
            data[field.id] = field.defaultValue;
          }
        }
      }
      setFormData(data);
      setErrors({});
    } catch (error) {
      console.error('Failed to reset settings:', error);
      setErrors(prev => ({ ...prev, form: (error as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    const commonProps = {
      id: field.id,
      name: field.id,
      value: value ?? field.defaultValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const newValue = field.type === 'checkbox' || field.type === 'toggle'
          ? (e.target as HTMLInputElement).checked
          : e.target.value;

        // Convert to number for number and range types
        const processedValue = (field.type === 'number' || field.type === 'range')
          ? parseFloat(newValue)
          : newValue;

        handleFieldChange(field.id, processedValue);
      },
      onBlur: () => {
        const validationError = validateField(field, value);
        if (validationError) {
          setErrors(prev => ({ ...prev, [field.id]: validationError }));
        }
      },
      placeholder: field.placeholder,
      required: field.required,
      min: field.min,
      max: field.max,
      step: field.step,
      className: `settings-form-field ${error ? 'settings-form-field-error' : ''}`
    };

    let fieldElement;

    switch (field.type) {
      case 'textarea':
        fieldElement = (
          <textarea
            {...commonProps}
            className={`${commonProps.className} settings-form-textarea`}
            rows={4}
          />
        );
        break;
      case 'select':
        fieldElement = (
          <select {...commonProps} className={`${commonProps.className} settings-form-select`}>
            <option value="">Select an option</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        break;
      case 'toggle':
        fieldElement = (
          <label className="settings-form-toggle">
            <input
              type="checkbox"
              checked={commonProps.value}
              onChange={commonProps.onChange}
              className="settings-form-toggle-input"
            />
            <span className="settings-form-toggle-slider"></span>
          </label>
        );
        break;
      case 'checkbox':
        fieldElement = (
          <input
            type="checkbox"
            {...commonProps}
            className={`${commonProps.className} settings-form-checkbox`}
          />
        );
        break;
      case 'color':
        fieldElement = (
          <input
            type="color"
            {...commonProps}
            className={`${commonProps.className} settings-form-color`}
          />
        );
        break;
      default:
        fieldElement = (
          <input
            type={field.type}
            {...commonProps}
            className={`${commonProps.className} settings-form-input`}
          />
        );
    }

    return (
      <div key={field.id} className="settings-form-field-container">
        <label htmlFor={field.id} className="settings-form-label">
          {field.label}
          {field.required && <span className="settings-form-required">*</span>}
        </label>
        {field.description && (
          <p className="settings-form-description">{field.description}</p>
        )}
        {fieldElement}
        {error && <p className="settings-form-error">{error}</p>}
        {(field.type === 'range' || field.type === 'number') && value !== undefined && (
          <p className="settings-form-value-display">Current value: {value}</p>
        )}
      </div>
    );
  };

  if (!formSection) {
    return (
      <div className={`settings-form-not-found ${className}`}>
        <h2>Section Not Found</h2>
        <p>The settings section "{section}" could not be found.</p>
        <style jsx>{`
          .settings-form-not-found {
            padding: 40px;
            text-align: center;
            color: #666;
          }
          .settings-form-not-found h2 {
            margin: 0 0 16px 0;
            color: #333;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`settings-form ${className}`}>
      <div className="settings-form-header">
        <h2 className="settings-form-title">{formSection.title}</h2>
        {formSection.description && (
          <p className="settings-form-description">{formSection.description}</p>
        )}
      </div>

      {errors.form && (
        <div className="settings-form-error-message">
          {errors.form}
        </div>
      )}

      <div className="settings-form-content">
        {formSection.fields.map(renderField)}
      </div>

      <div className="settings-form-actions">
        <button
          type="button"
          onClick={handleReset}
          disabled={loading || state.loading}
          className="settings-form-button settings-form-button-reset"
        >
          {loading ? 'Resetting...' : 'Reset to Defaults'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || state.loading || !state.dirty}
          className="settings-form-button settings-form-button-save"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style jsx>{`
        .settings-form {
          padding: 24px;
          max-width: 800px;
        }

        .settings-form-header {
          margin-bottom: 32px;
        }

        .settings-form-title {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          color: #333;
        }

        .settings-form-description {
          margin: 0;
          color: #666;
          font-size: 14px;
          line-height: 1.5;
        }

        .settings-form-content {
          display: grid;
          gap: 24px;
        }

        .settings-form-field-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .settings-form-label {
          font-weight: 500;
          font-size: 14px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .settings-form-required {
          color: #f44336;
          font-weight: bold;
        }

        .settings-form-description {
          font-size: 12px;
          color: #666;
          margin: 0;
          line-height: 1.4;
        }

        .settings-form-input,
        .settings-form-select,
        .settings-form-textarea {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: white;
        }

        .settings-form-input:focus,
        .settings-form-select:focus,
        .settings-form-textarea:focus {
          outline: none;
          border-color: #2196f3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .settings-form-field-error {
          border-color: #f44336 !important;
        }

        .settings-form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .settings-form-toggle {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .settings-form-toggle-input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .settings-form-toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
          border-radius: 24px;
        }

        .settings-form-toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
          border-radius: 50%;
        }

        .settings-form-toggle-input:checked + .settings-form-toggle-slider {
          background-color: #2196f3;
        }

        .settings-form-toggle-input:checked + .settings-form-toggle-slider:before {
          transform: translateX(26px);
        }

        .settings-form-checkbox {
          width: 18px;
          height: 18px;
          accent-color: #2196f3;
        }

        .settings-form-color {
          width: 60px;
          height: 40px;
          border: 1px solid #ddd;
          border-radius: 6px;
          cursor: pointer;
        }

        .settings-form-error {
          color: #f44336;
          font-size: 12px;
          margin: 2px 0 0 0;
        }

        .settings-form-error-message {
          background: #ffebee;
          color: #c62828;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 14px;
          border: 1px solid #ffcdd2;
        }

        .settings-form-value-display {
          font-size: 12px;
          color: #666;
          margin: 2px 0 0 0;
        }

        .settings-form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e0e0e0;
        }

        .settings-form-button {
          padding: 10px 20px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .settings-form-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .settings-form-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .settings-form-button-reset {
          background: #f5f5f5;
          color: #666;
          border-color: #ddd;
        }

        .settings-form-button-reset:hover:not(:disabled) {
          background: #eeeeee;
          border-color: #ccc;
        }

        .settings-form-button-save {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .settings-form-button-save:hover:not(:disabled) {
          background: #1976d2;
          border-color: #1976d2;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .settings-form {
            padding: 16px;
          }

          .settings-form-title {
            font-size: 20px;
          }

          .settings-form-actions {
            flex-direction: column;
          }

          .settings-form-button {
            width: 100%;
          }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .settings-form-title {
            color: #ffffff;
          }

          .settings-form-description {
            color: #b0b0b0;
          }

          .settings-form-label {
            color: #ffffff;
          }

          .settings-form-input,
          .settings-form-select,
          .settings-form-textarea {
            background: #2d2d2d;
            border-color: #404040;
            color: #ffffff;
          }

          .settings-form-input:focus,
          .settings-form-select:focus,
          .settings-form-textarea:focus {
            border-color: #64b5f6;
            box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.1);
          }

          .settings-form-toggle-slider {
            background-color: #555;
          }

          .settings-form-toggle-input:checked + .settings-form-toggle-slider {
            background-color: #1976d2;
          }

          .settings-form-color {
            border-color: #404040;
          }

          .settings-form-value-display {
            color: #b0b0b0;
          }

          .settings-form-error-message {
            background: #4a1010;
            color: #ef9a9a;
            border-color: #c62828;
          }

          .settings-form-button-reset {
            background: #2d2d2d;
            color: #b0b0b0;
            border-color: #404040;
          }

          .settings-form-button-reset:hover:not(:disabled) {
            background: #3d3d3d;
            border-color: #505050;
          }

          .settings-form-button-save {
            background: #1976d2;
            color: white;
            border-color: #1976d2;
          }

          .settings-form-button-save:hover:not(:disabled) {
            background: #1565c0;
            border-color: #1565c0;
          }
        }
      `}</style>
    </div>
  );
}