'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { CuentasTable } from '@/components/cuentas/CuentasTable';
import { CuentaFormModal } from '@/components/cuentas/CuentaFormModal';
import { useCuentas } from '@/lib/hooks/useCuentas';
import {
  createCuenta,
  updateCuenta,
  activarCuenta,
  desactivarCuenta,
} from '@/lib/api/cuentas';
import type { Cuenta, CrearCuenta, ActualizarCuenta } from '@/lib/types/movimientos';

export default function CuentasPage() {
  const { cuentas: allCuentas, loading, error, refetch } = useCuentas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null);
  const [defaultTipoCuenta, setDefaultTipoCuenta] = useState<'activo' | 'pasivo' | undefined>(
    undefined
  );
  const [actionError, setActionError] = useState<string | null>(null);

  // Filtrar cuentas por tipo
  const cuentasActivos = allCuentas.filter((c) => c.tipo_cuenta === 'activo');
  const cuentasPasivos = allCuentas.filter((c) => c.tipo_cuenta === 'pasivo');

  const handleOpenModal = (tipoCuenta?: 'activo' | 'pasivo') => {
    setEditingCuenta(null);
    setDefaultTipoCuenta(tipoCuenta);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCuenta(null);
    setDefaultTipoCuenta(undefined);
    setActionError(null);
  };

  const handleEdit = (cuenta: Cuenta) => {
    setEditingCuenta(cuenta);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (data: CrearCuenta | ActualizarCuenta) => {
    setActionError(null);
    try {
      if (editingCuenta) {
        const result = await updateCuenta(editingCuenta.id, data as ActualizarCuenta);
        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        const result = await createCuenta(data as CrearCuenta);
        if (!result.success) {
          throw new Error(result.error);
        }
      }
      await refetch();
    } catch (error) {
      throw error; // Re-lanzar para que el modal lo maneje
    }
  };

  const handleToggleActiva = async (cuenta: Cuenta) => {
    setActionError(null);
    try {
      const result = cuenta.activa
        ? await desactivarCuenta(cuenta.id)
        : await activarCuenta(cuenta.id);
      if (!result.success) {
        throw new Error(result.error);
      }
      await refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Error al cambiar el estado');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
              Cuentas
            </h1>
            <p className="text-sm sm:text-base text-[var(--color-mutedForeground)] mt-1">
              Gestiona tus cuentas de activos y pasivos
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOpenModal('pasivo')}>
              Nueva Pasivo
            </Button>
            <Button variant="gradient" size="sm" onClick={() => handleOpenModal('activo')}>
              Nueva Activo
            </Button>
          </div>
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
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Reintentar
            </Button>
          </div>
        )}

        {/* Cuentas de Activos */}
        <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
              Cuentas de Activos
            </h2>
            {cuentasActivos.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => handleOpenModal('activo')}>
                Agregar
              </Button>
            )}
          </div>
          <CuentasTable
            cuentas={cuentasActivos}
            onEdit={handleEdit}
            onToggleActiva={handleToggleActiva}
            onCreate={() => handleOpenModal('activo')}
            loading={loading}
          />
        </div>

        {/* Cuentas Pasivos */}
        <div className="glass-strong rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-foreground)]">
              Cuentas Pasivos
            </h2>
            {cuentasPasivos.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => handleOpenModal('pasivo')}>
                Agregar
              </Button>
            )}
          </div>
          <CuentasTable
            cuentas={cuentasPasivos}
            onEdit={handleEdit}
            onToggleActiva={handleToggleActiva}
            onCreate={() => handleOpenModal('pasivo')}
            loading={loading}
          />
        </div>
      </div>

      {/* Modal */}
      <CuentaFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        cuenta={editingCuenta}
        defaultTipoCuenta={defaultTipoCuenta}
      />
    </div>
  );
}
