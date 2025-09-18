'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  Sun,
  Moon,
  Monitor,
  Contrast,
  Check,
  ChevronDown,
  Palette
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const themeOptions = [
  {
    value: 'light' as const,
    label: 'Light',
    icon: Sun,
    description: 'Light theme',
    category: 'standard'
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    icon: Moon,
    description: 'Dark theme',
    category: 'standard'
  },
  {
    value: 'system' as const,
    label: 'System',
    icon: Monitor,
    description: 'Follow system preference',
    category: 'standard'
  },
  {
    value: 'high-contrast' as const,
    label: 'High Contrast',
    icon: Contrast,
    description: 'High contrast mode',
    category: 'standard'
  },
  {
    value: 'tango' as const,
    label: 'Tango',
    icon: Palette,
    description: 'Tango Desktop Project theme',
    category: 'tango'
  },
  {
    value: 'tango-dark' as const,
    label: 'Tango Dark',
    icon: Palette,
    description: 'Tango theme with dark palette',
    category: 'tango'
  },
  {
    value: 'tango-high-contrast' as const,
    label: 'Tango High Contrast',
    icon: Contrast,
    description: 'Tango theme with high contrast',
    category: 'tango'
  }
];

interface ThemeSwitcherProps {
  variant?: 'default' | 'compact' | 'minimal';
  showLabel?: boolean;
  className?: string;
}

export function ThemeSwitcher({
  variant = 'default',
  showLabel = false,
  className = ''
}: ThemeSwitcherProps) {
  const { theme, setTheme, resolvedTheme, isHighContrast, prefersReducedMotion } = useTheme();

  const currentTheme = themeOptions.find(option => option.value === theme);
  const Icon = currentTheme?.icon || Sun;

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className={className}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <Icon className="h-4 w-4" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Icon className="h-4 w-4 mr-2" />
          {showLabel && <span>{currentTheme?.label}</span>}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          Theme Preference
        </div>
        <DropdownMenuSeparator />
        {themeOptions.map((option) => {
          const OptionIcon = option.icon;
          const isSelected = theme === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                <OptionIcon className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </div>
              {isSelected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Current:</span>
            <span className="font-medium">{resolvedTheme}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>High Contrast:</span>
            <span className="font-medium">{isHighContrast ? 'On' : 'Off'}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>Reduced Motion:</span>
            <span className="font-medium">{prefersReducedMotion ? 'On' : 'Off'}</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Keyboard shortcuts for theme switching
interface ThemeShortcutsProps {
  children?: React.ReactNode;
}

export function ThemeShortcuts({ children }: ThemeShortcutsProps) {
  const { setTheme, theme } = useTheme();

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + T for theme cycling
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        const themes: Array<'light' | 'dark' | 'system' | 'high-contrast'> =
          ['light', 'dark', 'system', 'high-contrast'];
        const currentIndex = themes.indexOf(theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex]);
      }

      // Ctrl/Cmd + Shift + L for light theme
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'L') {
        event.preventDefault();
        setTheme('light');
      }

      // Ctrl/Cmd + Shift + D for dark theme
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setTheme('dark');
      }

      // Ctrl/Cmd + Shift + H for high contrast
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'H') {
        event.preventDefault();
        setTheme('high-contrast');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [setTheme, theme]);

  return <>{children}</>;
}

// Theme information display component
interface ThemeInfoProps {
  className?: string;
}

export function ThemeInfo({ className = '' }: ThemeInfoProps) {
  const { resolvedTheme, isHighContrast, prefersReducedMotion } = useTheme();

  return (
    <div className={`text-xs text-muted-foreground space-y-1 ${className}`}>
      <div className="flex items-center justify-between">
        <span>Theme:</span>
        <span className="font-medium capitalize">{resolvedTheme}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>High Contrast:</span>
        <span className="font-medium">{isHighContrast ? 'Enabled' : 'Disabled'}</span>
      </div>
      <div className="flex items-center justify-between">
        <span>Reduced Motion:</span>
        <span className="font-medium">{prefersReducedMotion ? 'Enabled' : 'Disabled'}</span>
      </div>
    </div>
  );
}

// Quick theme toggle button for mobile/header
export function QuickThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
      case 'high-contrast':
        return <Contrast className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={className}
      title="Toggle theme"
    >
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}