'use client';

import { Button } from '@/components/ui/Button';
import type { MovementType } from '@/lib/types/movimientos';

interface TypeSelectionProps {
  onSelect: (type: MovementType) => void;
}

export function TypeSelection({ onSelect }: TypeSelectionProps) {
  return (
    <div className="w-full space-y-6 sm:space-y-8">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-[var(--color-foreground)]">
          Nuevo movimiento
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-mutedForeground)]">
          Selecciona el tipo de movimiento
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Botón Ingreso */}
        <Button
          onClick={() => onSelect('ingreso')}
          variant="gradient"
          size="lg"
          className="w-full h-20 sm:h-24 text-lg sm:text-xl font-semibold shadow-lg hover:scale-[1.02] transition-transform"
        >
          Ingreso
        </Button>

        {/* Botón Egreso */}
        <Button
          onClick={() => onSelect('egreso')}
          variant="default"
          size="lg"
          className="w-full h-20 sm:h-24 text-lg sm:text-xl font-semibold shadow-lg hover:scale-[1.02] transition-transform bg-red-600 hover:bg-red-700 text-white border-0"
        >
          Egreso
        </Button>

        {/* Botón Transferencia (deshabilitado) */}
        <Button
          disabled
          variant="outline"
          size="lg"
          className="w-full h-20 sm:h-24 text-lg sm:text-xl font-semibold opacity-60 cursor-not-allowed"
        >
          Transferencia
          <span className="ml-2 text-xs sm:text-sm font-normal opacity-75">
            (Próximamente)
          </span>
        </Button>
      </div>
    </div>
  );
}
