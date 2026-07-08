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

// Paleta movida a lib/ui/color-palette.ts (compartida con cuentas.ts).
export { COLOR_PALETTE as CONCEPTO_PALETTE } from "@/lib/ui/color-palette";
