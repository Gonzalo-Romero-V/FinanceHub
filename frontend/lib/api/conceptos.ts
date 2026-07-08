import { apiFetch, type ApiCollection, type ApiResource } from "./client";
import { OFFLINE_CACHE_KEYS, withOfflineCache } from "@/lib/offline/cached-fetch";

export interface TipoMovimiento {
  id: number;
  nombre: string;
}

export interface Concepto {
  id: number;
  nombre: string;
  parent_id: number | null;
  color: string | null;           // hex solo en conceptos raíz
  es_sistema?: boolean;
  tipo_movimiento?: TipoMovimiento;
  tipo_movimiento_id?: number;
  parent?: Concepto | null;
  children?: Concepto[];
  total_monto?: number;
}

export interface ConceptoPayload {
  nombre: string;
  tipo_movimiento_id?: number;    // requerido en raíces, omitir en hijos
  parent_id?: number | null;
  color?: string | null;
}

/** Devuelve el color efectivo de un concepto (propio o heredado del padre). */
export function conceptoColor(c: Concepto): string {
  if (c.color) return c.color;
  if (c.parent?.color) return c.parent.color;
  return "#64748b"; // slate default
}

/** Color suavizado para subconceptos. */
export function childConceptoColor(parentHex: string): string {
  return parentHex + "80"; // 50% de opacidad en hex
}

export interface ConceptoListResponse {
  mensaje: string;
  data: Concepto[];   // lista flat (para selectores)
  tree: Concepto[];   // árbol (para la página)
}

export function listConceptos(token: string) {
  return withOfflineCache(OFFLINE_CACHE_KEYS.conceptos, () =>
    apiFetch<ConceptoListResponse>("/conceptos", { token }),
  );
}

export function listTiposMovimiento(token: string) {
  return withOfflineCache(OFFLINE_CACHE_KEYS.tiposMovimiento, () =>
    apiFetch<ApiCollection<TipoMovimiento>>("/tipos-movimiento", { token }),
  );
}

export function createConcepto(token: string, body: ConceptoPayload) {
  return apiFetch<ApiResource<Concepto>>("/conceptos", {
    method: "POST",
    token,
    body,
  });
}

export function updateConcepto(token: string, id: number, body: Partial<ConceptoPayload>) {
  return apiFetch<ApiResource<Concepto>>(`/conceptos/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteConcepto(token: string, id: number) {
  return apiFetch<void>(`/conceptos/${id}`, {
    method: "DELETE",
    token,
  });
}

// ─── Paleta curada (16 colores) ──────────────────────────────────────────────

export const CONCEPTO_PALETTE: { name: string; hex: string }[] = [
  { name: "Rojo",      hex: "#ef4444" },
  { name: "Naranja",   hex: "#f97316" },
  { name: "Amarillo",  hex: "#eab308" },
  { name: "Lima",      hex: "#84cc16" },
  { name: "Verde",     hex: "#22c55e" },
  { name: "Esmeralda", hex: "#10b981" },
  { name: "Teal",      hex: "#14b8a6" },
  { name: "Cian",      hex: "#06b6d4" },
  { name: "Azul",      hex: "#3b82f6" },
  { name: "Índigo",    hex: "#6366f1" },
  { name: "Violeta",   hex: "#8b5cf6" },
  { name: "Púrpura",   hex: "#a855f7" },
  { name: "Rosa",      hex: "#ec4899" },
  { name: "Rose",      hex: "#f43f5e" },
  { name: "Pizarra",   hex: "#64748b" },
  { name: "Piedra",    hex: "#78716c" },
];
