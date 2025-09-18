// Preference Settings Implementation
// ===================================

import React, { useState, useCallback, useEffect } from 'react';
import { useSettings, usePreferences } from './SettingsProvider';

interface PreferenceSettingsProps {
  className?: string;
  onPreferencesUpdate?: (preferences: any) => void;
}

interface PreferenceFormData {
  theme: 'light' | 'dark' | 'auto' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  density: 'compact' | 'comfortable' | 'spacious';
  sidebar: {
    collapsed: boolean;
    width: number;
    position: 'left' | 'right';
  };
  layout: {
    mode: 'tabs' | 'windows' | 'panels';
    showTabs: boolean;
    showToolbar: boolean;
    showStatusbar: boolean;
  };
  shortcuts: {
    enabled: boolean;
    global: Array<{
      key: string;
      command: string;
      description: string;
    }>;
    contextSensitive: Array<{
      context: string;
      key: string;
      command: string;
      description: string;
    }>;
    custom: Array<{
      key: string;
      command: string;
      description: string;
    }>;
  };
  behavior: {
    autoSave: boolean;
    confirmOnExit: boolean;
    openInNewTab: boolean;
    showTooltips: boolean;
    animations: boolean;
  };
  editor: {
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: boolean;
    lineNumbers: boolean;
    minimap: boolean;
    bracketMatching: boolean;
    autoIndent: boolean;
  };
}

const themeOptions = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'auto', label: 'Auto (System)', icon: '🌓' },
  { value: 'system', label: 'System Default', icon: '⚙️' }
];

const fontSizeOptions = [
  { value: 'small', label: 'Small', size: '12px' },
  { value: 'medium', label: 'Medium', size: '14px' },
  { value: 'large', label: 'Large', size: '16px' },
  { value: 'x-large', label: 'Extra Large', size: '18px' }
];

const densityOptions = [
  { value: 'compact', label: 'Compact', spacing: '8px' },
  { value: 'comfortable', label: 'Comfortable', spacing: '12px' },
  { value: 'spacious', label: 'Spacious', spacing: '16px' }
];

const defaultShortcuts = [
  { key: 'Ctrl+S', command: 'save', description: 'Save current file' },
  { key: 'Ctrl+O', command: 'open', description: 'Open file' },
  { key: 'Ctrl+N', command: 'new', description: 'New file' },
  { key: 'Ctrl+W', command: 'close', description: 'Close current tab' },
  { key: 'Ctrl+T', command: 'new-tab', description: 'New tab' },
  { key: 'Ctrl+Z', command: 'undo', description: 'Undo' },
  { key: 'Ctrl+Y', command: 'redo', description: 'Redo' },
  { key: 'Ctrl+F', command: 'find', description: 'Find' },
  { key: 'Ctrl+R', command: 'replace', description: 'Replace' },
  { key: 'Ctrl+/',' command: 'comment', description: 'Toggle comment' }
];

export function PreferenceSettings({ className = '', onPreferencesUpdate }: PreferenceSettingsProps) {
  const { state, set } = useSettings();
  const { value: preferences, set: setPreferences } = usePreferences();

  const [formData, setFormData] = useState<PreferenceFormData>({
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
      global: defaultShortcuts,
      contextSensitive: [],
      custom: []
    },
    behavior: {
      autoSave: true,
      confirmOnExit: false,
      openInNewTab: false,
      showTooltips: true,
      animations: true
    },
    editor: {
      tabSize: 2,
      insertSpaces: true,
      wordWrap: true,
      lineNumbers: true,
      minimap: false,
      bracketMatching: true,
      autoIndent: true
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'sidebar' | 'shortcuts' | 'editor'>('general');

  useEffect(() => {
    if (preferences) {
      setFormData({
        theme: preferences.theme || 'system',
        fontSize: preferences.fontSize || 'medium',
        density: preferences.density || 'comfortable',
        sidebar: {
          collapsed: preferences.sidebar?.collapsed || false,
          width: preferences.sidebar?.width || 240,
          position: preferences.sidebar?.position || 'left'
        },
        layout: {
          mode: preferences.layout?.mode || 'tabs',
          showTabs: preferences.layout?.showTabs !== false,
          showToolbar: preferences.layout?.showToolbar !== false,
          showStatusbar: preferences.layout?.showStatusbar !== false
        },
        shortcuts: {
          enabled: preferences.shortcuts?.enabled !== false,
          global: preferences.shortcuts?.global || defaultShortcuts,
          contextSensitive: preferences.shortcuts?.contextSensitive || [],
          custom: preferences.shortcuts?.custom || []
        },
        behavior: {
          autoSave: preferences.behavior?.autoSave !== false,
          confirmOnExit: preferences.behavior?.confirmOnExit || false,
          openInNewTab: preferences.behavior?.openInNewTab || false,
          showTooltips: preferences.behavior?.showTooltips !== false,
          animations: preferences.behavior?.animations !== false
        },
        editor: {
          tabSize: preferences.editor?.tabSize || 2,
          insertSpaces: preferences.editor?.insertSpaces !== false,
          wordWrap: preferences.editor?.wordWrap !== false,
          lineNumbers: preferences.editor?.lineNumbers !== false,
          minimap: preferences.editor?.minimap || false,
          bracketMatching: preferences.editor?.bracketMatching !== false,
          autoIndent: preferences.editor?.autoIndent !== false
        }
      });
    }
  }, [preferences]);

  const handleInputChange = useCallback((field: keyof PreferenceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleNestedChange = useCallback((field: string, nestedField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field as keyof PreferenceFormData] as any,
        [nestedField]: value
      }
    }));
  }, []);

  const handleShortcutChange = useCallback((type: 'global' | 'contextSensitive' | 'custom', index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      shortcuts: {
        ...prev.shortcuts,
        [type]: prev.shortcuts[type].map((shortcut, i) =>
          i === index ? { ...shortcut, [field]: value } : shortcut
        )
      }
    }));
  }, []);

  const addCustomShortcut = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      shortcuts: {
        ...prev.shortcuts,
        custom: [
          ...prev.shortcuts.custom,
          { key: '', command: '', description: '' }
        ]
      }
    }));
  }, []);

  const removeCustomShortcut = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      shortcuts: {
        ...prev.shortcuts,
        custom: prev.shortcuts.custom.filter((_, i) => i !== index)
      }
    }));
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate sidebar width
    if (formData.sidebar.width < 120 || formData.sidebar.width > 500) {
      newErrors.sidebarWidth = 'Sidebar width must be between 120px and 500px';
    }

    // Validate shortcuts
    const allKeys = [
      ...formData.shortcuts.global,
      ...formData.shortcuts.contextSensitive,
      ...formData.shortcuts.custom
    ].map(s => s.key).filter(k => k);

    const keyCounts = allKeys.reduce((acc, key) => {
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(keyCounts).forEach(([key, count]) => {
      if (count > 1) {
        newErrors.shortcuts = `Duplicate shortcut key: ${key}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const preferencesData = {
        ...formData,
        updatedAt: Date.now()
      };

      await set('preferences', preferencesData);
      await setPreferences(preferencesData);

      if (onPreferencesUpdate) {
        onPreferencesUpdate(preferencesData);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setErrors(prev => ({ ...prev, form: (error as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (preferences) {
      setFormData({
        theme: preferences.theme || 'system',
        fontSize: preferences.fontSize || 'medium',
        density: preferences.density || 'comfortable',
        sidebar: {
          collapsed: preferences.sidebar?.collapsed || false,
          width: preferences.sidebar?.width || 240,
          position: preferences.sidebar?.position || 'left'
        },
        layout: {
          mode: preferences.layout?.mode || 'tabs',
          showTabs: preferences.layout?.showTabs !== false,
          showToolbar: preferences.layout?.showToolbar !== false,
          showStatusbar: preferences.layout?.showStatusbar !== false
        },
        shortcuts: {
          enabled: preferences.shortcuts?.enabled !== false,
          global: preferences.shortcuts?.global || defaultShortcuts,
          contextSensitive: preferences.shortcuts?.contextSensitive || [],
          custom: preferences.shortcuts?.custom || []
        },
        behavior: {
          autoSave: preferences.behavior?.autoSave !== false,
          confirmOnExit: preferences.behavior?.confirmOnExit || false,
          openInNewTab: preferences.behavior?.openInNewTab || false,
          showTooltips: preferences.behavior?.showTooltips !== false,
          animations: preferences.behavior?.animations !== false
        },
        editor: {
          tabSize: preferences.editor?.tabSize || 2,
          insertSpaces: preferences.editor?.insertSpaces !== false,
          wordWrap: preferences.editor?.wordWrap !== false,
          lineNumbers: preferences.editor?.lineNumbers !== false,
          minimap: preferences.editor?.minimap || false,
          bracketMatching: preferences.editor?.bracketMatching !== false,
          autoIndent: preferences.editor?.autoIndent !== false
        }
      });
    }
    setIsEditing(false);
    setErrors({});
  };

  const renderThemePreview = () => {
    const currentTheme = themeOptions.find(t => t.value === formData.theme);
    return (
      <div className="preference-theme-preview">
        {currentTheme?.icon} {currentTheme?.label}
      </div>
    );
  };

  const renderFontSizePreview = () => {
    const currentSize = fontSizeOptions.find(f => f.value === formData.fontSize);
    return (
      <div className="preference-font-preview" style={{ fontSize: currentSize?.size }}>
        Aa {currentSize?.label}
      </div>
    );
  };

  const renderShortcutList = (type: 'global' | 'contextSensitive' | 'custom', title: string) => {
    const shortcuts = formData.shortcuts[type];
    const isCustom = type === 'custom';

    return (
      <div className="preference-shortcut-section">
        <h4 className="preference-shortcut-title">{title}</h4>
        <div className="preference-shortcut-list">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="preference-shortcut-item">
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={shortcut.key}
                    onChange={(e) => handleShortcutChange(type, index, 'key', e.target.value)}
                    placeholder="Shortcut key"
                    className="preference-shortcut-key"
                  />
                  <input
                    type="text"
                    value={shortcut.command}
                    onChange={(e) => handleShortcutChange(type, index, 'command', e.target.value)}
                    placeholder="Command"
                    className="preference-shortcut-command"
                  />
                  <input
                    type="text"
                    value={shortcut.description}
                    onChange={(e) => handleShortcutChange(type, index, 'description', e.target.value)}
                    placeholder="Description"
                    className="preference-shortcut-description"
                  />
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustomShortcut(index)}
                      className="preference-shortcut-remove"
                    >
                      ×
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className="preference-shortcut-key-display">{shortcut.key || 'Not set'}</span>
                  <span className="preference-shortcut-command-display">{shortcut.command || 'Not set'}</span>
                  <span className="preference-shortcut-description-display">{shortcut.description || 'No description'}</span>
                </>
              )}
            </div>
          ))}
          {isCustom && isEditing && (
            <button
              type="button"
              onClick={addCustomShortcut}
              className="preference-shortcut-add"
            >
              + Add Custom Shortcut
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`preference-settings ${className}`}>
      <div className="preference-settings-header">
        <h2 className="preference-settings-title">Preferences</h2>
        <p className="preference-settings-subtitle">Customize your application experience and interface</p>
      </div>

      {errors.form && (
        <div className="preference-settings-error">
          {errors.form}
        </div>
      )}

      <div className="preference-settings-tabs">
        <button
          type="button"
          className={`preference-tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`preference-tab ${activeTab === 'sidebar' ? 'active' : ''}`}
          onClick={() => setActiveTab('sidebar')}
        >
          Sidebar
        </button>
        <button
          type="button"
          className={`preference-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
          onClick={() => setActiveTab('shortcuts')}
        >
          Shortcuts
        </button>
        <button
          type="button"
          className={`preference-tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          Editor
        </button>
      </div>

      <div className="preference-settings-content">
        {activeTab === 'general' && (
          <div className="preference-tab-content">
            <div className="preference-section">
              <h3 className="preference-section-title">Appearance</h3>
              <div className="preference-form-grid">
                <div className="preference-form-group">
                  <label className="preference-form-label">Theme</label>
                  {isEditing ? (
                    <div className="preference-theme-options">
                      {themeOptions.map(option => (
                        <label key={option.value} className="preference-theme-option">
                          <input
                            type="radio"
                            name="theme"
                            value={option.value}
                            checked={formData.theme === option.value}
                            onChange={(e) => handleInputChange('theme', e.target.value as any)}
                            className="preference-theme-radio"
                          />
                          <span className="preference-theme-option-content">
                            <span className="preference-theme-icon">{option.icon}</span>
                            <span className="preference-theme-label">{option.label}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="preference-value-display">
                      {renderThemePreview()}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Font Size</label>
                  {isEditing ? (
                    <div className="preference-font-options">
                      {fontSizeOptions.map(option => (
                        <label key={option.value} className="preference-font-option">
                          <input
                            type="radio"
                            name="fontSize"
                            value={option.value}
                            checked={formData.fontSize === option.value}
                            onChange={(e) => handleInputChange('fontSize', e.target.value as any)}
                            className="preference-font-radio"
                          />
                          <span className="preference-font-preview" style={{ fontSize: option.size }}>
                            Aa {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="preference-value-display">
                      {renderFontSizePreview()}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Interface Density</label>
                  {isEditing ? (
                    <select
                      value={formData.density}
                      onChange={(e) => handleInputChange('density', e.target.value as any)}
                      className="preference-form-select"
                    >
                      {densityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="preference-value-display">
                      {densityOptions.find(d => d.value === formData.density)?.label}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="preference-section">
              <h3 className="preference-section-title">Layout</h3>
              <div className="preference-form-grid">
                <div className="preference-form-group">
                  <label className="preference-form-label">Layout Mode</label>
                  {isEditing ? (
                    <select
                      value={formData.layout.mode}
                      onChange={(e) => handleNestedChange('layout', 'mode', e.target.value)}
                      className="preference-form-select"
                    >
                      <option value="tabs">Tabs</option>
                      <option value="windows">Windows</option>
                      <option value="panels">Panels</option>
                    </select>
                  ) : (
                    <div className="preference-value-display">
                      {formData.layout.mode.charAt(0).toUpperCase() + formData.layout.mode.slice(1)}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Show Tabs</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.layout.showTabs}
                        onChange={(e) => handleNestedChange('layout', 'showTabs', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.layout.showTabs ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Show Toolbar</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.layout.showToolbar}
                        onChange={(e) => handleNestedChange('layout', 'showToolbar', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.layout.showToolbar ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Show Status Bar</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.layout.showStatusbar}
                        onChange={(e) => handleNestedChange('layout', 'showStatusbar', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.layout.showStatusbar ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="preference-section">
              <h3 className="preference-section-title">Behavior</h3>
              <div className="preference-form-grid">
                <div className="preference-form-group">
                  <label className="preference-form-label">Auto Save</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.behavior.autoSave}
                        onChange={(e) => handleNestedChange('behavior', 'autoSave', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.behavior.autoSave ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Confirm on Exit</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.behavior.confirmOnExit}
                        onChange={(e) => handleNestedChange('behavior', 'confirmOnExit', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.behavior.confirmOnExit ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Open in New Tab</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.behavior.openInNewTab}
                        onChange={(e) => handleNestedChange('behavior', 'openInNewTab', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.behavior.openInNewTab ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Show Tooltips</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.behavior.showTooltips}
                        onChange={(e) => handleNestedChange('behavior', 'showTooltips', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.behavior.showTooltips ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Animations</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.behavior.animations}
                        onChange={(e) => handleNestedChange('behavior', 'animations', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.behavior.animations ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sidebar' && (
          <div className="preference-tab-content">
            <div className="preference-section">
              <h3 className="preference-section-title">Sidebar Settings</h3>
              <div className="preference-form-grid">
                <div className="preference-form-group">
                  <label className="preference-form-label">Collapse Sidebar by Default</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.sidebar.collapsed}
                        onChange={(e) => handleNestedChange('sidebar', 'collapsed', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.sidebar.collapsed ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Sidebar Position</label>
                  {isEditing ? (
                    <div className="preference-radio-group">
                      <label className="preference-radio-label">
                        <input
                          type="radio"
                          name="sidebarPosition"
                          value="left"
                          checked={formData.sidebar.position === 'left'}
                          onChange={(e) => handleNestedChange('sidebar', 'position', e.target.value)}
                          className="preference-radio-input"
                        />
                        Left
                      </label>
                      <label className="preference-radio-label">
                        <input
                          type="radio"
                          name="sidebarPosition"
                          value="right"
                          checked={formData.sidebar.position === 'right'}
                          onChange={(e) => handleNestedChange('sidebar', 'position', e.target.value)}
                          className="preference-radio-input"
                        />
                        Right
                      </label>
                    </div>
                  ) : (
                    <div className="preference-value-display">
                      {formData.sidebar.position.charAt(0).toUpperCase() + formData.sidebar.position.slice(1)}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Sidebar Width</label>
                  {isEditing ? (
                    <>
                      <input
                        type="range"
                        min="120"
                        max="500"
                        step="10"
                        value={formData.sidebar.width}
                        onChange={(e) => handleNestedChange('sidebar', 'width', parseInt(e.target.value))}
                        className="preference-range-input"
                      />
                      <div className="preference-range-value">
                        {formData.sidebar.width}px
                      </div>
                      {errors.sidebarWidth && (
                        <p className="preference-field-error">{errors.sidebarWidth}</p>
                      )}
                    </>
                  ) : (
                    <div className="preference-value-display">
                      {formData.sidebar.width}px
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="preference-tab-content">
            <div className="preference-section">
              <h3 className="preference-section-title">Keyboard Shortcuts</h3>

              <div className="preference-form-group">
                <label className="preference-form-label">Enable Keyboard Shortcuts</label>
                {isEditing ? (
                  <label className="preference-toggle">
                    <input
                      type="checkbox"
                      checked={formData.shortcuts.enabled}
                      onChange={(e) => handleNestedChange('shortcuts', 'enabled', e.target.checked)}
                      className="preference-toggle-input"
                    />
                    <span className="preference-toggle-slider"></span>
                  </label>
                ) : (
                  <div className="preference-value-display">
                    {formData.shortcuts.enabled ? 'Yes' : 'No'}
                  </div>
                )}
              </div>

              {renderShortcutList('global', 'Global Shortcuts')}
              {renderShortcutList('contextSensitive', 'Context-Sensitive Shortcuts')}
              {renderShortcutList('custom', 'Custom Shortcuts')}

              {errors.shortcuts && (
                <p className="preference-field-error">{errors.shortcuts}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="preference-tab-content">
            <div className="preference-section">
              <h3 className="preference-section-title">Editor Settings</h3>
              <div className="preference-form-grid">
                <div className="preference-form-group">
                  <label className="preference-form-label">Tab Size</label>
                  {isEditing ? (
                    <select
                      value={formData.editor.tabSize}
                      onChange={(e) => handleNestedChange('editor', 'tabSize', parseInt(e.target.value))}
                      className="preference-form-select"
                    >
                      <option value="2">2 spaces</option>
                      <option value="4">4 spaces</option>
                      <option value="8">8 spaces</option>
                    </select>
                  ) : (
                    <div className="preference-value-display">
                      {formData.editor.tabSize} spaces
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Insert Spaces Instead of Tabs</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.editor.insertSpaces}
                        onChange={(e) => handleNestedChange('editor', 'insertSpaces', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.editor.insertSpaces ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Word Wrap</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.editor.wordWrap}
                        onChange={(e) => handleNestedChange('editor', 'wordWrap', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.editor.wordWrap ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Show Line Numbers</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.editor.lineNumbers}
                        onChange={(e) => handleNestedChange('editor', 'lineNumbers', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.editor.lineNumbers ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Show Minimap</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.editor.minimap}
                        onChange={(e) => handleNestedChange('editor', 'minimap', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.editor.minimap ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Bracket Matching</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.editor.bracketMatching}
                        onChange={(e) => handleNestedChange('editor', 'bracketMatching', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.editor.bracketMatching ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>

                <div className="preference-form-group">
                  <label className="preference-form-label">Auto Indent</label>
                  {isEditing ? (
                    <label className="preference-toggle">
                      <input
                        type="checkbox"
                        checked={formData.editor.autoIndent}
                        onChange={(e) => handleNestedChange('editor', 'autoIndent', e.target.checked)}
                        className="preference-toggle-input"
                      />
                      <span className="preference-toggle-slider"></span>
                    </label>
                  ) : (
                    <div className="preference-value-display">
                      {formData.editor.autoIndent ? 'Yes' : 'No'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="preference-settings-actions">
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="preference-button preference-button-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || state.loading}
              className="preference-button preference-button-save"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="preference-button preference-button-edit"
          >
            Edit Preferences
          </button>
        )}
      </div>

      <style jsx>{`
        .preference-settings {
          max-width: 1000px;
          margin: 0 auto;
          padding: 24px;
        }

        .preference-settings-header {
          margin-bottom: 32px;
        }

        .preference-settings-title {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 600;
          color: #333;
        }

        .preference-settings-subtitle {
          margin: 0;
          color: #666;
          font-size: 16px;
        }

        .preference-settings-error {
          background: #ffebee;
          color: #c62828;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #ffcdd2;
        }

        .preference-settings-tabs {
          display: flex;
          gap: 2px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
        }

        .preference-tab {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preference-tab:hover {
          color: #333;
          background: #f5f5f5;
        }

        .preference-tab.active {
          color: #2196f3;
          border-bottom-color: #2196f3;
        }

        .preference-settings-content {
          min-height: 400px;
        }

        .preference-tab-content {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .preference-section {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .preference-section-title {
          margin: 0;
          font-size: 18px;
          font-weight: 500;
          color: #333;
        }

        .preference-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .preference-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preference-form-label {
          font-weight: 500;
          font-size: 14px;
          color: #333;
        }

        .preference-form-select,
        .preference-form-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          transition: all 0.2s ease;
        }

        .preference-form-select:focus,
        .preference-form-input:focus {
          outline: none;
          border-color: #2196f3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .preference-value-display {
          padding: 8px 12px;
          color: #666;
          font-size: 14px;
        }

        .preference-toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .preference-toggle-input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .preference-toggle-slider {
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

        .preference-toggle-slider:before {
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

        .preference-toggle-input:checked + .preference-toggle-slider {
          background-color: #2196f3;
        }

        .preference-toggle-input:checked + .preference-toggle-slider:before {
          transform: translateX(20px);
        }

        .preference-theme-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .preference-theme-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preference-theme-option:hover {
          border-color: #2196f3;
        }

        .preference-theme-option input:checked + .preference-theme-option-content {
          border-color: #2196f3;
          background: #e3f2fd;
        }

        .preference-theme-radio {
          position: absolute;
          opacity: 0;
        }

        .preference-theme-option-content {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .preference-theme-icon {
          font-size: 20px;
        }

        .preference-theme-label {
          font-size: 14px;
          font-weight: 500;
        }

        .preference-font-options {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .preference-font-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preference-font-option:hover {
          border-color: #2196f3;
        }

        .preference-font-radio {
          position: absolute;
          opacity: 0;
        }

        .preference-font-preview {
          font-weight: 500;
        }

        .preference-radio-group {
          display: flex;
          gap: 16px;
        }

        .preference-radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #333;
          cursor: pointer;
        }

        .preference-radio-input {
          margin: 0;
        }

        .preference-range-input {
          width: 100%;
        }

        .preference-range-value {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .preference-shortcut-section {
          margin-bottom: 24px;
        }

        .preference-shortcut-title {
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 500;
          color: #333;
        }

        .preference-shortcut-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .preference-shortcut-item {
          display: grid;
          grid-template-columns: 120px 150px 1fr auto;
          gap: 12px;
          align-items: center;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 6px;
        }

        .preference-shortcut-key,
        .preference-shortcut-command,
        .preference-shortcut-description {
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
        }

        .preference-shortcut-key-display,
        .preference-shortcut-command-display,
        .preference-shortcut-description-display {
          font-size: 13px;
          color: #666;
        }

        .preference-shortcut-remove {
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preference-shortcut-add {
          align-self: flex-start;
          padding: 8px 16px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .preference-field-error {
          color: #f44336;
          font-size: 12px;
          margin: 4px 0 0 0;
        }

        .preference-settings-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e0e0e0;
        }

        .preference-button {
          padding: 10px 20px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preference-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .preference-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .preference-button-edit {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .preference-button-edit:hover:not(:disabled) {
          background: #1976d2;
          border-color: #1976d2;
        }

        .preference-button-cancel {
          background: #f5f5f5;
          color: #666;
          border-color: #ddd;
        }

        .preference-button-cancel:hover:not(:disabled) {
          background: #eeeeee;
          border-color: #ccc;
        }

        .preference-button-save {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .preference-button-save:hover:not(:disabled) {
          background: #1976d2;
          border-color: #1976d2;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .preference-settings {
            padding: 16px;
          }

          .preference-settings-title {
            font-size: 24px;
          }

          .preference-settings-tabs {
            flex-wrap: wrap;
            gap: 8px;
          }

          .preference-tab {
            padding: 8px 16px;
            font-size: 13px;
          }

          .preference-form-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .preference-theme-options,
          .preference-font-options {
            grid-template-columns: 1fr;
          }

          .preference-shortcut-item {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .preference-settings-actions {
            flex-direction: column;
          }

          .preference-button {
            width: 100%;
          }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .preference-settings-title {
            color: #ffffff;
          }

          .preference-settings-subtitle {
            color: #b0b0b0;
          }

          .preference-tab {
            color: #b0b0b0;
          }

          .preference-tab:hover {
            color: #ffffff;
            background: #2d2d2d;
          }

          .preference-tab.active {
            color: #64b5f6;
            border-bottom-color: #1976d2;
          }

          .preference-section-title {
            color: #ffffff;
          }

          .preference-form-label {
            color: #ffffff;
          }

          .preference-form-select,
          .preference-form-input {
            background: #2d2d2d;
            border-color: #404040;
            color: #ffffff;
          }

          .preference-form-select:focus,
          .preference-form-input:focus {
            border-color: #64b5f6;
            box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.1);
          }

          .preference-value-display {
            color: #b0b0b0;
          }

          .preference-toggle-slider {
            background-color: #555;
          }

          .preference-toggle-input:checked + .preference-toggle-slider {
            background-color: #1976d2;
          }

          .preference-theme-option {
            border-color: #404040;
            background: #2d2d2d;
          }

          .preference-theme-option:hover {
            border-color: #64b5f6;
          }

          .preference-theme-option input:checked + .preference-theme-option-content {
            border-color: #1976d2;
            background: #1a237e;
          }

          .preference-radio-label {
            color: #ffffff;
          }

          .preference-shortcut-item {
            background: #2d2d2d;
          }

          .preference-shortcut-key,
          .preference-shortcut-command,
          .preference-shortcut-description {
            background: #1e1e1e;
            border-color: #404040;
            color: #ffffff;
          }

          .preference-shortcut-key-display,
          .preference-shortcut-command-display,
          .preference-shortcut-description-display {
            color: #b0b0b0;
          }

          .preference-shortcut-add {
            background: #1976d2;
          }

          .preference-field-error {
            color: #ef9a9a;
          }

          .preference-settings-error {
            background: #4a1010;
            color: #ef9a9a;
            border-color: #c62828;
          }

          .preference-button-cancel {
            background: #2d2d2d;
            color: #b0b0b0;
            border-color: #404040;
          }

          .preference-button-cancel:hover:not(:disabled) {
            background: #3d3d3d;
            border-color: #505050;
          }

          .preference-button-save {
            background: #1976d2;
            color: white;
            border-color: #1976d2;
          }

          .preference-button-save:hover:not(:disabled) {
            background: #1565c0;
            border-color: #1565c0;
          }
        }
      `}</style>
    </div>
  );
}