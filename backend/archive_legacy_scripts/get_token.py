#!/usr/bin/env python
from database import SessionLocal, User
from services.auth_service import AuthService

db = SessionLocal()
doc = db.query(User).filter(User.email == 'guru@mail.com').first()

if doc:
    token = AuthService.create_access_token({'sub': doc.id})
    print('Generated JWT Token:')
    print(token)
    print('\nTest command:')
    print(f'curl -H "Authorization: Bearer {token}" http://127.0.0.1:8001/users/me')
else:
    print('Doctor not found')

db.close()
