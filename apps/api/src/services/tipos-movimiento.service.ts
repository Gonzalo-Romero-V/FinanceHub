import { TiposMovimientoRepository } from '../repositories/tipos-movimiento.repository';
import { TipoMovimiento, ActualizarTipoMovimiento } from '../types';

const TIPOS_PERMITIDOS = ['ingreso', 'egreso', 'transferencia'] as const;

export class TiposMovimientoService {
  private repository: TiposMovimientoRepository;

  constructor() {
    this.repository = new TiposMovimientoRepository();
  }

  /**
   * Obtiene todos los tipos de movimiento
   */
  async getAll(): Promise<TipoMovimiento[]> {
    return this.repository.findAll();
  }

  /**
   * Obtiene un tipo de movimiento por ID
   */
  async getById(id: number): Promise<TipoMovimiento | null> {
    if (!id || id <= 0) {
      throw new Error('ID de tipo de movimiento inválido');
    }
    return this.repository.findById(id);
  }

  /**
   * Crea un nuevo tipo de movimiento
   */
  async create(data: { nombre: string }): Promise<TipoMovimiento> {
    // Validaciones
    if (!data.nombre || data.nombre.trim().length === 0) {
      throw new Error('El nombre del tipo de movimiento es requerido');
    }

    const nombreNormalizado = data.nombre.toLowerCase().trim();
    if (!TIPOS_PERMITIDOS.includes(nombreNormalizado as any)) {
      throw new Error(
        `El nombre debe ser uno de: ${TIPOS_PERMITIDOS.join(', ')}`
      );
    }

    // Verificar si ya existe
    const existente = await this.repository.findByNombre(nombreNormalizado);
    if (existente) {
      throw new Error('Ya existe un tipo de movimiento con ese nombre');
    }

    return this.repository.create({ nombre: nombreNormalizado });
  }

  /**
   * Actualiza un tipo de movimiento existente
   */
  async update(id: number, data: ActualizarTipoMovimiento): Promise<TipoMovimiento> {
    if (!id || id <= 0) {
      throw new Error('ID de tipo de movimiento inválido');
    }

    // Verificar que existe
    const tipoExistente = await this.repository.findById(id);
    if (!tipoExistente) {
      throw new Error('Tipo de movimiento no encontrado');
    }

    // Validaciones
    if (data.nombre !== undefined) {
      if (data.nombre.trim().length === 0) {
        throw new Error('El nombre del tipo de movimiento no puede estar vacío');
      }

      const nombreNormalizado = data.nombre.toLowerCase().trim();
      if (!TIPOS_PERMITIDOS.includes(nombreNormalizado as any)) {
        throw new Error(
          `El nombre debe ser uno de: ${TIPOS_PERMITIDOS.join(', ')}`
        );
      }

      // Verificar si ya existe otro con ese nombre
      const existente = await this.repository.findByNombre(nombreNormalizado);
      if (existente && existente.id !== id) {
        throw new Error('Ya existe otro tipo de movimiento con ese nombre');
      }

      data.nombre = nombreNormalizado as 'ingreso' | 'egreso' | 'transferencia';
    }

    const tipoActualizado = await this.repository.update(id, data);
    if (!tipoActualizado) {
      throw new Error('Error al actualizar el tipo de movimiento');
    }

    return tipoActualizado;
  }

  /**
   * Elimina un tipo de movimiento
   */
  async delete(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('ID de tipo de movimiento inválido');
    }

    // Verificar que existe
    const tipoExistente = await this.repository.findById(id);
    if (!tipoExistente) {
      throw new Error('Tipo de movimiento no encontrado');
    }

    const eliminado = await this.repository.delete(id);
    if (!eliminado) {
      throw new Error('Error al eliminar el tipo de movimiento');
    }
  }
}
