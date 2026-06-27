# 🏥 NOQ Hospital Management System

*A Fair, Real-Time, and Scalable Hospital Workflow Platform*

![Landing Page](file:///d:/nqrpro/screenshots/landing.png)

A comprehensive, production-ready hospital management system built with modern web technologies: **MongoDB** for data persistence, **FastAPI** for the backend API, and **React** for the frontend.

---

## 🌟 Project Vision

The **NOQ Hospital Management System** is designed to solve real-world problems in Indian hospitals, where long queues, lack of transparency, and unfair prioritization are common.

Unlike traditional systems that focus only on appointments and records, this platform introduces:
* **Fairness (No VIP Culture)**
* **Real-Time Queue Accuracy**
* **Patient & Doctor Accountability**
* **Priority-Based Ethical Access**

---

## 💡 Core Idea

> A hospital system that ensures **only physically present patients can book appointments**, while still supporting **priority-based remote booking for critical cases**.

This ensures:
* No fake bookings
* Reduced waiting time confusion
* Transparent and fair queue system

---

## 🔥 Unique Features

### 🎯 1. Location-Based Booking Validation
* Normal patients must be **physically present in the hospital** to book.
* Prevents misuse and fake slot blocking.
* Ensures accurate queue timing.

📌 *Implementation Idea*: QR scan / geofencing inside hospital premises.

### ⚖️ 2. Fair Queue System (No VIP / No Bias)
* First-Come-First-Serve strictly enforced.
* No manual override or priority skipping.
* Equal treatment for all patients.

### 👶 3. Smart Priority Booking (Remote Access)
Remote booking (Advanced Booking) is allowed only for:
* Pregnant women 🤰
* Senior citizens (70+) 👴
* Children (0–8 years) 👶

👉 These groups cannot handle long waiting queues, so the system ensures **ethical prioritization**.

### ⏱️ 4. Real-Time Queue Transparency
* Live queue status.
* Doctor availability tracking.
* Break time visibility.
* Estimated waiting time.

### 📊 5. Accountability System
* **👨‍⚕️ Doctor Accountability**: Track working hours, break monitoring, queue handling transparency.
* **🧍 Patient Accountability**: Missed appointments tracking, repeated absence → penalty / temporary block.

### 🧾 6. Complaint Management System
* Patients can report misconduct or long delays.
* Hospital Manager (HM) can review complaints, issue formal warnings, and suspend doctors if needed.

### 💊 7. Medical Records & Prescriptions
* Digital prescription tracking.
* Patient medical history & document uploads.
* Centralized record system linked by unique IDs.

### 📈 8. Revenue & Analytics
* Hospital earnings tracking.
* Appointment statistics.
* Performance insights for Hospital Managers.

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────┐
│            React Frontend                    │
│  - Multi-role dashboards (Admin, HM, Doc)    │
│  - Queue, booking & complaint UI             │
│  - Service-Oriented Logic (`apiDbService`)   │
└──────────────────────────────────────────────┘
                    ↓
        HTTP/HTTPS, JSON, JWT Auth
                    ↓
┌──────────────────────────────────────────────┐
│            FastAPI Backend                   │
│  - REST APIs (RBAC enabled)                 │
│  - Queue & fairness algorithms              │
│  - Complaint & booking engine               │
└──────────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────────┐
│            MongoDB Database                 │
│  - Users, Hospitals, Appointments, Queues    │
│  - Complaints, Records, Revenue             │
└──────────────────────────────────────────────┘
```

---

## 📂 Folder Structure

### Backend (FastAPI)
```
backend/
├── main.py                  # Application entry point and router registry
├── database.py              # MongoDB async driver (Motor) setup
├── requirements.txt         # Python dependencies
├── models/                  # Pydantic models & validation schemas
├── routes/                  # API Endpoints (Auth, Users, Appointments, etc.)
│   ├── auth.py              # JWT authentication & session handling
│   ├── advanced_bookings.py # Priority booking system
│   ├── complaints.py        # Grievance reporting system
│   ├── hospitals.py         # Hospital management
│   ├── prescriptions.py     # Medical documents & history
│   └── ...                  # Other entity routers
├── services/                # Reusable business logic & integrations
└── uploads/                 # Static asset storage (if applicable)
```

### Frontend (React + Vite)
```
noq-frontend/
├── index.html               # Main HTML template
├── package.json             # NPM dependencies & scripts
├── src/
│   ├── App.jsx              # Main routing & Protected Routes setup
│   ├── main.jsx             # React DOM entry
│   ├── components/          # Reusable UI elements & layouts
│   │   ├── admin/           # Super admin dashboard layout
│   │   ├── hm/              # Hospital Manager dashboard layout
│   │   ├── doctor/          # Doctor interface components
│   │   └── pat/             # Patient portal & sidebar layout
│   ├── context/             # React Contexts (e.g., AuthContext)
│   ├── hooks/               # Custom hooks (e.g., useApiData)
│   ├── pages/               # Top-level page components
│   │   ├── admin/           # Platform overview, HM approvals
│   │   ├── hm/              # Staff management, queues, feedback
│   │   ├── doctor/          # Consultation workflows
│   │   └── patient/         # Booking, complaints, medical records
│   ├── services/            # API interaction layers
│   │   ├── api.js           # Axios wrapper with automated error handling
│   │   └── apiDbService.js  # Abstraction layer for data fetching
│   └── styles/              # Global CSS & theme styles
```

---

## 🛠️ Technology Stack

* **Frontend**: React, Vite, FontAwesome, React Router Dom
* **Backend**: FastAPI, Pydantic, PyMongo, Motor
* **Database**: MongoDB (Atlas/Community)
* **Authentication**: JWT, Bcrypt

---

## 📸 Application Screenshots

### 🖥️ Main Interfaces
| Landing Page | Login Portal |
|:---:|:---:|
| ![Landing](file:///d:/nqrpro/screenshots/landing.png) | ![Login](file:///d:/nqrpro/screenshots/login.png) |

### 👥 User Dashboards
| Patient Dashboard | Admin Dashboard |
|:---:|:---:|
| ![Patient](file:///d:/nqrpro/screenshots/patient_dashboard.png) | ![Admin](file:///d:/nqrpro/screenshots/admin_dashboard.png) |

---

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

---

## 📚 API Architecture

| Router | Prefix | Description |
|--------|---------|-------------|
| **Auth** | `/auth` | Login, Registration, Password Resets |
| **Users** | `/users` | Profile management & Role-based listing |
| **Hospitals** | `/hospitals` | Hospital registration & available listings |
| **Appointments** | `/appointments` | Booking & status tracking |
| **Advanced Bookings**| `/advanced-bookings`| Priority bookings for sensitive cases |
| **Departments** | `/departments` | HM managed hospital segments |
| **Rooms** | `/rooms` | Room availability & assignments |
| **Queues** | `/queues` | Real-time queue status & next-caller logic |
| **Tokens** | `/tokens` | Patient queue tokens |
| **Diseases** | `/diseases` | Disease catalogue for smart routing |
| **Reviews** | `/reviews` | Patient feedback system |
| **Complaints** | `/complaints` | Public grievance reporting & HM action system |
| **Prescriptions** | `/prescriptions` | Clinical documentation & medicine info |
| **Medical Records**| `/medical-records`| Past medical histories & document uploads |
| **Revenue** | `/revenue` | Analytics and billing tracking for HM Role |

---

## 🚧 Pending Works & Roadmap

While the core migration to MongoDB and major features are complete, the following tasks are planned for future updates:

- **Advanced Booking System (Frontend Integration)**: The backend for advanced bookings is fully implemented. The frontend UI has been built, but some final integration and flow refinements will be completed later.
- **Payment Gateway Integration**: Integration with Stripe/Razorpay for handling real-time payments for priority tokens and hospital bills.
- **Push Notifications**: WebSockets or Firebase Cloud Messaging (FCM) integration for real-time queue updates and appointment alerts.
- **Video Consultations**: Telemedicine features for remote doctor-patient appointments.
- **Advanced Admin Analytics**: Deeper platform-wide analytics for super-admins regarding hospital performance and disease outbreaks.

---

## 👨‍💻 Developed By

**Sunil**  
*The NOQ Team*
