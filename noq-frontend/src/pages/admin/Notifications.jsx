// pages/admin/Notifications.jsx
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import notificationService from '../../services/notificationService.js';
import { useAuth } from '../../context/AuthContext';

const Notifications = () => {
  const { currentUser } = useAuth();
  const user = currentUser || {};
  const [notifications, setNotifications] = useState([]);

  const loadNotifications = async () => {
    const data = await notificationService.getForUser(user);
    setNotifications(data);
  };

  useEffect(() => {
    loadNotifications();
    const unsubscribe = notificationService.subscribe(loadNotifications);
    return () => unsubscribe();
  }, []);

  const markAsRead = async (id) => {
    await notificationService.markRead(id, user);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    await notificationService.markAllReadForUser(user);
    loadNotifications();
  };

  const deleteNotification = async (id) => {
    await notificationService.deleteForUser(id, user);
    loadNotifications();
  };

  const getRelativeTime = (timestamp) => {
    const diffMs = Date.now() - new Date(timestamp || '').getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'hospital': return Icons.faHospital;
      case 'revenue': return Icons.faChartLine;
      case 'review': return Icons.faStar;
      case 'system': return Icons.faCog;
      case 'warning': return Icons.faTriangleExclamation;
      default: return Icons.faBell;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'hospital': return '#3b82f6';
      case 'revenue': return '#10b981';
      case 'review': return '#f59e0b';
      case 'system': return '#8b5cf6';
      case 'warning': return '#ef4444';
      default: return '#64748b';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#0f172a',
            marginBottom: '4px'
          }}>Notifications</h1>
          <p style={{
            color: '#64748b',
            fontSize: '14px'
          }}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        <button
          onClick={markAllAsRead}
          style={{
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FontAwesomeIcon icon={Icons.faCheckDouble} />
          Mark all as read
        </button>
      </div>

      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {notifications.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <FontAwesomeIcon icon={Icons.faBellSlash} style={{ fontSize: '48px', marginBottom: '16px' }} />
            <h3 style={{ marginBottom: '8px' }}>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                background: !notification.read ? '#f0f9ff' : 'white',
                transition: 'background 0.3s'
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: getTypeColor(notification.type),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px'
              }}>
                <FontAwesomeIcon icon={getTypeIcon(notification.type)} />
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '4px'
                }}>
                  <h4 style={{
                    fontSize: '15px',
                    fontWeight: !notification.read ? '600' : '500',
                    color: '#0f172a',
                    margin: 0
                  }}>
                    {notification.title}
                  </h4>
                  <span style={{
                    fontSize: '12px',
                    color: '#64748b',
                    whiteSpace: 'nowrap'
                  }}>
                    {notification.time || getRelativeTime(notification.createdAt)}
                  </span>
                </div>
                
                <p style={{
                  color: '#475569',
                  fontSize: '14px',
                  marginBottom: '12px',
                  lineHeight: '1.5'
                }}>
                  {notification.message}
                </p>
                
                <div style={{
                  display: 'flex',
                  gap: '12px'
                }}>
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'transparent',
                        border: '1px solid #3b82f6',
                        color: '#3b82f6',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <FontAwesomeIcon icon={Icons.faCheck} />
                      Mark as read
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    style={{
                      padding: '6px 12px',
                      background: 'transparent',
                      border: '1px solid #ef4444',
                      color: '#ef4444',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FontAwesomeIcon icon={Icons.faTrash} />
                    Delete
                  </button>
                </div>
              </div>
              
              {!notification.read && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#3b82f6',
                  marginTop: '6px'
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;