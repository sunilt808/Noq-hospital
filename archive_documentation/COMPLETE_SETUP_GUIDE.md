# Complete NOQ Hospital System - Setup & Deployment Guide

## Overview

This guide provides complete setup and deployment instructions for the NOQ Hospital system with MongoDB, FastAPI backend, and React frontend.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Database Setup](#database-setup)
5. [Backend Configuration](#backend-configuration)
6. [Frontend Configuration](#frontend-configuration)
7. [Running the Application](#running-the-application)
8. [Verification & Testing](#verification--testing)
9. [Troubleshooting](#troubleshooting)
10. [Deployment](#deployment)

---

## Prerequisites

### Required Software
- **Python**: 3.9+
- **Node.js**: 16+ (for frontend)
- **MongoDB**: 4.4+ (local or cloud)
- **Git**: 2.0+
- **npm** or **yarn**: Package manager

### System Requirements
- **OS**: Windows, macOS, or Linux
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 5GB free space
- **Network**: Internet connection for npm/pip packages

### Environment
```bash
# Check Python version
python --version  # Should be 3.9+

# Check Node.js version
node --version  # Should be 16+

# Check MongoDB (if local)
mongod --version
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         NOQ Hospital System Architecture        │
├─────────────────────────────────────────────────┤
│                                                 │
│  Frontend (React)                              │
│  ├─ Single Page Application (SPA)              │
│  ├─ Firebase Authentication (Optional)         │
│  └─ API Client with Retry/Timeout logic        │
│         ↓ HTTPS/API Calls                      │
│  Backend (FastAPI)                             │
│  ├─ RESTful API Endpoints                      │
│  ├─ Request Validation & Error Handling        │
│  └─ MongoDB Connection Manager                 │
│         ↓ Query/Write                          │
│  Database (MongoDB)                            │
│  ├─ Collections: users, hospitals, depts...    │
│  ├─ Indexes for Performance                    │
│  └─ Connection Pooling (10-50 connections)     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Initial Setup

### 1. Clone Repository
```bash
cd /path/to/workspace
git clone <repository-url> nqrpro
cd nqrpro
```

### 2. Set Up Python Environment

#### Option A: Virtual Environment (venv)
```bash
# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

#### Option B: Conda
```bash
# Create conda environment
conda create -n nqrpro python=3.11

# Activate it
conda activate nqrpro
```

### 3. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

**Expected output:**
```
Installing collected packages: pymongo, fastapi, uvicorn, python-dotenv, pydantic...
Successfully installed...
```

### 4. Install Frontend Dependencies
```bash
cd ../noq-frontend
npm install
# or
yarn install
```

**Expected output:**
```
added XXX packages, and audited XXX packages in Xs
```

---

## Database Setup

### 1. Start MongoDB

#### Local MongoDB (Windows)
```bash
# If installed as service
mongod

# Or with custom data directory
mongod --dbpath C:\data\db

# Verify connection
mongo
> db.version()
```

#### Local MongoDB (macOS/Linux)
```bash
# Using Homebrew (macOS)
brew services start mongodb-community

# Using systemctl (Linux)
sudo systemctl start mongod

# Verify connection
mongo
> db.version()
```

#### MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Copy connection string: `mongodb+srv://username:password@cluster.mongodb.net/database`
4. Keep this for later use in `.env` file

### 2. Create Environment File

Create `backend/.env`:
```env
# MongoDB Configuration
MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=noq_hospital_local
MONGO_POOL_MIN=10
MONGO_POOL_MAX=50

# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
ENVIRONMENT=development

# Security
JWT_SECRET=your-secret-key-change-in-production
PASSWORD_SALT=your-salt-change-in-production
LOG_LEVEL=DEBUG

# Frontend Configuration
FRONTEND_URL=http://localhost:5173
API_BASE_URL=http://localhost:8000/api
```

**For Production:**
```env
# Use MongoDB Atlas
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/nqrpro_prod

# Change secrets
JWT_SECRET=generate-with-python-secrets-module
PASSWORD_SALT=generate-with-python-secrets-module

# Update settings
ENVIRONMENT=production
LOG_LEVEL=INFO
FRONTEND_URL=https://yourdomain.com
```

### 3. Initialize Database

```bash
cd backend

# Run database initialization
python init_db.py
```

**Expected output:**
```
============================================================
  MongoDB Database Initialization
============================================================

✓ Connected to MongoDB: noq_hospital_local

📈 Creating database indexes...
  ✓ Index on users.email
  ✓ Index on hospitals.name
  ...
✓ Indexes created successfully

📦 Loading sample data...
  ✓ Loaded 5 documents into users
  ✓ Loaded 10 documents into hospitals
  ...
✓ Sample data loaded (75 documents total)

🏷️  Creating database metadata...
✓ Database metadata created

🔍 Verifying collections...
  ✓ users (5 documents)
  ✓ hospitals (10 documents)
  ...
✓ Found 11 collections

============================================================
  Initialization Summary
============================================================
✓ Creating indexes
✓ Loading sample data
✓ Creating metadata
✓ Verifying collections

Status: 4/4 steps completed

🎉 Database initialization complete!
```

---

## Backend Configuration

### 1. Verify Setup
```bash
cd backend

# Run setup verification
python verify_setup.py
```

**Expected output:**
```
============================================================
  Setup Verification
============================================================

✓ Checking environment configuration...
  ✓ .env file exists
  ✓ MONGO_URI is set
  ✓ JWT_SECRET is set
✓ Environment Configuration

✓ Checking Python dependencies...
  ✓ pymongo
  ✓ fastapi
  ✓ uvicorn
  ✓ pydantic
✓ Python Dependencies

...

============================================================
  Verification Summary
============================================================
Status:    ✓ PASSED
Passed:    7
Failed:    0
Total:     7
Success:   100.0%

🎉 All checks passed!
```

### 2. Configure Logging
```python
# backend/main.py includes logging configuration
# Logs are written to console with structured format
# For file logging, add:

import logging.handlers
handler = logging.handlers.RotatingFileHandler(
    'app.log',
    maxBytes=10485760,  # 10MB
    backupCount=5
)
```

### 3. Configure CORS (if needed)
```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Frontend Configuration

### 1. Environment Setup

Create `noq-frontend/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_ENVIRONMENT=development
```

Or in production:
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_ENVIRONMENT=production
```

### 2. Configure API Client

The API client (`src/services/api.js`) automatically includes:
- ✓ Retry logic (3 retries with exponential backoff)
- ✓ Timeout handling (10 seconds)
- ✓ Health check endpoint
- ✓ Structured error responses with status codes

No additional configuration needed.

### 3. Firebase Setup (Optional)

If using Firebase authentication:
```javascript
// src/services/FirebaseAuthService.js
const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  // ... other config
};
```

---

## Running the Application

### Terminal 1: Start MongoDB
```bash
mongod
# Or if using cloud:
# MongoDB Atlas connection is automatic
```

### Terminal 2: Start Backend
```bash
cd backend

# Activate virtual environment
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Test with:
```bash
curl http://localhost:8000/health
# Should return:
# {"status":"healthy","timestamp":"2024-01-15T10:30:00Z","database":"connected"}
```

### Terminal 3: Start Frontend
```bash
cd noq-frontend

# Install dependencies if not done
npm install

# Start development server
npm run dev
```

**Expected output:**
```
  VITE v4.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Access at: http://localhost:5173

---

## Verification & Testing

### 1. Run Integration Tests
```bash
cd backend

python integration_test.py
```

**Expected output:**
```
============================================================
  MongoDB + API Integration Test Suite
============================================================

🔗 CONNECTION TESTS

▶ MongoDB connection...
  ✓ Passed
▶ Database health check...
  ✓ Passed

📦 COLLECTION TESTS

▶ Collections exist...
  ✓ Passed
▶ Create user...
  ✓ Passed
...

============================================================
  Test Summary
============================================================
Passed:  25
Failed:  0
Total:   25
Success: 100.0%

✓ All tests passed! 🎉
```

### 2. Run End-to-End Verification
```bash
cd backend

python e2e_verify.py
```

**Expected output:**
```
============================================================
  End-to-End Verification
============================================================

STEP 1: MongoDB Connection

✓ MongoDB connected: noq_hospital_local

STEP 2: Database Initialization

▶ Database Initialization...
  ✓ Passed

STEP 3: Integration Tests

▶ Integration Tests...
  ✓ Passed

STEP 4: Setup Verification

▶ Verify Setup Script...
  ✓ Passed

============================================================
  Verification Summary
============================================================
Status:    ✓ PASSED
Passed:    4
Failed:    0
Total:     4
Success:   100.0%

🎉 All verification steps passed!

📄 Report saved to: E2E_TEST_REPORT.json
```

### 3. Test API Endpoints

**Authentication:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.local","password":"password"}'
```

**Get Users:**
```bash
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Hospitals:**
```bash
curl http://localhost:8000/api/hospitals
```

### 4. Test Frontend

1. Open http://localhost:5173
2. Try login with test credentials
3. Navigate through pages
4. Verify API calls in browser console

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongo --eval "db.version()"

# If connection refused:
# 1. Start MongoDB service
# 2. Check MONGO_URI in .env
# 3. Verify firewall settings

# View logs:
mongod --logpath /tmp/mongodb.log
```

### Backend Startup Issues
```bash
# Check Python version
python --version

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check port availability
# On Windows:
netstat -ano | findstr :8000

# On Mac/Linux:
lsof -i :8000

# If port in use, change port in .env or:
uvicorn main:app --port 8001
```

### Frontend Compilation Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# If still having issues:
npm cache clean --force
npm install
npm run dev
```

### API Connection Issues
```bash
# Test backend health endpoint
curl http://localhost:8000/health

# Check CORS configuration
# If getting CORS errors, verify FRONTEND_URL in backend/.env

# View network requests in browser DevTools
# Look for 401/403/500 errors and their responses
```

### Database Initialization Fails
```bash
# Check if collections already exist
mongo yourdatabase
> db.getCollectionNames()

# Clear collections if needed
db.users.deleteMany({})

# Re-run initialization
python init_db.py
```

---

## Deployment

### Production Checklist

- [ ] Update all environment variables (secrets, URLs, etc.)
- [ ] Set `ENVIRONMENT=production` in backend/.env
- [ ] Enable HTTPS for frontend and backend
- [ ] Use MongoDB Atlas or managed database service
- [ ] Set strong JWT_SECRET and PASSWORD_SALT
- [ ] Configure CORS properly to allow only your domain
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Run security audit: `pip install bandit && bandit -r backend/`
- [ ] Test all endpoints in production-like environment

### Deployment Options

#### Option 1: Traditional Linux Server
```bash
# 1. SSH into server
ssh user@production-server

# 2. Clone repository
git clone <repo-url> nqrpro
cd nqrpro

# 3. Set up Python environment
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 4. Set up systemd service for backend
sudo cp nqrpro-backend.service /etc/systemd/system/
sudo systemctl start nqrpro-backend
sudo systemctl enable nqrpro-backend

# 5. Set up nginx for frontend
sudo apt install nginx
# ... configure nginx to serve frontend

# 6. Set up MongoDB
sudo apt install mongodb
mongo # connect and setup
```

#### Option 2: Docker Containerization
```dockerfile
# Dockerfile
FROM python:3.11
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Option 3: Cloud Platforms
- **AWS**: EC2 for backend, S3 for frontend, MongoDB Atlas for database
- **Heroku**: Deploy FastAPI backend, React frontend via static hosting
- **DigitalOcean**: App Platform with MongoDB managed database
- **Vercel**: Perfect for React frontend deployment

### Monitoring

Set up monitoring for:
- **Backend**: CPU, memory, response times, error rates
- **Database**: Query performance, connection pool usage, storage
- **Frontend**: User interactions, error tracking (Sentry)

---

## Quick Start Checklist

- [ ] Prerequisites installed (Python 3.9+, Node 16+, MongoDB)
- [ ] Python virtual environment created and activated
- [ ] Backend dependencies installed: `pip install -r requirements.txt`
- [ ] Frontend dependencies installed: `npm install`
- [ ] MongoDB running on localhost:27017 or cloud configured
- [ ] `.env` file created with MongoDB URI and secrets
- [ ] Database initialized: `python init_db.py`
- [ ] Setup verified: `python verify_setup.py`
- [ ] Backend started: `uvicorn main:app --reload`
- [ ] Frontend started: `npm run dev`
- [ ] Tests passed: `python integration_test.py`
- [ ] Application accessible at http://localhost:5173

---

## Support & Documentation

- **Backend API Docs**: http://localhost:8000/docs (Swagger UI)
- **MongoDB Docs**: https://docs.mongodb.com/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Docs**: https://react.dev/

---

**Last Updated**: January 2024
**Version**: 1.0.0
