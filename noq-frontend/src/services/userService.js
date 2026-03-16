// src/services/userService.js - User & Hospital management service layer

import api from './api.js';
import notificationService from './notificationService.js';

const normaliseStatus = (s) => (typeof s === 'string' ? s.toLowerCase() : '');

export const userService = {
  /* ── DOCTORS ── */
  getDoctors: async (hospitalId) => {
    const path = hospitalId ? `/users?role=doctor&hospital_id=${hospitalId}` : '/users?role=doctor';
    const data = await api.get(path);
    return data?.success ? (data?.data?.users || []) : [];
  },

  getDoctorById: async (id) => {
    const data = await api.get(`/users/${id}`);
    return data?.success ? data.data : null;
  },

  saveDoctors: async (doctors) => {
    const list = Array.isArray(doctors) ? doctors : [];
    for (const doctor of list) {
      if (!doctor?.id) continue;
      await api.patch(`/users/${doctor.id}`, {
        name: doctor.name,
        phone: doctor.phone,
        specialization: doctor.specialization,
        status: doctor.status,
      });
    }
  },

  /* ── PATIENTS ── */
  getPatients: async () => {
    const data = await api.get('/users?role=patient');
    return data?.success ? (data?.data?.users || []) : [];
  },

  getPatientByEmail: async (email) => {
    const patients = await userService.getPatients();
    return patients.find((p) => p.email?.toLowerCase() === email?.toLowerCase()) || null;
  },

  savePatients: async (patients) => {
    const list = Array.isArray(patients) ? patients : [];
    for (const patient of list) {
      if (!patient?.id) continue;
      await api.patch(`/users/${patient.id}`, {
        name: patient.name,
        phone: patient.phone,
        status: patient.status,
      });
    }
  },

  updatePatient: async (patientId, updates) => {
    const data = await api.patch(`/users/${patientId}`, updates || {});
    return data?.success ? data.data : null;
  },

  /* ── HOSPITALS ── */
  getHospitals: async () => {
    try {
      const data = await api.get('/hospitals');
      return data?.success ? (data?.data?.hospitals || []) : [];
    } catch (err) {
      const message = String(err?.message || '').toLowerCase();
      const shouldFallback =
        message.includes('403') ||
        message.includes('admin access required') ||
        message.includes('503') ||
        message.includes('quota') ||
        message.includes('unavailable');

      if (!shouldFallback) {
        throw err;
      }

      const fallback = await api.get('/hospitals/available');
      return fallback?.success ? (fallback?.data?.hospitals || []) : [];
    }
  },

  getHospitalById: async (hid) => {
    const data = await api.get(`/hospitals/${hid}`);
    return data?.success ? data.data : null;
  },

  saveHospitals: async (hospitals) => {
    const list = Array.isArray(hospitals) ? hospitals : [];
    for (const hospital of list) {
      const hospitalId = hospital?.id || hospital?.HID;
      if (!hospitalId) continue;
      await api.put(`/hospitals/${hospitalId}`, {
        hospital_name: hospital.hospital_name || hospital.hospitalName,
        phone: hospital.phone,
        address: hospital.address,
        emergency_contact: hospital.emergency_contact || hospital.emergencyContact,
      });
    }
  },

  approveHospital: async (hid, approve, message = '') => {
    const data = await api.patch(`/hospitals/${hid}/status`, {
      status: approve ? 'APPROVED' : 'REJECTED',
      message,
    });
    return data?.success ? data.data : null;
  },

  /* ── NOTIFICATIONS ── */
  getNotifications: (userId) => {
    if (!userId) return notificationService.getAll();
    return notificationService.getAll().filter(
      (n) =>
        String(n.targetUserId || n.userId || '') === String(userId) ||
        String(n.target || '').toLowerCase() === 'all'
    );
  },

  addNotification: (notification) => {
    return notificationService.publish(notification);
  },
};

export default userService;
