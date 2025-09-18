import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { Board, CardStyle, ColumnStyle } from '../types/BoardTypes';

interface BoardCustomizationModalProps {
  board: Board;
  onUpdateBoard: (updates: Partial<Board>) => void;
  onClose: () => void;
}

const CARD_STYLES = [
  { value: CardStyle.DEFAULT, label: 'Default', description: 'Standard card layout with all details' },
  { value: CardStyle.COMPACT, label: 'Compact', description: 'Minimal design with essential info only' },
  { value: CardStyle.DETAILED, label: 'Detailed', description: 'Enhanced layout with full metadata' },
  { value: CardStyle.MINIMAL, label: 'Minimal', description: 'Clean design with title only' }
];

const COLUMN_STYLES = [
  { value: ColumnStyle.DEFAULT, label: 'Default', description: 'Standard column with full features' },
  { value: ColumnStyle.MINIMAL, label: 'Minimal', description: 'Clean column with basic styling' },
  { value: ColumnStyle.CARDS, label: 'Cards', description: 'Card-based column design' },
  { value: ColumnStyle.LIST, label: 'List', description: 'List-style column layout' }
];

const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Cyan', value: '#06B6D4' }
];

export const BoardCustomizationModal: React.FC<BoardCustomizationModalProps> = ({
  board,
  onUpdateBoard,
  onClose
}) => {
  const { currentTheme, availableThemes, setTheme, createCustomTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'theme' | 'layout' | 'settings'>('theme');
  const [customThemeName, setCustomThemeName] = useState('');
  const [isCreatingTheme, setIsCreatingTheme] = useState(false);

  const [formData, setFormData] = useState({
    theme: {
      primaryColor: board.theme.primaryColor,
      secondaryColor: board.theme.secondaryColor,
      backgroundColor: board.theme.backgroundColor,
      textColor: board.theme.textColor,
      borderColor: board.theme.borderColor,
      cardStyle: board.theme.cardStyle,
      columnStyle: board.theme.columnStyle
    },
    settings: {
      isPublic: board.settings.isPublic,
      allowComments: board.settings.allowComments,
      allowAttachments: board.settings.allowAttachments,
      allowVoting: board.settings.allowVoting,
      enableNotifications: board.settings.enableNotifications,
      enableAnalytics: board.settings.enableAnalytics,
      enableCollaboration: board.settings.enableCollaboration
    }
  });

  const handleSave = () => {
    onUpdateBoard({
      theme: formData.theme,
      settings: formData.settings
    });

    // Update theme context
    const matchingTheme = availableThemes.find(t =>
      t.theme.primaryColor === formData.theme.primaryColor &&
      t.theme.secondaryColor === formData.theme.secondaryColor
    );

    if (matchingTheme) {
      setTheme(matchingTheme.id);
    } else {
      // Create custom theme with current colors
      createCustomTheme('Custom Theme', 'default');
    }

    onClose();
  };

  const handleColorChange = (colorType: keyof typeof formData.theme, color: string) => {
    setFormData(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [colorType]: color
      }
    }));
  };

  const handleCreateCustomTheme = () => {
    if (!customThemeName.trim()) return;

    createCustomTheme(customThemeName, 'default');
    setCustomThemeName('');
    setIsCreatingTheme(false);
  };

  const handleExportTheme = () => {
    // Find current theme and export it
    const currentThemeData = availableThemes.find(t =>
      t.theme.primaryColor === currentTheme.primaryColor
    );

    if (currentThemeData) {
      const themeData = JSON.stringify({
        name: currentThemeData.name,
        theme: currentThemeData.theme,
        exportedAt: new Date().toISOString()
      }, null, 2);

      const blob = new Blob([themeData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentThemeData.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportTheme = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const themeData = e.target?.result as string;
        const parsed = JSON.parse(themeData);

        // Apply imported theme
        setFormData(prev => ({
          ...prev,
          theme: {
            ...prev.theme,
            ...parsed.theme
          }
        }));
      } catch (error) {
        console.error('Failed to import theme:', error);
        alert('Failed to import theme. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Board Customization</h2>
                <p className="text-gray-600 mt-1">Personalize your board appearance and settings</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                onClick={onClose}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {(['theme', 'layout', 'settings'] as const).map(tab => (
              <motion.button
                key={tab}
                whileHover={{ backgroundColor: '#F3F4F6' }}
                className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {activeTab === tab && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    layoutId="activeTab"
                  />
                )}
              </motion.button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {activeTab === 'theme' && (
              <div className="space-y-6">
                {/* Theme Selection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Theme</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {availableThemes.map(theme => (
                      <motion.button
                        key={theme.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 border-2 rounded-lg text-left transition-colors ${
                          currentTheme.primaryColor === theme.theme.primaryColor &&
                          currentTheme.secondaryColor === theme.theme.secondaryColor
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setTheme(theme.id);
                          setFormData(prev => ({
                            ...prev,
                            theme: theme.theme
                          }));
                        }}
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.theme.primaryColor }}
                          />
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: theme.theme.secondaryColor }}
                          />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{theme.name}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Custom Theme Actions */}
                <div className="flex items-center space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    onClick={() => setIsCreatingTheme(true)}
                  >
                    Create Custom Theme
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    onClick={handleExportTheme}
                  >
                    Export Theme
                  </motion.button>
                  <label className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                    Import Theme
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImportTheme}
                    />
                  </label>
                </div>

                {/* Custom Theme Creation */}
                {isCreatingTheme && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={customThemeName}
                        onChange={(e) => setCustomThemeName(e.target.value)}
                        placeholder="Enter theme name..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        onClick={handleCreateCustomTheme}
                      >
                        Create
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        onClick={() => setIsCreatingTheme(false)}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Color Customization */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Customize Colors</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: 'Primary Color', key: 'primaryColor', value: formData.theme.primaryColor },
                      { label: 'Secondary Color', key: 'secondaryColor', value: formData.theme.secondaryColor },
                      { label: 'Background Color', key: 'backgroundColor', value: formData.theme.backgroundColor },
                      { label: 'Text Color', key: 'textColor', value: formData.theme.textColor },
                      { label: 'Border Color', key: 'borderColor', value: formData.theme.borderColor }
                    ].map(({ label, key, value }) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {label}
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={value}
                            onChange={(e) => handleColorChange(key as keyof typeof formData.theme, e.target.value)}
                            className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleColorChange(key as keyof typeof formData.theme, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Preset colors:</p>
                          <div className="flex space-x-1">
                            {PRESET_COLORS.map(color => (
                              <motion.button
                                key={color.value}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="w-6 h-6 rounded border border-gray-300"
                                style={{ backgroundColor: color.value }}
                                onClick={() => handleColorChange(key as keyof typeof formData.theme, color.value)}
                                title={color.name}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'layout' && (
              <div className="space-y-6">
                {/* Card Style */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Card Style</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CARD_STYLES.map(style => (
                      <motion.button
                        key={style.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 border-2 rounded-lg text-left transition-colors ${
                          formData.theme.cardStyle === style.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, cardStyle: style.value }
                        }))}
                      >
                        <div className="font-medium text-gray-900">{style.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{style.description}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Column Style */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Column Style</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {COLUMN_STYLES.map(style => (
                      <motion.button
                        key={style.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`p-4 border-2 rounded-lg text-left transition-colors ${
                          formData.theme.columnStyle === style.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, columnStyle: style.value }
                        }))}
                      >
                        <div className="font-medium text-gray-900">{style.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{style.description}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Board Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Board Settings</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'isPublic', label: 'Public Board', description: 'Anyone can view this board' },
                      { key: 'allowComments', label: 'Allow Comments', description: 'Users can comment on cards' },
                      { key: 'allowAttachments', label: 'Allow Attachments', description: 'Users can attach files to cards' },
                      { key: 'allowVoting', label: 'Allow Voting', description: 'Users can vote on cards' },
                      { key: 'enableNotifications', label: 'Enable Notifications', description: 'Get notified about board activity' },
                      { key: 'enableAnalytics', label: 'Enable Analytics', description: 'Track board performance metrics' },
                      { key: 'enableCollaboration', label: 'Enable Collaboration', description: 'Real-time collaboration features' }
                    ].map(({ key, label, description }) => (
                      <label key={key} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.settings[key as keyof typeof formData.settings] as boolean}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            settings: { ...prev.settings, [key]: e.target.checked }
                          }))}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{label}</div>
                          <div className="text-sm text-gray-600">{description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={handleSave}
            >
              Save Changes
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BoardCustomizationModal;