import sqlite3
import hashlib
import secrets

DB_PATH = r'd:\nqrpro\backend\noq_hospital.db'

def hash_password(password: str) -> str:
    salt = secrets.token_hex(32)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}${pwd_hash.hex()}"

def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, pwd_hash = password_hash.split('$', 1)
        computed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return computed.hex() == pwd_hash
    except:
        return False

c = sqlite3.connect(DB_PATH)
c.row_factory = sqlite3.Row

# Show all users
rows = c.execute("SELECT id, email, role, status, password_hash FROM users").fetchall()
print("\n=== Current Users ===")
for r in rows:
    d = dict(r)
    print(f"  {d['role']:<10} | {d['email']:<30} | status={d['status']}")

print("\n=== Resetting Passwords ===")

# Credentials map: email -> new password
CREDENTIALS = {
    'admin@noq.com':      'Admin@123',
    'hm@apollo.com':      'Hm@apollo1',
    'doctor@apollo.com':  'Doctor@123',
    'patient@test.com':   'Patient@123',
}

for email, new_pass in CREDENTIALS.items():
    new_hash = hash_password(new_pass)
    # Verify the hash works
    assert verify_password(new_pass, new_hash), f"Hash verification failed for {email}"
    
    result = c.execute(
        "UPDATE users SET password_hash=?, status='active' WHERE email=?",
        (new_hash, email)
    )
    if result.rowcount > 0:
        print(f"  ✅ Reset {email} -> password: {new_pass}")
    else:
        print(f"  ⚠️  User not found: {email} — creating admin if needed")
        if email == 'admin@noq.com':
            import uuid
            uid = str(uuid.uuid4())
            c.execute("""
                INSERT INTO users (id, email, password_hash, full_name, role, status, created_at, updated_at)
                VALUES (?, ?, ?, 'System Admin', 'admin', 'active', datetime('now'), datetime('now'))
            """, (uid, email, new_hash))
            print(f"  ✅ Created admin {email}")

c.commit()

print("\n=== Verifying Passwords ===")
rows = c.execute("SELECT email, role, status, password_hash FROM users").fetchall()
for r in rows:
    d = dict(r)
    cred_pass = CREDENTIALS.get(d['email'])
    if cred_pass:
        ok = verify_password(cred_pass, d['password_hash'])
        print(f"  {d['role']:<10} | {d['email']:<30} | status={d['status']} | password_ok={ok}")

c.close()
print("\nDone!")
