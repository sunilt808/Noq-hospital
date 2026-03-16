# backend/audit.py - Audit Logging System

import json
import logging
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from uuid import uuid4
from database import AuditLog

logger = logging.getLogger(__name__)


class AuditLogger:
    """Centralized audit logging system."""
    
    # Action types
    ACTION_CREATE = "CREATE"
    ACTION_UPDATE = "UPDATE"
    ACTION_DELETE = "DELETE"
    ACTION_LOGIN = "LOGIN"
    ACTION_LOGOUT = "LOGOUT"
    ACTION_FAILED_LOGIN = "FAILED_LOGIN"
    ACTION_APPOINTMENT_CREATED = "APPOINTMENT_CREATED"
    ACTION_APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED"
    Action_ROLE_CHANGED = "ROLE_CHANGED"
    
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        status: str = "success",
        error_message: Optional[str] = None,
    ) -> AuditLog:
        """
        Log an audit entry.
        
        Args:
            db: Database session
            action: Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
            entity_type: Type of entity (User, Appointment, Doctor, etc.)
            entity_id: ID of the entity
            user_id: ID of user performing action
            old_values: Previous values (for updates)
            new_values: New values (for updates/creates)
            ip_address: IP address of requester
            status: success or failed
            error_message: Error message if failed
            
        Returns:
            AuditLog instance
        """
        try:
            audit_entry = AuditLog(
                id=str(uuid4()),
                user_id=user_id,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                old_values=json.dumps(old_values) if old_values else None,
                new_values=json.dumps(new_values) if new_values else None,
                ip_address=ip_address,
                status=status,
                error_message=error_message,
                timestamp=datetime.utcnow(),
            )
            
            db.add(audit_entry)
            db.commit()
            db.refresh(audit_entry)
            
            # Also log to application logger
            log_msg = f"[{action}] {entity_type}#{entity_id} by user#{user_id} - {status}"
            if error_message:
                log_msg += f" (ERROR: {error_message})"
            
            if status == "success":
                logger.info(log_msg)
            else:
                logger.warning(log_msg)
            
            return audit_entry
            
        except Exception as e:
            logger.error(f"Failed to log audit entry: {e}", exc_info=True)
            raise
    
    @staticmethod
    def log_login(
        db: Session,
        user_id: str,
        ip_address: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ):
        """Log a login attempt."""
        action = "LOGIN" if success else "FAILED_LOGIN"
        return AuditLogger.log(
            db=db,
            action=action,
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            ip_address=ip_address,
            status="success" if success else "failed",
            error_message=error_message,
        )
    
    @staticmethod
    def log_entity_create(
        db: Session,
        entity_type: str,
        entity_id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        """Log entity creation."""
        return AuditLogger.log(
            db=db,
            action=AuditLogger.ACTION_CREATE,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            new_values=data,
            ip_address=ip_address,
        )
    
    @staticmethod
    def log_entity_update(
        db: Session,
        entity_type: str,
        entity_id: str,
        old_values: Dict[str, Any],
        new_values: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        """Log entity update."""
        return AuditLogger.log(
            db=db,
            action=AuditLogger.ACTION_UPDATE,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
        )
    
    @staticmethod
    def log_entity_delete(
        db: Session,
        entity_type: str,
        entity_id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        """Log entity deletion."""
        return AuditLogger.log(
            db=db,
            action=AuditLogger.ACTION_DELETE,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            old_values=data,
            ip_address=ip_address,
        )


def get_audit_logs(
    db: Session,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
) -> list:
    """
    Query audit logs with filters.
    
    Args:
        db: Database session
        entity_type: Filter by entity type
        entity_id: Filter by entity ID
        user_id: Filter by user ID
        action: Filter by action
        limit: Maximum number of results
        
    Returns:
        List of AuditLog instances
    """
    query = db.query(AuditLog)
    
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
