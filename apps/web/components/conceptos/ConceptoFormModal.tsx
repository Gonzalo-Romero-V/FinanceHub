'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { getTiposMovimiento } from '@/lib/api/tipos-movimiento';
import type { ConceptoConTipo, CrearConcepto, ActualizarConcepto, TipoMovimiento } from '@/lib/types/movimientos';

interface ConceptoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CrearConcepto | ActualizarConcepto) => Promise<void>;
  concepto?: ConceptoConTipo | null;
  defaultTipoMovimientoId?: number;
  allowTipoChange?: boolean;
}

export function ConceptoFormModal({
  isOpen,
  onClose,
  onSave,
  concepto,
  defaultTipoMovimientoId,
  allowTipoChange = false,
}: ConceptoFormModalProps) {
  const isEditing = !!concepto;
  const [formData, setFormData] = useState<CrearConcepto>({
    nombre: '',
    tipo_movimiento_id: defaultTipoMovimientoId || 1,
  });
  const [tiposMovimiento, setTiposMovimiento] = useState<TipoMovimiento[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof CrearConcepto, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingTipos, setLoadingTipos] = useState(false);

  // Cargar tipos de movimiento
  useEffect(() => {
    if (isOpen) {
      setLoadingTipos(true);
      getTiposMovimiento()
        .then((result) => {
          if (result.success) {
            setTiposMovimiento(result.data);
          }
        })
        .finally(() => setLoadingTipos(false));
    }
  }, [isOpen]);

  // Resetear formulario cuando cambia concepto o se abre/cierra
  useEffect(() => {
    if (isOpen) {
      if (concepto) {
        setFormData({
          nombre: concepto.nombre,
          tipo_movimiento_id: concepto.tipo_movimiento_id,
        });
      } else {
        setFormData({
          nombre: '',
          tipo_movimiento_id: defaultTipoMovimientoId || 1,
        });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, concepto, defaultTipoMovimientoId]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CrearConcepto, string>> = {};

    if (!formData.nombre || formData.nombre.trim().length === 0) {
      newErrors.nombre = 'El nombre es requerido';
    } else if (formData.nombre.length > 50) {
      newErrors.nombre = 'El nombre no puede exceder 50 caracteres';
    }

    if (!formData.tipo_movimiento_id || formData.tipo_movimiento_id <= 0) {
      newErrors.tipo_movimiento_id = 'El tipo de movimiento es requerido';
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
      setSubmitError(error instanceof Error ? error.message : 'Error al guardar el concepto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar concepto' : 'Nuevo concepto'}
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
            placeholder="Ej: Salario"
          />
          {errors.nombre && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.nombre}</p>
          )}
        </div>

        {/* Tipo de movimiento */}
        <div className="space-y-2">
          <label className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
            Tipo de movimiento <span className="text-red-500">*</span>
          </label>
          {loadingTipos ? (
            <div className="text-sm text-[var(--color-mutedForeground)]">Cargando tipos...</div>
          ) : (
            <select
              value={formData.tipo_movimiento_id}
              onChange={(e) =>
                setFormData({ ...formData, tipo_movimiento_id: parseInt(e.target.value, 10) })
              }
              disabled={isEditing || (defaultTipoMovimientoId !== undefined && !isEditing)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed capitalize"
            >
              {tiposMovimiento.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          )}
          {(isEditing || (defaultTipoMovimientoId !== undefined && !isEditing)) && (
            <p className="text-xs text-[var(--color-mutedForeground)]">
              {isEditing
                ? 'El tipo de movimiento no se puede modificar'
                : 'El tipo de movimiento está predefinido según el contexto'}
            </p>
          )}
          {errors.tipo_movimiento_id && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.tipo_movimiento_id}</p>
          )}
        </div>

        {/* Botones */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="gradient" disabled={isSubmitting || loadingTipos}>
            {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
