import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Finance Hub API',
    version: '1.0.0',
    description: 'API REST para gestión de finanzas personales',
    contact: {
      name: 'Finance Hub',
    },
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3001}`,
      description: 'Servidor de desarrollo',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Endpoints de salud y estado del sistema',
    },
    {
      name: 'Cuentas',
      description: 'Gestión de cuentas financieras',
    },
    {
      name: 'Tipos de Movimiento',
      description: 'Gestión de tipos de movimiento (ingreso, egreso, transferencia)',
    },
    {
      name: 'Conceptos',
      description: 'Gestión de conceptos de movimientos',
    },
    {
      name: 'Movimientos',
      description: 'Gestión de movimientos financieros',
    },
  ],
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Mensaje de error',
          },
        },
      },
      Cuenta: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          nombre: {
            type: 'string',
            example: 'Cuenta Corriente',
          },
          tipo_cuenta: {
            type: 'string',
            enum: ['activo', 'pasivo'],
            example: 'activo',
          },
          saldo: {
            type: 'number',
            format: 'double',
            example: 1500.50,
          },
          fecha_creacion: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00.000Z',
          },
          activa: {
            type: 'boolean',
            example: true,
          },
        },
      },
      CrearCuenta: {
        type: 'object',
        required: ['nombre', 'tipo_cuenta'],
        properties: {
          nombre: {
            type: 'string',
            example: 'Cuenta Corriente',
          },
          tipo_cuenta: {
            type: 'string',
            enum: ['activo', 'pasivo'],
            example: 'activo',
          },
          saldo: {
            type: 'number',
            format: 'double',
            example: 0,
          },
          activa: {
            type: 'boolean',
            example: true,
          },
        },
      },
      ActualizarCuenta: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            example: 'Cuenta Corriente',
          },
          tipo_cuenta: {
            type: 'string',
            enum: ['activo', 'pasivo'],
            example: 'activo',
          },
          saldo: {
            type: 'number',
            format: 'double',
            example: 1500.50,
          },
          activa: {
            type: 'boolean',
            example: true,
          },
        },
      },
      TipoMovimiento: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          nombre: {
            type: 'string',
            enum: ['ingreso', 'egreso', 'transferencia'],
            example: 'ingreso',
          },
        },
      },
      CrearTipoMovimiento: {
        type: 'object',
        required: ['nombre'],
        properties: {
          nombre: {
            type: 'string',
            enum: ['ingreso', 'egreso', 'transferencia'],
            example: 'ingreso',
          },
        },
      },
      ActualizarTipoMovimiento: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            enum: ['ingreso', 'egreso', 'transferencia'],
            example: 'ingreso',
          },
        },
      },
      Concepto: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          nombre: {
            type: 'string',
            example: 'Salario',
          },
          tipo_movimiento_id: {
            type: 'integer',
            example: 1,
          },
          tipo_movimiento: {
            $ref: '#/components/schemas/TipoMovimiento',
          },
        },
      },
      CrearConcepto: {
        type: 'object',
        required: ['nombre', 'tipo_movimiento_id'],
        properties: {
          nombre: {
            type: 'string',
            example: 'Salario',
          },
          tipo_movimiento_id: {
            type: 'integer',
            example: 1,
          },
        },
      },
      ActualizarConcepto: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            example: 'Salario',
          },
          tipo_movimiento_id: {
            type: 'integer',
            example: 1,
          },
        },
      },
      Movimiento: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          monto: {
            type: 'number',
            format: 'double',
            example: 1000.00,
          },
          cuenta_origen_id: {
            type: 'integer',
            nullable: true,
            example: 1,
          },
          cuenta_destino_id: {
            type: 'integer',
            nullable: true,
            example: 2,
          },
          concepto_id: {
            type: 'integer',
            example: 1,
          },
          nota: {
            type: 'string',
            nullable: true,
            example: 'Pago de servicios',
          },
          fecha: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00.000Z',
          },
          concepto: {
            $ref: '#/components/schemas/Concepto',
          },
          cuenta_origen: {
            $ref: '#/components/schemas/Cuenta',
            nullable: true,
          },
          cuenta_destino: {
            $ref: '#/components/schemas/Cuenta',
            nullable: true,
          },
        },
      },
      CrearMovimiento: {
        type: 'object',
        required: ['monto', 'concepto_id'],
        properties: {
          monto: {
            type: 'number',
            format: 'double',
            example: 1000.00,
          },
          cuenta_origen_id: {
            type: 'integer',
            nullable: true,
            example: 1,
          },
          cuenta_destino_id: {
            type: 'integer',
            nullable: true,
            example: 2,
          },
          concepto_id: {
            type: 'integer',
            example: 1,
          },
          nota: {
            type: 'string',
            nullable: true,
            example: 'Pago de servicios',
          },
        },
      },
      ActualizarMovimiento: {
        type: 'object',
        properties: {
          monto: {
            type: 'number',
            format: 'double',
            example: 1000.00,
          },
          cuenta_origen_id: {
            type: 'integer',
            nullable: true,
            example: 1,
          },
          cuenta_destino_id: {
            type: 'integer',
            nullable: true,
            example: 2,
          },
          concepto_id: {
            type: 'integer',
            example: 1,
          },
          nota: {
            type: 'string',
            nullable: true,
            example: 'Pago de servicios',
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'ok',
          },
          database: {
            type: 'string',
            example: 'connected',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-15T10:30:00.000Z',
          },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts', './src/index.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
