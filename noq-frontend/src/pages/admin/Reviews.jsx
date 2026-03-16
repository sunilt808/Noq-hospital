// pages/admin/Reviews.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import reviewService from '../../services/reviewService';

const Reviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      setIsLoading(true);
      try {
        const list = await reviewService.getPublicReviews();
        setReviews(list);
      } catch (_) {
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const stats = {
    total: reviews.length,
    average: reviews.length ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1) : '0.0',
    fiveStar: reviews.filter(r => r.rating === 5).length,
    oneStar: reviews.filter(r => r.rating === 1).length
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.hospital.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         review.comment.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === '5star' && review.rating === 5) ||
                         (filter === '4star' && review.rating === 4) ||
                         (filter === '3star' && review.rating === 3) ||
                         (filter === 'low' && review.rating <= 2);
    return matchesSearch && matchesFilter;
  });

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
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    },
    statCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      textAlign: 'center'
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: '5px'
    },
    statLabel: {
      fontSize: '14px',
      color: '#64748b'
    },
    searchBar: {
      padding: '12px 15px',
      border: '2px solid #e2e8f0',
      borderRadius: '10px',
      background: 'white',
      width: '300px',
      fontSize: '14px',
      marginBottom: '20px'
    },
    filterTabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
      flexWrap: 'wrap'
    },
    filterTab: {
      padding: '8px 16px',
      borderRadius: '8px',
      background: '#f1f5f9',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#64748b',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    filterTabActive: {
      background: '#4f46e5',
      color: 'white'
    },
    reviewsList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    reviewCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      border: '1px solid #e2e8f0'
    },
    reviewHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '10px'
    },
    patientInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    patientAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold'
    },
    patientName: {
      fontWeight: '600',
      color: '#0f172a'
    },
    patientHospital: {
      fontSize: '12px',
      color: '#64748b'
    },
    stars: {
      display: 'flex',
      gap: '5px'
    },
    star: {
      color: '#f59e0b'
    },
    reviewComment: {
      color: '#475569',
      lineHeight: '1.6',
      marginBottom: '10px'
    },
    reviewDate: {
      fontSize: '12px',
      color: '#94a3b8'
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Patient Reviews</h1>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Reviews</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.average}/5.0</div>
          <div style={styles.statLabel}>Average Rating</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.fiveStar}</div>
          <div style={styles.statLabel}>5-Star Reviews</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.oneStar}</div>
          <div style={styles.statLabel}>1-Star Reviews</div>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search reviews..."
        style={styles.searchBar}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div style={styles.filterTabs}>
        {[
          { id: 'all', label: 'All Reviews', icon: Icons.faStar },
          { id: '5star', label: '5 Stars', icon: Icons.faStar },
          { id: '4star', label: '4 Stars', icon: Icons.faStar },
          { id: '3star', label: '3 Stars', icon: Icons.faStar },
          { id: 'low', label: 'Low Ratings', icon: Icons.faExclamationTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              ...styles.filterTab,
              ...(filter === tab.id ? styles.filterTabActive : {})
            }}
            onClick={() => setFilter(tab.id)}
          >
            <FontAwesomeIcon icon={tab.icon} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div style={styles.reviewsList}>
        {isLoading && (
          <div style={{ padding: '8px 4px', color: '#64748b' }}>Loading reviews...</div>
        )}
        {filteredReviews.map(review => (
          <div key={review.id} style={styles.reviewCard}>
            <div style={styles.reviewHeader}>
              <div style={styles.patientInfo}>
                <div style={styles.patientAvatar}>
                  {String(review.patient || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={styles.patientName}>{review.patient}</div>
                  <div style={styles.patientHospital}>{review.hospital} • {review.doctor}</div>
                  <div style={{ fontSize: '12px', color: '#475569', marginTop: 2 }}>
                    Doctor {review.doctorRating}/5 • Hospital {review.hospitalRating}/5
                  </div>
                </div>
              </div>
              <div style={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <FontAwesomeIcon
                    key={i}
                    icon={i < review.rating ? Icons.faStar : Icons.faStar}
                    style={{
                      ...styles.star,
                      color: i < review.rating ? '#f59e0b' : '#e2e8f0'
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={styles.reviewComment}>{review.comment}</div>
            <div style={styles.reviewDate}>{new Date(review.date).toLocaleString()}</div>
          </div>
        ))}
        {filteredReviews.length === 0 && (
          <div style={{ padding: '18px 6px', color: '#64748b' }}>No reviews found for this filter.</div>
        )}
      </div>
    </div>
  );
};
export default Reviews;