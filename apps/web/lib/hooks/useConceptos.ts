'use client';

import { useState, useEffect } from 'react';
import { getConceptos } from '@/lib/api/conceptos';
import type { ConceptoConTipo } from '@/lib/types/movimientos';

interface UseConceptosResult {
  conceptos: ConceptoConTipo[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para cargar conceptos filtrados por tipo de movimiento
 * @param tipoMovimientoId - ID del tipo de movimiento (opcional)
 */
export function useConceptos(tipoMovimientoId?: number): UseConceptosResult {
  const [conceptos, setConceptos] = useState<ConceptoConTipo[]>([]);
  // Iniciar como false si no hay tipoMovimientoId, true si hay (para hacer la llamada)
  const [loading, setLoading] = useState(tipoMovimientoId !== undefined);
  const [error, setError] = useState<string | null>(null);

  const fetchConceptos = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getConceptos(tipoMovimientoId);

      if (result.success) {
        setConceptos(result.data);
      } else {
        setError(result.error);
        setConceptos([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar conceptos');
      setConceptos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Solo hacer la llamada si tipoMovimientoId está definido
    // Si es undefined, esperar a que se defina (no cargar todos los conceptos)
    if (tipoMovimientoId !== undefined) {
      fetchConceptos();
    } else {
      // Si no hay tipoMovimientoId, no cargar nada (esperar a que se defina)
      setLoading(false);
      setConceptos([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoMovimientoId]);

  return {
    conceptos,
    loading,
    error,
    refetch: fetchConceptos,
  };
}
