// Tipos que corresponden directamente al esquema de la base de datos
// Naming en español según el esquema

export interface Cuenta {
  id: number;
  nombre: string;
  tipo_cuenta: 'activo' | 'pasivo';
  saldo: number;
  fecha_creacion: Date;
  activa: boolean;
}

export interface TipoMovimiento {
  id: number;
  nombre: 'ingreso' | 'egreso' | 'transferencia';
}

export interface Concepto {
  id: number;
  nombre: string;
  tipo_movimiento_id: number;
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

// Tipos para creación (sin id y fecha)
export interface CrearCuenta {
  nombre: string;
  tipo_cuenta: 'activo' | 'pasivo';
  saldo?: number;
  activa?: boolean;
}

export interface CrearConcepto {
  nombre: string;
  tipo_movimiento_id: number;
}

export interface CrearMovimiento {
  monto: number;
  cuenta_origen_id: number | null;
  cuenta_destino_id: number | null;
  concepto_id: number;
  nota?: string | null;
}

// Tipos para filtros
export interface MovimientoFilters {
  cuenta_origen_id?: number;
  cuenta_destino_id?: number;
  concepto_id?: number;
  fecha_desde?: string; // YYYY-MM-DD
  fecha_hasta?: string; // YYYY-MM-DD
}

// Tipos extendidos con relaciones
export interface ConceptoConTipo extends Concepto {
  tipo_movimiento: TipoMovimiento;
}

export interface MovimientoConRelaciones extends Movimiento {
  concepto: ConceptoConTipo;
  cuenta_origen: Cuenta | null;
  cuenta_destino: Cuenta | null;
}

// Tipos de respuesta estándar
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  message?: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Tipos para actualización
export interface ActualizarCuenta {
  nombre?: string;
  tipo_cuenta?: 'activo' | 'pasivo';
  saldo?: number;
  activa?: boolean;
}

export interface ActualizarTipoMovimiento {
  nombre?: 'ingreso' | 'egreso' | 'transferencia';
}

export interface ActualizarConcepto {
  nombre?: string;
  tipo_movimiento_id?: number;
}

export interface ActualizarMovimiento {
  monto?: number;
  cuenta_origen_id?: number | null;
  cuenta_destino_id?: number | null;
  concepto_id?: number;
  nota?: string | null;
}

// Tipos para totales financieros
export interface TotalesFinancieros {
  total_activos: number;
  total_pasivos: number;
  patrimonio: number;
}

