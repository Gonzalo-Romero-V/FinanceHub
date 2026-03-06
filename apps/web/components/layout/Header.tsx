'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MenuButton } from '@/components/ui/MenuButton';
import { MobileNav } from './MobileNav';
import { useIsMobile } from '@/lib/responsive';

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Cerrar menú automáticamente cuando cambia a desktop
  useEffect(() => {
    if (!isMobile && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/nuevo-movimiento', label: 'Nuevo movimiento' },
    { href: '/cuentas', label: 'Cuentas' },
    { href: '/conceptos', label: 'Conceptos' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)]/40 glass backdrop-blur supports-[backdrop-filter]:bg-[var(--color-background)]/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <span className="text-lg sm:text-xl font-bold text-gradient-primary">
                Finance Hub
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-4 md:flex lg:gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-[var(--color-primary)] lg:text-base ${
                    isActive
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-mutedForeground)]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <MenuButton
              isOpen={isMobileMenuOpen}
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation menu"
            />
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
    </>
  );
}
