/**
 * useFirebaseData.js - Custom Hook
 * Provides Firebase-backed data loading for any component
 * Eliminates need for localStorage reads throughout the codebase
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/FirebaseAuthContext';
import firebaseDbService from '../services/firebaseDbService.js';

const EMPTY_DATA = {
  users: [],
  hospitals: [],
  doctors: [],
  patients: [],
  queues: [],
  appointments: [],
  departments: [],
  rooms: [],
  prescriptions: [],
  medicalRecords: [],
  reviews: [],
  diseases: [],
  advancedBookings: [],
  audit_logs: [],
};

const ROLE_COLLECTIONS = {
  admin: ['users', 'hospitals', 'doctors', 'patients', 'queues', 'appointments', 'departments', 'rooms', 'prescriptions', 'medicalRecords', 'reviews', 'diseases', 'advancedBookings', 'audit_logs'],
  hm: ['hospitals', 'doctors', 'patients', 'queues', 'appointments', 'departments', 'rooms', 'prescriptions', 'reviews', 'diseases', 'advancedBookings'],
  doctor: ['hospitals', 'doctors', 'queues', 'appointments', 'departments', 'rooms', 'prescriptions', 'diseases'],
  patient: ['hospitals', 'doctors', 'appointments', 'departments', 'prescriptions', 'reviews', 'diseases'],
  default: ['hospitals', 'departments', 'diseases'],
};

const getCollectionsForRole = (role) => {
  const key = String(role || '').toLowerCase();
  return ROLE_COLLECTIONS[key] || ROLE_COLLECTIONS.default;
};

const isEmptyData = (value) =>
  Object.values(value || {}).every((collection) => Array.isArray(collection) && collection.length === 0);

const filterUsersByRole = (users = [], role) =>
  (Array.isArray(users) ? users : []).filter(
    (item) => String(item?.role || '').toLowerCase() === String(role || '').toLowerCase()
  );

const useFirebaseData = () => {
  const { currentUser, token, isAuthenticated } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastLoadedKeyRef = useRef('');

  // Load all Firebase collections on mount
  useEffect(() => {
    const authKey = `${String(currentUser?.id || '')}:${String(token || '')}`;

    if (!isAuthenticated || !currentUser || !token) {
      lastLoadedKeyRef.current = '';
      setData((prev) => (isEmptyData(prev) ? prev : EMPTY_DATA));
      setError(null);
      return;
    }

    let cancelled = false;

    const loadAllData = async () => {
      try {
        lastLoadedKeyRef.current = authKey;
        setLoading(true);
        setError(null);

        const targetCollections = getCollectionsForRole(currentUser?.role);
        const results = await Promise.allSettled(
          targetCollections.map((name) => firebaseDbService.getCollection(name))
        );

        if (cancelled) {
          return;
        }

        const nextData = { ...EMPTY_DATA };
        const failedCollections = [];

        results.forEach((result, idx) => {
          const collectionName = targetCollections[idx];
          if (result.status === 'fulfilled') {
            nextData[collectionName] = Array.isArray(result.value) ? result.value : [];
          } else {
            failedCollections.push(collectionName);
          }
        });

        setData(nextData);
        if (failedCollections.length > 0) {
          setError(`Failed to load: ${failedCollections.join(', ')}`);
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        lastLoadedKeyRef.current = '';
        setError(err?.message || 'Failed to load data');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAllData();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, currentUser?.id, token]);

  /**
   * Filter helper methods
   */
  const filterByCurrentUser = (collection, idField = 'id') => {
    return (collection || []).filter(
      (item) => String(item[idField]) === String(currentUser?.id)
    );
  };

  const filterByHospital = (collection, hospitalIdField = 'hospitalId') => {
    const hid = currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID;
    return (collection || []).filter(
      (item) => String(item[hospitalIdField]) === String(hid)
    );
  };

  const filterByRole = (collection, role) => {
    return (collection || []).filter(
      (item) => String(item.role || '').toLowerCase() === String(role).toLowerCase()
    );
  };

  return {
    // Raw data
    users: data.users || [],
    hospitals: data.hospitals || [],
    doctors: (data.doctors && data.doctors.length > 0) ? data.doctors : filterUsersByRole(data.users, 'doctor'),
    patients: (data.patients && data.patients.length > 0) ? data.patients : filterUsersByRole(data.users, 'patient'),
    queues: data.queues || [],
    appointments: data.appointments || [],
    departments: data.departments || [],
    rooms: data.rooms || [],
    prescriptions: data.prescriptions || [],
    medicalRecords: data.medicalRecords || [],
    reviews: data.reviews || [],
    diseases: data.diseases || [],
    advancedBookings: data.advancedBookings || [],
    audit_logs: data.audit_logs || [],

    // Metadata
    loading,
    error,
    isAuthenticated,
    currentUser,
    token,

    // Filter helpers
    filterByCurrentUser,
    filterByHospital,
    filterByRole,

    // Convenience getters
    currentUserData: () => filterByCurrentUser(data.users)[0] || currentUser,
    currentHospitalData: () => {
      const hid = currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID;
      return (data.hospitals || []).find((h) => String(h.id || h.HID) === String(hid));
    },
    usersByRole: (role) => filterByRole(data.users, role),
    hospitalDoctors: () => {
      const doctors = (data.doctors && data.doctors.length > 0) ? data.doctors : filterByRole(data.users, 'doctor');
      return filterByHospital(doctors);
    },
    hospitalPatients: () => {
      const patients = (data.patients && data.patients.length > 0) ? data.patients : filterByRole(data.users, 'patient');
      return filterByHospital(patients);
    },
    userAppointments: () => filterByCurrentUser(data.appointments, 'patientId'),
    userPersonalQueues: () => filterByCurrentUser(data.queues, 'doctorId'),
  };
};

export default useFirebaseData;
