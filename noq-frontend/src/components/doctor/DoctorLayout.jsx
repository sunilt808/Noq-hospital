// src/assets/components/doctor/DoctorLayout.jsx - IMPROVED COMPACT VERSION
import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospital,
  faUserMd,
  faCalendarAlt,
  faUsers,
  faClock,
  faUserCircle,
  faBell,
  faSignOutAlt,
  faChevronLeft,
  faChevronRight,
  faHome,
  faChartLine,
  faStethoscope,
  faBed,
  faPrescriptionBottle,
  faShieldHeart,
  faSun,
  faMoon
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationBadge from '../NotificationBadge';
import ThemeToggle from '../ThemeToggle';

const DoctorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(3);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [doctorInfo, setDoctorInfo] = useState({
    name: 'Dr. John Smith',
    specialization: 'Cardiologist',
    hospitalName: 'City General Hospital',
    room: 'Room 101',
    shift: 'Morning Shift'
  });

  useEffect(() => {
    // Load doctor info from auth context
    if (currentUser && currentUser.role === 'doctor') {
      setDoctorInfo({
        name: currentUser.full_name || currentUser.name || 'Dr. Doctor',
        specialization: currentUser.specialization || 'Specialist',
        hospitalName: currentUser.hospitalName || 'NOQ Hospital',
        room: currentUser.room_no ? `Room ${currentUser.room_no}` : (currentUser.room || 'Room 101'),
        shift: currentUser.shift ? `${currentUser.shift.charAt(0).toUpperCase() + currentUser.shift.slice(1)} Shift` : 'Morning Shift'
      });
    } else if (!currentUser) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  // Internal CSS styles - MORE COMPACT
  const styles = {
    layout: {
      display: 'flex',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
      backgroundColor: isDark ? '#0f172a' : '#f5f7fa'
    },
    sidebar: {
      width: isSidebarCollapsed ? '70px' : '220px',
      background: isDark ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' : 'linear-gradient(180deg, #1a237e 0%, #283593 100%)',
      color: 'white',
      padding: '0',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '3px 0 15px rgba(0,0,0,0.08)',
      position: 'relative',
      zIndex: 100
    },
    sidebarHeader: {
      padding: '20px 15px',
      background: 'rgba(255,255,255,0.05)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      minHeight: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
      gap: '10px'
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      overflow: 'hidden'
    },
    logoIcon: {
      width: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: 'white',
      flexShrink: 0,
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
    },
    logoText: {
      fontSize: '18px',
      fontWeight: '700',
      color: 'white',
      opacity: isSidebarCollapsed ? '0' : '1',
      whiteSpace: 'nowrap',
      letterSpacing: '0.5px',
      transform: isSidebarCollapsed ? 'translateX(-10px)' : 'translateX(0)',
      transition: 'all 0.3s ease'
    },
    sidebarMenu: {
      listStyle: 'none',
      padding: '20px 0',
      margin: '0',
      flex: '1',
      overflowY: 'auto'
    },
    menuItem: {
      margin: '3px 12px'
    },
    menuLink: {
      color: 'rgba(255,255,255,0.85)',
      textDecoration: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 15px',
      borderRadius: '8px',
      transition: 'all 0.2s ease',
      backgroundColor: 'transparent',
      fontSize: '14px',
      fontWeight: '500',
      position: 'relative'
    },
    menuLinkActive: {
        backgroundColor: '#4338ca',
      color: 'white',
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
    },
    menuLinkHover: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      color: 'white'
    },
    menuIcon: {
      fontSize: '16px',
      width: '20px',
      textAlign: 'center',
      flexShrink: 0,
      opacity: isSidebarCollapsed ? '1' : '1'
    },
    menuLabel: {
      opacity: isSidebarCollapsed ? '0' : '1',
      transform: isSidebarCollapsed ? 'translateX(-10px)' : 'translateX(0)',
      transition: 'all 0.3s ease',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      fontSize: '14px'
    },
    collapseButton: {
      position: 'absolute',
      top: '75px',
      right: isSidebarCollapsed ? '-12px' : '-12px',
      background: 'white',
      border: 'none',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      zIndex: 101,
      color: '#4f46e5',
      fontSize: '12px',
      transition: 'all 0.3s ease'
    },
    mainContent: {
      flex: '1',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#f5f7fa',
      minWidth: 0
    },
    header: {
      background: isDark ? '#1e293b' : 'white',
      padding: '15px 25px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
      borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      minHeight: '70px'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      flex: 1,
      minWidth: 0
    },
    profileCard: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      padding: '8px 16px',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      minWidth: 0,
      flexShrink: 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    },
    doctorAvatar: {
      width: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, #10b981, #059669)',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      color: 'white',
      flexShrink: 0
    },
    doctorInfoCompact: {
      minWidth: 0,
      flex: 1
    },
    doctorName: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 3px 0',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    doctorDetails: {
      fontSize: '12px',
      color: '#64748b',
      margin: '0',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center'
    },
    detailItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    headerCenter: {
      flex: 2,
      minWidth: 0,
      padding: '0 20px'
    },
    headerTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: isDark ? '#e2e8f0' : '#1e293b',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    headerSubtitle: {
      fontSize: '13px',
      color: '#64748b',
      margin: '4px 0 0 0',
      fontWeight: '400'
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      flexShrink: 0
    },
    notificationBadge: {
      position: 'relative',
      cursor: 'pointer',
      color: '#475569',
      fontSize: '18px',
      transition: 'all 0.2s',
      padding: '8px',
      borderRadius: '8px',
      background: '#f8fafc',
      border: '1px solid #e2e8f0'
    },
    notificationCount: {
      position: 'absolute',
      top: '-4px',
      right: '-4px',
      background: '#ef4444',
      color: 'white',
      borderRadius: '50%',
      width: '18px',
      height: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontWeight: '600',
      border: '2px solid white'
    },
    logoutButton: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '13px',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.15)',
      whiteSpace: 'nowrap'
    },
    content: {
      flex: '1',
      padding: '20px',
      overflowY: 'auto',
      background: isDark ? '#0f172a' : '#f5f7fa',
      maxHeight: 'calc(100vh - 70px)'
    },
    contentCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      border: '1px solid #e2e8f0',
      minHeight: 'calc(100vh - 110px)'
    },
    breadcrumb: {
      fontSize: '13px',
      color: '#64748b',
      marginBottom: '15px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 0'
    },
    quickStats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px',
      marginBottom: '20px'
    },
    statCard: {
      background: 'white',
      padding: '15px',
      borderRadius: '10px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }
  };

  const menuItems = [
    { path: '/doctor/dashboard', label: 'Dashboard', icon: faChartLine },
    { path: '/doctor/appointments', label: 'Appointments', icon: faCalendarAlt },
    { path: '/doctor/patients', label: 'Patients', icon: faUsers },
    { path: '/doctor/queue', label: 'Queue', icon: faClock },
    { path: '/doctor/prescriptions', label: 'Prescriptions', icon: faPrescriptionBottle },
    { path: '/doctor/advanced-bookings', label: 'Advanced Bookings', icon: faShieldHeart },
    { path: '/doctor/profile', label: 'Profile', icon: faUserCircle }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path);

  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem ? currentItem.label : 'Doctor Portal';
  };

  return (
    <div style={styles.layout}>
      {/* Sidebar - Slim Navigation Only */}
      <aside style={styles.sidebar}>
        {/* Sidebar Header with NOQ Logo */}
        <div style={styles.sidebarHeader}>
          <div style={styles.logoContainer}>
            <div style={styles.logoIcon}>
              <FontAwesomeIcon icon={faHospital} />
            </div>
            <div style={styles.logoText}>NOQ</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <ul style={styles.sidebarMenu}>
          {menuItems.map((item) => (
            <li key={item.path} style={styles.menuItem}>
              <Link
                to={item.path}
                style={{
                  ...styles.menuLink,
                  ...(isActive(item.path) ? styles.menuLinkActive : {}),
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = styles.menuLinkHover.backgroundColor;
                    e.currentTarget.style.color = styles.menuLinkHover.color;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                  }
                }}
                title={isSidebarCollapsed ? item.label : ''}
              >
                <FontAwesomeIcon 
                  icon={item.icon} 
                  style={styles.menuIcon}
                />
                {!isSidebarCollapsed && (
                  <span style={styles.menuLabel}>{item.label}</span>
                )}
                {isActive(item.path) && !isSidebarCollapsed && (
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: 'white'
                  }} />
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Collapse Button */}
        <button
          style={styles.collapseButton}
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <FontAwesomeIcon icon={isSidebarCollapsed ? faChevronRight : faChevronLeft} />
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        {/* Header with Profile Card */}
        <header style={styles.header}>
          {/* Left: Profile Card */}
          <div style={styles.headerLeft}>
            <div style={styles.profileCard}>
              <div style={styles.doctorAvatar}>
                <FontAwesomeIcon icon={faUserMd} />
              </div>
              <div style={styles.doctorInfoCompact}>
                <h4 style={styles.doctorName}>{doctorInfo.name}</h4>
                <div style={styles.doctorDetails}>
                  <span style={styles.detailItem}>
                    <FontAwesomeIcon icon={faStethoscope} style={{ fontSize: '10px' }} />
                    {doctorInfo.specialization}
                  </span>
                  <span>•</span>
                  <span style={styles.detailItem}>
                    <FontAwesomeIcon icon={faBed} style={{ fontSize: '10px' }} />
                    {doctorInfo.room}
                  </span>
                  <span>•</span>
                  <span>{doctorInfo.shift}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Page Title */}
          <div style={styles.headerCenter}>
            <h1 style={styles.headerTitle}>
              <FontAwesomeIcon icon={faUserMd} style={{ color: '#4f46e5', fontSize: '18px' }} />
              {getPageTitle()}
            </h1>
            <p style={styles.headerSubtitle}>
              {doctorInfo.hospitalName} • Doctor Portal
            </p>
          </div>

          {/* Right: Actions */}
          <div style={styles.headerActions}>
            <NotificationBadge />
            
            <ThemeToggle />
            
            <button
              style={styles.logoutButton}
              onClick={handleLogout}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(239, 68, 68, 0.15)';
              }}
              title="Logout"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              Logout
            </button>
          </div>
        </header>

        {/* Breadcrumb */}
        <div style={styles.breadcrumb}>
          <FontAwesomeIcon icon={faHome} style={{ fontSize: '12px' }} />
          <span>/</span>
          <span>Doctor Portal</span>
          <span>/</span>
          <span style={{ color: '#4f46e5', fontWeight: '600' }}>
            {getPageTitle()}
          </span>
        </div>

        {/* Content Area - No extra padding, direct content */}
        <div style={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DoctorLayout;