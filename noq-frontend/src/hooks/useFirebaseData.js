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
      return;
    }

    // Always load fresh data - don't cache based on auth key
    // Appointments can be created/deleted without auth changing
    let cancelled = false;

    const loadAllData = async () => {
      try {
        lastLoadedKeyRef.current = authKey;
        setLoading(true);
        setError(null);

        const [
          users, hospitals, doctors, patients, queues, appointments,
          departments, rooms, prescriptions, medicalRecords,
          reviews, diseases, advancedBookings, audit_logs
        ] = await Promise.all([
          firebaseDbService.getCollection('users'),
          firebaseDbService.getCollection('hospitals'),
          firebaseDbService.getCollection('doctors'),
          firebaseDbService.getCollection('patients'),
          firebaseDbService.getCollection('queues'),
          firebaseDbService.getCollection('appointments'),
          firebaseDbService.getCollection('departments'),
          firebaseDbService.getCollection('rooms'),
          firebaseDbService.getCollection('prescriptions'),
          firebaseDbService.getCollection('medicalRecords'),
          firebaseDbService.getCollection('reviews'),
          firebaseDbService.getCollection('diseases'),
          firebaseDbService.getCollection('advancedBookings'),
          firebaseDbService.getCollection('audit_logs'),
        ]);

        if (cancelled) {
          return;
        }

        setData({
          users: users || [],
          hospitals: hospitals || [],
          doctors: doctors || [],
          patients: patients || [],
          queues: queues || [],
          appointments: appointments || [],
          departments: departments || [],
          rooms: rooms || [],
          prescriptions: prescriptions || [],
          medicalRecords: medicalRecords || [],
          reviews: reviews || [],
          diseases: diseases || [],
          advancedBookings: advancedBookings || [],
          audit_logs: audit_logs || [],
        });
        console.log('📦 useFirebaseData setData:', { 
          appointmentsCount: (appointments || []).length,
          appointmentsSample: (appointments || []).slice(0, 1)
        });
      } catch (err) {
        if (cancelled) {
          return;
        }

        lastLoadedKeyRef.current = '';
        console.error('Failed to load Firebase data:', err);
        setError(err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadAllData();

    // Also set up periodic refresh every 10 seconds to catch new appointments
    const refreshInterval = setInterval(() => {
      if (!cancelled) {
        console.log('🔄 Auto-refreshing Firebase data...');
        loadAllData();
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
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
    appointments: (() => {
      const appts = data.appointments || [];
      console.log('📤 useFirebaseData return - appointments:', appts.length);
      return appts;
    })(),
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
