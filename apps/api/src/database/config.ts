// Configuración de la base de datos
// Usa DB_MODE para elegir entre 'local' o 'remote'
// También soporta DATABASE_URL para compatibilidad

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  mode: 'local' | 'remote' | 'url';
}

type DatabaseMode = 'local' | 'remote';

/**
 * Valida que DB_MODE sea un valor válido
 */
function validateDatabaseMode(mode: string): DatabaseMode {
  const normalized = mode.toLowerCase();
  if (normalized === 'local' || normalized === 'remote') {
    return normalized as DatabaseMode;
  }
  console.warn(`⚠️  DB_MODE="${mode}" no es válido. Usando 'local' por defecto.`);
  return 'local';
}

/**
 * Obtiene la configuración de la base de datos
 * Prioridad: DATABASE_URL > DB_MODE > variables genéricas
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Prioridad 1: DATABASE_URL (para compatibilidad con servicios como Render)
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      const config: DatabaseConfig = {
        host: url.hostname,
        port: parseInt(url.port || '5432', 10),
        database: url.pathname.slice(1), // Remover el slash inicial
        user: url.username,
        password: url.password,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : false,
        mode: 'url',
      };
      console.log('📡 Usando DATABASE_URL para conexión');
      return config;
    } catch (error) {
      console.error('❌ Error al parsear DATABASE_URL:', error);
      throw new Error('DATABASE_URL inválida');
    }
  }

  // Prioridad 2: DB_MODE (local o remote)
  const dbMode = validateDatabaseMode(process.env.DB_MODE || 'local');
  
  if (dbMode === 'remote') {
    const config: DatabaseConfig = {
      host: process.env.DB_HOST_REMOTE || process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT_REMOTE || process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME_REMOTE || process.env.DB_NAME || 'financehub_db_2m89',
      user: process.env.DB_USER_REMOTE || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD_REMOTE || process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL_REMOTE === 'true' || process.env.DB_SSL === 'true' 
        ? { rejectUnauthorized: false } 
        : false,
      mode: 'remote',
    };
    console.log('🌐 Modo REMOTO activado');
    return config;
  }

  // Modo local (por defecto)
  const config: DatabaseConfig = {
    host: process.env.DB_HOST_LOCAL || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT_LOCAL || process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME_LOCAL || process.env.DB_NAME || 'finance_hub',
    user: process.env.DB_USER_LOCAL || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD_LOCAL || process.env.DB_PASSWORD || '',
    ssl: false,
    mode: 'local',
  };
  console.log('💻 Modo LOCAL activado');
  return config;
}

