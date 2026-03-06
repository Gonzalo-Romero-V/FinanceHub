/**
 * Tipos TypeScript para movimientos y entidades relacionadas
 * Coinciden con los tipos del backend
 */

// Tipos del backend
export interface TipoMovimiento {
  id: number;
  nombre: 'ingreso' | 'egreso' | 'transferencia';
}

export interface Concepto {
  id: number;
  nombre: string;
  tipo_movimiento_id: number;
}

export interface ConceptoConTipo extends Concepto {
  tipo_movimiento: TipoMovimiento;
}

export interface Cuenta {
  id: number;
  nombre: string;
  tipo_cuenta: 'activo' | 'pasivo';
  saldo: number;
  fecha_creacion: Date;
  activa: boolean;
}

export interface Movimiento {
  id: number;
  monto: number;
  cuenta_origen_id: number | null;
  cuenta_destino_id: number | null;
  concepto_id: number;
  nota: string | null;
  fecha: Date;
}

export interface CrearMovimiento {
  monto: number;
  cuenta_origen_id: number | null;
  cuenta_destino_id: number | null;
  concepto_id: number;
  nota?: string | null;
}

// Tipos específicos del frontend
export type MovementType = 'ingreso' | 'egreso' | 'transferencia';

export type Periodicidad = 'no-periodico' | 'periodico';

export type TipoCuenta = 'activo' | 'pasivo';

export interface MovementFormData {
  fecha: string; // YYYY-MM-DD
  monto: number;
  periodicidad: Periodicidad;
  nota?: string;
}

// Tipos de respuesta del API
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
}

// Tipos para crear y actualizar (importados del backend)
export interface CrearCuenta {
  nombre: string;
  tipo_cuenta: 'activo' | 'pasivo';
  saldo?: number;
  activa?: boolean;
}

export interface ActualizarCuenta {
  nombre?: string;
  tipo_cuenta?: 'activo' | 'pasivo';
  saldo?: number;
  activa?: boolean;
}

export interface CrearConcepto {
  nombre: string;
  tipo_movimiento_id: number;
}

export interface ActualizarConcepto {
  nombre?: string;
  tipo_movimiento_id?: number;
}

// Tipos para totales financieros
export interface TotalesFinancieros {
  total_activos: number;
  total_pasivos: number;
  patrimonio: number;
}
