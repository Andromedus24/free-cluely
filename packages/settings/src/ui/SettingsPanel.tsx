// Settings Panel Implementation
// ============================

import React, { useState, useCallback, useEffect } from 'react';
import { useSettings } from './SettingsProvider';
import { SettingsNavigation, SettingsNavigationSearch } from './SettingsNavigation';
import { SettingsForm } from './SettingsForm';

interface SettingsPanelProps {
  className?: string;
  defaultSection?: string;
  showSearch?: boolean;
  compact?: boolean;
  onSectionChange?: (section: string) => void;
}

export function SettingsPanel({
  className = '',
  defaultSection = 'profile',
  showSearch = false,
  compact = false,
  onSectionChange
}: SettingsPanelProps) {
  const { state, save, reset } = useSettings();
  const [activeSection, setActiveSection] = useState(defaultSection);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  useEffect(() => {
    if (onSectionChange) {
      onSectionChange(activeSection);
    }
  }, [activeSection, onSectionChange]);

  const handleSave = useCallback(async () => {
    try {
      await save();
      setShowSaveConfirmation(true);
      setTimeout(() => setShowSaveConfirmation(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [save]);

  const handleReset = useCallback(async () => {
    try {
      await reset();
      setShowResetConfirmation(true);
      setTimeout(() => setShowResetConfirmation(false), 3000);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }, [reset]);

  const handleSectionChange = useCallback((section: string) => {
    setActiveSection(section);
    setSearchQuery('');
  }, []);

  if (compact) {
    return (
      <div className={`settings-panel-compact ${className}`}>
        <SettingsForm
          section={activeSection}
          onSave={handleSave}
          onReset={handleReset}
        />
        <style jsx>{`
          .settings-panel-compact {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          @media (prefers-color-scheme: dark) {
            .settings-panel-compact {
              background: #1e1e1e;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`settings-panel ${className}`}>
      <div className="settings-panel-header">
        <h1 className="settings-panel-title">Settings</h1>
        <div className="settings-panel-actions">
          {state.dirty && (
            <button
              className="settings-button settings-button-save"
              onClick={handleSave}
              disabled={state.loading}
            >
              {state.loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            className="settings-button settings-button-reset"
            onClick={() => setShowResetConfirmation(true)}
            disabled={state.loading}
          >
            Reset
          </button>
        </div>
      </div>

      {showSaveConfirmation && (
        <div className="settings-confirmation settings-confirmation-success">
          ✓ Settings saved successfully
        </div>
      )}

      {showResetConfirmation && (
        <div className="settings-confirmation-dialog">
          <div className="settings-confirmation-content">
            <h3>Reset Settings</h3>
            <p>Are you sure you want to reset all settings to their default values? This action cannot be undone.</p>
            <div className="settings-confirmation-actions">
              <button
                className="settings-button settings-button-cancel"
                onClick={() => setShowResetConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="settings-button settings-button-confirm"
                onClick={handleReset}
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="settings-panel-content">
        {showSearch ? (
          <SettingsNavigationSearch
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            className="settings-panel-navigation"
          />
        ) : (
          <SettingsNavigation
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            className="settings-panel-navigation"
          />
        )}

        <div className="settings-panel-main">
          <SettingsForm
            section={activeSection}
            onSave={handleSave}
            onReset={handleReset}
          />
        </div>
      </div>

      <style jsx>{`
        .settings-panel {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f5f5f5;
        }

        .settings-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          background: white;
          border-bottom: 1px solid #e0e0e0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .settings-panel-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #333;
        }

        .settings-panel-actions {
          display: flex;
          gap: 12px;
        }

        .settings-button {
          padding: 8px 16px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: white;
          color: #333;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .settings-button:hover {
          background: #f0f0f0;
          border-color: #d0d0d0;
        }

        .settings-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .settings-button-save {
          background: #2196f3;
          color: white;
          border-color: #2196f3;
        }

        .settings-button-save:hover:not(:disabled) {
          background: #1976d2;
          border-color: #1976d2;
        }

        .settings-button-reset {
          color: #f44336;
          border-color: #f44336;
        }

        .settings-button-reset:hover:not(:disabled) {
          background: #ffebee;
        }

        .settings-button-cancel {
          background: #f5f5f5;
        }

        .settings-button-confirm {
          background: #f44336;
          color: white;
          border-color: #f44336;
        }

        .settings-button-confirm:hover:not(:disabled) {
          background: #d32f2f;
        }

        .settings-confirmation {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 500;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }

        .settings-confirmation-success {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #4caf50;
        }

        .settings-confirmation-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }

        .settings-confirmation-content {
          background: white;
          padding: 24px;
          border-radius: 8px;
          max-width: 400px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .settings-confirmation-content h3 {
          margin: 0 0 12px 0;
          color: #333;
        }

        .settings-confirmation-content p {
          margin: 0 0 20px 0;
          color: #666;
        }

        .settings-confirmation-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .settings-panel-content {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        .settings-panel-navigation {
          flex-shrink: 0;
        }

        .settings-panel-main {
          flex: 1;
          overflow-y: auto;
          background: white;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .settings-panel {
            height: 100vh;
          }

          .settings-panel-header {
            padding: 16px 20px;
          }

          .settings-panel-title {
            font-size: 20px;
          }

          .settings-panel-actions {
            gap: 8px;
          }

          .settings-button {
            padding: 6px 12px;
            font-size: 13px;
          }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .settings-panel {
            background: #121212;
          }

          .settings-panel-header {
            background: #1e1e1e;
            border-bottom-color: #404040;
          }

          .settings-panel-title {
            color: #ffffff;
          }

          .settings-button {
            background: #2d2d2d;
            color: #ffffff;
            border-color: #404040;
          }

          .settings-button:hover:not(:disabled) {
            background: #3d3d3d;
            border-color: #505050;
          }

          .settings-button-save {
            background: #1976d2;
            color: white;
            border-color: #1976d2;
          }

          .settings-button-save:hover:not(:disabled) {
            background: #1565c0;
            border-color: #1565c0;
          }

          .settings-button-reset {
            color: #f44336;
            border-color: #f44336;
          }

          .settings-button-reset:hover:not(:disabled) {
            background: #4a1010;
          }

          .settings-button-cancel {
            background: #2d2d2d;
          }

          .settings-button-confirm {
            background: #d32f2f;
            color: white;
            border-color: #d32f2f;
          }

          .settings-button-confirm:hover:not(:disabled) {
            background: #c62828;
          }

          .settings-confirmation-success {
            background: #1b5e20;
            color: #81c784;
            border-color: #2e7d32;
          }

          .settings-confirmation-content {
            background: #1e1e1e;
          }

          .settings-confirmation-content h3 {
            color: #ffffff;
          }

          .settings-confirmation-content p {
            color: #b0b0b0;
          }

          .settings-panel-main {
            background: #1e1e1e;
          }
        }
      `}</style>
    </div>
  );
}

// Settings modal component
export function SettingsModal({
  isOpen,
  onClose,
  defaultSection = 'profile',
  className = ''
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: string;
  className?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className={`settings-modal-overlay ${className}`}>
      <div className="settings-modal">
        <div className="settings-modal-header">
          <h2 className="settings-modal-title">Settings</h2>
          <button
            className="settings-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <div className="settings-modal-content">
          <SettingsPanel defaultSection={defaultSection} compact />
        </div>
      </div>

      <style jsx>{`
        .settings-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .settings-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .settings-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e0e0e0;
        }

        .settings-modal-title {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }

        .settings-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #666;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .settings-modal-close:hover {
          background: #f0f0f0;
          color: #333;
        }

        .settings-modal-content {
          flex: 1;
          overflow: hidden;
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .settings-modal {
            background: #1e1e1e;
          }

          .settings-modal-header {
            border-bottom-color: #404040;
          }

          .settings-modal-title {
            color: #ffffff;
          }

          .settings-modal-close {
            color: #b0b0b0;
          }

          .settings-modal-close:hover {
            background: #2d2d2d;
            color: #ffffff;
          }
        }
      `}</style>
    </div>
  );
}

// Settings button component
export function SettingsButton({
  onClick,
  showDirty = true,
  className = ''
}: {
  onClick: () => void;
  showDirty?: boolean;
  className?: string;
}) {
  const { state } = useSettings();

  return (
    <button
      className={`settings-trigger-button ${className}`}
      onClick={onClick}
      aria-label="Open settings"
    >
      <span className="settings-trigger-icon">⚙️</span>
      {showDirty && state.dirty && (
        <span className="settings-trigger-dirty">●</span>
      )}

      <style jsx>{`
        .settings-trigger-button {
          position: relative;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.3);
        }

        .settings-trigger-button:hover {
          background: #1976d2;
          transform: scale(1.05);
        }

        .settings-trigger-icon {
          display: block;
        }

        .settings-trigger-dirty {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #ff9800;
          color: white;
          border-radius: 50%;
          width: 12px;
          height: 12px;
          font-size: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .settings-trigger-button {
            background: #1976d2;
            box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
          }

          .settings-trigger-button:hover {
            background: #1565c0;
          }
        }
      `}</style>
    </button>
  );
}