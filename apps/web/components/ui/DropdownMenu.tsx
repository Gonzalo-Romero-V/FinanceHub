'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
}

export function DropdownMenu({ trigger, items, align = 'right' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleItemClick = (item: DropdownMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer inline-block"
        aria-label="Menú de opciones"
        aria-expanded={isOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        {trigger}
      </div>

      {isOpen && (
        <>
          {/* Overlay para móvil */}
          <div
            className="fixed inset-0 z-40 md:hidden bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Menú */}
          <div
            className={cn(
              'absolute z-50 mt-2 w-52 sm:w-48 rounded-xl sm:rounded-lg glass-strong',
              'shadow-2xl border-2 border-[var(--color-border)]/60',
              'py-2 sm:py-1',
              'animate-in fade-in slide-in-from-top-2 duration-200',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full text-left px-5 py-3.5 sm:px-4 sm:py-2.5',
                  'text-base sm:text-sm font-medium transition-all duration-150',
                  'active:scale-[0.98] active:bg-[var(--color-accent)]/80',
                  'hover:bg-[var(--color-accent)] focus:bg-[var(--color-accent)]',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2',
                  item.variant === 'danger'
                    ? 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-[var(--color-foreground)]'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
