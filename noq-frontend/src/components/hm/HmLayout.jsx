// components/hm/HmLayout.jsx - Firebase-only (no localStorage)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospital,
  faBuilding,
  faDoorOpen,
  faUsers,
  faCalendarCheck,
  faFileMedical,
  faBell,
  faHistory,
  faComments,
  faMoneyBill,
  faSignOutAlt,
  faBars,
  faTimes,
  faSearch,
  faCog,
  faHome,
  faUserMd,
  faSun,
  faMoon,
  faKey,
  faUserCircle
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';

const HmLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { doctors, departments, rooms, users, hospitals, loading } = useFirebaseData();
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = sessionStorage.getItem('hmDarkMode');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  
  const currentHospitalId = String(currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || '');

  const hospital = useMemo(() => {
    const matchedHospital = (hospitals || []).find(
      (item) => String(item?.id || item?.HID || '') === currentHospitalId
    );
    return {
      hospitalName:
        matchedHospital?.hospital_name ||
        matchedHospital?.hospitalName ||
        matchedHospital?.name ||
        currentUser?.hospitalName ||
        'Hospital',
      HID: matchedHospital?.id || matchedHospital?.HID || currentHospitalId || 'HID',
    };
  }, [hospitals, currentHospitalId, currentUser?.hospitalName]);
  
  // Store dark mode in sessionStorage instead of localStorage
  useEffect(() => {
    sessionStorage.setItem('hmDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  const stats = useMemo(() => {
    if (loading || !currentUser) {
      return {
        doctors: 0,
        departments: 0,
        rooms: 0,
        todayPatients: 0,
        credentials: 0,
      };
    }

    const byHospital = (items = [], key = 'hospitalId') =>
      (Array.isArray(items) ? items : []).filter((item) => {
        const value = String(item?.[key] || item?.hospital_id || item?.HID || item?.id || '');
        return value === currentHospitalId;
      });

    const credentialDocs = (Array.isArray(users) ? users : []).filter((item) => {
      const roleDoctor = String(item?.role || '').toLowerCase() === 'doctor';
      const itemHospitalId = String(item?.hospitalId || item?.hospital_id || item?.HID || '');
      return roleDoctor && (!currentHospitalId || itemHospitalId === currentHospitalId);
    });

    return {
      doctors: byHospital(doctors, 'hospitalId').length,
      departments: byHospital(departments, 'hospitalId').length,
      rooms: byHospital(rooms, 'hospitalId').length,
      todayPatients: 0,
      credentials: credentialDocs.length,
    };
  }, [doctors, departments, rooms, users, loading, currentUser, currentHospitalId]);
  
  const menuItems = [
    { id: 'management', label: 'Dashboard', icon: faHome, path: '/hm/management' },
    { id: 'doctors', label: 'Doctors', icon: faUserMd, path: '/hm/management/doctors', count: stats.doctors },
    { id: 'departments', label: 'Departments', icon: faBuilding, path: '/hm/management/departments', count: stats.departments },
    { id: 'rooms', label: 'Rooms', icon: faDoorOpen, path: '/hm/management/rooms', count: stats.rooms },
    { id: 'diseases', label: 'Diseases', icon: faFileMedical, path: '/hm/management/diseases' },
    { id: 'credentials', label: 'Credentials', icon: faKey, path: '/hm/management/credentials', count: stats.credentials },
    { id: 'queues', label: 'Queues', icon: faUsers, path: '/hm/management/queues' },
    { id: 'advanced-bookings', label: 'Advanced Bookings', icon: faCalendarCheck, path: '/hm/management/advanced-bookings' },
    { id: 'revenue', label: 'Revenue', icon: faMoneyBill, path: '/hm/management/revenue' },
    { id: 'feedback', label: 'Feedback', icon: faComments, path: '/hm/management/feedback' },
    { id: 'notifications', label: 'Notifications', icon: faBell, path: '/hm/management/notifications' },
    { id: 'audit', label: 'Audit Logs', icon: faHistory, path: '/hm/management/audit' },
    { id: 'hospital-profile', label: 'Hospital Profile', icon: faHospital, path: '/hm/management/hospital-profile' }
  ];
  
  const activeMenu = menuItems.find(item => location.pathname.includes(item.id)) || menuItems[0];
  
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      navigate('/login', { replace: true });
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      console.log(`Search for: ${searchTerm}`);
    }
  };
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const updateProfile = () => {
    navigate('/hm/management/hospital-profile');
  };
  
  useEffect(() => {
    const handleResize = () => {
      const nextWidth = window.innerWidth;
      setViewportWidth(nextWidth);
      if (nextWidth > 768) {
        setSidebarOpen((prev) => (prev ? prev : true));
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // CSS Styles - FIXED: Removed media queries from inline styles
  const styles = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    mobileMenuToggle: {
      position: 'fixed',
      top: '1rem',
      left: '1rem',
      zIndex: 1001,
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      width: '40px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '1.25rem'
    },
    sidebar: {
      width: '250px',
      background: 'white',
      borderRight: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      height: '100vh',
      zIndex: 1000,
      transition: 'transform 0.3s ease',
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
    },
    hospitalInfo: {
      padding: '1.5rem',
      borderBottom: '1px solid #e2e8f0',
      cursor: 'pointer'
    },
    hospitalIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: '#dbeafe',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1rem',
      color: '#3b82f6',
      fontSize: '1.5rem'
    },
    hospitalDetails: {},
    hospitalName: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    hospitalId: {
      fontSize: '0.75rem',
      color: '#64748b',
      marginBottom: '0.5rem'
    },
    hospitalStatus: {
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      background: '#dcfce7',
      color: '#166534',
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    nav: {
      flex: 1,
      padding: '1rem',
      overflowY: 'auto'
    },
    navSection: {
      marginBottom: '1.5rem'
    },
    sectionLabel: {
      fontSize: '0.75rem',
      color: '#64748b',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '0.75rem',
      paddingLeft: '0.5rem'
    },
    navItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '0.75rem',
      borderRadius: '8px',
      color: '#64748b',
      textDecoration: 'none',
      marginBottom: '0.25rem',
      transition: 'all 0.2s',
      position: 'relative',
      cursor: 'pointer',
      background: 'transparent',
      border: 'none',
      width: '100%',
      textAlign: 'left',
      fontSize: '0.95rem'
    },
    navItemActive: {
      background: '#f0f9ff',
      color: '#0369a1',
      fontWeight: '500'
    },
    navIcon: {
      marginRight: '0.75rem',
      width: '16px',
      fontSize: '1rem'
    },
    navLabel: {
      flex: 1
    },
    navCount: {
      background: '#3b82f6',
      color: 'white',
      fontSize: '0.75rem',
      padding: '0.125rem 0.5rem',
      borderRadius: '20px',
      minWidth: '20px',
      textAlign: 'center'
    },
    userInfo: {
      padding: '1rem',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    userAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#475569',
      cursor: 'pointer'
    },
    userDetails: {
      flex: 1
    },
    userName: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#1e293b'
    },
    userRole: {
      fontSize: '0.75rem',
      color: '#64748b'
    },
    logoutBtn: {
      background: 'none',
      border: 'none',
      color: '#64748b',
      cursor: 'pointer',
      padding: '0.5rem',
      borderRadius: '6px',
      fontSize: '1rem'
    },
    main: {
      flex: 1,
      marginLeft: sidebarOpen && viewportWidth > 768 ? '250px' : '0',
      transition: 'margin-left 0.3s ease'
    },
    header: {
      background: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '1.5rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    headerLeft: {},
    pageTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    pageSubtitle: {
      color: '#64748b',
      margin: 0,
      fontSize: '0.875rem'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    searchForm: {},
    searchContainer: {
      display: 'flex',
      alignItems: 'center',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '0.5rem 1rem'
    },
    searchIcon: {
      color: '#64748b',
      marginRight: '0.5rem',
      fontSize: '0.95rem'
    },
    searchInput: {
      border: 'none',
      background: 'transparent',
      outline: 'none',
      minWidth: '200px',
      fontSize: '0.95rem'
    },
    headerActions: {
      display: 'flex',
      gap: '0.5rem'
    },
    actionBtn: {
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      background: 'white',
      color: '#475569',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      transition: 'all 0.2s',
      fontSize: '1rem'
    },
    notificationBadge: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      background: '#ef4444',
      color: 'white',
      fontSize: '0.75rem',
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    content: {
      padding: '1.5rem',
      minHeight: 'calc(100vh - 80px)'
    },
    notificationsDropdown: {
      position: 'absolute',
      top: '80px',
      right: '1.5rem',
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      width: '320px',
      zIndex: 1000,
      maxHeight: '400px',
      overflow: 'hidden'
    },
    notificationsHeader: {
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#64748b',
      lineHeight: '1'
    },
    notificationsList: {
      maxHeight: '300px',
      overflowY: 'auto'
    },
    notificationItem: {
      padding: '1rem 1.5rem',
      borderBottom: '1px solid #f1f5f9',
      display: 'flex',
      gap: '0.75rem',
      alignItems: 'flex-start'
    },
    notificationText: {
      fontSize: '0.875rem',
      color: '#1e293b',
      marginBottom: '0.25rem'
    },
    notificationTime: {
      fontSize: '0.75rem',
      color: '#64748b'
    },
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 999,
      display: sidebarOpen && viewportWidth <= 768 ? 'block' : 'none'
    }
  };

  // Apply responsive styles with JavaScript
  const isLargeScreen = viewportWidth > 768;
  const isMobile = viewportWidth <= 640;

  const responsiveStyles = {
    ...styles,
    sidebar: {
      ...styles.sidebar,
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
    },
    main: {
      ...styles.main,
      marginLeft: sidebarOpen && isLargeScreen ? '250px' : '0'
    },
    searchForm: {
      ...styles.searchForm,
      display: isMobile ? 'none' : 'block'
    }
  };

  return (
    <div style={responsiveStyles.container}>
      {sidebarOpen && viewportWidth <= 768 && (
        <div 
          style={responsiveStyles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {viewportWidth <= 768 && (
        <button 
          style={responsiveStyles.mobileMenuToggle}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
        </button>
      )}
      
      <div style={responsiveStyles.sidebar}>
        <div style={responsiveStyles.hospitalInfo} onClick={updateProfile}>
          <div style={responsiveStyles.hospitalIcon}>
            <FontAwesomeIcon icon={faHospital} />
          </div>
          <div style={responsiveStyles.hospitalDetails}>
            <h3 style={responsiveStyles.hospitalName}>{hospital?.hospitalName || 'Hospital'}</h3>
            <div style={responsiveStyles.hospitalId}>{hospital?.HID || 'HID'}</div>
            <div style={responsiveStyles.hospitalStatus}>Active</div>
          </div>
        </div>
        
        <nav style={responsiveStyles.nav}>
          <div style={responsiveStyles.navSection}>
            <div style={responsiveStyles.sectionLabel}>Navigation</div>
            {menuItems.map(item => (
              <button
                key={item.id}
                style={{
                  ...responsiveStyles.navItem,
                  ...(activeMenu.id === item.id ? responsiveStyles.navItemActive : {})
                }}
                onClick={() => {
                  navigate(item.path);
                  if (viewportWidth <= 768) setSidebarOpen(false);
                }}
                onMouseOver={e => {
                  if (activeMenu.id !== item.id) {
                    e.currentTarget.style.background = '#f8fafc';
                  }
                }}
                onMouseOut={e => {
                  if (activeMenu.id !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <FontAwesomeIcon icon={item.icon} style={responsiveStyles.navIcon} />
                <span style={responsiveStyles.navLabel}>{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span style={responsiveStyles.navCount}>{item.count}</span>
                )}
              </button>
            ))}
          </div>
        </nav>
        
        <div style={responsiveStyles.userInfo}>
          <div style={responsiveStyles.userAvatar} onClick={updateProfile}>
            <FontAwesomeIcon icon={faUserCircle} />
          </div>
          <div style={responsiveStyles.userDetails} onClick={updateProfile}>
            <div style={responsiveStyles.userName}>{currentUser?.name || 'Hospital Manager'}</div>
            <div style={responsiveStyles.userRole}>Hospital Manager</div>
          </div>
          <button 
            style={responsiveStyles.logoutBtn} 
            onClick={handleLogout} 
            title="Logout"
            onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
          </button>
        </div>
      </div>
      
      <div style={responsiveStyles.main}>
        <header style={responsiveStyles.header}>
          <div style={responsiveStyles.headerLeft}>
            <h1 style={responsiveStyles.pageTitle}>{activeMenu.label}</h1>
            <p style={responsiveStyles.pageSubtitle}>
              {activeMenu.id === 'management' 
                ? 'Hospital Management Dashboard' 
                : `Manage ${activeMenu.label.toLowerCase()}`}
            </p>
          </div>
          
          <div style={responsiveStyles.headerRight}>
            <form style={responsiveStyles.searchForm} onSubmit={handleSearch}>
              <div style={responsiveStyles.searchContainer}>
                <FontAwesomeIcon icon={faSearch} style={responsiveStyles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search..."
                  style={responsiveStyles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
            
            <div style={responsiveStyles.headerActions}>
              <button 
                style={responsiveStyles.actionBtn}
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}
              >
                <FontAwesomeIcon icon={faBell} />
                <span style={responsiveStyles.notificationBadge}>3</span>
              </button>
              
              <button 
                style={responsiveStyles.actionBtn}
                onClick={toggleDarkMode}
                title={darkMode ? "Light Mode" : "Dark Mode"}
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}
              >
                <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
              </button>
              
              <button 
                style={responsiveStyles.actionBtn}
                onClick={updateProfile}
                title="Profile Settings"
                onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={e => e.currentTarget.style.background = 'white'}
              >
                <FontAwesomeIcon icon={faCog} />
              </button>
            </div>
          </div>
        </header>
        
        <main style={responsiveStyles.content}>
          {children}
        </main>
        
        {showNotifications && (
          <div style={responsiveStyles.notificationsDropdown}>
            <div style={responsiveStyles.notificationsHeader}>
              <h4 style={{margin: 0, fontSize: '1.125rem'}}>Notifications</h4>
              <button 
                onClick={() => setShowNotifications(false)} 
                style={responsiveStyles.closeBtn}
              >
                ×
              </button>
            </div>
            <div style={responsiveStyles.notificationsList}>
              <div style={responsiveStyles.notificationItem}>
                <FontAwesomeIcon icon={faUserMd} style={{color: '#3b82f6'}} />
                <div>
                  <div style={responsiveStyles.notificationText}>New doctor registration pending</div>
                  <div style={responsiveStyles.notificationTime}>2 hours ago</div>
                </div>
              </div>
              <div style={responsiveStyles.notificationItem}>
                <FontAwesomeIcon icon={faBuilding} style={{color: '#10b981'}} />
                <div>
                  <div style={responsiveStyles.notificationText}>Room 101 maintenance required</div>
                  <div style={responsiveStyles.notificationTime}>1 day ago</div>
                </div>
              </div>
              <div style={responsiveStyles.notificationItem}>
                <FontAwesomeIcon icon={faBell} style={{color: '#f59e0b'}} />
                <div>
                  <div style={responsiveStyles.notificationText}>Queue wait time exceeds 30 minutes</div>
                  <div style={responsiveStyles.notificationTime}>3 hours ago</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HmLayout;