import { getPool } from '../database/connection';
import {
  CrearMovimiento,
  ActualizarMovimiento,
  MovimientoFilters,
  MovimientoConRelaciones,
  ConceptoConTipo,
  Cuenta,
  TipoMovimiento,
} from '../types';
import { PoolClient } from 'pg';
import { normalizeTipoMovimientoNombre } from '../utils/normalize';

export class MovimientosRepository {
  /**
   * Obtiene todos los movimientos con filtros opcionales
   * Incluye relaciones: concepto (con tipo_movimiento), cuenta_origen, cuenta_destino
   */
  async findAll(filters?: MovimientoFilters): Promise<MovimientoConRelaciones[]> {
    const pool = getPool();
    let query = `
      SELECT 
        m.id,
        m.monto,
        m.cuenta_origen_id,
        m.cuenta_destino_id,
        m.concepto_id,
        m.nota,
        m.fecha,
        c.id as concepto_id_full,
        c.nombre as concepto_nombre,
        c.tipo_movimiento_id as concepto_tipo_movimiento_id,
        tm.id as tipo_movimiento_id_full,
        tm.nombre as tipo_movimiento_nombre,
        co.id as cuenta_origen_id_full,
        co.nombre as cuenta_origen_nombre,
        co.tipo_cuenta as cuenta_origen_tipo_cuenta,
        co.saldo as cuenta_origen_saldo,
        co.fecha_creacion as cuenta_origen_fecha_creacion,
        co.activa as cuenta_origen_activa,
        cd.id as cuenta_destino_id_full,
        cd.nombre as cuenta_destino_nombre,
        cd.tipo_cuenta as cuenta_destino_tipo_cuenta,
        cd.saldo as cuenta_destino_saldo,
        cd.fecha_creacion as cuenta_destino_fecha_creacion,
        cd.activa as cuenta_destino_activa
      FROM movimientos m
      INNER JOIN conceptos c ON m.concepto_id = c.id
      INNER JOIN tipos_movimiento tm ON c.tipo_movimiento_id = tm.id
      LEFT JOIN cuentas co ON m.cuenta_origen_id = co.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
    `;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.cuenta_origen_id !== undefined) {
      conditions.push(`m.cuenta_origen_id = $${paramIndex++}`);
      params.push(filters.cuenta_origen_id);
    }

    if (filters?.cuenta_destino_id !== undefined) {
      conditions.push(`m.cuenta_destino_id = $${paramIndex++}`);
      params.push(filters.cuenta_destino_id);
    }

    if (filters?.concepto_id !== undefined) {
      conditions.push(`m.concepto_id = $${paramIndex++}`);
      params.push(filters.concepto_id);
    }

    if (filters?.fecha_desde) {
      conditions.push(`m.fecha >= $${paramIndex++}::date`);
      params.push(filters.fecha_desde);
    }

    if (filters?.fecha_hasta) {
      conditions.push(`m.fecha <= $${paramIndex++}::date`);
      params.push(filters.fecha_hasta);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY m.fecha DESC, m.id DESC';

    const result = await pool.query(query, params);
    return result.rows.map(this.mapRowToMovimientoConRelaciones);
  }

  /**
   * Obtiene un movimiento por su ID con todas sus relaciones
   */
  async findById(id: number): Promise<MovimientoConRelaciones | null> {
    const pool = getPool();
    const result = await pool.query(
      `
      SELECT 
        m.id,
        m.monto,
        m.cuenta_origen_id,
        m.cuenta_destino_id,
        m.concepto_id,
        m.nota,
        m.fecha,
        c.id as concepto_id_full,
        c.nombre as concepto_nombre,
        c.tipo_movimiento_id as concepto_tipo_movimiento_id,
        tm.id as tipo_movimiento_id_full,
        tm.nombre as tipo_movimiento_nombre,
        co.id as cuenta_origen_id_full,
        co.nombre as cuenta_origen_nombre,
        co.tipo_cuenta as cuenta_origen_tipo_cuenta,
        co.saldo as cuenta_origen_saldo,
        co.fecha_creacion as cuenta_origen_fecha_creacion,
        co.activa as cuenta_origen_activa,
        cd.id as cuenta_destino_id_full,
        cd.nombre as cuenta_destino_nombre,
        cd.tipo_cuenta as cuenta_destino_tipo_cuenta,
        cd.saldo as cuenta_destino_saldo,
        cd.fecha_creacion as cuenta_destino_fecha_creacion,
        cd.activa as cuenta_destino_activa
      FROM movimientos m
      INNER JOIN conceptos c ON m.concepto_id = c.id
      INNER JOIN tipos_movimiento tm ON c.tipo_movimiento_id = tm.id
      LEFT JOIN cuentas co ON m.cuenta_origen_id = co.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      WHERE m.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMovimientoConRelaciones(result.rows[0]);
  }

  /**
   * Crea un nuevo movimiento y retorna con relaciones
   * @param data Datos del movimiento
   * @param client Cliente opcional de transacción (para uso en transacciones SQL)
   */
  async create(data: CrearMovimiento, client?: PoolClient): Promise<MovimientoConRelaciones> {
    const queryClient = client || getPool();
    const result = await queryClient.query(
      `INSERT INTO movimientos (monto, cuenta_origen_id, cuenta_destino_id, concepto_id, nota)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        data.monto,
        data.cuenta_origen_id,
        data.cuenta_destino_id,
        data.concepto_id,
        data.nota ?? null,
      ]
    );

    const id = result.rows[0].id;
    
    // Si estamos en una transacción, no podemos usar findById que usa su propio cliente
    // En ese caso, construimos el objeto directamente o hacemos la query con el mismo cliente
    if (client) {
      // En transacción, obtener con el mismo cliente
      const movimiento = await this.findByIdWithClient(id, client);
      if (!movimiento) {
        throw new Error('Error al obtener el movimiento creado');
      }
      return movimiento;
    } else {
      // Fuera de transacción, usar el método normal
      const movimientoConRelaciones = await this.findById(id);
      if (!movimientoConRelaciones) {
        throw new Error('Error al obtener el movimiento creado');
      }
      return movimientoConRelaciones;
    }
  }

  /**
   * Obtiene un movimiento por ID usando un cliente específico (para transacciones)
   */
  private async findByIdWithClient(id: number, client: PoolClient): Promise<MovimientoConRelaciones | null> {
    const result = await client.query(
      `
      SELECT 
        m.id,
        m.monto,
        m.cuenta_origen_id,
        m.cuenta_destino_id,
        m.concepto_id,
        m.nota,
        m.fecha,
        c.id as concepto_id_full,
        c.nombre as concepto_nombre,
        c.tipo_movimiento_id as concepto_tipo_movimiento_id,
        tm.id as tipo_movimiento_id_full,
        tm.nombre as tipo_movimiento_nombre,
        co.id as cuenta_origen_id_full,
        co.nombre as cuenta_origen_nombre,
        co.tipo_cuenta as cuenta_origen_tipo_cuenta,
        co.saldo as cuenta_origen_saldo,
        co.fecha_creacion as cuenta_origen_fecha_creacion,
        co.activa as cuenta_origen_activa,
        cd.id as cuenta_destino_id_full,
        cd.nombre as cuenta_destino_nombre,
        cd.tipo_cuenta as cuenta_destino_tipo_cuenta,
        cd.saldo as cuenta_destino_saldo,
        cd.fecha_creacion as cuenta_destino_fecha_creacion,
        cd.activa as cuenta_destino_activa
      FROM movimientos m
      INNER JOIN conceptos c ON m.concepto_id = c.id
      INNER JOIN tipos_movimiento tm ON c.tipo_movimiento_id = tm.id
      LEFT JOIN cuentas co ON m.cuenta_origen_id = co.id
      LEFT JOIN cuentas cd ON m.cuenta_destino_id = cd.id
      WHERE m.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToMovimientoConRelaciones(result.rows[0]);
  }

  /**
   * Actualiza un movimiento existente y retorna con relaciones
   * @param id ID del movimiento a actualizar
   * @param data Datos a actualizar
   * @param client Cliente opcional de transacción (para uso en transacciones SQL)
   */
  async update(id: number, data: ActualizarMovimiento, client?: PoolClient): Promise<MovimientoConRelaciones | null> {
    const queryClient = client || getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.monto !== undefined) {
      fields.push(`monto = $${paramIndex++}`);
      values.push(data.monto);
    }
    if (data.cuenta_origen_id !== undefined) {
      fields.push(`cuenta_origen_id = $${paramIndex++}`);
      values.push(data.cuenta_origen_id);
    }
    if (data.cuenta_destino_id !== undefined) {
      fields.push(`cuenta_destino_id = $${paramIndex++}`);
      values.push(data.cuenta_destino_id);
    }
    if (data.concepto_id !== undefined) {
      fields.push(`concepto_id = $${paramIndex++}`);
      values.push(data.concepto_id);
    }
    if (data.nota !== undefined) {
      fields.push(`nota = $${paramIndex++}`);
      values.push(data.nota);
    }

    if (fields.length === 0) {
      // Si estamos en una transacción, usar el cliente para obtener el movimiento
      if (client) {
        return this.findByIdWithClient(id, client);
      }
      return this.findById(id);
    }

    values.push(id);
    const query = `UPDATE movimientos SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
    const result = await queryClient.query(query, values);

    if (result.rowCount === 0) {
      return null;
    }

    // Si estamos en una transacción, usar el cliente para obtener el movimiento actualizado
    if (client) {
      return this.findByIdWithClient(id, client);
    }
    return this.findById(id);
  }

  /**
   * Elimina un movimiento
   * @param id ID del movimiento a eliminar
   * @param client Cliente opcional de transacción (para uso en transacciones SQL)
   */
  async delete(id: number, client?: PoolClient): Promise<boolean> {
    const queryClient = client || getPool();
    const result = await queryClient.query('DELETE FROM movimientos WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Mapea una fila con JOINs a un objeto MovimientoConRelaciones
   */
  private mapRowToMovimientoConRelaciones(row: any): MovimientoConRelaciones {
    const tipoMovimiento: TipoMovimiento = {
      id: row.tipo_movimiento_id_full,
      nombre: normalizeTipoMovimientoNombre(row.tipo_movimiento_nombre),
    };

    const concepto: ConceptoConTipo = {
      id: row.concepto_id_full,
      nombre: row.concepto_nombre,
      tipo_movimiento_id: row.concepto_tipo_movimiento_id,
      tipo_movimiento: tipoMovimiento,
    };

    const cuentaOrigen: Cuenta | null = row.cuenta_origen_id_full
      ? {
          id: row.cuenta_origen_id_full,
          nombre: row.cuenta_origen_nombre,
          tipo_cuenta: row.cuenta_origen_tipo_cuenta,
          saldo: parseFloat(row.cuenta_origen_saldo),
          fecha_creacion: row.cuenta_origen_fecha_creacion,
          activa: row.cuenta_origen_activa,
        }
      : null;

    const cuentaDestino: Cuenta | null = row.cuenta_destino_id_full
      ? {
          id: row.cuenta_destino_id_full,
          nombre: row.cuenta_destino_nombre,
          tipo_cuenta: row.cuenta_destino_tipo_cuenta,
          saldo: parseFloat(row.cuenta_destino_saldo),
          fecha_creacion: row.cuenta_destino_fecha_creacion,
          activa: row.cuenta_destino_activa,
        }
      : null;

    return {
      id: row.id,
      monto: parseFloat(row.monto),
      cuenta_origen_id: row.cuenta_origen_id,
      cuenta_destino_id: row.cuenta_destino_id,
      concepto_id: row.concepto_id,
      nota: row.nota,
      fecha: row.fecha,
      concepto,
      cuenta_origen: cuentaOrigen,
      cuenta_destino: cuentaDestino,
    };
  }
}
