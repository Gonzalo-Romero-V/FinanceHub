'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TypeSelection } from '@/components/movimientos/TypeSelection';
import { ConceptSelection } from '@/components/movimientos/ConceptSelection';
import { AccountSelection } from '@/components/movimientos/AccountSelection';
import { MovementForm } from '@/components/movimientos/MovementForm';
import { createMovimiento } from '@/lib/api/movimientos';
import type { MovementType, ConceptoConTipo, Cuenta, MovementFormData } from '@/lib/types/movimientos';

type Step = 'type' | 'concept' | 'account' | 'form';

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('type');
  const [movementType, setMovementType] = useState<MovementType | null>(null);
  const [selectedConcepto, setSelectedConcepto] = useState<ConceptoConTipo | null>(null);
  const [selectedCuenta, setSelectedCuenta] = useState<Cuenta | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeSelect = (type: MovementType) => {
    if (type === 'ingreso' || type === 'egreso') {
      setMovementType(type);
      setStep('concept');
      setError(null);
    } else {
      setError('El flujo de transferencias estará disponible próximamente');
    }
  };

  const handleConceptSelect = (concepto: ConceptoConTipo) => {
    setSelectedConcepto(concepto);
    setStep('account');
    setError(null);
  };

  const handleAccountSelect = (cuenta: Cuenta) => {
    setSelectedCuenta(cuenta);
    setStep('form');
    setError(null);
  };

  const handleBackFromConcept = () => {
    setStep('type');
    setMovementType(null);
    setSelectedConcepto(null);
    setSelectedCuenta(null);
    setError(null);
  };

  const handleBackFromAccount = () => {
    setStep('concept');
    setSelectedCuenta(null);
    setError(null);
  };

  const handleBackFromForm = () => {
    setStep('account');
    setError(null);
  };

  const handleFormSubmit = async (formData: MovementFormData) => {
    if (!selectedConcepto) {
      setError('No se ha seleccionado un concepto');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const movimientoData = {
        monto: formData.monto,
        cuenta_origen_id: movementType === 'egreso' ? selectedCuenta.id : null,
        cuenta_destino_id: movementType === 'ingreso' ? selectedCuenta.id : null,
        concepto_id: selectedConcepto.id,
        nota: formData.nota || null,
      };

      const result = await createMovimiento(movimientoData);

      if (result.success) {
        // Redirigir al dashboard después de crear exitosamente
        router.push('/dashboard');
      } else {
        setError(result.error || 'Error al guardar el movimiento');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado al guardar el movimiento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setStep('type');
    setMovementType(null);
    setSelectedConcepto(null);
    setSelectedCuenta(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="glass-strong rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-xl">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm sm:text-base text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Type Selection */}
        {step === 'type' && <TypeSelection onSelect={handleTypeSelect} />}

        {/* Step 2: Concept Selection */}
        {step === 'concept' && movementType && (
          <ConceptSelection
            movementType={movementType}
            onSelect={handleConceptSelect}
            onBack={handleBackFromConcept}
          />
        )}

        {/* Step 3: Account Selection */}
        {step === 'account' && movementType && selectedConcepto && (
          <AccountSelection
            movementType={movementType}
            onSelect={handleAccountSelect}
            onBack={handleBackFromAccount}
          />
        )}

        {/* Step 4: Form */}
        {step === 'form' && selectedConcepto && selectedCuenta && (
          <MovementForm
            concepto={selectedConcepto}
            onSubmit={handleFormSubmit}
            onCancel={handleBackFromForm}
            loading={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
