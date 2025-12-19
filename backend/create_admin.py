"""
Script to create admin user after deployment
Run this once after deploying to initialize admin account
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'kayicom')

if not mongo_url:
    print("❌ Error: MONGO_URL environment variable not set")
    print("Please set MONGO_URL environment variable")
    exit(1)

try:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
except Exception as e:
    print(f"❌ Error connecting to MongoDB: {e}")
    exit(1)

async def create_admin():
    """Create admin user if it doesn't exist"""
    try:
        # Check if admin already exists
        existing = await db.users.find_one({"email": "admin@kayicom.com"})
        
        if existing:
            print("✅ Admin user already exists!")
            print(f"📧 Email: {existing.get('email')}")
            return
        
        # Create admin user
        hashed_password = pwd_context.hash("admin123")
        
        admin_user = {
            "id": "admin-001",
            "email": "admin@kayicom.com",
            "full_name": "Admin User",
            "password": hashed_password,
            "role": "admin",
            "referral_code": "ADMIN001",
            "referral_balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.users.insert_one(admin_user)
        print("✅ Admin user created successfully!")
        print("📧 Email: admin@kayicom.com")
        print("🔑 Password: admin123")
        print("⚠️  IMPORTANT: Change password after first login!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        raise
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())

