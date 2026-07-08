import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["noq_hospital_db"]
    user = await db.users.find_one({"email": "admin@noq.com"})
    if user:
        print("Found admin:", user)
    else:
        print("Admin not found!")

asyncio.run(main())
