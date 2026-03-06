'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  className?: string;
}

/**
 * Input especializado para montos tipo banca móvil
 * Formatea números con separadores de miles y maneja decimales
 * Formatea solo al perder el foco (blur) para no interferir con la entrada
 */
export function AmountInput({ value, onChange, error, className }: AmountInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Formatear número con separadores de miles
  const formatNumber = (num: number): string => {
    if (num === 0) return '';
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Parsear string a número - permite entrada libre de números y punto decimal
  const parseValue = (str: string): number => {
    // Remover todo excepto números y punto decimal
    const cleaned = str.replace(/[^\d.]/g, '');
    
    // Si está vacío o solo tiene un punto, retornar 0
    if (cleaned === '' || cleaned === '.') return 0;
    
    // Permitir solo un punto decimal
    const parts = cleaned.split('.');
    let result = parts[0] || '';
    
    if (parts.length > 1) {
      // Limitar a 2 decimales
      const decimals = parts.slice(1).join('').substring(0, 2);
      result += '.' + decimals;
    }

    const num = parseFloat(result);
    return isNaN(num) ? 0 : num;
  };

  // Normalizar el string de entrada - mantener solo números y un punto decimal
  const normalizeInput = (str: string): string => {
    // Remover todo excepto números y punto decimal
    const cleaned = str.replace(/[^\d.]/g, '');
    
    // Permitir solo un punto decimal
    const parts = cleaned.split('.');
    let result = parts[0] || '';
    
    if (parts.length > 1) {
      // Limitar a 2 decimales
      const decimals = parts.slice(1).join('').substring(0, 2);
      result += '.' + decimals;
    }

    return result;
  };

  // Sincronizar displayValue con value prop solo cuando no está enfocado
  useEffect(() => {
    if (!isFocused) {
      if (value > 0) {
        setDisplayValue(formatNumber(value));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Si está vacío, permitir borrar
    if (inputValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }

    // Normalizar la entrada (solo números y punto decimal, máximo 2 decimales)
    const normalized = normalizeInput(inputValue);
    setDisplayValue(normalized);
    
    // Parsear y actualizar el valor numérico
    const numValue = parseValue(normalized);
    onChange(numValue);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Al enfocar, mostrar el valor numérico sin formato para edición fácil
    if (value > 0) {
      // Mostrar sin formato, pero mantener los decimales si existen
      const str = value.toString();
      setDisplayValue(str);
    } else {
      setDisplayValue('');
    }
    // Seleccionar todo el texto para facilitar reemplazo
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Al perder el foco, formatear el número
    if (value > 0) {
      setDisplayValue(formatNumber(value));
    } else {
      setDisplayValue('');
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl sm:text-3xl font-bold text-[var(--color-mutedForeground)]">
          $
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0.00"
          className={cn(
            'w-full pl-12 pr-4 py-4 sm:py-6',
            'text-3xl sm:text-4xl font-bold',
            'bg-[var(--color-background)]',
            'border-2 rounded-xl',
            'text-[var(--color-foreground)]',
            'placeholder:text-[var(--color-mutedForeground)]/50',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]',
            'transition-all',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
          )}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
