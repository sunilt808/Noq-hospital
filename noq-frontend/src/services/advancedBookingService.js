import api from './api.js';
import firebaseDbService from './firebaseDbService.js';

const COLLECTION_NAME = 'advancedBookings';

const normalizeBooking = (item = {}) => ({
  id: item.id,
  caseType: item.caseType || item.case_type,
  caseLabel: item.caseLabel || item.case_label,
  patientId: String(item.patientId || item.patient_id || ''),
  patientName: item.patientName || item.patient_name,
  patientAge: item.patientAge ?? item.patient_age ?? 0,
  patientGender: item.patientGender || item.patient_gender || '',
  hospitalId: String(item.hospitalId || item.hospital_id || ''),
  hospitalName: item.hospitalName || item.hospital_name || '',
  doctorId: String(item.doctorId || item.doctor_id || ''),
  doctorName: item.doctorName || item.doctor_name || '',
  doctorSpecialization: item.doctorSpecialization || item.doctor_specialization || '',
  room: item.room,
  roomId: String(item.roomId || item.room_id || ''),
  roomType: item.roomType || item.room_type || '',
  reason: item.reason || '',
  appointmentDate: item.appointmentDate || item.appointment_date,
  priority: item.priority || 'high',
  status: item.status || 'allocated',
  allocationMethod: item.allocationMethod || item.allocation_method || '',
  source: item.source || 'advanced-booking',
  allocatedAt: item.allocatedAt || item.allocated_at,
  createdAt: item.createdAt || item.created_at,
  updatedAt: item.updatedAt || item.updated_at,
});

const toApiPayload = (item = {}) => ({
  case_type: item.caseType,
  case_label: item.caseLabel,
  patient_id: String(item.patientId || ''),
  patient_name: item.patientName,
  patient_age: Number(item.patientAge || 0),
  patient_gender: item.patientGender || '',
  hospital_id: String(item.hospitalId || ''),
  hospital_name: item.hospitalName || '',
  doctor_id: String(item.doctorId || ''),
  doctor_name: item.doctorName || '',
  doctor_specialization: item.doctorSpecialization || '',
  room: item.room,
  room_id: String(item.roomId || ''),
  room_type: item.roomType || '',
  reason: item.reason || '',
  appointment_date: item.appointmentDate,
  priority: item.priority || 'high',
  status: item.status || 'allocated',
  allocation_method: item.allocationMethod || '',
  source: item.source || 'advanced-booking',
  allocated_at: item.allocatedAt || new Date().toISOString(),
});

export const advancedBookingService = {
  // Create booking in Firebase (primary source of truth)
  create: async (booking) => {
    const normalized = normalizeBooking(booking);

    try {
      const res = await api.post('/advanced-bookings/create', toApiPayload(normalized));
      if (res?.success) {
        const created = normalizeBooking(res.data);
        await firebaseDbService.upsert(COLLECTION_NAME, created.id, created);
        return created;
      }
    } catch (error) {
      console.warn('API create failed, using Firebase directly:', error);
    }

    // Firebase fallback
    const localItem = {
      ...normalized,
      id: normalized.id || `AB-${Date.now()}`,
      createdAt: normalized.createdAt || new Date().toISOString(),
      updatedAt: normalized.updatedAt || new Date().toISOString(),
    };

    await firebaseDbService.upsert(COLLECTION_NAME, localItem.id, localItem);
    return localItem;
  },

  // Get user's bookings from Firebase
  getMine: async (fallbackFilter = () => true) => {
    try {
      const res = await api.get('/advanced-bookings/mine');
      if (res?.success) {
        const list = (res?.data?.bookings || []).map(normalizeBooking);
        // Sync to Firebase
        for (const item of list) {
          await firebaseDbService.upsert(COLLECTION_NAME, item.id, item);
        }
        return list;
      }
    } catch (error) {
      console.warn('API fetch failed, using Firebase:', error);
    }

    // Firebase fallback
    try {
      const all = await firebaseDbService.getCollection(COLLECTION_NAME);
      return (all || []).filter(fallbackFilter).map(normalizeBooking);
    } catch (error) {
      console.error('Failed to get bookings from Firebase:', error);
      return [];
    }
  },

  // Update booking status in Firebase
  updateStatus: async (bookingId, status) => {
    try {
      const res = await api.patch(`/advanced-bookings/${bookingId}/status`, { status });
      if (res?.success) {
        const updated = normalizeBooking(res.data);
        await firebaseDbService.upsert(COLLECTION_NAME, bookingId, updated);
        return updated;
      }
    } catch (error) {
      console.warn('API update failed, using Firebase:', error);
    }

    // Firebase fallback
    const updated = {
      status,
      updatedAt: new Date().toISOString(),
    };
    await firebaseDbService.upsert(COLLECTION_NAME, bookingId, updated);
    return await firebaseDbService.getDocument(COLLECTION_NAME, bookingId);
  },
};

export default advancedBookingService;
