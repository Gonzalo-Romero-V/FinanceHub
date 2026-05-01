# FinanceHub

FinanceHub es un ecosistema moderno centrado en la creación de un sistema de dashboard financiero inteligente gestionado mediante Inteligencia Artificial y Lenguaje Natural (NL2SQL). 

Integra de manera fluida tres capas robustas de ingeniería de software:
1. **Frontend**: Next.js (App Router) actuando también como proxy para servicios internos.
2. **Backend**: Laravel (API) para persistencia transaccional.
3. **LLM Service**: FastAPI encargado de la lógica de procesamiento de lenguaje natural.

---

## Arquitectura de Despliegue
El sistema utiliza un modelo de proxy inverso donde el Frontend (Next.js) centraliza las peticiones, ocultando el Backend (Laravel) de la exposición pública directa, especialmente para flujos de OAuth.

- **Dominio principal**: `https://financehub.cc`
- **Proxy OAuth**: Todas las peticiones de autenticación deben dirigirse a `https://financehub.cc/api/login/google/...` para ser gestionadas internamente.

---

## Configuración de Entorno (Backend)
Asegúrate de que tu `.env` en `backend/` contenga:

```env
APP_URL=https://financehub.cc
FRONTEND_URL=https://financehub.cc
GOOGLE_REDIRECT=https://financehub.cc/api/login/google/callback
SESSION_DOMAIN=financehub.cc
SANCTUM_STATEFUL_DOMAINS=financehub.cc
APP_DEBUG=false
```

---

## Comandos de Iniciación (Quick Start)

Cada servicio debe ejecutarse en su propia terminal.

### 1. Backend (Laravel)
```powershell
cd backend
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

### 2. Frontend (Next.js)
```powershell
cd frontend
npm install
npm run dev
```

### 3. Servicio de IA (FastAPI)
```powershell
cd llm-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
