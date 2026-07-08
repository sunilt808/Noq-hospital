// components/AdminLayout.jsx - API-only (no localStorage), uses global ThemeContext
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useApiData from '../hooks/useApiData';

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { isDark: darkMode, toggleTheme } = useTheme();
  const { hospitals, reviews } = useApiData();
  
  const pendingApprovalsCount = hospitals?.filter?.(h => String(h.status || '').toLowerCase() === 'pending')?.length || null;
  const reviewsCount = reviews?.length || null;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications] = useState(3);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      console.log('Searching for:', searchTerm);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
  };

  // Logout function - uses auth context
  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      await logout();
      navigate('/admin/login', { replace: true });
    }
  };

  // Get admin info from auth context
  const adminEmail = currentUser?.email || 'admin@system.com';
  const adminName = currentUser?.name || adminEmail.split('@')[0];
  const adminInitial = (adminName.charAt(0) || 'A').toUpperCase();

  // Menu items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.faTachometerAlt, path: '/admin/dashboard', badge: null },
    { id: 'hm-approvals', label: 'HM Approvals', icon: Icons.faUserCheck, path: '/admin/hm-approvals', badge: pendingApprovalsCount },
    { id: 'hospitals', label: 'Hospitals', icon: Icons.faHospital, path: '/admin/hospitals', badge: null },
    { id: 'revenue', label: 'Revenue', icon: Icons.faChartLine, path: '/admin/revenue', badge: null },
    { id: 'reviews', label: 'Reviews', icon: Icons.faStar, path: '/admin/reviews', badge: reviewsCount },
    { id: 'profile', label: 'Profile', icon: Icons.faUser, path: '/admin/profile', badge: null },
    { id: 'settings', label: 'Settings', icon: Icons.faCog, path: '/admin/settings', badge: null },
  ];

  // Get active page
  const activePage = menuItems.find(item => location.pathname.includes(item.id))?.id || 'dashboard';

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: darkMode ? '#0f172a' : '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      display: 'flex'
    },
    sidebar: {
      width: sidebarCollapsed ? '80px' : '260px',
      background: darkMode ? '#1e293b' : 'white',
      borderRight: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      position: 'relative'
    },
    logoSection: {
      padding: '24px 20px',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
    },
    logoIcon: {
      width: '40px',
      height: '40px',
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '20px',
      flexShrink: 0
    },
    logoText: {
      fontSize: '20px',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      display: sidebarCollapsed ? 'none' : 'block'
    },
    collapseBtn: {
      position: 'absolute',
      top: '28px',
      right: '-12px',
      width: '24px',
      height: '24px',
      background: darkMode ? '#334155' : '#e2e8f0',
      border: `1px solid ${darkMode ? '#475569' : '#cbd5e1'}`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '12px',
      color: darkMode ? '#cbd5e1' : '#475569'
    },
    menu: {
      flex: 1,
      padding: '20px 0',
      overflowY: 'auto'
    },
    menuItem: {
      padding: sidebarCollapsed ? '16px 24px' : '16px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      color: darkMode ? '#cbd5e1' : '#64748b',
      position: 'relative',
      margin: '4px 12px',
      borderRadius: '8px',
      justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
    },
    menuItemActive: {
      background: darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
      color: darkMode ? '#ffffff' : '#3b82f6',
      fontWeight: '600'
    },
    menuIcon: {
      width: '20px',
      fontSize: '18px',
      flexShrink: 0
    },
    menuLabel: {
      display: sidebarCollapsed ? 'none' : 'block',
      fontSize: '14px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    badge: {
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: '#ef4444',
      color: 'white',
      fontSize: '10px',
      fontWeight: '600',
      padding: '2px 6px',
      borderRadius: '10px',
      minWidth: '20px',
      textAlign: 'center',
      display: sidebarCollapsed ? 'none' : 'flex'
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    },
    header: {
      background: darkMode ? '#1e293b' : 'white',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '20px',
      flexWrap: 'wrap'
    },
    searchContainer: {
      flex: 1,
      minWidth: '300px',
      maxWidth: '500px',
      position: 'relative'
    },
    searchBar: {
      width: '100%',
      padding: '12px 48px 12px 48px',
      border: `2px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      borderRadius: '10px',
      background: darkMode ? '#0f172a' : '#f8fafc',
      color: darkMode ? '#cbd5e1' : '#0f172a',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.3s ease'
    },
    searchIcon: {
      position: 'absolute',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: darkMode ? '#94a3b8' : '#64748b',
      fontSize: '16px'
    },
    searchButton: {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      transition: 'all 0.3s ease'
    },
    clearButton: {
      position: 'absolute',
      right: '75px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'transparent',
      border: 'none',
      color: darkMode ? '#94a3b8' : '#64748b',
      cursor: 'pointer',
      fontSize: '14px',
      padding: '4px',
      display: searchTerm ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center'
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    actionBtn: {
      background: 'none',
      border: 'none',
      color: darkMode ? '#cbd5e1' : '#64748b',
      cursor: 'pointer',
      fontSize: '18px',
      position: 'relative',
      padding: '8px',
      borderRadius: '8px',
      transition: 'all 0.3s ease'
    },
    notificationBadge: {
      position: 'absolute',
      top: '-2px',
      right: '-2px',
      background: '#ef4444',
      color: 'white',
      fontSize: '10px',
      fontWeight: '600',
      padding: '2px 6px',
      borderRadius: '10px',
      minWidth: '16px'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      padding: '8px 12px',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
      position: 'relative'
    },
    userAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '16px'
    },
    userDetails: {
      display: 'flex',
      flexDirection: 'column'
    },
    userName: {
      fontSize: '14px',
      fontWeight: '600',
      color: darkMode ? '#ffffff' : '#0f172a'
    },
    userRole: {
      fontSize: '12px',
      color: darkMode ? '#94a3b8' : '#64748b'
    },
    dropdown: {
      position: 'absolute',
      top: '60px',
      right: '0',
      background: darkMode ? '#1e293b' : 'white',
      border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
      borderRadius: '12px',
      padding: '8px 0',
      minWidth: '220px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      animation: 'slideDown 0.2s ease'
    },
    dropdownHeader: {
      padding: '16px 20px',
      borderBottom: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`
    },
    dropdownItem: {
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
      color: darkMode ? '#cbd5e1' : '#475569',
      transition: 'all 0.3s ease',
      fontSize: '14px'
    },
    content: {
      flex: 1,
      padding: '24px',
      overflowY: 'auto',
      background: darkMode ? '#0f172a' : '#f8fafc',
      position: 'relative'
    },
    tooltip: {
      position: 'absolute',
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      background: darkMode ? '#334155' : '#1e293b',
      color: 'white',
      padding: '6px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      marginLeft: '8px',
      zIndex: 100,
      display: 'none'
    }
  };

  // Add CSS animations with custom scrollbar
  const cssStyles = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Custom scrollbar for content area */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: ${darkMode ? '#1e293b' : '#f1f5f9'};
      border-radius: 5px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: ${darkMode ? '#475569' : '#cbd5e1'};
      border-radius: 5px;
      transition: background 0.3s ease;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: ${darkMode ? '#64748b' : '#94a3b8'};
    }
    
    /* Firefox scrollbar */
    * {
      scrollbar-width: thin;
      scrollbar-color: ${darkMode ? '#475569 #1e293b' : '#cbd5e1 #f1f5f9'};
    }
    
    /* Sidebar menu scrollbar */
    .sidebar-menu {
      scrollbar-width: thin;
      scrollbar-color: ${darkMode ? '#475569 transparent' : '#cbd5e1 transparent'};
    }
    
    .sidebar-menu::-webkit-scrollbar {
      width: 6px;
    }
    
    .sidebar-menu::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .sidebar-menu::-webkit-scrollbar-thumb {
      background: ${darkMode ? '#475569' : '#cbd5e1'};
      border-radius: 3px;
    }
    
    .menu-item:hover .menu-tooltip {
      display: block;
    }
    
    .action-btn:hover {
      background: ${darkMode ? '#334155' : '#f1f5f9'};
      color: #3b82f6;
    }
    
    .user-info:hover {
      background: ${darkMode ? '#334155' : '#f1f5f9'};
    }
    
    .dropdown-item:hover {
      background: ${darkMode ? '#334155' : '#f1f5f9'};
      color: ${darkMode ? '#ffffff' : '#3b82f6'};
    }
    
    .search-bar:focus {
      border-color: #3b82f6;
    }
    
    .menu-item-active .menu-icon {
      color: #3b82f6;
    }
    
    /* Smooth scrolling */
    .content-scrollable {
      scroll-behavior: smooth;
    }
    
    /* Search button hover effect */
    .search-button:hover {
      background: #2563eb;
      transform: translateY(-50%) scale(1.05);
    }
    
    /* Clear button hover effect */
    .clear-button:hover {
      color: ${darkMode ? '#ffffff' : '#0f172a'};
    }
    
    /* Search container focus */
    .search-container:focus-within .search-bar {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px ${darkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'};
    }
  `;

  // Add styles to document
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = cssStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, [darkMode, searchTerm]);

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <FontAwesomeIcon icon={Icons.faShieldAlt} />
          </div>
          <div style={styles.logoText}>NOQ Admin</div>
          <button
            style={styles.collapseBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <FontAwesomeIcon icon={sidebarCollapsed ? Icons.faChevronRight : Icons.faChevronLeft} />
          </button>
        </div>
        
        <div style={styles.menu} className="sidebar-menu">
          {menuItems.map(item => (
            <div
              key={item.id}
              className={`menu-item ${activePage === item.id ? 'menu-item-active' : ''}`}
              style={{
                ...styles.menuItem,
                ...(activePage === item.id ? styles.menuItemActive : {})
              }}
              onClick={() => navigate(item.path)}
              title={sidebarCollapsed ? item.label : ''}
            >
              <FontAwesomeIcon icon={item.icon} style={styles.menuIcon} />
              <span style={styles.menuLabel}>{item.label}</span>
              {item.badge && <div style={styles.badge}>{item.badge}</div>}
              {sidebarCollapsed && (
                <div className="menu-tooltip" style={styles.tooltip}>
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          {/* Search Bar with Button */}
          <div style={styles.searchContainer} className="search-container">
            <FontAwesomeIcon icon={Icons.faSearch} style={styles.searchIcon} />
            
            <input
              type="text"
              placeholder="Search hospitals, users, reports..."
              style={styles.searchBar}
              className="search-bar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
            />
            
            {searchTerm && (
              <button
                className="clear-button"
                style={styles.clearButton}
                onClick={clearSearch}
                title="Clear search"
              >
                <FontAwesomeIcon icon={Icons.faTimes} />
              </button>
            )}
            
            <button
              className="search-button"
              style={styles.searchButton}
              onClick={handleSearch}
              title="Search"
            >
              <FontAwesomeIcon icon={Icons.faSearch} style={{ fontSize: '12px' }} />
              Search
            </button>
          </div>
          
          <div style={styles.headerActions}>
            <button 
              className="action-btn"
              style={styles.actionBtn}
              onClick={() => navigate('/admin/notifications')}
              title="Notifications"
            >
              <FontAwesomeIcon icon={Icons.faBell} />
              {notifications > 0 && (
                <span style={styles.notificationBadge}>{notifications}</span>
              )}
            </button>
            
            <button 
              className="action-btn"
              style={styles.actionBtn}
              onClick={toggleTheme}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <FontAwesomeIcon icon={darkMode ? Icons.faSun : Icons.faMoon} />
            </button>
            
            <button 
              className="action-btn"
              style={{...styles.actionBtn, color: '#ef4444'}}
              onClick={handleLogout}
              title="Logout"
            >
              <FontAwesomeIcon icon={Icons.faSignOutAlt} />
            </button>
            
            <div 
              className="user-info"
              style={styles.userInfo}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div style={styles.userAvatar}>
                {adminInitial}
              </div>
              {!sidebarCollapsed && (
                <div style={styles.userDetails}>
                  <div style={styles.userName}>{adminName}</div>
                  <div style={styles.userRole}>System Admin</div>
                </div>
              )}
              <FontAwesomeIcon 
                icon={showDropdown ? Icons.faChevronUp : Icons.faChevronDown} 
                style={{ fontSize: '14px', color: darkMode ? '#94a3b8' : '#64748b' }}
              />
              
              {showDropdown && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownHeader}>
                    <div style={{ fontWeight: '600', color: darkMode ? '#ffffff' : '#0f172a' }}>
                      {adminName}
                    </div>
                    <div style={{ fontSize: '12px', color: darkMode ? '#94a3b8' : '#64748b' }}>
                      {adminEmail}
                    </div>
                  </div>
                  
                  <div 
                    className="dropdown-item"
                    style={styles.dropdownItem}
                    onClick={() => {
                      navigate('/admin/profile');
                      setShowDropdown(false);
                    }}
                  >
                    <FontAwesomeIcon icon={Icons.faUser} />
                    <span>My Profile</span>
                  </div>
                  
                  <div 
                    className="dropdown-item"
                    style={styles.dropdownItem}
                    onClick={() => {
                      navigate('/admin/settings');
                      setShowDropdown(false);
                    }}
                  >
                    <FontAwesomeIcon icon={Icons.faCog} />
                    <span>Settings</span>
                  </div>
                  
                  <div style={{ borderTop: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`, margin: '8px 0' }} />
                  
                  <div 
                    className="dropdown-item"
                    style={{ ...styles.dropdownItem, color: '#ef4444' }}
                    onClick={handleLogout}
                  >
                    <FontAwesomeIcon icon={Icons.faSignOutAlt} />
                    <span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content with Scrollbar */}
        <div style={styles.content} className="content-scrollable">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;