from database import SessionLocal, User
db = SessionLocal()
u = db.query(User).filter(User.email == 'vikram@mail.com').first()
if u:
    print("Doctor Profile Data for Vikram:")
    print(f"  full_name: {u.full_name}")
    print(f"  department_name: {u.department_name}")
    print(f"  room_no: {u.room_no}")
    print(f"  floor: {u.floor}")
    print(f"  shift: {u.shift}")
    print(f"  fee: {u.fee}")
    print(f"  license: {u.license}")
    print(f"  qualifications: {u.qualifications}")
else:
    print("User not found")
db.close()
