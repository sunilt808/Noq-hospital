import sqlite3
from datetime import datetime
from hospital_id_utils import generate_hospital_id

DB_PATH = "noq_hospital.db"

# Sample hospitals to add
new_hospitals = [
    {"name": "City Medical Center", "address": "Downtown Medical Plaza"},
    {"name": "St. Grace Hospital", "address": "North Wing Medical Complex"},
    {"name": "Prime Care Hospital", "address": "Central Business District"},
    {"name": "Advanced Health Institute", "address": "Medical Technology Park"},
    {"name": "Royal Medical Clinic", "address": "Suburban Medical District"},
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

existing_ids = set()
cur.execute("SELECT id FROM hospitals")
for row in cur.fetchall():
    existing_ids.add(row[0])

added = []
for hospital_data in new_hospitals:
    hospital_id = generate_hospital_id()
    while hospital_id in existing_ids:
        hospital_id = generate_hospital_id()
    
    existing_ids.add(hospital_id)
    
    cur.execute("""
        INSERT INTO hospitals (id, name, address, status, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?)
    """, (hospital_id, hospital_data["name"], hospital_data["address"], datetime.utcnow().isoformat(), datetime.utcnow().isoformat()))
    
    added.append((hospital_id, hospital_data["name"]))

conn.commit()

print(f"\n✓ Added {len(added)} new hospitals:")
for hid, name in added:
    print(f"  {hid} | {name}")

conn.close()
