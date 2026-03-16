#!/usr/bin/env python3
"""Test HM login through the API."""

import requests
import json
import time

time.sleep(2)  # Wait for server to start

url = "http://127.0.0.1:8000/auth/login"
payload = {
    "email": "pruthvika@mail.com",
    "password": "Password123",
    "role": "hm"
}

print("=" * 60)
print("HM LOGIN TEST")
print("=" * 60)
print(f"\nPOST {url}")
print(f"Payload: {json.dumps(payload, indent=2)}")

try:
    response = requests.post(url, json=payload)
    print(f"\nStatus: {response.status_code}")
    
    data = response.json()
    print(f"Response:")
    print(json.dumps(data, indent=2))
    
    if response.status_code == 200 and data.get("success"):
        user_data = data.get("data", {}).get("user", {})
        token = data.get("data", {}).get("token", "")
        
        print("\n" + "=" * 60)
        print("✅ LOGIN SUCCESSFUL")
        print("=" * 60)
        print(f"\nUser: {user_data.get('name')} ({user_data.get('role')})")
        print(f"Email: {user_data.get('email')}")
        print(f"Hospital ID: {user_data.get('hospital_id')}")
        print(f"Token: {token[:50]}...")
        
        # Test using the token to fetch hospitals
        print("\n\nTesting token by fetching hospitals...")
        headers = {"Authorization": f"Bearer {token}"}
        hospitals_response = requests.get(
            "http://127.0.0.1:8000/hospitals/available",
            headers=headers
        )
        print(f"Hospitals response status: {hospitals_response.status_code}")
        hospitals_data = hospitals_response.json()
        print(f"Hospitals: {json.dumps(hospitals_data, indent=2)[:200]}...")
        
    else:
        print(f"\n❌ LOGIN FAILED")
        
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
