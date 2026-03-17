import api from './api';

const patientService = {
  // Get current patient profile - /users/me returns flat object directly
  getMyProfile: async () => {
    const response = await api.get('/users/me');
    return response || null;
  },

  // Get my appointments - /appointments returns direct array
  getMyAppointments: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status_filter', filters.status);
    if (filters.date) params.append('date', filters.date);
    const url = params.toString() ? `/appointments/?${params.toString()}` : '/appointments/';
    const response = await api.get(url);
    return Array.isArray(response) ? response : [];
  },

  // Get appointment by ID
  getAppointmentById: async (appointmentId) => {
    const response = await api.get(`/appointments/${appointmentId}`);
    return response || null;
  },

  // Create new appointment
  createAppointment: async (appointmentData) => {
    const response = await api.post('/appointments/', appointmentData);
    return response || null;
  },

  // Update appointment - PATCH returns flat appointment object
  updateAppointment: async (appointmentId, updateData) => {
    const response = await api.patch(`/appointments/${appointmentId}`, updateData);
    return response || null;
  },

  // Cancel appointment (set status to cancelled)
  cancelAppointment: async (appointmentId) => {
    return patientService.updateAppointment(appointmentId, { status: 'cancelled' });
  },

  // Get my prescriptions - returns {success, data: {prescriptions: [...]}}
  getMyPrescriptions: async () => {
    const response = await api.get('/prescriptions/my');
    return response?.data?.prescriptions || [];
  },

  // Get prescribed medicines/details for a prescription
  getPrescriptionDetails: async (prescriptionId) => {
    const response = await api.get(`/prescriptions/${prescriptionId}`);
    return response || null;
  },

  // Get all doctors - returns {success, data: {users: [...]}}
  getAllDoctors: async (hospitalId = null, departmentId = null) => {
    const params = new URLSearchParams();
    params.append('role', 'doctor');
    if (hospitalId) params.append('hospital_id', hospitalId);
    if (departmentId) params.append('department_id', departmentId);
    const response = await api.get(`/users?${params.toString()}`);
    return response?.data?.users || [];
  },

  // Get doctor by ID - returns flat object
  getDoctorById: async (doctorId) => {
    const response = await api.get(`/users/${doctorId}`);
    return response || null;
  },

  // Get all hospitals
  getHospitals: async () => {
    const response = await api.get('/hospitals/available');
    return response?.value || response || [];
  },

  // Get hospital by ID
  getHospitalById: async (hospitalId) => {
    const response = await api.get(`/hospitals/${hospitalId}`);
    return response || null;
  },

  // Get available departments
  getDepartments: async (hospitalId = null) => {
    const params = hospitalId ? `?hospital_id=${hospitalId}` : '';
    const response = await api.get(`/departments/${params}`);
    return response?.data?.departments || response || [];
  },

  // Get available time slots for a doctor
  getAvailableSlots: async (doctorId, date) => {
    const response = await api.get(`/doctors/${doctorId}/slots?date=${date}`);
    return response?.data?.slots || response || [];
  },

  // Create review - posts review of doctor/hospital
  createReview: async (reviewData) => {
    const response = await api.post('/reviews', reviewData);
    return response || null;
  },

  // Get reviews for doctor or hospital
  getReviews: async (targetId, targetType = 'doctor') => {
    const response = await api.get(`/reviews?${targetType}_id=${targetId}`);
    return response?.data?.reviews || response || [];
  },

  // Get my medical records
  getMyMedicalRecords: async () => {
    const response = await api.get('/medical-records/');
    return Array.isArray(response) ? response : response?.data || [];
  },

  // Upload medical record
  uploadMedicalRecord: async (file, recordType = 'document') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', recordType);
    const response = await api.post('/medical-records/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response || null;
  },

  // Get billing history
  getBillingHistory: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    const response = await api.get(`/bills/?${params.toString()}`);
    return response?.data?.bills || response || [];
  },

  // Get bill details
  getBillDetails: async (billId) => {
    const response = await api.get(`/bills/${billId}`);
    return response || null;
  },

  // Download bill/invoice
  downloadBill: async (billId) => {
    const response = await api.get(`/bills/${billId}/download`, {
      responseType: 'blob'
    });
    return response;
  },

  // Get notifications
  getNotifications: async (limit = 20) => {
    const response = await api.get(`/notifications?limit=${limit}`);
    return response?.data?.notifications || response || [];
  },

  // Mark notification as read
  markNotificationRead: async (notificationId) => {
    const response = await api.patch(`/notifications/${notificationId}`, { read: true });
    return response || null;
  },

  // Update my profile
  updateProfile: async (profileData) => {
    const response = await api.patch('/users/me', profileData);
    return response || null;
  }
};

export default patientService;
