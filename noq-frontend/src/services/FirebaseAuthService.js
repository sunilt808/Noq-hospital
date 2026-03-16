import firebaseDbService from './firebaseDbService.js';

const compactObject = (value) =>
  Object.entries(value || {}).reduce((acc, [key, fieldValue]) => {
    if (fieldValue !== undefined) {
      acc[key] = fieldValue;
    }
    return acc;
  }, {});

/**
 * Firebase-only Authentication Service
 * Replaces localStorage with Firestore for all auth state
 * No localStorage dependencies
 */

const FirebaseAuthService = {
  /**
   * Store current session in Firestore
   */
  saveSession: async (userData, token) => {
    if (!userData?.id) return null;
    
    try {
      const resolvedHospitalId = userData.hospitalId ?? userData.hospital_id ?? userData.HID ?? null;

      const session = compactObject({
        userId: userData.id,
        email: userData.email,
        role: String(userData.role || '').toLowerCase(),
        status: userData.status || 'active',
        hospitalId: resolvedHospitalId,
        name: userData.name || userData.username,
        phone: userData.phone,
        profileImage: userData.profileImage,
        token,
        loginTime: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      });
      
      // Store in in-memory cache for quick access
      sessionStorage.setItem('_firebase_auth_session', JSON.stringify({
        user: userData,
        token,
        timestamp: Date.now(),
      }));
      
      // Store backup in Firestore sessions collection with user ID as doc ID
      await firebaseDbService.upsert('sessions', userData.id, session);
      
      return { user: userData, token, session };
    } catch (error) {
      console.error('Failed to save session:', error);
      return null;
    }
  },

  /**
   * Get current session from memory or Firestore
   */
  getSession: async () => {
    try {
      // First try sessionStorage (fast)
      const cached = sessionStorage.getItem('_firebase_auth_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.user && parsed.token) {
          return { user: parsed.user, token: parsed.token };
        }
      }
      
      // Then check Firestore for persisted sessions (on page reload)
      // This is optional - for true stateless, just use sessionStorage
      return null;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  },

  /**
   * Get current user from session
   */
  getCurrentUser: async () => {
    const session = await FirebaseAuthService.getSession();
    return session?.user || null;
  },

  /**
   * Get auth token from session
   */
  getToken: async () => {
    const session = await FirebaseAuthService.getSession();
    return session?.token || null;
  },

  /**
   * Verify user status (check if disabled/suspended)
   */
  verifyUserStatus: async (userId) => {
    try {
      const user = await firebaseDbService.getDocument('users', userId);
      if (!user) return { valid: false, reason: 'User not found' };
      
      const status = String(user.status || '').toLowerCase();
      if (status === 'disabled' || status === 'suspended' || status === 'inactive') {
        return { valid: false, reason: `User is ${status}` };
      }
      
      return { valid: true, user };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  },

  /**
   * Logout - clear all session data
   */
  logout: async (userId) => {
    try {
      // Clear sessionStorage
      sessionStorage.removeItem('_firebase_auth_session');
      
      // Optional: Delete session document from Firestore
      if (userId) {
        await firebaseDbService.remove('sessions', userId);
      }
      
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  },

  /**
   * Get all data for a user role (doctors, patients, hospitals, etc.)
   * Used to populate page data without localStorage
   */
  getUserData: async (role, userId) => {
    try {
      const roleLC = String(role || '').toLowerCase();
      
      // Parallel fetch all collections
      const [users, hospitals, doctors, patients, queues, appointments, departments, rooms, bills, prescriptions, reviews] = await Promise.all([
        firebaseDbService.getCollection('users'),
        firebaseDbService.getCollection('hospitals'),
        firebaseDbService.getCollection('doctors'),
        firebaseDbService.getCollection('patients'),
        firebaseDbService.getCollection('queues'),
        firebaseDbService.getCollection('appointments'),
        firebaseDbService.getCollection('departments'),
        firebaseDbService.getCollection('rooms'),
        firebaseDbService.getCollection('bills'),
        firebaseDbService.getCollection('prescriptions'),
        firebaseDbService.getCollection('reviews'),
      ]);

      return {
        users: users || [],
        doctors: doctors || [],
        patients: patients || [],
        hospitals: hospitals || [],
        queues: queues || [],
        appointments: appointments || [],
        departments: departments || [],
        rooms: rooms || [],
        bills: bills || [],
        prescriptions: prescriptions || [],
        reviews: reviews || [],
      };
    } catch (error) {
      console.error('Failed to get user data:', error);
      return {
        users: [], doctors: [], patients: [], hospitals: [], queues: [],
        appointments: [], departments: [], rooms: [], bills: [],
        prescriptions: [], reviews: [],
      };
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    const session = await FirebaseAuthService.getSession();
    return Boolean(session?.user && session?.token);
  },

  /**
   * Check if user has a specific role
   */
  hasRole: async (requiredRole) => {
    const user = await FirebaseAuthService.getCurrentUser();
    if (!user) return false;
    const userRole = String(user.role || '').toLowerCase();
    return userRole === String(requiredRole || '').toLowerCase();
  },
};

export default FirebaseAuthService;
