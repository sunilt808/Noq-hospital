# NOQ — Smart Hospital Queue Management System
## Project Review Report

**Document Version:** 1.0  
**Date:** June 27, 2026  
**Author:** Sunil T  
**Document Type:** Technical Review Report  

---

## 1. Executive Summary

**NOQ** is a full-stack, role-based hospital queue management platform designed to digitize and streamline outpatient workflows across multiple hospitals. The system replaces manual token-and-register processes with a real-time digital queue, appointment booking, prescription management, billing, complaint handling, and revenue analytics — all accessible via role-specific dashboards for **Admins**, **Hospital Managers (HM)**, **Doctors**, and **Patients**.

| Attribute | Detail |
|---|---|
| **Project Name** | NOQ — Smart Hospital Queue Management System |
| **Domain** | Healthcare / Hospital Management |
| **Architecture** | Client–Server, REST API, Role-Based Access Control |
| **Frontend** | React 19 + Vite 7 (SPA) |
| **Backend** | Python FastAPI + Uvicorn |
| **Database** | MongoDB (Primary) + SQLite (Legacy/Reference) |
| **Authentication** | JWT (JSON Web Tokens) with PBKDF2 password hashing |
| **Deployment** | Localhost (development), production-ready structure |

---

## 2. Problem Statement

Indian hospitals — especially government and semi-private facilities — still rely on manual token counters, paper registers, and verbal queue calls. This causes:

- Long, unpredictable patient wait times
- No visibility into queue position or estimated wait
- Doctors unable to manage patient flow efficiently
- Hospital managers lacking real-time operational data
- No centralized complaint or feedback mechanism
- Revenue leakage due to manual billing

**NOQ solves these problems** by providing a unified digital platform that connects patients, doctors, hospital managers, and a central administrator through role-specific dashboards with real-time queue management.

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI component library |
| React Router DOM | 7.13.0 | Client-side routing & navigation |
| Vite | 7.2.4 | Build tool & dev server |
| FontAwesome | 7.1.0 | Icon library |
| html2canvas | 1.4.1 | Screenshot/export functionality |
| Vanilla CSS | — | Custom styling, glassmorphism, animations |

### 3.2 Backend

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.104.1 | Async REST API framework |
| Uvicorn | 0.24.0 | ASGI server |
| Motor | 3.3.1 | Async MongoDB driver |
| PyMongo | 4.6.0 | MongoDB driver |
| SQLAlchemy | 2.0.23 | ORM (legacy/reference layer) |
| python-jose | 3.3.0 | JWT token creation & verification |
| Pydantic | 2.5.0 | Request/response validation |
| Beanie | 1.23.6 | MongoDB ODM |

### 3.3 Database

| Database | Role |
|---|---|
| **MongoDB** | Primary data store — users, hospitals, appointments, queues, tokens, prescriptions, reviews, complaints, audit logs, revenue distributions, notifications |
| **SQLite** | Legacy reference layer with SQLAlchemy ORM models |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│  React 19 SPA + Vite + React Router DOM                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Admin   │ │   HM     │ │  Doctor  │ │ Patient  │   │
│  │Dashboard │ │Dashboard │ │Dashboard │ │Dashboard │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │
│       │             │            │             │         │
│       └─────────────┴────────────┴─────────────┘         │
│                         │                                │
│              ┌──────────┴──────────┐                     │
│              │   API Service Layer │                     │
│              │  (api.js + services)│                     │
│              └──────────┬──────────┘                     │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP/REST (JWT Bearer Token)
┌─────────────────────────┼───────────────────────────────┐
│                  BACKEND (FastAPI)                        │
│              ┌──────────┴──────────┐                     │
│              │    CORS Middleware  │                     │
│              │  Global Error Hdlr │                     │
│              └──────────┬──────────┘                     │
│     ┌───────────────────┼───────────────────┐            │
│     │           API Router Layer            │            │
│     │  auth │ users │ hospitals │ appts ... │            │
│     └───────────────────┬───────────────────┘            │
│     ┌───────────────────┼───────────────────┐            │
│     │         Service / Business Logic      │            │
│     │  AuthService │ QueueService │ ...     │            │
│     └───────────────────┬───────────────────┘            │
│     ┌───────────────────┼───────────────────┐            │
│     │           Database Layer              │            │
│     │  MongoDB (Motor) │ SQLite (SQLAlchemy)│            │
│     └───────────────────┬───────────────────┘            │
└─────────────────────────┼───────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │       MongoDB         │
              │   noq_hospital_db     │
              └───────────────────────┘
```

### 4.2 Design Pattern

The project follows a **layered MVC-like architecture**:

| Layer | Location | Responsibility |
|---|---|---|
| **View (Frontend)** | `noq-frontend/src/pages/` | React components rendering UI per role |
| **Controller (Routes)** | `backend/routes/` | FastAPI routers handling HTTP requests |
| **Service (Business Logic)** | `backend/services/` | Core logic — auth, queue, booking, prescriptions |
| **Model (Data)** | `backend/models/` | Pydantic schemas for validation |
| **Database** | `backend/database.py` | MongoDB + SQLAlchemy connections |
| **Audit** | `backend/audit.py` | Centralized audit logging |

---

## 5. Role-Based Hierarchy & Access Control

### 5.1 User Roles

```
                    ┌─────────────┐
                    │    ADMIN     │  (Super User)
                    │  Full system │
                    │   control    │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
     ┌────────┴────────┐      ┌────────┴────────┐
     │ HOSPITAL MANAGER│      │ HOSPITAL MANAGER│
     │   (HM) – H1     │      │   (HM) – H2     │
     │ Manages hospital│      │ Manages hospital│
     └────────┬────────┘      └────────┬────────┘
              │                         │
     ┌────────┴────────┐      ┌────────┴────────┐
     │    DOCTORS      │      │    DOCTORS      │
     │  (Hospital H1)  │      │  (Hospital H2)  │
     └────────┬────────┘      └────────┬────────┘
              │                         │
     ┌────────┴────────┐      ┌────────┴────────┐
     │    PATIENTS     │      │    PATIENTS     │
     │ Book at any     │      │ Book at any     │
     │ hospital        │      │ hospital        │
     └─────────────────┘      └─────────────────┘
```

### 5.2 Role Permissions Matrix

| Feature | Admin | HM | Doctor | Patient |
|---|:---:|:---:|:---:|:---:|
| System Dashboard | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject Hospitals | ✅ | ❌ | ❌ | ❌ |
| Manage All Hospitals | ✅ | ❌ | ❌ | ❌ |
| Platform Revenue Analytics | ✅ | ❌ | ❌ | ❌ |
| Platform Reviews | ✅ | ❌ | ❌ | ❌ |
| Hospital Dashboard | ❌ | ✅ | ❌ | ❌ |
| Manage Doctors (CRUD) | ❌ | ✅ | ❌ | ❌ |
| Manage Departments | ❌ | ✅ | ❌ | ❌ |
| Manage Rooms | ❌ | ✅ | ❌ | ❌ |
| Manage Queues | ❌ | ✅ | ❌ | ❌ |
| Hospital Revenue | ❌ | ✅ | ❌ | ❌ |
| Handle Complaints | ✅ | ✅ | ❌ | ❌ |
| Advanced Bookings Mgmt | ❌ | ✅ | ❌ | ❌ |
| Audit Logs | ❌ | ✅ | ❌ | ❌ |
| Doctor Dashboard | ❌ | ❌ | ✅ | ❌ |
| View Appointments | ❌ | ❌ | ✅ | ❌ |
| Manage Patient Queue | ❌ | ❌ | ✅ | ❌ |
| Write Prescriptions | ❌ | ❌ | ✅ | ❌ |
| View Own Patients | ❌ | ❌ | ✅ | ❌ |
| Patient Dashboard | ❌ | ❌ | ❌ | ✅ |
| Book Appointment | ❌ | ❌ | ❌ | ✅ |
| Advanced Booking | ❌ | ❌ | ❌ | ✅ |
| View Prescriptions | ❌ | ❌ | ❌ | ✅ |
| View Medical Records | ❌ | ❌ | ❌ | ✅ |
| Pay Bills | ❌ | ❌ | ❌ | ✅ |
| Submit Reviews | ❌ | ❌ | ❌ | ✅ |
| File Complaints | ❌ | ❌ | ❌ | ✅ |

### 5.3 Route Protection (Frontend)

Each role has a **protected route wrapper** in `App.jsx`:

- `ProtectedAdminRoute` — Checks admin role + 24-hour session expiry
- `ProtectedHmRoute` — Checks HM role + approval status (pending/rejected/blocked)
- `ProtectedDoctorRoute` — Checks doctor role + active status
- `ProtectedPatientRoute` — Checks patient role + active status

---

## 6. Module Breakdown

### 6.1 Backend Modules (18 API Route Files)

| # | Module | Route Prefix | Key Functions |
|---|---|---|---|
| 1 | **Auth** | `/auth` | Login, Signup, JWT generation, password validation |
| 2 | **Users** | `/users` | CRUD for all user roles, profile management |
| 3 | **Hospitals** | `/hospitals` | Hospital registration, approval, profile update, soft delete |
| 4 | **Appointments** | `/appointments` | Create, list, update status, auto revenue on completion |
| 5 | **Departments** | `/departments` | Department CRUD per hospital |
| 6 | **Rooms** | `/rooms` | Room/chamber CRUD, doctor assignment |
| 7 | **Queues** | `/queues` | Queue create/manage, call next, capacity control |
| 8 | **Tokens** | `/tokens` | Token generation, status tracking (waiting/calling/completed) |
| 9 | **Diseases** | `/diseases` | Disease catalog management |
| 10 | **Reviews** | `/reviews` | Patient reviews with dual ratings (doctor + hospital) |
| 11 | **Prescriptions** | `/prescriptions` | Create, list, refill management, expiry tracking |
| 12 | **Revenue** | `/revenue` | Dashboard analytics, distribution breakdown, per-doctor revenue |
| 13 | **Advanced Bookings** | `/advanced-bookings` | Priority booking with auto doctor allocation (load-balanced) |
| 14 | **Bills** | `/bills` | Billing and payment tracking |
| 15 | **Settings** | `/settings` | System-wide settings |
| 16 | **Notifications** | `/notifications` | Push notifications per user/role/hospital |
| 17 | **Medical Records** | `/medical-records` | Patient medical history |
| 18 | **Complaints** | `/complaints` | File, track, and action complaints |

### 6.2 Backend Services (6 Service Files)

| Service | File | Responsibility |
|---|---|---|
| **AuthService** | `auth_service.py` | Password hashing (PBKDF2), JWT create/decode/verify, user authentication, user CRUD with Doctor record sync |
| **UserService** | `user_service.py` | User/Hospital/Department/Doctor CRUD, notifications, audit logs, patient proof uploads |
| **QueueService** | `queue_service.py` | Queue lifecycle, atomic token numbering, call/complete/cancel token operations |
| **AdvancedBookingService** | `advanced_booking_service.py` | Smart doctor allocation (load-balanced, specialization-matched), booking CRUD with role-based scoping |
| **PrescriptionService** | `prescription_service.py` | Prescription CRUD, refill management, expiry alerts |
| **ReviewService** | `review_service.py` | Review upsert with dual rating normalization, visibility control |

### 6.3 Frontend Modules

#### Admin Dashboard (8 pages)
Dashboard, HM Approvals, Hospitals, Revenue, Reviews, Notifications, Profile, Settings

#### Hospital Manager Dashboard (15 pages)
Management Dashboard, Hospital Profile, Doctors CRUD, Departments, Rooms, Diseases, Queues, Advanced Bookings, Revenue, Feedback, Notifications, Audit Logs, Doctor Credentials, Complaints, Pending Approval

#### Doctor Dashboard (8 pages)
Dashboard, Appointments, Patients, Queue Management, Prescriptions, Advanced Bookings, Profile, Patient Management

#### Patient Dashboard (12 pages)
Dashboard, Book Appointment, Advanced Booking, My Appointments, Medical Records, Prescriptions, Billing, Reviews, Notifications, Profile, Settings, Complaints

---

## 7. Database Schema (MongoDB Collections)

| Collection | Key Fields | Purpose |
|---|---|---|
| `users` | `_id`, `email`, `password_hash`, `full_name`, `role`, `hospital_id`, `status`, `specialization`, `department_id`, `fee`, `experience` | All system users |
| `hospitals` | `_id`, `name`, `address`, `phone`, `email`, `status`, `category`, `total_beds`, `accreditation` | Registered hospitals |
| `doctors` | `_id`, `user_id`, `hospital_id`, `department_id`, `specialization`, `consultation_fee` | Doctor profiles (synced with users) |
| `departments` | `_id`, `hospital_id`, `name`, `description`, `status` | Hospital departments |
| `rooms` | `_id`, `hospital_id`, `room_number`, `floor`, `type`, `assigned_doctor_id` | Hospital rooms/chambers |
| `appointments` | `_id`, `hospital_id`, `doctor_id`, `patient_id`, `appointment_date`, `status`, `fee`, `token_number` | Patient appointments |
| `queues` | `_id`, `hospital_id`, `doctor_id`, `status`, `token_counter`, `current_token`, `waiting_count` | Active queues |
| `tokens` | `_id`, `queue_id`, `patient_id`, `token_number`, `token_code`, `status`, `priority` | Queue tokens |
| `prescriptions` | `_id`, `patientId`, `doctorId`, `medication`, `dosage`, `duration`, `refillsRemaining` | Patient prescriptions |
| `reviews` | `_id`, `patient_id`, `doctor_id`, `hospital_id`, `doctor_rating`, `hospital_rating`, `comment` | Patient reviews |
| `complaints` | `_id`, `patient_id`, `hospital_id`, `doctor_name`, `problem`, `issue_type`, `status`, `action_taken` | Patient complaints |
| `notifications` | `_id`, `title`, `message`, `target_user_id`, `target_role`, `hospital_id`, `read` | System notifications |
| `audit_logs` | `_id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address` | Audit trail |
| `revenue_distributions` | `appointment_id`, `hospital_id`, `total_fee`, `doctor_amt`, `hm_amt`, `admin_amt` | Revenue splits |
| `advanced_bookings` | `_id`, `case_type`, `patient_id`, `doctor_id`, `hospital_id`, `room`, `priority`, `allocation_method` | Priority bookings |

---

## 8. Key Features & How They Work

### 8.1 Authentication Flow
1. Patient/Doctor/HM enters email + password on the Login page
2. Frontend calls `POST /auth/login` with `{email, password, role}`
3. Backend finds user in MongoDB, verifies PBKDF2 hash
4. On success, creates JWT token (HS256, 24h expiry) and returns user data + token
5. Frontend stores token in `localStorage` and attaches it as `Bearer` header on all API calls
6. `require_auth` dependency on backend routes extracts and validates JWT

### 8.2 Hospital Registration & Approval Flow
1. HM fills registration form (hospital name, personal details, category)
2. Frontend calls `POST /hospitals/register`
3. Backend creates hospital record (status: `pending`) and HM user record
4. Admin sees pending hospitals on "HM Approvals" dashboard
5. Admin approves/rejects → `PUT /hospitals/{id}/status`
6. On approval, hospital status changes to `active` and HM user status to `active`
7. HM can now log in and access their management dashboard

### 8.3 Smart Queue System
1. HM creates a queue for a doctor (room, department, date, max capacity)
2. Patient books appointment → gets a token number (atomic increment via MongoDB `$inc`)
3. Doctor's Queue page shows waiting list sorted by token number
4. Doctor clicks "Call Next" → token status changes to `calling`
5. After consultation, doctor marks token `completed`
6. Queue's `waiting_count` decrements atomically

### 8.4 Advanced Booking (Auto Doctor Allocation)
1. Patient selects case type: Pregnancy, Baby, Elder
2. System finds eligible doctors by matching `advanced_booking_category` and specialization keywords
3. Load-balanced allocation: picks doctor with fewest active bookings
4. If no specific doctor matches, falls back to `general` category
5. HM can manually reassign doctor if needed

### 8.5 Revenue Distribution
- When appointment is marked `completed`, revenue auto-distributes:
  - **Doctor:** 15% (or 70% via dashboard view)
  - **Hospital Manager:** 80% (or 20%)
  - **Admin/Platform:** 5% (or 10%)
- Revenue dashboard shows aggregated analytics, per-doctor breakdown, weekly trends

### 8.6 Complaint Management
1. Patient files complaint with token number, doctor name, issue type, description
2. Complaint stored with status `pending`
3. HM (same hospital) or Admin can review and take action: warn, suspend, dismiss
4. If action is `suspend`, the doctor's account status is automatically updated

---

## 9. Security Measures

| Measure | Implementation |
|---|---|
| **Password Hashing** | PBKDF2-HMAC-SHA256 with 100,000 iterations and random 256-bit salt |
| **JWT Authentication** | HS256 algorithm, 24-hour expiry, Bearer token scheme |
| **CORS Protection** | Restricted to `localhost:5173` and `localhost:5174` |
| **Input Validation** | Pydantic v2 models with field validators (email, phone, password strength) |
| **Password Policy** | Min 8 chars, uppercase, lowercase, digit, special character required |
| **Soft Delete** | Users and hospitals are soft-deleted (status → inactive/deleted) |
| **Audit Logging** | Every CREATE, UPDATE, DELETE, LOGIN, FAILED_LOGIN logged with IP address |
| **Role-Based Access** | Frontend route guards + backend `require_auth` dependency |
| **Error Handling** | Global exception handler, no stack traces in production |
| **Retry Logic** | Frontend API client retries 3x on 5xx errors with exponential backoff |

---

## 10. API Client Architecture (Frontend)

The frontend uses a custom `api.js` service layer with:

- **Base URL configuration** via environment variables (`VITE_API_URL`)
- **Auto-attached JWT** from localStorage on every request
- **10-second request timeout** with AbortController
- **3x retry** with exponential backoff (1s → 1.5s → 2.25s) for server errors
- **422 Pydantic error parsing** for user-friendly validation messages
- **Health check endpoint** for connectivity monitoring

---

## 11. Project File Structure

```
nqrpro/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── database.py              # MongoDB + SQLAlchemy setup
│   ├── audit.py                 # Centralized audit logger
│   ├── hospital_id_utils.py     # Hospital ID generation (Noq-XXXXXX)
│   ├── requirements.txt         # Python dependencies
│   ├── models/
│   │   ├── user.py              # Pydantic user schemas
│   │   ├── hospital.py          # Hospital & appointment schemas
│   │   ├── queue.py             # Queue & token schemas
│   │   └── advanced_booking.py  # Advanced booking schemas
│   ├── routes/                  # 18 API route modules
│   │   ├── auth.py, users.py, hospitals.py, appointments.py,
│   │   ├── departments.py, rooms.py, queues.py, tokens.py,
│   │   ├── diseases.py, reviews.py, prescriptions.py,
│   │   ├── revenue.py, advanced_bookings.py, bills.py,
│   │   ├── settings.py, notifications.py, medical_records.py,
│   │   └── complaints.py
│   └── services/                # 6 business logic services
│       ├── auth_service.py, user_service.py, queue_service.py,
│       ├── advanced_booking_service.py, prescription_service.py,
│       └── review_service.py
│
└── noq-frontend/
    ├── package.json             # React 19 + Vite 7
    ├── vite.config.js           # Build configuration
    ├── index.html               # SPA entry point
    └── src/
        ├── App.jsx              # Root router with role guards
        ├── App.css              # Global styles
        ├── main.jsx             # React DOM render
        ├── context/
        │   └── AuthContext.jsx  # Global auth state (login/logout/signup)
        ├── hooks/
        │   └── useApiData.js   # Custom data-fetching hook
        ├── services/            # 14 API service modules
        │   ├── api.js           # Core HTTP client with retry
        │   ├── authService.js   # Role-specific login/register
        │   └── ... (12 more domain services)
        ├── components/
        │   ├── AdminApp.jsx + AdminLayout.jsx
        │   ├── hm/HmApp.jsx + HmLayout.jsx
        │   ├── doctor/DoctorApp.jsx + DoctorLayout.jsx
        │   └── pat/PatientApp.jsx + PatientLayout.jsx
        └── pages/
            ├── Login.jsx, Signup.jsx
            ├── admin/ (9 pages)
            ├── hm/ (15+ pages)
            ├── doctor/ (8 pages)
            └── patient/ (12 pages)
```

---

## 12. How to Run the Project

### Backend
```bash
cd backend
pip install -r requirements.txt
# Ensure MongoDB is running on localhost:27017
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd noq-frontend
npm install
npm run dev
# Opens on http://localhost:5173
```

### Default Users (Seeded via `seed_admin_mongo.py`)
| Role | Email | Purpose |
|---|---|---|
| Admin | (seeded) | Platform administration |
| HM | (registered) | Hospital management |
| Doctor | (created by HM) | Patient consultation |
| Patient | (self-registered) | Book appointments |

---

## 13. Future Scope

- Real-time queue updates via WebSocket/SSE
- SMS/Email notification integration
- QR-based check-in at hospital kiosks
- AI-based appointment scheduling optimization
- Telemedicine / video consultation module
- Mobile app (React Native)
- Multi-language support
- Integration with government health APIs (ABDM/ABHA)

---

## 14. Conclusion

NOQ is a production-grade, modular hospital queue management system that demonstrates mastery of full-stack development with modern technologies. The role-based architecture cleanly separates concerns across Admin, Hospital Manager, Doctor, and Patient workflows, while the service layer ensures business logic remains testable and maintainable. The MongoDB-backed backend provides horizontal scalability, and the React/Vite frontend delivers a fast, responsive user experience.

---

*End of Review Report*
