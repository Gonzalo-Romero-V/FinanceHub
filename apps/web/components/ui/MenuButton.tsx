'use client';

import { cn } from '@/lib/utils';

interface MenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  'aria-label'?: string;
}

export function MenuButton({ isOpen, onClick, className, 'aria-label': ariaLabel }: MenuButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1.5 rounded-lg transition-colors',
        'hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)] active:opacity-80',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] focus:ring-offset-2',
        'touch-manipulation z-10',
        className
      )}
      style={{ touchAction: 'manipulation' }}
      aria-label={ariaLabel || 'Toggle menu'}
      aria-expanded={isOpen}
      type="button"
    >
      <span
        className={cn(
          'h-0.5 w-6 origin-center transform rounded-full bg-[var(--color-foreground)] transition-all duration-300',
          isOpen && 'translate-y-2 rotate-45'
        )}
      />
      <span
        className={cn(
          'h-0.5 w-6 rounded-full bg-[var(--color-foreground)] transition-all duration-300',
          isOpen && 'opacity-0'
        )}
      />
      <span
        className={cn(
          'h-0.5 w-6 origin-center transform rounded-full bg-[var(--color-foreground)] transition-all duration-300',
          isOpen && '-translate-y-2 -rotate-45'
        )}
      />
    </button>
  );
}
