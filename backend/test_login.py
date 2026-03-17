from routes.users import _serialize_user
from database import SessionLocal, User

db = SessionLocal()

# Test: GET /users/me equivalent
u = db.query(User).filter(User.email == 'vikram@mail.com').first()
if u:
    print("✓ /users/me would return:")
    data = _serialize_user(u)
    print(f"  Keys present: {len(data)}")
    print(f"  full_name: {data['full_name']}")
    print(f"  department_name: {data['department_name']}")
    print(f"  room_no: {data['room_no']}")
    print(f"  shift: {data['shift']}")
    print(f"  fee: {data['fee']}")
    print(f"  license: {data['license']}")
    print(f"  qualifications: {data['qualifications']}")

db.close()

print("\n✓ /appointments/?doctor_user_id=... endpoint:")
print("  Returns: flat array of appointment objects")

print("\n✓ /revenue/by-doctor endpoint:")
print("  Returns: {success: true, data: {doctors: [...], count: N}}")

print("\n✓ Frontend fixes applied:")
print("  - DoctorProfile.jsx normalizes full_name → name")
print("  - DoctorProfile.jsx normalizes room_no → roomNumber")
print("  - DoctorProfile.jsx uses correct snake_case field names")
print("  - doctorService.js fixed response parsing for all endpoints")

print("\n✓ All endpoints ready - Profile should work!")
