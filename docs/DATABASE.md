# FinanceHub – Base de Datos y Configuración del Entorno

## 📊 Diagrama de Entidad Relación (DER)

> **Nota:** Inserte aquí el diagrama ERD de la base de datos.
> 
> Puede ser una imagen (`.png`, `.jpg`, `.svg`) o un diagrama generado con herramientas como:
> - [dbdiagram.io](https://dbdiagram.io)
> - [draw.io](https://draw.io)
> - [Lucidchart](https://lucidchart.com)
> - [pgAdmin](https://www.pgadmin.org)

```markdown
<!-- Ejemplo de cómo incluir una imagen del DER -->
<!-- ![Diagrama ERD](./images/database-erd.png) -->
```

---

## 🗄️ Base de Datos (PostgreSQL)

Este proyecto usa PostgreSQL. El esquema SQL vive en `FinanceHub.sql` (raíz del repo).

### Producción / hosting (ej: Render)

- No pegues credenciales en este repo (ni en docs).
- Guarda secretos en el proveedor (Render “Environment Variables”) o en un secret manager.

**Ejemplo (placeholders):**

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
```

---

## 🔐 Variables de Entorno (Backend)

El backend debe utilizar variables de entorno para la conectividad con la base de datos.

### Variables requeridas

Usa `DATABASE_URL` siempre que puedas:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
```

### Variables opcionales (desarrollo)

```env
DB_MODE=local
# o
DB_MODE=remote
```

---

## 🔧 Reglas de Acceso a la Base de Datos

### Configuración del Backend

- **Librería:** PostgreSQL se accede utilizando la librería `pg` (connection pool)
- **ORM:** No se utiliza ORM
- **Esquema SQL:** El esquema definido en `FinanceHub.sql` es la única fuente de verdad
- **Restricciones:** Las restricciones de base de datos se tratan como reglas de negocio en código

### Restricciones Asumidas por el Backend

El backend asume que la base de datos garantiza:

- ✅ **CHECK constraints** - Validación de rangos y condiciones
- ✅ **NOT NULL rules** - Campos obligatorios
- ✅ **FOREIGN KEY integrity** - Integridad referencial
- ✅ **UNIQUE constraints** - Unicidad de valores

### Responsabilidades del Backend

El backend es responsable únicamente de:

1. **Orquestación** - Coordinación de operaciones complejas
2. **Transacciones** - Gestión de transacciones SQL
3. **Validación a nivel de usuario** - Validaciones de negocio
4. **Manejo de errores** - Captura y manejo de excepciones

---

## 🔌 Guías de Connection Pool

### Mejores Prácticas

1. **Tamaño del Pool:** Utilizar un pool pequeño (máximo 5–10 conexiones)
2. **Reutilización:** Siempre reutilizar el pool (patrón singleton)
3. **Transacciones:** Todas las escrituras multi-paso (ej: transferencias) deben estar envueltas en transacciones SQL


---

## 💡 Notas para Desarrollo con Cursor / IA

### Convenciones Importantes

- 🌐 **Idioma:** Todas las entidades y campos de la base de datos están en español
- 📝 **TypeScript:** Las interfaces de TypeScript deben coincidir exactamente con el esquema de la base de datos
- 🏗️ **Repositorios:** Los métodos de repositorio deben ser explícitos y reveladores de intención (no CRUD genérico)
- 📋 **Tabla de Referencia:** `tipos_movimiento` es una tabla de referencia de solo lectura
- 🚫 **Abstracciones:** No crear abstracciones prematuras (no usar repositorio base)




# Base de Datos - Finance Hub

## Motor de Base de Datos

Este proyecto utiliza **PostgreSQL** como motor de base de datos relacional.

## Esquema SQL

El esquema completo de la base de datos está definido en `FinanceHub.sql` en la raíz del repositorio. Este archivo es la **única fuente de verdad** para la estructura de la base de datos.

## Arquitectura de Acceso

- **Librería**: `pg` (PostgreSQL client) con connection pool
- **ORM**: No se utiliza ORM - acceso directo mediante queries SQL
- **Patrón**: Connection pool singleton para reutilización de conexiones

## Convenciones

- **Idioma**: Todas las entidades y campos de la base de datos están en español
- **Tipos TypeScript**: Las interfaces en `apps/api/src/types/index.ts` deben coincidir exactamente con el esquema de BD
- **Repositorios**: Métodos explícitos y reveladores de intención (no CRUD genérico)
- **Tabla de Referencia**: `tipos_movimiento` es una tabla de referencia de solo lectura

## Configuración de Conexión

Para configurar la conexión a la base de datos, consulta [apps/api/README.env.md](../apps/api/README.env.md).

## Entidades Principales

- **cuentas** - Cuentas financieras (activos y pasivos)
- **tipos_movimiento** - Tipos de movimiento (ingreso, egreso, transferencia)
- **conceptos** - Conceptos categorizados por tipo de movimiento
- **movimientos** - Movimientos financieros registrados
