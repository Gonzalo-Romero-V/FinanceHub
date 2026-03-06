import { TotalesRepository, TotalesFinancieros } from '../repositories/totales.repository';

export class TotalesService {
  private repository: TotalesRepository;

  constructor() {
    this.repository = new TotalesRepository();
  }

  /**
   * Obtiene los totales financieros (activos, pasivos y patrimonio)
   */
  async getTotalesFinancieros(): Promise<TotalesFinancieros> {
    return this.repository.getTotalesFinancieros();
  }
}
