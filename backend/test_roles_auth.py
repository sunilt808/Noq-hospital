import requests
import json

BASE_URL = "http://localhost:8000"

def test_login(email, password, role):
    print(f"Testing login for {role} ({email})...")
    try:
        url = f"{BASE_URL}/auth/login"
        payload = {
            "email": email,
            "password": password,
            "role": role
        }
        res = requests.post(url, json=payload)
        if res.status_code == 200:
            data = res.json()
            if data.get("success"):
                token = data.get("data", {}).get("token")
                print(f"✓ Login successful! Token: {token[:20]}...")
                return token
            else:
                print(f"✗ Login failed: {data.get('message')}")
        else:
            print(f"✗ HTTP {res.status_code}: {res.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    return None

if __name__ == "__main__":
    roles = [
        ("admin@noq.com", "admin@123", "admin"),
        ("hm@apollo.com", "hm@123", "hm"),
        ("doctor@apollo.com", "doctor@123", "doctor"),
        ("patient@gmail.com", "patient@123", "patient"),
    ]
    
    tokens = {}
    for email, password, role in roles:
        token = test_login(email, password, role)
        if token:
            tokens[role] = token
    
    print("\nFinal Result:")
    for role, found in [(r[2], r[2] in tokens) for r in roles]:
        status = "WORKING" if found else "FAILED"
        print(f"Role {role:7}: {status}")
