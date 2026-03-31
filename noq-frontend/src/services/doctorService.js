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

  // Get doctor appointments - /appointments/my returns {appointments:[...]} for the authenticated user
  getDoctorAppointments: async (doctorUserId = null, filters = {}) => {
    const response = await api.get('/appointments/my');
    const appts = response?.appointments || (Array.isArray(response) ? response : []);
    // Apply optional filters
    return appts.filter(a => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.date && (a.appointment_date || '').split('T')[0] !== filters.date) return false;
      return true;
    });
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

  // Update appointment status - backend only has PUT /appointments/{id}
  updateAppointmentStatus: async (appointmentId, newStatus) => {
    const response = await api.put(`/appointments/${appointmentId}`, {
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
  }
};

export default doctorService;
