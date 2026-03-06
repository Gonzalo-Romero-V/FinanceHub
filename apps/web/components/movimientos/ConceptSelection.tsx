'use client';

import { Button } from '@/components/ui/Button';
import { ConceptoMenu } from '@/components/conceptos/ConceptoMenu';
import { ConceptoFormModal } from '@/components/conceptos/ConceptoFormModal';
import { useConceptos } from '@/lib/hooks/useConceptos';
import { getTiposMovimiento } from '@/lib/api/tipos-movimiento';
import { updateConcepto, deleteConcepto, createConcepto } from '@/lib/api/conceptos';
import type { ConceptoConTipo, MovementType, ActualizarConcepto, CrearConcepto } from '@/lib/types/movimientos';
import { useEffect, useState } from 'react';

interface ConceptSelectionProps {
  movementType: MovementType;
  onSelect: (concepto: ConceptoConTipo) => void;
  onBack: () => void;
}

export function ConceptSelection({ movementType, onSelect, onBack }: ConceptSelectionProps) {
  const [tipoMovimientoId, setTipoMovimientoId] = useState<number | undefined>(undefined);
  const [loadingTipo, setLoadingTipo] = useState(true);
  const [errorTipo, setErrorTipo] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState<ConceptoConTipo | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Solo cargar conceptos cuando tengamos el tipoMovimientoId
  const { conceptos, loading: loadingConceptos, error: errorConceptos, refetch } = useConceptos(
    tipoMovimientoId !== undefined ? tipoMovimientoId : undefined
  );

  // Obtener el ID del tipo de movimiento basado en el nombre
  useEffect(() => {
    const fetchTipoMovimiento = async () => {
      setLoadingTipo(true);
      setErrorTipo(null);
      
      try {
        const result = await getTiposMovimiento();
        if (result.success) {
          // Normalizar nombres: convertir a minúsculas para comparar
          // La BD tiene "Ingreso", "Egreso", "Transferencia" con mayúscula inicial
          // El frontend usa 'ingreso', 'egreso', 'transferencia' en minúsculas
          const tipo = result.data.find((t) => t.nombre.toLowerCase() === movementType.toLowerCase());
          if (tipo) {
            setTipoMovimientoId(tipo.id);
          } else {
            setErrorTipo(`Tipo de movimiento "${movementType}" no encontrado. Tipos disponibles: ${result.data.map(t => t.nombre).join(', ')}`);
          }
        } else {
          setErrorTipo(result.error || 'Error al cargar tipos de movimiento');
        }
      } catch (err) {
        setErrorTipo(err instanceof Error ? err.message : 'Error al cargar tipos de movimiento');
      } finally {
        setLoadingTipo(false);
      }
    };

    fetchTipoMovimiento();
  }, [movementType]);

  const handleEdit = (concepto: ConceptoConTipo) => {
    setEditingConcepto(concepto);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (concepto: ConceptoConTipo) => {
    setActionError(null);
    try {
      const result = await deleteConcepto(concepto.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      await refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error al eliminar el concepto');
    }
  };

  const handleSave = async (data: CrearConcepto | ActualizarConcepto) => {
    if (!editingConcepto) return;
    
    setActionError(null);
    try {
      const result = await updateConcepto(editingConcepto.id, data as ActualizarConcepto);
      if (!result.success) {
        throw new Error(result.error);
      }
      await refetch();
      setIsModalOpen(false);
      setEditingConcepto(null);
    } catch (error) {
      throw error; // Re-lanzar para que el modal lo maneje
    }
  };

  const handleAdd = () => {
    if (!tipoMovimientoId) return;
    setActionError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveNew = async (data: CrearConcepto | ActualizarConcepto) => {
    setActionError(null);
    try {
      const result = await createConcepto(data as CrearConcepto);
      if (!result.success) {
        throw new Error(result.error);
      }
      await refetch();
      setIsAddModalOpen(false);
    } catch (error) {
      throw error; // Re-lanzar para que el modal lo maneje
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConcepto(null);
    setActionError(null);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setActionError(null);
  };

  const loading = loadingTipo || loadingConceptos;
  const error = errorTipo || errorConceptos;

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
            Seleccionar concepto
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-mutedForeground)]">
            {movementType === 'ingreso' ? 'Conceptos de ingreso' : 'Conceptos de egreso'}
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-[var(--color-mutedForeground)]">Cargando conceptos...</div>
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

      {/* Action Error State */}
      {actionError && !loading && (
        <div className="glass-strong rounded-xl p-4 text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">{actionError}</p>
        </div>
      )}

      {/* Conceptos List */}
      {!loading && !error && conceptos.length === 0 && (
        <div className="glass-strong rounded-xl p-6 text-center pb-24 sm:pb-20">
          <p className="text-[var(--color-mutedForeground)]">
            No hay conceptos disponibles para este tipo de movimiento.
          </p>
        </div>
      )}

      {!loading && !error && conceptos.length > 0 && (
        <div className="space-y-3 sm:space-y-4 pb-24 sm:pb-20">
          {conceptos.map((concepto) => (
            <div
              key={concepto.id}
              className="glass-strong rounded-xl p-4 sm:p-6 flex items-center justify-between hover:opacity-80 transition-opacity shadow-sm hover:shadow-md"
            >
              <button
                onClick={() => onSelect(concepto)}
                className="flex-1 text-left"
              >
                <div className="text-base sm:text-lg font-medium text-[var(--color-foreground)]">
                  {concepto.nombre}
                </div>
              </button>
              <div onClick={(e) => e.stopPropagation()}>
                <ConceptoMenu
                  concepto={concepto}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Button para agregar concepto */}
      {!loading && !error && tipoMovimientoId !== undefined && (
        <button
          onClick={handleAdd}
          className="fixed bottom-6 right-6 sm:bottom-6 sm:right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 rounded-full gradient-primary shadow-2xl hover:shadow-3xl hover:opacity-90 active:scale-95 active:opacity-80 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-[var(--color-primary)]/50 focus:ring-offset-2"
          style={{
            bottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))',
            right: 'max(1.5rem, env(safe-area-inset-right, 1.5rem))',
          }}
          aria-label="Agregar nuevo concepto"
        >
          <span className="text-3xl sm:text-4xl font-light text-white leading-none select-none">
            +
          </span>
        </button>
      )}

      {/* Modal de edición */}
      {editingConcepto && (
        <ConceptoFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          concepto={editingConcepto}
        />
      )}

      {/* Modal de creación */}
      {tipoMovimientoId !== undefined && (
        <ConceptoFormModal
          isOpen={isAddModalOpen}
          onClose={handleCloseAddModal}
          onSave={handleSaveNew}
          defaultTipoMovimientoId={tipoMovimientoId}
        />
      )}
    </div>
  );
}
