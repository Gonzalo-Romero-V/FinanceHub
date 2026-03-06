/**
 * Servicios para interactuar con movimientos
 */

import { apiGet, apiPost } from './client';
import type { Movimiento, CrearMovimiento } from '../types/movimientos';
import type { ApiResult } from './client';

/**
 * Obtiene todos los movimientos con filtros opcionales
 */
export async function getMovimientos(filters?: {
  cuenta_origen_id?: number;
  cuenta_destino_id?: number;
  concepto_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
}): Promise<ApiResult<Movimiento[]>> {
  return apiGet<Movimiento[]>('/api/movimientos', { params: filters });
}

/**
 * Obtiene un movimiento por ID
 */
export async function getMovimientoById(id: number): Promise<ApiResult<Movimiento>> {
  return apiGet<Movimiento>(`/api/movimientos/${id}`);
}

/**
 * Crea un nuevo movimiento
 */
export async function createMovimiento(data: CrearMovimiento): Promise<ApiResult<Movimiento>> {
  return apiPost<Movimiento>('/api/movimientos', data);
}
