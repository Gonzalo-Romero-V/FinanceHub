/**
 * Servicios para interactuar con cuentas
 */

import { apiGet, apiPost, apiPut, apiPatch } from './client';
import type { Cuenta } from '../types/movimientos';
import type { ApiResult } from './client';
import type { CrearCuenta, ActualizarCuenta } from '../types/movimientos';

/**
 * Obtiene todas las cuentas, opcionalmente filtradas por tipo de cuenta y estado activo
 * @param tipoCuenta - Tipo de cuenta para filtrar: 'activo' o 'pasivo' (opcional)
 * @param activa - Si es true, solo cuentas activas; si es false, solo inactivas; si es undefined, todas (opcional)
 */
export async function getCuentas(
  tipoCuenta?: 'activo' | 'pasivo',
  activa?: boolean
): Promise<ApiResult<Cuenta[]>> {
  const params: Record<string, string | number | undefined> = {};
  
  if (tipoCuenta !== undefined) {
    params.tipo_cuenta = tipoCuenta;
  }
  
  if (activa !== undefined) {
    params.activa = activa.toString();
  }

  return apiGet<Cuenta[]>('/api/cuentas', { params: Object.keys(params).length > 0 ? params : undefined });
}

/**
 * Obtiene una cuenta por ID
 */
export async function getCuentaById(id: number): Promise<ApiResult<Cuenta>> {
  return apiGet<Cuenta>(`/api/cuentas/${id}`);
}

/**
 * Crea una nueva cuenta
 */
export async function createCuenta(data: CrearCuenta): Promise<ApiResult<Cuenta>> {
  return apiPost<Cuenta>('/api/cuentas', data);
}

/**
 * Actualiza una cuenta existente
 */
export async function updateCuenta(id: number, data: ActualizarCuenta): Promise<ApiResult<Cuenta>> {
  return apiPut<Cuenta>(`/api/cuentas/${id}`, data);
}

/**
 * Activa una cuenta
 */
export async function activarCuenta(id: number): Promise<ApiResult<Cuenta>> {
  return apiPatch<Cuenta>(`/api/cuentas/${id}/activar`);
}

/**
 * Desactiva una cuenta
 */
export async function desactivarCuenta(id: number): Promise<ApiResult<Cuenta>> {
  return apiPatch<Cuenta>(`/api/cuentas/${id}/desactivar`);
}
