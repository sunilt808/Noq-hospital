"""
Prescription Service - Handle patient prescriptions (MongoDB)
"""

from datetime import datetime, timedelta
from database import mongodb
import uuid

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

async def create_prescription(patient_id: str, doctor_id: str, medication: str, 
                       dosage: str, duration: str, notes: str = None) -> dict:
    """Create a new prescription in MongoDB."""
    if mongodb is None: return {}
    
    prescription_id = f"PRSC-{uuid.uuid4().hex[:12].upper()}"
    now = datetime.utcnow()
    expiry_date = now + timedelta(days=30)
    
    prescription_data = {
        "_id": prescription_id,
        "id": prescription_id,
        "patientId": str(patient_id),
        "doctorId": str(doctor_id),
        "medication": medication,
        "dosage": dosage,
        "duration": duration,
        "notes": notes or "",
        "status": "active",  # active, completed, expired, cancelled
        "issuedDate": now,
        "expiryDate": expiry_date,
        "refillsRemaining": 3,
        "createdAt": now,
        "updatedAt": now,
    }
    
    await mongodb.prescriptions.insert_one(prescription_data)
    return prescription_data

async def get_patient_prescriptions(patient_id: str) -> list:
    """Get all prescriptions for a patient from MongoDB."""
    if mongodb is None: return []
    cursor = mongodb.prescriptions.find({"patientId": str(patient_id)})
    items = await cursor.to_list(length=1000)
    for i in items: i["id"] = str(i.get("_id", i.get("id")))
    return items

async def get_active_prescriptions(patient_id: str) -> list:
    """Get active prescriptions for a patient from MongoDB."""
    if mongodb is None: return []
    cursor = mongodb.prescriptions.find({"patientId": str(patient_id), "status": "active"})
    items = await cursor.to_list(length=1000)
    for i in items: i["id"] = str(i.get("_id", i.get("id")))
    return items

async def get_doctor_prescriptions(doctor_id: str) -> list:
    """Get all prescriptions written by a doctor from MongoDB."""
    if mongodb is None: return []
    cursor = mongodb.prescriptions.find({"doctorId": str(doctor_id)})
    items = await cursor.to_list(length=1000)
    for i in items: i["id"] = str(i.get("_id", i.get("id")))
    return items

async def update_prescription_status(prescription_id: str, status: str) -> dict:
    """Update prescription status in MongoDB."""
    if mongodb is None: return {}
    now = datetime.utcnow()
    await mongodb.prescriptions.update_one(
        {"_id": prescription_id},
        {"$set": {"status": status, "updatedAt": now}}
    )
    return await mongodb.prescriptions.find_one({"_id": prescription_id})

async def request_refill(prescription_id: str) -> dict:
    """Request a refill for a prescription in MongoDB."""
    if mongodb is None: return {}
    prescription = await mongodb.prescriptions.find_one({"_id": prescription_id})
    if not prescription:
        return {}
    
    refills = max(0, int(prescription.get("refillsRemaining", 0)) - 1)
    now = datetime.utcnow()
    
    await mongodb.prescriptions.update_one(
        {"_id": prescription_id},
        {"$set": {"refillsRemaining": refills, "updatedAt": now}}
    )
    
    return await mongodb.prescriptions.find_one({"_id": prescription_id})

async def get_expiring_prescriptions(patient_id: str, days: int = 7) -> list:
    """Get prescriptions expiring within X days from MongoDB."""
    if mongodb is None: return []
    now = datetime.utcnow()
    expiry_threshold = now + timedelta(days=days)
    
    cursor = mongodb.prescriptions.find({
        "patientId": str(patient_id),
        "status": "active",
        "expiryDate": {"$lte": expiry_threshold}
    })
    items = await cursor.to_list(length=1000)
    for i in items: i["id"] = str(i.get("_id", i.get("id")))
    return items
