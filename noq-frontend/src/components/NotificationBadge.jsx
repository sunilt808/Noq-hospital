// src/components/NotificationBadge.jsx - Notification bell with unread count

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheckCircle, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { notificationService } from '../services/notificationService';

const NotificationBadge = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getForUser(null);
      setNotifications(data || []);
      const unread = (data || []).filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.warn('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (notifId) => {
    await notificationService.markRead(notifId, null);
    loadNotifications();
  };

  const handleDelete = async (notifId) => {
    await notificationService.deleteForUser(notifId, null);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllReadForUser(null);
    loadNotifications();
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          fontSize: '18px',
          cursor: 'pointer',
          color: '#6b7280',
          padding: '8px 12px',
          transition: 'all 0.2s',
        }}
        title="Notifications"
      >
        <FontAwesomeIcon icon={faBell} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '4px',
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {Math.min(unreadCount, 9)}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '40px',
            right: '-200px',
            background: '#fff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: '320px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: '600', fontSize: '14px' }}>Notifications</div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px 4px'
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id || notif._id}
                  style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid #f3f4f6',
                    background: notif.read ? '#fff' : '#fef3c7',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '8px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: '#1e293b' }}>{notif.title}</div>
                    <div style={{ color: '#64748b', marginTop: '2px', lineHeight: '1.3' }}>{notif.message}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {!notif.read && (
                      <button
                        onClick={() => handleMarkRead(notif.id || notif._id)}
                        title="Mark as read"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#3b82f6',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                      >
                        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '12px' }} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id || notif._id)}
                      title="Delete"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} style={{ fontSize: '12px' }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
