"use client";

import { useEffect } from "react";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp } from "@/lib/offline/platform";
import { reminderId } from "@/lib/notifications/local-reminders";

/**
 * Android/iOS no muestran automáticamente en el panel de notificaciones un
 * push de FCM que llega mientras la app está ABIERTA (primer plano) — eso
 * es estándar de Firebase, no un bug: solo lo hace solo cuando la app está
 * en segundo plano o cerrada. Para que se comporte "como cualquier app"
 * (aviso + sonido) también con la app abierta, se reenvía como una
 * notificación local apenas llega.
 */
export function PushForegroundListener() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let handle: { remove: () => void } | null = null;

    FirebaseMessaging.addListener("notificationReceived", async (event) => {
      const { title, body, data } = event.notification;
      if (!title && !body) return;

      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted") return;

      LocalNotifications.schedule({
        notifications: [
          {
            id: reminderId("push-foreground", Date.now()),
            title: title ?? "FinanceHub",
            body: body ?? "",
            extra: data,
          },
        ],
      }).catch(() => {});
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, []);

  return null;
}
