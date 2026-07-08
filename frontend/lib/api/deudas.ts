import { apiFetch, type ApiCollection, type ApiResource } from "./client";
import { OFFLINE_CACHE_KEYS, scopedKey, withOfflineCache } from "@/lib/offline/cached-fetch";

export type SistemaAmortizacion = "frances" | "aleman" | "bullet";
export type EstadoDeuda = "activa" | "pagada" | "cancelada";

export const SISTEMA_LABELS: Record<SistemaAmortizacion, string> = {
  frances: "Francés",
  aleman: "Alemán",
  bullet: "Pago único",
};

export const SISTEMA_DESCRIPTIONS: Record<SistemaAmortizacion, string> = {
  frances: "Cuota fija. Más interés al principio, más capital al final.",
  aleman: "Capital constante. La cuota disminuye cada período.",
  bullet: "Todo al vencimiento. Se paga capital + interés en una sola cuota.",
};

export interface Cuota {
  id: number;
  deuda_id: number;
  numero_cuota: number;
  fecha_vencimiento: string;
  cuota_total: number;
  capital: number | null;
  interes: number | null;
  saldo_restante: number;
  pagada: boolean;
  fecha_pago: string | null;
  movimiento_id: number | null;
}

export interface Deuda {
  id: number;
  user_id: number;
  nombre: string;
  acreedor: string | null;
  sistema: SistemaAmortizacion;
  monto_original: number;
  plazo_meses: number;
  fecha_inicio: string;
  tasa_mensual: number | null;
  cuota_directa: number | null;
  total_informal: number | null;
  notas: string | null;
  estado: EstadoDeuda;
  created_at?: string;
  updated_at?: string;
  // Campos computados
  cuotas: Cuota[];
  total_cuotas: number;
  cuotas_pagadas: number;
  monto_pagado: number;
  total_a_pagar: number;
  saldo_pendiente: number;
  progreso_pct: number;
  proxima_cuota: Cuota | null;
  interes_implicito: number | null;
}

export interface DeudaPayload {
  nombre: string;
  acreedor?: string | null;
  sistema: SistemaAmortizacion;
  monto_original: number;
  plazo_meses: number;
  fecha_inicio: string;
  tasa_mensual?: number | null;
  cuota_directa?: number | null;
  total_informal?: number | null;
  notas?: string | null;
}

export interface DeudaUpdatePayload {
  nombre?: string;
  acreedor?: string | null;
  notas?: string | null;
  estado?: EstadoDeuda;
}

export function listDeudas(token: string) {
  return withOfflineCache(scopedKey(OFFLINE_CACHE_KEYS.deudas, token), () =>
    apiFetch<ApiCollection<Deuda>>("/deudas", { token }),
  );
}

export function createDeuda(token: string, body: DeudaPayload) {
  return apiFetch<ApiResource<Deuda>>("/deudas", { method: "POST", token, body });
}

export function getDeuda(token: string, id: number) {
  return apiFetch<ApiResource<Deuda>>(`/deudas/${id}`, { token });
}

export function updateDeuda(token: string, id: number, body: DeudaUpdatePayload) {
  return apiFetch<ApiResource<Deuda>>(`/deudas/${id}`, { method: "PATCH", token, body });
}

export function deleteDeuda(token: string, id: number) {
  return apiFetch<void>(`/deudas/${id}`, { method: "DELETE", token });
}

export function pagarCuota(token: string, deudaId: number, cuotaId: number, cuentaId?: number | null) {
  return apiFetch<ApiResource<Deuda>>(`/deudas/${deudaId}/cuotas/${cuotaId}/pagar`, {
    method: "POST",
    token,
    body: { cuenta_id: cuentaId ?? null },
  });
}

// ─── Preview client-side (para el formulario) ───────────────────────────────

export interface PreviewDeuda {
  cuotaFija?: number;
  primeraCuota?: number;
  ultimaCuota?: number;
  totalAPagar: number;
  interesTotal: number;
  tasaImplicita?: number;
}

export function calcularPreview(
  sistema: SistemaAmortizacion,
  monto: number,
  plazo: number,
  tasa?: number | null,
  cuotaDirecta?: number | null,
  totalInformal?: number | null,
): PreviewDeuda | null {
  if (!monto || !plazo || monto <= 0 || plazo < 1) return null;

  if (sistema === "frances") {
    if (cuotaDirecta !== null && cuotaDirecta !== undefined && cuotaDirecta > 0) {
      const total = cuotaDirecta * plazo;
      const interes = total - monto;
      const tasaImp = monto > 0 && plazo > 0 ? (interes / monto / plazo) * 100 : undefined;
      return { cuotaFija: cuotaDirecta, totalAPagar: total, interesTotal: interes, tasaImplicita: tasaImp };
    }
    if (tasa !== null && tasa !== undefined && tasa >= 0) {
      const i = tasa / 100;
      const cuota = i > 0 ? monto * i / (1 - Math.pow(1 + i, -plazo)) : monto / plazo;
      const total = cuota * plazo;
      return { cuotaFija: cuota, totalAPagar: total, interesTotal: total - monto };
    }
    return null;
  }

  if (sistema === "aleman") {
    if (tasa === null || tasa === undefined) return null;
    const i = tasa / 100;
    const capitalFijo = monto / plazo;
    const primeraCuota = capitalFijo + monto * i;
    const ultimaCuota = capitalFijo + capitalFijo * i;
    let total = 0;
    let saldo = monto;
    for (let k = 0; k < plazo; k++) {
      total += capitalFijo + saldo * i;
      saldo -= capitalFijo;
    }
    return { primeraCuota, ultimaCuota, totalAPagar: total, interesTotal: total - monto };
  }

  if (sistema === "bullet") {
    if (totalInformal !== null && totalInformal !== undefined && totalInformal > 0) {
      const interes = totalInformal - monto;
      const tasaImp = monto > 0 && plazo > 0 ? (interes / monto / plazo) * 100 : undefined;
      return { totalAPagar: totalInformal, interesTotal: interes, tasaImplicita: tasaImp };
    }
    if (tasa !== null && tasa !== undefined && tasa >= 0) {
      const i = tasa / 100;
      const interesTotal = monto * i * plazo;
      return { totalAPagar: monto + interesTotal, interesTotal };
    }
    return null;
  }

  return null;
}
