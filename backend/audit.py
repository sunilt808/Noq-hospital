# backend/audit.py - Audit Logging System (MongoDB)

import logging
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import uuid4
from database import mongodb

logger = logging.getLogger(__name__)

class AuditLogger:
    """Centralized audit logging system for MongoDB."""
    
    # Action types
    ACTION_CREATE = "CREATE"
    ACTION_UPDATE = "UPDATE"
    ACTION_DELETE = "DELETE"
    ACTION_LOGIN = "LOGIN"
    ACTION_LOGOUT = "LOGOUT"
    ACTION_FAILED_LOGIN = "FAILED_LOGIN"
    ACTION_APPOINTMENT_CREATED = "APPOINTMENT_CREATED"
    ACTION_APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED"
    ACTION_ROLE_CHANGED = "ROLE_CHANGED"
    
    @staticmethod
    async def log(
        action: str,
        entity_type: str,
        entity_id: str,
        user_id: Optional[str] = None,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        status: str = "success",
        error_message: Optional[str] = None,
    ) -> dict:
        """Log an audit entry to MongoDB."""
        try:
            audit_entry = {
                "_id": str(uuid4()),
                "user_id": user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "old_values": old_values,
                "new_values": new_values,
                "ip_address": ip_address,
                "status": status,
                "error_message": error_message,
                "timestamp": datetime.utcnow(),
            }
            
            if mongodb is not None:
                await mongodb.audit_logs.insert_one(audit_entry)
            
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
            # Don't raise, audit should not break the main flow
            return {}

    @staticmethod
    async def log_login(
        user_id: str,
        ip_address: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
    ):
        """Log a login attempt."""
        action = "LOGIN" if success else "FAILED_LOGIN"
        return await AuditLogger.log(
            action=action,
            entity_type="User",
            entity_id=user_id,
            user_id=user_id,
            ip_address=ip_address,
            status="success" if success else "failed",
            error_message=error_message,
        )
    
    @staticmethod
    async def log_entity_create(
        entity_type: str,
        entity_id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        """Log entity creation."""
        return await AuditLogger.log(
            action=AuditLogger.ACTION_CREATE,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            new_values=data,
            ip_address=ip_address,
        )
    
    @staticmethod
    async def log_entity_update(
        entity_type: str,
        entity_id: str,
        old_values: Dict[str, Any],
        new_values: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        """Log entity update."""
        return await AuditLogger.log(
            action=AuditLogger.ACTION_UPDATE,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            old_values=old_values,
            new_values=new_values,
            ip_address=ip_address,
        )
    
    @staticmethod
    async def log_entity_delete(
        entity_type: str,
        entity_id: str,
        data: Dict[str, Any],
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
    ):
        """Log entity deletion."""
        return await AuditLogger.log(
            action=AuditLogger.ACTION_DELETE,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            old_values=data,
            ip_address=ip_address,
        )


async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = 100,
) -> list:
    """Query audit logs from MongoDB."""
    if mongodb is None:
        return []
        
    query = {}
    if entity_type:
        query["entity_type"] = entity_type
    if entity_id:
        query["entity_id"] = entity_id
    if user_id:
        query["user_id"] = user_id
    if action:
        query["action"] = action
    
    cursor = mongodb.audit_logs.find(query).sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)

