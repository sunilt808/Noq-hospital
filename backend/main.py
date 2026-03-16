# backend/main.py - NOQ Smart Queue Management System API

import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from routes import auth, users, hospitals, appointments
from database import init_db

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app startup and shutdown events."""
    # ─── STARTUP ───────────────────────────────────────────────────────
    logger.info("🚀 Starting NOQ API...")
    
    # Initialize database
    try:
        init_db()
        logger.info("✓ Database initialized")
    except Exception as exc:
        logger.error(f"Database initialization failed: {exc}")
    
    yield
    
    # ─── SHUTDOWN ───────────────────────────────────────────────────────
    logger.info("🛑 Shutting down NOQ API...")


app = FastAPI(
    title="NOQ Smart Queue Management API",
    description="Backend API for the NOQ hospital queue management system",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all unhandled exceptions."""
    origin = request.headers.get("origin", "")
    extra_headers = {}
    if origin in ALLOWED_ORIGINS:
        extra_headers["Access-Control-Allow-Origin"] = origin
        extra_headers["Access-Control-Allow-Credentials"] = "true"
    
    logger.error(f"[500] {request.method} {request.url.path} → {type(exc).__name__}: {exc}")
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Server error. Please try again.",
            "error": str(exc) if os.getenv("ENVIRONMENT") == "development" else "Internal server error"
        },
        headers=extra_headers,
    )


@app.get("/", tags=["Health"])
def root():
    """Root endpoint."""
    return {
        "message": "NOQ API is running",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "healthy"
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "sqlite",
        "api": "running",
        "version": "1.0.0"
    }


# ─── ROUTERS ─────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(hospitals.router)
app.include_router(appointments.router)

