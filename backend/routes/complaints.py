# backend/routes/complaints.py - Complaint Management Routes (MongoDB)

from fastapi import APIRouter, HTTPException, Depends
from services import auth_service
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from database import mongodb
import uuid

router = APIRouter(prefix="/complaints", tags=["Complaints"])

class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}

class ComplaintCreate(BaseModel):
    hospital_id: str
    hospital_name: Optional[str] = ""
    token_number: str
    problem: str
    doctor_name: str
    issue_type: str  # e.g., "irregular", "worst behaviour", "other"
    patient_name: Optional[str] = ""

async def _serialize_complaint(c: dict) -> dict:
    c["id"] = str(c.get("_id", c.get("id")))
    if "created_at" in c and isinstance(c["created_at"], datetime):
        c["created_at"] = c["created_at"].isoformat()
    if "updated_at" in c and isinstance(c["updated_at"], datetime):
        c["updated_at"] = c["updated_at"].isoformat()
    return c

@router.get("", response_model=StandardResponse)
async def get_all_complaints(hospital_id: Optional[str] = None):
    """Get all public complaints from MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
            
        cursor = mongodb.complaints.find(query).sort("created_at", -1)
        complaints = await cursor.to_list(length=1000)
        
        return StandardResponse(
            success=True,
            message="Complaints fetched.",
            data={"complaints": [await _serialize_complaint(c) for c in complaints]}
        )
    except Exception as e:
        return StandardResponse(success=False, message=str(e))

@router.get("/my", response_model=StandardResponse)
async def get_my_complaints(payload: dict = Depends(auth_service.require_auth)):
    """Get complaints filed by current user (patient)."""
    try:
        user_id = payload.get("sub")
        cursor = mongodb.complaints.find({"patient_id": user_id}).sort("created_at", -1)
        complaints = await cursor.to_list(length=1000)
        return StandardResponse(
            success=True,
            message="My complaints fetched.",
            data={"complaints": [await _serialize_complaint(c) for c in complaints]}
        )
    except Exception as e:
        return StandardResponse(success=False, message=str(e))

@router.post("", response_model=StandardResponse)
async def create_complaint(complaint: ComplaintCreate, payload: dict = Depends(auth_service.require_auth)):
    """Create a new complaint in MongoDB."""
    try:
        if mongodb is None: return StandardResponse(success=False, message="DB Error")
        user_id = payload.get("sub")
        
        complaint_id = f"CMP-{uuid.uuid4().hex[:8].upper()}"
        
        # Enrich with patient name if possible
        patient = await mongodb.users.find_one({"_id": user_id})
        p_name = patient.get("full_name") or patient.get("name") or "Patient"

        complaint_doc = complaint.model_dump()
        complaint_doc["_id"] = complaint_id
        complaint_doc["patient_id"] = user_id
        complaint_doc["patient_name"] = p_name
        complaint_doc["status"] = "pending"  # pending, reviewed, action_taken, resolved
        complaint_doc["action_taken"] = None
        complaint_doc["created_at"] = datetime.utcnow()
        
        await mongodb.complaints.insert_one(complaint_doc)
        return StandardResponse(success=True, message="Complaint submitted successfully", data=await _serialize_complaint(complaint_doc))
    except Exception as e:
        return StandardResponse(success=False, message=str(e))

@router.patch("/{complaint_id}/action", response_model=StandardResponse)
async def take_complaint_action(complaint_id: str, payload: dict, auth_payload: dict = Depends(auth_service.require_auth)):
    """Allow HM or Admin to take action on a complaint."""
    try:
        role = auth_payload.get("role")
        user_id = auth_payload.get("sub")
        
        if role not in ["admin", "hm"]:
            raise HTTPException(status_code=403, detail="Only Admins and Hospital Managers can take action")
            
        action = payload.get("action")  # e.g., "warn", "suspend", "dismiss"
        comment = payload.get("comment", "")
        
        complaint = await mongodb.complaints.find_one({"_id": complaint_id})
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")
            
        # Security check: HM can only action their own hospital's complaints
        if role == "hm":
            hm_user = await mongodb.users.find_one({"_id": user_id})
            if hm_user.get("hospital_id") != complaint.get("hospital_id"):
                raise HTTPException(status_code=403, detail="You can only action complaints for your own hospital")

        update_doc = {
            "status": "action_taken",
            "action_taken": action,
            "action_comment": comment,
            "action_by": user_id,
            "updated_at": datetime.utcnow()
        }
        
        await mongodb.complaints.update_one({"_id": complaint_id}, {"$set": update_doc})
        
        # If the action is suspension, find the doctor and update their status (optional but recommended)
        if action == "suspend":
             # Find doctor by name in this hospital (this is imprecise but works for a prototype)
             # Better: frontend should provide doctor_id
             await mongodb.users.update_one(
                 {"full_name": complaint.get("doctor_name"), "hospital_id": complaint.get("hospital_id"), "role": "doctor"},
                 {"$set": {"status": "suspended", "updated_at": datetime.utcnow()}}
             )
        
        return StandardResponse(success=True, message=f"Action '{action}' recorded successfully")
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        return StandardResponse(success=False, message=str(e))
