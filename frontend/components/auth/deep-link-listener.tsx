"use client";

import { useEffect } from "react";
import { App } from "@capacitor/app";
import { useAuth } from "@/lib/auth/context";
import { isNativeApp } from "@/lib/offline/platform";

/**
 * Google OAuth no se puede hacer dentro del WebView embebido (Google lo
 * bloquea por seguridad) — el sistema abre el navegador externo para el
 * login, y `app/auth/callback/page.tsx` (corriendo ahí, en el navegador)
 * intenta "devolver" el control a la app vía este mismo esquema
 * (`cc.financehub.app://auth/callback?token=...`). Esto es lo que
 * completa la vuelta: recibe ese intent, saca el token, y loguea.
 *
 * Mobile-only — en web este componente no hace nada (no hay Android
 * intent-filter que escuchar).
 */
export function DeepLinkListener() {
  const { loginWithToken } = useAuth();

  useEffect(() => {
    if (!isNativeApp()) return;

    const listenerPromise = App.addListener("appUrlOpen", (event) => {
      try {
        const url = new URL(event.url);
        const token = url.searchParams.get("token");
        if (token) void loginWithToken(token);
      } catch {
        // URL con formato inesperado — se ignora.
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
    };
  }, [loginWithToken]);

  return null;
}
