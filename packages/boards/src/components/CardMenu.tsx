import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../types/BoardTypes';

interface CardMenuProps {
  card: Card;
  isVisible: boolean;
  onShowMenu: (show: boolean) => void;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export const CardMenu: React.FC<CardMenuProps> = ({
  card,
  isVisible,
  onShowMenu,
  className = ''
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems: MenuItem[] = [
    {
      id: 'edit',
      label: 'Edit Card',
      icon: '✏️',
      action: () => console.log('Edit card:', card.id)
    },
    {
      id: 'copy',
      label: 'Copy Card',
      icon: '📋',
      action: () => console.log('Copy card:', card.id)
    },
    {
      id: 'move',
      label: 'Move Card',
      icon: '↗️',
      action: () => console.log('Move card:', card.id)
    },
    {
      id: 'archive',
      label: 'Archive Card',
      icon: '📦',
      action: () => console.log('Archive card:', card.id)
    },
    {
      id: 'delete',
      label: 'Delete Card',
      icon: '🗑️',
      action: () => console.log('Delete card:', card.id),
      danger: true
    }
  ];

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        onShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onShowMenu]);

  // Show dropdown when menu becomes visible
  React.useEffect(() => {
    if (isVisible) {
      setShowDropdown(true);
    }
  }, [isVisible]);

  const handleMenuClick = (item: MenuItem) => {
    item.action();
    setShowDropdown(false);
    onShowMenu(false);
  };

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => {
          setShowDropdown(!showDropdown);
          onShowMenu(!showDropdown);
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className="absolute right-0 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="py-1">
              {menuItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ backgroundColor: item.danger ? '#FEE2E2' : '#F3F4F6' }}
                  className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                    item.danger
                      ? 'text-red-600 hover:text-red-800'
                      : 'text-gray-700 hover:text-gray-900'
                  } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !item.disabled && handleMenuClick(item)}
                  disabled={item.disabled}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </motion.button>
              ))}
            </div>

            {/* Card Status */}
            <div className="border-t border-gray-200 py-2 px-4">
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <div className="text-sm font-medium text-gray-900 capitalize">
                {card.status.replace('_', ' ')}
              </div>
            </div>

            {/* Card Priority */}
            <div className="border-t border-gray-200 py-2 px-4">
              <div className="text-xs text-gray-500 mb-1">Priority</div>
              <div className="text-sm font-medium text-gray-900 capitalize">
                {card.priority}
              </div>
            </div>

            {/* Card Type */}
            <div className="border-t border-gray-200 py-2 px-4">
              <div className="text-xs text-gray-500 mb-1">Type</div>
              <div className="text-sm font-medium text-gray-900 capitalize">
                {card.type}
              </div>
            </div>

            {/* Created Date */}
            <div className="border-t border-gray-200 py-2 px-4">
              <div className="text-xs text-gray-500 mb-1">Created</div>
              <div className="text-sm font-medium text-gray-900">
                {card.createdAt.toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CardMenu;