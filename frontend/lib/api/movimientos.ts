import { apiFetch, type ApiCollection, type ApiResource } from "./client";
import type { Concepto } from "./conceptos";
import type { VentanaPresupuesto } from "./presupuestos";
import { OFFLINE_CACHE_KEYS, withOfflineCache } from "@/lib/offline/cached-fetch";
import { isNativeApp } from "@/lib/offline/platform";
import { isOnline } from "@/lib/offline/network";
import { enqueueMovimiento, getQueue, type QueuedMovimiento } from "@/lib/offline/queue";
import { readJson } from "@/lib/offline/storage";

// Tope de movimientos cacheados offline (no toda la historia — alcanza y
// sobra para dar contexto reciente al registrar uno nuevo sin conexión).
const OFFLINE_MOVIMIENTOS_LIMIT = 200;

export interface AlertaPresupuesto {
  presupuesto_id: number;
  concepto_id: number;
  concepto_nombre: string;
  ventana: VentanaPresupuesto;
  umbral: number;
  pct_actual: number;
  total_actual: number;
  monto_presupuesto: number;
}

export interface MovimientoResponse extends ApiResource<MovimientoRaw> {
  alertas_presupuesto?: AlertaPresupuesto[];
}

export type Movimiento = MovimientoRaw;

export interface MovimientoRaw {
  id: number;
  fecha: string;
  concepto_id?: number;
  cuenta_origen_id?: number;
  cuenta_destino_id?: number;
  monto: number;
  nota?: string;
  concepto?: Concepto;
  cuenta_origen?: { id: number; nombre: string };
  cuenta_destino?: { id: number; nombre: string };
  /** true solo en entradas sintéticas: se creó offline y todavía no subió al servidor. */
  pendiente_sync?: boolean;
}

export interface MovimientoPayload {
  monto: number;
  concepto_id: number | null;
  cuenta_origen_id?: number | null;
  cuenta_destino_id?: number | null;
  nota?: string | null;
}

async function queuedToRaw(item: QueuedMovimiento): Promise<MovimientoRaw> {
  const [conceptosCache, cuentasCache] = await Promise.all([
    readJson<{ data: Concepto[] }>(OFFLINE_CACHE_KEYS.conceptos),
    readJson<ApiCollection<{ id: number; nombre: string }>>(OFFLINE_CACHE_KEYS.cuentas),
  ]);

  const concepto = conceptosCache?.data.find((c) => c.id === item.payload.concepto_id);
  const cuentaOrigen = cuentasCache?.data.find((c) => c.id === item.payload.cuenta_origen_id);
  const cuentaDestino = cuentasCache?.data.find((c) => c.id === item.payload.cuenta_destino_id);

  return {
    id: -Date.parse(item.createdAt), // negativo: nunca choca con un id real del servidor
    fecha: item.createdAt.slice(0, 10),
    concepto_id: item.payload.concepto_id ?? undefined,
    cuenta_origen_id: item.payload.cuenta_origen_id ?? undefined,
    cuenta_destino_id: item.payload.cuenta_destino_id ?? undefined,
    monto: item.payload.monto,
    nota: item.payload.nota ?? undefined,
    concepto,
    cuenta_origen: cuentaOrigen,
    cuenta_destino: cuentaDestino,
    pendiente_sync: true,
  };
}

export function listMovimientos(token: string) {
  return withOfflineCache(OFFLINE_CACHE_KEYS.movimientos, async () => {
    const result = await apiFetch<ApiCollection<MovimientoRaw>>("/movimientos", { token });
    // Se cachea completo tal cual llega (el backend ya ordena por fecha
    // desc); solo se recorta a un tope razonable para no inflar el
    // almacenamiento local sin límite en cuentas con mucha antigüedad.
    return { ...result, data: result.data.slice(0, OFFLINE_MOVIMIENTOS_LIMIT) };
  }).then(async (result) => {
    if (!isNativeApp()) return result;
    const queue = await getQueue();
    if (queue.length === 0) return result;
    const pending = await Promise.all(queue.map(queuedToRaw));
    return { ...result, data: [...pending, ...result.data] };
  });
}

export async function createMovimiento(token: string, body: MovimientoPayload): Promise<MovimientoResponse> {
  if (isNativeApp() && !(await isOnline())) {
    await enqueueMovimiento(body);
    return {
      mensaje: "Movimiento guardado sin conexión. Se sincronizará automáticamente.",
      data: await queuedToRaw({ localId: "temp", payload: body, createdAt: new Date().toISOString() }),
    };
  }

  return apiFetch<MovimientoResponse>("/movimientos", {
    method: "POST",
    token,
    body,
  });
}

export function updateMovimiento(token: string, id: number, body: Partial<MovimientoPayload>) {
  return apiFetch<MovimientoResponse>(`/movimientos/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteMovimiento(token: string, id: number) {
  return apiFetch<void>(`/movimientos/${id}`, {
    method: "DELETE",
    token,
  });
}
