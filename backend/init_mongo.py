import asyncio
import os
import sys
from datetime import datetime
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib
import secrets

# Keep it simple, don't import from backend here to avoid circular imports during refactoring
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "noq_hospital_db")

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2."""
    salt = secrets.token_hex(32)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${pwd_hash.hex()}"

async def init_mongo():
    print(f"Connecting to MongoDB at {MONGODB_URL}...")
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    print("Seeding hospitals...")
    hospitals_data = [
        {
            "_id": "Noq-100001",
            "name": "Apollo Hospital",
            "address": "123 Medical Street",
            "phone": "+91-22-4950-4950",
            "email": "apollo@hospitalsol.com",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "status": "active",
            "created_at": datetime.utcnow()
        },
        {
            "_id": "Noq-100002",
            "name": "Max Healthcare",
            "address": "456 Health Lane",
            "phone": "+91-11-4141-4141",
            "email": "info@maxhealthcare.com",
            "city": "Delhi",
            "state": "Delhi",
            "pincode": "110001",
            "status": "active",
            "created_at": datetime.utcnow()
        },
        {
            "_id": "Noq-100003",
            "name": "Fortis Hospital",
            "address": "789 Care Avenue",
            "phone": "+91-80-2211-7777",
            "email": "fortis@healthcare.com",
            "city": "Bangalore",
            "state": "Karnataka",
            "pincode": "560001",
            "status": "active",
            "created_at": datetime.utcnow()
        },
    ]
    
    for h in hospitals_data:
        await db.hospitals.update_one({"_id": h["_id"]}, {"$set": h}, upsert=True)
    
    print("Seeding departments...")
    departments_data = [
        {"_id": "DEPT-001", "hospital_id": "Noq-100001", "name": "Cardiology", "description": "Heart and cardio-vascular care", "status": "active"},
        {"_id": "DEPT-002", "hospital_id": "Noq-100001", "name": "Neurology", "description": "Nervous system care", "status": "active"},
        {"_id": "DEPT-003", "hospital_id": "Noq-100001", "name": "Orthopedic", "description": "Bone and joint care", "status": "active"},
        {"_id": "DEPT-004", "hospital_id": "Noq-100002", "name": "Cardiology", "description": "Heart and cardio-vascular care", "status": "active"},
        {"_id": "DEPT-005", "hospital_id": "Noq-100002", "name": "General Surgery", "description": "General surgical procedures", "status": "active"},
        {"_id": "DEPT-006", "hospital_id": "Noq-100003", "name": "Pediatrics", "description": "Child care", "status": "active"},
    ]
    
    for d in departments_data:
        await db.departments.update_one({"_id": d["_id"]}, {"$set": d}, upsert=True)
        
    print("Seeding users...")
    users_data = [
        {
            "_id": str(uuid4()),
            "email": "admin@noq.com",
            "password_hash": hash_password("admin@123"),
            "full_name": "Admin User",
            "role": "admin",
            "status": "active",
            "created_at": datetime.utcnow()
        },
        {
            "_id": str(uuid4()),
            "email": "hm@apollo.com",
            "hospital_id": "Noq-100001",
            "hospital_name": "Apollo Hospital",
            "full_name": "Apollo Manager",
            "password_hash": hash_password("hm@123"),
            "role": "hm",
            "status": "active",
            "created_at": datetime.utcnow()
        },
        {
            "_id": str(uuid4()),
            "email": "hm@max.com",
            "hospital_id": "Noq-100002",
            "hospital_name": "Max Healthcare",
            "full_name": "Max Manager",
            "password_hash": hash_password("hm@123"),
            "role": "hm",
            "status": "active",
            "created_at": datetime.utcnow()
        },
        {
            "_id": "DOC-DRSMITH",
            "email": "doctor@apollo.com",
            "hospital_id": "Noq-100001",
            "hospital_name": "Apollo Hospital",
            "department_id": "DEPT-001",
            "department_name": "Cardiology",
            "full_name": "Dr. Smith",
            "password_hash": hash_password("doctor@123"),
            "role": "doctor",
            "specialization": "Cardiologist",
            "status": "active",
            "created_at": datetime.utcnow()
        },
        {
            "_id": "PAT-GURU",
            "email": "patient@gmail.com",
            "full_name": "Guru Patient",
            "password_hash": hash_password("patient@123"),
            "role": "patient",
            "status": "active",
            "created_at": datetime.utcnow()
        },
    ]
    
    for u in users_data:
        await db.users.update_one({"email": u["email"]}, {"$set": u}, upsert=True)
        
    print("✓ MongoDB initialization completed!")

if __name__ == "__main__":
    asyncio.run(init_mongo())
