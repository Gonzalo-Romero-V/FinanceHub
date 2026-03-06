/**
 * Servicios para interactuar con totales financieros
 */

import { apiGet } from './client';
import type { TotalesFinancieros } from '../types/movimientos';
import type { ApiResult } from './client';

/**
 * Obtiene los totales financieros (activos, pasivos y patrimonio)
 */
export async function getTotalesFinancieros(): Promise<ApiResult<TotalesFinancieros>> {
  return apiGet<TotalesFinancieros>('/api/totales');
}
