# FinanceHub

FinanceHub es un ecosistema monolítico moderno centrado en la creación de un sistema de dashboard financiero inteligente gestionado mediante Inteligencia Artificial y Lenguaje Natural (NL2SQL). 

Integra de manera fluida tres capas robustas de ingeniería de software:
1. **Frontend**: Creado en Next.js para una experiencia de usuario altamente responsiva.
2. **Backend**: Creado en Laravel (API) para la persistencia transaccional y validación de reglas de negocio tradicionales.
3. **LLM Service**: Un microservicio inteligente escrito en FastAPI encargado de la lógica de procesamiento de lenguaje natural y diseño dinámico de plantillas en la UI.

---

## Requisitos Previos

Asegúrate de tener instalado en tu sistema:
- **Node.js** (v18 o superior) y **npm** (para levantar Frontend)
- **PHP** (v8.1 o superior) y **Composer** (para levantar Backend)
- **Python** (v3.9 o superior) (para levantar LLM Service)
- **PostgreSQL** para la persistencia transaccional de datos
- Dependiendo de tu configuración LLM: API Key de OpenAI, base Gemini, o el motor Ollama ejecutando.

---

## Comandos de Iniciación (Quick Start)

Debido a su estructura de subproyectos (monorepo), requerirás inicializar y ejecutar cada servicio en su propia ventana de terminal situada en la carpeta raíz `financehub/`.

### 1. Inicializar el Backend (Laravel)

El servicio convencional de APIs y gestión de la Base de Datos. Abre tu 1º terminal:

```bash
cd backend
# Descargar dependencias
composer install

# Copiar configuración de entorno (.env)
cp .env.example .env

# Generar clave de aplicación (Laravel)
php artisan key:generate

# Migrar tablas a tu DB PostgreSQL y alimentarla con Seeders de ser necesario
# (Recuerda colocar tus accesos a tu Postgres en el .env previamente)
php artisan migrate --seed

# Poner en marcha el servidor de desarrollo PHP
php artisan serve
```
> El servicio estará corriendo habitualmente en `http://127.0.0.1:8000`

### 2. Inicializar el Frontend (Next.js)

La cara del sistema que renderizará los gráficos y el chat. Abre tu 2º terminal:

```bash
cd frontend
# Descargar paquetes del package.json
npm install

# Poner en marcha el servidor de desarrollo NodeJS
npm run dev
```
> El entorno visual estará operando en `http://localhost:3000`

### 3. Inicializar el Servicio de IA (FastAPI)

El orquestador de AI. Abre tu 3º terminal:

**Para entornos Windows:**
```powershell
cd llm-service
# Crear tu Entorno Virtual
python -m venv venv
# Activar el Entorno
venv\Scripts\activate
# Instalar los requerimientos (dependencias IA, fastapi, sqlalchemy)
pip install -r requirements.txt
# Lanzar el servidor Uvicorn
python main.py
```

**Para entornos Mac/Linux:**
```bash
cd llm-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```
> No olvides agregar tus llaves API (`.env` local de Python) para autorizar tu LLM favorito. El puerto de arranque base suele ser el `8001` (o lo expuesto por consola Uvicorn).

---

**Correr App**

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

```bash
npm run dev
```

```bash
python main.py
``` 