import { Router } from 'express';
import { MovimientosController } from '../controllers/movimientos.controller';

const router = Router();
const controller = new MovimientosController();

/**
 * @swagger
 * /api/movimientos:
 *   get:
 *     summary: Lista todos los movimientos con filtros opcionales
 *     tags: [Movimientos]
 *     parameters:
 *       - in: query
 *         name: cuenta_origen_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de cuenta origen
 *       - in: query
 *         name: cuenta_destino_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de cuenta destino
 *       - in: query
 *         name: concepto_id
 *         schema:
 *           type: integer
 *         description: Filtrar por ID de concepto
 *       - in: query
 *         name: fecha_desde
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filtrar movimientos desde esta fecha (formato YYYY-MM-DD)
 *       - in: query
 *         name: fecha_hasta
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *         description: Filtrar movimientos hasta esta fecha (formato YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de movimientos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Movimiento'
 *       400:
 *         description: Error de validación en los parámetros
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/movimientos/{id}:
 *   get:
 *     summary: Obtiene un movimiento por su ID
 *     tags: [Movimientos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del movimiento
 *     responses:
 *       200:
 *         description: Movimiento obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movimiento'
 *       404:
 *         description: Movimiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/movimientos:
 *   post:
 *     summary: Crea un nuevo movimiento
 *     tags: [Movimientos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearMovimiento'
 *     responses:
 *       201:
 *         description: Movimiento creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movimiento'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', controller.create);

/**
 * @swagger
 * /api/movimientos/{id}:
 *   put:
 *     summary: Actualiza un movimiento existente
 *     tags: [Movimientos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del movimiento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarMovimiento'
 *     responses:
 *       200:
 *         description: Movimiento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Movimiento'
 *       404:
 *         description: Movimiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/movimientos/{id}:
 *   delete:
 *     summary: Elimina un movimiento
 *     tags: [Movimientos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del movimiento
 *     responses:
 *       200:
 *         description: Movimiento eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Movimiento eliminado correctamente
 *       404:
 *         description: Movimiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', controller.delete);

export default router;
