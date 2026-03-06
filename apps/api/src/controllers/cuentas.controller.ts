import { Request, Response } from 'express';
import { CuentasService } from '../services/cuentas.service';
import { CrearCuenta, ActualizarCuenta, ApiResponse, ApiError } from '../types';

export class CuentasController {
  private service: CuentasService;

  constructor() {
    this.service = new CuentasService();
  }

  /**
   * GET /api/cuentas
   * Lista todas las cuentas, opcionalmente filtradas por estado activo y tipo de cuenta
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const activa = req.query.activa !== undefined 
        ? req.query.activa === 'true' 
        : undefined;

      const tipo_cuenta = req.query.tipo_cuenta as string | undefined;
      
      if (tipo_cuenta && tipo_cuenta !== 'activo' && tipo_cuenta !== 'pasivo') {
        const errorResponse: ApiError = {
          success: false,
          error: 'tipo_cuenta debe ser "activo" o "pasivo"',
        };
        res.status(400).json(errorResponse);
        return;
      }

      const cuentas = await this.service.getAll(activa, tipo_cuenta as 'activo' | 'pasivo' | undefined);
      const response: ApiResponse<typeof cuentas> = {
        success: true,
        data: cuentas,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener las cuentas',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * GET /api/cuentas/:id
   * Obtiene una cuenta por ID
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

      const cuenta = await this.service.getById(id);
      
      if (!cuenta) {
        const errorResponse: ApiError = {
          success: false,
          error: 'Cuenta no encontrada',
        };
        res.status(404).json(errorResponse);
        return;
      }

      const response: ApiResponse<typeof cuenta> = {
        success: true,
        data: cuenta,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener la cuenta',
      };
      res.status(500).json(errorResponse);
    }
  };

  /**
   * POST /api/cuentas
   * Crea una nueva cuenta
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CrearCuenta = req.body;
      const cuenta = await this.service.create(data);
      const response: ApiResponse<typeof cuenta> = {
        success: true,
        data: cuenta,
      };
      res.status(201).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al crear la cuenta',
      };
      res.status(400).json(errorResponse);
    }
  };

  /**
   * PUT /api/cuentas/:id
   * Actualiza una cuenta completa
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

      const data: ActualizarCuenta = req.body;
      const cuenta = await this.service.update(id, data);
      
      const response: ApiResponse<typeof cuenta> = {
        success: true,
        data: cuenta,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrada') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al actualizar la cuenta',
      };
      res.status(statusCode).json(errorResponse);
    }
  };

  /**
   * PATCH /api/cuentas/:id/desactivar
   * Desactiva una cuenta (no la elimina)
   */
  desactivar = async (req: Request, res: Response): Promise<void> => {
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

      const cuenta = await this.service.desactivar(id);
      
      const response: ApiResponse<typeof cuenta> = {
        success: true,
        data: cuenta,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrada') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al desactivar la cuenta',
      };
      res.status(statusCode).json(errorResponse);
    }
  };

  /**
   * PATCH /api/cuentas/:id/activar
   * Reactiva una cuenta
   */
  activar = async (req: Request, res: Response): Promise<void> => {
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

      const cuenta = await this.service.activar(id);
      
      const response: ApiResponse<typeof cuenta> = {
        success: true,
        data: cuenta,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const statusCode = error.message.includes('no encontrada') ? 404 : 400;
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al activar la cuenta',
      };
      res.status(statusCode).json(errorResponse);
    }
  };
}
