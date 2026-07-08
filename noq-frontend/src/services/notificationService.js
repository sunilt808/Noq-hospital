import api from './api';
import { emitStorageSyncEvent, subscribeRealtimeEvent } from './realtimeService';

const CHANNEL = 'notifications';

const emitNotificationUpdate = (reason) => emitStorageSyncEvent(CHANNEL, { reason });

export const notificationService = {
  // Sync fallback for backwards compatibility where components expect an array immediately
  getAll: () => {
    return [];
  },

  // The components call this inside a useEffect. Let's make it fetch from backend.
  getForUser: async (user) => {
    try {
      const res = await api.get('/notifications');
      if (res && res.data) {
        return res.data.notifications || [];
      }
      return [];
    } catch (err) {
      console.error('Error fetching notifications:', err);
      return [];
    }
  },

  publish: async (notification) => {
    try {
      const res = await api.post('/notifications/internal', notification);
      emitNotificationUpdate('publish');
      return res.data;
    } catch (err) {
      console.error('Error publishing notification:', err);
      return null;
    }
  },

  markRead: async (notificationId, user) => {
    try {
      await api.put(`/notifications/${notificationId}`);
      emitNotificationUpdate('markRead');
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  },

  markAllReadForUser: async (user) => {
    try {
      await api.put('/notifications/read-all/mark');
      emitNotificationUpdate('markAllRead');
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  },

  deleteForUser: async (notificationId, user) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      emitNotificationUpdate('deleteForUser');
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  },

  clearForUser: async (user) => {
    try {
      await api.delete('/notifications');
      emitNotificationUpdate('clearForUser');
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  },

  subscribe: (callback) => subscribeRealtimeEvent(CHANNEL, callback),
};

// Theme management
export const themeService = {
  getCurrentTheme: () => {
    try {
      return localStorage.getItem('app_theme') || 'light';
    } catch {
      return 'light';
    }
  },

  setTheme: (theme) => {
    try {
      localStorage.setItem('app_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.body.style.backgroundColor = '#0f172a';
        document.body.style.color = '#f1f5f9';
      } else {
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#1e293b';
      }
      return true;
    } catch {
      return false;
    }
  },

  toggleTheme: () => {
    const current = themeService.getCurrentTheme();
    const next = current === 'light' ? 'dark' : 'light';
    themeService.setTheme(next);
    return next;
  },

  applyTheme: () => {
    const theme = themeService.getCurrentTheme();
    themeService.setTheme(theme);
  }
};

export default notificationService;
