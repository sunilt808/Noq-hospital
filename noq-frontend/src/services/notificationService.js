import { emitStorageSyncEvent, subscribeRealtimeEvent } from './realtimeService';

const STORAGE_KEY = 'notifications';
const CHANNEL = 'notifications';

const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeArray = (key, value) => {
  localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
};

const makeId = () => `N-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

const toTimestamp = (value) => {
  const ts = new Date(value || '').getTime();
  return Number.isFinite(ts) ? ts : 0;
};

const matchTarget = (notification, user) => {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const userId = String(user.id || '');
  const hospitalId = String(user.hospitalId || user.HID || '');

  const target = String(notification.target || 'all').toLowerCase();
  const targetRole = String(notification.targetRole || '').toLowerCase();
  const targetUserId = String(notification.userId || notification.targetUserId || '');
  const targetHospitalId = String(notification.hospitalId || notification.targetHospitalId || '');

  if (targetUserId && targetUserId === userId) return true;
  if (targetHospitalId && hospitalId && targetHospitalId === hospitalId) return true;
  if (targetRole && targetRole === role) return true;
  if (target === 'all') return true;
  if (target === role) return true;
  return false;
};

const withUserState = (notification, user) => {
  const userId = String(user?.id || user?.email || 'guest');
  const readBy = notification.readBy || {};
  const deletedBy = notification.deletedBy || {};
  return {
    ...notification,
    read: Boolean(readBy[userId]),
    deleted: Boolean(deletedBy[userId]),
  };
};

const emitNotificationUpdate = (reason) => emitStorageSyncEvent(CHANNEL, { reason });

export const notificationService = {
  getAll: () =>
    readArray(STORAGE_KEY).sort((a, b) => toTimestamp(b.createdAt || b.date) - toTimestamp(a.createdAt || a.date)),

  getForUser: (user) =>
    notificationService
      .getAll()
      .filter((n) => matchTarget(n, user))
      .map((n) => withUserState(n, user))
      .filter((n) => !n.deleted),

  publish: (notification) => {
    const all = readArray(STORAGE_KEY);
    const created = {
      id: notification.id || makeId(),
      title: notification.title || 'Notification',
      message: notification.message || '',
      type: notification.type || 'system',
      target: notification.target || 'all',
      targetRole: notification.targetRole || '',
      targetUserId: notification.targetUserId || notification.userId || '',
      targetHospitalId: notification.targetHospitalId || notification.hospitalId || '',
      readBy: notification.readBy || {},
      deletedBy: notification.deletedBy || {},
      data: notification.data || {},
      createdAt: notification.createdAt || new Date().toISOString(),
      createdBy: notification.createdBy || 'system',
    };
    writeArray(STORAGE_KEY, [created, ...all]);
    emitNotificationUpdate('publish');
    return created;
  },

  markRead: (notificationId, user) => {
    const userId = String(user?.id || user?.email || 'guest');
    const all = readArray(STORAGE_KEY).map((n) =>
      String(n.id) === String(notificationId)
        ? {
            ...n,
            readBy: { ...(n.readBy || {}), [userId]: true },
          }
        : n
    );
    writeArray(STORAGE_KEY, all);
    emitNotificationUpdate('markRead');
  },

  markAllReadForUser: (user) => {
    const userId = String(user?.id || user?.email || 'guest');
    const all = readArray(STORAGE_KEY).map((n) => ({
      ...n,
      readBy: { ...(n.readBy || {}), [userId]: true },
    }));
    writeArray(STORAGE_KEY, all);
    emitNotificationUpdate('markAllRead');
  },

  deleteForUser: (notificationId, user) => {
    const userId = String(user?.id || user?.email || 'guest');
    const all = readArray(STORAGE_KEY).map((n) =>
      String(n.id) === String(notificationId)
        ? {
            ...n,
            deletedBy: { ...(n.deletedBy || {}), [userId]: true },
          }
        : n
    );
    writeArray(STORAGE_KEY, all);
    emitNotificationUpdate('deleteForUser');
  },

  clearForUser: (user) => {
    const userId = String(user?.id || user?.email || 'guest');
    const all = readArray(STORAGE_KEY).map((n) => ({
      ...n,
      deletedBy: { ...(n.deletedBy || {}), [userId]: true },
    }));
    writeArray(STORAGE_KEY, all);
    emitNotificationUpdate('clearForUser');
  },

  subscribe: (callback) => subscribeRealtimeEvent(CHANNEL, callback),
};

export default notificationService;
