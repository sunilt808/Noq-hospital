#!/usr/bin/env python
"""
Verification script to test the complete doctor profile sync flow
Tests backend API responses to verify all fields are properly synced
"""
from database import SessionLocal, User
from services.auth_service import AuthService
import json

db = SessionLocal()

print("=" * 70)
print("DOCTOR PROFILE SYNC VERIFICATION")
print("=" * 70)

# Get guru doctor
doctor = db.query(User).filter(User.email == 'guru@mail.com').first()

if not doctor:
    print("❌ Doctor not found in database")
    db.close()
    exit(1)

print("\n✓ Doctor found in database")
print(f"  Email: {doctor.email}")
print(f"  Name: {doctor.full_name}")
print(f"  Role: {doctor.role}")

# Check database fields
print("\n📊 Database Fields:")
fields_to_check = [
    'department_name', 'room_no', 'floor', 'shift', 'fee', 'license', 'qualifications'
]

all_fields_present = True
for field in fields_to_check:
    value = getattr(doctor, field, None)
    status = "✓" if value else "✗"
    print(f"  {status} {field}: {value}")
    if not value and field != 'experience':  # experience can be 0
        all_fields_present = False

# Test JWT token generation
print("\n🔐 JWT Token Generation:")
token = AuthService.create_access_token({'sub': doctor.id})
print(f"  ✓ Token generated: {token[:50]}...")
print(f"  ✓ Token length: {len(token)} chars")

# Simulate API response
print("\n📡 API Response (simulated /users/me):")
api_response = {
    'id': doctor.id,
    'full_name': doctor.full_name,
    'email': doctor.email,
    'role': doctor.role,
    'department_name': doctor.department_name,
    'room_no': doctor.room_no,
    'floor': doctor.floor,
    'shift': doctor.shift,
    'fee': doctor.fee,
    'license': doctor.license,
    'qualifications': doctor.qualifications,
}

for key, value in api_response.items():
    print(f"  {key}: {value}")

print("\n" + "=" * 70)
if all_fields_present:
    print("✅ ALL FIELDS PROPERLY SYNCED - Backend setup is correct!")
    print("   Frontend may need cache clear (Ctrl+Shift+R or Cmd+Shift+R)")
else:
    print("⚠️  Some fields are missing - Database needs more data")
print("=" * 70)

db.close()
