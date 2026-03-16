// pages/admin/Dashboard.jsx - SIMPLIFIED VERSION
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import notificationService from '../../services/notificationService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    hospitals: [],
    hmUsers: [],
    bills: [],
    reviews: [],
    notifications: [],
  });

  useEffect(() => {
    let active = true;

    const loadDashboardData = async () => {
      try {
        const [hospitals, users, bills, reviews] = await Promise.all([
          firebaseDbService.getCollection('hospitals'),
          firebaseDbService.getCollection('users'),
          firebaseDbService.getCollection('bills'),
          firebaseDbService.getCollection('reviews'),
        ]);

        if (!active) return;

        setDashboardData({
          hospitals: Array.isArray(hospitals) ? hospitals : [],
          hmUsers: (Array.isArray(users) ? users : []).filter((item) => String(item.role || '').toLowerCase() === 'hm'),
          bills: Array.isArray(bills) ? bills : [],
          reviews: Array.isArray(reviews) ? reviews : [],
          notifications: notificationService.getAll(),
        });
      } catch {
        if (!active) return;
        setDashboardData({ hospitals: [], hmUsers: [], bills: [], reviews: [], notifications: [] });
      }
    };

    loadDashboardData();
    window.addEventListener('focus', loadDashboardData);
    return () => {
      active = false;
      window.removeEventListener('focus', loadDashboardData);
    };
  }, []);

  const stats = useMemo(() => {
    const { hospitals, hmUsers, bills, reviews, notifications } = dashboardData;

    const pendingApprovals = hmUsers.filter((hm) => {
      const status = String(hm.status || '').toLowerCase();
      return status.includes('pending');
    }).length;

    const paidRevenue = bills
      .filter((bill) => String(bill.status || '').toLowerCase() === 'paid')
      .reduce((sum, bill) => sum + Number(bill.amount || bill.total || 0), 0);

    const avgRating = reviews.length
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
      : 0;

    const unreadNotifications = notifications.filter((notification) => !notification.read).length;

    return {
      hospitalManagers: hmUsers.length,
      totalHospitals: hospitals.length,
      pendingApprovals,
      paidRevenue,
      avgRating,
      unreadNotifications,
    };
  }, [dashboardData]);

  const cards = [
    {
      id: 1,
      title: 'Hospital Managers',
      value: String(stats.hospitalManagers),
      icon: Icons.faUserTie,
      color: '#3b82f6',
      action: () => navigate('/admin/hm-approvals')
    },
    {
      id: 2,
      title: 'Total Hospitals',
      value: String(stats.totalHospitals),
      icon: Icons.faHospital,
      color: '#06b6d4',
      action: () => navigate('/admin/hospitals')
    },
    {
      id: 3,
      title: 'Pending Approvals',
      value: String(stats.pendingApprovals),
      icon: Icons.faClock,
      color: '#f59e0b',
      action: () => navigate('/admin/hm-approvals')
    },
    {
      id: 4,
      title: 'Revenue',
      value: `₹${stats.paidRevenue.toLocaleString()}`,
      icon: Icons.faChartLine,
      color: '#10b981',
      action: () => navigate('/admin/revenue')
    },
    {
      id: 5,
      title: 'Avg Rating',
      value: `${stats.avgRating.toFixed(1)}/5`,
      icon: Icons.faStar,
      color: '#8b5cf6',
      action: () => navigate('/admin/reviews')
    },
    {
      id: 6,
      title: 'Notifications',
      value: String(stats.unreadNotifications),
      icon: Icons.faBell,
      color: '#ef4444',
      action: () => navigate('/admin/notifications')
    }
  ];

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{getGreeting()}, Admin</h1>
          <p style={styles.subtitle}>Dashboard Overview</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.grid}>
        {cards.map(card => (
          <div
            key={card.id}
            style={{
              ...styles.card,
              borderLeft: `4px solid ${card.color}`,
              transform: hoveredCard === card.id ? 'translateY(-4px)' : 'none'
            }}
            onClick={card.action}
            onMouseEnter={() => setHoveredCard(card.id)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={styles.cardContent}>
              <div>
                <div style={styles.cardTitle}>{card.title}</div>
                <div style={styles.cardValue}>{card.value}</div>
                  <div style={styles.cardChange}>Live data</div>
              </div>
              <div style={{ ...styles.cardIcon, background: card.color }}>
                <FontAwesomeIcon icon={card.icon} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Quick Actions</h2>
        <div style={styles.actionsGrid}>
          <button 
            style={styles.actionBtn}
            onClick={() => navigate('/admin/hm-approvals')}
          >
            <FontAwesomeIcon icon={Icons.faUserCheck} />
            <span>Review Approvals</span>
          </button>
          <button 
            style={styles.actionBtn}
            onClick={() => navigate('/admin/hospitals')}
          >
            <FontAwesomeIcon icon={Icons.faHospital} />
            <span>Manage Hospitals</span>
          </button>
          <button 
            style={styles.actionBtn}
            onClick={() => navigate('/admin/revenue')}
          >
            <FontAwesomeIcon icon={Icons.faChartBar} />
            <span>View Analytics</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Inline styles - clean and simple
const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '5px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '1px solid #e2e8f0'
  },
  cardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  cardTitle: {
    fontSize: '14px',
    color: '#64748b',
    fontWeight: '600',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '5px'
  },
  cardChange: {
    fontSize: '12px',
    color: '#10b981',
    display: 'flex',
    alignItems: 'center'
  },
  cardIcon: {
    width: '50px',
    height: '50px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '22px'
  },
  section: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '20px'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px'
  },
  actionBtn: {
    padding: '15px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  }
};

// Add hover effects with CSS
const hoverStyles = `
  .dashboard-card:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    border-color: #3b82f6;
  }
  
  .action-btn:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
  }
  
  .action-btn svg {
    color: #3b82f6;
  }
  
  .action-btn span {
    font-size: 14px;
    font-weight: 600;
    color: #475569;
  }
`;

// Add hover styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = hoverStyles;
  document.head.appendChild(style);
}

export default Dashboard;