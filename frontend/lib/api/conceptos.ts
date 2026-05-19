import { apiFetch, type ApiCollection, type ApiResource } from "./client";

export interface TipoMovimiento {
  id: number;
  nombre: string;
}

export interface Concepto {
  id: number;
  nombre: string;
  tipo_movimiento?: TipoMovimiento;
  total_monto?: number;
}

export interface ConceptoPayload {
  nombre: string;
  tipo_movimiento_id: number;
}

export function listConceptos(token: string) {
  return apiFetch<ApiCollection<Concepto>>("/conceptos", { token });
}

export function listTiposMovimiento(token: string) {
  return apiFetch<ApiCollection<TipoMovimiento>>("/tipos-movimiento", { token });
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
