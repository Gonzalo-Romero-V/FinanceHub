import { registerPushSubscription, unregisterPushSubscription } from "@/lib/api/notifications";
import type { PushProvider, PushRegistrationResult } from "./types";

// Estándar para pasarle la VAPID public key (base64url) a PushManager.subscribe.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const array = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    array[i] = rawData.charCodeAt(i);
  }
  return array;
}

export const webPushProvider: PushProvider = {
  isSupported() {
    return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
  },

  async register(token: string): Promise<PushRegistrationResult> {
    if (!this.isSupported()) return { registered: false, reason: "unsupported" };

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return { registered: false, reason: "not-configured" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { registered: false, reason: "permission-denied" };

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      await registerPushSubscription(token, {
        tipo: "web",
        identificador: subscription.endpoint,
        payload: { keys: json.keys ?? {} },
      });

      return { registered: true };
    } catch {
      return { registered: false, reason: "error" };
    }
  },

  async unregister(token: string): Promise<void> {
    if (!this.isSupported()) return;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await unregisterPushSubscription(token, subscription.endpoint);
    await subscription.unsubscribe();
  },
};
