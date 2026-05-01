from sqlalchemy import create_engine, text, inspect
from app.core.config import settings
from decimal import Decimal
from datetime import datetime, date
import uuid

class DatabaseService:
    def __init__(self):
        self.url = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
        self.engine = create_engine(self.url)

    def _sanitize_value(self, value):
        """Convierte valores no serializables a tipos estándar de JSON."""
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, bytes):
            return value.hex()
        return value

    def execute_query(self, query: str):
        """Ejecuta una consulta SQL y devuelve los resultados como una lista de diccionarios."""
        with self.engine.connect() as connection:
            result = connection.execute(text(query))
            if result.returns_rows:
                rows = [dict(row._mapping) for row in result]
                # Sanitizar resultados para serialización JSON de forma profunda
                sanitized_rows = []
                for row in rows:
                    sanitized_row = {k: self._sanitize_value(v) for k, v in row.items()}
                    sanitized_rows.append(sanitized_row)
                return sanitized_rows
            return []

    def get_schema_info(self, user_id: int = None):
        """Obtiene informacion sobre las tablas, columnas y VALORES únicos de tablas maestras filtrado por usuario si aplica."""
        inspector = inspect(self.engine)
        schema_info = {}
        
        tables = inspector.get_table_names()
        for table_name in tables:
            if table_name in ["migrations", "cache", "users", "jobs", "failed_jobs", "sessions"]:
                continue
                
            columns = inspector.get_columns(table_name)
            schema_info[table_name] = {
                "columns": [{"name": col["name"], "type": str(col["type"])} for col in columns],
                "sample_values": []
            }
            
            # Si es una tabla maestra/específica, traemos los valores reales para ayudar al LLM
            if table_name in ["tipos_movimiento", "cuentas", "conceptos"]:
                try:
                    with self.engine.connect() as conn:
                        query = f"SELECT nombre FROM {table_name}"
                        if table_name in ["cuentas", "conceptos"]:
                            if user_id:
                                query += f" WHERE user_id = {user_id}"
                            else:
                                # Si no hay usuario, no devolvemos muestras de estas tablas
                                schema_info[table_name]["sample_values"] = []
                                continue
                        query += " LIMIT 10"
                        
                        res = conn.execute(text(query))
                        schema_info[table_name]["sample_values"] = [r[0] for r in res]
                except:
                    pass
        return schema_info

db_service = DatabaseService()
