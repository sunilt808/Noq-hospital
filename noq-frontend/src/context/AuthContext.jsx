// src/context/AuthContext.jsx - JWT-based Authentication Context with localStorage

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

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
        const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);

        if (storedUser && storedToken) {
          const user = JSON.parse(storedUser);
          setCurrentUser(normalizeUser(user));
          setToken(storedToken);
          console.log('✓ Auth restored from localStorage');
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setError(err.message);
        // Clear corrupted storage
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (email, password, role = 'patient') => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/auth/login', {
        email,
        password,
        role,
      });

      if (!response.success) {
        throw new Error(response.message || 'Login failed');
      }

      const { user, token: newToken } = response.data;

      // Store in localStorage
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);

      // Update state
      setCurrentUser(normalizeUser(user));
      setToken(newToken);

      console.log('✓ User logged in:', user.email);
      return { success: true, user, token: newToken };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      console.error('Login error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Signup function
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

      if (!response.success) {
        throw new Error(response.message || 'Signup failed');
      }

      const { user, token: newToken } = response.data;

      // Store in localStorage
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_KEYS.TOKEN, newToken);

      // Update state
      setCurrentUser(normalizeUser(user));
      setToken(newToken);

      console.log('✓ User signed up:', user.email);
      return { success: true, user, token: newToken };
    } catch (err) {
      const errorMsg = err.message || 'Signup failed';
      setError(errorMsg);
      console.error('Signup error:', err);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);

      // Clear state
      setCurrentUser(null);
      setToken(null);

      console.log('✓ User logged out');
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Update user function
  const updateUser = useCallback((userData) => {
    try {
      const updated = normalizeUser({ ...currentUser, ...userData });
      setCurrentUser(updated);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
      return { success: true };
    } catch (err) {
      console.error('Update user error:', err);
      return { success: false, error: err.message };
    }
  }, [currentUser]);

  // Check if user is authenticated
  const isAuthenticated = !!currentUser && !!token;

  // Check if user has a specific role
  const hasRole = useCallback((role) => {
    if (!currentUser) return false;
    if (Array.isArray(role)) {
      return role.includes(currentUser.role);
    }
    return currentUser.role === role;
  }, [currentUser]);

  const value = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
  };
