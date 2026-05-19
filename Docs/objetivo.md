# Objetivo

FinanceHub es un dashboard de finanzas personales con un asistente conversacional
basado en LLM. El usuario registra **cuentas**, **conceptos** (categorías) y
**movimientos** (ingresos / egresos / transferencias), y obtiene visualizaciones
construidas en tiempo real a partir de prompts en lenguaje natural.

## Problema que resuelve
Las hojas de cálculo y apps de finanzas personales obligan al usuario a
configurar gráficos manualmente. FinanceHub usa un pipeline NL → SQL → Widget
para que el usuario describa lo que quiere ver ("muéstrame el gasto en
supermercado los últimos 3 meses") y el sistema construya el widget.

## Audiencia
- Usuario final único por sesión (cada usuario ve solo sus propios datos).
- Diseñado como SaaS multiusuario; el modelo de datos ya incluye `user_id` en
  cuentas y conceptos. (movimientos hereda usuario vía la cuenta/concepto.)

## No-objetivos (explícitos)
- No es un sistema de contabilidad de doble partida.
- No es multi-moneda (formateo siempre USD por ahora).
- No es multi-tenant a nivel infraestructura: una sola DB, una sola instancia
  por servicio.
- No es offline-first.
