import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBill,
  faArrowLeft,
  faCalendarAlt,
  faRupeeSign,
  faExchangeAlt,
  faBuilding,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

const Revenue = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const hospitalId = currentUser?.hospitalId || currentUser?.HID || '';
        
        // Call backend API for hospital-specific revenue data
        const [dashboardRes, appointmentsRes] = await Promise.all([
          hospitalId ? api.get(`/revenue/dashboard?hospital_id=${hospitalId}`).catch(() => null) : Promise.resolve(null),
          hospitalId ? api.get(`/appointments?hospital_id=${hospitalId}`).catch(() => null) : Promise.resolve(null),
        ]);

        if (!active) return;
        
        setDashboard(dashboardRes?.data || dashboardRes || null);
        
        // Get completed appointments for transactions
        const appts = Array.isArray(appointmentsRes?.data) ? appointmentsRes.data : 
                     Array.isArray(appointmentsRes?.data?.appointments) ? appointmentsRes.data.appointments : [];
        
        const completed = (appts || [])
          .filter(a => a.status === 'completed')
          .slice(0, 10)
          .map(a => ({
            id: a._id || a.id,
            patient: a.patient_name || 'Unknown Patient',
            doctor: a.doctor_name || 'Unknown Doctor',
            amount: a.fee || 0,
            time: new Date(a.appointment_date).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: 'Completed',
            category: a.department || 'General',
          }));
        
        setTransactions(completed);
      } catch (err) {
        console.error('Failed to load revenue data:', err);
        if (!active) return;
        setDashboard(null);
        setTransactions([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    window.addEventListener('focus', loadData);
    return () => {
      active = false;
      window.removeEventListener('focus', loadData);
    };
  }, [currentUser]);

  const data = useMemo(() => {
    const hospitalName = currentUser?.hospitalName || 'Hospital';
    
    const metrics = {
      monthRevenue: dashboard?.completed_revenue || 0,
      totalRevenue: dashboard?.completed_revenue || 0,
      avgTransaction: transactions.length > 0 
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length 
        : 0,
      totalTransactions: dashboard?.completed_appointments || 0,
    };

    // Group transactions by department for department stats
    const deptMap = {};
    transactions.forEach(t => {
      if (!deptMap[t.category]) {
        deptMap[t.category] = { revenue: 0, count: 0 };
      }
      deptMap[t.category].revenue += t.amount;
      deptMap[t.category].count += 1;
    });

    const departmentStats = Object.entries(deptMap)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        patients: data.count,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      hospitalName,
      metrics,
      transactions,
      departmentStats,
    };
  }, [dashboard, transactions, currentUser]);

  const styles = {
    container: { padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' },
    backButton: {
      padding: '0.7rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
      background: '#e2e8f0', color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.45rem'
    },
    title: { margin: 0, color: '#1e293b' },
    subtitle: { margin: '0.3rem 0 0', color: '#64748b', fontSize: '0.9rem' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' },
    statCard: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem' },
    statHeader: { color: '#64748b', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' },
    statValue: { color: '#0f172a', fontSize: '1.6rem', fontWeight: 700 },
    contentGrid: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' },
    section: { background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1rem' },
    sectionTitle: { margin: '0 0 0.85rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' },
    transactionCard: { padding: '0.75rem 0', borderBottom: '1px solid #f1f5f9' },
    transactionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' },
    transactionMeta: { color: '#64748b', fontSize: '0.82rem', marginTop: '0.25rem' },
    status: { fontSize: '0.72rem', borderRadius: '999px', padding: '0.2rem 0.55rem', background: '#dcfce7', color: '#166534', fontWeight: 600 },
    deptCard: { border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', marginBottom: '0.6rem', background: '#f8fafc' },
    deptName: { fontWeight: 600, color: '#1e293b', marginBottom: '0.3rem' },
    deptStats: { display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.82rem' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/hm/management')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={styles.title}>Revenue Management</h1>
          <p style={styles.subtitle}>{data.hospitalName || 'Hospital'} • Dynamic revenue data</p>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statHeader}><FontAwesomeIcon icon={faCalendarAlt} /> THIS MONTH</div>
          <div style={styles.statValue}>₹{Math.round(data.metrics.monthRevenue).toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statHeader}><FontAwesomeIcon icon={faMoneyBill} /> TOTAL REVENUE</div>
          <div style={styles.statValue}>₹{Math.round(data.metrics.totalRevenue).toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statHeader}><FontAwesomeIcon icon={faExchangeAlt} /> TRANSACTIONS</div>
          <div style={styles.statValue}>{data.metrics.totalTransactions.toLocaleString()}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statHeader}><FontAwesomeIcon icon={faRupeeSign} /> AVG TRANSACTION</div>
          <div style={styles.statValue}>₹{Math.round(data.metrics.avgTransaction).toLocaleString()}</div>
        </div>
      </div>

      <div style={styles.contentGrid}>
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faClock} /> Recent Transactions</h3>
          {data.transactions.length === 0 ? (
            <p style={{ color: '#64748b' }}>No paid transactions yet.</p>
          ) : (
            data.transactions.map((item) => (
              <div key={item.id} style={styles.transactionCard}>
                <div style={styles.transactionRow}>
                  <strong style={{ color: '#1e293b' }}>{item.patient}</strong>
                  <strong style={{ color: '#166534' }}>₹{item.amount.toLocaleString()}</strong>
                </div>
                <div style={styles.transactionRow}>
                  <span style={styles.transactionMeta}>{item.doctor} • {item.category} • {item.time}</span>
                  <span style={styles.status}>{item.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}><FontAwesomeIcon icon={faBuilding} /> Revenue by Department</h3>
          {data.departmentStats.length === 0 ? (
            <p style={{ color: '#64748b' }}>No department revenue data yet.</p>
          ) : (
            data.departmentStats.map((item) => (
              <div key={item.name} style={styles.deptCard}>
                <div style={styles.deptName}>{item.name}</div>
                <div style={styles.deptStats}>
                  <span>₹{Math.round(item.revenue).toLocaleString()}</span>
                  <span>{item.patients} patients</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Revenue;





