# Variables de Entorno - Backend API

Este backend se conecta a PostgreSQL usando `pg` (connection pool). La configuración se toma desde el archivo `.env` en `apps/api/`.

## Configuración Mínima

### Opción Recomendada: `DATABASE_URL`

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
PORT=3001
NODE_ENV=development
```

### Opción Alternativa: `DB_MODE`

```env
DB_MODE=local
PORT=3001
NODE_ENV=development
```

## Ejemplos Completos por Tipo de Ejecución

### Desarrollo Local

Crea un archivo `.env` en `apps/api/` con:

```env
# Opción 1: DATABASE_URL (recomendado)
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/finance_hub

# Opción 2: DB_MODE local
DB_MODE=local
DB_HOST_LOCAL=localhost
DB_PORT_LOCAL=5432
DB_NAME_LOCAL=finance_hub
DB_USER_LOCAL=postgres
DB_PASSWORD_LOCAL=tu_password

# Servidor
PORT=3001
NODE_ENV=development
```

### Producción / Remote (ej: Render, Railway)

```env
# Opción 1: DATABASE_URL (recomendado)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME

# Opción 2: DB_MODE remote
DB_MODE=remote
DB_HOST_REMOTE=tu_host_remoto
DB_PORT_REMOTE=5432
DB_NAME_REMOTE=tu_base_de_datos
DB_USER_REMOTE=tu_usuario
DB_PASSWORD_REMOTE=tu_password
DB_SSL_REMOTE=true

# Servidor
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-dominio.com
```

## Prioridad de Configuración

El sistema evalúa las variables en el siguiente orden:

1. **`DATABASE_URL`** - Si está presente, se usa directamente
2. **`DB_MODE`** + variables específicas (`DB_HOST_LOCAL`, `DB_HOST_REMOTE`, etc.)
3. Variables genéricas (`DB_HOST`, `DB_PORT`, etc.) - Fallback

## Variables Disponibles

### Base de Datos

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `DATABASE_URL` | URL completa de conexión PostgreSQL | Opcional (prioridad 1) |
| `DB_MODE` | Modo: `local` o `remote` | Opcional (si no hay DATABASE_URL) |
| `DB_HOST_LOCAL` | Host para modo local | Si `DB_MODE=local` |
| `DB_PORT_LOCAL` | Puerto para modo local | Si `DB_MODE=local` |
| `DB_NAME_LOCAL` | Nombre de BD local | Si `DB_MODE=local` |
| `DB_USER_LOCAL` | Usuario BD local | Si `DB_MODE=local` |
| `DB_PASSWORD_LOCAL` | Password BD local | Si `DB_MODE=local` |
| `DB_HOST_REMOTE` | Host para modo remote | Si `DB_MODE=remote` |
| `DB_PORT_REMOTE` | Puerto para modo remote | Si `DB_MODE=remote` |
| `DB_NAME_REMOTE` | Nombre de BD remote | Si `DB_MODE=remote` |
| `DB_USER_REMOTE` | Usuario BD remote | Si `DB_MODE=remote` |
| `DB_PASSWORD_REMOTE` | Password BD remote | Si `DB_MODE=remote` |
| `DB_SSL_REMOTE` | Habilitar SSL para remote (`true`/`false`) | Opcional |

### Servidor

| Variable | Descripción | Valor por Defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3001` |
| `HOST` | Host del servidor (undefined = localhost) | `localhost` |
| `NODE_ENV` | Entorno: `development` o `production` | `development` |
| `ALLOWED_ORIGINS` | Orígenes permitidos para CORS (producción) | - |
| `VERIFY_DB_ON_START` | Verificar conexión BD al inicio (`true`/`false`) | `true` |

## Verificar Conexión

### Health Check Endpoint

```bash
curl http://localhost:3001/health
```

### Scripts de Prueba

```bash
npm run test:db          # Prueba conexión según configuración actual
npm run test:db:local    # Prueba conexión local
npm run test:db:remote   # Prueba conexión remota
```

## Reglas Importantes

- **`.env` no se versiona** - Nunca incluyas el archivo `.env` en el repositorio
- **Solo placeholders** - En documentación y ejemplos, usa siempre placeholders, nunca credenciales reales
- **Seguridad** - En producción, usa variables de entorno del proveedor (Render, Railway, etc.) o un secret manager

## Crear el Archivo .env

1. Crea un archivo `.env` en `apps/api/`
2. Copia uno de los ejemplos de arriba según tu tipo de ejecución
3. Reemplaza los placeholders con tus valores reales
4. Asegúrate de que `.env` esté en `.gitignore`
