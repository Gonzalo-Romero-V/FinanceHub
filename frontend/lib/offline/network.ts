import { Network } from "@capacitor/network";
import { isNativeApp } from "./platform";

/**
 * En web asumimos "siempre online" (el navegador ya maneja sus propios
 * errores de red por request; no tiene sentido bloquear/encolar nada ahí).
 * Solo en la app nativa consultamos el estado real del dispositivo.
 */
export async function isOnline(): Promise<boolean> {
  if (!isNativeApp()) return true;
  const status = await Network.getStatus();
  return status.connected;
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  if (!isNativeApp()) return () => {};

  let handle: { remove: () => void } | null = null;
  Network.addListener("networkStatusChange", (status) => {
    callback(status.connected);
  }).then((h) => {
    handle = h;
  });

  return () => {
    handle?.remove();
  };
}
