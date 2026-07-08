import type { MovimientoPayload } from "@/lib/api/movimientos";
import { readJson, writeJson } from "./storage";

const QUEUE_KEY = "queue:movimientos-pendientes";

export interface QueuedMovimiento {
  localId: string;
  payload: MovimientoPayload;
  createdAt: string;
}

export async function getQueue(): Promise<QueuedMovimiento[]> {
  return (await readJson<QueuedMovimiento[]>(QUEUE_KEY)) ?? [];
}

export async function enqueueMovimiento(payload: MovimientoPayload): Promise<QueuedMovimiento> {
  const queue = await getQueue();
  const item: QueuedMovimiento = {
    localId: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
  };
  await writeJson(QUEUE_KEY, [...queue, item]);
  return item;
}

export async function removeFromQueue(localId: string): Promise<void> {
  const queue = await getQueue();
  await writeJson(
    QUEUE_KEY,
    queue.filter((item) => item.localId !== localId),
  );
}
