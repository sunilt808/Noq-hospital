import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { ensureFirebaseAuthSession, firebaseDb } from "../../firebase.js";
import api from "./api.js";

const toId = (value) => String(value ?? "").trim();

const fetchHospitalsFromApi = async () => {
  try {
    const res = await api.get("/hospitals/available");
    const hospitals = Array.isArray(res?.data?.hospitals) 
      ? res.data.hospitals 
      : res?.hospitals 
      ? res.hospitals 
      : Array.isArray(res) 
      ? res 
      : [];
    return hospitals;
  } catch (error) {
    console.warn('Hospital API fetch failed:', error?.message || error);
    return [];
  }
};

const fetchDoctorsFromApi = async () => {
  try {
    const res = await api.get("/users/doctors-directory");
    const doctors = Array.isArray(res?.data?.data?.doctors) 
      ? res.data.data.doctors 
      : Array.isArray(res?.data?.doctors)
      ? res.data.doctors 
      : Array.isArray(res) 
      ? res 
      : [];
    return doctors;
  } catch (error) {
    console.warn('Doctor API fetch failed:', error?.message || error);
    return [];
  }
};

const fetchDiseasesFromApi = async (hospitalId, departmentId) => {
  try {
    let url = "/diseases";
    const params = [];
    if (hospitalId) params.push(`hospital_id=${encodeURIComponent(hospitalId)}`);
    if (departmentId) params.push(`department_id=${encodeURIComponent(departmentId)}`);
    if (params.length > 0) url += "?" + params.join("&");
    
    const res = await api.get(url);
    const diseases = Array.isArray(res?.data?.diseases) 
      ? res.data.diseases 
      : Array.isArray(res?.data?.data?.diseases)
      ? res.data.data.diseases 
      : Array.isArray(res) 
      ? res 
      : [];
    return diseases;
  } catch (error) {
    console.warn('Diseases API fetch failed:', error?.message || error);
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

      // Prefer Firestore result; for doctors allow users-role fallback from Firestore data.
      if (name === "doctors") {
        return data.filter(
          (u) => String(u.role || "").toLowerCase() === "doctor"
        );
      }

      if (name === "hospitals") {
        return data;
      }

      if (name === "departments") {
        return data;
      }

      if (name === "diseases") {
        return data;
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
          const res = await api.get("/departments");
          return Array.isArray(res?.data?.departments)
            ? res.data.departments
            : [];
        } catch (apiError) {
          console.warn("Departments API fallback failed:", apiError?.message || apiError);
          return [];
        }
      }

      // 🔹 Diseases fallback - ALWAYS try API  
      if (name === "diseases") {
        try {
          return await fetchDiseasesFromApi();
        } catch (apiError) {
          console.warn("Diseases API fallback failed:", apiError?.message || apiError);
          return [];
        }
      }

      // 🔹 Hospitals fallback (on any Firestore error)
      if (name === "hospitals") {
        try {
          return await fetchHospitalsFromApi();
        } catch (apiError) {
          console.warn("Hospitals API fallback failed:", apiError?.message || apiError);
          return [];
        }
      }

      // 🔹 Doctors fallback - ALWAYS try API for doctors (Firestore may be restricted or empty)
      if (name === "doctors" || name === "doctorUsers") {
        try {
          return await fetchDoctorsFromApi();
        } catch (apiError) {
          console.warn("Doctors API fallback also failed:", apiError?.message || apiError);
          return [];
        }
      }

      // 🔹 Appointments fallback - ALWAYS use API for appointments
      // (Firestore security rules restrict reading appointments, use backend instead)
      if (name === "appointments") {
        try {
          const res = await api.get("/appointments/my");
          if (Array.isArray(res?.data?.appointments)) return res.data.appointments;
          if (Array.isArray(res?.data?.data?.appointments)) return res.data.data.appointments;
        } catch (apiError) {
          console.warn("Appointments API failed:", apiError?.message || apiError);
          return [];
        }
      }

      // 🔹 Tokens fallback - ALWAYS use API for tokens
      if (name === "tokens") {
        try {
          const res = await api.get("/tokens/my");
          if (Array.isArray(res?.data?.tokens)) return res.data.tokens;
          if (Array.isArray(res?.data?.data?.tokens)) return res.data.data.tokens;
        } catch (apiError) {
          console.warn("Tokens API failed:", apiError?.message || apiError);
          return [];
        }
      }

      // 🔹 Patients fallback
      if (name === "patients" && permissionDenied) {
        try {
          const res = await api.get("/users/me");
          if (res?.data?.user) {
            return [res.data.user];
          }
        } catch (apiError) {
          // Silent fail - /users/me may not exist yet, rely on Firebase or other fallbacks
        }
      }

      // 🔹 Prescriptions fallback - Use API for prescriptions
      if (name === "prescriptions") {
        try {
          const res = await api.get("/prescriptions/my");
          if (Array.isArray(res?.data?.prescriptions)) return res.data.prescriptions;
          if (Array.isArray(res?.data?.data?.prescriptions)) return res.data.data.prescriptions;
        } catch (apiError) {
          console.warn("Prescriptions API failed:", apiError?.message || apiError);
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