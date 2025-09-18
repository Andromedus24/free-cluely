// Settings Navigation Implementation
// ================================

import React from 'react';
import { useSettings } from './SettingsProvider';

interface SettingsNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  className?: string;
}

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  badge?: string;
  beta?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your account information',
    icon: '👤',
    order: 1
  },
  {
    id: 'preferences',
    title: 'Preferences',
    description: 'Customize your experience',
    icon: '⚙️',
    order: 2
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Theme and display settings',
    icon: '🎨',
    order: 3
  },
  {
    id: 'providers',
    title: 'AI Providers',
    description: 'Configure AI model providers',
    icon: '🤖',
    order: 4
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Manage notification preferences',
    icon: '🔔',
    order: 5
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    description: 'Privacy and security settings',
    icon: '🔒',
    order: 6
  },
  {
    id: 'features',
    title: 'Features',
    description: 'Enable/disable features',
    icon: '✨',
    order: 7
  },
  {
    id: 'advanced',
    title: 'Advanced',
    description: 'Advanced settings and tools',
    icon: '🔧',
    order: 8,
    badge: 'Dev'
  },
  {
    id: 'import-export',
    title: 'Import/Export',
    description: 'Backup and restore settings',
    icon: '📤',
    order: 9
  },
  {
    id: 'about',
    title: 'About',
    description: 'App information and help',
    icon: 'ℹ️',
    order: 10
  }
];

export function SettingsNavigation({
  activeSection,
  onSectionChange,
  className = ''
}: SettingsNavigationProps) {
  const { state } = useSettings();

  return (
    <nav className={`settings-navigation ${className}`}>
      <div className="settings-navigation-header">
        <h2 className="settings-navigation-title">Settings</h2>
        <div className="settings-navigation-status">
          {state.dirty && (
            <span className="settings-dirty-indicator" title="Unsaved changes">
              ●
            </span>
          )}
          {state.loading && (
            <span className="settings-loading-indicator" title="Loading...">
              ⟳
            </span>
          )}
        </div>
      </div>

      <div className="settings-navigation-items">
        {navigationItems
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <SettingsNavigationItem
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
            />
          ))}
      </div>

      <style jsx>{`
        .settings-navigation {
          width: 280px;
          border-right: 1px solid #e0e0e0;
          background: #fafafa;
          height: 100%;
          overflow-y: auto;
        }

        .settings-navigation-header {
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .settings-navigation-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #333;
        }

        .settings-navigation-status {
          display: flex;
          gap: 8px;
        }

        .settings-dirty-indicator {
          color: #ff9800;
          font-size: 16px;
          animation: pulse 2s infinite;
        }

        .settings-loading-indicator {
          color: #2196f3;
          font-size: 16px;
          animation: spin 1s linear infinite;
        }

        .settings-navigation-items {
          padding: 8px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .settings-navigation {
            background: #1e1e1e;
            border-right-color: #404040;
          }

          .settings-navigation-header {
            border-bottom-color: #404040;
          }

          .settings-navigation-title {
            color: #ffffff;
          }
        }
      `}</style>
    </nav>
  );
}

interface SettingsNavigationItemProps {
  item: NavigationItem;
  isActive: boolean;
  onClick: () => void;
}

function SettingsNavigationItem({ item, isActive, onClick }: SettingsNavigationItemProps) {
  return (
    <div
      className={`settings-nav-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="settings-nav-item-icon">{item.icon}</div>
      <div className="settings-nav-item-content">
        <div className="settings-nav-item-title">
          {item.title}
          {item.beta && (
            <span className="settings-nav-item-beta">BETA</span>
          )}
        </div>
        <div className="settings-nav-item-description">{item.description}</div>
      </div>
      {item.badge && (
        <div className="settings-nav-item-badge">{item.badge}</div>
      )}

      <style jsx>{`
        .settings-nav-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin: 4px 0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .settings-nav-item:hover {
          background: #f0f0f0;
          border-color: #e0e0e0;
        }

        .settings-nav-item.active {
          background: #e3f2fd;
          border-color: #2196f3;
          box-shadow: 0 2px 4px rgba(33, 150, 243, 0.2);
        }

        .settings-nav-item:focus {
          outline: 2px solid #2196f3;
          outline-offset: 2px;
        }

        .settings-nav-item-icon {
          font-size: 20px;
          margin-right: 12px;
          width: 24px;
          text-align: center;
        }

        .settings-nav-item-content {
          flex: 1;
        }

        .settings-nav-item-title {
          font-weight: 500;
          font-size: 14px;
          color: #333;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .settings-nav-item-description {
          font-size: 12px;
          color: #666;
          line-height: 1.3;
        }

        .settings-nav-item-beta {
          font-size: 10px;
          background: #ff9800;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .settings-nav-item-badge {
          font-size: 11px;
          background: #2196f3;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 600;
          margin-left: 8px;
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .settings-nav-item:hover {
            background: #2d2d2d;
            border-color: #404040;
          }

          .settings-nav-item.active {
            background: #1a237e;
            border-color: #3f51b5;
          }

          .settings-nav-item-title {
            color: #ffffff;
          }

          .settings-nav-item-description {
            color: #b0b0b0;
          }

          .settings-nav-item-beta {
            background: #ff9800;
            color: white;
          }

          .settings-nav-item-badge {
            background: #3f51b5;
            color: white;
          }
        }
      `}</style>
    </div>
  );
}

// Searchable navigation for mobile
export function SettingsNavigationSearch({
  activeSection,
  onSectionChange,
  searchQuery,
  onSearchChange,
  className = ''
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  className?: string;
}) {
  const filteredItems = navigationItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`settings-navigation-search ${className}`}>
      <div className="settings-search-container">
        <input
          type="text"
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="settings-search-input"
        />
        <span className="settings-search-icon">🔍</span>
      </div>

      <div className="settings-search-results">
        {filteredItems.length === 0 ? (
          <div className="settings-search-no-results">
            No settings found for "{searchQuery}"
          </div>
        ) : (
          filteredItems
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <SettingsNavigationItem
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                onClick={() => {
                  onSectionChange(item.id);
                  onSearchChange('');
                }}
              />
            ))
        )}
      </div>

      <style jsx>{`
        .settings-navigation-search {
          width: 100%;
          background: #fafafa;
          border-radius: 8px;
          padding: 16px;
        }

        .settings-search-container {
          position: relative;
          margin-bottom: 16px;
        }

        .settings-search-input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          transition: all 0.2s ease;
        }

        .settings-search-input:focus {
          outline: none;
          border-color: #2196f3;
          box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
        }

        .settings-search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #666;
        }

        .settings-search-results {
          max-height: 400px;
          overflow-y: auto;
        }

        .settings-search-no-results {
          padding: 20px;
          text-align: center;
          color: #666;
          font-style: italic;
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .settings-navigation-search {
            background: #1e1e1e;
          }

          .settings-search-input {
            background: #2d2d2d;
            border-color: #404040;
            color: white;
          }

          .settings-search-no-results {
            color: #b0b0b0;
          }
        }
      `}</style>
    </div>
  );
}