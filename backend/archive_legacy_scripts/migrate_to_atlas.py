"""Migrate hospitals from local SQLite to MongoDB Atlas."""
import asyncio
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "noq_hospital_db")
SQLITE_PATH = Path(__file__).resolve().parent / "noq_hospital.db"


async def migrate():
    # Read from SQLite
    print(f"Reading from SQLite: {SQLITE_PATH}")
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute("SELECT * FROM hospitals")
    rows = cur.fetchall()
    print(f"Found {len(rows)} hospitals in SQLite")
    
    if not rows:
        print("No hospitals to migrate!")
        conn.close()
        return
    
    # Connect to Atlas
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    migrated = 0
    skipped = 0
    for row in rows:
        hospital_doc = {
            "_id": row["id"],
            "name": row["name"],
            "address": row["address"] if "address" in row.keys() else None,
            "phone": row["phone"] if "phone" in row.keys() else None,
            "email": row["email"] if "email" in row.keys() else None,
            "city": row["city"] if "city" in row.keys() else None,
            "state": row["state"] if "state" in row.keys() else None,
            "pincode": row["pincode"] if "pincode" in row.keys() else None,
            "category": row["category"] if "category" in row.keys() else None,
            "hospital_type": row["hospital_type"] if "hospital_type" in row.keys() else None,
            "established_year": row["established_year"] if "established_year" in row.keys() else None,
            "registration_number": row["registration_number"] if "registration_number" in row.keys() else None,
            "website": row["website"] if "website" in row.keys() else None,
            "emergency_contact": row["emergency_contact"] if "emergency_contact" in row.keys() else None,
            "owner_name": row["owner_name"] if "owner_name" in row.keys() else None,
            "director_name": row["director_name"] if "director_name" in row.keys() else None,
            "total_beds": row["total_beds"] if "total_beds" in row.keys() else 0,
            "total_icu_beds": row["total_icu_beds"] if "total_icu_beds" in row.keys() else 0,
            "total_operation_theatres": row["total_operation_theatres"] if "total_operation_theatres" in row.keys() else 0,
            "accreditation": row["accreditation"] if "accreditation" in row.keys() else None,
            "services": row["services"] if "services" in row.keys() else None,
            "status": row["status"] if "status" in row.keys() else "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        # Check if already exists
        existing = await db.hospitals.find_one({"_id": hospital_doc["_id"]})
        if existing:
            skipped += 1
            print(f"  [SKIP] {hospital_doc['_id']} | {hospital_doc['name']} (already exists)")
            continue
        
        await db.hospitals.insert_one(hospital_doc)
        migrated += 1
        print(f"  [OK] {hospital_doc['_id']} | {hospital_doc['name']}")
    
    # Also migrate departments, rooms, doctors if they exist
    for table in ["departments", "rooms", "doctors"]:
        try:
            cur.execute(f"SELECT * FROM {table}")
            t_rows = cur.fetchall()
            if t_rows:
                t_migrated = 0
                for t_row in t_rows:
                    doc = {k: t_row[k] for k in t_row.keys()}
                    doc["_id"] = doc.pop("id", str(doc.get("_id", "")))
                    existing = await db[table].find_one({"_id": doc["_id"]})
                    if not existing:
                        await db[table].insert_one(doc)
                        t_migrated += 1
                print(f"\n  [OK] Migrated {t_migrated}/{len(t_rows)} {table}")
        except Exception as e:
            print(f"\n  [SKIP] {table}: {e}")
    
    conn.close()
    
    print(f"\nMigration complete: {migrated} hospitals migrated, {skipped} skipped")
    
    # Verify
    count = await db.hospitals.count_documents({})
    print(f"Total hospitals in Atlas: {count}")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
