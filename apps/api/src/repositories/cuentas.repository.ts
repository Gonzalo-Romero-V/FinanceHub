import { getPool } from '../database/connection';
import { Cuenta, CrearCuenta, ActualizarCuenta } from '../types';
import { PoolClient } from 'pg';

export class CuentasRepository {
  /**
   * Obtiene todas las cuentas, opcionalmente filtradas por estado activo y tipo de cuenta
   */
  async findAll(activa?: boolean, tipo_cuenta?: 'activo' | 'pasivo'): Promise<Cuenta[]> {
    const pool = getPool();
    let query = 'SELECT * FROM cuentas';
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (activa !== undefined) {
      conditions.push(`activa = $${paramIndex++}`);
      params.push(activa);
    }

    if (tipo_cuenta !== undefined) {
      conditions.push(`tipo_cuenta = $${paramIndex++}`);
      params.push(tipo_cuenta);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY fecha_creacion DESC';

    const result = await pool.query(query, params);
    return result.rows.map(this.mapRowToCuenta);
  }

  /**
   * Obtiene una cuenta por su ID
   */
  async findById(id: number): Promise<Cuenta | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM cuentas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCuenta(result.rows[0]);
  }

  /**
   * Crea una nueva cuenta
   */
  async create(data: CrearCuenta): Promise<Cuenta> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO cuentas (nombre, tipo_cuenta, saldo, activa)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        data.nombre,
        data.tipo_cuenta,
        data.saldo ?? 0,
        data.activa ?? true,
      ]
    );

    return this.mapRowToCuenta(result.rows[0]);
  }

  /**
   * Actualiza una cuenta existente
   */
  async update(id: number, data: ActualizarCuenta): Promise<Cuenta | null> {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.tipo_cuenta !== undefined) {
      fields.push(`tipo_cuenta = $${paramIndex++}`);
      values.push(data.tipo_cuenta);
    }
    if (data.saldo !== undefined) {
      fields.push(`saldo = $${paramIndex++}`);
      values.push(data.saldo);
    }
    if (data.activa !== undefined) {
      fields.push(`activa = $${paramIndex++}`);
      values.push(data.activa);
    }

    if (fields.length === 0) {
      // No hay campos para actualizar, retornar la cuenta actual
      return this.findById(id);
    }

    values.push(id);
    const query = `UPDATE cuentas SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCuenta(result.rows[0]);
  }

  /**
   * Desactiva una cuenta (no la elimina)
   */
  async desactivar(id: number): Promise<Cuenta | null> {
    return this.update(id, { activa: false });
  }

  /**
   * Reactiva una cuenta
   */
  async activar(id: number): Promise<Cuenta | null> {
    return this.update(id, { activa: true });
  }

  /**
   * Actualiza el saldo de una cuenta sumando o restando un monto
   * Aplica para cuentas de tipo 'activo' y 'pasivo' que estén activas
   * @param id ID de la cuenta
   * @param cambio Monto a sumar o restar
   * @param operacion 'sumar' o 'restar'
   * @param client Cliente opcional de transacción (para uso en transacciones SQL)
   * @returns La cuenta actualizada o null si no existe o no aplica
   */
  async actualizarSaldo(id: number, cambio: number, operacion: 'sumar' | 'restar', client?: PoolClient): Promise<Cuenta | null> {
    const queryClient = client || getPool();

    if (operacion === 'sumar') {
      const result = await queryClient.query(
        `UPDATE cuentas
         SET saldo = saldo + $2
         WHERE id = $1 AND activa = true
         RETURNING *`,
        [id, cambio]
      );

      if (result.rows.length > 0) {
        return this.mapRowToCuenta(result.rows[0]);
      }

      // No se actualizó: cuenta no existe o está inactiva
      const cuentaResult = await queryClient.query('SELECT * FROM cuentas WHERE id = $1', [id]);
      if (cuentaResult.rows.length === 0) return null;
      return this.mapRowToCuenta(cuentaResult.rows[0]);
    }

    // operacion === 'restar' (validación no-negativo en SQL)
    const result = await queryClient.query(
      `UPDATE cuentas
       SET saldo = saldo - $2
       WHERE id = $1
         AND activa = true
         AND (saldo - $2) >= 0
       RETURNING *`,
      [id, cambio]
    );

    if (result.rows.length > 0) {
      return this.mapRowToCuenta(result.rows[0]);
    }

    // No se actualizó: cuenta no existe, está inactiva o quedaría negativa.
    // Distinguimos para preservar el comportamiento previo.
    const cuentaResult = await queryClient.query('SELECT * FROM cuentas WHERE id = $1', [id]);
    if (cuentaResult.rows.length === 0) return null;

    const cuenta = this.mapRowToCuenta(cuentaResult.rows[0]);
    if (!cuenta.activa) return cuenta;

    // Cuenta activa pero sin update => saldo insuficiente (o cambio inválido)
    if (cuenta.saldo - cambio < 0) {
      throw new Error(
        `El saldo de la cuenta no puede ser negativo. Saldo actual: ${cuenta.saldo}, operación: ${operacion}, cambio: ${cambio}`
      );
    }

    return cuenta;
  }

  /**
   * Mapea una fila de la BD a un objeto Cuenta
   */
  private mapRowToCuenta(row: any): Cuenta {
    return {
      id: row.id,
      nombre: row.nombre,
      tipo_cuenta: row.tipo_cuenta,
      saldo: parseFloat(row.saldo),
      fecha_creacion: row.fecha_creacion,
      activa: row.activa,
    };
  }
}
