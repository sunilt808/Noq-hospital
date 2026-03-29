// src/context/AuthContext.jsx (FINAL FIXED)

import React, { createContext, useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

export const AuthContext = createContext();

const STORAGE_KEYS = {
  USER: 'app_current_user',
  TOKEN: 'app_auth_token',
};

const normalizeUser = (user = {}) => ({
  ...user,
  hospitalId: user.hospital_id || user.hospitalId || '',
  hospital_id: user.hospital_id || user.hospitalId || '',
});

// ✅ FIXED PARSER (expects backend "data")
const parseAuthResponseData = (data = {}) => ({
  token: data?.token || null,
  user: data,
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // INIT
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

      if (storedUser && storedToken) {
        setCurrentUser(normalizeUser(JSON.parse(storedUser)));
        setToken(storedToken);
        api.setAuthToken(storedToken);
        console.log('✓ Auth restored from localStorage');
      }
    } catch (err) {
      console.error('Auth init error:', err);
      localStorage.clear();
    } finally {
      setLoading(false);
    }
  }, []);

  // LOGIN
  const login = useCallback(async (email, password, role = 'patient') => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/login', {
        email,
        password,
        role,
      });

      // ✅ FIX: use response.data
      const { user, token } = parseAuthResponseData(response.data);

      if (!token) throw new Error('No token received');

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      api.setAuthToken(token);

      setCurrentUser(normalizeUser(user));
      setToken(token);

      return { success: true, token };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // SIGNUP
  const signup = useCallback(async (email, password, fullName, phone = '', role = 'patient') => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/signup', {
        email,
        password,
        full_name: fullName,
        phone,
        role,
      });

      // ✅ FIX: use response.data
      const { user, token } = parseAuthResponseData(response.data);

      if (!token) throw new Error('No token received');

      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);

      api.setAuthToken(token);

      setCurrentUser(normalizeUser(user));
      setToken(token);

      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // LOGOUT
  const logout = useCallback(() => {
    localStorage.clear();
    setCurrentUser(null);
    setToken(null);
    api.setAuthToken(null);
  }, []);

  const updateUser = useCallback((data) => {
    const updated = normalizeUser({ ...currentUser, ...data });
    setCurrentUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
  }, [currentUser]);

  const isAuthenticated = !!token;

  const hasRole = useCallback(
    (role) => {
      if (!currentUser) return false;
      return Array.isArray(role)
        ? role.includes(currentUser.role)
        : currentUser.role === role;
    },
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        loading,
        error,
        isAuthenticated,
        hasRole,
        login,
        signup,
        logout,
        updateUser,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};