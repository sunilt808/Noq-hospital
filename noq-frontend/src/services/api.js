// src/services/api.js - Improved API client with error handling and retry logic

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000';

const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

/**
 * Create abort controller with timeout
 */
const createAbortController = (timeout = REQUEST_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  return { controller, timeoutId };
};

/**
 * Handle response with improved error handling
 */
const handleResponse = async (res) => {
  try {
    const json = await res.json().catch(() => ({}));
    
    // Check HTTP status
    if (!res.ok) {
      const message =
        json?.error ||
        json?.detail ||
        json?.message ||
        `HTTP ${res.status}`;
      
      const error = new Error(message);
      error.status = res.status;
      error.response = json;
      throw error;
    }
    
    return json;
  } catch (err) {
    console.error('Response handling error:', err);
    throw err;
  }
};

/**
 * Retry logic for failed requests
 */
const executeWithRetry = async (
  fetchFn,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
) => {
  try {
    return await fetchFn();
  } catch (err) {
    // Don't retry on client errors (4xx)
    if (err.status && err.status >= 400 && err.status < 500) {
      throw err;
    }
    
    // Retry on server errors (5xx) or network errors
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return executeWithRetry(fetchFn, retries - 1, delay * 1.5);
    }
    
    throw err;
  }
};

/**
 * Generic fetch wrapper with error handling
 */
const fetchWithErrorHandling = async (url, options) => {
  const { controller, timeoutId } = createAbortController();
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return await handleResponse(response);
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    throw err;
  }
};

const api = {
  /**
   * GET request with auth token from Firebase session
   */
  get: async (path) => {
    const url = `${BASE_URL}${path}`;
    return executeWithRetry(async () =>
      fetchWithErrorHandling(url, { headers: defaultHeaders() })
    );
  },

  /**
   * POST request with auth token from Firebase session
   */
  post: async (path, body) => {
    const url = `${BASE_URL}${path}`;
    return executeWithRetry(async () =>
      fetchWithErrorHandling(url, {
        method: 'POST',
        headers: defaultHeaders(),
        body: JSON.stringify(body),
      })
    );
  },

  /**
   * POST with FormData (for file uploads) - uses Firebase auth token with retry
   */
  postForm: async (path, formData) => {
    const token = getAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const url = `${BASE_URL}${path}`;
    
    return executeWithRetry(async () =>
      fetchWithErrorHandling(url, {
        method: 'POST',
        headers,
        body: formData,
      })
    );
  },

  /**
   * PUT request with auth token from Firebase session
   */
  put: async (path, body) => {
    const url = `${BASE_URL}${path}`;
    return executeWithRetry(async () =>
      fetchWithErrorHandling(url, {
        method: 'PUT',
        headers: defaultHeaders(),
        body: JSON.stringify(body),
      })
    );
  },

  /**
   * PATCH request with auth token from Firebase session
   */
  patch: async (path, body) => {
    const url = `${BASE_URL}${path}`;
    return executeWithRetry(async () =>
      fetchWithErrorHandling(url, {
        method: 'PATCH',
        headers: defaultHeaders(),
        body: JSON.stringify(body),
      })
    );
  },

  /**
   * DELETE request with auth token from Firebase session
   */
  delete: async (path) => {
    const url = `${BASE_URL}${path}`;
    return executeWithRetry(async () =>
      fetchWithErrorHandling(url, {
        method: 'DELETE',
        headers: defaultHeaders(),
      })
    );
  },

  /**
   * Health check - verify API and database connectivity
   */
  healthCheck: async () => {
    try {
      const response = await fetch(`${BASE_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      return {
        ok: response.ok,
        data,
      };
    } catch (err) {
      return {
        ok: false,
        data: { error: err.message },
      };
    }
  },
};

export default api;
