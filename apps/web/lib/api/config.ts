/**
 * Configuración del API
 * Maneja la URL base del backend y construcción de endpoints
 */

/**
 * Obtiene la URL base del API
 * En el cliente, detecta automáticamente la IP del servidor basándose en la URL actual
 * En el servidor, usa la variable de entorno o localhost por defecto
 * @returns URL base del API
 */
export function getApiUrl(): string {
  // En el cliente (navegador), detectar automáticamente la IP
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = 3001;
    
    // Si estamos en localhost, usar localhost para el API
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://localhost:${port}`;
    }
    
    // Si estamos accediendo desde una IP de red local, usar esa misma IP para el API
    // Esto permite acceso desde móviles y otros dispositivos en la red local
    return `http://${hostname}:${port}`;
  }
  
  // En el servidor (SSR), usar variable de entorno o localhost
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!apiUrl) {
    // Fallback a localhost para desarrollo si no está configurado
    if (process.env.NODE_ENV === 'development') {
      console.warn('NEXT_PUBLIC_API_URL no está configurada, usando http://localhost:3001 por defecto');
      return 'http://localhost:3001';
    }
    throw new Error('NEXT_PUBLIC_API_URL no está configurada. Por favor, configura la variable de entorno.');
  }

  // Remover trailing slash si existe
  return apiUrl.replace(/\/$/, '');
}

/**
 * Construye una URL completa para un endpoint del API
 * @param path - Ruta del endpoint (ej: '/api/movimientos' o 'api/movimientos')
 * @returns URL completa del endpoint
 */
export function getApiEndpoint(path: string): string {
  const apiUrl = getApiUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiUrl}${normalizedPath}`;
}
