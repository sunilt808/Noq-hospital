# backend/services/auth_service.py - Authentication Service

import os
import logging
from datetime import datetime, timedelta
from uuid import uuid4
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import hashlib
import secrets
from database import User, Doctor
from audit import AuditLogger

logger = logging.getLogger(__name__)

# JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = int(os.getenv("JWT_EXPIRATION_MINUTES", "1440"))


class AuthService:
    """Authentication service."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using PBKDF2."""
        salt = secrets.token_hex(32)  # 64 character hex string
        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return f"{salt}${pwd_hash.hex()}"
    
    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        """Verify a password against its hash."""
        try:
            salt, pwd_hash = password_hash.split('$', 1)
            computed_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
            return computed_hash.hex() == pwd_hash
        except Exception:
            return False
    
    @staticmethod
    def create_access_token(
        data: dict,
        expires_delta: timedelta = None
    ) -> str:
        """Create JWT access token."""
        try:
            to_encode = data.copy()
            
            if expires_delta:
                expire = datetime.utcnow() + expires_delta
            else:
                expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
            
            to_encode.update({"exp": expire})
            encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
            
            return encoded_jwt
        except Exception as e:
            logger.error(f"Failed to create access token: {e}")
            raise
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """Decode and verify JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except JWTError as e:
            logger.warning(f"Invalid token: {e}")
            raise
        except Exception as e:
            logger.error(f"Token decode error: {e}")
            raise
    
    @staticmethod
    def authenticate_user(
        db: Session,
        email: str,
        password: str,
        ip_address: str = None
    ) -> dict:
        """
        Authenticate user with email and password.
        
        Returns:
            dict with user info and token
        """
        try:
            # Find user by email
            user = db.query(User).filter(User.email == email.lower().strip()).first()
            
            if not user:
                logger.warning(f"Login attempt with non-existent email: {email}")
                AuditLogger.log_login(db, email, ip_address, success=False, 
                                     error_message="User not found")
                raise ValueError("Invalid credentials")
            
            # Check if user is active
            if user.status != "active":
                logger.warning(f"Login attempt with inactive user: {email}")
                AuditLogger.log_login(db, user.id, ip_address, success=False,
                                     error_message=f"User status: {user.status}")
                raise ValueError("Account is not active")
            
            # Verify password
            if not AuthService.verify_password(password, user.password_hash):
                logger.warning(f"Failed login attempt for user: {email}")
                AuditLogger.log_login(db, user.id, ip_address, success=False,
                                     error_message="Invalid password")
                raise ValueError("Invalid credentials")
            
            # Create token
            token = AuthService.create_access_token({
                "sub": user.id,
                "email": user.email,
                "role": user.role,
            })
            
            # Log successful login
            AuditLogger.log_login(db, user.id, ip_address, success=True)
            
            logger.info(f"User logged in successfully: {email} ({user.role})")
            
            return {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "hospital_id": user.hospital_id,
                "status": user.status,
                "token": token,
            }
            
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {e}", exc_info=True)
            raise


class UserService:
    """User service."""
    
    @staticmethod
    def create_user(
        db: Session,
        email: str,
        password: str,
        full_name: str,
        role: str,
        hospital_id: str = None,
        phone: str = None,
        user_id: str = None,
    ) -> User:
        """Create a new user."""
        try:
            # Check if email already exists
            existing_user = db.query(User).filter(User.email == email.lower().strip()).first()
            if existing_user:
                if existing_user.status == "inactive" and existing_user.role == role:
                    existing_user.password_hash = AuthService.hash_password(password)
                    existing_user.full_name = full_name
                    existing_user.phone = phone
                    if hospital_id:
                        existing_user.hospital_id = hospital_id
                    existing_user.status = "active"
                    existing_user.updated_at = datetime.utcnow()

                    db.commit()
                    db.refresh(existing_user)

                    logger.info(f"Reactivated existing user: {email} ({role})")
                    return existing_user

                raise ValueError(f"Email {email} already registered")
            
            # Create user
            user = User(
                id=user_id or str(uuid4()),
                email=email.lower().strip(),
                password_hash=AuthService.hash_password(password),
                full_name=full_name,
                phone=phone,
                role=role,
                hospital_id=hospital_id,
                status="active",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # If doctor role, create Doctor record (only if we have required department)
            if role == "doctor" and hospital_id:
                try:
                    # Doctor.department_id is required FK, skip if not available
                    # Will be set when profile is updated with department info
                    pass  # Doctor syncing will happen on first profile update
                except Exception as doctor_error:
                    logger.warning(f"Failed to create Doctor record: {doctor_error}")
     
            # Log user creation
            AuditLogger.log_entity_create(
                db,
                entity_type="User",
                entity_id=user.id,
                data={
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role,
                    "phone": user.phone,
                },
            )
            
            logger.info(f"New user created: {email} ({role})")
            return user
            
        except ValueError as e:
            raise
        except Exception as e:
            logger.error(f"User creation error: {e}", exc_info=True)
            db.rollback()
            raise
    
    @staticmethod
    def get_user(db: Session, user_id: str) -> User:
        """Get user by ID."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"User not found: {user_id}")
        return user
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        """Get user by email."""
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if not user:
            raise ValueError(f"User not found: {email}")
        return user
    
    @staticmethod
    def update_user(
        db: Session,
        user_id: str,
        **kwargs
    ) -> User:
        """Update user details."""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User not found: {user_id}")
            
            # Store old values for audit
            old_values = {
                "full_name": user.full_name,
                "phone": user.phone,
                "status": user.status,
            }
            
            # Update fields
            for key, value in kwargs.items():
                if hasattr(user, key) and key not in ["id", "email", "password_hash"]:
                    setattr(user, key, value)
            
            user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
            
            # Sync Doctor record if user is a doctor
            if user.role == "doctor" and user.hospital_id:
                try:
                    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
                    
                    # Create Doctor record if it doesn't exist and we have department_id
                    if not doctor and "department_id" in kwargs and kwargs.get("department_id"):
                        doctor = Doctor(
                            id=str(uuid4()),
                            user_id=user.id,
                            hospital_id=user.hospital_id,
                            department_id=kwargs.get("department_id"),
                            specialization=kwargs.get("specialization"),
                            license_number=kwargs.get("license"),
                            experience_years=kwargs.get("experience", 0),
                            consultation_fee=kwargs.get("fee", 500),
                            status=user.status,
                            created_at=datetime.utcnow(),
                            updated_at=datetime.utcnow(),
                        )
                        db.add(doctor)
                        db.commit()
                        db.refresh(doctor)
                        logger.info(f"Doctor record created for user {user.id}")
                    elif doctor:
                        # Update doctor fields from user updates
                        if "specialization" in kwargs:
                            doctor.specialization = kwargs.get("specialization")
                        if "department_id" in kwargs:
                            doctor.department_id = kwargs.get("department_id")
                        if "license" in kwargs:
                            doctor.license_number = kwargs.get("license")
                        if "experience" in kwargs:
                            doctor.experience_years = kwargs.get("experience", 0)
                        if "fee" in kwargs:
                            doctor.consultation_fee = kwargs.get("fee", 500)
                        if "status" in kwargs:
                            doctor.status = kwargs.get("status")
                        doctor.updated_at = datetime.utcnow()
                        db.commit()
                        db.refresh(doctor)
                        logger.info(f"Doctor record synced for user {user.id}")
                except Exception as doctor_error:
                    logger.warning(f"Failed to sync Doctor record: {doctor_error}")
            
            # Log update
            new_values = {
                "full_name": user.full_name,
                "phone": user.phone,
                "status": user.status,
            }

            try:
                AuditLogger.log_entity_update(
                    db,
                    entity_type="User",
                    entity_id=user.id,
                    old_values=old_values,
                    new_values=new_values,
                    user_id=user_id,
                )
            except Exception as audit_error:
                logger.warning(f"User update audit failed for {user_id}: {audit_error}")
            
            return user
            
        except Exception as e:
            logger.error(f"User update error: {e}", exc_info=True)
            db.rollback()
            raise
    
    @staticmethod
    def delete_user(db: Session, user_id: str):
        """Soft delete user (mark as inactive)."""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise ValueError(f"User not found: {user_id}")
            
            # If doctor, also delete Doctor record
            if user.role == "doctor":
                try:
                    doctor = db.query(Doctor).filter(Doctor.user_id == user.id).first()
                    if doctor:
                        db.delete(doctor)
                        db.commit()
                        logger.info(f"Doctor record deleted for user {user.id}")
                except Exception as doctor_error:
                    logger.warning(f"Failed to delete Doctor record: {doctor_error}")
            
            user.status = "inactive"
            user.updated_at = datetime.utcnow()
            db.commit()

            try:
                AuditLogger.log_entity_delete(
                    db,
                    entity_type="User",
                    entity_id=user.id,
                    data={
                        "email": user.email,
                        "full_name": user.full_name,
                        "role": user.role,
                    },
                    user_id=user_id,
                )
            except Exception as audit_error:
                logger.warning(f"User delete audit failed for {user_id}: {audit_error}")
            
            logger.info(f"User deleted: {user.email}")
            
        except Exception as e:
            logger.error(f"User deletion error: {e}", exc_info=True)
            db.rollback()
            raise
