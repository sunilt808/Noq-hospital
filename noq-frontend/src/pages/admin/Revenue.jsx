// pages/admin/Revenue.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import apiDbService from '../../services/apiDbService';

const Revenue = () => {
  const [timeRange, setTimeRange] = useState('monthly');
  const [bills, setBills] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let active = true;

    const loadRevenueData = async () => {
      try {
        const [billRows, reviewRows] = await Promise.all([
          apiDbService.getCollection('bills'),
          apiDbService.getCollection('reviews'),
        ]);

        if (!active) return;
        setBills(Array.isArray(billRows) ? billRows : []);
        setReviews(Array.isArray(reviewRows) ? reviewRows : []);
      } catch (error) {
        if (!active) return;
        setBills([]);
        setReviews([]);
      }
    };

    loadRevenueData();

    const refresh = () => loadRevenueData();
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const { revenueData, hospitalPerformance, distribution } = useMemo(() => {
    const paidBills = bills.filter((bill) => String(bill.status || '').toLowerCase() === 'paid');

    let totalDoctorShare = 0;
    let totalHmShare = 0;
    let totalAdminShare = 0;

    const monthMap = new Map();
    const yearMap = new Map();
    const hospitalMap = new Map();

    paidBills.forEach((bill) => {
      const amount = Number(bill.total || bill.amount || 0);
      const when = new Date(bill.paidDate || bill.date || bill.createdAt || Date.now());
      const hospitalName = bill.hospital || bill.hospitalName || 'Unknown Hospital';
      const hospitalId = String(bill.hospitalId || bill.HID || hospitalName);
      const patientId = String(bill.patientId || '');

      totalDoctorShare += amount * 0.15;
      totalHmShare += amount * 0.80;
      totalAdminShare += amount * 0.05;

      const monthKey = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);

      const yearKey = String(when.getFullYear());
      yearMap.set(yearKey, (yearMap.get(yearKey) || 0) + amount);

      if (!hospitalMap.has(hospitalId)) {
        hospitalMap.set(hospitalId, {
          id: hospitalId,
          name: hospitalName,
          revenue: 0,
          patientIds: new Set(),
        });
      }
      const item = hospitalMap.get(hospitalId);
      item.revenue += amount;
      if (patientId) item.patientIds.add(patientId);
    });

    const sortedMonthKeys = [...monthMap.keys()].sort();
    const monthly = sortedMonthKeys.map((key, index) => {
      const revenue = monthMap.get(key) || 0;
      const [year, month] = key.split('-');
      const monthLabel = new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
      const prev = index > 0 ? monthMap.get(sortedMonthKeys[index - 1]) || 0 : 0;
      const growth = prev > 0 ? ((revenue - prev) / prev) * 100 : 0;
      return { month: monthLabel, revenue, growth: Number(growth.toFixed(1)) };
    });

    const yearly = [...yearMap.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([year, revenue]) => ({ year, revenue }));

    const hospitalPerformance = [...hospitalMap.values()]
      .map((item) => {
        const linkedReviews = reviews.filter((review) => {
          const rid = String(review.hospitalId || review.HID || '');
          const rname = String(review.hospital || '').trim().toLowerCase();
          return rid === item.id || (rname && rname === item.name.trim().toLowerCase());
        });
        const rating = linkedReviews.length
          ? linkedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / linkedReviews.length
          : 0;

        return {
          name: item.name,
          revenue: item.revenue,
          patients: item.patientIds.size,
          rating: Number(rating.toFixed(1)),
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    return {
      revenueData: { monthly, yearly },
      hospitalPerformance,
      distribution: {
        totalCollected: totalDoctorShare + totalHmShare + totalAdminShare,
        doctorShare: totalDoctorShare,
        hmShare: totalHmShare,
        adminShare: totalAdminShare
      }
    };
  }, [bills, reviews]);

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#0f172a'
    },
    filterTabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    },
    filterTab: {
      padding: '8px 16px',
      borderRadius: '8px',
      background: '#f1f5f9',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#64748b',
      transition: 'all 0.3s ease'
    },
    filterTabActive: {
      background: '#4f46e5',
      color: 'white'
    },
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
      gap: '30px',
      marginBottom: '40px'
    },
    chartCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '25px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    },
    chartTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: '20px'
    },
    barChart: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: '15px',
      height: '200px',
      marginTop: '30px'
    },
    barContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1
    },
    bar: {
      width: '40px',
      borderRadius: '8px 8px 0 0',
      transition: 'all 0.3s ease'
    },
    barLabel: {
      marginTop: '10px',
      fontSize: '12px',
      color: '#64748b'
    },
    performanceTable: {
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    },
    tableHeader: {
      background: '#f8fafc',
      padding: '15px 20px',
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr',
      gap: '15px',
      fontWeight: '600',
      color: '#64748b',
      fontSize: '14px'
    },
    tableRow: {
      padding: '15px 20px',
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr',
      gap: '15px',
      alignItems: 'center',
      borderBottom: '1px solid #e2e8f0'
    }
  };

  const maxRevenue = Math.max(1, ...revenueData[timeRange].map((item) => item.revenue || 0));

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Revenue Analytics</h1>
      </div>
      <div style={styles.filterTabs}>
        {['monthly', 'yearly'].map(range => (
          <button
            key={range}
            style={{
              ...styles.filterTab,
              ...(timeRange === range ? styles.filterTabActive : {})
            }}
            onClick={() => setTimeRange(range)}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Distribution Summary */}
      <div style={{ ...styles.grid, marginBottom: '30px' }}>
        <div style={{ ...styles.card, borderLeft: '4px solid #4f46e5' }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faWallet} style={{ color: '#4f46e5' }} />
              <span>Patient Payments</span>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
            ₹{Number(distribution?.totalCollected || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Total amount paid by patients</div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #10b981' }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faStethoscope} style={{ color: '#10b981' }} />
              <span>Doctor Earnings (70%)</span>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
            ₹{Number(distribution?.doctorShare || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Total share for consulting doctors</div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #f59e0b' }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faHospital} style={{ color: '#f59e0b' }} />
              <span>Hospital Revenue (20%)</span>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
            ₹{Number(distribution?.hmShare || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Total share for hospitals/clinics</div>
        </div>

        <div style={{ ...styles.card, borderLeft: '4px solid #ef4444' }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faCogs} style={{ color: '#ef4444' }} />
              <span>Admin Fee (10%)</span>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
            ₹{Number(distribution?.adminShare || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '5px' }}>Platform maintenance charge</div>
        </div>
      </div>

      <div style={styles.chartsGrid}>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Revenue Growth</div>
          <div style={styles.barChart}>
            {revenueData[timeRange].map((data, index) => {
              const height = ((data.revenue || 0) / maxRevenue) * 150;
              return (
                <div key={index} style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      height: `${height}px`,
                      background: `linear-gradient(to top, #4f46e5, #7c3aed)`
                    }}
                  />
                  <div style={styles.barLabel}>
                    {data.month || data.year}
                  </div>
                  {'growth' in data && (
                    <div style={{ fontSize: '12px', color: data.growth >= 0 ? '#10b981' : '#ef4444', marginTop: '5px' }}>
                      {data.growth >= 0 ? '+' : ''}{data.growth}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Hospital Performance</div>
          <div style={styles.performanceTable}>
            <div style={styles.tableHeader}>
              <div>Hospital Name</div>
              <div>Revenue</div>
              <div>Patients</div>
              <div>Rating</div>
            </div>
            {hospitalPerformance.map((hospital, index) => (
              <div key={index} style={styles.tableRow}>
                <div style={{ fontWeight: '600', color: '#0f172a' }}>{hospital.name}</div>
                <div>₹{Number(hospital.revenue || 0).toLocaleString()}</div>
                <div>{hospital.patients.toLocaleString()}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {[...Array(5)].map((_, i) => (
                      <FontAwesomeIcon
                        key={i}
                        icon={i < Math.floor(hospital.rating || 0) ? Icons.faStar : Icons.faStarHalfAlt}
                        style={{ color: '#f59e0b', fontSize: '14px' }}
                      />
                    ))}
                    <span style={{ marginLeft: '5px' }}>{hospital.rating || 0}</span>
                  </div>
                </div>
              </div>
            ))}
            {hospitalPerformance.length === 0 && (
              <div style={{ padding: '16px 20px', color: '#64748b' }}>No paid transactions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Revenue;