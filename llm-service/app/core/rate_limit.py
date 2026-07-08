"""Limite diario de uso de IA por usuario (control de costos).

Cuenta 1 uso por request de usuario a /api/analyze o a los endpoints de voz,
sin importar cuantas llamadas internas a OpenAI dispare esa request (el
auto-discovery de widgets puede reintentar hasta 3 veces internamente — eso
sigue contando como un solo uso desde la perspectiva del usuario, que es lo
que le importa a la UX del limite. Ver retry_orchestrator.py).
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import text

from app.core.auth import get_current_user_id
from app.core.config import settings
from app.services.database import db_service

log = logging.getLogger(__name__)

_NOTIFICATION_TYPE = "App\\Notifications\\LimiteIADiarioNotification"


def _notify_limit_reached(connection, user_id: int) -> None:
    """Inserta la notificacion de limite alcanzado directo en la tabla de
    Laravel (mismo patron que ya usa auth.py para leer personal_access_tokens
    sin pasar por HTTP) — solo una vez por dia, no en cada request rechazada.
    """
    titulo = "Límite diario de IA alcanzado"
    mensaje = f"Llegaste al límite diario de {settings.DAILY_LLM_LIMIT} consultas al asistente. Se reinicia mañana."
    data = f'{{"titulo": "{titulo}", "mensaje": "{mensaje}", "limite": {settings.DAILY_LLM_LIMIT}}}'

    connection.execute(
        text(
            """
            INSERT INTO notifications (id, type, notifiable_type, notifiable_id, data, created_at, updated_at)
            VALUES (:id, :type, :notifiable_type, :notifiable_id, :data, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "type": _NOTIFICATION_TYPE,
            "notifiable_type": r"App\Models\UserModel",
            "notifiable_id": user_id,
            "data": data,
        },
    )


def enforce_daily_limit(
    user_id: Annotated[int, Depends(get_current_user_id)],
) -> int:
    """Incrementa el contador del dia para el usuario y rechaza con 429 si
    ya supero el limite. Devuelve el user_id (mismo valor que
    get_current_user_id) para poder usarse como reemplazo directo de esa
    dependencia en los endpoints.
    """
    try:
        with db_service.engine.connect() as connection:
            count = connection.execute(
                text(
                    """
                    INSERT INTO llm_usage_daily (user_id, usage_date, count, created_at, updated_at)
                    VALUES (:user_id, CURRENT_DATE, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, usage_date)
                    DO UPDATE SET count = llm_usage_daily.count + 1, updated_at = CURRENT_TIMESTAMP
                    RETURNING count
                    """
                ),
                {"user_id": user_id},
            ).scalar_one()

            if count == settings.DAILY_LLM_LIMIT + 1:
                # Recien cruzo el limite en este request: avisar una sola vez.
                _notify_limit_reached(connection, user_id)

            connection.commit()
    except HTTPException:
        raise
    except Exception:
        log.exception("No se pudo verificar el limite diario de IA, se permite la request.")
        return user_id

    if count > settings.DAILY_LLM_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Llegaste al límite de {settings.DAILY_LLM_LIMIT} consultas al asistente por hoy. "
                "Se reinicia mañana."
            ),
        )

    return user_id


def get_current_usage(user_id: int) -> int:
    """Lectura de solo consulta (no incrementa el contador) — para mostrarle
    al usuario cuánto lleva usado hoy, ej. una barra de progreso en el
    dashboard. Devuelve 0 si todavía no usó nada hoy o si falla la consulta.
    """
    try:
        with db_service.engine.connect() as connection:
            count = connection.execute(
                text(
                    "SELECT count FROM llm_usage_daily WHERE user_id = :user_id AND usage_date = CURRENT_DATE"
                ),
                {"user_id": user_id},
            ).scalar_one_or_none()
        return count or 0
    except Exception:
        log.exception("No se pudo leer el uso diario de IA.")
        return 0
