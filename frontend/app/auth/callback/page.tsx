"use client"

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  
  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      router.push("/login?error=no_token");
      return;
    }

    // Si esta página cargó en el navegador del sistema porque Google
    // bloqueó el WebView de la app (ver DeepLinkListener), intentamos
    // devolver el control a la app antes de completar el login acá. Es
    // un no-op inofensivo en desktop / si la app no está instalada — el
    // navegador sigue de largo y completa el login web normal abajo.
    window.location.href = `cc.financehub.app://auth/callback?token=${token}`;

    const timer = setTimeout(() => {
      void loginWithToken(token);
    }, 700);

    return () => clearTimeout(timer);
  }, [loginWithToken, router, searchParams]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-screen">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-1"></div>
        <p className="small text-muted-foreground">Completando autenticación...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-1"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}
