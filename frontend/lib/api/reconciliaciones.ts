import { apiFetch, type ApiCollection, type ApiResource } from "./client";
import type { Movimiento } from "./movimientos";

export interface Reconciliacion {
  id: number;
  cuenta_id: number;
  user_id: number;
  saldo_real: number;
  saldo_sistema: number;
  diferencia: number;
  movimiento_ajuste_id: number | null;
  nota: string | null;
  fecha: string;
  movimiento_ajuste?: Movimiento | null;
}

export interface ReconciliacionPayload {
  saldo_real: number;
  crear_ajuste?: boolean;
  nota?: string;
}

export function listReconciliaciones(token: string, cuentaId: number) {
  return apiFetch<ApiCollection<Reconciliacion>>(
    `/cuentas/${cuentaId}/reconciliaciones`,
    { token }
  );
}

export function createReconciliacion(
  token: string,
  cuentaId: number,
  body: ReconciliacionPayload
) {
  return apiFetch<ApiResource<Reconciliacion>>(
    `/cuentas/${cuentaId}/reconciliar`,
    { method: "POST", token, body }
  );
}
