import { getPool } from '../database/connection';
import { TipoMovimiento, ActualizarTipoMovimiento } from '../types';

export class TiposMovimientoRepository {
  /**
   * Obtiene todos los tipos de movimiento
   */
  async findAll(): Promise<TipoMovimiento[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM tipos_movimiento ORDER BY id');
    return result.rows.map(this.mapRowToTipoMovimiento);
  }

  /**
   * Obtiene un tipo de movimiento por su ID
   */
  async findById(id: number): Promise<TipoMovimiento | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM tipos_movimiento WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTipoMovimiento(result.rows[0]);
  }

  /**
   * Busca un tipo de movimiento por nombre
   */
  async findByNombre(nombre: string): Promise<TipoMovimiento | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM tipos_movimiento WHERE nombre = $1', [nombre]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTipoMovimiento(result.rows[0]);
  }

  /**
   * Crea un nuevo tipo de movimiento
   */
  async create(data: { nombre: string }): Promise<TipoMovimiento> {
    const pool = getPool();
    const result = await pool.query(
      'INSERT INTO tipos_movimiento (nombre) VALUES ($1) RETURNING *',
      [data.nombre]
    );

    return this.mapRowToTipoMovimiento(result.rows[0]);
  }

  /**
   * Actualiza un tipo de movimiento existente
   */
  async update(id: number, data: ActualizarTipoMovimiento): Promise<TipoMovimiento | null> {
    const pool = getPool();
    
    if (data.nombre === undefined) {
      return this.findById(id);
    }

    const result = await pool.query(
      'UPDATE tipos_movimiento SET nombre = $1 WHERE id = $2 RETURNING *',
      [data.nombre, id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTipoMovimiento(result.rows[0]);
  }

  /**
   * Elimina un tipo de movimiento
   */
  async delete(id: number): Promise<boolean> {
    const pool = getPool();
    const result = await pool.query('DELETE FROM tipos_movimiento WHERE id = $1', [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Mapea una fila de la BD a un objeto TipoMovimiento
   */
  private mapRowToTipoMovimiento(row: any): TipoMovimiento {
    return {
      id: row.id,
      nombre: row.nombre,
    };
  }
}
