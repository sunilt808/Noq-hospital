# backend/routes/notifications.py - In-app Notifications
import logging
from fastapi import APIRouter, Depends, HTTPException
from database import mongodb
from services.auth_service import require_auth
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _s(n: dict) -> dict:
    n["id"] = str(n.get("_id", n.get("id", "")))
    if "created_at" in n and isinstance(n["created_at"], datetime):
        n["created_at"] = n["created_at"].isoformat()
    return n


@router.get("")
async def get_notifications(limit: int = 50, auth_payload: dict = Depends(require_auth)):
    """Get notifications for the current user."""
    try:
        if mongodb is None:
            return {"notifications": [], "unread_count": 0}
        user_id = auth_payload.get("sub")
        cursor = mongodb.notifications.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit)
        items = await cursor.to_list(length=limit)
        serialized = [_s(n) for n in items]
        unread = sum(1 for n in serialized if not n.get("read", False))
        return {"notifications": serialized, "unread_count": unread}
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        return {"notifications": [], "unread_count": 0}


@router.post("/internal")
async def create_notification(payload: dict, auth_payload: dict = Depends(require_auth)):
    """Create a notification for a user (internal use / admin only)."""
    try:
        if mongodb is None:
            return {"success": False}
        notif_id = f"NTF-{uuid.uuid4().hex[:8].upper()}"
        doc = {
            "_id": notif_id,
            "user_id": payload.get("user_id", ""),
            "title": payload.get("title", "Notification"),
            "message": payload.get("message", ""),
            "type": payload.get("type", "info"),
            "link": payload.get("link", ""),
            "read": False,
            "created_at": datetime.utcnow(),
        }
        await mongodb.notifications.insert_one(doc)
        return {"success": True, "id": notif_id}
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return {"success": False}


@router.put("/{notification_id}")
async def mark_notification_read(notification_id: str, auth_payload: dict = Depends(require_auth)):
    """Mark a notification as read."""
    try:
        if mongodb is None:
            return {"success": False}
        user_id = auth_payload.get("sub")
        result = await mongodb.notifications.update_one(
            {"_id": notification_id, "user_id": user_id},
            {"$set": {"read": True, "read_at": datetime.utcnow()}}
        )
        return {"success": result.matched_count > 0}
    except Exception as e:
        logger.error(f"Error marking notification read: {e}")
        return {"success": False}


@router.put("/read-all/mark")
async def mark_all_read(auth_payload: dict = Depends(require_auth)):
    """Mark all notifications as read for current user."""
    try:
        if mongodb is None:
            return {"success": False}
        user_id = auth_payload.get("sub")
        await mongodb.notifications.update_many(
            {"user_id": user_id, "read": False},
            {"$set": {"read": True, "read_at": datetime.utcnow()}}
        )
        return {"success": True}
    except Exception as e:
        logger.error(f"Error marking all notifications read: {e}")
        return {"success": False}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, auth_payload: dict = Depends(require_auth)):
    """Delete a notification."""
    try:
        if mongodb is None:
            return {"success": False}
        user_id = auth_payload.get("sub")
        result = await mongodb.notifications.delete_one(
            {"_id": notification_id, "user_id": user_id}
        )
        return {"success": result.deleted_count > 0}
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        return {"success": False}


@router.delete("")
async def clear_all_notifications(auth_payload: dict = Depends(require_auth)):
    """Clear all notifications for current user."""
    try:
        if mongodb is None:
            return {"success": False}
        user_id = auth_payload.get("sub")
        await mongodb.notifications.delete_many({"user_id": user_id})
        return {"success": True}
    except Exception as e:
        logger.error(f"Error clearing notifications: {e}")
        return {"success": False}


async def push_notification(user_id: str, title: str, message: str, notif_type: str = "info", link: str = ""):
    """Internal helper: push a notification to a user's inbox."""
    try:
        if mongodb is None or not user_id:
            return
        notif_id = f"NTF-{uuid.uuid4().hex[:8].upper()}"
        await mongodb.notifications.insert_one({
            "_id": notif_id,
            "user_id": str(user_id),
            "title": title,
            "message": message,
            "type": notif_type,
            "link": link,
            "read": False,
            "created_at": datetime.utcnow(),
        })
    except Exception as e:
        logger.warning(f"Failed to push notification to {user_id}: {e}")
