import { ConceptosRepository } from '../repositories/conceptos.repository';
import { TiposMovimientoRepository } from '../repositories/tipos-movimiento.repository';
import { Concepto, ConceptoConTipo, CrearConcepto, ActualizarConcepto } from '../types';

export class ConceptosService {
  private repository: ConceptosRepository;
  private tiposMovimientoRepository: TiposMovimientoRepository;

  constructor() {
    this.repository = new ConceptosRepository();
    this.tiposMovimientoRepository = new TiposMovimientoRepository();
  }

  /**
   * Obtiene todos los conceptos, opcionalmente filtrados por tipo de movimiento
   * Incluye la relación con TipoMovimiento
   */
  async getAll(tipo_movimiento_id?: number): Promise<ConceptoConTipo[]> {
    return this.repository.findAll(tipo_movimiento_id);
  }

  /**
   * Obtiene un concepto por ID
   * Incluye la relación con TipoMovimiento
   */
  async getById(id: number): Promise<ConceptoConTipo | null> {
    if (!id || id <= 0) {
      throw new Error('ID de concepto inválido');
    }
    return this.repository.findById(id);
  }

  /**
   * Crea un nuevo concepto
   */
  async create(data: CrearConcepto): Promise<Concepto> {
    // Validaciones
    if (!data.nombre || data.nombre.trim().length === 0) {
      throw new Error('El nombre del concepto es requerido');
    }

    if (data.nombre.length > 50) {
      throw new Error('El nombre del concepto no puede exceder 50 caracteres');
    }

    if (!data.tipo_movimiento_id || data.tipo_movimiento_id <= 0) {
      throw new Error('El tipo de movimiento es requerido');
    }

    // Validar que el tipo de movimiento existe
    const tipoMovimiento = await this.tiposMovimientoRepository.findById(data.tipo_movimiento_id);
    if (!tipoMovimiento) {
      throw new Error('Tipo de movimiento no encontrado');
    }

    // Validar unicidad (nombre + tipo_movimiento_id)
    const existente = await this.repository.findByNombreYTipo(
      data.nombre.trim(),
      data.tipo_movimiento_id
    );
    if (existente) {
      throw new Error(
        'Ya existe un concepto con ese nombre para el tipo de movimiento seleccionado'
      );
    }

    return this.repository.create({
      nombre: data.nombre.trim(),
      tipo_movimiento_id: data.tipo_movimiento_id,
    });
  }

  /**
   * Actualiza un concepto existente
   * Incluye la relación con TipoMovimiento
   */
  async update(id: number, data: ActualizarConcepto): Promise<ConceptoConTipo> {
    if (!id || id <= 0) {
      throw new Error('ID de concepto inválido');
    }

    // Verificar que el concepto existe
    const conceptoExistente = await this.repository.findById(id);
    if (!conceptoExistente) {
      throw new Error('Concepto no encontrado');
    }

    // Validaciones
    if (data.nombre !== undefined) {
      if (data.nombre.trim().length === 0) {
        throw new Error('El nombre del concepto no puede estar vacío');
      }
      if (data.nombre.length > 50) {
        throw new Error('El nombre del concepto no puede exceder 50 caracteres');
      }
    }

    const tipoMovimientoId = data.tipo_movimiento_id ?? conceptoExistente.tipo_movimiento_id;

    // Si se cambia el tipo de movimiento, validar que existe
    if (data.tipo_movimiento_id !== undefined) {
      if (data.tipo_movimiento_id <= 0) {
        throw new Error('El tipo de movimiento es inválido');
      }

      const tipoMovimiento = await this.tiposMovimientoRepository.findById(data.tipo_movimiento_id);
      if (!tipoMovimiento) {
        throw new Error('Tipo de movimiento no encontrado');
      }
    }

    // Validar unicidad si se cambia nombre o tipo
    if (data.nombre !== undefined || data.tipo_movimiento_id !== undefined) {
      const nombre = (data.nombre ?? conceptoExistente.nombre).trim();
      const existente = await this.repository.findByNombreYTipo(nombre, tipoMovimientoId);
      if (existente && existente.id !== id) {
        throw new Error(
          'Ya existe otro concepto con ese nombre para el tipo de movimiento seleccionado'
        );
      }
    }

    const conceptoActualizado = await this.repository.update(id, {
      ...data,
      nombre: data.nombre?.trim(),
    });
    if (!conceptoActualizado) {
      throw new Error('Error al actualizar el concepto');
    }

    return conceptoActualizado;
  }

  /**
   * Elimina un concepto
   * IMPORTANTE: No elimina movimientos asociados (sin cascada)
   */
  async delete(id: number): Promise<void> {
    if (!id || id <= 0) {
      throw new Error('ID de concepto inválido');
    }

    // Verificar que existe
    const conceptoExistente = await this.repository.findById(id);
    if (!conceptoExistente) {
      throw new Error('Concepto no encontrado');
    }

    const eliminado = await this.repository.delete(id);
    if (!eliminado) {
      throw new Error('Error al eliminar el concepto');
    }
  }
}
