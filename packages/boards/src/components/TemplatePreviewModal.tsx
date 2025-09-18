import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BoardTemplate } from '../types/BoardTypes';

interface TemplatePreviewModalProps {
  template: BoardTemplate;
  onUse: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

const getCategoryIcon = (category: BoardTemplate['category']) => {
  const icons = {
    'project-management': '📊',
    'software-development': '💻',
    'marketing': '📈',
    'sales': '💼',
    'hr': '👥',
    'operations': '⚙️',
    'personal': '🎯',
    'custom': '🎨'
  };
  return icons[category] || '📋';
};

const getBoardTypeIcon = (boardType: BoardTemplate['boardType']) => {
  const icons = {
    'kanban': '📋',
    'scrum': '🏃',
    'list': '📝',
    'calendar': '📅',
    'timeline': '📊',
    'mindmap': '🧠',
    'gantt': '📈',
    'custom': '🎨'
  };
  return icons[boardType] || '📋';
};

const getCategoryColor = (category: BoardTemplate['category']) => {
  const colors = {
    'project-management': 'bg-blue-100 text-blue-700',
    'software-development': 'bg-purple-100 text-purple-700',
    'marketing': 'bg-green-100 text-green-700',
    'sales': 'bg-orange-100 text-orange-700',
    'hr': 'bg-pink-100 text-pink-700',
    'operations': 'bg-gray-100 text-gray-700',
    'personal': 'bg-yellow-100 text-yellow-700',
    'custom': 'bg-indigo-100 text-indigo-700'
  };
  return colors[category] || 'bg-gray-100 text-gray-700';
};

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  template,
  onUse,
  onClose,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'columns' | 'features'>('overview');

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
          variants={modalVariants}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{getBoardTypeIcon(template.boardType)}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
                    <span className={`inline-block px-3 py-1 text-sm rounded-full ${getCategoryColor(template.category)}`}>
                      {getCategoryIcon(template.category)} {template.category.replace('-', ' ')}
                    </span>
                    {template.isPopular && (
                      <span className="flex items-center text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                        ⭐ Popular
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3">{template.description}</p>

                  {/* Stats */}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {template.usageCount !== undefined && (
                      <span className="flex items-center">
                        👥 {template.usageCount.toLocaleString()} uses
                      </span>
                    )}
                    {template.averageRating !== undefined && (
                      <span className="flex items-center">
                        ⭐ {template.averageRating.toFixed(1)} rating
                      </span>
                    )}
                    <span className="flex items-center">
                      📊 {template.columnCount} columns
                    </span>
                    <span className="flex items-center">
                      🏷️ {template.tags.length} tags
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                disabled={isLoading}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex mt-6 border-b border-gray-200">
              {[
                { id: 'overview', label: 'Overview', icon: '📋' },
                { id: 'columns', label: 'Columns', icon: '📊' },
                { id: 'features', label: 'Features', icon: '⚡' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Preview Image */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Preview</h3>
                  <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden">
                    {template.previewImage ? (
                      <img
                        src={template.previewImage}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-8">
                        <div className="text-6xl mb-4">{getBoardTypeIcon(template.boardType)}</div>
                        <p className="text-gray-500">Preview image not available</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">About this template</h3>
                  <p className="text-gray-600 leading-relaxed">{template.description}</p>
                </div>

                {/* Tags */}
                {template.tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {template.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Use Cases</h3>
                  <ul className="space-y-2 text-gray-600">
                    {template.useCases?.map((useCase, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>{useCase}</span>
                      </li>
                    )) || (
                      <li className="text-gray-500">No specific use cases defined for this template.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'columns' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Board Structure</h3>
                {template.columns && template.columns.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {template.columns.map((column, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: column.color || '#6B7280' }}
                          />
                          <h4 className="font-medium text-gray-900">{column.name}</h4>
                        </div>
                        {column.description && (
                          <p className="text-sm text-gray-600 mb-2">{column.description}</p>
                        )}
                        {column.settings && (
                          <div className="text-xs text-gray-500">
                            {column.settings.wipLimit && (
                              <div>WIP Limit: {column.settings.wipLimit}</div>
                            )}
                            {column.settings.swimlanes && column.settings.swimlanes.length > 0 && (
                              <div>Swimlanes: {column.settings.swimlanes.join(', ')}</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-2">📋</div>
                    <p className="text-gray-600">Column structure not specified</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-6">
                {/* Key Features */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Features</h3>
                  <ul className="space-y-2 text-gray-600">
                    {template.features?.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>{feature}</span>
                      </li>
                    )) || (
                      <li className="text-gray-500">No specific features listed for this template.</li>
                    )}
                  </ul>
                </div>

                {/* Board Type Specific Features */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Board Type</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getBoardTypeIcon(template.boardType)}</span>
                      <div>
                        <h4 className="font-medium text-blue-900 capitalize">{template.boardType}</h4>
                        <p className="text-sm text-blue-700">
                          {template.boardType === 'kanban' && 'Visual workflow management with drag-and-drop cards'}
                          {template.boardType === 'scrum' && 'Agile project management for software development teams'}
                          {template.boardType === 'list' && 'Simple list-based organization'}
                          {template.boardType === 'calendar' && 'Time-based planning and scheduling'}
                          {template.boardType === 'timeline' && 'Chronological view of tasks and milestones'}
                          {template.boardType === 'mindmap' && 'Visual brainstorming and idea organization'}
                          {template.boardType === 'gantt' && 'Project scheduling with dependencies'}
                          {template.boardType === 'custom' && 'Customized board layout and workflow'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customization Options */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Customization</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Fully customizable columns and workflows</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Customizable card fields and properties</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Team collaboration and real-time updates</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span>Analytics and reporting features</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>

              <motion.button
                onClick={onUse}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Board...
                  </div>
                ) : (
                  'Use This Template'
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemplatePreviewModal;