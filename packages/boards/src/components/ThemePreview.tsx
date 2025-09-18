import React from 'react';
import { motion } from 'framer-motion';
import { BoardTheme } from '../types/BoardTypes';

interface ThemePreviewProps {
  theme: BoardTheme;
  name: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  name,
  isActive = false,
  onClick,
  className = ''
}) => {
  return (
    <motion.div
      className={`relative group cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
        isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
      } ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Preview Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: theme.primaryColor }}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: theme.secondaryColor }}
            />
          </div>
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <div className="w-2 h-2 rounded-full bg-gray-400" />
          </div>
        </div>

        {/* Mock Card */}
        <div
          className="p-3 rounded-lg mb-2 shadow-sm"
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${theme.borderColor}`,
            color: theme.textColor
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Sample Card</div>
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primaryColor }} />
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.secondaryColor }} />
            </div>
          </div>
          <div className="text-xs opacity-75">This is a preview of how your cards will look</div>
        </div>

        {/* Mock Column */}
        <div
          className="p-2 rounded"
          style={{
            backgroundColor: `${theme.primaryColor}10`,
            border: `1px solid ${theme.borderColor}`,
            color: theme.textColor
          }}
        >
          <div className="text-xs font-medium mb-1">Column Title</div>
          <div className="text-xs opacity-60">2 cards</div>
        </div>
      </div>

      {/* Overlay */}
      {isActive && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center">
          <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
            Active
          </div>
        </div>
      )}

      {/* Hover Effect */}
      {!isActive && (
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-black bg-opacity-5 transition-all flex items-center justify-center">
          <div className="bg-white px-3 py-1 rounded-lg shadow-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Apply Theme
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ThemePreview;