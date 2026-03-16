import React, { createContext, useCallback, useEffect, useState } from 'react';
import FirebaseAuthService from '../services/FirebaseAuthService.js';

export const AuthContext = createContext();

const normalizeUser = (user = {}) => {
  const hospitalId = user.hospitalId || user.hospital_id || user.HID || '';
  const hospitalName = user.hospitalName || user.hospital_name || '';
  return {
    ...user,
    hospitalId,
    hospital_id: hospitalId,
    HID: hospitalId,
    hospitalName,
    hospital_name: hospitalName,
  };
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth from session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await FirebaseAuthService.getSession();
        if (session?.user && session?.token) {
          // Verify user status is still valid
          const verification = await FirebaseAuthService.verifyUserStatus(session.user.id);
          const canUseSession = verification.valid || verification.reason === 'User not found';
          if (canUseSession) {
            const mergedUser = normalizeUser({
              ...session.user,
              ...(verification.user || {}),
            });
            setCurrentUser(mergedUser);
            setToken(session.token);
          } else {
            // User status is invalid, logout
            await FirebaseAuthService.logout(session.user.id);
            setCurrentUser(null);
            setToken(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (userData, authToken) => {
    try {
      setLoading(true);
      setError(null);

      // Verify user exists and is valid
      const verification = await FirebaseAuthService.verifyUserStatus(userData.id);
      if (!verification.valid && verification.reason !== 'User not found') {
        throw new Error(`Login failed: ${verification.reason}`);
      }

      const mergedUser = normalizeUser({
        ...userData,
        ...(verification.user || {}),
      });

      // Save session to Firestore and sessionStorage
      const result = await FirebaseAuthService.saveSession(mergedUser, authToken);
      
      if (result) {
        setCurrentUser(mergedUser);
        setToken(authToken);
        return true;
      }
      throw new Error('Failed to save session');
    } catch (err) {
      setError(err.message);
      console.error('Login error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      const userId = currentUser?.id;
      
      // Clear from Firestore and sessionStorage
      await FirebaseAuthService.logout(userId);
      
      // Clear state
      setCurrentUser(null);
      setToken(null);
      setError(null);
      
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Logout error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const updateUser = useCallback((userData) => {
    setCurrentUser((prev) => normalizeUser({ ...prev, ...userData }));
  }, []);

  const value = {
    currentUser,
    token,
    loading,
    error,
    login,
    logout,
    updateUser,
    isAuthenticated: Boolean(currentUser && token),
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
