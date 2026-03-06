'use client';

import { DropdownMenu } from '@/components/ui/DropdownMenu';
import type { ConceptoConTipo } from '@/lib/types/movimientos';

interface ConceptoMenuProps {
  concepto: ConceptoConTipo;
  onEdit: (concepto: ConceptoConTipo) => void;
  onDelete: (concepto: ConceptoConTipo) => void;
}

export function ConceptoMenu({ concepto, onEdit, onDelete }: ConceptoMenuProps) {
  const handleDelete = () => {
    if (confirm(`¿Estás seguro de eliminar el concepto "${concepto.nombre}"?`)) {
      onDelete(concepto);
    }
  };

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          className="p-2 sm:p-1.5 rounded-lg hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)]/80 active:scale-95 transition-all duration-150 flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          aria-label="Opciones del concepto"
        >
          <span className="text-2xl sm:text-xl font-bold text-[var(--color-mutedForeground)] hover:text-[var(--color-foreground)] active:text-[var(--color-foreground)] leading-none select-none">
            ⋮
          </span>
        </button>
      }
      items={[
        {
          label: 'Editar',
          onClick: () => onEdit(concepto),
        },
        {
          label: 'Eliminar',
          onClick: handleDelete,
          variant: 'danger',
        },
      ]}
      align="right"
    />
  );
}
