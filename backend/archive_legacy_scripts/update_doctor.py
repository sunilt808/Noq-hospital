#!/usr/bin/env python
from database import SessionLocal, User

db = SessionLocal()
doctor = db.query(User).filter(User.email == 'guru@mail.com').first()

if doctor:
    doctor.department_name = 'Cardiology'
    doctor.shift = 'morning'
    doctor.fee = 500.0
    doctor.license = 'GURU-LIC-102'
    doctor.qualifications = 'MBBS, MD'
    doctor.room_no = '102'
    doctor.floor = '2'
    db.commit()
    print('✓ Updated guru doctor profile')
    print(f'  - Department: {doctor.department_name}')
    print(f'  - Shift: {doctor.shift}')
    print(f'  - Fee: {doctor.fee}')
    print(f'  - License: {doctor.license}')
    print(f'  - Qualifications: {doctor.qualifications}')
    print(f'  - Room: {doctor.room_no}')
    print(f'  - Floor: {doctor.floor}')
else:
    print('Doctor not found')

db.close()
