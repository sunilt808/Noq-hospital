# Firebase-Only Migration Guide

## What's Been Done ✓

### Foundation Complete (No localStorage):
1. **FirebaseAuthService** - stores auth in sessionStorage + Firestore
2. **FirebaseAuthContext** - React context with `useAuth()` hook
3. **useFirebaseData** - hook providing all Firebase collections
4. **Updated Core Services**: api.js, App.jsx, main.jsx
5. **Updated Layouts**: AdminLayout.jsx, HmLayout.jsx
6. **Build**: PASSING ✓ (132 modules, 8.38s)

---

## How to Migrate Remaining Pages

### Pattern 1: Replace `localStorage` reads with hooks

**OLD:**
```jsx
const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
const hospital = JSON.parse(localStorage.getItem('hospitals') || '[]')[0];
```

**NEW:**
```jsx
import { useAuth } from '../context/FirebaseAuthContext';
import useFirebaseData from '../hooks/useFirebaseData';

const { currentUser } = useAuth();
const { doctors, hospitals } = useFirebaseData();
```

### Pattern 2: Replace `useState` + `useEffect` data loading

**OLD:**
```jsx
const [doctors, setDoctors] = useState([]);

useEffect(() => {
  const docs = JSON.parse(localStorage.getItem('doctors') || '[]');
  setDoctors(docs);
}, []);
```

**NEW:**
```jsx
const { doctors, loading } = useFirebaseData();
// No setState needed - hook provides fresh data
```

### Pattern 3: Replace `localStorage.setItem` with Firebase

**OLD:**
```jsx
const handleSaveDoctor = () => {
  const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
  const updated = [...doctors, newDoctor];
  localStorage.setItem('doctors', JSON.stringify(updated));
};
```

**NEW:**
```jsx
import firebaseDbService from '../services/firebaseDbService';

const handleSaveDoctor = async () => {
  await firebaseDbService.upsert('users', newDoctor.id, newDoctor);
  // Data auto-updates in useFirebaseData hook
};
```

### Pattern 4: Replace `localStorage.removeItem`

**OLD:**
```jsx
const handleLogout = () => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('authToken');
  navigate('/login');
};
```

**NEW:**
```jsx
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  navigate('/login', { replace: true });
};
```

### Pattern 5: Replace dark mode localStorage

**OLD:**
```jsx
const [darkMode, setDarkMode] = useState(() => {
  const saved = localStorage.getItem('adminDarkMode');
  return saved ? JSON.parse(saved) : false;
});

useEffect(() => {
  localStorage.setItem('adminDarkMode', JSON.stringify(darkMode));
}, [darkMode]);
```

**NEW (Use sessionStorage instead):**
```jsx
const [darkMode, setDarkMode] = useState(() => {
  try {
    const saved = sessionStorage.getItem('adminDarkMode');
    return saved ? JSON.parse(saved) : false;
  } catch {
    return false;
  }
});

useEffect(() => {
  sessionStorage.setItem('adminDarkMode', JSON.stringify(darkMode));
}, [darkMode]);
```

---

## Files to Update by Role

### Admin Pages (8 files):
```
src/pages/admin/
├── AdminLogin.jsx          [Update with useAuth pattern]
├── Dashboard.jsx           [Replace localStorage with useFirebaseData]
├── HMApprovals.jsx         [Use Firebase data + filtering]
├── Hospitals.jsx           [Use Firebase collections]
├── Notifications.jsx       [Use Firebase notifications]
├── Profile.jsx             [Use useAuth for current user]
├── Revenue.jsx             [Use useFirebaseData for bills]
├── Reviews.jsx             [Use Firebase reviews]
└── Settings.jsx            [Store in sessionStorage/Firebase]
```

### HM Pages (12 files):
```
src/pages/hm/management/
├── Management.jsx          [✓ DONE - Firebase-backed] 
├── Doctors.jsx             [Partial - convert fully to Firebase]
├── Rooms.jsx               [Convert to Firebase]
├── Departments.jsx         [Convert to Firebase]
├── Diseases.jsx            [✓ Partial done]
├── AdvancedBookings.jsx    [Convert to Firebase]
├── DoctorCredentials.jsx   [Convert to Firebase]
├── Audit.jsx               [Use audit_logs collection]
├── Feedback.jsx            [Use reviews collection]
├── Revenue.jsx             [Use bills collection]
├── Notifications.jsx       [Use Firebase notifications]
└── HM/* (doctor profiles)  [Convert to Firebase]
```

### Doctor Pages (7 files):
```
src/pages/doctor/
├── Dashboard.jsx           [Replace localStorage]
├── DoctorQueue.jsx         [Replace localStorage]
├── DoctorAppointments.jsx  [Replace localStorage]
├── DoctorPrescriptions.jsx [Replace localStorage]
├── DoctorPatients.jsx      [Replace localStorage]
├── DoctorProfile.jsx       [Use useAuth + Firebase]
└── DoctorAdvancedBookings.jsx [Replace localStorage]
```

### Patient Pages (11 files):
```
src/pages/patient/
├── Dashboard.jsx           [Replace localStorage]
├── Profile.jsx             [Replace localStorage]
├── MyAppointments.jsx      [Replace localStorage]
├── BookAppointment.jsx     [Replace localStorage]
├── AdvancedBooking.jsx     [Replace localStorage]
├── Prescriptions.jsx       [Replace localStorage]
├── MedicalRecords.jsx      [Replace localStorage]
├── MedicalRecords/         [All subcomponents]
├── Notifications.jsx       [Replace localStorage]
├── Settings.jsx            [Replace localStorage]
├── Reviews.jsx             [Replace localStorage]
├── Billing.jsx             [Replace localStorage]
└── Prescriptions/          [All subcomponents]
```

---

## Automated Find & Replace Patterns

Use these regex patterns to find all localStorage usages in each file:

1. **Find all localStorage reads:**
   ```regex
   localStorage\.(getItem|getItem|key|length)
   ```
   Replace: Identify collection type, use appropriate hook/service

2. **Find JSON.parse localStorage:**
   ```regex
   JSON\.parse\(localStorage\.getItem\('\w+'\)
   ```
   Replace: Use `useFirebaseData()` hook

3. **Find all localStorage writes:**
   ```regex
   localStorage\.(setItem|removeItem|clear)
   ```
   Replace: Use `firebaseDbService.upsert()` or `logout()`

---

## Priority Migration Order

### TIER 1 (Critical - blocks users):
1. Login pages (any remaining localStorage)
2. Dashboard pages for each role
3. Layout components

### TIER 2 (High - commonly used):
1. Doctor management pages
2. Patient appointment pages
3. Admin approval pages
4. HM management pages

### TIER 3 (Medium - specific features):
1. Profile/settings pages
2. Notification pages
3. Report/analytics pages
4. Audit/history pages

### TIER 4 (Low - nice to have):
1. Help/documentation pages
2. Contact/feedback pages
3. Utility pages

---

## Testing Each Migration

For each page migrated:

1. **Check imports:**
   ```jsx
   import { useAuth } from '../context/FirebaseAuthContext';
   import useFirebaseData from '../hooks/useFirebaseData';
   import firebaseDbService from '../services/firebaseDbService';
   ```

2. **Check hook usage:**
   ```jsx
   const { currentUser, token } = useAuth();
   const { doctors, hospitals, loading, error } = useFirebaseData();
   ```

3. **Check no localStorage:**
   - Search each file for: `localStorage`, `sessionStorage` (except Firebase session)
   - Should find ZERO occurrences (except legacy comments)

4. **Test functionality:**
   - Login to role
   - Load page
   - Create/update/delete data
   - Verify data persists in Firebase
   - Check console for errors

5. **Build test:**
   ```bash
   npm run build
   ```
   Should complete with no critical errors

---

## Command: Quick Migration Template

Copy this for each page:

```jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';  // ADD THIS
import useFirebaseData from '../hooks/useFirebaseData';    // ADD THIS
import firebaseDbService from '../services/firebaseDbService'; // ADD THIS

const PageComponent = () => {
  // REMOVE: const [doctors, setDoctors] = useState([]);
  // REMOVE: const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
  
  // ADD THIS:
  const { currentUser } = useAuth();
  const { doctors, loading, error } = useFirebaseData();

  // REMOVE all useEffect that does: 
  //   setDoctors(JSON.parse(localStorage.getItem(...)))
  
  // For saves, use:
  const handleSave = async (data) => {
    await firebaseDbService.upsert('users', data.id, data);
    // Data auto-refreshes in hook
  };

  // For logout, use:
  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
  };

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {/* Render using currentUser, doctors, etc. */}
    </div>
  );
};

export default PageComponent;
```

---

## Validation Checklist

After migrating a page:

- [ ] No `localStorage.*` calls
- [ ] No `JSON.parse(localStorage` patterns
- [ ] Uses `useAuth()` hook for user data
- [ ] Uses `useFirebaseData()` hook for collections
- [ ] Uses `firebaseDbService.upsert()` for creates
- [ ] Uses `firebaseDbService.remove()` for deletes
- [ ] Dark mode/prefs stored in sessionStorage
- [ ] No localStorage imports
- [ ] Build passes: `npm run build`
- [ ] Page loads without console errors
- [ ] Data persists in Firestore

---

## Final Steps

1. Migrate all remaining pages using patterns above
2. Remove `firebaseStorageShim.js` entirely
3. Remove `sessionStorage` shim initialization from anywhere
4. Final build: `npm run build` 
5. Deploy: Push to production

---

## Command to Validate Current State

```bash
# Check for any remaining localStorage refs in source
grep -r "localStorage\." src/ --include="*.jsx" --include="*.js" | grep -v node_modules | grep -v ".cache"

# Should show ZERO results (or only in migration notes)
```

---

## Support Notes

- Firebase reads: instant from hook
- Firebase writes: use `await firebaseDbService.upsert()`
- Auth state: automatically managed by context
- Session token: auto-refreshed from sessionStorage
- Collections: auto-load in useFirebaseData hook
- Filtering: use hook's filterByHospital, filterByRole helpers

All data flows: Component → Hook → Firestore → Context → All components updated

No localStorage needed anywhere.
