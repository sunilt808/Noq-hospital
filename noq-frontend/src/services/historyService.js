import firebaseDbService from './firebaseDbService.js';

const COLLECTION_NAME = 'activityHistory';
const MAX_DAYS = 30;

const toArray = (value) => (Array.isArray(value) ? value : []);

const isWithinWindow = (timestamp) => {
  const now = Date.now();
  const then = new Date(timestamp || 0).getTime();
  if (!then) return false;
  const diffDays = (now - then) / (1000 * 60 * 60 * 24);
  return diffDays <= MAX_DAYS;
};

export const pruneHistory = async () => {
  try {
    const history = await firebaseDbService.getCollection(COLLECTION_NAME);
    const pruned = toArray(history).filter((item) => isWithinWindow(item.timestamp));
    
    // Remove old entries from Firebase
    const idsToDelete = toArray(history)
      .filter((item) => !isWithinWindow(item.timestamp))
      .map((item) => item.id);
    
    for (const id of idsToDelete) {
      await firebaseDbService.deleteDocument(COLLECTION_NAME, id);
    }
    
    return pruned;
  } catch (error) {
    console.warn('Failed to prune history:', error);
    return [];
  }
};

export const recordHistory = async (entry) => {
  try {
    const now = new Date().toISOString();
    
    const item = {
      id: `HST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: now,
      actorRole: entry?.actorRole || 'system',
      actorId: String(entry?.actorId || ''),
      actorName: entry?.actorName || 'System',
      action: entry?.action || 'updated',
      module: entry?.module || 'general',
      message: entry?.message || '',
      roleScope: entry?.roleScope || 'all',
      hospitalId: entry?.hospitalId ? String(entry.hospitalId) : '',
      doctorId: entry?.doctorId ? String(entry.doctorId) : '',
      patientId: entry?.patientId ? String(entry.patientId) : '',
      appointmentId: entry?.appointmentId ? String(entry.appointmentId) : '',
      meta: entry?.meta || {},
    };

    await firebaseDbService.upsert(COLLECTION_NAME, item.id, item);
    return item;
  } catch (error) {
    console.error('Failed to record history:', error);
    return null;
  }
};

export const getHistory = async () => {
  try {
    return await pruneHistory();
  } catch (error) {
    console.warn('Failed to get history:', error);
    return [];
  }
};

export const clearHistoryByIds = async (ids = []) => {
  try {
    const idSet = new Set((Array.isArray(ids) ? ids : []).map((item) => String(item)));
    if (idSet.size === 0) return await pruneHistory();

    for (const id of Array.from(idSet)) {
      await firebaseDbService.deleteDocument(COLLECTION_NAME, id);
    }
    
    return await pruneHistory();
  } catch (error) {
    console.warn('Failed to clear history:', error);
    return [];
  }
};

export const getRoleScopedHistory = async (currentUser) => {
  try {
    const all = await pruneHistory();

    if (!currentUser) return all;

    const role = String(currentUser.role || '').toLowerCase();
    if (role === 'admin') return all;

    if (role === 'hm') {
      const hospitalId = String(currentUser.hospitalId || currentUser.id || '');
      return all.filter((item) => 
        String(item.hospitalId || '') === hospitalId || 
        String(item.actorId || '') === String(currentUser.id || '')
      );
    }

    if (role === 'doctor') {
      const doctorId = String(currentUser.id || '');
      return all.filter((item) => 
        String(item.doctorId || '') === doctorId || 
        String(item.actorId || '') === doctorId
      );
    }

    if (role === 'patient') {
      const patientId = String(currentUser.id || '');
      return all.filter((item) => 
        String(item.patientId || '') === patientId || 
        String(item.actorId || '') === patientId
      );
    }

    return all.filter((item) => String(item.actorId || '') === String(currentUser.id || ''));
  } catch (error) {
    console.warn('Failed to get role-scoped history:', error);
    return [];
  }
};
