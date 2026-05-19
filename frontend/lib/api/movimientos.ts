import { apiFetch, type ApiCollection, type ApiResource } from "./client";
import type { Concepto } from "./conceptos";

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
}

export interface MovimientoPayload {
  monto: number;
  concepto_id: number | null;
  cuenta_origen_id?: number | null;
  cuenta_destino_id?: number | null;
  nota?: string | null;
}

export function listMovimientos(token: string) {
  return apiFetch<ApiCollection<MovimientoRaw>>("/movimientos", { token });
}

export function createMovimiento(token: string, body: MovimientoPayload) {
  return apiFetch<ApiResource<MovimientoRaw>>("/movimientos", {
    method: "POST",
    token,
    body,
  });
}

export function updateMovimiento(token: string, id: number, body: Partial<MovimientoPayload>) {
  return apiFetch<ApiResource<MovimientoRaw>>(`/movimientos/${id}`, {
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
