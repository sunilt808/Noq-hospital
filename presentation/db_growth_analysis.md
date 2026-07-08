# NOQ Database Growth & Real-World Usage Analysis

## 1. Database Growth Analysis

Based on the schemas and the `mongodb.<collection>` insert statements found in the backend codebase, here is the real-world storage calculation for every collection.

*Assumptions for "Expected Records per Day": A medium-sized clinic handling ~200 patients/day.*

| Collection | Purpose | Average Doc Size | Expected Records / Day | Expected Records / Month | Estimated Storage (3 Months) | 6 Months | 12 Months |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **users** | Patients, Doctors, HMs, Admins | ~1.5 KB | 30 | 900 | ~4.0 MB | ~8.1 MB | ~16.2 MB |
| **hospitals** | Hospital profiles & configs | ~2.0 KB | 0 (Static) | 1 | ~0.01 MB | ~0.02 MB | ~0.04 MB |
| **departments**| Hospital departments | ~0.8 KB | 0 (Static) | 0 | < 1 MB | < 1 MB | < 1 MB |
| **doctors** | Doctor profiles & schedules | ~1.5 KB | 1 | 30 | ~0.1 MB | ~0.2 MB | ~0.4 MB |
| **appointments**| Booking records | ~1.2 KB | 250 | 7,500 | ~27.0 MB | ~54.0 MB | ~108.0 MB |
| **queues** | Daily active queues per doctor | ~0.5 KB | 20 | 600 | ~0.9 MB | ~1.8 MB | ~3.6 MB |
| **tokens** | Individual queue tokens | ~0.8 KB | 250 | 7,500 | ~18.0 MB | ~36.0 MB | ~72.0 MB |
| **prescriptions**| Digital medical prescriptions | ~2.5 KB | 150 | 4,500 | ~33.7 MB | ~67.5 MB | ~135.0 MB |
| **reviews** | Feedback & ratings | ~1.0 KB | 25 | 750 | ~2.2 MB | ~4.5 MB | ~9.0 MB |
| **notifications**| In-app alerts | ~0.6 KB | 300 | 9,000 | ~16.2 MB | ~32.4 MB | ~64.8 MB |
| **audit_logs** | System analytics & security logs | ~1.2 KB | 1,500 | 45,000 | ~162.0 MB | ~324.0 MB | ~648.0 MB |
| **patient_proofs**| Uploaded documents (links/metadata) | ~1.0 KB | 50 | 1,500 | ~4.5 MB | ~9.0 MB | ~18.0 MB |

**Estimated Total Database Size:**
*   **1 Month:** ~89 MB
*   **3 Months:** ~268 MB
*   **6 Months:** ~537 MB *(Exceeds 512 MB Free Tier)*
*   **12 Months:** ~1.07 GB

## 2. API Call Analysis

By analyzing the routes and services (e.g., `queue_service.py`, `auth_service.py`), here is the estimated API behavior.
*Average API calls per active user per day: 15-20 (Fetching queues, checking notifications, polling token status).*

| API Endpoint Category | Primary DB Operation | Analytics Generated? | Estimated Daily Calls | Estimated Monthly Calls |
| :--- | :--- | :--- | :--- | :--- |
| **Auth (`/auth/*`)** | Read / Write | Yes (Logins/Signups) | 1,500 | 45,000 |
| **Appointments (`/appointments/*`)** | Write | Yes (Creates/Cancels) | 500 | 15,000 |
| **Queue & Tokens (`/queues/*`)** | Read/Write (Heavy) | No | 8,000 | 240,000 |
| **Prescriptions (`/prescriptions/*`)**| Read/Write | No | 300 | 9,000 |
| **Notifications (`/notifications/*`)**| Read (Heavy) | No | 5,000 | 150,000 |

*Note: The **Queue/Tokens API** and **Notifications API** generate the most read traffic (polling). The **Auth and Appointments APIs** generate the most database storage growth due to `AuditLogger` triggers.*

## 3. Analytics Storage (Audit Logs)

Looking closely at `backend/audit.py`, the system stores comprehensive JSON logs for every login, creation, update, and deletion.

*   **Is every API request stored?** No. Reads (GET requests) are not logged. Only Mutations (POST/PUT/DELETE) and Logins are logged.
*   **Are logs permanent?** Yes, there is currently no deletion or TTL (Time-To-Live) logic in the code.
*   **Are duplicate analytics created?** Yes. If a user fails to login 5 times, 5 separate `FAILED_LOGIN` documents are stored. 
*   **Growth Rate:** `audit_logs` will grow the fastest, accounting for **over 50% of your total storage** over a year.

**Audit Logs Storage Estimation alone:**
*   **1 Month:** ~54 MB
*   **3 Months:** ~162 MB
*   **6 Months:** ~324 MB
*   **12 Months:** ~648 MB

## 4. Is MongoDB Atlas (512 MB) Enough?

Based on the calculations, 512 MB is highly dependent on how the app is used.

| Usage Type | Expected Traffic | Estimated Time Until 512 MB Is Full | Safe for Atlas Free? |
| :--- | :--- | :--- | :--- |
| **Light** | 1 small clinic (20 patients/day) | ~3 Years | **Yes** |
| **Portfolio / Demo** | Recruiters, friends, professors testing | **Never** (Takes 10+ years) | **Yes** (Perfect) |
| **Normal** | 3-4 active clinics (200 patients/day) | ~5.5 Months | **No** (Needs upgrade/cleanup) |
| **Heavy / Production**| 10+ hospitals | ~1 Month | **No** (Must upgrade immediately) |
| **Stress Testing** | Automated API load testing scripts | ~2-3 Days | **No** |

## 5. Optimization Opportunities

If you want to stay on the 512 MB Free Tier forever while serving normal traffic, you must implement these code changes:

1.  **Add a TTL (Time-To-Live) Index to `audit_logs`:**
    *   *Implementation:* Run `db.audit_logs.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 })` (Deletes logs after 30 days).
    *   *Savings:* Reduces audit storage from 648 MB/year to a constant maximum of ~54 MB.
2.  **Add a TTL Index to `notifications`:**
    *   Delete read notifications older than 7 days.
    *   *Savings:* Saves ~50 MB/year.
3.  **Aggregate Queue Tokens:**
    *   Instead of storing thousands of individual `tokens` permanently, delete them at midnight using a scheduled cron job (or TTL), keeping only aggregated stats in the `queues` collection.
    *   *Savings:* Saves ~70 MB/year.
4.  **Omit `old_values` in Audit Logs:**
    *   In `audit.py`, storing the entire old JSON payload takes up double the space. Only store the fields that actually changed.

*By applying just the TTL index on audit logs, your database size after 12 months would drop from ~1.07 GB to roughly ~400 MB, keeping you safely within the 512 MB limit.*

## 6. Long-Term Recommendation

Based entirely on your project's code and logical data flow:

*   **Is 512 MB enough for 3 months?** Yes (99% confidence).
*   **Is 512 MB enough for 6 months?** Unlikely under real-world usage (40% confidence).
*   **Is 512 MB enough for 12 months?** No, definitely not (0% confidence).

**My Final Recommendation:**

**Option B: Stay on MongoDB Atlas Free and periodically clean/archive data.**

*   **Why:** For a student portfolio and early-stage startup, spending money on a database is unnecessary. Your primary bottleneck is the `audit_logs` collection. 
*   **Actionable Advice:** Go into MongoDB Atlas, navigate to the `audit_logs` collection, and create a TTL index on the `timestamp` field set to 30 days. Do the same for old `notifications`. This zero-cost architectural change fundamentally solves your storage growth problem, allowing the 512 MB tier to easily last you 1-2 years of real-world clinic usage. 
*   You do **not** need to migrate to another database; you just need to prevent infinite logging.
