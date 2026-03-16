import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell,
  faArrowLeft,
  faCheck,
  faTrash,
  faCheckDouble,
  faTriangleExclamation,
  faHospital,
  faUserMd,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import notificationService from '../../../services/notificationService.js';
import { useAuth } from '../../../context/FirebaseAuthContext';

const iconByType = {
  warning: faTriangleExclamation,
  hospital: faHospital,
  doctor: faUserMd,
  queue: faClock,
};

const colorByType = {
  warning: '#ef4444',
  hospital: '#3b82f6',
  doctor: '#10b981',
  queue: '#f59e0b',
  system: '#64748b',
};

const relativeTime = (timestamp) => {
  const diff = Date.now() - new Date(timestamp || '').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const user = currentUser || {};
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState([]);

  const load = () => {
    setNotifications(notificationService.getForUser(user));
  };

  useEffect(() => {
    load();
    const unsubscribe = notificationService.subscribe(load);
    return () => unsubscribe();
  }, []);

  const unread = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/hm/management')}
          style={{ border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer' }}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>

        <div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Notifications</h2>
          <small style={{ color: '#64748b' }}>{unread} unread</small>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => notificationService.markAllReadForUser(user)}
            style={{ border: 'none', background: '#2563eb', color: '#fff', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faCheckDouble} /> Mark all read
          </button>
          <button
            onClick={() => notificationService.clearForUser(user)}
            style={{ border: 'none', background: '#dc2626', color: '#fff', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' }}
          >
            <FontAwesomeIcon icon={faTrash} /> Clear all
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {['all', 'unread'].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            style={{
              border: '1px solid #cbd5e1',
              background: filter === item ? '#2563eb' : '#fff',
              color: filter === item ? '#fff' : '#334155',
              borderRadius: '999px',
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <FontAwesomeIcon icon={faBell} style={{ fontSize: '32px', marginBottom: '8px' }} />
            <div>No notifications</div>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                padding: '14px 16px',
                borderBottom: '1px solid #f1f5f9',
                background: item.read ? '#fff' : '#f8fbff',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                  background: colorByType[item.type] || '#64748b',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <FontAwesomeIcon icon={iconByType[item.type] || faBell} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <strong style={{ color: '#0f172a' }}>{item.title}</strong>
                  <small style={{ color: '#94a3b8' }}>{relativeTime(item.createdAt)}</small>
                </div>
                <div style={{ color: '#475569', marginTop: '4px' }}>{item.message}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {!item.read && (
                    <button
                      onClick={() => notificationService.markRead(item.id, user)}
                      style={{ border: '1px solid #2563eb', color: '#2563eb', background: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                    >
                      <FontAwesomeIcon icon={faCheck} /> Read
                    </button>
                  )}
                  <button
                    onClick={() => notificationService.deleteForUser(item.id, user)}
                    style={{ border: '1px solid #ef4444', color: '#ef4444', background: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}
                  >
                    <FontAwesomeIcon icon={faTrash} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
