import { Router } from 'express';
import { CuentasController } from '../controllers/cuentas.controller';

const router = Router();
const controller = new CuentasController();

/**
 * @swagger
 * /api/cuentas:
 *   get:
 *     summary: Lista todas las cuentas
 *     tags: [Cuentas]
 *     responses:
 *       200:
 *         description: Lista de cuentas obtenida exitosamente
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
 *                     $ref: '#/components/schemas/Cuenta'
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/cuentas/{id}:
 *   get:
 *     summary: Obtiene una cuenta por su ID
 *     tags: [Cuentas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cuenta
 *     responses:
 *       200:
 *         description: Cuenta obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cuenta'
 *       404:
 *         description: Cuenta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', controller.getById);

/**
 * @swagger
 * /api/cuentas:
 *   post:
 *     summary: Crea una nueva cuenta
 *     tags: [Cuentas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearCuenta'
 *     responses:
 *       201:
 *         description: Cuenta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cuenta'
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
 * /api/cuentas/{id}:
 *   put:
 *     summary: Actualiza una cuenta existente
 *     tags: [Cuentas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cuenta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarCuenta'
 *     responses:
 *       200:
 *         description: Cuenta actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cuenta'
 *       404:
 *         description: Cuenta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', controller.update);

/**
 * @swagger
 * /api/cuentas/{id}/desactivar:
 *   patch:
 *     summary: Desactiva una cuenta
 *     tags: [Cuentas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cuenta
 *     responses:
 *       200:
 *         description: Cuenta desactivada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cuenta'
 *       404:
 *         description: Cuenta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/desactivar', controller.desactivar);

/**
 * @swagger
 * /api/cuentas/{id}/activar:
 *   patch:
 *     summary: Reactiva una cuenta
 *     tags: [Cuentas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la cuenta
 *     responses:
 *       200:
 *         description: Cuenta reactivada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Cuenta'
 *       404:
 *         description: Cuenta no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/activar', controller.activar);

export default router;
