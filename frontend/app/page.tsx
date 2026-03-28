import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CuentasTableTest } from "@/components/ui/cuentas";
import { Activity } from "lucide-react";
import {Logo} from "@/components/layout/logo";

export default function Home() {
  return (
    <section className="container mx-auto max-w-4xl flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 px-6 py-6 md:py-12">
      
      {/* Contenido de texto */}
      <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-8">
        
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

        <div className="pt-4 flex flex-col gap-6">
          <Button asChild className="group relative overflow-hidden px-10 h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black text-lg transition-all duration-500 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 active:scale-95 border-b-4 border-blue-800 hover:border-blue-700">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Activity className="animate-pulse" />
              AGENTE VIRTUAL (CHATBOT) CON BD RELACIONAL
            </Link>
          </Button>

          <Button asChild size="lg" variant="ghost" className="w-fit px-8 h-12 rounded-full font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-300">
            <Link href="/login">
              O iniciar sesión de forma tradicional
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
