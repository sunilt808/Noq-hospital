#!/usr/bin/env python3
"""Reset passwords for test users."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import create_engine, text
from services.auth_service import AuthService

e = create_engine('sqlite:///noq_hospital.db')
new_hash = AuthService.hash_password('Test@1234')

with e.begin() as conn:
    conn.execute(
        text("UPDATE users SET password_hash = :h WHERE email IN ('putti@mail.com', 'vikram@mail.com', 'siri@mail.com')"),
        {'h': new_hash}
    )

print('✓ Passwords reset to Test@1234 for putti@mail.com, vikram@mail.com, siri@mail.com')

with e.connect() as conn:
    rows = conn.execute(
        text("SELECT email, role, hospital_id, status FROM users WHERE email IN ('putti@mail.com', 'vikram@mail.com', 'siri@mail.com')")
    ).fetchall()
    for r in rows:
        print(f"  {r[0]} | role={r[1]} | hospital_id={r[2]} | status={r[3]}")
