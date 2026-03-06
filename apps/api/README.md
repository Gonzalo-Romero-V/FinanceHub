# Finance Hub API

Backend REST API para Finance Hub construido con Express, TypeScript y PostgreSQL.

## Descripción

API REST que proporciona endpoints para gestionar cuentas financieras, movimientos, conceptos y totales. Utiliza arquitectura en capas (Controller → Service → Repository → Database) sin ORM, accediendo directamente a PostgreSQL mediante connection pool.

## Tecnologías

- **Express.js** - Framework web para Node.js
- **TypeScript** - Lenguaje de programación tipado
- **PostgreSQL** - Base de datos relacional
- **pg** - Cliente PostgreSQL con connection pool
- **Swagger** - Documentación interactiva de API
- **CORS** - Soporte para Cross-Origin Resource Sharing
- **dotenv** - Gestión de variables de entorno

## Arquitectura

El backend sigue una arquitectura en capas:

```
Controller → Service → Repository → Database
```

- **Controllers** (`src/controllers/`): Manejan las peticiones HTTP y respuestas
- **Services** (`src/services/`): Lógica de negocio y orquestación
- **Repositories** (`src/repositories/`): Acceso a datos y queries SQL
- **Database** (`src/database/`): Configuración y conexión a PostgreSQL

### Endpoints Disponibles

- `/api/cuentas` - Gestión de cuentas
- `/api/movimientos` - Gestión de movimientos financieros
- `/api/conceptos` - Gestión de conceptos
- `/api/tipos-movimiento` - Tipos de movimiento (solo lectura)
- `/api/totales` - Cálculo de totales financieros

## Documentación API

La documentación interactiva está disponible en Swagger UI:

- **Swagger UI**: http://localhost:3001/docs

## Inicio Rápido

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en `apps/api/` con la configuración de base de datos.

Ver [README.env.md](README.env.md) para detalles completos de configuración.

**Configuración mínima:**

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
# O alternativamente:
DB_MODE=local
```

### 3. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

El servidor se iniciará en http://localhost:3001

## Comandos Disponibles

```bash
npm run dev          # Desarrollo con hot-reload (nodemon + ts-node)
npm run dev:lan      # Desarrollo accesible desde red local (HOST=0.0.0.0)
npm run build        # Compilar TypeScript a JavaScript
npm start            # Ejecutar versión compilada (dist/)
npm run lint         # Ejecutar ESLint
npm run test:db      # Probar conexión a base de datos
npm run test:db:local    # Probar conexión local
npm run test:db:remote   # Probar conexión remota
```

## URLs Útiles

- **API Base**: `http://localhost:3001/api`
- **Swagger UI**: `http://localhost:3001/docs`
- **Health Check**: `http://localhost:3001/health`

## Estructura de Carpetas

```
apps/api/
├── src/
│   ├── controllers/     # Controladores HTTP
│   ├── services/        # Lógica de negocio
│   ├── repositories/    # Acceso a datos
│   ├── routes/          # Definición de rutas
│   ├── database/        # Configuración de BD
│   ├── types/           # Tipos TypeScript
│   ├── utils/           # Utilidades
│   └── config/          # Configuración (Swagger)
├── scripts/             # Scripts auxiliares
└── README.env.md        # Configuración de variables de entorno
```

## Configuración

### Variables de Entorno

Todas las variables de entorno se configuran en `.env` (no versionado).

**Prioridad de configuración:**
1. `DATABASE_URL` (recomendado para producción)
2. `DB_MODE` + variables específicas (`DB_HOST_LOCAL`, `DB_HOST_REMOTE`, etc.)
3. Variables genéricas (`DB_HOST`, `DB_PORT`, etc.)

Ver [README.env.md](README.env.md) para ejemplos completos según tipo de ejecución.

### Puerto y Host

- **Puerto por defecto**: `3001` (configurable con `PORT`)
- **Host por defecto**: `localhost` (configurable con `HOST`)

## Convenciones

- **Idioma**: Todas las entidades y campos de base de datos están en español
- **Tipos**: Las interfaces TypeScript en `src/types/index.ts` reflejan el esquema de BD
- **Esquema SQL**: `FinanceHub.sql` en la raíz del repo es la fuente de verdad
- **Sin ORM**: Acceso directo a PostgreSQL mediante queries SQL
- **Connection Pool**: Patrón singleton para reutilizar conexiones

## Notas Importantes

- El archivo `.env` **no se versiona** - nunca incluyas credenciales reales
- Los ejemplos en documentación usan solo placeholders
- El esquema SQL está en `FinanceHub.sql` (raíz del repo)
- Los tipos TypeScript deben coincidir exactamente con el esquema de BD
