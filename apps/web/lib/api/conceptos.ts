/**
 * Servicios para interactuar con conceptos
 */

import { apiGet, apiPost, apiPut, apiDelete } from './client';
import type { ConceptoConTipo } from '../types/movimientos';
import type { ApiResult } from './client';
import type { CrearConcepto, ActualizarConcepto } from '../types/movimientos';

/**
 * Obtiene todos los conceptos, opcionalmente filtrados por tipo de movimiento
 * Incluye la relación con TipoMovimiento
 * @param tipoMovimientoId - ID del tipo de movimiento para filtrar (opcional)
 */
export async function getConceptos(tipoMovimientoId?: number): Promise<ApiResult<ConceptoConTipo[]>> {
  const params = tipoMovimientoId ? { tipo_movimiento_id: tipoMovimientoId } : undefined;
  return apiGet<ConceptoConTipo[]>('/api/conceptos', { params });
}

/**
 * Obtiene un concepto por ID
 * Incluye la relación con TipoMovimiento
 */
export async function getConceptoById(id: number): Promise<ApiResult<ConceptoConTipo>> {
  return apiGet<ConceptoConTipo>(`/api/conceptos/${id}`);
}

/**
 * Crea un nuevo concepto
 */
export async function createConcepto(data: CrearConcepto): Promise<ApiResult<ConceptoConTipo>> {
  return apiPost<ConceptoConTipo>('/api/conceptos', data);
}

/**
 * Actualiza un concepto existente
 */
export async function updateConcepto(id: number, data: ActualizarConcepto): Promise<ApiResult<ConceptoConTipo>> {
  return apiPut<ConceptoConTipo>(`/api/conceptos/${id}`, data);
}

/**
 * Elimina un concepto
 */
export async function deleteConcepto(id: number): Promise<ApiResult<{ message: string }>> {
  return apiDelete<{ message: string }>(`/api/conceptos/${id}`);
}
