from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from database import db
from google.cloud.firestore_v1.base_query import FieldFilter


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
        "id": item.get("id"),
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
        "createdAt": item.get("created_at", ""),
        "updatedAt": item.get("updated_at", ""),
        "date": item.get("updated_at") or item.get("created_at") or "",
    }


def list_reviews(
    hospital_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    only_public: bool = True,
) -> List[dict]:
    ref = db.collection("reviews")
    if only_public:
        ref = ref.where(filter=FieldFilter("visibility", "==", "public"))
    if hospital_id:
        ref = ref.where(filter=FieldFilter("hospital_id", "==", str(hospital_id)))
    if patient_id:
        ref = ref.where(filter=FieldFilter("patient_id", "==", str(patient_id)))
    if doctor_id:
        ref = ref.where(filter=FieldFilter("doctor_id", "==", str(doctor_id)))

    items: List[dict] = [{"id": doc.id, **(doc.to_dict() or {})} for doc in ref.stream()]

    if only_public:
        items = [i for i in items if str(i.get("visibility", "public")).lower() == "public"]

    if hospital_id:
        items = [i for i in items if str(i.get("hospital_id", "")) == str(hospital_id)]
    if patient_id:
        items = [i for i in items if str(i.get("patient_id", "")) == str(patient_id)]
    if doctor_id:
        items = [i for i in items if str(i.get("doctor_id", "")) == str(doctor_id)]

    items = sorted(items, key=lambda x: x.get("updated_at") or x.get("created_at") or "", reverse=True)
    return [_to_response_item(i) for i in items]


def upsert_review(data: Dict[str, Any]) -> Dict[str, Any]:
    review = _normalize_review_payload(data)
    if not review["patient_id"]:
        raise ValueError("patient_id is required")
    if not review["hospital_id"]:
        raise ValueError("hospital_id is required")
    if len(review["comment"]) < 5:
        raise ValueError("comment must be at least 5 characters")

    now = _now_iso()

    existing_doc = None
    ref = db.collection("reviews")

    if review["appointment_id"]:
        docs = (
            ref.where(filter=FieldFilter("appointment_id", "==", review["appointment_id"]))
            .where(filter=FieldFilter("patient_id", "==", review["patient_id"]))
            .limit(1)
            .stream()
        )
        existing_doc = next(iter(docs), None)
    else:
        docs = (
            ref.where(filter=FieldFilter("hospital_id", "==", review["hospital_id"]))
            .where(filter=FieldFilter("patient_id", "==", review["patient_id"]))
            .limit(1)
            .stream()
        )
        existing_doc = next(iter(docs), None)

    if existing_doc:
        review_id = existing_doc.id
        payload = {
            **(existing_doc.to_dict() or {}),
            **review,
            "updated_at": now,
        }
        ref.document(review_id).set(payload)
        saved = {"id": review_id, **payload}
    else:
        review_id = f"RV-{uuid.uuid4().hex[:12].upper()}"
        payload = {
            "id": review_id,
            **review,
            "created_at": now,
            "updated_at": now,
        }
        ref.document(review_id).set(payload)
        saved = payload

    return _to_response_item(saved)
