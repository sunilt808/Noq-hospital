import React, { useState, useEffect } from "react";
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCheckCircle,
  faTrash,
  faCalendarAlt,
  faClock,
  faInbox,
} from "@fortawesome/free-solid-svg-icons";

const Notifications = () => {
  const { currentUser, loading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications from API
  useEffect(() => {
    if (loading || !currentUser) return;

    const loadNotifications = async () => {
      try {
        setIsLoading(true);
        const data = await patientService.getNotifications();
        const normalized = Array.isArray(data) ? data.map((notif) => ({
          id: notif.id,
          type: notif.type || 'general',
          title: notif.title || 'Notification',
          message: notif.message || notif.description || '',
          read: notif.read || false,
          createdAt: notif.created_at || notif.createdAt || new Date().toISOString()
        })) : [];

        setNotifications(normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [loading, currentUser]);

  const markAsRead = async (notificationId) => {
    try {
      await patientService.markNotificationRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}><FontAwesomeIcon icon={faBell} /> Notifications</h2>
      </div>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setFilter('all')} 
          style={{ 
            padding: '8px 16px', 
            background: filter === 'all' ? '#2563eb' : '#e5e7eb', 
            color: filter === 'all' ? 'white' : 'black', 
            border: 'none', 
            borderRadius: '20px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          All
        </button>
        <button 
          onClick={() => setFilter('unread')} 
          style={{ 
            padding: '8px 16px', 
            background: filter === 'unread' ? '#2563eb' : '#e5e7eb', 
            color: filter === 'unread' ? 'white' : 'black', 
            border: 'none', 
            borderRadius: '20px', 
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : filteredNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', color: '#999' }}>
          <FontAwesomeIcon icon={faInbox} style={{ fontSize: '2rem', marginBottom: '10px', display: 'block' }} />
          <p>No notifications</p>
        </div>
      ) : (
        <div>
          {filteredNotifications.map(notification => (
            <div 
              key={notification.id} 
              style={{ 
                padding: '16px', 
                background: notification.read ? '#fafafa' : '#f0f9ff', 
                border: '1px solid #e5e7eb', 
                borderLeft: notification.read ? '4px solid #ccc' : '4px solid #2563eb',
                borderRadius: '8px', 
                marginBottom: '12px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start' 
              }}
            >
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>{notification.title}</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#475569' }}>{notification.message}</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#94a3b8' }}>
                  <FontAwesomeIcon icon={faCalendarAlt} /> {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                {!notification.read && (
                  <button 
                    onClick={() => markAsRead(notification.id)}
                    style={{ 
                      padding: '6px 12px', 
                      background: '#10b981', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} /> Mark Read
                  </button>
                )}
                <button 
                  onClick={() => deleteNotification(notification.id)}
                  style={{ 
                    padding: '6px 12px', 
                    background: '#ef4444', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '4px', 
                    cursor: 'pointer', 
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
