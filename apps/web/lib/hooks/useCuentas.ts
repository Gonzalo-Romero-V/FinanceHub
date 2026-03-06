'use client';

import { useState, useEffect } from 'react';
import { getCuentas } from '@/lib/api/cuentas';
import type { Cuenta } from '@/lib/types/movimientos';

interface UseCuentasResult {
  cuentas: Cuenta[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para cargar cuentas con filtros opcionales
 * @param tipoCuenta - Tipo de cuenta para filtrar (opcional)
 * @param activa - Si es true, solo cuentas activas (opcional)
 */
export function useCuentas(tipoCuenta?: 'activo' | 'pasivo', activa?: boolean): UseCuentasResult {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCuentas = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getCuentas(tipoCuenta, activa);

      if (result.success) {
        setCuentas(result.data);
      } else {
        setError(result.error);
        setCuentas([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cuentas');
      setCuentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, [tipoCuenta, activa]);

  return {
    cuentas,
    loading,
    error,
    refetch: fetchCuentas,
  };
}
