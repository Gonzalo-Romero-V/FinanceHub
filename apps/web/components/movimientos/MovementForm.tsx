'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AmountInput } from './AmountInput';
import type { ConceptoConTipo, MovementFormData } from '@/lib/types/movimientos';

interface MovementFormProps {
  concepto: ConceptoConTipo;
  onSubmit: (data: MovementFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const MAX_NOTA_LENGTH = 500;

export function MovementForm({ concepto, onSubmit, onCancel, loading = false }: MovementFormProps) {
  // Obtener fecha actual en formato YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<MovementFormData>({
    fecha: getTodayDate(),
    monto: 0,
    periodicidad: 'no-periodico',
    nota: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MovementFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof MovementFormData, string>> = {};

    if (formData.monto <= 0) {
      newErrors.monto = 'El monto debe ser mayor a cero';
    }

    if (formData.fecha && new Date(formData.fecha) > new Date()) {
      newErrors.fecha = 'La fecha no puede ser futura';
    }

    if (formData.nota && formData.nota.length > MAX_NOTA_LENGTH) {
      newErrors.nota = `La nota no puede exceder ${MAX_NOTA_LENGTH} caracteres`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      // Error manejado por el componente padre
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="ghost"
          size="sm"
          className="flex-shrink-0"
        >
          ← Atrás
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-foreground)]">
            Nuevo {concepto.nombre}
          </h1>
          <p className="text-sm sm:text-base text-[var(--color-mutedForeground)]">
            Completa los datos del movimiento
          </p>
        </div>
      </div>

      {/* Fecha */}
      <div className="space-y-2">
        <label htmlFor="fecha" className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
          Fecha
        </label>
        <input
          id="fecha"
          type="date"
          value={formData.fecha}
          onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
          max={getTodayDate()}
          className={`
            w-full px-4 py-3 sm:py-4
            text-base sm:text-lg
            bg-[var(--color-background)]
            border-2 rounded-xl
            text-[var(--color-foreground)]
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
            transition-all
            ${errors.fecha
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
            }
          `}
        />
        {errors.fecha && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.fecha}</p>
        )}
      </div>

      {/* Monto */}
      <div className="space-y-2">
        <label className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
          Monto
        </label>
        <AmountInput
          value={formData.monto}
          onChange={(monto) => setFormData({ ...formData, monto })}
          error={errors.monto}
        />
      </div>

      {/* Periodicidad */}
      <div className="space-y-2">
        <label className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
          Periodicidad
        </label>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, periodicidad: 'no-periodico' })}
            className={`
              px-4 py-3 sm:py-4 rounded-xl
              text-base sm:text-lg font-medium
              border-2 transition-all
              ${
                formData.periodicidad === 'no-periodico'
                  ? 'bg-[var(--color-primary)] text-[var(--color-primaryForeground)] border-[var(--color-primary)]'
                  : 'bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }
            `}
          >
            No periódico
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, periodicidad: 'periodico' })}
            className={`
              px-4 py-3 sm:py-4 rounded-xl
              text-base sm:text-lg font-medium
              border-2 transition-all
              ${
                formData.periodicidad === 'periodico'
                  ? 'bg-[var(--color-primary)] text-[var(--color-primaryForeground)] border-[var(--color-primary)]'
                  : 'bg-[var(--color-background)] text-[var(--color-foreground)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
              }
            `}
          >
            Periódico
          </button>
        </div>
      </div>

      {/* Nota */}
      <div className="space-y-2">
        <label htmlFor="nota" className="block text-sm sm:text-base font-medium text-[var(--color-foreground)]">
          Nota (opcional)
        </label>
        <textarea
          id="nota"
          value={formData.nota}
          onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
          placeholder="Agrega una nota o descripción..."
          maxLength={MAX_NOTA_LENGTH}
          rows={4}
          className={`
            w-full px-4 py-3 sm:py-4
            text-base sm:text-lg
            bg-[var(--color-background)]
            border-2 rounded-xl
            text-[var(--color-foreground)]
            placeholder:text-[var(--color-mutedForeground)]/50
            focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]
            transition-all
            resize-none
            ${errors.nota
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
            }
          `}
        />
        <div className="flex justify-between items-center">
          {errors.nota && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.nota}</p>
          )}
          <p className="text-xs sm:text-sm text-[var(--color-mutedForeground)] ml-auto">
            {formData.nota?.length || 0} / {MAX_NOTA_LENGTH}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          type="button"
          onClick={onCancel}
          variant="outline"
          size="lg"
          className="w-full sm:w-auto"
          disabled={isSubmitting || loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full sm:flex-1"
          disabled={isSubmitting || loading || formData.monto <= 0}
        >
          {isSubmitting || loading ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}
