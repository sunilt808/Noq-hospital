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
import revenueService from '../../../services/revenueService';
import firebaseDbService from '../../../services/firebaseDbService';

const Revenue = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [bills, setBills] = useState([]);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [hospitalRows, billRows] = await Promise.all([
          firebaseDbService.getCollection('hospitals'),
          firebaseDbService.getCollection('bills'),
        ]);
        if (!active) return;
        setHospitals(Array.isArray(hospitalRows) ? hospitalRows : []);
        setBills(Array.isArray(billRows) ? billRows : []);
      } catch {
        if (!active) return;
        setHospitals([]);
        setBills([]);
      }
    };

    loadData();
    window.addEventListener('focus', loadData);
    return () => {
      active = false;
      window.removeEventListener('focus', loadData);
    };
  }, []);

  const data = useMemo(() => {
    const matchedHospital =
      hospitals.find((item) => String(item.HID || item.id || '') === String(currentUser?.hospitalId || currentUser?.HID || '')) ||
      hospitals.find((item) => item.email?.toLowerCase() === currentUser?.email?.toLowerCase()) ||
      hospitals.find((item) => item.hospitalName?.toLowerCase() === currentUser?.hospitalName?.toLowerCase()) ||
      null;

    const hospitalId = String(matchedHospital?.HID || matchedHospital?.id || currentUser?.hospitalId || currentUser?.HID || '');
    const hospitalName = matchedHospital?.hospitalName || matchedHospital?.hospital_name || matchedHospital?.name || currentUser?.hospitalName || '';

    // Use revenueService for consistent calculations
    const revenueData = revenueService.calculateHospitalRevenue(bills, hospitalId);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyData = revenueService.getMonthlyRevenue(bills, hospitalId);
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthRevenue = monthlyData[monthKey] || 0;

    const transactions = revenueData.transactions.map((bill) => ({
      id: bill.id,
      patient: bill.patient,
      doctor: bill.doctor,
      amount: bill.amount,
      time: new Date(bill.date || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: bill.status,
      category: bill.category,
    }));

    const departmentStats = Object.entries(revenueData.byCategory || {})
      .map(([name, data]) => ({
        name,
        revenue: data.amount,
        patients: Math.floor(data.count),
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      hospitalName,
      metrics: {
        monthRevenue,
        totalRevenue: revenueData.totalRevenue,
        avgTransaction: revenueData.avgTransaction,
        totalTransactions: revenueData.billsCount,
      },
      transactions,
      departmentStats,
    };
  }, [bills, currentUser, hospitals]);

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





