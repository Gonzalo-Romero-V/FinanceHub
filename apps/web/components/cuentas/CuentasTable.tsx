'use client';

import { Button } from '@/components/ui/Button';
import type { Cuenta } from '@/lib/types/movimientos';

interface CuentasTableProps {
  cuentas: Cuenta[];
  onEdit: (cuenta: Cuenta) => void;
  onToggleActiva: (cuenta: Cuenta) => void;
  onCreate?: () => void;
  loading?: boolean;
}

export function CuentasTable({ cuentas, onEdit, onToggleActiva, onCreate, loading }: CuentasTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--color-mutedForeground)]">Cargando cuentas...</div>
      </div>
    );
  }

  if (cuentas.length === 0) {
    return (
      <div className="glass-strong rounded-xl p-6 sm:p-8 text-center space-y-4">
        <p className="text-[var(--color-mutedForeground)]">No hay cuentas registradas.</p>
        {onCreate && (
          <Button onClick={onCreate} variant="gradient" size="sm">
            Crear nueva cuenta
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--color-border)]/40">
            <th className="text-left py-3 px-4 text-sm sm:text-base font-semibold text-[var(--color-foreground)]">
              Nombre
            </th>
            <th className="text-right py-3 px-4 text-sm sm:text-base font-semibold text-[var(--color-foreground)]">
              Saldo
            </th>
            <th className="text-center py-3 px-4 text-sm sm:text-base font-semibold text-[var(--color-foreground)]">
              Estado
            </th>
            <th className="text-right py-3 px-4 text-sm sm:text-base font-semibold text-[var(--color-foreground)]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((cuenta) => (
            <tr
              key={cuenta.id}
              className="border-b border-[var(--color-border)]/20 hover:bg-[var(--color-accent)]/30 transition-colors"
            >
              <td className="py-3 px-4">
                <div className="text-sm sm:text-base font-medium text-[var(--color-foreground)]">
                  {cuenta.nombre}
                </div>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="text-sm sm:text-base font-semibold text-[var(--color-foreground)]">
                  {formatCurrency(cuenta.saldo)}
                </div>
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                    cuenta.activa
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                  }`}
                >
                  {cuenta.activa ? 'Activa' : 'Inactiva'}
                </span>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(cuenta)}
                    className="h-8 px-3 text-xs sm:text-sm font-medium hover:bg-[var(--color-accent)] transition-colors"
                  >
                    Editar
                  </Button>
                  <Button
                    variant={cuenta.activa ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => onToggleActiva(cuenta)}
                    className="h-8 px-3 text-xs sm:text-sm font-medium min-w-[85px]"
                  >
                    {cuenta.activa ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
