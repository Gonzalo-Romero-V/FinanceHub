export type TipoMovimientoNombre = 'ingreso' | 'egreso' | 'transferencia';

/**
 * Normaliza el nombre del tipo de movimiento.
 * Nota: La BD puede contener valores como "Ingreso"/"Egreso"/"Transferencia".
 */
export function normalizeTipoMovimientoNombre(nombre: unknown): TipoMovimientoNombre {
  const normalized = String(nombre).trim().toLowerCase();
  if (normalized === 'ingreso' || normalized === 'egreso' || normalized === 'transferencia') {
    return normalized;
  }
  throw new Error(`Tipo de movimiento inválido: "${String(nombre)}"`);
}


