import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Board, BoardType, BoardStatus } from '../types/BoardTypes';

interface BoardSettingsPanelProps {
  board: Board;
  onUpdateBoard: (updates: Partial<Board>) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

const BOARD_TYPES = [
  { value: BoardType.KANBAN, label: 'Kanban', description: 'Visual workflow management' },
  { value: BoardType.SCRUM, label: 'Scrum', description: 'Agile development framework' },
  { value: BoardType.LIST, label: 'List', description: 'Simple task list' },
  { value: BoardType.TIMELINE, label: 'Timeline', description: 'Time-based planning' },
  { value: BoardType.CALENDAR, label: 'Calendar', description: 'Calendar view' },
  { value: BoardType.MINDMAP, label: 'Mind Map', description: 'Visual brainstorming' },
  { value: BoardType.GANTT, label: 'Gantt Chart', description: 'Project timeline' },
  { value: BoardType.CUSTOM, label: 'Custom', description: 'Custom workflow' }
];

const BOARD_STATUSES = [
  { value: BoardStatus.ACTIVE, label: 'Active', color: 'bg-green-500' },
  { value: BoardStatus.ARCHIVED, label: 'Archived', color: 'bg-gray-500' },
  { value: BoardStatus.DRAFT, label: 'Draft', color: 'bg-yellow-500' },
  { value: BoardStatus.TEMPLATE, label: 'Template', color: 'bg-blue-500' }
];

export const BoardSettingsPanel: React.FC<BoardSettingsPanelProps> = ({
  board,
  onUpdateBoard,
  isCollapsed = false,
  onToggleCollapse,
  className = ''
}) => {
  const { currentTheme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<'basic' | 'appearance' | 'permissions' | 'advanced'>('basic');

  if (isCollapsed) {
    return (
      <motion.div
        className={`bg-white border-l border-gray-200 ${className}`}
        initial={{ width: 0 }}
        animate={{ width: 320 }}
        exit={{ width: 0 }}
      >
        <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
              <button
                onClick={onToggleCollapse}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm text-gray-600">Click the settings button to expand this panel</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`bg-white border-l border-gray-200 ${className}`}
      initial={{ width: 0 }}
      animate={{ width: 320 }}
      exit={{ width: 0 }}
    >
      <div className="w-80 h-full bg-white border-l border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Board Settings</h2>
            <button
              onClick={onToggleCollapse}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {(['basic', 'appearance', 'permissions', 'advanced'] as const).map(section => (
              <button
                key={section}
                className={`flex-1 px-3 py-2 text-sm font-medium text-center transition-colors relative ${
                  activeSection === section
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveSection(section)}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
                {activeSection === section && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeSection === 'basic' && (
            <div className="space-y-4">
              {/* Board Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Board Name
                </label>
                <input
                  type="text"
                  value={board.name}
                  onChange={(e) => onUpdateBoard({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Board Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={board.description || ''}
                  onChange={(e) => onUpdateBoard({ description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Board Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Board Type
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {BOARD_TYPES.map(type => (
                    <button
                      key={type.value}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        board.type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => onUpdateBoard({ type: type.value })}
                    >
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Board Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BOARD_STATUSES.map(status => (
                    <button
                      key={status.value}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        board.status === status.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => onUpdateBoard({ status: status.value })}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${status.color}`} />
                        <span className="text-sm font-medium">{status.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-4">
              {/* Current Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Theme
                </label>
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: currentTheme.primaryColor }}
                      />
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: currentTheme.secondaryColor }}
                      />
                      <span className="text-sm font-medium">Custom Theme</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    Primary: {currentTheme.primaryColor}<br />
                    Secondary: {currentTheme.secondaryColor}
                  </div>
                </div>
              </div>

              {/* Quick Theme Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Themes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Default', primary: '#3B82F6', secondary: '#10B981' },
                    { name: 'Dark', primary: '#1F2937', secondary: '#F59E0B' },
                    { name: 'Warm', primary: '#EF4444', secondary: '#F97316' },
                    { name: 'Cool', primary: '#3B82F6', secondary: '#8B5CF6' }
                  ].map(theme => (
                    <button
                      key={theme.name}
                      className="p-2 border border-gray-200 rounded-lg hover:border-gray-300"
                      onClick={() => {
                        onUpdateBoard({
                          theme: {
                            ...board.theme,
                            primaryColor: theme.primary,
                            secondaryColor: theme.secondary
                          }
                        });
                        // Find and apply theme
                        // This would need to be implemented in the theme context
                      }}
                    >
                      <div className="flex items-center space-x-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.primary }}
                        />
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: theme.secondary }}
                        />
                        <span className="text-xs">{theme.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Style
                </label>
                <select
                  value={board.theme.cardStyle}
                  onChange={(e) => onUpdateBoard({
                    theme: { ...board.theme, cardStyle: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">Default</option>
                  <option value="compact">Compact</option>
                  <option value="detailed">Detailed</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              {/* Column Style */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Column Style
                </label>
                <select
                  value={board.theme.columnStyle}
                  onChange={(e) => onUpdateBoard({
                    theme: { ...board.theme, columnStyle: e.target.value as any }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="default">Default</option>
                  <option value="minimal">Minimal</option>
                  <option value="cards">Cards</option>
                  <option value="list">List</option>
                </select>
              </div>
            </div>
          )}

          {activeSection === 'permissions' && (
            <div className="space-y-4">
              {/* Public/Private */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={board.settings.isPublic}
                    onChange={(e) => onUpdateBoard({
                      settings: { ...board.settings, isPublic: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Public Board
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Anyone with the link can view this board
                </p>
              </div>

              {/* Allow Comments */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={board.settings.allowComments}
                    onChange={(e) => onUpdateBoard({
                      settings: { ...board.settings, allowComments: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Allow Comments
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Users can comment on cards
                </p>
              </div>

              {/* Allow Attachments */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={board.settings.allowAttachments}
                    onChange={(e) => onUpdateBoard({
                      settings: { ...board.settings, allowAttachments: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Allow Attachments
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Users can attach files to cards
                </p>
              </div>

              {/* Allow Voting */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={board.settings.allowVoting}
                    onChange={(e) => onUpdateBoard({
                      settings: { ...board.settings, allowVoting: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Allow Voting
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Users can vote on cards
                </p>
              </div>
            </div>
          )}

          {activeSection === 'advanced' && (
            <div className="space-y-4">
              {/* Enable Notifications */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={board.settings.enableNotifications}
                    onChange={(e) => onUpdateBoard({
                      settings: { ...board.settings, enableNotifications: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Notifications
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Send notifications for board activity
                </p>
              </div>

              {/* Enable Analytics */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={board.settings.enableAnalytics}
                    onChange={(e) => onUpdateBoard({
                      settings: { ...board.settings, enableAnalytics: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Analytics
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Track board performance metrics
                </p>
              </div>

              {/* Enable Collaboration */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={board.settings.enableCollaboration}
                    onChange={(e) => onUpdateBoard({
                      settings: { ...board.settings, enableCollaboration: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Enable Collaboration
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Real-time collaboration features
                </p>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-red-600 mb-3">Danger Zone</h3>
                <div className="space-y-2">
                  <button
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Are you sure you want to archive this board?')) {
                        onUpdateBoard({ status: BoardStatus.ARCHIVED });
                      }
                    }}
                  >
                    Archive Board
                  </button>
                  <button
                    className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
                        // Handle delete
                      }
                    }}
                  >
                    Delete Board
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BoardSettingsPanel;