import { Router } from 'express';
import { TotalesController } from '../controllers/totales.controller';

const router = Router();
const controller = new TotalesController();

router.get('/', controller.getAll);

export default router;
