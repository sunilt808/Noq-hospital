# backend/routes/medical_records.py - Medical record management endpoints (MongoDB)

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from services import auth_service
from pydantic import BaseModel
from typing import Optional, List
from database import mongodb
from datetime import datetime
import uuid
import os

router = APIRouter(prefix="/medical-records", tags=["Medical Records"])


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: dict = {}


@router.get("/my", response_model=StandardResponse)
async def get_my_medical_records(payload: dict = Depends(auth_service.require_auth)):
    """Fetch medical records for the authenticated patient."""
    try:
        user_id = payload.get("sub")
        if mongodb is None:
            return StandardResponse(success=True, message="Success", data={"records": []})

        cursor = mongodb.medical_records.find({"patient_id": user_id}).sort("date", -1)
        records = await cursor.to_list(length=1000)
        
        for r in records:
            r["id"] = str(r.get("_id", r.get("id")))

        return StandardResponse(
            success=True,
            message=f"Fetched {len(records)} medical records.",
            data={"records": records}
        )
    except Exception as e:
        return StandardResponse(success=False, message=str(e), data={"records": []})


@router.post("/upload", response_model=StandardResponse)
async def upload_medical_record(
    file: UploadFile = File(...),
    type: str = Form("document"),
    payload: dict = Depends(auth_service.require_auth)
):
    """Upload a medical record file."""
    try:
        user_id = payload.get("sub")
        
        # In a real app, save to S3/Cloudinary. Here, simulate.
        record_id = str(uuid.uuid4())
        new_record = {
            "_id": record_id,
            "patient_id": user_id,
            "filename": file.filename,
            "type": type,
            "url": f"https://example.com/files/{file.filename}", # Simulation
            "date": datetime.utcnow().isoformat(),
            "created_at": datetime.utcnow()
        }

        if mongodb is not None:
            await mongodb.medical_records.insert_one(new_record)
        
        new_record["id"] = record_id
        return StandardResponse(
            success=True,
            message="File uploaded successfully",
            data={"record": new_record}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
