import sys
import os
import asyncio
import json

# Añadir el path del proyecto para importar los servicios
sys.path.append(os.getcwd())

from app.services.database import db_service

def check_schema():
    try:
        schema = db_service.get_schema_info()
        schema_json = json.dumps(schema)
        print(f"SCHEMA SIZE: {len(schema_json)} characters")
        print(f"SCHEMA PREVIEW: {schema_json[:500]}...")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    check_schema()
