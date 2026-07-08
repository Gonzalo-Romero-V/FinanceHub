import { createMovimiento } from "@/lib/api/movimientos";
import { ApiError } from "@/lib/api/client";
import { notifySuccess } from "@/lib/ui/notify";
import { getQueue, removeFromQueue } from "./queue";
import { isNativeApp } from "./platform";

export interface SyncResult {
  synced: number;
  stillPending: number;
}

/**
 * Sube en orden los movimientos que se crearon offline. Se detiene ante el
 * primer fallo (en vez de saltearlo) para no arriesgarse a descartar datos
 * del usuario en silencio — si fue un fallo de red, se reintenta en la
 * próxima reconexión; si fue un error real de la API (ej. una cuenta que ya
 * no existe), queda visible como pendiente hasta que el usuario lo resuelva.
 */
export async function syncPendingQueue(token: string): Promise<SyncResult> {
  if (!isNativeApp()) return { synced: 0, stillPending: 0 };

  const queue = await getQueue();
  let synced = 0;

  for (const item of queue) {
    try {
      await createMovimiento(token, item.payload);
      await removeFromQueue(item.localId);
      synced += 1;
    } catch (err) {
      if (err instanceof ApiError) {
        // Error real de la API (no de red): no lo reintentamos solo, queda
        // pendiente para que el usuario lo revise manualmente.
      }
      break;
    }
  }

  const remaining = await getQueue();

  if (synced > 0) {
    notifySuccess(
      remaining.length > 0
        ? `Se sincronizaron ${synced} movimientos. ${remaining.length} quedaron pendientes.`
        : `Sincronización completa: ${synced} movimiento${synced === 1 ? "" : "s"} subido${synced === 1 ? "" : "s"}.`,
    );
  }

  return { synced, stillPending: remaining.length };
}
