#!/usr/bin/env python3
"""Debug authenticate_user."""

import sys
sys.path.insert(0, '.')

from services.user_service import authenticate_user

email = "pruthvika@mail.com"
password = "Password123"
role = "hm"

print(f"Testing authenticate_user('{email}', '{password}', '{role}')...")
result = authenticate_user(email, password, role)
if result:
    print(f"[OK] Authentication succeeded")
    print(f"  User: {result.get('name')} (ID: {result.get('id')})")
    print(f"  Role: {result.get('role')}")
    print(f"  Email: {result.get('email')}")
else:
    print(f"[FAIL] Authentication failed")
    
    # Debug step by step
    from services.user_service import get_user_by_email, _hash_password
    
    print("\n[DEBUG] Step-by-step:")
    user = get_user_by_email(email)
    print(f"1. User found: {user is not None}")
    
    if user:
        print(f"2. User role: {user.get('role')} vs requested: {role}")
        print(f"   Match: {user.get('role') == role}")
        
        stored_hash = user.get('password_hash')
        print(f"3. Password hash exists: {stored_hash is not None}")
        
        if stored_hash:
            computed = _hash_password(password)
            print(f"   Stored hash: {stored_hash[:20]}...")
            print(f"   Computed: {computed[:20]}...")
            print(f"   Match: {stored_hash == computed}")
            
        print(f"4. Firebase UID: {user.get('firebase_uid')}")
