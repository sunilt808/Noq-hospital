# NOQ — SMART HOSPITAL QUEUE MANAGEMENT SYSTEM
## Comprehensive Master Interview Preparation & Q&A Guide

---

## 1. PROJECT OVERVIEW & ARCHITECTURAL SUMMARY

**NOQ** is an enterprise-grade, role-based healthcare workflow optimization platform designed to digitize outpatient department (OPD) queue management, billing, prescriptions, complaints, and analytics. It completely replaces paper-based registries and archaic verbal tokens with a real-time digital queue system that connects four core roles (Platform Admins, Hospital Managers, Doctors, and Patients).

### 1.1 Architectural Evolution & Migration Rationale
The project was originally engineered on **Google Firebase** (as a serverless prototype). However, real-world benchmarking exposed critical performance bottlenecks and excessive operating costs under heavy query loads.
- **The Firebase Bottleneck:** Firebase charges per document read. Dashboard views (like analytical panels for Hospital Managers requesting weekly/monthly revenue trends across departments) required thousands of document reads on every page load. This triggered quota limit breaches and high latency.
- **The MongoDB + FastAPI Pivot:** To solve this, the architecture was migrated to a custom backend stack. By utilizing **FastAPI (Python ASGI)** for async request processing and **MongoDB** for document persistence:
  - Database aggregations (using MongoDB's Aggregation Pipeline) perform analytical computations engine-side and return a single aggregated JSON payload.
  - Average API response times dropped from **~400ms** to **~45ms**.
  - Dashboard load speeds improved by **80%**.

---

## 2. DETAILED FUNCTIONALITIES BY ROLE

The system enforces a strict Role-Based Access Control (RBAC) matrix to segregate duties and ensure patient data privacy:

### 2.1 Platform Super Admin
- **Oversight:** Approves or rejects new Hospital Manager registrations to prevent fraudulent or unaccredited facilities from joining the platform.
- **Platform Analytics:** Monitors the 5% platform service fee collected across all participating hospitals.
- **Compliance Monitoring:** Full read access to the global audit logs tracking system-wide state changes.

### 2.2 Hospital Manager (HM)
- **Local Administration:** Operates as the administrative controller for a specific hospital location.
- **Resource Management:** Performs CRUD operations on Doctors, Departments, Rooms, and active Disease Catalogs.
- **Queue Management:** Configures daily OPD queues, assigning rooms, doctor duties, and maximum patient capacities.
- **Compliance & Escalations:** Audits local doctor activity and actions patient complaints.

### 2.3 Doctor
- **OPD Queue Interface:** A streamlined, distraction-free screen that displays active queue lists.
- **Queue Control:** Sequentially triggers the 'Call Next' action, updating token statuses from `waiting` to `calling` or `completed`.
- **Clinical Records:** Creates digital prescriptions (managing drug names, dosages, durations, and refill limits) linked directly to the patient's medical records.
- **Patient History:** Views past medical histories, diagnoses, and prior prescriptions during consultation.

### 2.4 Patient
- **Search & Booking:** Searches approved hospitals and books live OPD queue tokens or advanced appointments.
- **Live Tracking:** Tracks their real-time token position and estimated waiting time remotely, eliminating waiting room congestion.
- **Clinical Wallet:** Accesses current bills, pays fees, and downloads prescriptions as digital PDF receipts.
- **Compliance & Feedback:** Files complaints regarding doctor delays or billing issues.

---

## 3. CORE LOGIC, ALGORITHMS & POLICY RULES

### 3.1 Concurrency & Atomic Token Generation
To prevent race conditions where two patients booking simultaneously receive duplicate token numbers, NOQ avoids the traditional "read-increment-write" transaction pattern.
- **Implementation:** Uses MongoDB’s atomic `$inc` operator within a single `find_one_and_update` call. Because the database engine serializes lock-free increments at the document level, token numbers are guaranteed to be sequential and unique.

### 3.2 Geofenced vs. At-Home Booking Policy
NOQ implements strict booking rules to combat token spamming and optimize attendance:
1. **Normal Token Bookings (Geofenced):** Regular OPD token bookings must be executed while the patient is physically located within the surroundings of the hospital. The client-side application queries coordinates and validates distance against the hospital's registered latitude and longitude. The backend denies token generation if the coordinates exceed a defined threshold (e.g., 500 meters).
2. **Advanced Bookings (At-Home):** To support vulnerable patients, remote at-home booking is permitted **strictly** for three priority groups:
   - **Pregnancy Cases** (Maternity tracking)
   - **Infants & Children** under 7 years of age
   - **Elderly Patients** aged 70 years and older
   
   *All other demographics must book regular tokens using the geofenced local booking rules.*

### 3.3 Smart Load-Balanced Allocation
When an eligible advanced booking is received (e.g., a Pregnancy case):
1. The backend searches active doctors matching the required specialization keywords.
2. It aggregates active booking workloads for each doctor.
3. The booking is automatically allocated to the doctor with the lowest active load, preventing scheduling imbalances.

### 3.4 Zero Emergency Policy
- **Rule:** NOQ is strictly an outpatient (OPD) queue optimizer. It does **not** process, queue, or triage emergency cases.
- **Workflow:** Emergency patients bypass the app entirely for direct physical care. Warning alerts are integrated into the booking interface to direct patients to call ambulance hotlines or visit the nearest ER in case of critical symptoms.

### 3.5 Platform Equality (Zero VIP Overrides)
- **Ethics Rule:** The system promotes absolute equality. There is no feature or endpoint parameter allowing users to jump the queue.
- **Enforcement:** The doctor's interface forces sequential token calling. The queue order is locked based strictly on chronological check-in times.

### 3.6 Mutual Accountability Protocols
To maintain high operational discipline, NOQ establishes accountability mechanisms for both doctors and patients:
- **Doctor Accountability:** Patients can file formal reports regarding doctor delays or unprofessional behavior. These complaints are routed directly to the Hospital Manager dashboard. Managers can issue warning letters or temporarily suspend the doctor's account.
- **Patient Accountability:** Repeated patient absences disrupt scheduling. If a patient is marked absent by a doctor:
  - An automated warning is generated.
  - Cumulative absences trigger a fixed, low penalty fee (e.g., ₹50) added to their next booking invoice to encourage queue responsibility.

### 3.7 Automated Revenue Distribution
- **Commission Split:** Upon marking an appointment `completed`, a backend service calculates the split: **80% Hospital Manager**, **15% Doctor**, and **5% Platform Admin**.
- **Execution:** Computed instantly and logged as an immutable distribution entry for real-time aggregation on user dashboards.

---

## 4. COMPANY-STYLE TECHNICAL INTERVIEW Q&A

### Q1: Why was MongoDB chosen over a relational database like PostgreSQL for patient clinical records?
**Answer:** Clinical data is inherently semi-structured and dynamic. A prescription might have three medications or fifteen, each with different instructions; diagnostic notes can vary widely. Storing this in SQL would require complex multi-table joins. MongoDB's document model stores nested arrays directly inside the patient record, keeping lookups fast. Application-level validation is maintained by using Pydantic schemas in FastAPI, giving us schema flexibility without sacrificing data integrity.

### Q2: How does the system handle race conditions during simultaneous token bookings?
**Answer:** If multiple patients try to book a token at the exact same millisecond, a standard database write would risk duplicate numbers. NOQ prevents this by utilizing MongoDB's atomic `find_one_and_update` combined with the `$inc` operator. Because this is executed as a single atomic write instruction at the database engine level, it guarantees that every token is unique and sequentially generated.

### Q3: Explain the implementation details of the Geofencing check. How do you prevent API spoofing?
**Answer:** The frontend captures coordinates via the browser's Geolocation API. When sending the booking request, it passes these coordinates to the backend. The backend computes the distance between the patient and the hospital using the Haversine formula:
$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
If the calculated distance exceeds the hospital's booking boundary (e.g., 500 meters), the API returns a `403 Forbidden` status. To prevent client-side spoofing, the backend can optionally verify IP-to-location ranges as an additional audit check.

### Q4: How is Role-Based Access Control (RBAC) enforced on the backend?
**Answer:** We implement RBAC via FastAPI dependencies. We define a dependency function `require_role(allowed_roles: List[str])`. When a request arrives, the dependency extracts the JWT from the `Authorization: Bearer` header, decodes it using `python-jose`, verifies the signature, and checks the user's role. If the role is not present in the allowed list, a `403 Forbidden` exception is thrown immediately, blocking execution before it reaches the database.

### Q5: What is the significance of the 15/80/5 revenue distribution algorithm, and how is it implemented?
**Answer:** This algorithm automates fee splitting to prevent manual accounting discrepancies. When an appointment status changes to `completed`, the router triggers a background task. This task calculates the splits (80% HM, 15% Doctor, 5% Admin) based on the doctor's consultation fee and writes a record to the `revenue_distributions` collection. Dashboards query this collection using MongoDB's aggregation pipeline to display real-time earnings.

### Q6: How does the Audit Logging system work, and does it impact API performance?
**Answer:** The audit logging system tracks every create, update, and delete action for security compliance. To prevent database writes from slowing down API responses, logging is handled asynchronously. We use FastAPI's `BackgroundTasks` to write log documents (containing timestamps, user IDs, action types, IP addresses, and state changes) to the database after the main API response is returned to the user.

### Q7: Why use React 19 + Vite 7 instead of Next.js or a traditional server-side rendering stack?
**Answer:** Since NOQ consists primarily of role-specific dashboards that require real-time state updates (like queue positions and booking lists), a Single Page Application (SPA) is ideal. React 19 provides efficient component-based rendering. Vite 7 leverages esbuild for extremely fast hot module replacement (HMR) and optimized build bundles, making it perfect for rapid local development and responsive client-side routing.

### Q8: How does the system handle patient absences, and what is the technical workflow?
**Answer:** When a patient does not show up, the doctor marks the token as 'Absent'. This triggers an update in the token collection. A scheduled task checks for repeated absences. If a patient is flagged multiple times, the system updates their account status to include a warning and appends a fixed ₹50 penalty fee to the database, which is verified and added to the invoice during their next booking flow.

### Q9: What security measures protect passwords and user sessions?
**Answer:** Passwords are never stored in plain text. We use `passlib` with PBKDF2-HMAC-SHA256 and a random 256-bit salt, running 100,000 iterations to secure credentials. Sessions are stateless and secured with HS256-signed JSON Web Tokens (JWT) configured with a strict 24-hour expiration, eliminating database session lookups on every request.

### Q10: How are "Soft Deletes" implemented, and why are they preferred in healthcare systems?
**Answer:** To preserve historical reports, invoices, and medical records, NOQ never hard-deletes database records. Instead, we use soft deletes. We add a `status` field (e.g. `active`, `inactive`, `deleted`) to collections like users and hospitals. All standard queries filter for `status: "active"`, while admin analytics can still query deleted records to maintain historical audit integrity.
