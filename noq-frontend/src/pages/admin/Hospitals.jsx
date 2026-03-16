// pages/admin/Hospitals.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import { recordHistory } from '../../services/historyService';
import api from '../../services/api';
import firebaseDbService from '../../services/firebaseDbService';

const Hospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredHospital, setHoveredHospital] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchHospitals = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await api.get('/hospitals');
        const apiHospitals = res?.data?.hospitals || [];
        setHospitals(apiHospitals);
      } catch (err) {
        setHospitals([]);
        setError(err?.message || 'Unable to load hospitals.');
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();

    const refresh = () => fetchHospitals();
    window.addEventListener('focus', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const getHospitalId = (hospital) => String(
    hospital?.id || hospital?.HID || hospital?.hospitalId || hospital?.hospital_id || ''
  );

  const updateHospital = (hospitalId, updater) => {
    setHospitals((prev) => prev.map((hospital) => {
      const currentId = getHospitalId(hospital);
      if (currentId !== String(hospitalId)) return hospital;
      return updater(hospital);
    }));
  };

  const toggleStatus = async (hospital) => {
    const status = String(hospital.status || '').toLowerCase();
    const nextStatus = status === 'suspended' ? 'approved' : 'suspended';

    try {
      const hospitalId = getHospitalId(hospital);
      const payloadStatus = nextStatus === 'suspended' ? 'SUSPENDED' : 'APPROVED';
      const res = await api.patch(`/hospitals/${hospitalId}/status`, { status: payloadStatus, message: '' });
      const updatedFromApi = res?.data || {};
      updateHospital(hospitalId, (item) => ({ ...item, ...updatedFromApi }));
      await firebaseDbService.upsert('hospitals', hospitalId, {
        ...hospital,
        ...updatedFromApi,
        status: updatedFromApi.status || payloadStatus.toLowerCase(),
      });
    } catch (err) {
      setError(err?.message || 'Unable to update hospital status.');
      return;
    }

    recordHistory({
      module: 'admin-hospital-access',
      action: 'hospital-status-updated',
      message: `${hospital.hospitalName || hospital.name || 'Hospital'} set to ${nextStatus}`,
      hospitalId: getHospitalId(hospital),
      meta: { status: nextStatus },
    });
  };

  const toggleAccess = async (hospital, key) => {
    const currentValue = hospital?.accessConfig?.[key] !== false;
    const nextValue = !currentValue;
    const updatedHospital = {
      ...hospital,
      accessConfig: {
        allowAdvancedBooking: hospital?.accessConfig?.allowAdvancedBooking !== false,
        allowDoctorPortal: hospital?.accessConfig?.allowDoctorPortal !== false,
        allowHmPortal: hospital?.accessConfig?.allowHmPortal !== false,
        [key]: nextValue,
      },
    };

    updateHospital(getHospitalId(hospital), (item) => ({
      ...updatedHospital,
    }));

    await firebaseDbService.upsert('hospitals', getHospitalId(hospital), updatedHospital);

    recordHistory({
      module: 'admin-hospital-access',
      action: 'hospital-access-updated',
      message: `${key} ${nextValue ? 'enabled' : 'disabled'} for ${hospital.hospitalName || hospital.name || 'Hospital'}`,
      hospitalId: getHospitalId(hospital),
      meta: { accessKey: key, enabled: nextValue },
    });
  };

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((hospital) => {
      const text = `${hospital.hospital_name || hospital.hospitalName || hospital.name || ''} ${hospital.address || ''} ${hospital.hm_name || hospital.hmName || ''}`.toLowerCase();
      return text.includes(searchTerm.toLowerCase());
    });
  }, [hospitals, searchTerm]);

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
    search: {
      padding: '10px 12px',
      borderRadius: '10px',
      border: '1px solid #cbd5e1',
      minWidth: '280px',
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
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
    },
    statTitle: {
      fontSize: '14px',
      color: '#64748b',
      marginBottom: '10px'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#0f172a'
    },
    hospitalGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px'
    },
    hospitalCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      border: '1px solid #e2e8f0'
    },
    hospitalCardHover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
    },
    hospitalName: {
      fontSize: '18px',
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: '10px'
    },
    hospitalDetail: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '8px',
      color: '#64748b',
      fontSize: '14px'
    },
    typeBadge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600'
    },
    controls: {
      marginTop: '14px',
      paddingTop: '12px',
      borderTop: '1px dashed #e2e8f0',
      display: 'grid',
      gap: '8px',
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
    },
    actionBtn: {
      border: 'none',
      borderRadius: '8px',
      padding: '7px 11px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: 600,
    }
  };

  const stats = {
    total: filteredHospitals.length,
    totalBeds: filteredHospitals.reduce((sum, h) => sum + Number(h.totalBeds || h.beds || 0), 0),
    approved: filteredHospitals.filter(h => String(h.status || '').toLowerCase().includes('approve')).length,
    pending: filteredHospitals.filter(h => String(h.status || '').toLowerCase().includes('pending')).length,
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Hospitals Management</h1>
        <input
          type="text"
          placeholder="Search hospitals..."
          style={styles.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Total Hospitals</div>
          <div style={styles.statValue}>{stats.total}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Total Beds</div>
          <div style={styles.statValue}>{stats.totalBeds}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Approved</div>
          <div style={styles.statValue}>{stats.approved}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statTitle}>Pending</div>
          <div style={styles.statValue}>{stats.pending}</div>
        </div>
      </div>

      {loading && <div style={{ color: '#64748b', marginBottom: 14 }}>Loading hospitals...</div>}
      {!loading && error && <div style={{ color: '#b91c1c', marginBottom: 14 }}>{error}</div>}

      <div style={styles.hospitalGrid}>
        {filteredHospitals.map((hospital, index) => {
          const hospitalId = getHospitalId(hospital);
          const cardId = hospitalId || index;
          const category = String(hospital.category || hospital.type || '').toLowerCase();
          const access = {
            allowAdvancedBooking: hospital?.accessConfig?.allowAdvancedBooking !== false,
            allowDoctorPortal: hospital?.accessConfig?.allowDoctorPortal !== false,
            allowHmPortal: hospital?.accessConfig?.allowHmPortal !== false,
          };
          const statusText = String(hospital.status || 'approved').toLowerCase();
          return (
            <div
              key={cardId}
              style={{
                ...styles.hospitalCard,
                ...(hoveredHospital === cardId ? styles.hospitalCardHover : {})
              }}
              onMouseEnter={() => setHoveredHospital(cardId)}
              onMouseLeave={() => setHoveredHospital(null)}
            >
              <div style={styles.hospitalName}>{hospital.hospital_name || hospital.hospitalName || hospital.name || 'N/A'}</div>
              <div style={{
                ...styles.typeBadge,
                background: category === 'government' ? '#dbeafe' : '#f0f9ff',
                color: category === 'government' ? '#1d4ed8' : '#0369a1'
              }}>
                {hospital.category || hospital.type || 'N/A'}
              </div>

              <div style={{ marginTop: '15px' }}>
                <div style={styles.hospitalDetail}>
                  <FontAwesomeIcon icon={Icons.faHashtag} />
                  <span>Hospital ID: {hospitalId || 'N/A'}</span>
                </div>
                <div style={styles.hospitalDetail}>
                  <FontAwesomeIcon icon={Icons.faBed} />
                  <span>{hospital.totalBeds || hospital.beds || 0} Beds</span>
                </div>
                <div style={styles.hospitalDetail}>
                  <FontAwesomeIcon icon={Icons.faMapMarkerAlt} />
                  <span>{hospital.address || 'Address not provided'}</span>
                </div>
                <div style={styles.hospitalDetail}>
                  <FontAwesomeIcon icon={Icons.faUserTie} />
                  <span>{hospital.hm_name || hospital.hmName || 'HM not assigned'}</span>
                </div>
                <div style={styles.hospitalDetail}>
                  <FontAwesomeIcon icon={Icons.faInfoCircle} />
                  <span>Status: {statusText}</span>
                </div>
              </div>

              <div style={styles.controls}>
                <div style={styles.row}>
                  <strong style={{ color: '#334155', fontSize: 13 }}>Access Controls</strong>
                  <button
                    type="button"
                    onClick={() => toggleStatus(hospital)}
                    style={{
                      ...styles.actionBtn,
                      background: statusText === 'suspended' ? '#dcfce7' : '#fee2e2',
                      color: statusText === 'suspended' ? '#166534' : '#991b1b',
                    }}
                  >
                    {statusText === 'suspended' ? 'Activate Hospital' : 'Suspend Hospital'}
                  </button>
                </div>

                <div style={styles.row}>
                  <span style={{ fontSize: 13, color: '#475569' }}>Advanced Booking</span>
                  <button
                    type="button"
                    onClick={() => toggleAccess(hospital, 'allowAdvancedBooking')}
                    style={{ ...styles.actionBtn, background: access.allowAdvancedBooking ? '#dcfce7' : '#e2e8f0', color: access.allowAdvancedBooking ? '#166534' : '#334155' }}
                  >
                    {access.allowAdvancedBooking ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div style={styles.row}>
                  <span style={{ fontSize: 13, color: '#475569' }}>Doctor Portal Access</span>
                  <button
                    type="button"
                    onClick={() => toggleAccess(hospital, 'allowDoctorPortal')}
                    style={{ ...styles.actionBtn, background: access.allowDoctorPortal ? '#dcfce7' : '#e2e8f0', color: access.allowDoctorPortal ? '#166534' : '#334155' }}
                  >
                    {access.allowDoctorPortal ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div style={styles.row}>
                  <span style={{ fontSize: 13, color: '#475569' }}>HM Portal Access</span>
                  <button
                    type="button"
                    onClick={() => toggleAccess(hospital, 'allowHmPortal')}
                    style={{ ...styles.actionBtn, background: access.allowHmPortal ? '#dcfce7' : '#e2e8f0', color: access.allowHmPortal ? '#166534' : '#334155' }}
                  >
                    {access.allowHmPortal ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredHospitals.length === 0 && (
          <div style={{ color: '#64748b' }}>No hospitals registered yet.</div>
        )}
      </div>
    </div>
  );
};

export default Hospitals;
