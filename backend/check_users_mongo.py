import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_users():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["noq_hospital_db"]
    users = await db.users.find().to_list(length=100)
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"ID: {u.get('_id')}, Name: {u.get('full_name')}, Role: {u.get('role')}, Email: {u.get('email')}")

if __name__ == "__main__":
    asyncio.run(check_users())
