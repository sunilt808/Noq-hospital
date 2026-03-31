import api from './api.js';

// Define endpoint mappings for collections
const API_ENDPOINTS = {
  hospitals: '/hospitals',
  users: '/users',
  doctors: '/users?role=doctor',
  patients: '/users?role=patient',
  hm: '/users?role=hm',
  departments: '/departments',
  rooms: '/rooms',
  diseases: '/diseases',
  reviews: '/reviews',
  appointments: '/appointments',
  queues: '/queues',
  tokens: '/queues/tokens',
  history: '/history',
  bills: '/bills',
  medicalRecords: '/medical-records',
  doctorPresence: '/users/presence',
  advancedBooking: '/advanced-booking',
  admin_settings: '/settings',
};

/**
 * Maps a collection name to its corresponding API endpoint.
 */
const getEndpoint = (collectionName) => {
  return API_ENDPOINTS[collectionName] || `/${collectionName}`;
};

/**
 * Fetch all documents in a collection.
 */
export const getCollection = async (collectionName) => {
  try {
    const endpoint = getEndpoint(collectionName);
    const result = await api.get(endpoint);
    // Standardize response extraction based on the backend routes
    return result?.data?.[collectionName] || result?.[collectionName] || result || [];
  } catch (error) {
    console.warn(`Failed to GET ${collectionName}:`, error);
    return [];
  }
};

/**
 * Fetch a single document by ID.
 */
export const getDocument = async (collectionName, id) => {
  try {
    const endpoint = getEndpoint(collectionName);
    const result = await api.get(`${endpoint}/${id}`);
    return result?.data || result;
  } catch (error) {
    console.warn(`Failed to GET ${collectionName}/${id}:`, error);
    return null;
  }
};

/**
 * Create or update a document by ID.
 * Falls back to POST if ID is missing or endpoint doesn't support PUT id.
 */
export const upsert = async (collectionName, id, data) => {
  try {
    const endpoint = getEndpoint(collectionName);
    if (id) {
      // Attempt to PUT/PATCH
      const result = await api.put(`${endpoint}/${id}`, data);
      return result?.data || result;
    } else {
      // Attempt to POST new
      const result = await api.post(endpoint, data);
      return result?.data || result;
    }
  } catch (error) {
    console.error(`Failed to UPSERT ${collectionName}/${id}:`, error);
    throw error;
  }
};

/**
 * Delete a document by ID.
 */
export const deleteDocument = async (collectionName, id) => {
  try {
    const endpoint = getEndpoint(collectionName);
    const result = await api.delete(`${endpoint}/${id}`);
    return result?.data || result;
  } catch (error) {
    console.error(`Failed to DELETE ${collectionName}/${id}:`, error);
    throw error;
  }
};

const apiDbService = {
  getCollection,
  getDocument,
  upsert,
  deleteDocument,
};

export default apiDbService;
