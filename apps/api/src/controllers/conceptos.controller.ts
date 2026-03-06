import { Request, Response } from 'express';
import { ConceptosService } from '../services/conceptos.service';
import { CrearConcepto, ActualizarConcepto, ApiResponse, ApiError } from '../types';

export class ConceptosController {
  private service: ConceptosService;

  constructor() {
    this.service = new ConceptosService();
  }

  /**
   * GET /api/conceptos
   * Lista todos los conceptos, opcionalmente filtrados por tipo de movimiento
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const tipo_movimiento_id = req.query.tipo_movimiento_id
        ? parseInt(req.query.tipo_movimiento_id as string, 10)
        : undefined;

      if (req.query.tipo_movimiento_id && isNaN(tipo_movimiento_id!)) {
        const errorResponse: ApiError = {
          success: false,
          error: 'tipo_movimiento_id debe ser un número válido',
        };
        res.status(400).json(errorResponse);
        return;
      }

      const conceptos = await this.service.getAll(tipo_movimiento_id);
      const response: ApiResponse<typeof conceptos> = {
        success: true,
        data: conceptos,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener los conceptos',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * GET /api/conceptos/:id
   * Obtiene un concepto por ID
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

      const concepto = await this.service.getById(id);
      
      if (!concepto) {
        const errorResponse: ApiError = {
          success: false,
          error: 'Concepto no encontrado',
        };
        res.status(404).json(errorResponse);
        return;
      }

      const response: ApiResponse<typeof concepto> = {
        success: true,
        data: concepto,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener el concepto',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * POST /api/conceptos
   * Crea un nuevo concepto
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CrearConcepto = req.body;
      const concepto = await this.service.create(data);
      const response: ApiResponse<typeof concepto> = {
        success: true,
        data: concepto,
      };
      res.status(201).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al crear el concepto',
      };
      res.status(400).json(errorResponse);
    }
  };

  /**
   * PUT /api/conceptos/:id
   * Actualiza un concepto
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

      const data: ActualizarConcepto = req.body;
      const concepto = await this.service.update(id, data);
      
      const response: ApiResponse<typeof concepto> = {
        success: true,
        data: concepto,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al actualizar el concepto',
      };
      res.status(statusCode).json(errorResponse);
    }
  };

  /**
   * DELETE /api/conceptos/:id
   * Elimina un concepto (no elimina movimientos asociados)
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
        data: { message: 'Concepto eliminado correctamente' },
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrado') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al eliminar el concepto',
      };
      res.status(statusCode).json(errorResponse);
    }
  };
}
