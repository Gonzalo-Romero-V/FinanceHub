import { getPool } from '../database/connection';
import { Concepto, CrearConcepto, ActualizarConcepto, ConceptoConTipo, TipoMovimiento } from '../types';
import { normalizeTipoMovimientoNombre } from '../utils/normalize';

export class ConceptosRepository {
  /**
   * Obtiene todos los conceptos, opcionalmente filtrados por tipo de movimiento
   * Incluye la relación con TipoMovimiento
   */
  async findAll(tipo_movimiento_id?: number): Promise<ConceptoConTipo[]> {
    const pool = getPool();
    let query = `
      SELECT 
        c.id,
        c.nombre,
        c.tipo_movimiento_id,
        tm.id as tipo_id,
        tm.nombre as tipo_nombre
      FROM conceptos c
      INNER JOIN tipos_movimiento tm ON c.tipo_movimiento_id = tm.id
    `;
    const params: any[] = [];

    if (tipo_movimiento_id !== undefined) {
      query += ' WHERE c.tipo_movimiento_id = $1';
      params.push(tipo_movimiento_id);
    }

    query += ' ORDER BY c.nombre';

    const result = await pool.query(query, params);
    return result.rows.map(this.mapRowToConceptoConTipo);
  }

  /**
   * Obtiene un concepto por su ID
   * Incluye la relación con TipoMovimiento
   */
  async findById(id: number): Promise<ConceptoConTipo | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        c.id,
        c.nombre,
        c.tipo_movimiento_id,
        tm.id as tipo_id,
        tm.nombre as tipo_nombre
      FROM conceptos c
      INNER JOIN tipos_movimiento tm ON c.tipo_movimiento_id = tm.id
      WHERE c.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConceptoConTipo(result.rows[0]);
  }

  /**
   * Busca un concepto por nombre y tipo de movimiento
   */
  async findByNombreYTipo(nombre: string, tipo_movimiento_id: number): Promise<Concepto | null> {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM conceptos WHERE nombre = $1 AND tipo_movimiento_id = $2',
      [nombre, tipo_movimiento_id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConcepto(result.rows[0]);
  }

  /**
   * Crea un nuevo concepto
   * Incluye la relación con TipoMovimiento
   */
  async create(data: CrearConcepto): Promise<ConceptoConTipo> {
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO conceptos (nombre, tipo_movimiento_id) 
       VALUES ($1, $2) 
       RETURNING id, nombre, tipo_movimiento_id`,
      [data.nombre, data.tipo_movimiento_id]
    );

    if (result.rows.length === 0) {
      throw new Error('Error al crear el concepto');
    }

    const conceptoId = result.rows[0].id;
    const conceptoConTipo = await this.findById(conceptoId);
    if (!conceptoConTipo) {
      throw new Error('Error al obtener el concepto creado');
    }

    return conceptoConTipo;
  }

  /**
   * Actualiza un concepto existente
   * Incluye la relación con TipoMovimiento
   */
  async update(id: number, data: ActualizarConcepto): Promise<ConceptoConTipo | null> {
    const pool = getPool();
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.tipo_movimiento_id !== undefined) {
      fields.push(`tipo_movimiento_id = $${paramIndex++}`);
      values.push(data.tipo_movimiento_id);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `UPDATE conceptos SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, nombre, tipo_movimiento_id`;
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Elimina un concepto
   * IMPORTANTE: No elimina movimientos asociados (sin cascada)
   */
  async delete(id: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM conceptos WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Mapea una fila de la BD a un objeto Concepto
   */
  private mapRowToConcepto(row: any): Concepto {
    return {
      id: row.id,
      nombre: row.nombre,
      tipo_movimiento_id: row.tipo_movimiento_id,
    };
  }

  /**
   * Mapea una fila de la BD a un objeto ConceptoConTipo
   */
  private mapRowToConceptoConTipo(row: any): ConceptoConTipo {
    return {
      id: row.id,
      nombre: row.nombre,
      tipo_movimiento_id: row.tipo_movimiento_id,
      tipo_movimiento: {
        id: row.tipo_id,
        nombre: normalizeTipoMovimientoNombre(row.tipo_nombre),
      },
    };
  }
}
