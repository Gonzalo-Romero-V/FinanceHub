'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useTotalesFinancieros } from '@/lib/hooks/useTotalesFinancieros';

/**
 * Formatea un número como moneda con separadores de miles y 2 decimales
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function DashboardPage() {
  const { totales, loading, error, refetch } = useTotalesFinancieros();

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:19',message:'Dashboard render',data:{hasTotales:!!totales,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  });
  // #endregion

  // Refrescar totales cuando el componente se monta y cuando la página vuelve a estar visible
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:26',message:'Dashboard useEffect executed',data:{hasTotales:!!totales,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Refrescar cuando el componente se monta
    refetch();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:30',message:'Refetch called from dashboard useEffect',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Refrescar cuando la página vuelve a estar visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/77396c27-2a56-4204-84a7-0ee644ae7ec9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:37',message:'Visibility change - refetch called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="glass-strong rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 text-[var(--color-foreground)]">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-mutedForeground)] mb-6">
          Tu panel de control financiero
        </p>
        
        <Link href="/nuevo-movimiento">
          <Button variant="gradient" size="lg" className="w-full sm:w-auto">
            Nuevo movimiento
          </Button>
        </Link>
      </div>

      {/* Totales Financieros */}
      {loading && (
        <div className="glass-strong rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
          <p className="text-[var(--color-mutedForeground)]">Cargando totales...</p>
        </div>
      )}

      {error && (
        <div className="glass-strong rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl border-2 border-red-500/50">
          <p className="text-red-600 dark:text-red-400">Error al cargar totales: {error}</p>
        </div>
      )}

      {totales && (
        <div className="space-y-6 sm:space-y-8">
          {/* Patrimonio - Valor Principal */}
          <div className="glass-strong rounded-xl sm:rounded-2xl p-8 sm:p-12 shadow-xl border-2 border-purple-500/30 hover:border-purple-500/50 transition-all bg-gradient-to-br from-purple-500/10 to-blue-500/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-[var(--color-foreground)]">
                Patrimonio
              </h2>
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-purple-500/30 flex items-center justify-center">
                <svg
                  className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
            <p
              className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold ${
                totales.patrimonio >= 0
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              ${formatCurrency(totales.patrimonio)}
            </p>
          </div>

          {/* Desglose: Activos y Pasivos - Valores Secundarios */}
          <div className="space-y-4">
            <h3 className="text-sm sm:text-base font-medium text-[var(--color-mutedForeground)] uppercase tracking-wide">
              Desglose
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Total Activos */}
              <div className="glass-strong rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-blue-500/20 hover:border-blue-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm sm:text-base font-medium text-[var(--color-foreground)]">
                    Total Activos
                  </h4>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ${formatCurrency(totales.total_activos)}
                </p>
              </div>

              {/* Total Pasivos */}
              <div className="glass-strong rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-lg border-2 border-orange-500/20 hover:border-orange-500/40 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm sm:text-base font-medium text-[var(--color-foreground)]">
                    Total Pasivos
                  </h4>
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-orange-600 dark:text-orange-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  ${formatCurrency(totales.total_pasivos)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
