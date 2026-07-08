import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp } from "@/lib/offline/platform";

/**
 * Recordatorios agendados por el sistema operativo del dispositivo — a
 * diferencia del push (server → dispositivo), estos ya quedan agendados
 * localmente apenas se sincroniza el dato una vez, así que disparan aunque
 * ese día el teléfono no tenga conexión. Mobile-only (no-op en web: el
 * navegador no tiene un scheduler de este tipo).
 *
 * El "qué" y "cuándo" (reconciliación próxima, cuota de deuda por vencer)
 * se decide en M4 — esto es solo el mecanismo de agendar/cancelar.
 */

// IDs deterministas por tipo+entidad para poder reemplazar/cancelar sin
// duplicar (ej. "reconciliacion-cuenta-5" siempre mapea al mismo número).
export function reminderId(tipo: string, entidadId: number): number {
  let hash = 0;
  const key = `${tipo}:${entidadId}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

export async function scheduleLocalReminder(params: {
  id: number;
  title: string;
  body: string;
  at: Date;
}): Promise<void> {
  if (!isNativeApp()) return;

  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    const requested = await LocalNotifications.requestPermissions();
    if (requested.display !== "granted") return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: params.id,
        title: params.title,
        body: params.body,
        schedule: { at: params.at },
      },
    ],
  });
}

export async function cancelLocalReminder(id: number): Promise<void> {
  if (!isNativeApp()) return;
  await LocalNotifications.cancel({ notifications: [{ id }] });
}
