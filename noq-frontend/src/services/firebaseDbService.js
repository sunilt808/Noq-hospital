import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { ensureFirebaseAuthSession, firebaseDb } from "../../firebase.js";
import api from "./api.js";

const toId = (value) => String(value ?? "").trim();

const fetchHospitalsFromApi = async () => {
  console.log('🏥 Attempting to fetch hospitals from API...');
  try {
    console.log('🏥 API GET /hospitals/available starting...');
    const res = await api.get("/hospitals/available");
    console.log('🏥 API Response received:', res);
    console.log('🏥 Response type:', typeof res, 'Is array:', Array.isArray(res));
    
    const hospitals = Array.isArray(res?.data?.hospitals) 
      ? res.data.hospitals 
      : res?.hospitals 
      ? res.hospitals 
      : Array.isArray(res) 
      ? res 
      : [];
    
    console.log(`✅ Fetched ${hospitals.length} hospitals from API`, hospitals);
    return hospitals;
  } catch (error) {
    console.error('❌ Hospital API fetch failed:', error);
    console.error('❌ Error details:', error?.message, error?.response?.status, error?.response?.data);
    return [];
  }
};

const fetchDoctorsFromApi = async () => {
  console.log('👨‍⚕️ Attempting to fetch doctors from API...');
  try {
    const res = await api.get("/users/doctors-directory");
    console.log('👨‍⚕️ API Response received:', res);
    
    const doctors = Array.isArray(res?.data?.data?.doctors) 
      ? res.data.data.doctors 
      : Array.isArray(res?.data?.doctors)
      ? res.data.doctors 
      : Array.isArray(res) 
      ? res 
      : [];
    
    console.log(`✅ Fetched ${doctors.length} doctors from API`, doctors);
    return doctors;
  } catch (error) {
    console.error('❌ Doctor API fetch failed:', error);
    console.error('❌ Error details:', error?.message, error?.response?.status);
    return [];
  }
};

const fetchDiseasesFromApi = async (hospitalId, departmentId) => {
  console.log('🦠 Attempting to fetch diseases from API...');
  try {
    let url = "/diseases";
    const params = [];
    if (hospitalId) params.push(`hospital_id=${encodeURIComponent(hospitalId)}`);
    if (departmentId) params.push(`department_id=${encodeURIComponent(departmentId)}`);
    if (params.length > 0) url += "?" + params.join("&");
    
    const res = await api.get(url);
    console.log('🦠 API Response received:', res);
    
    const diseases = Array.isArray(res?.data?.diseases) 
      ? res.data.diseases 
      : Array.isArray(res?.data?.data?.diseases)
      ? res.data.data.diseases 
      : Array.isArray(res) 
      ? res 
      : [];
    
    console.log(`✅ Fetched ${diseases.length} diseases from API`, diseases);
    return diseases;
  } catch (error) {
    console.error('❌ Diseases API fetch failed:', error);
    return [];
  }
};

const isPermissionDeniedError = (error) =>
  error?.code === "permission-denied" ||
  String(error?.message || "").toLowerCase().includes("missing or insufficient permissions");

const sanitizeForFirestore = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, fieldValue]) => {
      const sanitized = sanitizeForFirestore(fieldValue);
      if (sanitized !== undefined) {
        acc[key] = sanitized;
      }
      return acc;
    }, {});
  }

  return value === undefined ? undefined : value;
};

const safe = async (fn, fallback) => {
  try {
    await ensureFirebaseAuthSession();
    return await fn();
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      console.error("Firebase DB operation failed:", error);
    }
    return fallback;
  }
};

const firebaseDbService = {
  getCollection: async (name) => {
    try {
      await ensureFirebaseAuthSession();

      const snapshot = await getDocs(collection(firebaseDb, name));

      const data = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      // 🔹 If someone asks for doctors but doctors are stored inside users
      if (name === "doctors") {
        console.log(`👨‍⚕️ Firestore doctors data returning, trying API for fresh data...`);
        try {
          const apiDoctors = await fetchDoctorsFromApi();
          if (apiDoctors.length > 0) {
            return apiDoctors;
          }
        } catch (apiError) {
          console.warn("Doctors API fetch failed during Firestore success:", apiError);
        }
        // Fallback to Firestore doctors
        return data.filter(
          (u) => String(u.role || "").toLowerCase() === "doctor"
        );
      }

      if (name === "hospitals") {
        console.log(`🏥 Firestore hospitals returned ${data.length} records, fetching from API backup...`);
        try {
          return await fetchHospitalsFromApi();
        } catch (apiError) {
          console.error("Hospitals API fallback failed:", apiError);
        }
      }

      if (name === "departments") {
        console.log(`🏢 Firestore departments returned ${data.length} records, trying API...`);
        try {
          const res = await api.get("/departments");
          const departments = Array.isArray(res?.data?.departments) ? res.data.departments : [];
          if (departments.length > 0) {
            return departments;
          }
        } catch (apiError) {
          console.warn("Departments API failed, using Firestore data");
        }
      }

      if (name === "diseases") {
        console.log(`🦠 Firestore diseases returned ${data.length} records, trying API...`);
        try {
          const diseases = await fetchDiseasesFromApi();
          if (diseases.length > 0) {
            return diseases;
          }
        } catch (apiError) {
          console.warn("Diseases API failed, using Firestore data");
        }
      }

      return data;
    } catch (error) {
      const permissionDenied = isPermissionDeniedError(error);
      const errorMsg = String(error?.message || '');
      
      // Only log as warning if not permission denied (expected behavior in prod/dev with strict rules)
      if (!permissionDenied) {
        console.warn(`Firebase getCollection('${name}') failed:`, errorMsg);
      }

      // 🔹 Users fallback - API not available for most users (permission denied expected)
      if (name === "users") {
        if (permissionDenied) {
          // Silent return empty for restricted users (patient/doctor can't see all users)
          console.debug(`⊘ Users collection restricted for this role, returning empty`);
          return [];
        }
      }

      // 🔹 Departments fallback - ALWAYS try API
      if (name === "departments") {
        try {
          console.log(`🏢 Departments: Firestore failed, trying API...`);
          const res = await api.get("/departments");
          return Array.isArray(res?.data?.departments)
            ? res.data.departments
            : [];
        } catch (apiError) {
          console.error("Departments API fallback failed:", apiError);
          return [];
        }
      }

      // 🔹 Diseases fallback - ALWAYS try API  
      if (name === "diseases") {
        try {
          console.log(`🦠 Diseases: Firestore failed, trying API...`);
          return await fetchDiseasesFromApi();
        } catch (apiError) {
          console.error("Diseases API fallback failed:", apiError);
          return [];
        }
      }

      // 🔹 Hospitals fallback (on any Firestore error)
      if (name === "hospitals") {
        console.log(`🏥 Firestore error for hospitals (${permissionDenied ? 'permission denied' : 'other error'}), trying API...`);
        try {
          return await fetchHospitalsFromApi();
        } catch (apiError) {
          console.error("Hospitals API fallback failed:", apiError);
          return [];
        }
      }

      // 🔹 Doctors fallback - ALWAYS try API for doctors (Firestore may be restricted or empty)
      if (name === "doctors" || name === "doctorUsers") {
        try {
          console.log(`👨‍⚕️ Firestore doctors failed, using API...`);
          return await fetchDoctorsFromApi();
        } catch (apiError) {
          console.error("Doctors API fallback also failed:", apiError);
          return [];
        }
      }

      // 🔹 Appointments fallback - ALWAYS use API for appointments
      // (Firestore security rules restrict reading appointments, use backend instead)
      if (name === "appointments") {
        try {
          console.log(`↙️ Using API for appointments collection (Firestore restricted)`);
          const res = await api.get("/appointments/my");
          if (Array.isArray(res?.data?.appointments)) {
            console.log(`✅ Fetched ${res.data.appointments.length} appointments from API`);
            return res.data.appointments;
          }
          if (Array.isArray(res?.data?.data?.appointments)) {
            console.log(`✅ Fetched ${res.data.data.appointments.length} appointments from API (nested)`);
            return res.data.data.appointments;
          }
        } catch (apiError) {
          console.warn("Appointments API failed:", apiError);
          return [];
        }
      }

      // 🔹 Tokens fallback - ALWAYS use API for tokens
      if (name === "tokens") {
        try {
          console.log(`↙️ Using API for tokens collection`);
          const res = await api.get("/tokens/my");
          if (Array.isArray(res?.data?.tokens)) {
            console.log(`✅ Fetched ${res.data.tokens.length} tokens from API`);
            return res.data.tokens;
          }
          if (Array.isArray(res?.data?.data?.tokens)) {
            console.log(`✅ Fetched ${res.data.data.tokens.length} tokens from API (nested)`);
            return res.data.data.tokens;
          }
        } catch (apiError) {
          console.warn("Tokens API failed:", apiError);
          return [];
        }
      }

      // 🔹 Patients fallback
      if (name === "patients" && permissionDenied) {
        try {
          console.log(`↙️ Falling back to API for patients collection`);
          const res = await api.get("/users/me");
          if (res?.data?.user) {
            console.log(`✅ Fetched patient from API`);
            return [res.data.user];
          }
        } catch (apiError) {
          // Silent fail - /users/me may not exist yet, rely on Firebase or other fallbacks
        }
      }

      // 🔹 Prescriptions fallback - Use API for prescriptions
      if (name === "prescriptions") {
        try {
          console.log(`↙️ Using API for prescriptions collection`);
          const res = await api.get("/prescriptions/my");
          if (Array.isArray(res?.data?.prescriptions)) {
            console.log(`✅ Fetched ${res.data.prescriptions.length} prescriptions from API`);
            return res.data.prescriptions;
          }
          if (Array.isArray(res?.data?.data?.prescriptions)) {
            console.log(`✅ Fetched ${res.data.data.prescriptions.length} prescriptions from API (nested)`);
            return res.data.data.prescriptions;
          }
        } catch (apiError) {
          console.warn("Prescriptions API failed:", apiError);
          return [];
        }
      }

      return [];
    }
  },

  getDocument: async (name, id) => {
    const docId = toId(id);
    if (!docId) return null;

    return safe(async () => {
      const snapshot = await getDoc(doc(firebaseDb, name, docId));

      if (!snapshot.exists()) return null;

      return {
        id: snapshot.id,
        ...snapshot.data(),
      };
    }, null);
  },

  upsert: async (name, id, payload) => {
    const docId = toId(id || payload?.id || Date.now());

    if (!docId) return null;

    return safe(async () => {
      const record = sanitizeForFirestore({
        ...payload,
        id: docId,
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(firebaseDb, name, docId), record, { merge: true });

      return record;
    }, null);
  },

  bulkUpsert: async (name, items = []) => {
    if (!Array.isArray(items) || items.length === 0) return [];

    return safe(async () => {
      await Promise.all(
        items.map((item) => {
          const docId = toId(
            item?.id || item?.HID || item?.DID || Date.now()
          );

          const record = sanitizeForFirestore({
            ...item,
            id: docId,
            updatedAt: new Date().toISOString(),
          });

          return setDoc(doc(firebaseDb, name, docId), record, { merge: true });
        })
      );

      return items;
    }, []);
  },

  remove: async (name, id) => {
    const docId = toId(id);

    if (!docId) return false;

    return safe(async () => {
      await deleteDoc(doc(firebaseDb, name, docId));
      return true;
    }, false);
  },
};

export default firebaseDbService;