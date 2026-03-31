# NOQ Hospital Management System

A comprehensive, production-ready hospital management system built with modern web technologies: **MongoDB** for data persistence, **FastAPI** for the backend API, and **React** for the frontend.

## 🌟 Key Features

### Backend API (FastAPI)
- **RESTful API** endpoints following standardized conventions.
- **MongoDB integration** with connection pooling and async drivers.
- **Role-Based Access Control (RBAC)** across all resources.
- **Standardized Response Model** (success, message, data).
- **JWT-based Authentication** for secure sessions.
- **Interactive Documentation** with Swagger UI and Redoc.

### Frontend (React)
- **4 Distinct User Roles**: Admin, Doctor, Hospital Manager (HM), and Patient.
- **Complete Feature Set**: Appointment booking, queue management, prescription tracking, and revenue analytics.
- **Dynamic Real-time Dashboard**: Responsive design for all screen sizes.
- **API service layer**: Centralized `api.js` with consistent error handling.

### Database (MongoDB)
- **Scalable Document Store**: Optimized collections for multi-role workflows.
- **Indexing**: Efficient query execution for large datasets.
- **Data Integrity**: Consistent serialization across all routes.

## 📋 System Overview

```
┌─────────────────────────────────────────────────────┐
│           Client Layer (React Frontend)             │
│  ├─ Multi-Role Dashboard                             │
│  ├─ Appointment & Queue Workflows                   │
│  └─ Service-Oriented Architecture                   │
│                    ↓                                 │
│  HTTP/HTTPS, JSON, JWT Tokens (Authorization)      │
│                    ↓                                 │
├─────────────────────────────────────────────────────┤
│         API Layer (FastAPI Backend)                 │
│  ├─ RESTful Endpoints (RBAC Enabled)                │
│  ├─ Asynchronous MongoDB Driver                     │
│  ├─ Shared DB Connection Pooling                    │
│  └─ Modular Router Registry                         │
│                    ↓                                 │
│         MongoDB Query Pipeline                      │
│                    ↓                                 │
├─────────────────────────────────────────────────────┤
│      Data Layer (MongoDB Database)                  │
│  ├─ Collections: Users, Hospitals, Appointments...  │
│  ├─ Advanced Booking & Revenue Management           │
│  └─ Atomic Updates & Performance Indexing           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.9+ 
- Node.js 18+
- MongoDB 5.0+ (Local or Atlas)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nqrpro
   ```

2. **Set up Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   # Ensure .env points to your MongoDB instance
   uvicorn main:app --port 8000 --reload
   ```

3. **Set up Frontend**
   ```bash
   cd ../noq-frontend
   npm install
   npm run dev
   ```

## 📚 API Architecture

| Router | Prefix | Description |
|--------|---------|-------------|
| **Auth** | `/auth` | Login, Registration, Password Resets |
| **Users** | `/users` | Profile management & Role-based listing |
| **Hospitals** | `/hospitals` | Hospital registration & available listings |
| **Appointments** | `/appointments` | Booking & status tracking |
| **Departments** | `/departments` | HM managed hospital segments |
| **Rooms** | `/rooms` | Room availability & assignments |
| **Queues** | `/queues` | Real-time queue status & next-caller logic |
| **Tokens** | `/tokens` | Patient queue tokens |
| **Diseases** | `/diseases` | Disease catalogue for smart routing |
| **Reviews** | `/reviews` | Patient feedback system |
| **Prescriptions** | `/prescriptions` | Clinical documentation |
| **Revenue** | `/revenue` | Analytics for HM Role |

## 🧪 Testing & Verification

Comprehensive testing suite for system integrity:

- **Auth Verification**: `test_auth_8000.ps1`
- **Integration Workflow**: `integration_test.py`
- **Sync Audit**: `verify_sync.py`
- **Manual End-to-End**: Sign up as patient -> find hospital -> book token -> doctor visit.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, FontAwesome, Lucide React
- **Backend**: FastAPI, Pydantic, PyMongo, Motor
- **Database**: MongoDB (Atlas/Community)
- **Auth**: JWT, Bcrypt

---
*Developed by the NOQ Team*
