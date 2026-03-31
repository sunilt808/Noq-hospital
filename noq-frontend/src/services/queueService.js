// src/services/queueService.js - Queue management for MongoDB Backend
import api from './api.js';

export const queueService = {
  // Fetch all queues from API
  fetchAll: async (hospitalId = null) => {
    try {
      const url = hospitalId ? `/queues?hospital_id=${hospitalId}` : '/queues';
      const data = await api.get(url);
      return data?.success ? (data?.data?.queues || []) : [];
    } catch (error) {
      console.error('Failed to fetch queues:', error);
      return [];
    }
  },

  // Fetch single queue
  fetchById: async (queueId) => {
    try {
      const data = await api.get(`/queues/${queueId}`);
      return data?.success ? (data?.data?.queue || data?.data || null) : null;
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      return null;
    }
  },

  // Create a queue
  create: async (payload) => {
    try {
      const data = await api.post('/queues/create', payload);
      if (data?.success) return data.data?.queue || data.data;
      throw new Error(data?.message || 'Failed to create queue');
    } catch (error) {
      console.error('Failed to create queue:', error);
      throw error;
    }
  },

  // Update queue
  update: async (queueId, payload) => {
    try {
      const data = await api.put(`/queues/${queueId}`, payload);
      if (data?.success) return data.data;
      throw new Error(data?.message || 'Failed to update queue');
    } catch (error) {
      console.error('Failed to update queue:', error);
      throw error;
    }
  }
};

export const tokenService = {
  // Get all tokens for a queue
  fetchByQueue: async (queueId) => {
    try {
      const data = await api.get(`/tokens/${queueId}`);
      if (data?.success) {
        return data?.data?.tokens || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch tokens:', error);
      return [];
    }
  },

  // Create a new token
  create: async (payload) => {
    try {
      // Ensure we're using snake_case for the API
      const apiPayload = {
        queue_id: payload.queue_id || payload.queueId,
        patient_id: payload.patient_id || payload.patientId,
        patient_name: payload.patient_name || payload.patientName || 'Patient',
        patient_email: payload.patient_email || payload.patientEmail || '',
        patient_phone: payload.patient_phone || payload.patientPhone || '',
        hospital_id: payload.hospital_id || payload.hospitalId,
        department_id: payload.department_id || payload.departmentId || '',
        appointment_type: payload.appointment_type || payload.appointmentType || 'regular',
        priority: payload.priority || 'normal',
        notes: payload.notes || ''
      };

      const data = await api.post('/tokens/create', apiPayload);
      if (data?.success) return data.data;
      throw new Error(data?.message || 'Failed to create token');
    } catch (error) {
      console.error('Failed to create token:', error);
      throw error;
    }
  },

  // Doctor calls a token
  call: async (tokenId) => {
    try {
      const data = await api.post(`/tokens/${tokenId}/call`, {});
      return data?.success ? data.data : null;
    } catch (error) {
      console.error('Failed to call token:', error);
      throw error;
    }
  },

  // Complete consultation
  complete: async (tokenId) => {
    try {
      const data = await api.post(`/tokens/${tokenId}/complete`, {});
      return data?.success ? data.data : null;
    } catch (error) {
      console.error('Failed to complete consultation:', error);
      throw error;
    }
  }
};

export default { queueService, tokenService };
