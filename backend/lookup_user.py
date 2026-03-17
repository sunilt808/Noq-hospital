#!/usr/bin/env python
import sqlite3

user_id = "b41f5abd-e232-4a05-8ee7-f6108e15ba7a"
conn = sqlite3.connect("noq_hospital.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("""
    SELECT id, email, full_name, role, hospital_id, phone, status, created_at
    FROM users 
    WHERE id = ?
""", (user_id,))

row = cursor.fetchone()

if row:
    print("=== USER FOUND ===")
    print(f"ID:          {row['id']}")
    print(f"Email:       {row['email']}")
    print(f"Name:        {row['full_name']}")
    print(f"Role:        {row['role']}")
    print(f"Hospital:    {row['hospital_id'] or 'N/A'}")
    print(f"Phone:       {row['phone'] or 'N/A'}")
    print(f"Status:      {row['status']}")
    print(f"Created:     {row['created_at']}")
else:
    print(f"USER NOT FOUND: {user_id}")

conn.close()
