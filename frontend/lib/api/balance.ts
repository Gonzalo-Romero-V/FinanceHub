import { apiFetch } from "./client";
import { OFFLINE_CACHE_KEYS, scopedKey, withOfflineCache } from "@/lib/offline/cached-fetch";

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
  return withOfflineCache(scopedKey(OFFLINE_CACHE_KEYS.balance, token), () =>
    apiFetch<Balance>("/balance", { token }),
  );
}
