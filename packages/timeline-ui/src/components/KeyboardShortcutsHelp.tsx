import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Keyboard,
  Command,
  Option,
  Control,
  Shift,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/cn';

export interface ShortcutCategory {
  name: string;
  shortcuts: Array<{
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    description: string;
  }>;
}

export interface KeyboardShortcutsHelpProps {
  shortcuts: ShortcutCategory[];
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark';
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  isOpen,
  onClose,
  theme = 'light',
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  const formatShortcut = useCallback((shortcut: ShortcutCategory['shortcuts'][0]) => {
    const keys: string[] = [];

    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.metaKey) keys.push('Cmd');

    keys.push(shortcut.key.toUpperCase());

    return keys.join(' + ');
  }, []);

  const renderKey = useCallback((key: string) => {
    const keyMap: Record<string, React.ReactNode> = {
      'Ctrl': <Control className="w-3 h-3" />,
      'Alt': <Option className="w-3 h-3" />,
      'Shift': <Shift className="w-3 h-3" />,
      'Cmd': <Command className="w-3 h-3" />,
      'Escape': 'Esc',
      'Enter': '↵',
      'Space': '␣',
      'Tab': '⇥',
      'Backspace': '⌫',
      'Delete': '⌦',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'PageUp': '⇞',
      'PageDown': '⇟',
      'Home': '⇱',
      'End': '⇲',
    };

    return keyMap[key] || key.toUpperCase();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
          'bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden',
          theme === 'dark' ? 'dark' : ''
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700',
              'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              'transition-colors'
            )}
            aria-label="Close keyboard shortcuts help"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {shortcuts.map((category) => (
            <div key={category.name} className="mb-6 last:mb-0">
              <button
                onClick={() => toggleCategory(category.name)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  'transition-colors text-left'
                )}
              >
                <div className="flex items-center gap-2">
                  {expandedCategories.has(category.name) ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {category.shortcuts.length} shortcuts
                </span>
              </button>

              <AnimatePresence>
                {expandedCategories.has(category.name) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    {category.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {formatShortcut(shortcut).split(' + ').map((key, keyIndex) => (
                            <kbd
                              key={keyIndex}
                              className={cn(
                                'px-2 py-1 text-xs font-medium rounded',
                                'bg-white dark:bg-gray-600',
                                'border border-gray-300 dark:border-gray-500',
                                'text-gray-700 dark:text-gray-200',
                                'shadow-sm'
                              )}
                            >
                              {renderKey(key)}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <HelpCircle className="w-4 h-4" />
            <span>Press ? anytime to show this help</span>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Atlas Timeline • Version 1.0
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KeyboardShortcutsHelp;