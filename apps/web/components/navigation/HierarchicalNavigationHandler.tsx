'use client';

import { useHierarchicalNavigation } from '@/lib/useHierarchicalNavigation';

/**
 * Componente que maneja la navegación jerárquica
 * Se integra en el layout principal para estar activo en todas las páginas
 */
export function HierarchicalNavigationHandler() {
  useHierarchicalNavigation();
  return null;
}
