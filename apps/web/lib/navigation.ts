/**
 * Configuración de jerarquía de rutas para navegación jerárquica
 * Define la relación padre-hijo entre las rutas de la aplicación
 */
export const routeHierarchy: Record<string, string | null> = {
  '/': null,           // Raíz, sin padre
  '/dashboard': '/',   // Dashboard tiene como padre a home
  '/settings': '/dashboard', // Settings tiene como padre a dashboard
  '/nuevo-movimiento': '/dashboard', // Nuevo movimiento tiene como padre a dashboard
  '/cuentas': '/dashboard', // Cuentas tiene como padre a dashboard
  '/conceptos': '/dashboard', // Conceptos tiene como padre a dashboard
};

/**
 * Obtiene la ruta padre de una ruta dada según la jerarquía configurada
 * @param pathname - La ruta actual
 * @returns La ruta padre o null si no tiene padre
 */
export function getParentRoute(pathname: string): string | null {
  // Normalizar pathname (remover trailing slash excepto para raíz)
  const normalized = pathname === '/' ? '/' : pathname.replace(/\/$/, '');
  return routeHierarchy[normalized] ?? null;
}
