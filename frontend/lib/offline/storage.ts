import { Preferences } from "@capacitor/preferences";
import { isNativeApp } from "./platform";

/**
 * Wrapper delgado sobre @capacitor/preferences (key-value simple, no SQL —
 * todo lo que cacheamos acá es "última respuesta conocida de la API" ya
 * resuelta por el servidor, no necesitamos consultarla localmente, solo
 * guardarla y devolverla tal cual). No-op fuera de la app nativa.
 */

const NAMESPACE = "financehub_offline";

function namespaced(key: string) {
  return `${NAMESPACE}:${key}`;
}

export async function readJson<T>(key: string): Promise<T | null> {
  if (!isNativeApp()) return null;
  const { value } = await Preferences.get({ key: namespaced(key) });
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  if (!isNativeApp()) return;
  await Preferences.set({ key: namespaced(key), value: JSON.stringify(value) });
}

export async function removeKey(key: string): Promise<void> {
  if (!isNativeApp()) return;
  await Preferences.remove({ key: namespaced(key) });
}
