'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getParentRoute } from './navigation';

/**
 * Hook que implementa navegación jerárquica
 * Intercepta el botón "atrás" del navegador y redirige a la ruta padre según la jerarquía
 */
export function useHierarchicalNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const currentPathnameRef = useRef(pathname);

  // Mantener referencia actualizada del pathname
  useEffect(() => {
    currentPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Solo ejecutar en cliente
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      // Si ya estamos navegando programáticamente, permitir el comportamiento normal
      if (isNavigatingRef.current) {
        isNavigatingRef.current = false;
        return;
      }

      // Usar el pathname actual antes de que Next.js lo actualice
      // El pathname del hook puede no estar actualizado aún, así que usamos la referencia
      const currentPath = currentPathnameRef.current;
      
      // Obtener la ruta padre de la ruta actual
      const parentRoute = getParentRoute(currentPath);

      // Si no hay ruta padre, permitir comportamiento normal del navegador
      if (!parentRoute) {
        return;
      }

      // Prevenir el comportamiento por defecto
      event.preventDefault();
      event.stopPropagation();

      // Navegar a la ruta padre usando Next.js router
      isNavigatingRef.current = true;
      router.push(parentRoute);
    };

    // Agregar listener al evento popstate con capture para interceptar antes de Next.js
    window.addEventListener('popstate', handlePopState, true);

    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('popstate', handlePopState, true);
    };
  }, [router]);
}
