# Firebase Migration Patterns - Complete Reference

All 35+ remaining pages follow the same pattern replacements. Use these find/replace operations to quickly migrate any page.

## Pattern Template (Apply to Every Page)

### Step 1: Update Imports
**Find:**
```javascript
import React, { useState, useEffect } from 'react';
```

**Replace:**
```javascript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import firebaseDbService from '../../services/firebaseDbService';
```

### Step 2: Get User & Data at Component Top
**Find:**
```javascript
const MyComponent = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(...);
```

**Replace:**
```javascript
const MyComponent = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, logout } = useAuth();
  const { 
    patients, doctors, appointments, queues, hospitals, users,
    prescriptions, medicalRecords, reviews, departments, rooms,
    advancedBookings, bills, audit_logs, diseases, loading
  } = useFirebaseData();
  const [data, setData] = useState(...);
```

### Step 3: Replace Data Loading Patterns

#### Pattern 3A: Current User Data
**OLD:**
```javascript
const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
if (!user || user.role !== 'patient') navigate('/login');
```

**NEW:**
```javascript
useEffect(() => {
  if (!authLoading && (!currentUser || currentUser.role !== 'patient')) {
    navigate('/login');
  }
}, [currentUser, authLoading, navigate]);

// Use currentUser everywhere instead of 'user' variable
```

#### Pattern 3B: Filter Collection Data
**OLD:**
```javascript
const allData = JSON.parse(localStorage.getItem('items') || '[]');
const myData = allData.filter(item => item.userId === user.id);
```

**NEW:**
```javascript
// Don't parse localStorage - use the hook data directly
const myData = items.filter(item => item.userId === currentUser.id);
// OR use firebaseDbService for real-time updates
```

#### Pattern 3C: Find Single Record
**OLD:**
```javascript
const doctor = JSON.parse(localStorage.getItem('doctors') || '[]')
  .find(d => d.id === userData.id);
```

**NEW:**
```javascript
const doctor = doctors.find(d => 
  d.id === currentUser.id || d.email === currentUser.email
);
```

### Step 4: Replace Data Mutation Patterns

#### Pattern 4A: Update Record
**OLD:**
```javascript
const handleApprove = (recordId) => {
  const records = JSON.parse(localStorage.getItem('records') || '[]');
  const updated = records.map(r => 
    r.id === recordId ? { ...r, status: 'approved' } : r
  );
  localStorage.setItem('records', JSON.stringify(updated));
  setRecords(updated);  // Manual state update
};
```

**NEW:**
```javascript
const handleApprove = async (recordId) => {
  try {
    const record = records.find(r => r.id === recordId);
    await firebaseDbService.upsert('records', recordId, {
      ...record,
      status: 'approved'
    });
    // useFirebaseData hook auto-refreshes, no manual state update needed
  } catch (error) {
    console.error('Error approving record:', error);
    alert('Failed to approve record');
  }
};
```

#### Pattern 4B: Delete Record
**OLD:**
```javascript
const handleDelete = (recordId) => {
  const records = JSON.parse(localStorage.getItem('records') || '[]');
  const filtered = records.filter(r => r.id !== recordId);
  localStorage.setItem('records', JSON.stringify(filtered));
  setRecords(filtered);
};
```

**NEW:**
```javascript
const handleDelete = async (recordId) => {
  if (!window.confirm('Are you sure?')) return;
  try {
    await firebaseDbService.remove('records', recordId);
    // useFirebaseData hook auto-refreshes
  } catch (error) {
    console.error('Error deleting:', error);
    alert('Failed to delete');
  }
};
```

#### Pattern 4C: Create New Record
**OLD:**
```javascript
const handleCreate = (newData) => {
  const records = JSON.parse(localStorage.getItem('records') || '[]');
  const newRecord = { id: Date.now(), ...newData };
  records.push(newRecord);
  localStorage.setItem('records', JSON.stringify(records));
  setRecords(records);
};
```

**NEW:**
```javascript
const handleCreate = async (newData) => {
  try {
    const id = 'rec_' + Date.now();
    await firebaseDbService.upsert('records', id, {
      id,
      ...newData,
      createdAt: new Date().toISOString()
    });
    // useFirebaseData hook auto-refreshes
  } catch (error) {
    console.error('Error creating:', error);
    alert('Failed to create record');
  }
};
```

### Step 5: Replace Presence/Status Patterns

#### Pattern 5A: Doctor Presence (Queue Status)
**OLD:**
```javascript
const presence = JSON.parse(localStorage.getItem('doctorPresence') || '{}');
presence[String(doctor.id)] = {
  status: isOnBreak ? 'on_break' : 'available',
  doctorId: doctor.id,
  updatedAt: new Date().toISOString()
};
localStorage.setItem('doctorPresence', JSON.stringify(presence));
```

**NEW:**
```javascript
const updateDoctorPresence = async () => {
  try {
    const docId = 'doctor_' + currentUser.id;
    await firebaseDbService.upsert('doctorPresence', docId, {
      doctorId: currentUser.id,
      status: isOnBreak ? 'on_break' : 'available',
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating presence:', error);
  }
};

useEffect(() => {
  updateDoctorPresence();
}, [isOnBreak, currentUser.id]);
```

#### Pattern 5B: Listen to Other Users' Presence
**OLD:**
```javascript
const presence = JSON.parse(localStorage.getItem('doctorPresence') || '{}');
const doctorStatus = presence[doctorId]?.status || 'offline';
```

**NEW:**
```javascript
// doctorPresence data is auto-loaded via useFirebaseData
const doctorStatus = doctorPresence.find(p => p.doctorId === doctorId)?.status || 'offline';
// OR direct find
const doctorStatus = doctorPresence[doctorId]?.status || 'offline';
```

### Step 6: Replace Logout Pattern

**OLD:**
```javascript
const handleLogout = () => {
  localStorage.clear();
  navigate('/login');
};
```

**NEW:**
```javascript
const handleLogout = async () => {
  await logout();  // From useAuth hook
  navigate('/login');
};
```

### Step 7: Remove Storage Event Listeners (No Longer Needed)

**OLD:**
```javascript
useEffect(() => {
  loadData();
  
  window.addEventListener('storage', loadData);  // REMOVE
  window.addEventListener('focus', loadData);    // REMOVE
  
  return () => {
    window.removeEventListener('storage', loadData);  // REMOVE
    window.removeEventListener('focus', loadData);    // REMOVE
  };
}, []);
```

**NEW:**
```javascript
useEffect(() => {
  // Data auto-loads and updates via useFirebaseData
  // No need for manual listeners
}, []);

// If you had auto-refresh logic, remove it - useFirebaseData handles it
```

---

## Real-World Page Migration Examples

### Example 1: Patient Profile Page
```javascript
// OLD CODE
const Profile = () => {
  const [patient, setPatient] = useState(null);
  
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const patientData = patients.find(p => p.email === user.email);
    setPatient(patientData);
  }, []);

  const handleUpdate = (updatedData) => {
    const patients = JSON.parse(localStorage.getItem('patients') || '[]');
    const updated = patients.map(p => 
      p.id === patient.id ? { ...p, ...updatedData } : p
    );
    localStorage.setItem('patients', JSON.stringify(updated));
  };
};

// NEW CODE
const Profile = () => {
  const { currentUser } = useAuth();
  const { patients } = useFirebaseData();
  
  const patient = patients.find(p => p.email === currentUser?.email);

  const handleUpdate = async (updatedData) => {
    try {
      await firebaseDbService.upsert('patients', patient.id, {
        ...patient,
        ...updatedData
      });
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update profile');
    }
  };
};
```

### Example 2: Admin Dashboard
```javascript
// OLD CODE
const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  
  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const hospitals = JSON.parse(localStorage.getItem('hospitals') || '[]');
    const setStats({
      totalUsers: users.length,
      totalHospitals: hospitals.length
    });
  }, []);
};

// NEW CODE
const AdminDashboard = () => {
  const { users, hospitals, appointments } = useFirebaseData();
  
  const stats = {
    totalUsers: users.length,
    totalHospitals: hospitals.length,
    totalAppointments: appointments.length
  };
  // No useEffect needed - data auto-updates
};
```

### Example 3: Doctor Queue with Presence
```javascript
// OLD CODE
const DoctorQueue = () => {
  const [doctor, setDoctor] = useState(null);
  const [queue, setQueue] = useState([]);
  const [isOnBreak, setIsOnBreak] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const doctors = JSON.parse(localStorage.getItem('doctors') || '[]');
    const doctorData = doctors.find(d => d.id === user.id);
    setDoctor(doctorData);
    
    const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    const doctorQueue = allAppointments.filter(a => a.doctorId === user.id && a.status === 'waiting');
    setQueue(doctorQueue);
  }, []);

  useEffect(() => {
    if (!doctor?.id) return;
    const presence = JSON.parse(localStorage.getItem('doctorPresence') || '{}');
    presence[String(doctor.id)] = {
      status: isOnBreak ? 'on_break' : 'available',
      doctorId: doctor.id
    };
    localStorage.setItem('doctorPresence', JSON.stringify(presence));
  }, [doctor, isOnBreak]);

  const handleMarkComplete = (appointmentId) => {
    const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    const updated = allAppointments.map(a => 
      a.id === appointmentId ? { ...a, status: 'completed' } : a
    );
    localStorage.setItem('appointments', JSON.stringify(updated));
    setQueue(updated.filter(a => a.doctorId === doctor.id && a.status === 'waiting'));
  };
};

// NEW CODE
const DoctorQueue = () => {
  const { currentUser, logout } = useAuth();
  const { appointments, doctors } = useFirebaseData();
  const [isOnBreak, setIsOnBreak] = useState(false);

  // Get current doctor's data
  const doctor = doctors.find(d => d.id === currentUser?.id || d.email === currentUser?.email);
  const queue = appointments.filter(a => 
    a.doctorId === doctor?.id && a.status === 'waiting'
  );

  // Update presence when status changes
  useEffect(() => {
    if (!doctor?.id) return;
    
    const updatePresence = async () => {
      try {
        await firebaseDbService.upsert('doctorPresence', 'doc_' + doctor.id, {
          doctorId: doctor.id,
          status: isOnBreak ? 'on_break' : 'available',
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };
    
    updatePresence();
  }, [doctor, isOnBreak]);

  const handleMarkComplete = async (appointmentId) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      await firebaseDbService.upsert('appointments', appointmentId, {
        ...appointment,
        status: 'completed',
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error marking appointment complete:', error);
      alert('Failed to mark appointment as complete');
    }
  };
};
```

---

## Remaining Files to Migrate

### Patient Pages (10 files)
- [ ] MyAppointments.jsx
- [ ] Profile.jsx
- [ ] Prescriptions.jsx
- [ ] MedicalRecords.jsx
- [ ] Notifications.jsx
- [ ] Settings.jsx
- [ ] Reviews.jsx
- [ ] Billing.jsx
- [ ] AdvancedBooking.jsx
- [ ] BookAppointment.jsx

### Doctor Pages (8 files)
- [ ] Dashboard.jsx
- [ ] DoctorAppointments.jsx (partially done)
- [ ] DoctorQueue.jsx
- [ ] DoctorPrescriptions.jsx
- [ ] DoctorPatients.jsx
- [ ] DoctorProfile.jsx
- [ ] DoctorAdvancedBookings.jsx
- [ ] PatientsManagement.jsx

### Admin Pages (9 files)
- [ ] Dashboard.jsx
- [ ] AdminLogin.jsx
- [ ] HMApprovals.jsx
- [ ] Hospitals.jsx
- [ ] Notifications.jsx
- [ ] Profile.jsx
- [ ] Revenue.jsx
- [ ] Reviews.jsx
- [ ] Settings.jsx

### HM Pages (9 files)
- [ ] Signup.jsx
- [ ] Doctors.jsx (and sub-pages)
- [ ] Audit.jsx
- [ ] Departments.jsx
- [ ] Rooms.jsx
- [ ] Diseases.jsx
- [ ] AdvancedBookings.jsx
- [ ] Feedback.jsx
- [ ] Revenue.jsx

---

## Quick Migration Checklist

For each file, follow this checklist:

1. ✓ Add imports: `useAuth`, `useFirebaseData`, `firebaseDbService`
2. ✓ Add hook calls at component top
3. ✓ Replace all `localStorage.getItem('users')` → use `users` from hook
4. ✓ Replace all `localStorage.getItem('currentUser')` → use `currentUser` from hook
5. ✓ Replace all `localStorage.setItem('data', ...)` → use `await firebaseDbService.upsert(...)`
6. ✓ Replace all `localStorage.removeItem(...)` → use `await firebaseDbService.remove(...)`
7. ✓ Remove `JSON.parse()` and `JSON.stringify()` calls
8. ✓ Make CRUD handlers `async`
9. ✓ Remove `window.addEventListener('storage', ...)` listeners
10. ✓ Test build: `npm run build`
11. ✓ Verify no console errors

---

## Troubleshooting

### "X is not defined" Error
**Problem:** Using a variable that was previously read from localStorage
**Solution:** Make sure it's imported from the hook: `const { x } = useFirebaseData()`

### "Cannot read property 'xyz' of undefined"
**Problem:** Data not loaded yet when component renders
**Solution:** Add loading check: `if (loading) return <Spinner />;` or use optional chaining: `user?.property`

### "firebaseDbService.upsert is not a function"
**Problem:** Import error
**Solution:** Ensure: `import firebaseDbService from '../../services/firebaseDbService';` (default export, not named)

### Build still failing after migration
**Solution:** Run `npm run build` to see exact errors, then fix import paths or missing hook calls

---

## Performance Tips

- Use memoization for computed data: `const filtered = useMemo(() => data.filter(...), [data])`
- Avoid re-fetching: all collections auto-load via useFirebaseData (once at app start)
- For large lists, implement pagination or virtualization
- Use selective imports: only destructure collections you need from useFirebaseData

