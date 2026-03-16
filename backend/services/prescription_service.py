"""
Prescription Service - Handle patient prescriptions
"""

from datetime import datetime, timedelta
from database import db


def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def create_prescription(patient_id: str, doctor_id: str, medication: str, 
                       dosage: str, duration: str, notes: str = None) -> dict:
    """Create a new prescription"""
    prescription_id = db.collection("prescriptions").document().id
    
    # Calculate expiry date (30 days from now by default)
    expiry_date = (datetime.utcnow() + timedelta(days=30)).isoformat() + "Z"
    
    prescription_data = {
        "id": prescription_id,
        "patientId": str(patient_id),
        "doctorId": str(doctor_id),
        "medication": medication,
        "dosage": dosage,
        "duration": duration,
        "notes": notes or "",
        "status": "active",  # active, completed, expired, cancelled
        "issuedDate": _now_iso(),
        "expiryDate": expiry_date,
        "refillsRemaining": 3,
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
    }
    
    db.collection("prescriptions").document(prescription_id).set(prescription_data)
    return prescription_data


def get_patient_prescriptions(patient_id: str) -> list:
    """Get all prescriptions for a patient"""
    docs = db.collection("prescriptions").where("patientId", "==", str(patient_id)).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def get_active_prescriptions(patient_id: str) -> list:
    """Get active prescriptions for a patient"""
    docs = db.collection("prescriptions").where("patientId", "==", str(patient_id))\
                                          .where("status", "==", "active").stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def get_doctor_prescriptions(doctor_id: str) -> list:
    """Get all prescriptions written by a doctor"""
    docs = db.collection("prescriptions").where("doctorId", "==", str(doctor_id)).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]


def update_prescription_status(prescription_id: str, status: str) -> dict:
    """Update prescription status"""
    prescription_ref = db.collection("prescriptions").document(prescription_id)
    prescription_ref.update({
        "status": status,
        "updatedAt": _now_iso(),
    })
    prescription = prescription_ref.get().to_dict()
    return {"id": prescription_id, **prescription}


def request_refill(prescription_id: str) -> dict:
    """Request a refill for a prescription"""
    prescription_ref = db.collection("prescriptions").document(prescription_id)
    prescription = prescription_ref.get().to_dict()
    
    refills = max(0, int(prescription.get("refillsRemaining", 0)) - 1)
    
    prescription_ref.update({
        "refillsRemaining": refills,
        "updatedAt": _now_iso(),
    })
    
    updated = prescription_ref.get().to_dict()
    return {"id": prescription_id, **updated}


def get_expiring_prescriptions(patient_id: str, days: int = 7) -> list:
    """Get prescriptions expiring within X days"""
    now = datetime.utcnow()
    expiry_threshold = (now + timedelta(days=days)).isoformat()
    
    in_range = []
    docs = db.collection("prescriptions").where("patientId", "==", str(patient_id))\
                                          .where("status", "==", "active").stream()
    
    for doc in docs:
        data = doc.to_dict()
        expiry = data.get("expiryDate", "")
        if expiry and expiry <= expiry_threshold:
            in_range.append({"id": doc.id, **data})
    
    return in_range
