# Finance Hub Web

Frontend web para Finance Hub construido con Next.js, React y TypeScript.

## Descripción

Aplicación web moderna que proporciona una interfaz de usuario para gestionar finanzas personales. Permite visualizar y gestionar cuentas, crear movimientos financieros, y ver totales y balances en tiempo real.

## Tecnologías

- **Next.js 16** - Framework React con App Router
- **React 19** - Biblioteca de interfaz de usuario
- **TypeScript** - Lenguaje de programación tipado
- **Tailwind CSS 4** - Framework de estilos utility-first
- **PostCSS** - Procesador de CSS

## Estructura

El frontend utiliza el App Router de Next.js con la siguiente organización:

### Directorios Principales

- **`app/`** - Rutas y páginas (App Router)
  - `(dashboard)/` - Grupo de rutas del dashboard
    - `dashboard/` - Página principal
    - `cuentas/` - Gestión de cuentas
    - `conceptos/` - Gestión de conceptos
    - `nuevo-movimiento/` - Crear movimientos
    - `settings/` - Configuración
- **`components/`** - Componentes reutilizables
  - `conceptos/` - Componentes de conceptos
  - `cuentas/` - Componentes de cuentas
  - `movimientos/` - Componentes de movimientos
  - `layout/` - Componentes de layout
  - `navigation/` - Componentes de navegación
  - `theme/` - Componentes de tema (dark/light mode)
  - `ui/` - Componentes UI base
- **`lib/`** - Utilidades y helpers
  - `api/` - Cliente API y funciones de llamadas al backend
  - `hooks/` - Custom React hooks
  - `types/` - Tipos TypeScript
  - Utilidades varias

## Inicio Rápido

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno (Opcional)

En desarrollo, el frontend detecta automáticamente la URL del backend basándose en la URL actual del navegador. Para producción o configuración explícita, crea un archivo `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en http://localhost:3000

## Comandos Disponibles

```bash
npm run dev      # Servidor de desarrollo con hot-reload
npm run dev:lan      # Servidor de desarrollo con acceso lan
npm run build    # Compilar para producción
npm start        # Ejecutar versión compilada
npm run lint     # Ejecutar ESLint
```

## Configuración del API

El frontend se conecta automáticamente al backend:

- **Desarrollo**: Detecta automáticamente la IP/hostname del navegador
  - Si accedes desde `localhost`, usa `http://localhost:3001`
  - Si accedes desde una IP de red local, usa esa misma IP para el API
- **Producción**: Usa la variable de entorno `NEXT_PUBLIC_API_URL`

### Cliente API

El cliente API está en `lib/api/` y proporciona funciones para:
- `conceptos.ts` - Gestión de conceptos
- `cuentas.ts` - Gestión de cuentas
- `movimientos.ts` - Gestión de movimientos
- `tipos-movimiento.ts` - Tipos de movimiento
- `totales.ts` - Totales financieros

## Estructura de Carpetas

```
apps/web/
├── app/                    # Rutas y páginas (App Router)
│   └── (dashboard)/        # Grupo de rutas del dashboard
├── components/             # Componentes React
│   ├── conceptos/
│   ├── cuentas/
│   ├── movimientos/
│   ├── layout/
│   ├── navigation/
│   ├── theme/
│   └── ui/
├── lib/                    # Utilidades y helpers
│   ├── api/                # Cliente API
│   ├── hooks/              # Custom hooks
│   └── types/              # Tipos TypeScript
└── public/                 # Archivos estáticos
```

## Características

- **Tema claro/oscuro**: Soporte para modo claro y oscuro
- **Diseño responsivo**: Adaptado para móviles y desktop
- **Navegación jerárquica**: Sistema de navegación intuitivo
- **Actualización en tiempo real**: Los datos se actualizan automáticamente

## Desarrollo

### Requisitos

- Node.js v20 o superior
- Backend API ejecutándose en `http://localhost:3001` (o configurar `NEXT_PUBLIC_API_URL`)

### Hot Reload

Next.js proporciona hot-reload automático. Los cambios en archivos se reflejan inmediatamente en el navegador.

### TypeScript

El proyecto está completamente tipado con TypeScript. Los tipos se sincronizan con el backend a través de `lib/types/`.

## Notas

- El frontend requiere que el backend esté ejecutándose para funcionar correctamente
- En desarrollo, la detección automática de IP permite acceso desde dispositivos móviles en la misma red
- Los componentes están organizados por dominio de negocio para facilitar el mantenimiento

