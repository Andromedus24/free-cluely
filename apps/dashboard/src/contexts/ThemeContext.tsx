'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { logger } from '@/lib/logger';

type Theme = 'light' | 'dark' | 'system' | 'high-contrast' | 'tango' | 'tango-dark' | 'tango-high-contrast';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: 'light' | 'dark' | 'high-contrast' | 'tango' | 'tango-dark' | 'tango-high-contrast';
  isHighContrast: boolean;
  prefersReducedMotion: boolean;
  isTangoTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'atlas-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark' | 'high-contrast' | 'tango' | 'tango-dark' | 'tango-high-contrast'>('light');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isTangoTheme, setIsTangoTheme] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Theme;
      if (stored && ['light', 'dark', 'system', 'high-contrast', 'tango', 'tango-dark', 'tango-high-contrast'].includes(stored)) {
        setTheme(stored);
      }
    } catch (error) {
      logger.warn('theme-context', 'Failed to load theme from localStorage', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [storageKey]);

  // Apply theme changes to DOM
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark', 'high-contrast', 'tango', 'tango-dark', 'tango-high-contrast');

    // Determine the actual theme to apply
    let actualTheme: 'light' | 'dark' | 'high-contrast' | 'tango' | 'tango-dark' | 'tango-high-contrast';

    if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = systemPrefersDark ? 'dark' : 'light';
    } else if (theme === 'tango') {
      actualTheme = 'tango';
    } else if (theme === 'tango-dark') {
      actualTheme = 'tango-dark';
    } else if (theme === 'tango-high-contrast') {
      actualTheme = 'tango-high-contrast';
    } else {
      actualTheme = theme === 'high-contrast' ? 'high-contrast' : theme;
    }

    // Apply the theme class
    root.setAttribute('data-theme', actualTheme);
    setResolvedTheme(actualTheme);
    setIsHighContrast(actualTheme === 'high-contrast' || actualTheme === 'tango-high-contrast');
    setIsTangoTheme(actualTheme.startsWith('tango'));

    // Save to localStorage
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      logger.warn('theme-context', 'Failed to save theme to localStorage', { error: error instanceof Error ? error.message : String(error) });
    }
  }, [theme, storageKey]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        const systemPrefersDark = mediaQuery.matches;
        const actualTheme = systemPrefersDark ? 'dark' : 'light';
        const root = window.document.documentElement;

        root.classList.remove('light', 'dark');
        root.setAttribute('data-theme', actualTheme);
        setResolvedTheme(actualTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Check for high contrast preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleHighContrastChange = () => {
      // If we're not already in high contrast mode, but the system prefers it,
      // we could automatically switch, but for now we'll just track it
      logger.info('theme-context', 'System high contrast preference', { matches: mediaQuery.matches });
    };

    mediaQuery.addEventListener('change', handleHighContrastChange);
    return () => mediaQuery.removeEventListener('change', handleHighContrastChange);
  }, []);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
    },
    toggleTheme: () => {
      setTheme(prev => {
        if (prev === 'light') return 'dark';
        if (prev === 'dark') return 'system';
        if (prev === 'system') return 'tango';
        if (prev === 'tango') return 'tango-dark';
        if (prev === 'tango-dark') return 'tango-high-contrast';
        if (prev === 'tango-high-contrast') return 'high-contrast';
        return 'light';
      });
    },
    resolvedTheme,
    isHighContrast,
    isTangoTheme,
    prefersReducedMotion,
  };

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme utilities
export const themeUtils = {
  // Get CSS custom property value
  getCSSVariable: (variable: string): string => {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
  },

  // Check if current theme is dark
  isDarkTheme: (): boolean => {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  },

  // Check if current theme is high contrast
  isHighContrastTheme: (): boolean => {
    return document.documentElement.getAttribute('data-theme') === 'high-contrast';
  },

  // Apply temporary theme for testing
  applyTemporaryTheme: (theme: 'light' | 'dark' | 'high-contrast', duration: number = 1000) => {
    const root = document.documentElement;
    const originalTheme = root.getAttribute('data-theme');

    root.setAttribute('data-theme', theme);

    setTimeout(() => {
      if (originalTheme) {
        root.setAttribute('data-theme', originalTheme);
      } else {
        root.removeAttribute('data-theme');
      }
    }, duration);
  },

  // Generate theme-aware CSS color values
  getThemeAwareColor: (lightColor: string, darkColor: string, highContrastColor?: string): string => {
    const isDark = themeUtils.isDarkTheme();
    const isHighContrast = themeUtils.isHighContrastTheme();

    if (isHighContrast && highContrastColor) {
      return highContrastColor;
    }

    return isDark ? darkColor : lightColor;
  },

  // Get contrast ratio between two colors
  getContrastRatio: (color1: string, color2: string): number => {
    // This is a simplified version - in production, you'd want a more robust implementation
    const getLuminance = (color: string): number => {
      // Convert hex to RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      // Calculate luminance
      const sRGB = [r, g, b].map(val => {
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });

      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);

    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if color combination meets WCAG standards
  meetsWCAGStandard: (color1: string, color2: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = themeUtils.getContrastRatio(color1, color2);

    if (level === 'AA') {
      return ratio >= 4.5; // AA standard for normal text
    } else {
      return ratio >= 7; // AAA standard for normal text
    }
  }
};