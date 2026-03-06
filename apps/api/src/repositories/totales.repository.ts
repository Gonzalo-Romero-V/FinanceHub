import { getPool } from '../database/connection';

export interface TotalesFinancieros {
  total_activos: number;
  total_pasivos: number;
  patrimonio: number;
}

export class TotalesRepository {
  /**
   * Calcula el total de activos (suma de saldos de cuentas activas tipo 'activo')
   */
  async getTotalActivos(): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COALESCE(SUM(saldo), 0) as total
       FROM cuentas
       WHERE tipo_cuenta = 'activo' AND activa = true`
    );
    return parseFloat(result.rows[0].total);
  }

  /**
   * Calcula el total de pasivos (suma de saldos de cuentas activas tipo 'pasivo')
   */
  async getTotalPasivos(): Promise<number> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COALESCE(SUM(saldo), 0) as total
       FROM cuentas
       WHERE tipo_cuenta = 'pasivo' AND activa = true`
    );
    return parseFloat(result.rows[0].total);
  }

  /**
   * Obtiene todos los totales financieros (activos, pasivos y patrimonio)
   */
  async getTotalesFinancieros(): Promise<TotalesFinancieros> {
    const totalActivos = await this.getTotalActivos();
    const totalPasivos = await this.getTotalPasivos();
    const patrimonio = totalActivos - totalPasivos;

    return {
      total_activos: totalActivos,
      total_pasivos: totalPasivos,
      patrimonio: patrimonio,
    };
  }
}
