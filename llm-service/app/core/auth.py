"""Autenticacion del LLM service contra tokens personales de Laravel Sanctum."""

from __future__ import annotations

import hashlib
import logging
from typing import Annotated

from fastapi import Header, HTTPException, status
from sqlalchemy import text

from app.services.database import db_service

log = logging.getLogger(__name__)


def _unauthenticated() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token de autenticacion invalido o ausente.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _parse_bearer_token(authorization: str | None) -> tuple[int, str]:
    if not authorization:
        raise _unauthenticated()

    scheme, separator, raw_token = authorization.partition(" ")
    if not separator or scheme.lower() != "bearer" or not raw_token:
        raise _unauthenticated()

    token_id, token_separator, plaintext = raw_token.strip().partition("|")
    if (
        not token_separator
        or not token_id.isascii()
        or not token_id.isdigit()
        or int(token_id) <= 0
        or not plaintext
    ):
        raise _unauthenticated()

    return int(token_id), plaintext


def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
) -> int:
    """Resuelve el usuario exclusivamente desde un bearer token de Sanctum."""
    token_id, plaintext = _parse_bearer_token(authorization)
    token_hash = hashlib.sha256(plaintext.encode("utf-8")).hexdigest()

    query = text(
        """
        SELECT pat.tokenable_id
        FROM personal_access_tokens AS pat
        JOIN users AS u ON u.id = pat.tokenable_id
        WHERE pat.id = :token_id
          AND pat.token = :token_hash
          AND pat.tokenable_type = :tokenable_type
          AND (pat.expires_at IS NULL OR pat.expires_at > CURRENT_TIMESTAMP)
        LIMIT 1
        """
    )

    try:
        with db_service.engine.connect() as connection:
            user_id = connection.execute(
                query,
                {
                    "token_id": token_id,
                    "token_hash": token_hash,
                    "tokenable_type": r"App\Models\UserModel",
                },
            ).scalar_one_or_none()
    except Exception as exc:
        log.exception("No se pudo validar el token de Sanctum.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El servicio de autenticacion no esta disponible.",
        ) from exc

    if user_id is None:
        raise _unauthenticated()

    return int(user_id)
