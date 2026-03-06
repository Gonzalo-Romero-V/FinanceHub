import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import os from 'os';
import { initializeDatabase, testConnection } from './database/connection';
import { getDatabaseConfig } from './database/config';
import apiRoutes from './routes';
import { swaggerSpec } from './config/swagger';

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST; // undefined por defecto = localhost

// Middleware
// CORS condicional: desarrollo permite cualquier origen, producción usa ALLOWED_ORIGINS
const corsOptions = process.env.NODE_ENV === 'production'
  ? {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
      credentials: true,
    }
  : {
      origin: true,
      credentials: true,
    };

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica el estado del servidor y la conexión a la base de datos
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Servidor y base de datos funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *       503:
 *         description: Error en la conexión a la base de datos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get('/health', async (req: Request, res: Response) => {
  const dbConnected = await testConnection();
  
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'error',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Swagger documentation endpoint
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Finance Hub API Documentation',
}));

// API Routes
app.use('/api', apiRoutes);

// Inicializar base de datos
const dbConfig = getDatabaseConfig();
initializeDatabase();

// Verificar conexión al inicio (opcional, puede comentarse si no quieres bloquear el inicio)
const verifyConnectionOnStart = process.env.VERIFY_DB_ON_START !== 'false';

if (verifyConnectionOnStart) {
  testConnection().then((connected) => {
    if (!connected) {
      console.warn('⚠️  Advertencia: No se pudo conectar a la base de datos al inicio');
      console.warn('   El servidor continuará ejecutándose, pero las operaciones de BD fallarán');
    }
  });
}

// Función para obtener IPs locales
function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  
  for (const name of Object.keys(interfaces)) {
    const networkInterface = interfaces[name];
    if (!networkInterface) continue;
    
    for (const iface of networkInterface) {
      // Solo IPv4, no loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

// Callback para cuando el servidor inicia
const onServerStart = () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  
  if (HOST) {
    console.log(`🌐 Host: ${HOST}`);
  } else {
    console.log(`🌐 Host: localhost (por defecto)`);
  }
  
  console.log(`📊 Modo de base de datos: ${dbConfig.mode.toUpperCase()}`);
  console.log(`🔌 Base de datos: ${dbConfig.database}`);
  console.log(`🌐 DB Host: ${dbConfig.host}:${dbConfig.port}`);
  console.log(`👤 Usuario: ${dbConfig.user}`);
  console.log(`🔒 SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
  console.log('='.repeat(50));
  
  // URLs de acceso
  console.log(`📚 Documentación API: http://localhost:${PORT}/docs`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  
  // Si está en modo LAN, mostrar IPs locales
  if (HOST === '0.0.0.0') {
    const localIPs = getLocalIPs();
    if (localIPs.length > 0) {
      console.log('\n🌐 Acceso desde red local:');
      localIPs.forEach((ip) => {
        console.log(`   📚 API Docs: http://${ip}:${PORT}/docs`);
        console.log(`   ❤️  Health: http://${ip}:${PORT}/health`);
        console.log(`   🔌 API: http://${ip}:${PORT}/api`);
      });
    } else {
      console.log('\n⚠️  No se encontraron IPs de red local');
    }
  }
  
  console.log('='.repeat(50) + '\n');
};

// Inicio del servidor
const server = HOST 
  ? app.listen(PORT, HOST, onServerStart)
  : app.listen(PORT, onServerStart);

// Manejo graceful de cierre
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  const { closePool } = await import('./database/connection');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  const { closePool } = await import('./database/connection');
  await closePool();
  process.exit(0);
});

