import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api.js';

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

const useApiData = () => {
  const { currentUser, token, isAuthenticated } = useAuth();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastLoadedKeyRef = useRef('');

  const loadAllData = useCallback(async () => {
    if (!isAuthenticated || !currentUser || !token) {
      setData((prev) => (isEmptyData(prev) ? prev : EMPTY_DATA));
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // We will perform API requests matching what useApiData was doing
      // In a real app, this should be split by component, but keeping this interface 
      // minimizes the impact of the migration.
      
      const role = String(currentUser?.role || '').toLowerCase();
      
      // Let's fire the most common endpoints safely
      const fetchSafe = async (fn, fallback = []) => {
        try {
          return await fn();
        } catch (e) {
          return fallback;
        }
      };

      const [
        hospitals,
        usersRes,
        departmentsRes,
        diseasesRes,
        appointmentsRes,
      ] = await Promise.all([
        fetchSafe(async () => {
          const res = await api.get('/hospitals/available');
          return res?.hospitals || res?.data?.hospitals || res || [];
        }),
        fetchSafe(async () => {
          const res = await api.get('/users?limit=1000');
          return res?.users || res?.data?.users || res || [];
        }),
        fetchSafe(async () => {
          const res = await api.get('/departments');
          return res?.departments || res?.data?.departments || res || [];
        }),
        fetchSafe(async () => {
          const res = await api.get('/diseases');
          return res?.diseases || res?.data?.diseases || res || [];
        }),
        fetchSafe(async () => {
          const res = await api.get('/appointments/my');
          return res?.appointments || res?.data?.appointments || res || [];
        }),
      ]);

      setData({
        ...EMPTY_DATA,
        hospitals: Array.isArray(hospitals) ? hospitals : [],
        users: Array.isArray(usersRes) ? usersRes : [],
        departments: Array.isArray(departmentsRes) ? departmentsRes : [],
        diseases: Array.isArray(diseasesRes) ? diseasesRes : [],
        appointments: Array.isArray(appointmentsRes) ? appointmentsRes : [],
        doctors: Array.isArray(usersRes) ? usersRes.filter(u => String(u.role).toLowerCase() === 'doctor') : [],
        patients: Array.isArray(usersRes) ? usersRes.filter(u => String(u.role).toLowerCase() === 'patient') : [],
      });
      
    } catch (err) {
      setError(err?.message || 'Failed to load data from API');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, currentUser, token]);

  useEffect(() => {
    const authKey = `${String(currentUser?.id || '')}:${String(token || '')}`;
    if (authKey !== lastLoadedKeyRef.current) {
        lastLoadedKeyRef.current = authKey;
        loadAllData();
    }
  }, [isAuthenticated, currentUser?.id, token, loadAllData]);

  const isEmptyData = (value) =>
    Object.values(value || {}).every((collection) => Array.isArray(collection) && collection.length === 0);

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
    ...data,
    loading,
    error,
    isAuthenticated,
    currentUser,
    token,
    filterByCurrentUser,
    filterByHospital,
    filterByRole,
    currentUserData: () => filterByCurrentUser(data.users)[0] || currentUser,
    currentHospitalData: () => {
      const hid = currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID;
      return (data.hospitals || []).find((h) => String(h.id || h.HID) === String(hid));
    },
    usersByRole: (role) => filterByRole(data.users, role),
    hospitalDoctors: () => filterByHospital(data.doctors),
    hospitalPatients: () => filterByHospital(data.patients),
    userAppointments: () => filterByCurrentUser(data.appointments, 'patientId'),
    userPersonalQueues: () => filterByCurrentUser(data.queues, 'doctorId'),
  };
};

export default useApiData;
