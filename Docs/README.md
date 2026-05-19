# Docs — Contexto para agentes

Documentación mínima pensada para que un agente (humano o LLM) pueda contribuir
sin tener que leer todo el repo. Cada archivo es independiente y va al grano.

| Archivo | Para qué sirve |
|---|---|
| [objetivo.md](./objetivo.md) | Qué es FinanceHub y qué problema resuelve. |
| [alcance.md](./alcance.md) | Qué está implementado HOY, qué NO, y qué viene. |
| [stack.md](./stack.md) | Tecnologías y versiones por servicio. |
| [arquitectura.md](./arquitectura.md) | Los 3 servicios, cómo se comunican, dónde corren. |
| [entidades.md](./entidades.md) | Schema de la base de datos y relaciones. |
| [contratos.md](./contratos.md) | Endpoints REST del backend + endpoint del LLM service. |
| [diseno.md](./diseno.md) | Reglas de UI: tipografía, colores, shells de layout, componentes. |
| [estructura.md](./estructura.md) | Árbol de carpetas y convenciones de nombres. |

## Cómo usar esta carpeta
- Antes de tocar código que cruza servicios, leé **arquitectura.md** + **contratos.md**.
- Antes de tocar UI, leé **diseno.md** + **estructura.md** (carpeta frontend).
- Antes de modelar nuevos datos, leé **entidades.md**.
- Si vas a agregar features, antes leé **alcance.md** para no duplicar trabajo
  ya planeado en PENDIENTES.md.
