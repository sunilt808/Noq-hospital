# backend/routes/departments.py - Department Management Routes

import logging
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from database import get_db, Department
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


def _serialize_dept(dept: Department) -> dict:
    return {
        "id": dept.id,
        "hospital_id": dept.hospital_id,
        "name": dept.name,
        "description": dept.description,
        "status": dept.status,
        "created_at": dept.created_at.isoformat() if dept.created_at else None,
        "updated_at": dept.updated_at.isoformat() if dept.updated_at else None,
    }


@router.get("")
def list_departments(
    hospital_id: str = None,
    db: Session = Depends(get_db)
):
    """List departments with optional hospital filter."""
    try:
        query = db.query(Department)
        
        if hospital_id:
            query = query.filter(Department.hospital_id == hospital_id)
        
        departments = query.filter(Department.status == "active").all()
        
        return {
            "success": True,
            "data": {
                "departments": [_serialize_dept(d) for d in departments]
            }
        }
    except Exception as e:
        logger.error(f"Error listing departments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("")
def create_department(
    payload: DepartmentCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create a new department."""
    try:
        if not payload.name or not payload.hospital_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name and hospital_id are required"
            )
        
        dept = Department(
            id=str(uuid4()),
            hospital_id=payload.hospital_id,
            name=payload.name.strip(),
            description=(payload.description or "").strip() or None,
            status="active",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        
        db.add(dept)
        db.commit()
        db.refresh(dept)
        
        client_ip = request.client.host if request and request.client else None
        AuditLogger.log_entity_create(
            db,
            entity_type="Department",
            entity_id=dept.id,
            data={"name": dept.name, "hospital_id": dept.hospital_id},
            ip_address=client_ip,
        )
        
        return {
            "success": True,
            "data": {"department": _serialize_dept(dept)}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating department: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/{department_id}")
def update_department(
    department_id: str,
    payload: DepartmentUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Update a department."""
    try:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        
        updates = {}
        if payload.name:
            dept.name = payload.name.strip()
            updates["name"] = dept.name
        if payload.description is not None:
            dept.description = payload.description.strip() if payload.description else None
            updates["description"] = dept.description
        if payload.status:
            dept.status = payload.status.lower()
            updates["status"] = dept.status
        
        dept.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(dept)
        
        client_ip = request.client.host if request and request.client else None
        AuditLogger.log_entity_update(
            db,
            entity_type="Department",
            entity_id=department_id,
            old_values={},
            new_values=updates,
            ip_address=client_ip,
        )
        
        return {
            "success": True,
            "data": {"department": _serialize_dept(dept)}
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating department: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.patch("/{department_id}")
def patch_department(
    department_id: str,
    payload: DepartmentUpdate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Patch a department."""
    return update_department(department_id, payload, request, db)


@router.delete("/{department_id}")
def delete_department(
    department_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Soft-delete a department."""
    try:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
        
        dept.status = "inactive"
        dept.updated_at = datetime.utcnow()
        db.commit()
        
        client_ip = request.client.host if request and request.client else None
        AuditLogger.log_entity_delete(
            db,
            entity_type="Department",
            entity_id=department_id,
            data={"name": dept.name},
            ip_address=client_ip,
        )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting department: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
