import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { registerPushSubscription, unregisterPushSubscription } from "@/lib/api/notifications";
import { isNativeApp } from "@/lib/offline/platform";
import type { PushProvider, PushRegistrationResult } from "./types";

let cachedToken: string | null = null;

export const nativePushProvider: PushProvider = {
  isSupported() {
    return isNativeApp();
  },

  async register(token: string): Promise<PushRegistrationResult> {
    if (!this.isSupported()) return { registered: false, reason: "unsupported" };

    try {
      const check = await FirebaseMessaging.checkPermissions();
      let status = check.receive;
      if (status === "prompt" || status === "prompt-with-rationale") {
        const requested = await FirebaseMessaging.requestPermissions();
        status = requested.receive;
      }
      if (status !== "granted") return { registered: false, reason: "permission-denied" };

      const { token: fcmToken } = await FirebaseMessaging.getToken();
      cachedToken = fcmToken;

      await registerPushSubscription(token, {
        tipo: "fcm",
        identificador: fcmToken,
        payload: {},
      });

      return { registered: true };
    } catch {
      return { registered: false, reason: "error" };
    }
  },

  async unregister(token: string): Promise<void> {
    if (!this.isSupported()) return;
    try {
      // No depender solo del token cacheado en memoria — si la app se
      // reabrió (sesión nueva), cachedToken está vacío aunque la
      // suscripción siga activa en el servidor de una sesión anterior.
      const fcmToken = cachedToken ?? (await FirebaseMessaging.getToken()).token;
      await unregisterPushSubscription(token, fcmToken);
      await FirebaseMessaging.deleteToken();
      cachedToken = null;
    } catch {
      // Best-effort — si falla, el usuario puede reintentar desde Perfil.
    }
  },

  async isActive(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const check = await FirebaseMessaging.checkPermissions();
      return check.receive === "granted";
    } catch {
      return false;
    }
  },
};
