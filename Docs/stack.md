# Stack

## Frontend
- **Next.js 16.1.6** (App Router, Turbopack).
- **React 19.2.3** + React DOM 19.2.3.
- **TypeScript 5**.
- **Tailwind CSS 4** + `tw-animate-css`.
- **shadcn** (registry 3.8.x) sobre **Radix UI**.
- **lucide-react** para iconos.
- **recharts** para gráficos del dashboard AI.
- **date-fns**, **react-day-picker** para fechas.
- **clsx** + **tailwind-merge** para `cn()`.
- **js-cookie** para persistencia ligera.
- Puerto dev: **3000**.

## Backend
- **Laravel 11.x** (PHP 8.x).
- **Laravel Sanctum** para tokens bearer.
- **Laravel Socialite** para OAuth Google.
- **PostgreSQL** (pgsql driver). DB: `financehub`.
- Puerto dev: **8000**.

## LLM Service
- **FastAPI**.
- **Pydantic Settings** para config.
- **psycopg / SQLAlchemy** según el módulo (`app/services/database.py`).
- Proveedor LLM configurable: **OpenAI** (default) u **Ollama** (`mistral` local).
- Pipeline: Semantic Planner → SQL Generator → DB Executor → Analyst (resumen).
- Puerto dev: **8001**.

## DB compartida
Backend y LLM service apuntan a la **misma instancia de Postgres**
(`financehub` @ `127.0.0.1:5432`). El LLM service emite SQL de solo-lectura
sobre el mismo schema que mantiene Laravel.
