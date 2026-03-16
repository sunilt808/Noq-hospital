# backend/routes/users.py - User Management Routes

import logging
from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db, User
from services.auth_service import UserService
from audit import AuditLogger

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/users", tags=["Users"])


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    full_name: str
    phone: str = None
    role: str
    hospital_id: str = None
    status: str

    class Config:
        from_attributes = True


@router.get("/me", response_model=UserResponse)
def get_current_user(
    db: Session = Depends(get_db),
):
    """Get current user profile."""
    try:
        # In a real app, extract user_id from JWT token
        # For now, this is a placeholder
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get user by ID."""
    try:
        user = UserService.get_user(db, user_id)
        return user
    except ValueError as e:
        logger.warning(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    full_name: str = None,
    phone: str = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Update user details."""
    try:
        updates = {}
        if full_name:
            updates["full_name"] = full_name
        if phone:
            updates["phone"] = phone
        
        user = UserService.update_user(db, user_id, **updates)
        
        # Log IP if available
        client_ip = request.client.host if request and request.client else None
        AuditLogger.log_entity_update(
            db,
            entity_type="User",
            entity_id=user_id,
            old_values={},
            new_values=updates,
            user_id=user_id,
            ip_address=client_ip,
        )
        
        return user
    except ValueError as e:
        logger.warning(f"User not found: {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


