import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BoardTemplate } from '../types/BoardTypes';

interface TemplateCardProps {
  template: BoardTemplate;
  onClick: () => void;
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

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onClick,
  isLoading = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    if (!isLoading) {
      onClick();
    }
  };

  return (
    <motion.div
      className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300 hover:shadow-md'
      }`}
      whileHover={!isLoading ? { scale: 1.02 } : {}}
      whileTap={!isLoading ? { scale: 0.98 } : {}}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getBoardTypeIcon(template.boardType)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">
              {template.name}
            </h3>
            <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${getCategoryColor(template.category)}`}>
              {getCategoryIcon(template.category)} {template.category.replace('-', ' ')}
            </span>
          </div>
        </div>

        {template.isPopular && (
          <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
            ⭐ Popular
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {template.description}
      </p>

      {/* Template Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <div className="flex items-center space-x-3">
          {template.usageCount !== undefined && (
            <span className="flex items-center">
              👥 {template.usageCount.toLocaleString()}
            </span>
          )}
          {template.averageRating !== undefined && (
            <span className="flex items-center">
              ⭐ {template.averageRating.toFixed(1)}
            </span>
          )}
        </div>
        <span className="text-xs">
          {template.columnCount} columns
        </span>
      </div>

      {/* Tags */}
      {template.tags.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
              >
                #{tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Preview Image or Fallback */}
      <div className="aspect-video bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
        {template.previewImage ? (
          <img
            src={template.previewImage}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-4">
            <div className="text-4xl mb-2">{getBoardTypeIcon(template.boardType)}</div>
            <p className="text-xs text-gray-500">Preview not available</p>
          </div>
        )}
      </div>

      {/* Action Button */}
      <motion.button
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          isLoading
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        whileHover={!isLoading ? { scale: 1.02 } : {}}
        whileTap={!isLoading ? { scale: 0.98 } : {}}
        disabled={isLoading}
        onClick={(e) => {
          e.stopPropagation();
          handleCardClick();
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </div>
        ) : (
          'Use Template'
        )}
      </motion.button>

      {/* Hover Effect Overlay */}
      {isHovered && !isLoading && (
        <motion.div
          className="absolute inset-0 bg-blue-50 bg-opacity-90 rounded-lg flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <span className="text-blue-700 font-medium text-sm">Click to preview</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TemplateCard;