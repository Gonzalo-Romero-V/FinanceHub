"use client";

import { WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { useOfflineSync } from "@/lib/offline/use-offline-sync";
import { isNativeApp } from "@/lib/offline/platform";

/**
 * Banner mobile-only (no renderiza nada en web — isNativeApp() siempre es
 * false ahí). Muestra el estado de conectividad/sincronización del respaldo
 * offline de movimientos.
 */
export function OfflineStatusBar() {
  const { online, pendingCount, syncing } = useOfflineSync();

  if (!isNativeApp()) return null;
  if (online && pendingCount === 0 && !syncing) return null;

  let icon = <WifiOff className="h-3.5 w-3.5" />;
  let text = "Sin conexión — los movimientos nuevos se guardan en el dispositivo.";
  let tone = "bg-muted text-muted-foreground";

  if (syncing) {
    icon = <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    text = "Sincronizando movimientos pendientes...";
    tone = "bg-brand-1/10 text-brand-1";
  } else if (online && pendingCount > 0) {
    icon = <CloudUpload className="h-3.5 w-3.5" />;
    text = `${pendingCount} movimiento${pendingCount === 1 ? "" : "s"} pendiente${pendingCount === 1 ? "" : "s"} de sincronizar.`;
    tone = "bg-amber-500/10 text-amber-700";
  }

  return (
    <div className={`flex items-center justify-center gap-2 xs px-4 py-1.5 ${tone}`}>
      {icon}
      <span>{text}</span>
    </div>
  );
}
