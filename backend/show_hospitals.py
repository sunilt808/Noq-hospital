import sqlite3

conn = sqlite3.connect("noq_hospital.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== RAW HOSPITALS TABLE ===")
cursor.execute("SELECT id, name, address FROM hospitals ORDER BY id")
for row in cursor.fetchall():
    print(f"{row['id']:25} | {row['name']:20} | {row['address']:30}")

conn.close()
