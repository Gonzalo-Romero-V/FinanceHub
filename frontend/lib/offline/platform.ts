import { Capacitor } from "@capacitor/core";

/**
 * Único punto de verdad de "¿estamos en la app nativa?" — toda la lógica de
 * offline/mobile-only en `lib/offline/` y `lib/notifications/native-push.ts`
 * arranca chequeando esto. En el build web (`npm run build`, sin
 * BUILD_TARGET=mobile) esto siempre es false y todo lo demás en esta carpeta
 * queda inerte (no-op), así que el comportamiento web no cambia un bit.
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
