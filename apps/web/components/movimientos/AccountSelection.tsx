'use client';

import { Button } from '@/components/ui/Button';
import { useCuentas } from '@/lib/hooks/useCuentas';
import type { Cuenta, MovementType } from '@/lib/types/movimientos';

interface AccountSelectionProps {
  movementType: MovementType;
  onSelect: (cuenta: Cuenta) => void;
  onBack: () => void;
}

export function AccountSelection({ movementType, onSelect, onBack }: AccountSelectionProps) {
  // Para INGRESO: filtrar cuentas tipo "activo" (cuenta_destino)
  // Para EGRESO: mostrar todas las cuentas activas (cuenta_origen)
  const tipoCuenta = movementType === 'ingreso' ? 'activo' : undefined;
  const { cuentas, loading, error } = useCuentas(tipoCuenta, true); // Solo cuentas activas

  const title = movementType === 'ingreso' ? 'Ingresa a' : 'Egresa desde';
  const description = movementType === 'ingreso' 
    ? 'Selecciona la cuenta de destino' 
    : 'Selecciona la cuenta de origen';

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          onClick={onBack}
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
        >
          ← Atrás
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-mutedForeground)]">
            {description}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--color-mutedForeground)]">Cargando cuentas...</div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="glass-strong rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm">
            Reintentar
          </Button>
        </div>
      )}

      {/* Cuentas List */}
      {!loading && !error && cuentas.length === 0 && (
        <div className="glass-strong rounded-xl p-6 text-center">
          <p className="text-[var(--color-mutedForeground)]">
            No hay cuentas disponibles.
          </p>
        </div>
      )}

      {!loading && !error && cuentas.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          {cuentas.map((cuenta) => (
            <button
              key={cuenta.id}
              onClick={() => onSelect(cuenta)}
              className="w-full glass-strong rounded-xl p-4 sm:p-6 text-left hover:opacity-80 active:opacity-70 transition-opacity shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-base sm:text-lg font-medium text-[var(--color-foreground)]">
                    {cuenta.nombre}
                  </div>
                  <div className="text-xs sm:text-sm text-[var(--color-mutedForeground)] mt-1">
                    {cuenta.tipo_cuenta === 'activo' ? 'Activo' : 'Pasivo'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm sm:text-base font-semibold text-[var(--color-foreground)]">
                    ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
