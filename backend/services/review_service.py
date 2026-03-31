# backend/services/review_service.py - Review business logic (MongoDB)

from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from database import mongodb

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def _normalize_review_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    doctor_rating = max(1, min(5, int(data.get("doctor_rating", data.get("doctorRating", 5)))))
    hospital_rating = max(1, min(5, int(data.get("hospital_rating", data.get("hospitalRating", 5)))))
    rating = round((doctor_rating + hospital_rating) / 2, 1)

    return {
        "appointment_id": str(data.get("appointment_id", data.get("appointmentId", "")) or "").strip(),
        "patient_id": str(data.get("patient_id", data.get("patientId", "")) or "").strip(),
        "patient": str(data.get("patient", "") or "").strip() or "Patient",
        "doctor_id": str(data.get("doctor_id", data.get("doctorId", "")) or "").strip(),
        "doctor": str(data.get("doctor", "") or "").strip() or "Doctor",
        "hospital_id": str(data.get("hospital_id", data.get("hospitalId", "")) or "").strip(),
        "hospital": str(data.get("hospital", "") or "").strip() or "Hospital",
        "doctor_rating": doctor_rating,
        "hospital_rating": hospital_rating,
        "rating": rating,
        "comment": str(data.get("comment", "") or "").strip(),
        "status": str(data.get("status", "published") or "published").strip().lower(),
        "visibility": str(data.get("visibility", "public") or "public").strip().lower(),
    }

def _to_response_item(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(item.get("_id", item.get("id"))),
        "appointmentId": item.get("appointment_id", ""),
        "patientId": item.get("patient_id", ""),
        "patient": item.get("patient", "Patient"),
        "doctorId": item.get("doctor_id", ""),
        "doctor": item.get("doctor", "Doctor"),
        "hospitalId": item.get("hospital_id", ""),
        "hospital": item.get("hospital", "Hospital"),
        "doctorRating": int(item.get("doctor_rating", item.get("rating", 0)) or 0),
        "hospitalRating": int(item.get("hospital_rating", item.get("rating", 0)) or 0),
        "rating": float(item.get("rating", 0) or 0),
        "comment": item.get("comment", ""),
        "status": item.get("status", "published"),
        "visibility": item.get("visibility", "public"),
        "createdAt": item.get("created_at").isoformat() if isinstance(item.get("created_at"), datetime) else item.get("created_at", ""),
        "updatedAt": item.get("updated_at").isoformat() if isinstance(item.get("updated_at"), datetime) else item.get("updated_at", ""),
        "date": (item.get("updated_at") or item.get("created_at")).isoformat() if isinstance(item.get("updated_at") or item.get("created_at"), datetime) else "",
    }

async def list_reviews(
    hospital_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    only_public: bool = True,
) -> List[dict]:
    if mongodb is None: return []
    query = {}
    if only_public:
        query["visibility"] = "public"
    if hospital_id:
        query["hospital_id"] = hospital_id
    if patient_id:
        query["patient_id"] = patient_id
    if doctor_id:
        query["doctor_id"] = doctor_id

    cursor = mongodb.reviews.find(query).sort("updated_at", -1)
    items = await cursor.to_list(length=1000)
    return [_to_response_item(i) for i in items]

async def upsert_review(data: Dict[str, Any]) -> Dict[str, Any]:
    if mongodb is None: return {}
    review = _normalize_review_payload(data)
    if not review["patient_id"]:
        raise ValueError("patient_id is required")
    if not review["hospital_id"]:
        raise ValueError("hospital_id is required")
    if len(review["comment"]) < 5:
        raise ValueError("comment must be at least 5 characters")

    now = datetime.utcnow()

    # Find existing review by appointment_id or hospital_id+patient_id
    query = {}
    if review["appointment_id"]:
        query = {"appointment_id": review["appointment_id"], "patient_id": review["patient_id"]}
    else:
        query = {"hospital_id": review["hospital_id"], "patient_id": review["patient_id"]}
    
    existing = await mongodb.reviews.find_one(query)

    if existing:
        review_id = existing["_id"]
        updates = {**review, "updated_at": now}
        await mongodb.reviews.update_one({"_id": review_id}, {"$set": updates})
        saved = {**existing, **updates}
    else:
        review_id = f"RV-{uuid.uuid4().hex[:12].upper()}"
        payload = {
            "_id": review_id,
            "id": review_id,
            **review,
            "created_at": now,
            "updated_at": now,
        }
        await mongodb.reviews.insert_one(payload)
        saved = payload

    return _to_response_item(saved)
