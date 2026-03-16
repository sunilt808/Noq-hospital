#!/usr/bin/env python3
from services import user_service
import hashlib
import os

def _hash_password(password: str) -> str:
    salt = os.environ.get("PASSWORD_SALT", "noq_salt_2026")
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

# Get the doctor
user = user_service.get_user_by_email('ravi@mail.com')
stored_hash = user.get('password_hash')
print(f"Stored password_hash for Ravi: {stored_hash}")

# Try some common passwords
test_passwords = ['test123', 'password', 'ravi', '123456', '', 'doctor']
for test_pwd in test_passwords:
    hashed = _hash_password(test_pwd)
    if hashed == stored_hash:
        print(f"✅ PASSWORD MATCH: '{test_pwd}'")
        break
    else:
        print(f"  '{test_pwd}' → {hashed[:20]}... (no match)")

# Test if plaintext matches
if user.get('password_hash') == '':
    print("  Stored hash is empty or None")

