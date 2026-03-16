#!/usr/bin/env python3
from services import user_service

hm_users = user_service.get_all_users(role='hm')
print(f"HM Users in Firestore: {len(hm_users)}")
for i, hm in enumerate(hm_users[:3]):
    print(f"\n{i+1}. {hm.get('name')} ({hm.get('email')})")
    print(f"   - status: {hm.get('status')}")
    print(f"   - hospital_id: {hm.get('hospital_id')}")
    print(f"   - firebase_uid: {hm.get('firebase_uid')}")
    print(f"   - password_hash: {hm.get('password_hash')}")

print("\n--- Testing HM Authentication ---")
if hm_users:
    hm = hm_users[0]
    email = hm.get('email')
    
    # Debug: get the user again
    user = user_service.get_user_by_email(email)
    print(f"1. get_user_by_email('{email}'): {user.get('name') if user else 'None'}")
    print(f"   - role: '{user.get('role')}'")
    print(f"   - firebase_uid: '{user.get('firebase_uid')}'")
    print(f"   - password_hash: {user.get('password_hash')}")
    
    # Check role match
    if user.get('role') != 'hm':
        print(f"   ❌ ROLE MISMATCH: '{user.get('role')}' != 'hm'")
    
    result = user_service.authenticate_user(email, 'testpass', 'hm')
    print(f"\n2. authenticate_user result: {result}")

