'use client';

import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
import type { Theme } from '@/lib/theme';

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
