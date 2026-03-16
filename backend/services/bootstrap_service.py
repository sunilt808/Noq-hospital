from datetime import datetime
import hashlib
import os

from database import db
from services import user_service


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _hash_password(password: str) -> str:
    salt = os.environ.get("PASSWORD_SALT", "noq_salt_2026")
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()


def _ensure_hospital(hospital_id: str, name: str, email: str) -> None:
    ref = db.collection("hospitals").document(hospital_id)
    if ref.get().exists:
        return

    ref.set(
        {
            "id": hospital_id,
            "hospital_name": name,
            "hm_name": "System HM",
            "email": email,
            "phone": "0000000000",
            "category": "private",
            "address": "Default seeded hospital",
            "status": "APPROVED",
            "created_at": _now_iso(),
            "seeded": True,
        }
    )


def _ensure_admin_user() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@sunigmail.com").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "AdminSuni@484#")

    existing = user_service.get_user_by_email(admin_email)
    if existing and str(existing.get("role", "")).lower() == "admin":
        return

    if existing:
        user_service.update_user(
            existing.get("id"),
            {
                "role": "admin",
                "status": "active",
                "name": existing.get("name") or "System Admin",
                "password": admin_password,
            },
        )
        return

    user_id = "ADM-DEFAULT"
    firebase_uid = user_service._sync_firebase_auth_user(
        admin_email,
        password=admin_password,
        display_name="System Admin",
    )
    db.collection("users").document(user_id).set(
        {
            "id": user_id,
            "name": "System Admin",
            "email": admin_email,
            "role": "admin",
            "phone": None,
            "gender": None,
            "dob": None,
            "hospital_id": None,
            "specialization": None,
            "status": "active",
            "firebase_uid": firebase_uid,
            "password_hash": _hash_password(admin_password),
            "created_at": _now_iso(),
            "seeded": True,
        }
    )


def _ensure_default_doctor(default_hospital_id: str) -> None:
    doctor_email = os.environ.get("DEFAULT_DOCTOR_EMAIL", "doctor.default@noq.com").strip().lower()
    doctor_password = os.environ.get("DEFAULT_DOCTOR_PASSWORD", "Doctor@123")
    doctor_name = os.environ.get("DEFAULT_DOCTOR_NAME", "Default Doctor")

    existing = user_service.get_user_by_email(doctor_email)
    if existing and str(existing.get("role", "")).lower() == "doctor":
        updates = {
            "hospital_id": existing.get("hospital_id") or default_hospital_id,
            "specialization": existing.get("specialization") or "General Medicine",
            "status": "active",
            "name": existing.get("name") or doctor_name,
            "password": doctor_password,
        }
        user_service.update_user(existing.get("id"), updates)
        return

    if existing:
        user_service.update_user(
            existing.get("id"),
            {
                "role": "doctor",
                "hospital_id": default_hospital_id,
                "specialization": "General Medicine",
                "status": "active",
                "name": doctor_name,
                "password": doctor_password,
            },
        )
        return

    doctor_id = "DOC-DEFAULT"
    firebase_uid = user_service._sync_firebase_auth_user(
        doctor_email,
        password=doctor_password,
        display_name=doctor_name,
    )
    db.collection("users").document(doctor_id).set(
        {
            "id": doctor_id,
            "name": doctor_name,
            "email": doctor_email,
            "role": "doctor",
            "phone": None,
            "gender": None,
            "dob": None,
            "hospital_id": default_hospital_id,
            "specialization": "General Medicine",
            "status": "active",
            "firebase_uid": firebase_uid,
            "password_hash": _hash_password(doctor_password),
            "created_at": _now_iso(),
            "seeded": True,
        }
    )


def _ensure_specialized_doctors(default_hospital_id: str) -> None:
    """Seed doctors with various specializations for testing"""
    specializations = [
        {"spec": "Cardiology", "name": "Dr. Rajesh Kumar"},
        {"spec": "Neurology", "name": "Dr. Priya Singh"},
        {"spec": "Orthopedics", "name": "Dr. Amit Patel"},
        {"spec": "Pediatrics", "name": "Dr. Sarah Khan"},
        {"spec": "Dermatology", "name": "Dr. Ananya Verma"},
    ]

    for i, spec_info in enumerate(specializations):
        doctor_email = f"doctor.{spec_info['spec'].lower()}@noq.com"
        doctor_email = doctor_email.replace(" ", ".")
        full_email = doctor_email.strip().lower()

        existing = user_service.get_user_by_email(full_email)
        if existing and str(existing.get("role", "")).lower() == "doctor":
            # Update if exists
            updates = {
                "specialization": spec_info["spec"],
                "hospital_id": existing.get("hospital_id") or default_hospital_id,
                "status": "active",
                "name": existing.get("name") or spec_info["name"],
            }
            user_service.update_user(existing.get("id"), updates)
            continue

        # Create new doctor
        doctor_id = f"DOC-SEED-{i+1:03d}"
        firebase_uid = user_service._sync_firebase_auth_user(
            full_email,
            password="Doctor@123",
            display_name=spec_info["name"],
        )
        db.collection("users").document(doctor_id).set(
            {
                "id": doctor_id,
                "name": spec_info["name"],
                "email": full_email,
                "role": "doctor",
                "phone": f"+919876543{i:03d}",
                "gender": "Male" if i % 2 == 0 else "Female",
                "dob": None,
                "hospital_id": default_hospital_id,
                "specialization": spec_info["spec"],
                "department_name": spec_info["spec"],
                "status": "active",
                "available": True,
                "currentPatients": 0,
                "maxPatients": 20,
                "experience": 10 + i,
                "fee": 500,
                "consultationFee": 500,
                "firebase_uid": firebase_uid,
                "password_hash": _hash_password("Doctor@123"),
                "created_at": _now_iso(),
                "seeded": True,
            }
        )


def _ensure_collection_markers() -> None:
    marker = {
        "id": "_meta",
        "collection_ready": True,
        "created_at": _now_iso(),
        "seeded": True,
    }
    db.collection("audit_logs").document("_meta").set(marker, merge=True)
    db.collection("patient_proofs").document("_meta").set(marker, merge=True)


def _ensure_test_patient() -> str:
    """Ensure a test patient exists and return patient ID"""
    patient_email = "patient.test@noq.com"
    
    existing = user_service.get_user_by_email(patient_email)
    if existing and str(existing.get("role", "")).lower() == "patient":
        return existing.get("id")
    
    if existing:
        user_service.update_user(
            existing.get("id"),
            {
                "role": "patient",
                "status": "active",
                "name": existing.get("name") or "Test Patient",
            },
        )
        return existing.get("id")
    
    patient_id = "PAT-TEST-001"
    firebase_uid = user_service._sync_firebase_auth_user(
        patient_email,
        password="Patient@123",
        display_name="Test Patient",
    )
    db.collection("users").document(patient_id).set(
        {
            "id": patient_id,
            "name": "Test Patient",
            "email": patient_email,
            "role": "patient",
            "phone": "+919876543210",
            "gender": "Male",
            "dob": "1990-05-15",
            "status": "active",
            "firebase_uid": firebase_uid,
            "password_hash": _hash_password("Patient@123"),
            "created_at": _now_iso(),
            "seeded": True,
        }
    )
    return patient_id


def _ensure_test_bills(patient_id: str, doctor_id: str, hospital_id: str) -> None:
    """Seed test bills"""
    existing = list(db.collection("bills").where("patientId", "==", patient_id).limit(1).stream())
    if existing:
        return
    
    bills_data = [
        {
            "id": db.collection("bills").document().id,
            "patientId": patient_id,
            "doctorId": doctor_id,
            "hospitalId": hospital_id,
            "amount": 500.0,
            "description": "General consultation - Initial visit",
            "status": "paid",
            "date": _now_iso(),
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        },
        {
            "id": db.collection("bills").document().id,
            "patientId": patient_id,
            "doctorId": doctor_id,
            "hospitalId": hospital_id,
            "amount": 1500.0,
            "description": "Lab tests and diagnosis",
            "status": "pending",
            "date": _now_iso(),
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        },
        {
            "id": db.collection("bills").document().id,
            "patientId": patient_id,
            "doctorId": doctor_id,
            "hospitalId": hospital_id,
            "amount": 2000.0,
            "description": "Treatment procedure",
            "status": "pending",
            "date": _now_iso(),
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        },
    ]
    
    for bill in bills_data:
        bill_id = bill.pop("id")
        db.collection("bills").document(bill_id).set(bill)


def _ensure_test_prescriptions(patient_id: str, doctor_id: str) -> None:
    """Seed test prescriptions"""
    from datetime import timedelta
    
    existing = list(db.collection("prescriptions").where("patientId", "==", patient_id).limit(1).stream())
    if existing:
        return
    
    expiry_date = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
    
    prescriptions_data = [
        {
            "id": db.collection("prescriptions").document().id,
            "patientId": patient_id,
            "doctorId": doctor_id,
            "medication": "Aspirin",
            "dosage": "500mg",
            "duration": "2 weeks",
            "notes": "Take once daily after food",
            "status": "active",
            "issuedDate": _now_iso(),
            "expiryDate": expiry_date,
            "refillsRemaining": 2,
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        },
        {
            "id": db.collection("prescriptions").document().id,
            "patientId": patient_id,
            "doctorId": doctor_id,
            "medication": "Amoxicillin",
            "dosage": "250mg",
            "duration": "1 week",
            "notes": "Take twice daily with water",
            "status": "active",
            "issuedDate": _now_iso(),
            "expiryDate": expiry_date,
            "refillsRemaining": 0,
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        },
    ]
    
    for prescription in prescriptions_data:
        prescription_id = prescription.pop("id")
        db.collection("prescriptions").document(prescription_id).set(prescription)


def ensure_bootstrap_data() -> None:
    default_hospital_id = os.environ.get("DEFAULT_HOSPITAL_ID", "NOQ-PRI-B4889").strip() or "NOQ-PRI-B4889"
    _ensure_hospital(default_hospital_id, "NOQ Default Private Hospital", "hospital.default@noq.com")
    _ensure_admin_user()
    _ensure_default_doctor(default_hospital_id)
    _ensure_specialized_doctors(default_hospital_id)
    _ensure_collection_markers()
    
    # Seed test data for bills and prescriptions
    test_patient_id = _ensure_test_patient()
    test_doctor_id = "DOC-DEFAULT"
    _ensure_test_bills(test_patient_id, test_doctor_id, default_hospital_id)
    _ensure_test_prescriptions(test_patient_id, test_doctor_id)
