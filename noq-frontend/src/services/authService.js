import api from './api.js';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'currentUser';

const makeId = (prefix) => `${prefix}${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;

const normalizeUser = (user = {}) => ({
  ...user,
  hospitalId: user.hospitalId || user.hospital_id || user.HID || '',
  hospitalName: user.hospitalName || user.hospital_name || user.name || '',
  specialization: user.specialization || user.doctor_specialization || '',
});

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const saveCurrentUser = (user, token) => {
  localStorage.setItem(USER_KEY, JSON.stringify(normalizeUser(user)));
  if (token) localStorage.setItem(TOKEN_KEY, token);
};

const saveAdminSession = (email) => {
  localStorage.setItem('adminToken', 'authenticated');
  localStorage.setItem('adminEmail', (email || '').trim().toLowerCase());
  localStorage.setItem('adminLoginTime', new Date().toISOString());
};

const loginDoctor = async ({ email, password, hospitalId }) => {
  if (!password) throw new Error('Password is required.');
  if (!hospitalId) throw new Error('Hospital ID is required for doctor login.');

  const res = await api.post('/auth/login', { role: 'doctor', email, password, hospital_id: hospitalId });
  if (res?.success && res?.data?.user) {
    const user = normalizeUser(res.data.user);
    saveCurrentUser(user, res.data.token);
    localStorage.setItem('doctorToken', 'authenticated');
    return { user, token: res.data.token };
  }

  throw new Error('Doctor login failed.');
};

const loginHm = async ({ email, password }) => {
  if (!password) throw new Error('Password is required.');

  const res = await api.post('/auth/login', { role: 'hm', email, password });
  if (res?.success && res?.data?.user) {
    const user = normalizeUser(res.data.user);
    saveCurrentUser(user, res.data.token);
    return { user, token: res.data.token };
  }

  throw new Error('HM login failed.');
};

const loginAdmin = async ({ email, password }) => {
  if (!password) throw new Error('Password is required.');

  const res = await api.post('/auth/login', { role: 'admin', email, password });
  if (res?.success && res?.data?.user) {
    const user = normalizeUser(res.data.user);
    saveCurrentUser(user, res.data.token);
    saveAdminSession(user.email || email);
    return { user, token: res.data.token };
  }

  throw new Error('Invalid admin email or password.');
};

const loginPatient = async ({ email, password }) => {
  if (!email?.trim()) throw new Error('Email is required.');
  if (!password?.trim()) throw new Error('Password is required.');

  const res = await api.post('/auth/login', {
    role: 'patient',
    email,
    password,
  });

  if (res?.success && res?.data) {
    const user = normalizeUser(res.data);
    saveCurrentUser(user, res.data.token);
    return { user, token: res.data.token };
  }

  throw new Error('Patient login failed.');
};

export const authService = {
  login: async ({ role, email, password, otp, hospitalId, _generatedOtp, apiIdToken }) => {
    if (apiIdToken) {
      const res = await api.post('/auth/api-login', {
        id_token: apiIdToken,
        role,
        hospital_id: hospitalId || null,
      });

      if (res?.success && res?.data?.user) {
        const user = normalizeUser(res.data.user);
        saveCurrentUser(user, res.data.token);
        if (role === 'doctor') {
          localStorage.setItem('doctorToken', 'authenticated');
        }
        return { user, token: res.data.token };
      }

      throw new Error('api login failed.');
    }

    switch (role) {
      case 'admin':
        return loginAdmin({ email, password });
      case 'doctor':
        return loginDoctor({ email, password, hospitalId });
      case 'hm':
        return loginHm({ email, password });
      case 'patient':
        return loginPatient({ email, otp, _generatedOtp });
      default:
        throw new Error(`Unsupported login role: ${role}`);
    }
  },

  register: async (payload) => {
    const {
      role,
      fullName,
      dob,
      gender,
      email,
      phone,
      password,
      proofFile,
      hospitalName,
      category,
      address,
    } = payload;

    if (!fullName?.trim()) throw new Error('Name is required.');
    if (role === 'hm' && !dob) throw new Error('DOB is required for Hospital Managers.');
    if (!gender) throw new Error('Gender is required.');
    if (!email?.trim()) throw new Error('Email is required.');
    if (!phone?.trim()) throw new Error('Phone number is required.');
    if (!password?.trim()) throw new Error('Password is required.');

    if (role === 'patient') {
      // Use backend /auth/signup endpoint with email + password
      const response = await api.post('/auth/signup', {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        role: 'patient',
      });

      if (response?.success && response?.data) {
        const user = normalizeUser(response.data);
        saveCurrentUser(user, response.data.token);
        return { user, token: response.data.token };
      }

      throw new Error('Patient signup failed.');
    }

    if (role === 'hm') {
      if (!hospitalName?.trim()) throw new Error('Hospital name is required.');
      if (!category?.trim()) throw new Error('Hospital category is required.');

      try {
        const response = await api.post('/hospitals/register', {
          hospital_name: hospitalName.trim(),
          hm_name: fullName.trim(),
          hm_gender: gender.toLowerCase(),
          hm_dob: dob,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: password.trim(),
          category: category.toLowerCase(),
          address: address?.trim() || '',
        });

        if (response?.success && response?.data?.hospital) {
          const hospital = response.data.hospital;
          const hmUser = {
            id: response.data.hm_user_id || makeId('HM-'),
            role: 'hm',
            name: fullName.trim(),
            dob,
            gender: gender.toLowerCase(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            password: password.trim(),
            hospitalId: hospital.id,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };

          const hospitalLocal = {
            HID: hospital.id,
            hospitalName: hospital.hospital_name,
            category: hospital.category,
            hmName: hospital.hm_name,
            email: hospital.email,
            phone: hospital.phone,
            status: hospital.status,
            address: hospital.address || '',
            createdAt: hospital.created_at || new Date().toISOString(),
          };

          return { user: hmUser, hospital: hospitalLocal };
        }
      } catch (error) {
        throw new Error(error?.message || 'Hospital registration failed. Please try again.');
      }

      throw new Error('Hospital registration failed. Please try again.');
    }

    throw new Error('Unsupported signup role.');
  },

  logout: async () => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminLoginTime');
  },

  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },

  isAuthenticated: () => !!authService.getCurrentUser(),

  getToken: () => localStorage.getItem(TOKEN_KEY),
};

export default authService;
