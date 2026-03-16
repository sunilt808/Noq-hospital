import firebaseDbService from './firebaseDbService.js';

const memoryStore = new Map();

const COLLECTION_BY_KEY = {
  users: 'users',
  hospitals: 'hospitals',
  hmUsers: 'users',
  doctors: 'users',
  doctorUsers: 'users',
  patients: 'users',
  queues: 'queues',
  tokens: 'tokens',
  appointments: 'appointments',
  reviews: 'reviews',
  bills: 'bills',
  prescriptions: 'prescriptions',
  medicalRecords: 'medical_records',
  rooms: 'rooms',
  departments: 'departments',
  advancedBookings: 'advanced_bookings',
  notifications: 'notifications',
  activityHistory: 'audit_logs',
  paymentMethods: 'payment_methods',
  doctorPresence: 'doctor_presence',
};

const SESSION_ONLY_KEYS = new Set([
  'authToken',
  'currentUser',
  'doctorToken',
  'doctorLoginTime',
  'adminToken',
  'adminEmail',
  'adminLoginTime',
  'adminDarkMode',
  'hmDarkMode',
  'adminSettings',
  'adminSecurity',
  'adminProfile',
]);

const filterHydratedList = (key, list) => {
  if (!Array.isArray(list)) return [];

  if (key === 'doctors' || key === 'doctorUsers') {
    return list.filter((item) => String(item?.role || '').toLowerCase() === 'doctor');
  }

  if (key === 'patients') {
    return list.filter((item) => String(item?.role || '').toLowerCase() === 'patient');
  }

  if (key === 'hmUsers') {
    return list.filter((item) => String(item?.role || '').toLowerCase() === 'hm');
  }

  return list;
};

const toJsonArray = (value) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const toJsonObject = (value) => {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const setMemory = (key, value) => {
  memoryStore.set(String(key), String(value));
};

const getMemory = (key) => {
  if (!memoryStore.has(String(key))) return null;
  return memoryStore.get(String(key));
};

const removeMemory = (key) => {
  memoryStore.delete(String(key));
};

const sessionClear = () => {
  for (const key of [...memoryStore.keys()]) {
    if (SESSION_ONLY_KEYS.has(key)) {
      memoryStore.delete(key);
    }
  }
};

const hydrateMappedKeys = async () => {
  const entries = Object.entries(COLLECTION_BY_KEY);
  await Promise.all(
    entries.map(async ([key, collection]) => {
      try {
        const list = await firebaseDbService.getCollection(collection);
        setMemory(key, JSON.stringify(filterHydratedList(key, list)));
      } catch {
        setMemory(key, '[]');
      }
    })
  );
};

const syncMappedKey = async (key, rawValue) => {
  const collection = COLLECTION_BY_KEY[key];
  if (!collection) return;

  const arr = toJsonArray(rawValue);
  if (arr) {
    await firebaseDbService.bulkUpsert(collection, arr);
    return;
  }

  const obj = toJsonObject(rawValue);
  if (obj) {
    const id = obj.id || obj.HID || obj.DID || obj.uid || `DOC-${Date.now()}`;
    await firebaseDbService.upsert(collection, id, obj);
  }
};

const patchStoragePrototype = () => {
  const proto = Object.getPrototypeOf(window.localStorage);
  if (!proto || proto.__firebaseShimPatched) return;

  Object.defineProperty(proto, 'getItem', {
    value(key) {
      return getMemory(key);
    },
    configurable: true,
  });

  Object.defineProperty(proto, 'setItem', {
    value(key, value) {
      const k = String(key);
      const v = String(value);
      setMemory(k, v);

      if (!SESSION_ONLY_KEYS.has(k) && COLLECTION_BY_KEY[k]) {
        Promise.resolve(syncMappedKey(k, v)).catch(() => {});
      }
    },
    configurable: true,
  });

  Object.defineProperty(proto, 'removeItem', {
    value(key) {
      removeMemory(key);
    },
    configurable: true,
  });

  Object.defineProperty(proto, 'clear', {
    value() {
      sessionClear();
    },
    configurable: true,
  });

  Object.defineProperty(proto, 'key', {
    value(index) {
      const keys = [...memoryStore.keys()];
      return keys[index] || null;
    },
    configurable: true,
  });

  Object.defineProperty(proto, 'length', {
    get() {
      return memoryStore.size;
    },
    configurable: true,
  });

  Object.defineProperty(proto, '__firebaseShimPatched', {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });
};

export const initializeFirebaseStorageShim = async () => {
  // Step 1: Snapshot existing browser localStorage into memoryStore BEFORE patching
  // (avoids wiping data that was already in the browser; Firebase hydration will overwrite with authoritative data)
  try {
    const len = window.localStorage.length;
    for (let i = 0; i < len; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const val = window.localStorage.getItem(key);
        if (val !== null) setMemory(key, val);
      }
    }
  } catch {
    // browser may block in some environments
  }

  // Step 2: Patch prototype so all future calls go through in-memory store
  patchStoragePrototype();

  // Step 3: Hydrate from Firebase — authoritative source overwrites browser snapshot
  await hydrateMappedKeys();
};

export default initializeFirebaseStorageShim;
