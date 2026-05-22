import sqlite3

def inspect():
    db_path = "indicador_btc/data/db/indicador_btc.sqlite"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:", tables)
    
    for table_tuple in tables:
        table_name = table_tuple[0]
        print(f"\n--- Table: {table_name} ---")
        
        # Get table schema
        cursor.execute(f"PRAGMA table_info({table_name});")
        info = cursor.fetchall()
        print("Schema (cid, name, type, notnull, dflt_value, pk):")
        for col in info:
            print(f"  {col[1]} ({col[2]})")
            
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        print(f"Row count: {count}")
        
        # Get sample rows
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 3;")
        samples = cursor.fetchall()
        print("Samples:")
        for row in samples:
            print(f"  {row}")

    conn.close()

if __name__ == "__main__":
    inspect()
