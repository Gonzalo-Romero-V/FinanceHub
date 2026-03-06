import { Router } from 'express';
import cuentasRoutes from './cuentas.routes';
import tiposMovimientoRoutes from './tipos-movimiento.routes';
import conceptosRoutes from './conceptos.routes';
import movimientosRoutes from './movimientos.routes';
import totalesRoutes from './totales.routes';

const router = Router();

// Registrar todas las rutas
router.use('/cuentas', cuentasRoutes);
router.use('/tipos-movimiento', tiposMovimientoRoutes);
router.use('/conceptos', conceptosRoutes);
router.use('/movimientos', movimientosRoutes);
router.use('/totales', totalesRoutes);

export default router;
