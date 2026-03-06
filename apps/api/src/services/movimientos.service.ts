import { MovimientosRepository } from '../repositories/movimientos.repository';
import { ConceptosRepository } from '../repositories/conceptos.repository';
import { CuentasRepository } from '../repositories/cuentas.repository';
import {
  MovimientoConRelaciones,
  CrearMovimiento,
  ActualizarMovimiento,
  MovimientoFilters,
} from '../types';
import { getPool } from '../database/connection';
import { normalizeTipoMovimientoNombre, TipoMovimientoNombre } from '../utils/normalize';

export class MovimientosService {
  private repository: MovimientosRepository;
  private conceptosRepository: ConceptosRepository;
  private cuentasRepository: CuentasRepository;

  constructor() {
    this.repository = new MovimientosRepository();
    this.conceptosRepository = new ConceptosRepository();
    this.cuentasRepository = new CuentasRepository();
  }

  private async applySaldoForMovimiento(
    tipoMovimiento: TipoMovimientoNombre,
    monto: number,
    cuenta_origen_id: number | null | undefined,
    cuenta_destino_id: number | null | undefined,
    client: Parameters<CuentasRepository['actualizarSaldo']>[3]
  ): Promise<void> {
    if (tipoMovimiento === 'ingreso' && cuenta_destino_id) {
      await this.cuentasRepository.actualizarSaldo(cuenta_destino_id, monto, 'sumar', client);
      return;
    }

    if (tipoMovimiento === 'egreso' && cuenta_origen_id) {
      await this.cuentasRepository.actualizarSaldo(cuenta_origen_id, monto, 'restar', client);
      return;
    }

    if (tipoMovimiento === 'transferencia' && cuenta_origen_id && cuenta_destino_id) {
      await this.cuentasRepository.actualizarSaldo(cuenta_origen_id, monto, 'restar', client);
      await this.cuentasRepository.actualizarSaldo(cuenta_destino_id, monto, 'sumar', client);
    }
  }

  private async revertSaldoForMovimiento(
    tipoMovimiento: TipoMovimientoNombre,
    monto: number,
    cuenta_origen_id: number | null,
    cuenta_destino_id: number | null,
    client: Parameters<CuentasRepository['actualizarSaldo']>[3]
  ): Promise<void> {
    if (tipoMovimiento === 'ingreso' && cuenta_destino_id) {
      await this.cuentasRepository.actualizarSaldo(cuenta_destino_id, monto, 'restar', client);
      return;
    }

    if (tipoMovimiento === 'egreso' && cuenta_origen_id) {
      await this.cuentasRepository.actualizarSaldo(cuenta_origen_id, monto, 'sumar', client);
      return;
    }

    if (tipoMovimiento === 'transferencia' && cuenta_origen_id && cuenta_destino_id) {
      await this.cuentasRepository.actualizarSaldo(cuenta_origen_id, monto, 'sumar', client);
      await this.cuentasRepository.actualizarSaldo(cuenta_destino_id, monto, 'restar', client);
    }
  }

  /**
   * Obtiene todos los movimientos con filtros opcionales
   */
  async getAll(filters?: MovimientoFilters): Promise<MovimientoConRelaciones[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Obtiene un movimiento por ID
   */
  async getById(id: number): Promise<MovimientoConRelaciones | null> {
    if (!id || id <= 0) {
      throw new Error('ID de movimiento inválido');
    }
    return this.repository.findById(id);
  }

  /**
   * Crea un nuevo movimiento y actualiza el saldo de la cuenta afectada
   */
  async create(data: CrearMovimiento): Promise<MovimientoConRelaciones> {
    // Validaciones
    if (!data.monto || data.monto <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (!data.concepto_id || data.concepto_id <= 0) {
      throw new Error('El concepto es requerido');
    }

    // Validar que el concepto existe y obtener su tipo de movimiento
    const concepto = await this.conceptosRepository.findById(data.concepto_id);
    if (!concepto) {
      throw new Error('Concepto no encontrado');
    }

    const tipoMovimiento = normalizeTipoMovimientoNombre(concepto.tipo_movimiento.nombre);

    // Validar que las cuentas existen (si se proporcionan)
    if (data.cuenta_origen_id !== null && data.cuenta_origen_id !== undefined) {
      if (data.cuenta_origen_id <= 0) {
        throw new Error('ID de cuenta origen inválido');
      }
      const cuentaOrigen = await this.cuentasRepository.findById(data.cuenta_origen_id);
      if (!cuentaOrigen) {
        throw new Error('Cuenta origen no encontrada');
      }
    }

    if (data.cuenta_destino_id !== null && data.cuenta_destino_id !== undefined) {
      if (data.cuenta_destino_id <= 0) {
        throw new Error('ID de cuenta destino inválido');
      }
      const cuentaDestino = await this.cuentasRepository.findById(data.cuenta_destino_id);
      if (!cuentaDestino) {
        throw new Error('Cuenta destino no encontrada');
      }
    }

    // Usar transacción para crear movimiento y actualizar saldo atómicamente
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Crear el movimiento dentro de la transacción
      const movimiento = await this.repository.create(data, client);

      await this.applySaldoForMovimiento(
        tipoMovimiento,
        data.monto,
        data.cuenta_origen_id,
        data.cuenta_destino_id,
        client
      );

      await client.query('COMMIT');
      return movimiento;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Actualiza un movimiento existente y ajusta los saldos de las cuentas
   */
  async update(id: number, data: ActualizarMovimiento): Promise<MovimientoConRelaciones> {
    if (!id || id <= 0) {
      throw new Error('ID de movimiento inválido');
    }

    // Verificar que el movimiento existe
    const movimientoExistente = await this.repository.findById(id);
    if (!movimientoExistente) {
      throw new Error('Movimiento no encontrado');
    }

    // Validaciones
    if (data.monto !== undefined) {
      if (data.monto <= 0) {
        throw new Error('El monto debe ser mayor a 0');
      }
    }

    // Determinar el concepto a usar (nuevo o existente)
    const conceptoId = data.concepto_id !== undefined ? data.concepto_id : movimientoExistente.concepto_id;
    if (conceptoId <= 0) {
      throw new Error('ID de concepto inválido');
    }
    const concepto = await this.conceptosRepository.findById(conceptoId);
    if (!concepto) {
      throw new Error('Concepto no encontrado');
    }
    const tipoMovimiento = normalizeTipoMovimientoNombre(concepto.tipo_movimiento.nombre);

    // Determinar valores finales (nuevos o existentes)
    const montoFinal = data.monto !== undefined ? data.monto : movimientoExistente.monto;
    const cuentaOrigenFinal = data.cuenta_origen_id !== undefined ? data.cuenta_origen_id : movimientoExistente.cuenta_origen_id;
    const cuentaDestinoFinal = data.cuenta_destino_id !== undefined ? data.cuenta_destino_id : movimientoExistente.cuenta_destino_id;

    // Validar que las cuentas existen (si se proporcionan)
    if (cuentaOrigenFinal !== null && cuentaOrigenFinal !== undefined) {
      if (cuentaOrigenFinal <= 0) {
        throw new Error('ID de cuenta origen inválido');
      }
      const cuentaOrigen = await this.cuentasRepository.findById(cuentaOrigenFinal);
      if (!cuentaOrigen) {
        throw new Error('Cuenta origen no encontrada');
      }
    }

    if (cuentaDestinoFinal !== null && cuentaDestinoFinal !== undefined) {
      if (cuentaDestinoFinal <= 0) {
        throw new Error('ID de cuenta destino inválido');
      }
      const cuentaDestino = await this.cuentasRepository.findById(cuentaDestinoFinal);
      if (!cuentaDestino) {
        throw new Error('Cuenta destino no encontrada');
      }
    }

    // Usar transacción para revertir movimiento anterior y aplicar nuevo
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tipoMovimientoAnterior = normalizeTipoMovimientoNombre(
        movimientoExistente.concepto.tipo_movimiento.nombre
      );
      await this.revertSaldoForMovimiento(
        tipoMovimientoAnterior,
        movimientoExistente.monto,
        movimientoExistente.cuenta_origen_id,
        movimientoExistente.cuenta_destino_id,
        client
      );

      // Actualizar el movimiento dentro de la transacción
      const movimientoActualizado = await this.repository.update(id, data, client);
      if (!movimientoActualizado) {
        throw new Error('Movimiento no encontrado');
      }

      await this.applySaldoForMovimiento(
        tipoMovimiento,
        montoFinal,
        cuentaOrigenFinal,
        cuentaDestinoFinal,
        client
      );

      await client.query('COMMIT');
      return movimientoActualizado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina un movimiento y revierte el saldo de la cuenta afectada
   */
  async delete(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('ID de movimiento inválido');
    }

    // Verificar que existe
    const movimientoExistente = await this.repository.findById(id);
    if (!movimientoExistente) {
      throw new Error('Movimiento no encontrado');
    }

    // Usar transacción para revertir saldo y eliminar movimiento
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tipoMovimiento = normalizeTipoMovimientoNombre(movimientoExistente.concepto.tipo_movimiento.nombre);
      await this.revertSaldoForMovimiento(
        tipoMovimiento,
        movimientoExistente.monto,
        movimientoExistente.cuenta_origen_id,
        movimientoExistente.cuenta_destino_id,
        client
      );

      // Eliminar el movimiento
      const eliminado = await this.repository.delete(id, client);
      if (!eliminado) {
        throw new Error('Error al eliminar el movimiento');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
