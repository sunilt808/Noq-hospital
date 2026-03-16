#!/usr/bin/env python3
"""Test auth flow end-to-end"""
import sys
sys.path.insert(0, '.')

from services import user_service, auth_service

print("=" * 60)
print("TESTING HM AUTH FLOW")
print("=" * 60)

# Step 1: Get HM user
email = 'putti@mail.com'
password = 'anything'
role = 'hm'

print(f"\n1. Authenticating: {email} / {role}")
user = user_service.authenticate_user(email, password, role)
if user:
    print(f"   ✅ User authenticated: {user.get('name')}")
    print(f"      - ID: {user.get('id')}")
    print(f"      - Hospital: {user.get('hospital_id')}")
else:
    print(f"   ❌ Authentication failed")
    sys.exit(1)

# Step 2: Create token
print(f"\n2. Creating access token")
try:
    token_payload = {
        "sub": user.get("id"),
        "email": user.get("email"),
        "role": user.get("role")
    }
    print(f"   Payload: {token_payload}")
    token = auth_service.create_access_token(token_payload)
    print(f"   ✅ Token created: {token[:50]}...")
except Exception as e:
    print(f"   ❌ ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Step 3: Format response
print(f"\n3. Formatting response")
response = {
    "success": True,
    "message": "Login successful.",
    "data": {
        "user": user,
        "token": token
    }
}
print(f"   ✅ Response ready")
print(f"      - User: {response['data']['user']['name']}")
print(f"      - Token length: {len(token)}")

print("\n" + "=" * 60)
print("✅ AUTH FLOW SUCCESSFUL")
print("=" * 60)
