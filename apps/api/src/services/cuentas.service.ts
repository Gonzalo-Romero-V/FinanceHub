import { CuentasRepository } from '../repositories/cuentas.repository';
import { Cuenta, CrearCuenta, ActualizarCuenta } from '../types';

export class CuentasService {
  private repository: CuentasRepository;

  constructor() {
    this.repository = new CuentasRepository();
  }

  /**
   * Obtiene todas las cuentas, opcionalmente filtradas por estado activo y tipo de cuenta
   */
  async getAll(activa?: boolean, tipo_cuenta?: 'activo' | 'pasivo'): Promise<Cuenta[]> {
    return this.repository.findAll(activa, tipo_cuenta);
  }

  /**
   * Obtiene una cuenta por ID
   */
  async getById(id: number): Promise<Cuenta | null> {
    if (!id || id <= 0) {
      throw new Error('ID de cuenta inválido');
    }
    return this.repository.findById(id);
  }

  /**
   * Crea una nueva cuenta
   */
  async create(data: CrearCuenta): Promise<Cuenta> {
    // Validaciones
    if (!data.nombre || data.nombre.trim().length === 0) {
      throw new Error('El nombre de la cuenta es requerido');
    }

    if (data.nombre.length > 50) {
      throw new Error('El nombre de la cuenta no puede exceder 50 caracteres');
    }

    if (!data.tipo_cuenta || !['activo', 'pasivo'].includes(data.tipo_cuenta)) {
      throw new Error('El tipo de cuenta debe ser "activo" o "pasivo"');
    }

    if (data.saldo !== undefined && (isNaN(data.saldo) || data.saldo < 0)) {
      throw new Error('El saldo debe ser un número mayor o igual a 0');
    }

    return this.repository.create(data);
  }

  /**
   * Actualiza una cuenta existente
   */
  async update(id: number, data: ActualizarCuenta): Promise<Cuenta> {
    if (!id || id <= 0) {
      throw new Error('ID de cuenta inválido');
    }

    // Verificar que la cuenta existe
    const cuentaExistente = await this.repository.findById(id);
    if (!cuentaExistente) {
      throw new Error('Cuenta no encontrada');
    }

    // Validaciones
    if (data.nombre !== undefined) {
      if (data.nombre.trim().length === 0) {
        throw new Error('El nombre de la cuenta no puede estar vacío');
      }
      if (data.nombre.length > 50) {
        throw new Error('El nombre de la cuenta no puede exceder 50 caracteres');
      }
    }

    if (data.tipo_cuenta !== undefined && !['activo', 'pasivo'].includes(data.tipo_cuenta)) {
      throw new Error('El tipo de cuenta debe ser "activo" o "pasivo"');
    }

    if (data.saldo !== undefined && (isNaN(data.saldo) || data.saldo < 0)) {
      throw new Error('El saldo debe ser un número mayor o igual a 0');
    }

    const cuentaActualizada = await this.repository.update(id, data);
    if (!cuentaActualizada) {
      throw new Error('Error al actualizar la cuenta');
    }

    return cuentaActualizada;
  }

  /**
   * Desactiva una cuenta (no la elimina)
   */
  async desactivar(id: number): Promise<Cuenta> {
    if (!id || id <= 0) {
      throw new Error('ID de cuenta inválido');
    }

    const cuenta = await this.repository.desactivar(id);
    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    return cuenta;
  }

  /**
   * Reactiva una cuenta
   */
  async activar(id: number): Promise<Cuenta> {
    if (!id || id <= 0) {
      throw new Error('ID de cuenta inválido');
    }

    const cuenta = await this.repository.activar(id);
    if (!cuenta) {
      throw new Error('Cuenta no encontrada');
    }

    return cuenta;
  }
}
