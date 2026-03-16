import jwt
import os
from database import db
from services import auth_service

# Demo: simulate what the backend does
# Create a test token for a patient
patient_id = "PAT-9998B1550938"
test_payload = {
    "sub": patient_id,
    "email": "test@test.com",
    "role": "patient",
    "name": "Test Patient"
}

token = auth_service.create_access_token(test_payload)
print(f"✅ Test token created for patient: {patient_id}")

# Decode it back
decoded = auth_service.decode_access_token(token)
print(f"   Decoded 'sub': {decoded.get('sub')}")

# Query Firebase with this ID
appointments_ref = db.collection("appointments")
query = appointments_ref.where("patientId", "==", patient_id)
appts = list(query.stream())
print(f"✅ Appointments found for {patient_id}: {len(appts)}")

# Try the other patient ID
other_id = "PAT-B58E3F358EA3"
query2 = appointments_ref.where("patientId", "==", other_id)
appts2 = list(query2.stream())
print(f"✅ Appointments found for {other_id}: {len(appts2)}")

if appts2:
    print(f"   Appointment: {appts2[0].to_dict()}")
