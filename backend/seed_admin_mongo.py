"""
seed_admin_mongo.py - Seed admin & test users directly into MongoDB
Run from the backend directory: python seed_admin_mongo.py
"""

import asyncio
import hashlib
import secrets
import os
from datetime import datetime
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "noq_hospital_db")

CREDENTIALS = [
    {"email": "admin@noq.com",      "password": "Admin@123",    "full_name": "System Admin",     "role": "admin"},
    {"email": "hm@apollo.com",      "password": "Hm@apollo1",   "full_name": "Apollo HM",        "role": "hm"},
    {"email": "doctor@apollo.com",  "password": "Doctor@123",   "full_name": "Apollo Doctor",    "role": "doctor"},
    {"email": "patient@test.com",   "password": "Patient@123",  "full_name": "Test Patient",     "role": "patient"},
]


def hash_password(password: str) -> str:
    salt = secrets.token_hex(32)
    pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}${pwd_hash.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, pwd_hash = password_hash.split("$", 1)
        computed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
        return computed.hex() == pwd_hash
    except Exception:
        return False


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users = db["users"]

    print(f"\nConnected to MongoDB: {MONGODB_URL} / {DATABASE_NAME}")
    print("=" * 60)

    for cred in CREDENTIALS:
        email = cred["email"].lower().strip()
        password = cred["password"]
        role = cred["role"]
        full_name = cred["full_name"]

        existing = await users.find_one({"email": email})

        new_hash = hash_password(password)
        assert verify_password(password, new_hash), f"Hash verification failed for {email}"

        if existing:
            await users.update_one(
                {"email": email},
                {"$set": {
                    "password_hash": new_hash,
                    "status": "active",
                    "updated_at": datetime.utcnow(),
                }}
            )
            print(f"  ✅ Updated  | {role:<10} | {email:<30} | password: {password}")
        else:
            doc = {
                "_id": str(uuid4()),
                "email": email,
                "password_hash": new_hash,
                "full_name": full_name,
                "role": role,
                "status": "active",
                "phone": None,
                "hospital_id": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            await users.insert_one(doc)
            print(f"  ✅ Created  | {role:<10} | {email:<30} | password: {password}")

    print("=" * 60)

    # Verify all logins work
    print("\n🔍 Verifying passwords...")
    for cred in CREDENTIALS:
        email = cred["email"].lower().strip()
        user = await users.find_one({"email": email})
        if user:
            ok = verify_password(cred["password"], user["password_hash"])
            status = user.get("status", "?")
            print(f"  {'✅' if ok else '❌'} {cred['role']:<10} | {email:<30} | status={status} | pw_ok={ok}")
        else:
            print(f"  ❌ NOT FOUND: {email}")

    print("\n✅ Done! You can now login with:")
    print("   admin@noq.com / Admin@123\n")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
