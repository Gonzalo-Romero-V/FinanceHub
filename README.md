# Finance Hub

Sistema de gestión financiera personal para el control de cuentas, movimientos y conceptos financieros.

## Descripción

Finance Hub es una aplicación web full-stack diseñada para gestionar finanzas personales. Permite registrar cuentas (activos y pasivos), crear movimientos financieros (ingresos, egresos y transferencias), y organizar conceptos por tipo de movimiento.

## Intención y Propósito

El proyecto tiene como objetivo proporcionar una herramienta simple pero completa para:
- Gestionar múltiples cuentas financieras (activos y pasivos)
- Registrar movimientos financieros con conceptos categorizados
- Realizar transferencias entre cuentas
- Visualizar totales financieros y balances

## Organización del Proyecto

Este es un monorepo que contiene:

- **`apps/api/`** - Backend REST API (Express + TypeScript + PostgreSQL)
- **`apps/web/`** - Frontend web (Next.js + React + TypeScript)
- **`docs/`** - Documentación del proyecto
- **`FinanceHub.sql`** - Esquema de base de datos (PostgreSQL)

## Requisitos Previos

- **Node.js** (v20 o superior)
- **PostgreSQL** (v12 o superior)
- **npm** o gestor de paquetes compatible

## Estructura de Directorios

```
finance-hub/
├── apps/
│   ├── api/          # Backend REST API
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   └── database/
│   │   └── README.md
│   └── web/          # Frontend Next.js
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── README.md
├── docs/
│   └── DATABASE.md   # Documentación de base de datos
├── FinanceHub.sql    # Esquema SQL
└── README.md         # Este archivo
```

## Inicio Rápido

### 1. Configurar Base de Datos

Crear la base de datos PostgreSQL y ejecutar el esquema:

```bash
psql -U postgres -d finance_hub -f FinanceHub.sql
```

### 2. Configurar Backend

```bash
cd apps/api
npm install
# Configurar variables de entorno (ver apps/api/README.env.md)
npm run dev
```

El backend estará disponible en `http://localhost:3001`

### 3. Configurar Frontend

```bash
cd apps/web
npm install
npm run dev
```

El frontend estará disponible en `http://localhost:3000`

## Documentación

- **[Backend API](apps/api/README.md)** - Documentación completa del backend
- **[Frontend Web](apps/web/README.md)** - Documentación del frontend
- **[Base de Datos](docs/DATABASE.md)** - Esquema y convenciones de base de datos
- **[Variables de Entorno](apps/api/README.env.md)** - Configuración de entorno

## Tecnologías Principales

- **Backend**: Express.js, TypeScript, PostgreSQL (pg), Swagger
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Base de Datos**: PostgreSQL

## Desarrollo

Cada aplicación tiene su propio `package.json` y puede ejecutarse independientemente. Consulta los README específicos para más detalles sobre cada componente.
