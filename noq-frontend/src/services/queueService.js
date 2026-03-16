// src/services/queueService.js - Queue management (Firebase-only, NO localStorage)

import api from './api.js';
import firebaseDbService from './firebaseDbService.js';

/* ─────────────────────────────────
   FIREBASE HELPERS (NO localStorage)
──────────────────────────────── */

const getQueuesFromFirebase = async () => {
  try {
    return await firebaseDbService.getCollection('queues');
  } catch (error) {
    console.warn('Failed to fetch queues from Firebase:', error);
    return [];
  }
};

const getTokensFromFirebase = async () => {
  try {
    return await firebaseDbService.getCollection('tokens');
  } catch (error) {
    console.warn('Failed to fetch tokens from Firebase:', error);
    return [];
  }
};

/* ─────────────────────────────────
   QUEUE SERVICE (Firebase-only)
──────────────────────────────── */

export const queueService = {
  // Fetch all queues from Firebase
  fetchAll: async () => {
    try {
      const data = await api.get('/queues');
      if (data?.success) {
        const queues = data?.data?.queues || [];
        // Store to Firebase for offline access
        for (const queue of queues) {
          await firebaseDbService.upsert('queues', queue.id, queue);
        }
        return queues;
      }
    } catch (error) {
      console.warn('API fetch failed, using Firebase:', error);
    }

    return await getQueuesFromFirebase();
  },

  // Fetch single queue
  fetchById: async (queueId) => {
    try {
      const data = await api.get(`/queues/${queueId}`);
      if (data?.success) return data?.data || null;
    } catch (error) {
      console.warn('API fetch failed, using Firebase:', error);
    }

    return await firebaseDbService.getDocument('queues', queueId);
  },

  // Create a queue (Firebase-only)
  create: async (payload) => {
    try {
      const data = await api.post('/queues/create', payload);
      if (data?.success) return data.data;
    } catch (error) {
      console.warn('API create failed, using Firebase:', error);
    }

    const newQueue = {
      id: `Q-${Date.now()}`,
      ...payload,
      status: 'active',
      currentToken: null,
      tokenCounter: 0,
      createdAt: new Date().toISOString(),
    };
    await firebaseDbService.upsert('queues', newQueue.id, newQueue);
    return newQueue;
  },

  // Update queue (Firebase-only)
  update: async (queueId, payload) => {
    try {
      const data = await api.put(`/queues/${queueId}`, payload);
      if (data?.success) return data.data;
    } catch (error) {
      console.warn('API update failed, using Firebase:', error);
    }

    const updatedQueue = {
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    await firebaseDbService.upsert('queues', queueId, updatedQueue);
    return await firebaseDbService.getDocument('queues', queueId);
  },

  // Call next patient in queue
  callNext: async (queueId) => {
    try {
      const data = await api.post(`/queues/${queueId}/next`, {});
      if (data?.success) return data.data;
    } catch (error) {
      console.warn('API callNext failed, using Firebase:', error);
    }

    // Firebase fallback
    const tokens = await getTokensFromFirebase();
    const waiting = tokens.filter(
      (t) => String(t.queueId) === String(queueId) && t.status === 'waiting'
    );
    if (waiting.length === 0) throw new Error('No patients waiting in queue.');
    const next = waiting.sort((a, b) => a.tokenNumber - b.tokenNumber)[0];
    return await tokenService.call(next.id);
  },

  // Delete queue (Firebase-only)
  delete: async (queueId) => {
    try {
      await api.delete(`/queues/${queueId}`);
    } catch (error) {
      console.warn('API delete failed, using Firebase:', error);
    }

    await firebaseDbService.remove('queues', queueId);
  },
};

/* ─────────────────────────────────
   TOKEN SERVICE (Firebase-only)
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
