# backend/routes/departments.py - Department Management Routes (MongoDB)

import logging
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import uuid4
from database import mongodb
from audit import AuditLogger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/departments", tags=["Departments"])


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    hospital_id: str


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


def _serialize_dept(dept: dict) -> dict:
    dept["id"] = str(dept.get("_id", dept.get("id")))
    for field in ["created_at", "updated_at"]:
        if field in dept and isinstance(dept[field], datetime):
            dept[field] = dept[field].isoformat()
    return dept


@router.get("")
async def list_departments(hospital_id: str = None):
    """List departments from MongoDB."""
    try:
        if mongodb is None: return {"success": False, "data": {"departments": []}}
        query = {}
        if hospital_id:
            query["hospital_id"] = hospital_id
        
        cursor = mongodb.departments.find(query)
        departments = await cursor.to_list(length=1000)
        
        return {
            "success": True,
            "data": {
                "departments": [_serialize_dept(d) for d in departments if d.get("status") != "inactive"]
            }
        }
    except Exception as e:
        logger.error(f"Error listing departments: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("")
async def create_department(payload: DepartmentCreate, request: Request):
    """Create a new department in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        dept_id = str(uuid4())
        dept_doc = {
            "_id": dept_id,
            "hospital_id": payload.hospital_id,
            "name": payload.name.strip(),
            "description": (payload.description or "").strip() or None,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        await mongodb.departments.insert_one(dept_doc)
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="CREATE",
            entity_type="Department",
            entity_id=dept_id,
            new_values={"name": dept_doc["name"], "hospital_id": dept_doc["hospital_id"]},
            ip_address=client_ip,
        )
        
        return {
            "success": True,
            "data": {"department": _serialize_dept(dept_doc)}
        }
    except Exception as e:
        logger.error(f"Error creating department: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{department_id}")
async def patch_department(department_id: str, payload: DepartmentUpdate, request: Request):
    """Update a department in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        updates = payload.model_dump(exclude_unset=True)
        if not updates:
            dept = await mongodb.departments.find_one({"_id": department_id})
            return {"success": True, "data": {"department": _serialize_dept(dept)}}

        updates["updated_at"] = datetime.utcnow()
        result = await mongodb.departments.update_one({"_id": department_id}, {"$set": updates})
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Department not found")
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="UPDATE",
            entity_type="Department",
            entity_id=department_id,
            new_values=updates,
            ip_address=client_ip,
        )
        
        updated_dept = await mongodb.departments.find_one({"_id": department_id})
        return {
            "success": True,
            "data": {"department": _serialize_dept(updated_dept)}
        }
    except Exception as e:
        logger.error(f"Error updating department: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{department_id}")
async def delete_department(department_id: str, request: Request):
    """Soft-delete a department in MongoDB."""
    try:
        if mongodb is None: raise HTTPException(status_code=500, detail="DB Error")
        
        await mongodb.departments.update_one(
            {"_id": department_id},
            {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}}
        )
        
        client_ip = request.client.host if request and request.client else None
        await AuditLogger.log(
            action="DELETE",
            entity_type="Department",
            entity_id=department_id,
            ip_address=client_ip,
        )
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting department: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
