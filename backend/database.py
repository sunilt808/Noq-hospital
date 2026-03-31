# backend/database.py - MongoDB & SQLAlchemy Setup

import os
import logging
from datetime import datetime
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, Float, ForeignKey, Text, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.pool import StaticPool

logger = logging.getLogger(__name__)

# Database configuration
BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_SQLITE_PATH = (BACKEND_DIR / "noq_hospital.db").as_posix()
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")
ECHO_SQL = os.getenv("ECHO_SQL", "False").lower() == "true"

# MongoDB configuration
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "noq_hospital_db")

# Initialize MongoDB Client
try:
    mongo_client = AsyncIOMotorClient(MONGODB_URL)
    mongodb = mongo_client[DATABASE_NAME]
    logger.info(f"MongoDB connected to: {MONGODB_URL}")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    mongodb = None

# ─── SQLALCHEMY (LEGACY/REFERENCE) ───────────────────────────────────────────
# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in DATABASE_URL else None,
    echo=ECHO_SQL,
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base for models
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════
# DATABASE MODELS
# ═══════════════════════════════════════════════════════════════════════════

class User(Base):
    """User model - Patients, Doctors, Hospital Managers, Admins."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String)
    role = Column(String, nullable=False)  # patient, doctor, hm, admin
    hospital_id = Column(String, ForeignKey("hospitals.id"))
    hospital_name = Column(String)
    status = Column(String, default="active")  # active, inactive, suspended
    specialization = Column(String)
    department_id = Column(String)
    department_name = Column(String)
    room_id = Column(String)
    room_no = Column(String)
    floor = Column(String)
    license = Column(String)
    shift = Column(String)
    advanced_booking_category = Column(String)
    fee = Column(Float, default=0)
    experience = Column(Integer, default=0)
    qualifications = Column(String)
    category = Column(String)
    promotion_label = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="users")
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    appointments = relationship("Appointment", back_populates="patient")
    audit_logs = relationship("AuditLog", back_populates="user")


class Hospital(Base):
    """Hospital model."""
    __tablename__ = "hospitals"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String)
    phone = Column(String)
    email = Column(String)
    city = Column(String)
    state = Column(String)
    pincode = Column(String)
    category = Column(String)
    hospital_type = Column(String)
    established_year = Column(String)
    registration_number = Column(String)
    website = Column(String)
    emergency_contact = Column(String)
    owner_name = Column(String)
    director_name = Column(String)
    total_beds = Column(Integer, default=0)
    total_icu_beds = Column(Integer, default=0)
    total_operation_theatres = Column(Integer, default=0)
    accreditation = Column(Text)
    services = Column(Text)
    last_updated = Column(String)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="hospital")
    departments = relationship("Department", back_populates="hospital")
    doctors = relationship("Doctor", back_populates="hospital")
    rooms = relationship("Room", back_populates="hospital")
    appointments = relationship("Appointment", back_populates="hospital")


class Department(Base):
    """Department model - Cardiology, Surgery, etc."""
    __tablename__ = "departments"

    id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="departments")
    doctors = relationship("Doctor", back_populates="department")


class Doctor(Base):
    """Doctor model."""
    __tablename__ = "doctors"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id"), nullable=False)
    specialization = Column(String)
    license_number = Column(String)
    experience_years = Column(Integer)
    consultation_fee = Column(Float, default=500)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
    department = relationship("Department", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    queue_tokens = relationship("QueueToken", back_populates="doctor")


class Room(Base):
    """Room/Chamber model."""
    __tablename__ = "rooms"

    id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(String, ForeignKey("departments.id"))
    department_name = Column(String)
    room_number = Column(String, nullable=False)
    floor = Column(String)
    capacity = Column(Integer, default=1)
    status = Column(String, default="available")  # available, occupied, maintenance
    type = Column(String, default="doctor")
    assigned_doctor_id = Column(String)
    assigned_doctor_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="rooms")


class Appointment(Base):
    """Appointment model."""
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, index=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False)
    patient_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_date = Column(DateTime, nullable=False)
    appointment_time = Column(String)
    appointment_type = Column(String, default="regular")
    doctor_name = Column(String)
    department = Column(String)
    disease = Column(String)
    fee = Column(Float, default=0.0)
    token_number = Column(String)
    status = Column(String, default="scheduled")  # scheduled, completed, cancelled
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("User", back_populates="appointments")


class QueueToken(Base):
    """Queue token for appointment management."""
    __tablename__ = "queue_tokens"

    id = Column(String, primary_key=True, index=True)
    doctor_id = Column(String, ForeignKey("doctors.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"))
    token_number = Column(Integer, nullable=False)
    status = Column(String, default="waiting")  # waiting, called, completed, missed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    doctor = relationship("Doctor", back_populates="queue_tokens")


class AuditLog(Base):
    """Audit log for tracking all activities."""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    action = Column(String, nullable=False)  # CREATE, UPDATE, DELETE, LOGIN, LOGOUT
    entity_type = Column(String)  # User, Appointment, Doctor, etc.
    entity_id = Column(String)
    old_values = Column(Text)  # JSON string
    new_values = Column(Text)  # JSON string
    ip_address = Column(String)
    status = Column(String, default="success")  # success, failed
    error_message = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


# ═══════════════════════════════════════════════════════════════════════════
# DATABASE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)


def _sqlite_column_exists(connection, table_name: str, column_name: str) -> bool:
    rows = connection.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
    existing_columns = {row[1] for row in rows}
    return column_name in existing_columns


def _ensure_rooms_schema():
    """Ensure rooms table has fields used by API routes in existing SQLite DBs."""
    if "sqlite" not in DATABASE_URL:
        return

    with engine.begin() as connection:
        if not _sqlite_column_exists(connection, "rooms", "department_id"):
            connection.execute(text("ALTER TABLE rooms ADD COLUMN department_id TEXT"))
        if not _sqlite_column_exists(connection, "rooms", "department_name"):
            connection.execute(text("ALTER TABLE rooms ADD COLUMN department_name TEXT"))
        if not _sqlite_column_exists(connection, "rooms", "type"):
            connection.execute(text("ALTER TABLE rooms ADD COLUMN type TEXT DEFAULT 'doctor'"))
        if not _sqlite_column_exists(connection, "rooms", "assigned_doctor_id"):
            connection.execute(text("ALTER TABLE rooms ADD COLUMN assigned_doctor_id TEXT"))
        if not _sqlite_column_exists(connection, "rooms", "assigned_doctor_name"):
            connection.execute(text("ALTER TABLE rooms ADD COLUMN assigned_doctor_name TEXT"))


def _ensure_users_schema():
    """Ensure users table has doctor profile fields used by HM doctor CRUD."""
    if "sqlite" not in DATABASE_URL:
        return

    with engine.begin() as connection:
        user_columns = {
            "hospital_name": "TEXT",
            "specialization": "TEXT",
            "department_id": "TEXT",
            "department_name": "TEXT",
            "room_id": "TEXT",
            "room_no": "TEXT",
            "floor": "TEXT",
            "license": "TEXT",
            "shift": "TEXT",
            "advanced_booking_category": "TEXT",
            "fee": "FLOAT DEFAULT 0",
            "experience": "INTEGER DEFAULT 0",
            "qualifications": "TEXT",
            "category": "TEXT",
            "promotion_label": "TEXT",
        }
        for column_name, column_sql in user_columns.items():
            if not _sqlite_column_exists(connection, "users", column_name):
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_sql}"))


def _ensure_hospitals_schema():
    """Ensure hospitals table has all HM profile fields."""
    if "sqlite" not in DATABASE_URL:
        return

    with engine.begin() as connection:
        hospital_columns = {
            "category": "TEXT",
            "hospital_type": "TEXT",
            "established_year": "TEXT",
            "registration_number": "TEXT",
            "website": "TEXT",
            "emergency_contact": "TEXT",
            "owner_name": "TEXT",
            "director_name": "TEXT",
            "total_beds": "INTEGER DEFAULT 0",
            "total_icu_beds": "INTEGER DEFAULT 0",
            "total_operation_theatres": "INTEGER DEFAULT 0",
            "accreditation": "TEXT",
            "services": "TEXT",
            "last_updated": "TEXT",
        }
        for column_name, column_sql in hospital_columns.items():
            if not _sqlite_column_exists(connection, "hospitals", column_name):
                connection.execute(text(f"ALTER TABLE hospitals ADD COLUMN {column_name} {column_sql}"))

def _ensure_appointments_schema():
    if "sqlite" not in DATABASE_URL:
        return
    with engine.begin() as connection:
        appt_columns = {
            "appointment_time": "TEXT",
            "appointment_type": "TEXT DEFAULT 'regular'",
            "doctor_name": "TEXT",
            "department": "TEXT",
            "disease": "TEXT",
            "fee": "FLOAT DEFAULT 0.0",
            "token_number": "TEXT",
        }
        for column_name, column_sql in appt_columns.items():
            if not _sqlite_column_exists(connection, "appointments", column_name):
                connection.execute(text(f"ALTER TABLE appointments ADD COLUMN {column_name} {column_sql}"))


async def get_mongodb():
    """Get MongoDB database instance."""
    if mongodb is None:
        raise Exception("MongoDB not initialized")
    return mongodb

def get_db():
    """Get database session - used as dependency in FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database with tables."""
    create_tables()
    _ensure_rooms_schema()
    _ensure_users_schema()
    _ensure_hospitals_schema()
    _ensure_appointments_schema()
