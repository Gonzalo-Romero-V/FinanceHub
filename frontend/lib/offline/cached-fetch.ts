import { ApiError } from "@/lib/api/client";
import { getUserIdFromToken } from "@/lib/auth/storage";
import { isNativeApp } from "./platform";
import { readJson, writeJson } from "./storage";

/**
 * Envuelve una llamada de lectura (`listCuentas`, `getBalance`, etc.) para
 * que en la app nativa quede resiliente a estar offline: si la llamada real
 * funciona, actualiza el caché en segundo plano; si falla por falta de red
 * (no por un error HTTP normal — eso se sigue propagando tal cual, un 401 no
 * debería mostrar datos viejos como si nada), devuelve la última respuesta
 * conocida. En web es un passthrough total, no cambia nada.
 */
export async function withOfflineCache<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  if (!isNativeApp()) return fetcher();

  try {
    const result = await fetcher();
    void writeJson(cacheKey, result);
    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    const cached = await readJson<T>(cacheKey);
    if (cached !== null) return cached;
    throw err;
  }
}

export const OFFLINE_CACHE_KEYS = {
  cuentas: "cache:cuentas",
  tiposCuenta: "cache:tipos-cuenta",
  balance: "cache:balance",
  movimientos: "cache:movimientos",
  conceptos: "cache:conceptos",
  tiposMovimiento: "cache:tipos-movimiento",
  presupuestos: "cache:presupuestos",
  deudas: "cache:deudas",
} as const;

/**
 * Escopa una clave de caché por usuario (derivado del token) — sin esto, la
 * caché es un único valor global que sobrevive el logout, y un usuario
 * distinto que entre en el mismo dispositivo vería/heredaría datos del
 * usuario anterior.
 */
export function scopedKey(baseKey: string, token: string): string {
  return `${baseKey}:${getUserIdFromToken(token)}`;
}
