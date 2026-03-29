import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faComments, faHospital, faSearch, faStar, faUserMd } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import apiDbService from '../../../services/apiDbService';

const Feedback = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [hospitalRows, reviewRows] = await Promise.all([
          apiDbService.getCollection('hospitals'),
          apiDbService.getCollection('reviews'),
        ]);
        if (!active) return;
        setHospitals(Array.isArray(hospitalRows) ? hospitalRows : []);
        setAllReviews(Array.isArray(reviewRows) ? reviewRows : []);
      } catch {
        if (!active) return;
        setHospitals([]);
        setAllReviews([]);
      }
    };

    loadData();
    window.addEventListener('focus', loadData);
    return () => {
      active = false;
      window.removeEventListener('focus', loadData);
    };
  }, []);

  const { reviews, hospitalName } = useMemo(() => {
    const matchedHospital =
      hospitals.find((item) => String(item.HID || item.id || '') === String(currentUser?.hospitalId || currentUser?.HID || currentUser?.id || '')) ||
      hospitals.find((item) => item.email?.toLowerCase() === currentUser?.email?.toLowerCase()) ||
      null;

    const hid = String(matchedHospital?.HID || matchedHospital?.id || currentUser?.hospitalId || currentUser?.HID || '');
    const hname = matchedHospital?.hospitalName || matchedHospital?.name || currentUser?.hospitalName || 'Hospital';

    const scoped = allReviews
      .filter((item) => String(item.hospitalId || '') === hid || String(item.hospital || '').toLowerCase() === hname.toLowerCase())
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return { reviews: scoped, hospitalName: hname };
  }, [allReviews, currentUser, hospitals]);

  const filtered = reviews.filter((item) => {
    const text = `${item.patient || ''} ${item.comment || ''} ${item.doctor || ''}`.toLowerCase();
    const passSearch = !search || text.includes(search.toLowerCase());
    const rating = Number(item.rating || 0);
    const passRating = ratingFilter === 'all' || (ratingFilter === 'high' && rating >= 4) || (ratingFilter === 'low' && rating <= 2);
    return passSearch && passRating;
  });

  const stats = {
    total: reviews.length,
    avgDoctor: reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.doctorRating || item.rating || 0), 0) / reviews.length).toFixed(1) : '0.0',
    avgHospital: reviews.length ? (reviews.reduce((sum, item) => sum + Number(item.hospitalRating || item.rating || 0), 0) / reviews.length).toFixed(1) : '0.0',
  };

  const renderStars = (value) => (
    <span>
      {[1, 2, 3, 4, 5].map((n) => (
        <FontAwesomeIcon key={n} icon={faStar} style={{ color: n <= Number(value || 0) ? '#f59e0b' : '#e2e8f0', marginRight: 2 }} />
      ))}
    </span>
  );

  const styles = {
    container: { padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: 12 },
    backBtn: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
    title: { margin: 0, color: '#0f172a' },
    subtitle: { margin: '4px 0 0', color: '#64748b' },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 12 },
    statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
    filters: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap' },
    input: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', minWidth: 250 },
    select: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' },
    listCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/hm/management')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}><FontAwesomeIcon icon={faComments} /> Feedback</h2>
          <p style={styles.subtitle}>{hospitalName} • visited patient reviews</p>
        </div>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCard}><strong>{stats.total}</strong><div>Total Reviews</div></div>
        <div style={styles.statCard}><strong>{stats.avgDoctor}</strong><div>Avg Doctor Rating</div></div>
        <div style={styles.statCard}><strong>{stats.avgHospital}</strong><div>Avg Hospital Rating</div></div>
      </div>

      <div style={styles.filters}>
        <div style={{ position: 'relative' }}>
          <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
          <input style={{ ...styles.input, paddingLeft: 30 }} placeholder="Search patient/doctor/comment" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select style={styles.select} value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
          <option value="all">All ratings</option>
          <option value="high">High (4-5)</option>
          <option value="low">Low (1-2)</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: '#64748b' }}>No feedback found.</div>
      ) : (
        filtered.map((item) => (
          <div key={item.id} style={styles.listCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong>{item.patient || 'Patient'}</strong>
              <span style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(item.date || Date.now()).toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 6, color: '#334155' }}><FontAwesomeIcon icon={faUserMd} /> {item.doctor || 'Doctor'}</div>
            <div style={{ marginTop: 6, color: '#334155' }}><FontAwesomeIcon icon={faHospital} /> Doctor: {renderStars(item.doctorRating || item.rating)} • Hospital: {renderStars(item.hospitalRating || item.rating)}</div>
            <div style={{ marginTop: 8, color: '#475569' }}>{item.comment}</div>
          </div>
        ))
      )}
    </div>
  );
};

export default Feedback;
