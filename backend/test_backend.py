#!/usr/bin/env python
from services import user_service

hospitals = user_service.get_all_hospitals()
departments = user_service.get_all_departments()
doctors = user_service.get_all_doctors()

print(f"✓ Hospitals: {len(hospitals)}")
print(f"✓ Departments: {len(departments)}")
print(f"✓ Doctors: {len(doctors)}")

if hospitals:
    name = hospitals[0].get("hospital_name", hospitals[0].get("id", ""))
    print(f"  Sample hospital: {str(name)[:40]}")

if departments:
    name = departments[0].get("department_name", departments[0].get("name", ""))
    print(f"  Sample dept: {str(name)[:40]}")

if doctors:
    name = doctors[0].get("name", doctors[0].get("id", ""))
    print(f"  Sample doctor: {str(name)[:40]}")

print("\n✓ Backend data service working!")
