'use client';

import { useTheme } from './useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-10 w-20 items-center rounded-full bg-[var(--color-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2"
      aria-label="Toggle theme"
      type="button"
    >
      <span
        className={`inline-block h-8 w-8 transform rounded-full bg-[var(--color-background)] shadow-lg transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-11' : 'translate-x-1'
        }`}
      >
        <span className="flex h-full items-center justify-center text-sm">
          {theme === 'dark' ? '🌙' : '☀️'}
        </span>
      </span>
    </button>
  );
}
