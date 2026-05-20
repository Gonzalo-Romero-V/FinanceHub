"""
Capa de acceso a Postgres para el LLM service.

Responsabilidades:
- Ejecutar SQL generado por el LLM en una transacción READ ONLY y con
  statement_timeout, evitando bloqueos o escrituras accidentales.
- Bindear parámetros (`:uid`, `:today`, `:tz`, ...) para que ningún literal
  del LLM se interpole textualmente.
- Introspectar el esquema de la DB (cacheado) y devolverlo como contexto
  para los prompts.
- Sanitizar los resultados (decimales, fechas, uuids) para que sean JSON-
  serializables.
"""

import logging
import uuid
from datetime import date, datetime
from decimal import Decimal
from functools import lru_cache
from typing import Any, Mapping

from sqlalchemy import create_engine, inspect, text

from app.core.config import settings

log = logging.getLogger(__name__)

# Tablas internas o sensibles que NUNCA se exponen al LLM.
EXCLUDED_TABLES = {
    "migrations",
    "cache",
    "cache_locks",
    "users",
    "jobs",
    "failed_jobs",
    "job_batches",
    "sessions",
    "password_reset_tokens",
    "personal_access_tokens",
}

# Tablas para las que enviamos un puñado de valores reales como referencia.
TABLES_WITH_SAMPLES = {"tipos_movimiento", "cuentas", "conceptos", "tipos_cuenta"}

# Tablas filtrables por usuario (sample restringido a `user_id`).
USER_SCOPED_TABLES = {"cuentas", "conceptos"}


class DatabaseService:
    def __init__(self) -> None:
        self.url = (
            f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}"
            f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
        )
        self.engine = create_engine(self.url, pool_pre_ping=True)

    # ─── Sanitización ────────────────────────────────────────────────────────

    @staticmethod
    def _sanitize_value(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, bytes):
            return value.hex()
        return value

    # ─── Ejecución de queries ────────────────────────────────────────────────

    def execute_query(
        self,
        sql: str,
        params: Mapping[str, Any] | None = None,
    ) -> list[dict]:
        """
        Ejecuta `sql` con bindings (`:name`) en una transacción READ ONLY y con
        `statement_timeout`. Devuelve los resultados como `list[dict]`
        sanitizada para JSON.
        """
        params = params or {}
        timeout_ms = int(settings.STATEMENT_TIMEOUT_MS)

        with self.engine.connect() as connection:
            try:
                # Statement timeout local a la transacción y read-only.
                connection.execute(text(f"SET LOCAL statement_timeout = {timeout_ms}"))
                connection.execute(text("SET TRANSACTION READ ONLY"))

                result = connection.execute(text(sql), params)
                if not result.returns_rows:
                    return []

                rows = [dict(row._mapping) for row in result]
                return [
                    {k: self._sanitize_value(v) for k, v in row.items()}
                    for row in rows
                ]
            except Exception:
                log.exception("execute_query falló")
                raise

    # ─── Introspección ───────────────────────────────────────────────────────

    def get_schema_info(self, user_id: int | None = None) -> dict:
        """
        Devuelve metadatos del schema relevante para el LLM. La estructura es
        cacheable (no varía durante el runtime) excepto por los `sample_values`
        de tablas scoped por usuario, que se cargan aparte.
        """
        schema = dict(self._schema_skeleton())  # copia
        if user_id is not None:
            self._inject_user_samples(schema, user_id)
        return schema

    @lru_cache(maxsize=1)
    def _schema_skeleton(self) -> dict:
        """
        Schema sin `sample_values` de tablas user-scoped. Cache permanente: la
        estructura de tablas no cambia en runtime.
        """
        inspector = inspect(self.engine)
        info: dict = {}

        for table_name in inspector.get_table_names():
            if table_name in EXCLUDED_TABLES:
                continue

            columns = inspector.get_columns(table_name)
            fks = inspector.get_foreign_keys(table_name)

            info[table_name] = {
                "columns": [
                    {"name": col["name"], "type": str(col["type"])}
                    for col in columns
                ],
                "foreign_keys": [
                    {
                        "column": fk["constrained_columns"][0],
                        "ref_table": fk["referred_table"],
                        "ref_column": fk["referred_columns"][0],
                    }
                    for fk in fks
                    if fk["constrained_columns"]
                ],
                "sample_values": [],
            }

            # Sample de tablas maestras (compartidas, no scoped).
            if (
                table_name in TABLES_WITH_SAMPLES
                and table_name not in USER_SCOPED_TABLES
            ):
                info[table_name]["sample_values"] = self._fetch_samples(table_name)

        return info

    def _inject_user_samples(self, schema: dict, user_id: int) -> None:
        for table_name in USER_SCOPED_TABLES:
            if table_name not in schema:
                continue
            schema[table_name] = {
                **schema[table_name],
                "sample_values": self._fetch_samples(table_name, user_id=user_id),
            }

    def _fetch_samples(self, table_name: str, user_id: int | None = None) -> list:
        try:
            with self.engine.connect() as conn:
                if user_id is not None and table_name in USER_SCOPED_TABLES:
                    sql = text(
                        f"SELECT nombre FROM {table_name} WHERE user_id = :uid LIMIT 5"
                    )
                    res = conn.execute(sql, {"uid": user_id})
                else:
                    sql = text(f"SELECT nombre FROM {table_name} LIMIT 5")
                    res = conn.execute(sql)
                return [row[0] for row in res]
        except Exception:
            log.exception("No se pudieron leer samples de %s", table_name)
            return []


db_service = DatabaseService()
