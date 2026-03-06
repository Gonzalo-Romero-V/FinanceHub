import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CuentasTableTest } from "@/components/ui/cuentas";
import {Logo} from "@/components/layout/logo";

export default function Home() {
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
