import requests
import json

# Test signup
signup_data = {
    "email": "freshtest@hospital.com",
    "password": "FreshTest@2024",
    "full_name": "Fresh Test Doctor",
    "phone": "9876543210",
    "role": "doctor",
    "hospital_id": "Noq-200004"
}

print("📝 Attempting doctor signup...")
resp = requests.post("http://127.0.0.1:8001/auth/signup", json=signup_data)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    data = resp.json()
    print(f"✅ Signup SUCCESS")
    print(f"   Email: {data['data']['email']}")
    print(f"   Hospital: {data['data']['hospital_id']}")
    token = data['data']['token']
    print(f"   Token: {token[:40]}...")
    
    # Test login
    print("\n🔐 Attempting login...")
    login_data = {
        "email": "freshtest@hospital.com",
        "password": "FreshTest@2024"
    }
    resp2 = requests.post("http://127.0.0.1:8001/auth/login", json=login_data)
    print(f"Status: {resp2.status_code}")
    
    if resp2.status_code == 200:
        data2 = resp2.json()
        print(f"✅ Login SUCCESS")
        print(f"   Email: {data2['data']['email']}")
        print(f"   Hospital: {data2['data']['hospital_id']}")
    else:
        print(f"❌ Login FAILED: {resp2.json()}")
else:
    print(f"❌ Signup FAILED: {resp.json()}")
