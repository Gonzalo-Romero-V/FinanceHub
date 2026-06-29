import { apiFetch, type ApiCollection, type ApiResource } from "./client";

export interface Cuenta {
  id: number;
  nombre: string;
  saldo: number;
  saldo_inicial: number;
  fecha_creacion: string;
  activa: boolean;
  tipo_cuenta_id?: number;
  tipo_cuenta?: { id: number; nombre: string };
  tipoCuenta?: { id: number; nombre: string };
}

export interface TipoCuenta {
  id: number;
  nombre: string;
}

export interface CuentaPayload {
  nombre: string;
  tipo_cuenta_id: number;
  saldo?: number;
  activa: boolean;
}

export function listCuentas(token: string) {
  return apiFetch<ApiCollection<Cuenta>>("/cuentas", { token });
}

export function listTiposCuenta(token: string) {
  return apiFetch<ApiCollection<TipoCuenta>>("/tipos-cuenta", { token });
}

export function createCuenta(token: string, body: CuentaPayload) {
  return apiFetch<ApiResource<Cuenta>>("/cuentas", {
    method: "POST",
    token,
    body,
  });
}

export function updateCuenta(token: string, id: number, body: Partial<CuentaPayload>) {
  return apiFetch<ApiResource<Cuenta>>(`/cuentas/${id}`, {
    method: "PATCH",
    token,
    body,
  });
}

export function deleteCuenta(token: string, id: number) {
  return apiFetch<void>(`/cuentas/${id}`, {
    method: "DELETE",
    token,
  });
}
