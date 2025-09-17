import React, { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  category?: string;
  action: () => void;
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
}

export interface UseKeyboardShortcutsConfig {
  enabled?: boolean;
  stopPropagation?: boolean;
  preventDefault?: boolean;
  scope?: 'global' | 'local';
  target?: Document | HTMLElement;
}

export interface UseKeyboardShortcutsReturn {
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (key: string, category?: string) => void;
  getShortcuts: () => KeyboardShortcut[];
  isShortcutPressed: (event: KeyboardEvent, shortcut: KeyboardShortcut) => boolean;
  enableShortcuts: () => void;
  disableShortcuts: () => void;
}

export function useKeyboardShortcuts(
  config: UseKeyboardShortcutsConfig = {}
): UseKeyboardShortcutsReturn {
  const {
    enabled = true,
    stopPropagation = true,
    preventDefault = true,
    scope = 'global',
    target = document,
  } = config;

  const shortcutsRef = useRef<Map<string, KeyboardShortcut>>(new Map());
  const enabledRef = useRef(enabled);

  // Check if a shortcut matches the keyboard event
  const isShortcutPressed = useCallback((event: KeyboardEvent, shortcut: KeyboardShortcut): boolean => {
    const key = event.key.toLowerCase();
    const ctrlKey = event.ctrlKey || event.metaKey; // Treat Cmd as Ctrl on Mac
    const altKey = event.altKey;
    const shiftKey = event.shiftKey;
    const metaKey = event.metaKey;

    return (
      key === shortcut.key.toLowerCase() &&
      !!shortcut.ctrlKey === ctrlKey &&
      !!shortcut.altKey === altKey &&
      !!shortcut.shiftKey === shiftKey &&
      !!shortcut.metaKey === metaKey
    );
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return;

    // Don't trigger shortcuts when typing in input fields, textareas, or contenteditable elements
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.getAttribute('role') === 'textbox'
    ) {
      return;
    }

    // Check all registered shortcuts
    for (const [id, shortcut] of shortcutsRef.current) {
      if (
        (shortcut.enabled !== false) &&
        isShortcutPressed(event, shortcut)
      ) {
        if (shortcut.preventDefault ?? preventDefault) {
          event.preventDefault();
        }
        if (shortcut.stopPropagation ?? stopPropagation) {
          event.stopPropagation();
        }

        try {
          shortcut.action();
        } catch (error) {
          console.error('Error executing keyboard shortcut:', error);
        }
        break;
      }
    }
  }, [isShortcutPressed, preventDefault, stopPropagation]);

  // Register a shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    const id = `${shortcut.category || 'default'}:${shortcut.key}`;
    shortcutsRef.current.set(id, { ...shortcut, enabled: shortcut.enabled !== false });
  }, []);

  // Unregister a shortcut
  const unregisterShortcut = useCallback((key: string, category?: string) => {
    const id = `${category || 'default'}:${key}`;
    shortcutsRef.current.delete(id);
  }, []);

  // Get all registered shortcuts
  const getShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.values());
  }, []);

  // Enable/disable shortcuts
  const enableShortcuts = useCallback(() => {
    enabledRef.current = true;
  }, []);

  const disableShortcuts = useCallback(() => {
    enabledRef.current = false;
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (scope === 'global' && target === document) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else if (target instanceof HTMLElement) {
      target.addEventListener('keydown', handleKeyDown);
      return () => {
        target.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, scope, target]);

  // Update enabled state
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  return {
    registerShortcut,
    unregisterShortcut,
    getShortcuts,
    isShortcutPressed,
    enableShortcuts,
    disableShortcuts,
  };
}

// Hook for managing focusable elements and navigation
export interface UseFocusNavigationConfig {
  loop?: boolean;
  wrap?: boolean;
  trapFocus?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'grid';
}

export interface UseFocusNavigationReturn {
  registerElement: (id: string, element: HTMLElement) => void;
  unregisterElement: (id: string) => void;
  focusNext: (currentId?: string) => void;
  focusPrevious: (currentId?: string) => void;
  focusFirst: () => void;
  focusLast: () => void;
  getCurrentFocus: () => string | null;
  setFocus: (id: string) => void;
}

export function useFocusNavigation(
  config: UseFocusNavigationConfig = {}
): UseFocusNavigationReturn {
  const {
    loop = true,
    wrap = true,
    trapFocus = false,
    orientation = 'vertical',
  } = config;

  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const currentFocusRef = useRef<string | null>(null);

  const registerElement = useCallback((id: string, element: HTMLElement) => {
    elementsRef.current.set(id, element);
  }, []);

  const unregisterElement = useCallback((id: string) => {
    elementsRef.current.delete(id);
    if (currentFocusRef.current === id) {
      currentFocusRef.current = null;
    }
  }, []);

  const focusElement = useCallback((id: string) => {
    const element = elementsRef.current.get(id);
    if (element) {
      element.focus();
      currentFocusRef.current = id;
    }
  }, []);

  const getCurrentFocus = useCallback(() => currentFocusRef.current, []);

  const setFocus = useCallback((id: string) => {
    focusElement(id);
  }, [focusElement]);

  const focusFirst = useCallback(() => {
    const firstId = Array.from(elementsRef.current.keys())[0];
    if (firstId) {
      focusElement(firstId);
    }
  }, [focusElement]);

  const focusLast = useCallback(() => {
    const keys = Array.from(elementsRef.current.keys());
    const lastId = keys[keys.length - 1];
    if (lastId) {
      focusElement(lastId);
    }
  }, [focusElement]);

  const focusNext = useCallback((currentId?: string) => {
    const current = currentId || getCurrentFocus();
    if (!current) {
      focusFirst();
      return;
    }

    const keys = Array.from(elementsRef.current.keys());
    const currentIndex = keys.indexOf(current);

    if (currentIndex === -1) {
      focusFirst();
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < keys.length) {
      focusElement(keys[nextIndex]);
    } else if (loop) {
      focusFirst();
    }
  }, [focusElement, getCurrentFocus, focusFirst, loop]);

  const focusPrevious = useCallback((currentId?: string) => {
    const current = currentId || getCurrentFocus();
    if (!current) {
      focusLast();
      return;
    }

    const keys = Array.from(elementsRef.current.keys());
    const currentIndex = keys.indexOf(current);

    if (currentIndex === -1) {
      focusLast();
      return;
    }

    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      focusElement(keys[prevIndex]);
    } else if (loop) {
      focusLast();
    }
  }, [focusElement, getCurrentFocus, focusLast, loop]);

  // Handle trap focus
  useEffect(() => {
    if (!trapFocus) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        const keys = Array.from(elementsRef.current.keys());
        if (keys.length === 0) return;

        const first = keys[0];
        const last = keys[keys.length - 1];
        const current = getCurrentFocus();

        if (event.shiftKey) {
          // Shift + Tab
          if (current === first) {
            event.preventDefault();
            focusElement(last);
          }
        } else {
          // Tab
          if (current === last) {
            event.preventDefault();
            focusElement(first);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [trapFocus, focusElement, getCurrentFocus]);

  return {
    registerElement,
    unregisterElement,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    getCurrentFocus,
    setFocus,
  };
}

// Screen reader utilities
export interface ScreenReaderAnnouncement {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  timeout?: number;
}

export function useScreenReader() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  const announce = useCallback((announcement: ScreenReaderAnnouncement) => {
    if (!announceRef.current) {
      // Create live region if it doesn't exist
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', announcement.politeness || 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
      announceRef.current = liveRegion;
    }

    const liveRegion = announceRef.current;
    liveRegion.setAttribute('aria-live', announcement.politeness || 'polite');

    // Clear and set message to ensure it's announced
    liveRegion.textContent = '';
    setTimeout(() => {
      if (liveRegion) {
        liveRegion.textContent = announcement.message;
      }
    }, 50);

    // Clear message after timeout
    if (announcement.timeout) {
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = '';
        }
      }, announcement.timeout);
    }
  }, []);

  const announcePolite = useCallback((message: string, timeout?: number) => {
    announce({ message, politeness: 'polite', timeout });
  }, [announce]);

  const announceAssertive = useCallback((message: string, timeout?: number) => {
    announce({ message, politeness: 'assertive', timeout });
  }, [announce]);

  return {
    announce,
    announcePolite,
    announceAssertive,
  };
}