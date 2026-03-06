'use client';

import { useState, useMemo, useEffect } from 'react';
import { ConceptosList } from '@/components/conceptos/ConceptosList';
import { ConceptoFormModal } from '@/components/conceptos/ConceptoFormModal';
import { useConceptos } from '@/lib/hooks/useConceptos';
import { getTiposMovimiento } from '@/lib/api/tipos-movimiento';
import { createConcepto, updateConcepto, deleteConcepto } from '@/lib/api/conceptos';
import type { ConceptoConTipo, CrearConcepto, ActualizarConcepto, TipoMovimiento } from '@/lib/types/movimientos';

export default function ConceptosPage() {
  const { conceptos: allConceptos, loading, error, refetch } = useConceptos();
  const [tiposMovimiento, setTiposMovimiento] = useState<TipoMovimiento[]>([]);
  const [loadingTipos, setLoadingTipos] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConcepto, setEditingConcepto] = useState<ConceptoConTipo | null>(null);
  const [defaultTipoMovimientoId, setDefaultTipoMovimientoId] = useState<number | undefined>(
    undefined
  );
  const [actionError, setActionError] = useState<string | null>(null);

  // Cargar tipos de movimiento
  useEffect(() => {
    getTiposMovimiento()
      .then((result) => {
        if (result.success) {
          setTiposMovimiento(result.data);
        }
      })
      .finally(() => setLoadingTipos(false));
  }, []);

  // Agrupar conceptos por tipo de movimiento
  const conceptosPorTipo = useMemo(() => {
    const grouped: Record<number, ConceptoConTipo[]> = {};
    tiposMovimiento.forEach((tipo) => {
      grouped[tipo.id] = allConceptos.filter((c) => c.tipo_movimiento_id === tipo.id);
    });
    return grouped;
  }, [allConceptos, tiposMovimiento]);

  const handleOpenModal = (tipoMovimientoId?: number) => {
    setEditingConcepto(null);
    setDefaultTipoMovimientoId(tipoMovimientoId);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConcepto(null);
    setDefaultTipoMovimientoId(undefined);
    setActionError(null);
  };

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
    setActionError(null);
    try {
      if (editingConcepto) {
        const result = await updateConcepto(editingConcepto.id, data as ActualizarConcepto);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const result = await createConcepto(data as CrearConcepto);
        if (!result.success) {
          throw new Error(result.error);
        }
      }
      await refetch();
    } catch (error) {
      throw error; // Re-lanzar para que el modal lo maneje
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
            Conceptos
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-mutedForeground)] mt-1">
            Gestiona los conceptos de tus movimientos
          </p>
        </div>

        {/* Error general */}
        {actionError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{actionError}</p>
          </div>
        )}

        {/* Error de carga */}
        {error && (
          <div className="glass-strong rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-accent)]"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Lista de conceptos por tipo */}
        {loadingTipos ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--color-mutedForeground)]">Cargando tipos...</div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {tiposMovimiento.map((tipo) => (
              <div key={tipo.id} className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                <ConceptosList
                  tipoMovimiento={tipo}
                  conceptos={conceptosPorTipo[tipo.id] || []}
                  onAdd={() => handleOpenModal(tipo.id)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  loading={loading}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <ConceptoFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        concepto={editingConcepto}
        defaultTipoMovimientoId={defaultTipoMovimientoId}
      />
    </div>
  );
}
