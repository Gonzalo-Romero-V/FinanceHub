"""
Validador post-generación para el SQL que produce el LLM.

Garantiza, *antes* de ejecutar contra la DB, que:

1. Es un único statement.
2. Es un SELECT (o CTE WITH ... SELECT).
3. No contiene palabras prohibidas (DML/DDL/exfiltración).
4. Toda tabla "scoped por usuario" en el FROM/JOIN está restringida con
   `:uid` en su WHERE/ON.
5. Sólo usa los placeholders permitidos (`:uid`, `:today`, `:tz`).

Para análisis usamos `sqlglot` (parser real), no regex.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

import sqlglot
from sqlglot import exp

# Tablas en las que ningún registro debe ser leído sin filtrar por `user_id`.
USER_SCOPED_TABLES = {"movimientos", "cuentas", "conceptos"}

# Tablas que tienen `user_id` directo en su esquema.
TABLES_WITH_DIRECT_USER_ID = {"cuentas", "conceptos"}

# `movimientos` no tiene `user_id` directo; se filtra vía join a `cuentas` o
# `conceptos`. Si está en el FROM, exigimos uno de esos joins con filtro.
MOVIMIENTOS_BRIDGE_TABLES = {"cuentas", "conceptos"}

ALLOWED_PARAMETERS = {"uid", "today", "tz"}

# Palabras prohibidas independientes de la estructura del AST. sqlglot
# bloquea casi todo, pero defensivo extra.
FORBIDDEN_TOKENS = (
    r"\bINSERT\b",
    r"\bUPDATE\b",
    r"\bDELETE\b",
    r"\bDROP\b",
    r"\bALTER\b",
    r"\bTRUNCATE\b",
    r"\bGRANT\b",
    r"\bREVOKE\b",
    r"\bCOPY\b",
    r"\bINTO\b",          # SELECT INTO
    r"\bpg_\w+",          # tablas/funciones pg_*
    r"\bcurrent_user\b",
    r"\bsession_user\b",
    r"\bcurrent_setting\b",
)


class SqlValidationError(ValueError):
    """SQL rechazado por el validador."""


@dataclass
class ValidationResult:
    sql: str
    tables_referenced: set[str]


def validate_sql(sql: str) -> ValidationResult:
    """
    Devuelve `ValidationResult` si el SQL es seguro, lanza
    `SqlValidationError` si no lo es.
    """
    sql = sql.strip().rstrip(";")

    if not sql:
        raise SqlValidationError("SQL vacío.")

    # 1. Statements múltiples.
    statements = sqlglot.parse(sql, dialect="postgres")
    statements = [s for s in statements if s is not None]
    if len(statements) != 1:
        raise SqlValidationError("Se permite un único statement.")

    tree = statements[0]

    # 2. Es un SELECT (o WITH ... SELECT).
    root_select = _find_root_select(tree)
    if root_select is None:
        raise SqlValidationError("Solo se permiten queries SELECT.")

    # 3. Tokens prohibidos en el texto crudo (defensa adicional).
    upper = sql.upper()
    for pattern in FORBIDDEN_TOKENS:
        if re.search(pattern, upper, flags=re.IGNORECASE):
            raise SqlValidationError(f"SQL contiene token prohibido ({pattern}).")

    # 4. Placeholders permitidos.
    # Lookbehind negativo `(?<!:)` para excluir el operador de cast de
    # PostgreSQL (`::date`, `::text`, `:foo::bar`). Sólo un `:` solitario
    # introduce un placeholder bindeable.
    for placeholder in re.findall(r"(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)", sql):
        if placeholder not in ALLOWED_PARAMETERS:
            raise SqlValidationError(
                f"Placeholder `:{placeholder}` no permitido. "
                f"Permitidos: {sorted(ALLOWED_PARAMETERS)}."
            )

    # 5. Tablas referenciadas.
    tables = _referenced_tables(tree)
    invalid = tables - _allowed_tables()
    if invalid:
        raise SqlValidationError(
            f"Tablas no permitidas en el FROM/JOIN: {sorted(invalid)}."
        )

    # 6. Filtro user_id en tablas scoped.
    _ensure_user_scope(tree, tables)

    return ValidationResult(sql=sql, tables_referenced=tables)


# ─── Helpers ─────────────────────────────────────────────────────────────────


def _find_root_select(tree: exp.Expression) -> exp.Select | None:
    if isinstance(tree, exp.Select):
        return tree
    if isinstance(tree, exp.With):
        inner = tree.this
        return inner if isinstance(inner, exp.Select) else None
    return None


def _allowed_tables() -> set[str]:
    """Whitelist de tablas referenciables por el SQL del LLM."""
    return USER_SCOPED_TABLES | {"tipos_movimiento", "tipos_cuenta"}


def _referenced_tables(tree: exp.Expression) -> set[str]:
    return {t.name.lower() for t in tree.find_all(exp.Table)}


def _ensure_user_scope(tree: exp.Expression, tables: set[str]) -> None:
    """
    Para cada tabla user-scoped referenciada, exige que el SQL contenga
    una condición `<alias_o_tabla>.user_id = :uid` (en WHERE o en ON de un JOIN).
    Para `movimientos`, basta con que esa condición exista sobre `cuentas` o
    `conceptos` ya unidas al query (puente).
    """
    user_id_conditions = _collect_user_id_equals_uid(tree)

    # Mapeo: alias -> nombre real de tabla (para resolver `c.user_id` cuando
    # `c` es alias de `conceptos`).
    alias_map = {}
    for table in tree.find_all(exp.Table):
        alias = table.alias_or_name.lower()
        alias_map[alias] = table.name.lower()

    constrained_tables = set()
    for column_table_ref in user_id_conditions:
        resolved = alias_map.get(column_table_ref.lower(), column_table_ref.lower())
        constrained_tables.add(resolved)

    # `cuentas` y `conceptos` deben tener su propio filtro si están en el SQL.
    for t in TABLES_WITH_DIRECT_USER_ID & tables:
        if t not in constrained_tables:
            raise SqlValidationError(
                f"Falta filtro `{t}.user_id = :uid` requerido."
            )

    # `movimientos` se permite sin user_id propio (no tiene la columna) sólo
    # si una tabla puente (cuentas/conceptos) está unida y filtrada.
    if "movimientos" in tables:
        if not (MOVIMIENTOS_BRIDGE_TABLES & constrained_tables):
            raise SqlValidationError(
                "`movimientos` requiere un JOIN con `cuentas` o `conceptos` "
                "filtrados por `user_id = :uid`."
            )


def _collect_user_id_equals_uid(tree: exp.Expression) -> list[str]:
    """
    Encuentra todas las apariciones de `X.user_id = :uid` (en WHERE u ON de
    JOIN) y devuelve los `X` (alias o nombre de tabla).
    """
    matches: list[str] = []
    for eq in tree.find_all(exp.EQ):
        left, right = eq.this, eq.expression
        col, placeholder = _normalize_user_id_eq(left, right)
        if col is None:
            continue
        if not _is_uid_placeholder(placeholder):
            continue
        if col.name.lower() != "user_id":
            continue
        table_ref = col.table or ""
        if table_ref:
            matches.append(table_ref)
    return matches


def _normalize_user_id_eq(
    a: exp.Expression, b: exp.Expression
) -> tuple[exp.Column | None, exp.Expression | None]:
    if isinstance(a, exp.Column):
        return a, b
    if isinstance(b, exp.Column):
        return b, a
    return None, None


def _is_uid_placeholder(node: exp.Expression) -> bool:
    """Detecta `:uid` (sqlglot lo representa como Placeholder o Parameter)."""
    if isinstance(node, exp.Placeholder):
        return (node.name or "").lower() == "uid"
    if isinstance(node, exp.Parameter):
        return (node.name or "").lower() == "uid"
    return False
