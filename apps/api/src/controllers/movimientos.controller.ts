import { Request, Response } from 'express';
import { MovimientosService } from '../services/movimientos.service';
import { CrearMovimiento, ActualizarMovimiento, MovimientoFilters, ApiResponse, ApiError } from '../types';

export class MovimientosController {
  private service: MovimientosService;

  constructor() {
    this.service = new MovimientosService();
  }

  /**
   * GET /api/movimientos
   * Lista todos los movimientos con filtros opcionales
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const filters: MovimientoFilters = {};

      if (req.query.cuenta_origen_id) {
        const id = parseInt(req.query.cuenta_origen_id as string, 10);
        if (isNaN(id)) {
          const errorResponse: ApiError = {
            success: false,
            error: 'cuenta_origen_id debe ser un número válido',
          };
          res.status(400).json(errorResponse);
          return;
        }
        filters.cuenta_origen_id = id;
      }

      if (req.query.cuenta_destino_id) {
        const id = parseInt(req.query.cuenta_destino_id as string, 10);
        if (isNaN(id)) {
          const errorResponse: ApiError = {
            success: false,
            error: 'cuenta_destino_id debe ser un número válido',
          };
          res.status(400).json(errorResponse);
          return;
        }
        filters.cuenta_destino_id = id;
      }

      if (req.query.concepto_id) {
        const id = parseInt(req.query.concepto_id as string, 10);
        if (isNaN(id)) {
          const errorResponse: ApiError = {
            success: false,
            error: 'concepto_id debe ser un número válido',
          };
          res.status(400).json(errorResponse);
          return;
        }
        filters.concepto_id = id;
      }

      if (req.query.fecha_desde) {
        const fecha = req.query.fecha_desde as string;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          const errorResponse: ApiError = {
            success: false,
            error: 'fecha_desde debe tener el formato YYYY-MM-DD',
          };
          res.status(400).json(errorResponse);
          return;
        }
        filters.fecha_desde = fecha;
      }

      if (req.query.fecha_hasta) {
        const fecha = req.query.fecha_hasta as string;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          const errorResponse: ApiError = {
            success: false,
            error: 'fecha_hasta debe tener el formato YYYY-MM-DD',
          };
          res.status(400).json(errorResponse);
          return;
        }
        filters.fecha_hasta = fecha;
      }

      // Limpiar el objeto filters removiendo propiedades undefined
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined)
      );

      const movimientos = await this.service.getAll(Object.keys(cleanFilters).length > 0 ? cleanFilters : undefined);
      const response: ApiResponse<typeof movimientos> = {
        success: true,
        data: movimientos,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener los movimientos',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * GET /api/movimientos/:id
   * Obtiene un movimiento por ID
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        const errorResponse: ApiError = {
          success: false,
          error: 'ID inválido',
        };
        res.status(400).json(errorResponse);
        return;
      }

      const movimiento = await this.service.getById(id);
      
      if (!movimiento) {
        const errorResponse: ApiError = {
          success: false,
          error: 'Movimiento no encontrado',
        };
        res.status(404).json(errorResponse);
        return;
      }

      const response: ApiResponse<typeof movimiento> = {
        success: true,
        data: movimiento,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener el movimiento',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * POST /api/movimientos
   * Crea un nuevo movimiento
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CrearMovimiento = req.body;
      const movimiento = await this.service.create(data);
      const response: ApiResponse<typeof movimiento> = {
        success: true,
        data: movimiento,
      };
      res.status(201).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al crear el movimiento',
      };
      res.status(400).json(errorResponse);
    }
  };

  /**
   * PUT /api/movimientos/:id
   * Actualiza un movimiento
   */
  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        const errorResponse: ApiError = {
          success: false,
          error: 'ID inválido',
        };
        res.status(400).json(errorResponse);
        return;
      }

      const data: ActualizarMovimiento = req.body;
      const movimiento = await this.service.update(id, data);
      
      const response: ApiResponse<typeof movimiento> = {
        success: true,
        data: movimiento,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al actualizar el movimiento',
      };
      res.status(statusCode).json(errorResponse);
    }
  };

  /**
   * DELETE /api/movimientos/:id
   * Elimina un movimiento
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (isNaN(id)) {
        const errorResponse: ApiError = {
          success: false,
          error: 'ID inválido',
        };
        res.status(400).json(errorResponse);
        return;
      }

      await this.service.delete(id);
      
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'Movimiento eliminado correctamente' },
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al eliminar el movimiento',
      };
      res.status(statusCode).json(errorResponse);
    }
  };
}
