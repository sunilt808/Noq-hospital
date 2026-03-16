// src/services/api.js - Firebase-only API client (no localStorage)

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000';

/**
 * Get auth token from Firebase auth session in sessionStorage
 * No localStorage used - pure Firebase session management
 */
const getAuthToken = () => {
  try {
    const session = sessionStorage.getItem('_firebase_auth_session');
    if (session) {
      const { token } = JSON.parse(session);
      return token;
    }
  } catch (err) {
    console.warn('Failed to get auth token from session:', err);
  }
  return null;
};

const defaultHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.detail || json?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return json;
};

const api = {
  /**
   * GET request with auth token from Firebase session
   */
  get: (path) =>
    fetch(`${BASE_URL}${path}`, { headers: defaultHeaders() }).then(handleResponse),

  /**
   * POST request with auth token from Firebase session
   */
  post: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /**
   * POST with FormData (for file uploads) - uses Firebase auth token
   */
  postForm: (path, formData) => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    }).then(handleResponse);
  },

  /**
   * PUT request with auth token from Firebase session
   */
  put: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /**
   * PATCH request with auth token from Firebase session
   */
  patch: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: defaultHeaders(),
      body: JSON.stringify(body),
    }).then(handleResponse),

  /**
   * DELETE request with auth token from Firebase session
   */
  delete: (path) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers: defaultHeaders(),
    }).then(handleResponse),
};

export default api;
