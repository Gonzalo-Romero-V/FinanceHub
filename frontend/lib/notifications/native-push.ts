import { isNativeApp } from "@/lib/offline/platform";
import type { PushProvider, PushRegistrationResult } from "./types";

/**
 * FCM vía Capacitor. Queda como stub hasta que exista el proyecto de
 * Firebase (ver M4 en PENDIENTES.md) — a diferencia de Web Push, FCM no se
 * puede armar sin una cuenta/consola externa (Google Cloud), así que no hay
 * nada real que registrar todavía. El contrato (`PushProvider`) ya está
 * fijado para que cuando se instale `@capacitor-firebase/messaging` el
 * único cambio sea completar esta implementación — nada que la consuma
 * (`lib/notifications/index.ts`, el resto de la app) necesita cambiar.
 */
export const nativePushProvider: PushProvider = {
  isSupported() {
    return isNativeApp();
  },

  async register(): Promise<PushRegistrationResult> {
    if (!this.isSupported()) return { registered: false, reason: "unsupported" };
    return { registered: false, reason: "not-configured" };
  },

  async unregister(): Promise<void> {
    // No-op hasta que haya un provider real registrado.
  },
};
