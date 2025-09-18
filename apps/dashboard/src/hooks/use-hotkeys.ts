'use client';

import { useEffect, useCallback, useRef } from 'react';

export type HotkeyAction =
  | 'capture'
  | 'chat'
  | 'navigate'
  | 'search'
  | 'settings'
  | 'theme'
  | 'help'
  | 'export'
  | 'import'
  | 'new-job'
  | 'toggle-sidebar';

export interface Hotkey {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: HotkeyAction;
  description: string;
  category?: 'navigation' | 'actions' | 'tools' | 'theme';
}

export interface HotkeyConfig {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  allowInInput?: boolean;
  global?: boolean;
}

const defaultHotkeys: Hotkey[] = [
  // Navigation
  {
    key: 'k',
    ctrl: true,
    action: 'search',
    description: 'Open search/command palette',
    category: 'navigation'
  },
  {
    key: '/',
    action: 'search',
    description: 'Open search/command palette',
    category: 'navigation'
  },
  {
    key: 'h',
    ctrl: true,
    shift: true,
    action: 'help',
    description: 'Show keyboard shortcuts',
    category: 'navigation'
  },

  // Actions
  {
    key: 'c',
    ctrl: true,
    shift: true,
    action: 'capture',
    description: 'Start screen capture',
    category: 'actions'
  },
  {
    key: 'n',
    ctrl: true,
    shift: true,
    action: 'new-job',
    description: 'Create new job',
    category: 'actions'
  },
  {
    key: 'e',
    ctrl: true,
    shift: true,
    action: 'export',
    description: 'Export data',
    category: 'actions'
  },
  {
    key: 'i',
    ctrl: true,
    shift: true,
    action: 'import',
    description: 'Import data',
    category: 'actions'
  },

  // Quick Actions
  {
    key: 't',
    ctrl: true,
    shift: true,
    action: 'theme',
    description: 'Cycle theme',
    category: 'theme'
  },
  {
    key: 'b',
    ctrl: true,
    shift: true,
    action: 'toggle-sidebar',
    description: 'Toggle sidebar',
    category: 'navigation'
  },
  {
    key: 's',
    alt: true,
    action: 'settings',
    description: 'Open settings',
    category: 'navigation'
  },
  {
    key: 'Escape',
    action: 'navigate',
    description: 'Close modal/go back',
    category: 'navigation'
  },
];

export function useHotkeys(
  onHotkey: (action: HotkeyAction, event: KeyboardEvent) => void,
  customHotkeys: Hotkey[] = [],
  config: HotkeyConfig = {}
) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
    allowInInput = false,
    global = true
  } = config;

  const hotkeysRef = useRef<Hotkey[]>([...defaultHotkeys, ...customHotkeys]);
  const enabledRef = useRef(enabled);
  const configRef = useRef(config);

  // Update refs when props change
  useEffect(() => {
    hotkeysRef.current = [...defaultHotkeys, ...customHotkeys];
    enabledRef.current = enabled;
    configRef.current = config;
  }, [customHotkeys, enabled, config]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return;

    // Check if we're in an input field
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' ||
                         target.tagName === 'TEXTAREA' ||
                         target.isContentEditable;

    if (isInputElement && !configRef.current.allowInInput) return;

    // Find matching hotkey
    const matchingHotkey = hotkeysRef.current.find(hotkey => {
      return (
        event.key.toLowerCase() === hotkey.key.toLowerCase() &&
        !!event.ctrlKey === !!hotkey.ctrl &&
        !!event.altKey === !!hotkey.alt &&
        !!event.shiftKey === !!hotkey.shift &&
        !!event.metaKey === !!hotkey.meta
      );
    });

    if (matchingHotkey) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }

      onHotkey(matchingHotkey.action, event);
    }
  }, [onHotkey]);

  useEffect(() => {
    if (!global) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, global]);

  // Utility functions
  const formatHotkey = useCallback((hotkey: Hotkey): string => {
    const parts: string[] = [];

    if (hotkey.ctrl) parts.push('Ctrl');
    if (hotkey.alt) parts.push('Alt');
    if (hotkey.shift) parts.push('Shift');
    if (hotkey.meta) parts.push('Cmd');

    // Format key name
    let keyName = hotkey.key;
    if (keyName === ' ') keyName = 'Space';
    if (keyName === 'Escape') keyName = 'Esc';
    if (keyName.length === 1) keyName = keyName.toUpperCase();

    parts.push(keyName);

    return parts.join('+');
  }, []);

  const getHotkeysByCategory = useCallback((category?: string): Hotkey[] => {
    if (category) {
      return hotkeysRef.current.filter(h => h.category === category);
    }
    return hotkeysRef.current;
  }, []);

  const isHotkeyConflict = useCallback((newHotkey: Hotkey): boolean => {
    return hotkeysRef.current.some(existing =>
      existing.key.toLowerCase() === newHotkey.key.toLowerCase() &&
      !!existing.ctrl === !!newHotkey.ctrl &&
      !!existing.alt === !!newHotkey.alt &&
      !!existing.shift === !!newHotkey.shift &&
      !!existing.meta === !!newHotkey.meta
    );
  }, []);

  return {
    formatHotkey,
    getHotkeysByCategory,
    isHotkeyConflict,
    hotkeys: hotkeysRef.current,
    setEnabled: (enabled: boolean) => {
      enabledRef.current = enabled;
    }
  };
}

// Hook for managing global hotkey state
export function useGlobalHotkeys() {
  const [enabled, setEnabled] = React.useState(true);
  const [customHotkeys, setCustomHotkeys] = React.useState<Hotkey[]>([]);

  const addCustomHotkey = useCallback((hotkey: Hotkey) => {
    setCustomHotkeys(prev => [...prev, hotkey]);
  }, []);

  const removeCustomHotkey = useCallback((action: HotkeyAction) => {
    setCustomHotkeys(prev => prev.filter(h => h.action !== action));
  }, []);

  const updateCustomHotkey = useCallback((action: HotkeyAction, newHotkey: Partial<Hotkey>) => {
    setCustomHotkeys(prev =>
      prev.map(h => h.action === action ? { ...h, ...newHotkey } : h)
    );
  }, []);

  return {
    enabled,
    setEnabled,
    customHotkeys,
    addCustomHotkey,
    removeCustomHotkey,
    updateCustomHotkey
  };
}

// Component for displaying keyboard shortcuts help
export interface HotkeysHelpProps {
  hotkeys?: Hotkey[];
  onClose?: () => void;
}

export function HotkeysHelp({ hotkeys = defaultHotkeys, onClose }: HotkeysHelpProps) {
  const formatHotkey = (hotkey: Hotkey): string => {
    const parts: string[] = [];

    if (hotkey.ctrl) parts.push('Ctrl');
    if (hotkey.alt) parts.push('Alt');
    if (hotkey.shift) parts.push('Shift');
    if (hotkey.meta) parts.push('Cmd');

    let keyName = hotkey.key;
    if (keyName === ' ') keyName = 'Space';
    if (keyName === 'Escape') keyName = 'Esc';
    if (keyName.length === 1) keyName = keyName.toUpperCase();

    parts.push(keyName);

    return parts.join('+');
  };

  const categories = Array.from(new Set(hotkeys.map(h => h.category).filter(Boolean)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {categories.map(category => (
            <div key={category} className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase">
                {category}
              </h3>
              <div className="space-y-2">
                {hotkeys
                  .filter(h => h.category === category)
                  .map(hotkey => (
                    <div key={`${hotkey.key}-${hotkey.action}`} className="flex items-center justify-between py-2">
                      <span className="text-sm">{hotkey.description}</span>
                      <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                        {formatHotkey(hotkey)}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Uncategorized hotkeys */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase">
              Other
            </h3>
            <div className="space-y-2">
              {hotkeys
                .filter(h => !h.category)
                .map(hotkey => (
                  <div key={`${hotkey.key}-${hotkey.action}`} className="flex items-center justify-between py-2">
                    <span className="text-sm">{hotkey.description}</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                      {formatHotkey(hotkey)}
                    </kbd>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500">
            Press any key to close this help
          </p>
        </div>
      </div>
    </div>
  );
}