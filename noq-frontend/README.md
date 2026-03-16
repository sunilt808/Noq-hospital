# NOQ Frontend

NOQ is a multi-role hospital queue and appointment platform for Admin, Hospital Manager (HM), Doctor, and Patient workflows.

## Tech Stack

- React + Vite
- Firebase Authentication
- Firebase Firestore (free-tier friendly)
- FastAPI backend (JWT + Firebase token support)
- Deployment: Vercel (frontend) + Railway (backend)

## Local Run

```bash
npm install
npm run dev
```

Set API base URL if needed:

```bash
VITE_API_URL=http://127.0.0.1:8000
```

Optional backend local run:

```bash
cd ../backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Core Modules

- Patient: booking, advanced booking, appointments, billing, prescriptions, profile.
- Doctor: dashboard, queue, prescriptions, advanced bookings (allocated to logged-in doctor), patient status (block/warn/safe).
- HM: hospital management modules and advanced bookings board (allocated-doctor records only).
- Admin: hospital access controls, reviews, and revenue overview.

## Advanced Booking

Priority booking is available for:

1. Pregnancy ladies
2. Babies (0-8 years)
3. Olders (70+ years)

### Flow

- Patient opens `/patient/advanced-booking`.
- System validates case eligibility (age/gender rules).
- Hospital is selected from approved hospitals with advanced-booking access enabled.
- Doctor is auto-allocated from matching specialization.
- Separate room is assigned by case:
  - Pregnancy: `Maternity Priority Room`
  - Baby: `Pediatric Priority Room`
  - Elder: `Senior Care Priority Room`
- Booking is stored with status `allocated` and role-scoped visibility.

### Visibility Rules

- Doctor page `/doctor/advanced-bookings` shows only bookings where `doctorId` equals logged-in doctor.
- HM page `/hm/management/advanced-bookings` shows only current-hospital records with allocated doctor.
- No payment changes are required for advanced booking flow.

## Review System (Visited Patients)

- Patients can submit reviews only for visited/completed appointments.
- Review form captures both:
	- `doctorRating` (patient to doctor)
	- `hospitalRating` (patient to visited hospital)
- Combined `rating` is stored as average for analytics compatibility.
- HM Feedback page now reads live, hospital-scoped review data.

## 30-Day History + Role Audits

- Key actions are written to activity history and filtered by role scope:
	- Booking/payment success
	- Bill payment updates
	- Review submission
	- Advanced booking create/status updates
	- Admin hospital access/status changes
- History is auto-pruned to last 30 days.
- HM Audit page shows role-related logs only (hospital relation + actor relation), with export and clear-visible options.

## Admin Hospital Access Controls

Admin page `/admin/hospitals` now supports live access control updates per hospital:

- Activate/Suspend hospital
- Enable/Disable advanced booking
- Enable/Disable doctor portal
- Enable/Disable HM portal

These values are stored on each hospital under `accessConfig`.

## Terms & Conditions (Advanced Booking)

Patient must accept terms before confirming advanced booking:

- Eligibility verification (age/gender) may be requested by hospital.
- False or misleading emergency details may lead to booking restriction.
- Hospital can reschedule based on specialist availability.
- Priority channel is strictly for defined advanced cases.

## Data Sources

The app works in hybrid mode:

1. Backend API (primary, JWT/Firebase token protected)
2. Firebase Firestore (fallback persistence)
3. localStorage (last fallback for demo/offline continuity)

Collections/storage used by modules:

- `appointments`
- `advancedBookings`
- `bills`
- `reviews`
- `hospitals`
- `doctors`
- `queues`
- `tokens`

## Authentication

- HM/Doctor login attempts Firebase Auth sign-in first.
- Frontend sends Firebase ID token to backend `/auth/firebase-login`.
- Backend issues app JWT for API authorization.
- Backend auth guard accepts app JWT and Firebase bearer tokens.

## Environment Variables

Frontend (Vercel or local `.env`):

```bash
VITE_API_URL=https://your-railway-backend-url
```

Backend (Railway):

```bash
JWT_SECRET=your_strong_secret
# Firebase service account credentials as Railway secret variables
```

## Deployment (Vercel + Railway)

- Frontend (Vercel): set `VITE_API_URL` to your Railway backend URL.
- Backend (Railway): configure `JWT_SECRET` and Firebase service account credentials.
- Keep Firebase project on Spark/free tier unless scale demands upgrade.

## Notes

- Revenue pages read paid bill entries dynamically.
- Reviews are available for visited/completed appointments.
- For production, prefer removing hardcoded demo credentials and tightening CORS to deployed domains.
