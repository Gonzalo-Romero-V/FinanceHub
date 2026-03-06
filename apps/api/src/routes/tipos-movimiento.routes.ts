import { Router } from 'express';
import { TiposMovimientoController } from '../controllers/tipos-movimiento.controller';

const router = Router();
const controller = new TiposMovimientoController();

/**
 * @swagger
 * /api/tipos-movimiento:
 *   get:
 *     summary: Lista todos los tipos de movimiento
 *     tags: [Tipos de Movimiento]
 *     responses:
 *       200:
 *         description: Lista de tipos de movimiento obtenida exitosamente
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
 *                     $ref: '#/components/schemas/TipoMovimiento'
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/tipos-movimiento/{id}:
 *   get:
 *     summary: Obtiene un tipo de movimiento por su ID
 *     tags: [Tipos de Movimiento]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de movimiento
 *     responses:
 *       200:
 *         description: Tipo de movimiento obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TipoMovimiento'
 *       404:
 *         description: Tipo de movimiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/tipos-movimiento:
 *   post:
 *     summary: Crea un nuevo tipo de movimiento
 *     tags: [Tipos de Movimiento]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearTipoMovimiento'
 *     responses:
 *       201:
 *         description: Tipo de movimiento creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TipoMovimiento'
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
 * /api/tipos-movimiento/{id}:
 *   put:
 *     summary: Actualiza un tipo de movimiento existente
 *     tags: [Tipos de Movimiento]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de movimiento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarTipoMovimiento'
 *     responses:
 *       200:
 *         description: Tipo de movimiento actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TipoMovimiento'
 *       404:
 *         description: Tipo de movimiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/tipos-movimiento/{id}:
 *   delete:
 *     summary: Elimina un tipo de movimiento
 *     tags: [Tipos de Movimiento]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tipo de movimiento
 *     responses:
 *       200:
 *         description: Tipo de movimiento eliminado exitosamente
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
 *                       example: Tipo de movimiento eliminado correctamente
 *       404:
 *         description: Tipo de movimiento no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', controller.delete);

export default router;
