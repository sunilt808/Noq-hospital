// pages/hm/Management.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospital, faUserMd, faBuilding, faDoorOpen,
  faUsers, faFileMedical, faMoneyBill, faBell,
  faHistory, faComments, faCog, faCalendarAlt,
  faExclamationTriangle, faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import api from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext';

const Management = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const currentHospitalId = String(
    currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || ''
  );

  const [hospital, setHospital] = useState({
    HID: currentHospitalId,
    name: currentUser?.hospitalName || 'Hospital',
    category: 'Hospital',
    status: String(currentUser?.status || 'active').toLowerCase(),
    address: '',
    emergencyContact: ''
  });

  const updateProfile = () => {
    navigate('/hm/management/hospital-profile');
  };

  const [stats, setStats] = useState({
    doctors: 0, departments: 0, rooms: 0,
    todayPatients: 0, activeQueues: 0, revenueToday: 0
  });
  
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [hospitalsRes, hmUsersRes, doctorUsersRes] = await Promise.all([
          api.get('/hospitals?status_filter=all').catch(() => []),
          api.get('/users?role=hm').catch(() => ({ data: { users: [] } })),
          api.get('/users?role=doctor').catch(() => ({ data: { users: [] } })),
        ]);

        const hospitals = Array.isArray(hospitalsRes)
          ? hospitalsRes
          : (hospitalsRes?.data?.hospitals || hospitalsRes?.hospitals || []);
        const hmUsers = hmUsersRes?.data?.users || hmUsersRes?.users || [];
        const doctorUsers = doctorUsersRes?.data?.users || doctorUsersRes?.users || [];

        const matchedHospital = hospitals.find(
          (item) => String(item.id || item.HID || '') === currentHospitalId
        );

        if (matchedHospital) {
          const matchedHm = hmUsers.find(
            (item) => String(item?.hospital_id || item?.hospitalId || '') === String(matchedHospital?.id || '')
          );
          setHospital({
            HID: String(matchedHospital.id || matchedHospital.HID || currentHospitalId),
            name: matchedHospital.hospital_name || matchedHospital.hospitalName || matchedHospital.name || 'Hospital',
            category: matchedHospital.category || matchedHospital.type || 'Hospital',
            status: String(matchedHospital.status || currentUser?.status || 'active').toLowerCase(),
            address: matchedHospital.address || '',
            emergencyContact: matchedHospital.emergency_contact || matchedHospital.emergencyContact || matchedHm?.phone || '',
          });
        }

        const doctorCount = doctorUsers.filter(
          (item) => String(item.hospitalId || item.hospital_id || item.HID || '') === currentHospitalId
        ).length;

        setStats({
          doctors: doctorCount,
          departments: 0,
          rooms: 0,
          todayPatients: 0,
          activeQueues: 0,
          revenueToday: 0,
        });

        setActivity([]);
      } catch (error) {
        console.error('Failed to load HM dashboard:', error);
      }
    };

    loadDashboard();
  }, [currentHospitalId, currentUser?.status]);

  // CSS Styles
  const styles = {
    container: {
      padding: '1.5rem',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: "'Segoe UI', 'Roboto', sans-serif"
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    subtitle: {
      color: '#64748b',
      fontSize: '0.95rem',
      margin: '0'
    },
    hospitalBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    hospitalId: {
      background: '#f8fafc',
      color: '#475569',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    hospitalStatus: {
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    activeStatus: {
      background: '#d1fae5',
      color: '#065f46'
    },
    profileCard: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    },
    profileHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    profileInfo: {
      display: 'flex',
      gap: '1rem',
      alignItems: 'flex-start'
    },
    profileAvatar: {
      width: '64px',
      height: '64px',
      background: '#3b82f6',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.5rem'
    },
    profileName: {
      fontSize: '1.5rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    profileCategory: {
      color: '#64748b',
      fontSize: '0.95rem',
      margin: '0 0 0.25rem 0'
    },
    profileAddress: {
      color: '#94a3b8',
      fontSize: '0.875rem',
      margin: '0'
    },
    profileEditBtn: {
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    profileStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '1.5rem',
      borderTop: '1px solid #f1f5f9',
      paddingTop: '1.5rem'
    },
    profileStat: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    statValue: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1e293b'
    },
    statLabel: {
      color: '#64748b',
      fontSize: '0.875rem'
    },
    section: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '1.5rem',
      marginBottom: '2rem'
    },
    sectionTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 1rem 0'
    },
    actionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem'
    },
    actionBtn: {
      background: '#f8fafc',
      color: '#475569',
      border: '1px solid #cbd5e1',
      padding: '1rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem'
    },
    managementCard: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    cardHeader: {
      padding: '1.25rem',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem'
    },
    cardIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.25rem',
      flexShrink: '0'
    },
    cardTitle: {
      flex: '1',
      minWidth: '0'
    },
    cardMainTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    cardDescription: {
      color: '#64748b',
      fontSize: '0.875rem',
      margin: '0',
      lineHeight: '1.4'
    },
    cardCount: {
      background: '#f1f5f9',
      color: '#475569',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '600'
    },
    cardFooter: {
      padding: '0.75rem 1.25rem',
      background: '#f8fafc',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      color: '#64748b',
      fontSize: '0.875rem'
    },
    activityList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    },
    activityItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem',
      borderRadius: '8px',
      transition: 'background 0.2s'
    },
    activityIcon: {
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      background: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#475569'
    },
    activityContent: {
      flex: '1'
    },
    activityText: {
      color: '#475569',
      fontSize: '0.95rem',
      fontWeight: '500'
    },
    activityTime: {
      color: '#94a3b8',
      fontSize: '0.875rem'
    },
    emergencyCard: {
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      border: '1px solid #f59e0b',
      borderRadius: '16px',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      color: '#92400e'
    },
    emergencyTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      margin: '0 0 0.25rem 0'
    },
    emergencyNumber: {
      fontSize: '1.25rem',
      fontWeight: '700',
      margin: '0'
    }
  };

  const cards = [
    { id: 1, title: 'Doctor Management', desc: 'Add, edit, enable/disable doctors', icon: faUserMd, path: '/hm/management/doctors', color: '#3b82f6', count: stats.doctors },
    { id: 2, title: 'Department Management', desc: 'Manage hospital departments', icon: faBuilding, path: '/hm/management/departments', color: '#10b981', count: stats.departments },
    { id: 3, title: 'Room Management', desc: 'Assign rooms to departments', icon: faDoorOpen, path: '/hm/management/rooms', color: '#f59e0b', count: stats.rooms },
    { id: 4, title: 'Disease Management', desc: 'Map diseases to departments', icon: faFileMedical, path: '/hm/management/diseases', color: '#8b5cf6' },
    { id: 5, title: 'Queue Monitor', desc: 'View live token stats', icon: faUsers, path: '/hm/management/queues', color: '#ec4899', count: stats.activeQueues },
    { id: 10, title: 'Advanced Bookings', desc: 'Priority bookings with allocated doctors only', icon: faCalendarAlt, path: '/hm/management/advanced-bookings', color: '#0ea5e9' },
    { id: 6, title: 'Revenue & Payments', desc: 'View hospital revenue', icon: faMoneyBill, path: '/hm/management/revenue', color: '#84cc16', count: `₹${stats.revenueToday.toLocaleString()}` },
    { id: 7, title: 'Patient Feedback', desc: 'Manage ratings & reviews', icon: faComments, path: '/hm/management/feedback', color: '#06b6d4' },
    { id: 8, title: 'Notifications', desc: 'System alerts & notifications', icon: faBell, path: '/hm/management/notifications', color: '#f97316', count: 3 },
    { id: 9, title: 'Audit Logs', desc: 'View all system activities', icon: faHistory, path: '/hm/management/audit', color: '#64748b' }
  ];

  const quickActions = [
    { label: 'Add New Doctor', path: '/hm/management/doctors', icon: faUserMd },
    { label: 'Create Department', path: '/hm/management/departments', icon: faBuilding },
    { label: 'Add Room', path: '/hm/management/rooms', icon: faDoorOpen },
    { label: 'View Token Monitor', path: '/hm/management/queues', icon: faUsers },
    { label: 'Advanced Bookings', path: '/hm/management/advanced-bookings', icon: faCalendarAlt }
  ];

  const handleCardClick = (path) => navigate(path);
  const handleQuickAction = (path) => navigate(path);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Hospital Management Dashboard</h1>
          <p style={styles.subtitle}>Manage your hospital operations</p>
        </div>
        <div style={styles.hospitalBadge}>
          <span style={styles.hospitalId}>{hospital.HID || 'N/A'}</span>
          <span style={{...styles.hospitalStatus, ...styles.activeStatus}}>
            {hospital.status || 'active'}
          </span>
        </div>
      </div>

      <div style={styles.profileCard}>
        <div style={styles.profileHeader}>
          <div style={styles.profileInfo}>
            <div style={styles.profileAvatar}>
              <FontAwesomeIcon icon={faHospital} />
            </div>
            <div>
              <h2 style={styles.profileName}>{hospital.name}</h2>
              <p style={styles.profileCategory}>{hospital.category} Hospital</p>
              <p style={styles.profileAddress}>{hospital.address}</p>
            </div>
          </div>
          <button style={styles.profileEditBtn} onClick={updateProfile}
            onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
            onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
            <FontAwesomeIcon icon={faCog} /> Edit Profile
          </button>
        </div>
        
        <div style={styles.profileStats}>
          {[
            { icon: faUserMd, value: stats.doctors, label: 'Doctors' },
            { icon: faBuilding, value: stats.departments, label: 'Departments' },
            { icon: faDoorOpen, value: stats.rooms, label: 'Rooms' },
            { icon: faUsers, value: stats.todayPatients, label: "Today's Patients" }
          ].map((stat, idx) => (
            <div key={idx} style={styles.profileStat}>
              <FontAwesomeIcon icon={stat.icon} style={{ fontSize: '1.5rem', color: '#3b82f6' }} />
              <div>
                <div style={styles.statValue}>{stat.value}</div>
                <div style={styles.statLabel}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Quick Actions</h3>
        <div style={styles.actionsGrid}>
          {quickActions.map((action, idx) => (
            <button key={idx} style={styles.actionBtn}
              onClick={() => handleQuickAction(action.path)}
              onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}>
              <FontAwesomeIcon icon={action.icon} /> {action.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Hospital Management</h3>
        <div style={styles.cardsGrid}>
          {cards.map(card => (
            <div key={card.id} style={styles.managementCard}
              onClick={() => handleCardClick(card.path)}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={styles.cardHeader}>
                <div style={{...styles.cardIcon, background: card.color}}>
                  <FontAwesomeIcon icon={card.icon} />
                </div>
                <div style={styles.cardTitle}>
                  <h4 style={styles.cardMainTitle}>{card.title}</h4>
                  <p style={styles.cardDescription}>{card.desc}</p>
                </div>
                {card.count && <div style={{...styles.cardCount, background: `${card.color}15`, color: card.color}}>
                  {card.count}
                </div>}
              </div>
              <div style={styles.cardFooter}>
                <span>Click to manage</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Recent Activity</h3>
        <div style={styles.activityList}>
          {(activity.length ? activity : [{ id: 'empty', action: 'No recent activity', time: 'Just now', icon: faHistory }]).map(item => (
            <div key={item.id} style={styles.activityItem}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <div style={styles.activityIcon}>
                <FontAwesomeIcon icon={item.icon} />
              </div>
              <div style={styles.activityContent}>
                <div style={styles.activityText}>{item.action}</div>
                <div style={styles.activityTime}>{item.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.emergencyCard}>
        <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: '1.5rem' }} />
        <div>
          <h4 style={styles.emergencyTitle}>Emergency Contact</h4>
          <p style={styles.emergencyNumber}>{hospital.emergencyContact}</p>
        </div>
      </div>
    </div>
  );
};

export default Management;