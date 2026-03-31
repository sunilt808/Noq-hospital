
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def list_emails():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["noq_hospital_db"]
    hospitals = await db.hospitals.find({}).to_list(100)
    print("HOSPITAL EMAILS:")
    for h in hospitals:
        print(f"Email: {h.get('email')}, Status: {h.get('status')}")

if __name__ == "__main__":
    asyncio.run(list_emails())
