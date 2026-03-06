import { Router } from 'express';
import { ConceptosController } from '../controllers/conceptos.controller';

const router = Router();
const controller = new ConceptosController();

/**
 * @swagger
 * /api/conceptos:
 *   get:
 *     summary: Lista todos los conceptos
 *     tags: [Conceptos]
 *     responses:
 *       200:
 *         description: Lista de conceptos obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Concepto'
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/conceptos/{id}:
 *   get:
 *     summary: Obtiene un concepto por su ID
 *     tags: [Conceptos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del concepto
 *     responses:
 *       200:
 *         description: Concepto obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Concepto'
 *       404:
 *         description: Concepto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/conceptos:
 *   post:
 *     summary: Crea un nuevo concepto
 *     tags: [Conceptos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearConcepto'
 *     responses:
 *       201:
 *         description: Concepto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Concepto'
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
 * /api/conceptos/{id}:
 *   put:
 *     summary: Actualiza un concepto existente
 *     tags: [Conceptos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del concepto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarConcepto'
 *     responses:
 *       200:
 *         description: Concepto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Concepto'
 *       404:
 *         description: Concepto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/conceptos/{id}:
 *   delete:
 *     summary: Elimina un concepto
 *     tags: [Conceptos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del concepto
 *     responses:
 *       200:
 *         description: Concepto eliminado exitosamente
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
 *                       example: Concepto eliminado correctamente
 *       404:
 *         description: Concepto no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', controller.delete);

export default router;
