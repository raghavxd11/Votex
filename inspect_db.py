import sqlite3
import os
import sys

# Force UTF-8 encoding for Windows console compatibility
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

db_path = "mental_health_platform_v4.db"

if not os.path.exists(db_path):
    print(f"Database '{db_path}' does not exist yet. Run backend server to generate it.")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get list of tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]

print("==================================================")
print(f" 🗄️ DATABASE INSPECTOR: {db_path}")
print("==================================================")
print(f"Found {len(tables)} tables: {', '.join(tables)}\n")

for table in tables:
    print(f"--- TABLE: {table} ---")
    cursor.execute(f"PRAGMA table_info({table});")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Columns: {', '.join(columns)}")
    
    cursor.execute(f"SELECT * FROM {table} LIMIT 10;")
    rows = cursor.fetchall()
    if rows:
        for r in rows:
            print(f"  -> {r}")
    else:
        print("  (Table currently has 0 records)")
    print()

conn.close()
print("==================================================")
print("💡 Tip in Antigravity IDE: Run 'python inspect_db.py' anytime to view DB tables!")
