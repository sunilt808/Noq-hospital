import api from './api';

const doctorService = {
  // Get current doctor profile - /users/me returns flat object directly
  getCurrentDoctor: async () => {
    const response = await api.get('/users/me');
    return response || null;
  },

  // Get doctor by ID - /users/{id} returns flat object directly
  getDoctorById: async (doctorId) => {
    const response = await api.get(`/users/${doctorId}`);
    return response || null;
  },

  // Get all doctors in hospital - /users returns {success, data: {users: [...]}}
  getDoctors: async (hospitalId = null) => {
    const params = new URLSearchParams();
    if (hospitalId) params.append('hospital_id', hospitalId);
    params.append('role', 'doctor');
    const response = await api.get(`/users?${params.toString()}`);
    return response?.data?.users || [];
  },

  // Get doctor appointments - /appointments/ returns array directly
  getDoctorAppointments: async (doctorUserId = null, filters = {}) => {
    const params = new URLSearchParams();
    if (doctorUserId) params.append('doctor_user_id', doctorUserId);
    if (filters.date) params.append('date', filters.date);
    if (filters.status) params.append('status', filters.status);
    const response = await api.get(`/appointments/?${params.toString()}`);
    return Array.isArray(response) ? response : (response?.data || []);
  },

  // Get doctor patients - /users returns {success, data: {users: [...]}}
  getDoctorPatients: async (hospitalId = null) => {
    const params = new URLSearchParams();
    if (hospitalId) params.append('hospital_id', hospitalId);
    params.append('role', 'patient');
    const response = await api.get(`/users?${params.toString()}`);
    return response?.data?.users || [];
  },

  // Get doctor prescriptions
  getDoctorPrescriptions: async () => {
    const response = await api.get('/prescriptions/doctor/my');
    return response?.data?.prescriptions || response?.prescriptions || [];
  },

  // Get doctor queue
  getDoctorQueue: async (queueId) => {
    const response = await api.get(`/queues/${queueId}`);
    return response?.data || null;
  },

  // Get doctor queues
  getDoctorQueues: async (hospitalId = null) => {
    const params = new URLSearchParams();
    if (hospitalId) params.append('hospital_id', hospitalId);
    const response = await api.get(`/queues?${params.toString()}`);
    return response?.data?.queues || response?.queues || [];
  },

  // Update appointment status - PATCH /appointments/{id} returns flat appointment object
  updateAppointmentStatus: async (appointmentId, newStatus) => {
    const response = await api.patch(`/appointments/${appointmentId}`, {
      status: newStatus
    });
    return response || null;
  },

  // Create prescription
  createPrescription: async (prescriptionData) => {
    const response = await api.post('/prescriptions', prescriptionData);
    return response?.data || null;
  },

  // Get revenue data
  getRevenueData: async (hospitalId = null) => {
    const params = new URLSearchParams();
    if (hospitalId) params.append('hospital_id', hospitalId);
    const response = await api.get(`/revenue/dashboard?${params.toString()}`);
    return response?.data || {
      totalRevenue: 0,
      billsCount: 0,
      avgBill: 0
    };
  },

  // Get revenue by doctor - returns {success, data: {doctors: [...], count}}
  getDoctorRevenue: async (hospitalId = null) => {
    const params = new URLSearchParams();
    if (hospitalId) params.append('hospital_id', hospitalId);
    const response = await api.get(`/revenue/by-doctor?${params.toString()}`);
    return response?.data?.doctors || [];
  },

  // Get prescriptions created by current doctor - returns {success, data: {prescriptions: [...]}}
  getDoctorPrescriptions: async () => {
    const response = await api.get('/prescriptions/doctor/my');
    return response?.data?.prescriptions || [];
  }
};

export default doctorService;
