'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/lib/responsive';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const previousPathname = useRef(pathname);

  // Cerrar al cambiar de ruta (solo cuando realmente cambia, no en mount inicial)
  useEffect(() => {
    if (previousPathname.current !== pathname && isOpen) {
      onClose();
    }
    previousPathname.current = pathname;
  }, [pathname, isOpen, onClose]);

  // Cerrar automáticamente cuando cambia a desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      onClose();
    }
  }, [isMobile, isOpen, onClose]);

  // Prevenir scroll del body cuando el menú está abierto
  useEffect(() => {
    // Solo aplicar si es móvil y está abierto (CSS md:hidden ya lo oculta en desktop)
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
      // Prevenir scroll en iOS
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen, isMobile]);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/nuevo-movimiento', label: 'Nuevo movimiento' },
    { href: '/cuentas', label: 'Cuentas' },
    { href: '/conceptos', label: 'Conceptos' },
    { href: '/settings', label: 'Settings' },
  ];

  // Renderizar siempre pero ocultar con CSS en desktop para evitar mismatch de hidratación
  // Usar pointer-events-none y opacity-0 para ocultar completamente cuando no es móvil

  const handleOverlayClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Solo cerrar si el overlay está visible (isOpen) y el click es directamente en el overlay
    if (isOpen && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDrawerClick = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevenir que clicks dentro del drawer cierren el menú
    e.stopPropagation();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className={cn(
            'fixed inset-0 z-[45] bg-black/50 backdrop-blur-sm transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          onClick={handleOverlayClick}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        className={cn(
          'fixed left-0 top-0 z-[55] h-full w-[85%] max-w-64 glass-strong',
          'transform transition-transform duration-300 ease-in-out',
          'will-change-transform',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Mobile navigation"
        onClick={handleDrawerClick}
        onTouchStart={handleDrawerClick}
      >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Header del drawer */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--color-border)]/40 px-4">
            <Link 
              href="/dashboard" 
              className="text-lg sm:text-xl font-bold text-gradient-primary" 
              onClick={onClose}
            >
              Finance Hub
            </Link>
          </div>

          {/* Navigation links */}
          <div className="flex-1 space-y-1 px-4 py-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex min-h-[44px] items-center rounded-lg px-4 py-3 text-base font-medium transition-colors',
                    'active:opacity-80',
                    isActive
                      ? 'bg-[var(--color-accent)] text-[var(--color-accentForeground)]'
                      : 'text-[var(--color-mutedForeground)] active:bg-[var(--color-accent)] active:text-[var(--color-accentForeground)]'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
