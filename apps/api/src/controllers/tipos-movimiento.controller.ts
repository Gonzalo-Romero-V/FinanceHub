import { Request, Response } from 'express';
import { TiposMovimientoService } from '../services/tipos-movimiento.service';
import { ActualizarTipoMovimiento, ApiResponse, ApiError } from '../types';

export class TiposMovimientoController {
  private service: TiposMovimientoService;

  constructor() {
    this.service = new TiposMovimientoService();
  }

  /**
   * GET /api/tipos-movimiento
   * Lista todos los tipos de movimiento
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const tipos = await this.service.getAll();
      const response: ApiResponse<typeof tipos> = {
        success: true,
        data: tipos,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener los tipos de movimiento',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * GET /api/tipos-movimiento/:id
   * Obtiene un tipo de movimiento por ID
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

      const tipo = await this.service.getById(id);
      
      if (!tipo) {
        const errorResponse: ApiError = {
          success: false,
          error: 'Tipo de movimiento no encontrado',
        };
        res.status(404).json(errorResponse);
        return;
      }

      const response: ApiResponse<typeof tipo> = {
        success: true,
        data: tipo,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener el tipo de movimiento',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * POST /api/tipos-movimiento
   * Crea un nuevo tipo de movimiento
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const { nombre } = req.body;

      if (!nombre) {
        const errorResponse: ApiError = {
          success: false,
          error: 'El nombre es requerido',
        };
        res.status(400).json(errorResponse);
        return;
      }

      const tipo = await this.service.create({ nombre });
      const response: ApiResponse<typeof tipo> = {
        success: true,
        data: tipo,
      };
      res.status(201).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al crear el tipo de movimiento',
      };
      res.status(400).json(errorResponse);
    }
  };

  /**
   * PUT /api/tipos-movimiento/:id
   * Actualiza un tipo de movimiento
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

      const data: ActualizarTipoMovimiento = req.body;
      const tipo = await this.service.update(id, data);
      
      const response: ApiResponse<typeof tipo> = {
        success: true,
        data: tipo,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al actualizar el tipo de movimiento',
      };
      res.status(statusCode).json(errorResponse);
    }
  };

  /**
   * DELETE /api/tipos-movimiento/:id
   * Elimina un tipo de movimiento
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
        data: { message: 'Tipo de movimiento eliminado correctamente' },
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al eliminar el tipo de movimiento',
      };
      res.status(statusCode).json(errorResponse);
    }
  };
}
