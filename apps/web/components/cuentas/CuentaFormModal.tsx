'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Cuenta, CrearCuenta, ActualizarCuenta } from '@/lib/types/movimientos';

interface CuentaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CrearCuenta | ActualizarCuenta) => Promise<void>;
  cuenta?: Cuenta | null;
  defaultTipoCuenta?: 'activo' | 'pasivo';
}

export function CuentaFormModal({
  isOpen,
  onClose,
  onSave,
  cuenta,
  defaultTipoCuenta,
}: CuentaFormModalProps) {
  const isEditing = !!cuenta;
  const [formData, setFormData] = useState<CrearCuenta>({
    nombre: '',
    tipo_cuenta: defaultTipoCuenta || 'activo',
    saldo: 0,
    activa: true,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CrearCuenta, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Resetear formulario cuando cambia cuenta o se abre/cierra
  useEffect(() => {
    if (isOpen) {
      if (cuenta) {
        setFormData({
          nombre: cuenta.nombre,
          tipo_cuenta: cuenta.tipo_cuenta,
          saldo: cuenta.saldo,
          activa: cuenta.activa,
        });
      } else {
        setFormData({
          nombre: '',
          tipo_cuenta: defaultTipoCuenta || 'activo',
          saldo: 0,
          activa: true,
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, cuenta, defaultTipoCuenta]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CrearCuenta, string>> = {};

    if (!formData.nombre || formData.nombre.trim().length === 0) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length > 50) {
      newErrors.nombre = 'El nombre no puede exceder 50 caracteres';
    }

    if (formData.saldo !== undefined && formData.saldo < 0) {
      newErrors.saldo = 'El saldo no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar cuenta' : 'Nueva cuenta'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Error general */}
        {submitError && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
          </div>
        )}

        {/* Nombre */}
        <div className="space-y-2">
          <label className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            maxLength={50}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="Ej: Cuenta Corriente"
          />
          {errors.nombre && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.nombre}</p>
          )}
        </div>

        {/* Tipo de cuenta */}
        <div className="space-y-2">
          <label className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
            Tipo de cuenta <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.tipo_cuenta}
            onChange={(e) =>
              setFormData({ ...formData, tipo_cuenta: e.target.value as 'activo' | 'pasivo' })
            }
            disabled={isEditing || defaultTipoCuenta !== undefined}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="activo">Activo</option>
            <option value="pasivo">Pasivo</option>
          </select>
          {(isEditing || defaultTipoCuenta !== undefined) && (
            <p className="text-xs text-[var(--color-mutedForeground)]">
              {isEditing
                ? 'El tipo de cuenta no se puede modificar'
                : 'El tipo de cuenta está predefinido'}
            </p>
          )}
        </div>

        {/* Saldo */}
        <div className="space-y-2">
          <label className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
            Saldo inicial
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.saldo || 0}
            onChange={(e) =>
              setFormData({ ...formData, saldo: parseFloat(e.target.value) || 0 })
            }
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            placeholder="0.00"
          />
          {errors.saldo && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.saldo}</p>
          )}
        </div>

        {/* Activa */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="activa"
            checked={formData.activa ?? true}
            onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <label
            htmlFor="activa"
            className="text-sm sm:text-base font-medium text-[var(--color-foreground)]"
          >
            Cuenta activa
          </label>
        </div>

        {/* Botones */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
