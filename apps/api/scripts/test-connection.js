/**
 * Script para probar la conexión a la base de datos
 * Uso: node scripts/test-connection.js [local|remote]
 */

require('dotenv/config');
const { Pool } = require('pg');

const mode = process.argv[2] || process.env.DB_MODE || 'local';

console.log(`\n🧪 Probando conexión en modo: ${mode.toUpperCase()}\n`);

let config;

// Simular la lógica de getDatabaseConfig
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  config = {
    host: url.hostname,
    port: parseInt(url.port || '5432', 10),
    database: url.pathname.slice(1),
    user: url.username,
    password: url.password,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };
  console.log('📡 Usando DATABASE_URL');
} else if (mode === 'remote') {
  config = {
    host: process.env.DB_HOST_REMOTE || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT_REMOTE || process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME_REMOTE || process.env.DB_NAME || 'financehub_db_2m89',
    user: process.env.DB_USER_REMOTE || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD_REMOTE || process.env.DB_PASSWORD || '',
    ssl: process.env.DB_SSL_REMOTE === 'true' || process.env.DB_SSL === 'true' 
      ? { rejectUnauthorized: false } 
      : false,
  };
  console.log('🌐 Usando configuración REMOTA');
} else {
  config = {
    host: process.env.DB_HOST_LOCAL || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT_LOCAL || process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME_LOCAL || process.env.DB_NAME || 'finance_hub',
    user: process.env.DB_USER_LOCAL || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD_LOCAL || process.env.DB_PASSWORD || '',
    ssl: false,
  };
  console.log('💻 Usando configuración LOCAL');
}

console.log(`   Host: ${config.host}:${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   SSL: ${config.ssl ? 'Habilitado' : 'Deshabilitado'}\n`);

const pool = new Pool(config);

pool.connect()
  .then(async (client) => {
    try {
      console.log('✅ Conexión establecida exitosamente!\n');
      
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('📊 Información de la base de datos:');
      console.log(`   Hora del servidor: ${result.rows[0].current_time}`);
      console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(',')[0]}\n`);
      
      // Probar si las tablas existen
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      if (tablesResult.rows.length > 0) {
        console.log('📋 Tablas encontradas:');
        tablesResult.rows.forEach(row => {
          console.log(`   - ${row.table_name}`);
        });
      } else {
        console.log('⚠️  No se encontraron tablas en la base de datos');
        console.log('   Ejecuta FinanceHub.sql para crear el esquema\n');
      }
      
      client.release();
      await pool.end();
      console.log('\n✅ Prueba completada exitosamente\n');
      process.exit(0);
    } catch (error) {
      client.release();
      throw error;
    }
  })
  .catch((error) => {
    console.error('\n❌ Error al conectar:');
    console.error(`   Código: ${error.code || 'N/A'}`);
    console.error(`   Mensaje: ${error.message}`);
    if (error.host) {
      console.error(`   Host: ${error.host}:${error.port}`);
    }
    console.error('\n💡 Verifica:');
    console.error('   1. Que la base de datos esté ejecutándose');
    console.error('   2. Que las credenciales en .env sean correctas');
    console.error('   3. Que el esquema SQL haya sido ejecutado\n');
    process.exit(1);
  });
