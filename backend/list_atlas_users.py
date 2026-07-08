import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv('MONGODB_URL'))
    db = client[os.getenv('DATABASE_NAME')]
    print('Users in Atlas:')
    async for u in db.users.find():
        print(f"Role: {u.get('role')} | Email: {u.get('email')} | Name: {u.get('full_name')}")
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
