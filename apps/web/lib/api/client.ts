/**
 * Cliente HTTP reutilizable para llamadas al API
 * Maneja errores, tipos TypeScript y respuestas estandarizadas
 */

import { getApiEndpoint } from './config';
import type { ApiResponse, ApiError } from '../types/movimientos';

/**
 * Tipo de respuesta del API (éxito o error)
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Opciones para las peticiones HTTP
 */
interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

/**
 * Construye una URL con query parameters
 */
function buildUrlWithParams(endpoint: string, params?: Record<string, string | number | undefined>): string {
  const url = getApiEndpoint(endpoint);
  
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Maneja errores de fetch (red, conexión, etc.)
 */
function handleFetchError(error: unknown): ApiError {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Error de red al conectar con el servidor',
  };
}

/**
 * Maneja errores de la respuesta HTTP
 */
async function handleResponse<T>(response: Response): Promise<ApiResult<T>> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  let data: ApiResponse<T> | ApiError;
  
  try {
    data = isJson ? await response.json() : { success: false, error: 'Respuesta no válida del servidor' };
  } catch (error) {
    return {
      success: false,
      error: 'Error al procesar la respuesta del servidor',
    };
  }

  if (!response.ok) {
    return {
      success: false,
      error: (data as ApiError).error || `Error ${response.status}: ${response.statusText}`,
    };
  }

  return data as ApiResponse<T>;
}

/**
 * Realiza una petición GET al API
 */
export async function apiGet<T>(endpoint: string, options?: RequestOptions): Promise<ApiResult<T>> {
  try {
    const url = buildUrlWithParams(endpoint, options?.params);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    return handleResponse<T>(response);
  } catch (error) {
    return handleFetchError(error);
  }
}

/**
 * Realiza una petición POST al API
 */
export async function apiPost<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<ApiResult<T>> {
  try {
    const url = buildUrlWithParams(endpoint, options?.params);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });

    return handleResponse<T>(response);
  } catch (error) {
    return handleFetchError(error);
  }
}

/**
 * Realiza una petición PUT al API
 */
export async function apiPut<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<ApiResult<T>> {
  try {
    const url = buildUrlWithParams(endpoint, options?.params);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });

    return handleResponse<T>(response);
  } catch (error) {
    return handleFetchError(error);
  }
}

/**
 * Realiza una petición PATCH al API
 */
export async function apiPatch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<ApiResult<T>> {
  try {
    const url = buildUrlWithParams(endpoint, options?.params);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    return handleResponse<T>(response);
  } catch (error) {
    return handleFetchError(error);
  }
}

/**
 * Realiza una petición DELETE al API
 */
export async function apiDelete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResult<T>> {
  try {
    const url = buildUrlWithParams(endpoint, options?.params);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    return handleResponse<T>(response);
  } catch (error) {
    return handleFetchError(error);
  }
}
