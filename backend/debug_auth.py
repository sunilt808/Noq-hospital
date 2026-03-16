#!/usr/bin/env python3
"""Debug authentication."""

import sys
sys.path.insert(0, '.')

from services.user_service import get_user_by_email, _hash_password

email = "pruthvika@mail.com"
password = "Password123"

print(f"Testing get_user_by_email('{email}')...")
user = get_user_by_email(email)
if user:
    print(f"[OK] Found user: {user['name']} (ID: {user['id']})")
    print(f"  Email in cache: {user.get('email')}")
    print(f"  Role: {user.get('role')}")
    print(f"  Password hash in cache: {user.get('password_hash')[:20]}...")
    
    # Check if password hash matches
    test_hash = _hash_password(password)
    print(f"\n  Password hash computed: {test_hash[:20]}...")
    print(f"  Match: {test_hash == user.get('password_hash')}")
    
else:
    print(f"[FAIL] User not found")
