'use client';

import { useEffect, useState, useLayoutEffect } from 'react';

// Breakpoints estándar de Tailwind
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Hook para detectar si el viewport cumple con un media query
 * Solución SSR-safe: siempre inicializa con false para evitar mismatch de hidratación
 * Luego actualiza inmediatamente en useLayoutEffect antes del paint
 */
export function useMediaQuery(query: string): boolean {
  // Siempre inicializar con false para evitar mismatch SSR/hidratación
  // Esto asegura que el HTML renderizado sea idéntico entre servidor y cliente
  const [matches, setMatches] = useState(false);

  // useLayoutEffect se ejecuta antes del paint, minimizando la latencia visible
  useLayoutEffect(() => {
    // Solo ejecutar en cliente
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    // Actualizar inmediatamente con el valor correcto
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Escuchar cambios
    mediaQuery.addEventListener('change', handler);

    return () => {
      mediaQuery.removeEventListener('change', handler);
    };
  }, [query]);

  return matches;
}

/**
 * Hook para detectar si estamos en un breakpoint específico o mayor
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const width = breakpoints[breakpoint];
  return useMediaQuery(`(min-width: ${width}px)`);
}

/**
 * Hook para detectar si estamos en móvil (< md)
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${breakpoints.md - 1}px)`);
}

/**
 * Hook para detectar si estamos en tablet (md a lg)
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`
  );
}

/**
 * Hook para detectar si estamos en desktop (>= lg)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
}
