import { apiFetch } from "./client";
import { OFFLINE_CACHE_KEYS, withOfflineCache } from "@/lib/offline/cached-fetch";

export interface BalanceCuenta {
  id: number;
  nombre: string;
  tipo: string;
  saldo: number;
  saldo_inicial: number;
  ultima_reconciliacion: string | null;
}

export interface Balance {
  mensaje: string;
  patrimonio_total: number;
  total_activos: number;
  total_pasivos: number;
  total_ingresos: number;
  total_egresos: number;
  proxima_reconciliacion: string | null;
  alerta_reconciliacion: boolean;
  cuentas: BalanceCuenta[];
}

export function getBalance(token: string) {
  return withOfflineCache(OFFLINE_CACHE_KEYS.balance, () => apiFetch<Balance>("/balance", { token }));
}
