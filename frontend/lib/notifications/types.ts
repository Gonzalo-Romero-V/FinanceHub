export interface PushRegistrationResult {
  registered: boolean;
  reason?: "unsupported" | "permission-denied" | "not-configured" | "error";
}

/**
 * Contrato único que el resto de la app usa (ver `lib/notifications/index.ts`)
 * — nunca se importa `web-push.ts`/`native-push.ts` directamente fuera de
 * acá, así queda claro y en un solo lugar qué es específico de cada
 * plataforma vs. qué es código compartido.
 */
export interface PushProvider {
  isSupported(): boolean;
  register(token: string): Promise<PushRegistrationResult>;
  unregister(token: string): Promise<void>;
  /** ¿Ya hay una suscripción activa? Para reflejar el estado real al abrir
   * Perfil, no solo dentro de la misma sesión donde se activó. */
  isActive(): Promise<boolean>;
}
