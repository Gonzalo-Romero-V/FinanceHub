/**
 * Servicios para interactuar con tipos de movimiento
 */

import { apiGet } from './client';
import type { TipoMovimiento } from '../types/movimientos';
import type { ApiResult } from './client';

/**
 * Obtiene todos los tipos de movimiento
 */
export async function getTiposMovimiento(): Promise<ApiResult<TipoMovimiento[]>> {
  return apiGet<TipoMovimiento[]>('/api/tipos-movimiento');
}

/**
 * Obtiene un tipo de movimiento por ID
 */
export async function getTipoMovimientoById(id: number): Promise<ApiResult<TipoMovimiento>> {
  return apiGet<TipoMovimiento>(`/api/tipos-movimiento/${id}`);
}
