'use client';

import { Button } from '@/components/ui/Button';
import { ConceptoMenu } from './ConceptoMenu';
import type { ConceptoConTipo, TipoMovimiento } from '@/lib/types/movimientos';

interface ConceptosListProps {
  tipoMovimiento: TipoMovimiento;
  conceptos: ConceptoConTipo[];
  onAdd: () => void;
  onEdit: (concepto: ConceptoConTipo) => void;
  onDelete: (concepto: ConceptoConTipo) => void;
  loading?: boolean;
}

export function ConceptosList({
  tipoMovimiento,
  conceptos,
  onAdd,
  onEdit,
  onDelete,
  loading,
}: ConceptosListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[var(--color-mutedForeground)]">Cargando conceptos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header de la sección */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-foreground)] capitalize">
          {tipoMovimiento.nombre}
        </h3>
      </div>

      {/* Lista de conceptos */}
      {conceptos.length === 0 ? (
        <div className="glass-strong rounded-xl p-6 text-center space-y-4">
          <p className="text-sm sm:text-base text-[var(--color-mutedForeground)]">
            No hay conceptos de {tipoMovimiento.nombre.toLowerCase()}.
          </p>
          <Button variant="gradient" size="sm" onClick={onAdd}>
            Crear concepto
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {conceptos.map((concepto) => (
            <div
              key={concepto.id}
              className="glass-strong rounded-xl p-4 sm:p-6 flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <span className="text-base sm:text-lg font-medium text-[var(--color-foreground)]">
                {concepto.nombre}
              </span>
              <ConceptoMenu concepto={concepto} onEdit={onEdit} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
