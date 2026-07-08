import { createMovimiento } from "@/lib/api/movimientos";
import { ApiError } from "@/lib/api/client";
import { notifySuccess } from "@/lib/ui/notify";
import { getQueue, removeFromQueue } from "./queue";
import { isNativeApp } from "./platform";

export interface SyncResult {
  synced: number;
  stillPending: number;
  /** true si el sync se cortó porque el token ya no es válido (401/403). */
  authInvalid: boolean;
}

/**
 * Sube en orden los movimientos que se crearon offline. Se detiene ante el
 * primer fallo (en vez de saltearlo) para no arriesgarse a descartar datos
 * del usuario en silencio — si fue un fallo de red, se reintenta en la
 * próxima reconexión; si fue un error real de la API (ej. una cuenta que ya
 * no existe), queda visible como pendiente hasta que el usuario lo resuelva.
 *
 * Un 401/403 es un caso aparte: significa que la sesión activa (la misma
 * que la UI ya muestra como logueada) en realidad ya no es válida en el
 * servidor. Antes esto quedaba igual que cualquier otro error de API — el
 * item se quedaba pendiente para siempre y el usuario tenía que cerrar
 * sesión manualmente para notar el problema. Ahora se lo señala aparte para
 * que el caller (useOfflineSync) fuerce el logout — la misma condición de
 * auth que habilita la UI debe habilitar el sync.
 */
export async function syncPendingQueue(token: string): Promise<SyncResult> {
  if (!isNativeApp()) return { synced: 0, stillPending: 0, authInvalid: false };

  const queue = await getQueue(token);
  let synced = 0;
  let authInvalid = false;

  for (const item of queue) {
    try {
      await createMovimiento(token, item.payload);
      await removeFromQueue(token, item.localId);
      synced += 1;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        authInvalid = true;
      }
      break;
    }
  }

  const remaining = await getQueue(token);

  if (synced > 0) {
    notifySuccess(
      remaining.length > 0
        ? `Se sincronizaron ${synced} movimientos. ${remaining.length} quedaron pendientes.`
        : `Sincronización completa: ${synced} movimiento${synced === 1 ? "" : "s"} subido${synced === 1 ? "" : "s"}.`,
    );
  }

  return { synced, stillPending: remaining.length, authInvalid };
}
