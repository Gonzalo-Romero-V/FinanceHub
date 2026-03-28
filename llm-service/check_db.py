from app.services.database import db_service
import json

def check_data():
    schema = db_service.get_schema_info()
    print("Schema info:")
    print(json.dumps(schema, indent=2))
    
    try:
        movimientos_count = db_service.execute_query("SELECT COUNT(*) as count FROM movimientos")
        print(f"Movimientos count: {movimientos_count}")
    except Exception as e:
        print(f"Error checking movimientos: {e}")

if __name__ == "__main__":
    check_data()
