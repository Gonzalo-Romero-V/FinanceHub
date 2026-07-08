"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { isNativeApp } from "@/lib/offline/platform";
import { useAuth } from "@/lib/auth/context";

function MobileWelcome() {
  return (
    <section className="flex-1 flex flex-col items-center justify-center text-center gap-6 px-6">
      <div className="space-y-2">
        <h2 className="h3 text-muted-foreground">Bienvenido a</h2>
        <Logo size="h1" />
      </div>

      <Button asChild size="lg" className="px-8 h-12 rounded-full bg-foreground hover:bg-brand-1 font-bold hover:text-white transition-all duration-300">
        <Link href="/login">Comenzar ahora</Link>
      </Button>
    </section>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const native = isNativeApp();

  useEffect(() => {
    // En la app instalada, cada arranque en frío vuelve a esta pantalla —
    // si ya hay una sesión válida, saltarla directo al dashboard en vez de
    // mostrar "Comenzar ahora" y forzar un login que no hace falta.
    if (native && !loading && user) {
      router.replace("/dashboard");
    }
  }, [native, loading, user, router]);

  if (native && (loading || user)) {
    return (
      <div className="grid min-h-[60vh] flex-1 place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-1" />
      </div>
    );
  }

  if (native) {
    return <MobileWelcome />;
  }

  return (
    <section className="container mx-auto max-w-4xl flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-6 py-6 md:py-12">

      {/* Contenido de texto */}
      <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-6">

        <div className="space-y-2">
          <h2 className="h3 text-muted-foreground">
            Bienvenido a
          </h2>

        <Logo size="h1"/>

        </div>

        <p className="body text-muted-foreground max-w-lg">
          Transforma tu manera de interactuar con el dinero. Nuestra plataforma
          centralizada te ofrece análisis detallados, seguimiento de gastos en tiempo real
          y proyecciones de inversión inteligentes. Únete a una comunidad de expertos
          y aprendices comprometidos con alcanzar la libertad financiera a través de
          herramientas intuitivas diseñadas para potenciar tu economía personal día a día.
        </p>

        <div className="pt-2">
          <Button asChild size="lg" className="px-8 h-12 rounded-full bg-foreground hover:bg-brand-1 font-bold hover:text-white transition-all duration-300">
            <Link href="/login">
              Comenzar ahora
            </Link>
          </Button>
        </div>



      </div>


      {/* Imagen */}
      <div className="flex-1 w-full max-w-md md:max-w-xl">
        <div className="relative aspect-square w-full">
          <Image
            src="/assets/images/home.jpg"
            alt="Ilustración FinanceHub"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

    </section>
  );
}
