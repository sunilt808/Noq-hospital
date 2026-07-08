import sqlite3

conn = sqlite3.connect("noq_hospital.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Check users table hospital_id formats
print("=== USERS TABLE - HOSPITAL ID FORMATS ===")
cursor.execute("""
    SELECT DISTINCT hospital_id, COUNT(*) as count
    FROM users 
    WHERE hospital_id IS NOT NULL
    GROUP BY hospital_id
    ORDER BY hospital_id
""")

hids = cursor.fetchall()
for row in hids:
    print(f"  {row['hospital_id']:30} | Count: {row['count']}")

print("\n=== HOSPITALS TABLE - ID FORMATS ===")
cursor.execute("""
    SELECT id, name
    FROM hospitals
    ORDER BY id
""")

hospitals = cursor.fetchall()
for row in hospitals:
    print(f"  {row['id']:30} | {row['name']}")

print("\n=== INCONSISTENCY CHECK ===")
# Find users with hospital_id that don't exist in hospitals table
cursor.execute("""
    SELECT DISTINCT u.hospital_id
    FROM users u
    WHERE u.hospital_id IS NOT NULL 
    AND u.hospital_id NOT IN (SELECT id FROM hospitals)
""")

orphaned = cursor.fetchall()
if orphaned:
    print("Hospital IDs in users table but NOT in hospitals table:")
    for row in orphaned:
        print(f"  - {row['hospital_id']}")
else:
    print("✓ No orphaned hospital_ids found")

conn.close()
