import sqlite3
from services.auth_service import AuthService
from datetime import datetime

DB_PATH = "noq_hospital.db"
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Hash the new password
new_password = "Guru@1234"
password_hash = AuthService.hash_password(new_password)

# Update guru user
c.execute("""
    UPDATE users 
    SET password_hash = ?, updated_at = ?
    WHERE email = ?
""", (password_hash, datetime.utcnow().isoformat(), "guru@mail.com"))

conn.commit()

# Verify
c.execute("SELECT email, role, hospital_id FROM users WHERE email = ?", ("guru@mail.com",))
row = c.fetchone()
if row:
    print(f"✅ Password reset successful for {row[0]}")
    print(f"   Email: {row[0]}")
    print(f"   Role: {row[1]}")
    print(f"   Hospital: {row[2]}")
    print(f"\n✓ You can now login with:")
    print(f"   Email: guru@mail.com")
    print(f"   Password: Guru@1234")
else:
    print("❌ User not found")

conn.close()
