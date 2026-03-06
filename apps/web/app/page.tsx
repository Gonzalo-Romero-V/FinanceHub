'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/lib/responsive';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Redirigir automáticamente según el dispositivo
  useEffect(() => {
    if (isMobile) {
      router.push('/nuevo-movimiento');
    } else {
      router.push('/dashboard');
    }
  }, [isMobile, router]);

  // Mantener el diseño durante la carga para evitar flash
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-background opacity-50" />
      
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-[var(--color-background)]/30 backdrop-blur-3xl" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:py-16 lg:py-20">
        <div className="w-full max-w-4xl space-y-8 sm:space-y-12 text-center">
          {/* Hero content */}
          <div className="space-y-4 sm:space-y-6">
            <div className="glass-strong rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl mx-auto max-w-2xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-gradient-primary">
                Finance Hub
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-[var(--color-mutedForeground)] mb-6 sm:mb-8 leading-relaxed">
                Gestiona tus finanzas de forma simple y eficiente
              </p>

              
              <Link href="/dashboard">
                <Button 
                  size="lg" 
                  variant="gradient"
                  className="w-full sm:w-auto text-base sm:text-lg px-8 sm:px-12 py-5 sm:py-6 rounded-full shadow-xl hover:scale-105 transition-transform"
                >
                  Iniciar
                </Button>
              </Link>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
