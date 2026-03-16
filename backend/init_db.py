#!/usr/bin/env python3
# backend/init_db.py - Database Initialization Script

import os
import sys
from datetime import datetime
from uuid import uuid4

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from database import create_tables, get_db, SessionLocal, User, Hospital, Department, Doctor
from services.auth_service import AuthService


def seed_hospitals(db):
    """Seed initial hospitals."""
    hospitals_data = [
        {
            "id": "HOSP-001",
            "name": "Apollo Hospital",
            "address": "123 Medical Street",
            "phone": "+91-22-4950-4950",
            "email": "apollo@hospitalsol.com",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
        },
        {
            "id": "HOSP-002",
            "name": "Max Healthcare",
            "address": "456 Health Lane",
            "phone": "+91-11-4141-4141",
            "email": "info@maxhealthcare.com",
            "city": "Delhi",
            "state": "Delhi",
            "pincode": "110001",
        },
        {
            "id": "HOSP-003",
            "name": "Fortis Hospital",
            "address": "789 Care Avenue",
            "phone": "+91-80-2211-7777",
            "email": "fortis@healthcare.com",
            "city": "Bangalore",
            "state": "Karnataka",
            "pincode": "560001",
        },
    ]
    
    for h_data in hospitals_data:
        existing = db.query(Hospital).filter(Hospital.id == h_data["id"]).first()
        if not existing:
            hospital = Hospital(**h_data)
            db.add(hospital)
    
    db.commit()
    print(f"✓ Seeded {len(hospitals_data)} hospitals")


def seed_departments(db):
    """Seed initial departments."""
    departments_data = [
        {"id": "DEPT-001", "hospital_id": "HOSP-001", "name": "Cardiology", "description": "Heart and cardio-vascular care"},
        {"id": "DEPT-002", "hospital_id": "HOSP-001", "name": "Neurology", "description": "Nervous system care"},
        {"id": "DEPT-003", "hospital_id": "HOSP-001", "name": "Orthopedic", "description": "Bone and joint care"},
        {"id": "DEPT-004", "hospital_id": "HOSP-002", "name": "Cardiology", "description": "Heart and cardio-vascular care"},
        {"id": "DEPT-005", "hospital_id": "HOSP-002", "name": "General Surgery", "description": "General surgical procedures"},
        {"id": "DEPT-006", "hospital_id": "HOSP-003", "name": "Pediatrics", "description": "Child care"},
    ]
    
    for d_data in departments_data:
        existing = db.query(Department).filter(Department.id == d_data["id"]).first()
        if not existing:
            department = Department(**d_data)
            db.add(department)
    
    db.commit()
    print(f"✓ Seeded {len(departments_data)} departments")


def seed_admin_user(db):
    """Seed admin user."""
    admin_email = "admin@noq.com"
    existing = db.query(User).filter(User.email == admin_email).first()
    
    if not existing:
        admin = User(
            id=str(uuid4()),
            email=admin_email,
            password_hash= AuthService.hash_password("admin@123"),
            full_name="Admin User",
            role="admin",
            status="active",
        )
        db.add(admin)
        db.commit()
        print(f"✓ Created admin user: {admin_email}")
    else:
        print(f"✓ Admin user already exists: {admin_email}")


def seed_hm_users(db):
    """Seed Hospital Manager users."""
    hm_users = [
        {
            "email": "hm@apollo.com",
            "hospital_id": "HOSP-001",
            "full_name": "Apollo Manager",
            "password": "hm@123",
        },
        {
            "email": "hm@max.com",
            "hospital_id": "HOSP-002",
            "full_name": "Max Manager",
            "password": "hm@123",
        },
    ]
    
    for user_data in hm_users:
        existing = db.query(User).filter(User.email == user_data["email"]).first()
        if not existing:
            user = User(
                id=str(uuid4()),
                email=user_data["email"],
                password_hash=AuthService.hash_password(user_data["password"]),
                full_name=user_data["full_name"],
                role="hm",
                hospital_id=user_data["hospital_id"],
                status="active",
            )
            db.add(user)
    
    db.commit()
    print(f"✓ Created {len(hm_users)} hospital manager users")


def init_database():
    """Initialize database with tables and seed data."""
    try:
        print("\n" + "="*60)
        print("  NOQ Hospital - Database Initialization")
        print("="*60 + "\n")
        
        # Create tables
        print("1. Creating database tables...")
        create_tables()
        print("✓ Database tables created")
        
        # Get database session
        db = SessionLocal()
        
        try:
            # Seed data
            print("\n2. Seeding initial data...")
            seed_hospitals(db)
            seed_departments(db)
            seed_admin_user(db)
            seed_hm_users(db)
            
            print("\n" + "="*60)
            print("✓ Database initialization completed successfully!")
            print("="*60 + "\n")
            
            print("Test Credentials:")
            print("  Admin: admin@noq.com / admin@123")
            print("  HM (Apollo): hm@apollo.com / hm@123")
            print("  HM (Max): hm@max.com / hm@123")
            print()
            
        finally:
            db.close()
        
        return 0
        
    except Exception as e:
        print(f"\n✗ Database initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(init_database())
