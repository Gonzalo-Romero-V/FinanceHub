"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { isNativeApp } from "./platform";
import { isOnline as checkOnline, onNetworkChange } from "./network";
import { getQueue } from "./queue";
import { syncPendingQueue } from "./sync";

/**
 * Hook mobile-only: se monta una vez en el layout autenticado. Mantiene el
 * estado online/offline + cantidad de movimientos pendientes para el
 * indicador de UI, y dispara la sincronización automáticamente al reconectar
 * (y una vez al montar, por si la app se abrió ya con conexión habiendo
 * quedado algo pendiente de una sesión offline anterior).
 */
export function useOfflineSync() {
  const { token } = useAuth();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = async () => {
    const queue = await getQueue();
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
        await syncPendingQueue(token);
        await refreshPendingCount();
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
