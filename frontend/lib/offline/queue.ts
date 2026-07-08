import type { MovimientoPayload } from "@/lib/api/movimientos";
import { readJson, writeJson } from "./storage";
import { getUserIdFromToken } from "@/lib/auth/storage";

const QUEUE_KEY_PREFIX = "queue:movimientos-pendientes";

export interface QueuedMovimiento {
  localId: string;
  payload: MovimientoPayload;
  createdAt: string;
  /** Dueño del item — evita que se sincronice bajo la sesión de otra cuenta. */
  userId: string;
}

function queueKey(token: string): string {
  return `${QUEUE_KEY_PREFIX}:${getUserIdFromToken(token)}`;
}

export async function getQueue(token: string): Promise<QueuedMovimiento[]> {
  return (await readJson<QueuedMovimiento[]>(queueKey(token))) ?? [];
}

export async function enqueueMovimiento(
  token: string,
  payload: MovimientoPayload,
): Promise<QueuedMovimiento> {
  const queue = await getQueue(token);
  const item: QueuedMovimiento = {
    localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
    userId: getUserIdFromToken(token),
  };
  await writeJson(queueKey(token), [...queue, item]);
  return item;
}

export async function removeFromQueue(token: string, localId: string): Promise<void> {
  const queue = await getQueue(token);
  await writeJson(
    queueKey(token),
    queue.filter((item) => item.localId !== localId),
  );
}
