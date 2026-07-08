"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { isNativeApp } from "./platform";
import { isOnline as checkOnline, onNetworkChange } from "./network";
import { getQueue } from "./queue";
import { syncPendingQueue } from "./sync";
import { notifyError } from "@/lib/ui/notify";

/**
 * Hook mobile-only: se monta una vez en el layout autenticado. Mantiene el
 * estado online/offline + cantidad de movimientos pendientes para el
 * indicador de UI, y dispara la sincronización automáticamente al reconectar
 * (y una vez al montar, por si la app se abrió ya con conexión habiendo
 * quedado algo pendiente de una sesión offline anterior).
 */
export function useOfflineSync() {
  const { token, logout } = useAuth();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = async () => {
    if (!token) return;
    const queue = await getQueue(token);
    setPendingCount(queue.length);
  };

  useEffect(() => {
    if (!isNativeApp()) return;

    let cancelled = false;

    checkOnline().then((status) => {
      if (!cancelled) setOnline(status);
    });
    refreshPendingCount();

    const unsubscribe = onNetworkChange(async (isOnlineNow) => {
      if (cancelled) return;
      setOnline(isOnlineNow);
      if (isOnlineNow && token) {
        setSyncing(true);
        const result = await syncPendingQueue(token);
        if (result.authInvalid) {
          // La misma condición de auth que habilita la UI debe habilitar el
          // sync — si el servidor ya no reconoce el token, tratar la sesión
          // como cerrada en vez de dejar el movimiento pendiente para
          // siempre en silencio (antes la única salida era que el usuario
          // cerrara sesión manualmente para notar el problema).
          notifyError("Tu sesión expiró. Inicia sesión de nuevo para sincronizar tus movimientos pendientes.");
          await logout();
        } else {
          await refreshPendingCount();
        }
        setSyncing(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [token]);

  return { online, pendingCount, syncing, refreshPendingCount };
}
