import { Pool } from 'pg';
import { getDatabaseConfig } from './config';

let pool: Pool | null = null;

/**
 * Inicializa el pool de conexiones a la base de datos
 * Implementa patrón singleton para reutilizar el pool
 */
export function initializeDatabase(): Pool {
  if (pool) {
    console.log('♻️  Reutilizando pool de conexiones existente');
    return pool;
  }

  const config = getDatabaseConfig();
  
  // Configurar timeouts según el modo
  const isRemote = config.mode === 'remote' || config.mode === 'url';
  const connectionTimeout = isRemote ? 10000 : 5000; // 10s para remoto, 5s para local
  
  console.log('🔧 Inicializando pool de conexiones...');
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   SSL: ${config.ssl ? 'Habilitado' : 'Deshabilitado'}`);
  console.log(`   Timeout: ${connectionTimeout}ms`);
  
  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl,
    max: 20, // Máximo de conexiones en el pool
    idleTimeoutMillis: 30000, // 30 segundos
    connectionTimeoutMillis: connectionTimeout,
    statement_timeout: 30000, // 30 segundos para queries
    query_timeout: 30000,
  });

  // Manejar errores del pool
  pool.on('error', (err) => {
    console.error('❌ Error inesperado en cliente inactivo del pool:', err);
    // No cerrar el pool aquí, solo loguear el error
  });

  // Eventos de depuración (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    pool.on('connect', () => {
      console.log('✅ Nueva conexión establecida al pool');
    });
    
    pool.on('acquire', () => {
      console.log('🔌 Cliente adquirido del pool');
    });
    
    pool.on('remove', () => {
      console.log('🗑️  Cliente removido del pool');
    });
  }

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    return initializeDatabase();
  }
  return pool;
}

/**
 * Prueba la conexión a la base de datos
 * @returns true si la conexión es exitosa, false en caso contrario
 */
export async function testConnection(): Promise<boolean> {
  try {
    const testPool = getPool();
    const startTime = Date.now();
    const client = await testPool.connect();
    
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      const connectionTime = Date.now() - startTime;
      
      console.log(`✅ Conexión exitosa (${connectionTime}ms)`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(',')[0]}`);
        console.log(`   Hora del servidor: ${result.rows[0].current_time}`);
      }
      
      return true;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('❌ Error al probar conexión a la base de datos:');
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    if (error.message) {
      console.error(`   Mensaje: ${error.message}`);
    }
    if (error.host) {
      console.error(`   Host: ${error.host}:${error.port}`);
    }
    return false;
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

