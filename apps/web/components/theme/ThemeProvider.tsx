'use client';

import React, { createContext, useEffect, useState, useCallback } from 'react';
import type { Theme } from '@/lib/theme';
import { themes } from '@/lib/theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'finance-hub-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(storageKey) as Theme | null;
    if (stored && (stored === 'light' || stored === 'dark')) {
      setThemeState(stored);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(prefersDark ? 'dark' : 'light');
    }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(storageKey, theme);

    // Apply CSS variables
    const config = themes[theme];
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value as string);
    });
    Object.entries(config.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key}`, value as string);
    });
    Object.entries(config.glassmorphism).forEach(([key, value]) => {
      root.style.setProperty(`--glass-${key}`, value as string);
    });
  }, [theme, mounted, storageKey]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Always provide context, even during SSR
  // This prevents "useTheme must be used within a ThemeProvider" error
  // during server-side rendering when accessing routes directly
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
