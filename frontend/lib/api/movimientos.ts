import { apiFetch, ApiError, type ApiCollection, type ApiResource } from "./client";
import type { Concepto } from "./conceptos";
import type { VentanaPresupuesto } from "./presupuestos";
import { OFFLINE_CACHE_KEYS, scopedKey, withOfflineCache } from "@/lib/offline/cached-fetch";
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

/**
 * Mismo texto exacto que arma el backend en PresupuestoUmbralNotification
 * (mensaje()) — antes el toast del formulario decía algo distinto a lo que
 * terminaba guardado en el inbox/push, esto es la única fuente de verdad
 * para ambos.
 */
export function formatAlertaPresupuestoMensaje(alerta: AlertaPresupuesto): string {
  const pct = Math.round(alerta.pct_actual);
  const monto = alerta.monto_presupuesto.toFixed(2);
  return `Ya alcanzaste el ${pct}% de tu presupuesto de "${alerta.concepto_nombre}" ($${monto}).`;
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

async function queuedToRaw(token: string, item: QueuedMovimiento): Promise<MovimientoRaw> {
  const [conceptosCache, cuentasCache] = await Promise.all([
    readJson<{ data: Concepto[] }>(scopedKey(OFFLINE_CACHE_KEYS.conceptos, token)),
    readJson<ApiCollection<{ id: number; nombre: string }>>(scopedKey(OFFLINE_CACHE_KEYS.cuentas, token)),
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
  return withOfflineCache(scopedKey(OFFLINE_CACHE_KEYS.movimientos, token), async () => {
    const result = await apiFetch<ApiCollection<MovimientoRaw>>("/movimientos", { token });
    // Se cachea completo tal cual llega (el backend ya ordena por fecha
    // desc); solo se recorta a un tope razonable para no inflar el
    // almacenamiento local sin límite en cuentas con mucha antigüedad.
    return { ...result, data: result.data.slice(0, OFFLINE_MOVIMIENTOS_LIMIT) };
  }).then(async (result) => {
    if (!isNativeApp()) return result;
    const queue = await getQueue(token);
    if (queue.length === 0) return result;
    const pending = await Promise.all(queue.map((item) => queuedToRaw(token, item)));
    return { ...result, data: [...pending, ...result.data] };
  });
}

async function queueOffline(token: string, body: MovimientoPayload): Promise<MovimientoResponse> {
  await enqueueMovimiento(token, body);
  return {
    mensaje: "Movimiento guardado sin conexión. Se sincronizará automáticamente.",
    data: await queuedToRaw(token, {
      localId: "temp",
      payload: body,
      createdAt: new Date().toISOString(),
      userId: "",
    }),
  };
}

export async function createMovimiento(token: string, body: MovimientoPayload): Promise<MovimientoResponse> {
  if (!isNativeApp()) {
    return apiFetch<MovimientoResponse>("/movimientos", { method: "POST", token, body });
  }

  if (!(await isOnline())) {
    return queueOffline(token, body);
  }

  try {
    return await apiFetch<MovimientoResponse>("/movimientos", { method: "POST", token, body });
  } catch (err) {
    // El dispositivo dice "conectado" (tiene wifi/datos), pero la petición
    // igual falló sin llegar a una respuesta real del servidor (no hay
    // ApiError, o el servidor respondió con un 5xx — caído/sobrecargado) —
    // desde la perspectiva del usuario es lo mismo que estar sin conexión:
    // el movimiento se encola en vez de perderse. Un error real de la API
    // (4xx — validación, datos inválidos) sí se propaga tal cual, porque
    // reintentarlo más tarde sin cambios no lo va a arreglar.
    const esFalloDeServicio = !(err instanceof ApiError) || err.status >= 500;
    if (esFalloDeServicio) {
      return queueOffline(token, body);
    }
    throw err;
  }
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
