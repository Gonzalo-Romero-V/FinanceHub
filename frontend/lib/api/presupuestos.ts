import { apiFetch, type ApiCollection, type ApiResource } from "./client";
import type { Concepto } from "./conceptos";
import { OFFLINE_CACHE_KEYS, scopedKey, withOfflineCache } from "@/lib/offline/cached-fetch";

export type VentanaPresupuesto = "diario" | "semanal" | "mensual" | "anual";

export const VENTANAS: { value: VentanaPresupuesto; label: string }[] = [
  { value: "diario", label: "Diario" },
  { value: "semanal", label: "Semanal" },
  { value: "mensual", label: "Mensual" },
  { value: "anual", label: "Anual" },
];

export const VENTANA_LABELS: Record<VentanaPresupuesto, string> = {
  diario: "diario",
  semanal: "semanal",
  mensual: "mensual",
  anual: "anual",
};

export const UMBRALES_DISPONIBLES = [50, 75, 90] as const;

export interface Presupuesto {
  id: number;
  user_id: number;
  concepto_id: number;
  monto: number;
  ventana: VentanaPresupuesto;
  umbrales: number[];
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  concepto?: Concepto;
  // Campos computados por el backend
  consumo?: number;
  porcentaje?: number;
  periodo?: { inicio: string; fin: string };
}

export interface PresupuestoPayload {
  concepto_id: number;
  monto: number;
  ventana: VentanaPresupuesto;
  umbrales?: number[];
  activo?: boolean;
}

export function listPresupuestos(token: string) {
  return withOfflineCache(scopedKey(OFFLINE_CACHE_KEYS.presupuestos, token), () =>
    apiFetch<ApiCollection<Presupuesto>>("/presupuestos", { token }),
  );
}

export function createPresupuesto(token: string, body: PresupuestoPayload) {
  return apiFetch<ApiResource<Presupuesto>>("/presupuestos", {
    method: "POST",
    token,
    body,
  });
}

export function updatePresupuesto(token: string, id: number, body: Partial<Omit<PresupuestoPayload, "concepto_id">>) {
  return apiFetch<ApiResource<Presupuesto>>(`/presupuestos/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deletePresupuesto(token: string, id: number) {
  return apiFetch<void>(`/presupuestos/${id}`, {
    method: "DELETE",
    token,
  });
}
