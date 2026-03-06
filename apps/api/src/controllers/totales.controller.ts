import { Request, Response } from 'express';
import { TotalesService } from '../services/totales.service';
import { ApiResponse, ApiError } from '../types';

export class TotalesController {
  private service: TotalesService;

  constructor() {
    this.service = new TotalesService();
  }

  /**
   * GET /api/totales
   * Obtiene los totales financieros (activos, pasivos y patrimonio)
   */
  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const totales = await this.service.getTotalesFinancieros();
      const response: ApiResponse<typeof totales> = {
        success: true,
        data: totales,
      };
      res.status(200).json(response);
    } catch (error: any) {
      const errorResponse: ApiError = {
        success: false,
        error: error.message || 'Error al obtener los totales financieros',
      };
      res.status(500).json(errorResponse);
    }
  };
}
