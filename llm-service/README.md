# FinanceHub LLM Service (FastAPI)

Servicio de Inteligencia Artificial encargado de transformar lenguaje natural en consultas SQL seguras y visualizaciones dinámicas para el dashboard financiero.

## 🚀 Tecnologías
- **Framework:** FastAPI
- **LLM:** OpenAI (GPT-4o) & Ollama (Mistral)
- **DB:** SQLAlchemy + PostgreSQL
- **Validación:** Pydantic v2

## 🏗️ Estructura del Proyecto
- `main.py`: Punto de entrada y definición de endpoints.
- `app/core/`: Configuración y variables de entorno.
- `app/services/llm/`: Adaptadores intercambiables para proveedores de IA.
- `app/services/semantic.py`: Capa de mapeo de intención (Negocio -> Técnico).
- `app/services/sql_gen.py`: Generación y validación estricta de SQL (Solo `SELECT`).
- `app/services/visualizer.py`: Lógica inteligente para selección de widgets.
- `app/services/database.py`: Introspección dinámica del esquema de base de datos.

## 🛠️ Configuración
El servicio es altamente parametrizable a través del archivo `.env`:

1. **Cambiar Modelo:** Modifica `LLM_PROVIDER` (`openai` o `ollama`).
2. **Puertos:** El servicio corre por defecto en el puerto `8001`.
3. **DB:** Ajusta las credenciales de PostgreSQL para que coincidan con tu instancia de Laravel.

## 🔄 Pipeline de Procesamiento
1. **Prompt:** Usuario solicita datos ("Mis gastos de enero").
2. **Semantic Map:** La IA traduce "gastos" a `tipo_movimiento = 'egreso'` basado en el esquema real.
3. **SQL Gen:** Se genera una consulta `SELECT` válida y segura.
4. **Execution:** Se obtienen los datos reales de la base de datos.
5. **Visualization:** Se determina si los datos se ven mejor en `bar`, `line`, `pie`, `table` o `kpi`.

## ⚡ Puesta en Marcha

```powershell
# 1. Crear entorno virtual
cd llm-service
python -m venv venv

# 2. Activar entorno virtual (Windows)
.\venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar entorno
# Edita el archivo .env con tus credenciales

# 5. Ejecutar servidor
python main.py
```

El servicio estará disponible en `http://localhost:8001` y la documentación interactiva en `/docs`.
