import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BoardTheme, ThemePresets } from '../types/BoardTypes';

interface ThemeContextType {
  currentTheme: BoardTheme;
  availableThemes: { id: string; name: string; theme: BoardTheme }[];
  setTheme: (themeId: string) => void;
  createCustomTheme: (name: string, baseTheme?: string) => void;
  updateCustomTheme: (themeId: string, updates: Partial<BoardTheme>) => void;
  deleteCustomTheme: (themeId: string) => void;
  exportTheme: (themeId: string) => string;
  importTheme: (themeData: string) => void;
  resetTheme: () => void;
}

const defaultTheme: BoardTheme = {
  primaryColor: '#3B82F6',
  secondaryColor: '#10B981',
  backgroundColor: '#F9FAFB',
  textColor: '#111827',
  borderColor: '#E5E7EB',
  cardStyle: 'default',
  columnStyle: 'default'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
  boardId?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, boardId }) => {
  const [currentTheme, setCurrentTheme] = useState<BoardTheme>(defaultTheme);
  const [availableThemes, setAvailableThemes] = useState<{ id: string; name: string; theme: BoardTheme }[]>([]);

  // Initialize themes
  useEffect(() => {
    const loadThemes = () => {
      // Load built-in themes
      const builtInThemes = [
        { id: 'default', name: 'Default Blue', theme: ThemePresets.Default },
        { id: 'dark', name: 'Dark Mode', theme: ThemePresets.Dark },
        { id: 'minimal', name: 'Minimal Gray', theme: ThemePresets.Minimal },
        { id: 'warm', name: 'Warm Sunset', theme: ThemePresets.Warm },
        { id: 'cool', name: 'Cool Ocean', theme: ThemePresets.Cool },
        { id: 'nature', name: 'Nature Green', theme: ThemePresets.Nature },
        { id: 'purple', name: 'Purple Dreams', theme: ThemePresets.Purple },
        { id: 'corporate', name: 'Corporate Blue', theme: ThemePresets.Corporate }
      ];

      // Load custom themes from localStorage
      const savedThemes = localStorage.getItem(`board-themes-${boardId || 'global'}`);
      const customThemes = savedThemes ? JSON.parse(savedThemes) : [];

      // Load saved current theme
      const savedCurrentTheme = localStorage.getItem(`current-theme-${boardId || 'global'}`);
      if (savedCurrentTheme) {
        try {
          const parsedTheme = JSON.parse(savedCurrentTheme);
          setCurrentTheme(parsedTheme);
        } catch (error) {
          console.error('Failed to parse saved theme:', error);
        }
      }

      setAvailableThemes([...builtInThemes, ...customThemes]);
    };

    loadThemes();
  }, [boardId]);

  const setTheme = (themeId: string) => {
    const theme = availableThemes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme.theme);
      localStorage.setItem(`current-theme-${boardId || 'global'}`, JSON.stringify(theme.theme));

      // Apply theme to document
      document.documentElement.style.setProperty('--theme-primary', theme.theme.primaryColor);
      document.documentElement.style.setProperty('--theme-secondary', theme.theme.secondaryColor);
      document.documentElement.style.setProperty('--theme-background', theme.theme.backgroundColor);
      document.documentElement.style.setProperty('--theme-text', theme.theme.textColor);
      document.documentElement.style.setProperty('--theme-border', theme.theme.borderColor);
    }
  };

  const createCustomTheme = (name: string, baseTheme?: string) => {
    const base = baseTheme
      ? availableThemes.find(t => t.id === baseTheme)?.theme || defaultTheme
      : currentTheme;

    const newTheme = {
      ...base,
      id: `custom-${Date.now()}`,
      name
    };

    const customThemes = availableThemes.filter(t => t.id.startsWith('custom-'));
    const updatedThemes = [...customThemes, { id: newTheme.id, name, theme: newTheme }];

    localStorage.setItem(`board-themes-${boardId || 'global'}`, JSON.stringify(updatedThemes));
    setAvailableThemes([...availableThemes.filter(t => !t.id.startsWith('custom-')), ...updatedThemes]);
  };

  const updateCustomTheme = (themeId: string, updates: Partial<BoardTheme>) => {
    if (!themeId.startsWith('custom-')) {
      throw new Error('Can only update custom themes');
    }

    const themeIndex = availableThemes.findIndex(t => t.id === themeId);
    if (themeIndex === -1) return;

    const updatedTheme = {
      ...availableThemes[themeIndex],
      theme: { ...availableThemes[themeIndex].theme, ...updates }
    };

    const updatedThemes = [...availableThemes];
    updatedThemes[themeIndex] = updatedTheme;

    localStorage.setItem(`board-themes-${boardId || 'global'}`, JSON.stringify(updatedThemes.filter(t => t.id.startsWith('custom-'))));
    setAvailableThemes(updatedThemes);

    // Update current theme if it's the one being modified
    if (currentTheme === availableThemes[themeIndex].theme) {
      setCurrentTheme(updatedTheme.theme);
      localStorage.setItem(`current-theme-${boardId || 'global'}`, JSON.stringify(updatedTheme.theme));
    }
  };

  const deleteCustomTheme = (themeId: string) => {
    if (!themeId.startsWith('custom-')) {
      throw new Error('Can only delete custom themes');
    }

    const updatedThemes = availableThemes.filter(t => t.id !== themeId);
    const customThemes = updatedThemes.filter(t => t.id.startsWith('custom-'));

    localStorage.setItem(`board-themes-${boardId || 'global'}`, JSON.stringify(customThemes));
    setAvailableThemes(updatedThemes);
  };

  const exportTheme = (themeId: string): string => {
    const theme = availableThemes.find(t => t.id === themeId);
    if (!theme) {
      throw new Error('Theme not found');
    }

    const exportData = {
      version: '1.0',
      name: theme.name,
      theme: theme.theme,
      exportedAt: new Date().toISOString(),
      boardId: boardId || 'global'
    };

    return JSON.stringify(exportData, null, 2);
  };

  const importTheme = (themeData: string) => {
    try {
      const parsed = JSON.parse(themeData);

      if (!parsed.name || !parsed.theme) {
        throw new Error('Invalid theme format');
      }

      const newTheme = {
        id: `imported-${Date.now()}`,
        name: `${parsed.name} (Imported)`,
        theme: {
          ...defaultTheme,
          ...parsed.theme
        }
      };

      const customThemes = availableThemes.filter(t => t.id.startsWith('custom-'));
      const updatedThemes = [...customThemes, newTheme];

      localStorage.setItem(`board-themes-${boardId || 'global'}`, JSON.stringify(updatedThemes));
      setAvailableThemes([...availableThemes.filter(t => !t.id.startsWith('custom-')), ...updatedThemes]);
    } catch (error) {
      throw new Error('Failed to import theme: ' + (error as Error).message);
    }
  };

  const resetTheme = () => {
    setTheme('default');
  };

  const value: ThemeContextType = {
    currentTheme,
    availableThemes,
    setTheme,
    createCustomTheme,
    updateCustomTheme,
    deleteCustomTheme,
    exportTheme,
    importTheme,
    resetTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};