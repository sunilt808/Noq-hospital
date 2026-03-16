// src/services/queueService.js - Queue management with SQLite backend

import api from './api.js';

/* ─────────────────────────────────
   QUEUE SERVICE (Backend API)
──────────────────────────────── */

export const queueService = {
  // Fetch all queues from API
  fetchAll: async () => {
    try {
      const data = await api.get('/queues');
      if (data?.success) {
        return data?.data?.queues || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch queues:', error);
      return [];
    }
  },

  // Fetch single queue
  fetchById: async (queueId) => {
    try {
      const data = await api.get(`/queues/${queueId}`);
      if (data?.success) return data?.data || null;
      return null;
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      return null;
    }
  },

  // Create a queue
  create: async (payload) => {
    try {
      const data = await api.post('/queues/create', payload);
      if (data?.success) return data.data;
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
  },

  // Call next patient in queue
  callNext: async (queueId) => {
    try {
      const data = await api.post(`/queues/${queueId}/next`, {});
      if (data?.success) return data.data;
      throw new Error(data?.message || 'Failed to call next patient');
    } catch (error) {
      console.error('Failed to call next patient:', error);
      throw error;
    }
  },

  // Delete queue
  delete: async (queueId) => {
    try {
      await api.delete(`/queues/${queueId}`);
    } catch (error) {
      console.error('Failed to delete queue:', error);
      throw error;
    }
  },
};

/* ─────────────────────────────────
   TOKEN SERVICE (Backend API)
──────────────────────────────── */

export const tokenService = {
  // Get all tokens for a queue
  fetchByQueue: async (queueId) => {
    try {
      const data = await api.get(`/tokens/${queueId}`);
      if (data?.success) {
        const tokens = data?.data?.tokens || [];
        // Sync to Firebase
        for (const token of tokens) {
          await firebaseDbService.upsert('tokens', token.id, token);
        }
        return tokens;
      }
    } catch (error) {
      console.warn('API fetch failed, using Firebase:', error);
    }

    // Firebase fallback
    const firebaseTokens = await getTokensFromFirebase();
    return firebaseTokens.filter((t) => String(t.queueId) === String(queueId));
  },

  // Create a new token
  create: async (payload) => {
    try {
      const data = await api.post('/tokens/create', payload);
      if (data?.success) {
        // Sync to Firebase
        const token = data.data;
        await firebaseDbService.upsert('tokens', token.id, token);
        return token;
      }
    } catch (error) {
      console.warn('API create failed, using Firebase:', error);
    }

    // Firebase fallback
    const allTokens = await getTokensFromFirebase();
    const queueTokens = allTokens.filter(
      (t) => String(t.queueId) === String(payload.queueId)
    );
    const tokenNumber = queueTokens.length + 1;
    const tokenCode = `T-${String(tokenNumber).padStart(3, '0')}`;

    const newToken = {
      id: `TOK-${Date.now()}`,
      tokenNumber,
      tokenCode,
      ...payload,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    };
    await firebaseDbService.upsert('tokens', newToken.id, newToken);
    return newToken;
  },

  // Doctor calls a token
  call: async (tokenId) => {
    try {
      const data = await api.post(`/tokens/${tokenId}/call`, {});
      if (data?.success) {
        // Sync to Firebase
        const token = data.data;
        await firebaseDbService.upsert('tokens', token.id, token);
        return token;
      }
    } catch (error) {
      console.warn('API call failed, using Firebase:', error);
    }

    // Firebase fallback
    const updatedToken = {
      status: 'calling',
      calledAt: new Date().toISOString(),
    };
    await firebaseDbService.upsert('tokens', tokenId, updatedToken);
    return await firebaseDbService.getDocument('tokens', tokenId);
  },

  // Complete consultation
  complete: async (tokenId) => {
    try {
      const data = await api.post(`/tokens/${tokenId}/complete`, {});
      if (data?.success) {
        // Sync to Firebase
        const token = data.data;
        await firebaseDbService.upsert('tokens', token.id, token);
        return token;
      }
    } catch (error) {
      console.warn('API complete failed, using Firebase:', error);
    }

    // Firebase fallback
    const updatedToken = {
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    await firebaseDbService.upsert('tokens', tokenId, updatedToken);
    return await firebaseDbService.getDocument('tokens', tokenId);
  },

  // Cancel token
  cancel: async (tokenId) => {
    try {
      const data = await api.post(`/tokens/${tokenId}/cancel`, {});
      if (data?.success) {
        // Sync to Firebase
        const token = data.data;
        await firebaseDbService.upsert('tokens', token.id, token);
        return token;
      }
    } catch (error) {
      console.warn('API cancel failed, using Firebase:', error);
    }

    // Firebase fallback
    const updatedToken = {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
    };
    await firebaseDbService.upsert('tokens', tokenId, updatedToken);
    return await firebaseDbService.getDocument('tokens', tokenId);
  },
};

export default { queueService, tokenService };
