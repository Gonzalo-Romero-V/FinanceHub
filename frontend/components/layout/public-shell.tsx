"use client";

import { HeaderPublic } from "@/components/layout/header-public";
import { Footer } from "@/components/layout/footer";
import { isNativeApp } from "@/lib/offline/platform";

/**
 * En la app nativa, las pantallas previas a loguearse no muestran el
 * header/footer estilo sitio web (con nav a Home/Guía rápida) — eso tiene
 * sentido en web pero no es el patrón esperado en una app mobile, donde se
 * espera una pantalla de bienvenida enfocada. Una vez logueado no cambia
 * nada (layout de `(user)/` intacto, con su propio header).
 *
 * Mobile-only vía isNativeApp() — en web esto es un passthrough total.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  if (isNativeApp()) {
    return <main className="flex-1 flex flex-col min-h-screen">{children}</main>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderPublic />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
