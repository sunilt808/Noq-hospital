import asyncio
import os
import sys
from datetime import datetime
from uuid import uuid4
from motor.motor_asyncio import AsyncIOMotorClient
import hashlib
import secrets
from dotenv import load_dotenv

load_dotenv()

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
    
    print("Testing connection...")
    try:
        await db.command("ping")
        print("✓ Successfully connected to MongoDB!")
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {e}")
        
    print("✓ MongoDB initialization completed! (Skipping predefined data per configuration)")

if __name__ == "__main__":
    asyncio.run(init_mongo())
