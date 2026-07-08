import requests

login_data = {
    "email": "guru@mail.com",
    "password": "Guru@1234"
}

print("🔐 Testing guru@mail.com login...")
resp = requests.post("http://127.0.0.1:8001/auth/login", json=login_data)
print(f"Status: {resp.status_code}")

if resp.status_code == 200:
    data = resp.json()
    print(f"✅ LOGIN SUCCESS!")
    print(f"   Email: {data['data']['email']}")
    print(f"   Role: {data['data']['role']}")
    print(f"   Hospital: {data['data']['hospital_id']}")
    print(f"   Token: {data['data']['token'][:40]}...")
else:
    print(f"❌ Login failed: {resp.json()}")
