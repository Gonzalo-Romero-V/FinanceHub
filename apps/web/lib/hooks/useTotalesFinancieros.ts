'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTotalesFinancieros } from '@/lib/api/totales';
import type { TotalesFinancieros } from '@/lib/types/movimientos';

interface UseTotalesFinancierosResult {
  totales: TotalesFinancieros | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook para cargar los totales financieros
 */
export function useTotalesFinancieros(): UseTotalesFinancierosResult {
  const [totales, setTotales] = useState<TotalesFinancieros | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // #region agent log
  const fetchTotales = useCallback(async () => {
    fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTotalesFinancieros.ts:23',message:'fetchTotales called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setLoading(true);
    setError(null);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTotalesFinancieros.ts:27',message:'Before API call',data:{loading:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    try {
      const result = await getTotalesFinancieros();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTotalesFinancieros.ts:35',message:'API call completed',data:{success:result.success},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (result.success) {
        setTotales(result.data);
      } else {
        setError(result.error);
        setTotales(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar totales financieros');
      setTotales(null);
    } finally {
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTotalesFinancieros.ts:49',message:'Loading set to false',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
  }, []);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useTotalesFinancieros.ts:55',message:'Hook useEffect executed (initial load)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    fetchTotales();
  }, [fetchTotales]);

  return {
    totales,
    loading,
    error,
    refetch: fetchTotales,
  };
}
