import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faSearch,
  faArrowLeft,
  faClock,
  faUserMd,
  faDoorOpen,
  faBuilding,
  faExclamationTriangle,
  faCheckCircle,
  faHourglassHalf
} from '@fortawesome/free-solid-svg-icons';
import { queueService, tokenService } from '../../../services/queueService';

const Queues = () => {
  const navigate = useNavigate();
  const [queues, setQueues] = useState([]);
  const [tokens, setTokens] = useState([]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);

  const normalizeQueue = (queue, queueTokens) => {
    const waitingTokens = queueTokens
      .filter((token) => (token.status || '').toLowerCase() === 'waiting')
      .sort((a, b) => (a.token_number || a.tokenNumber || 0) - (b.token_number || b.tokenNumber || 0));

    const callingToken = queueTokens.find((token) => {
      const s = (token.status || '').toLowerCase();
      return s === 'calling' || s === 'serving';
    });

    const currentTokenCode = queue.current_token || queue.currentToken || callingToken?.token_code || callingToken?.tokenCode || '-';
    const nextTokenCode = waitingTokens[0]?.token_code || waitingTokens[0]?.tokenCode || '-';

    return {
      id: queue.id,
      doctorName: queue.doctor_name || queue.doctorName || 'Doctor',
      department: queue.department || 'General',
      room: queue.room || '-',
      currentToken: currentTokenCode,
      nextToken: nextTokenCode,
      waiting: queue.waiting_count ?? queue.waiting ?? waitingTokens.length,
      avgTime: '10 mins',
      status: (queue.status || 'idle').toLowerCase(),
    };
  };

  const loadQueueData = async () => {
    try {
      const queueData = await queueService.fetchAll();
      const queueList = Array.isArray(queueData?.queues)
        ? queueData.queues
        : Array.isArray(queueData)
          ? queueData
          : [];

      const tokenBuckets = await Promise.all(
        queueList.map(async (queue) => {
          const tokenData = await tokenService.fetchByQueue(queue.id);
          const tokenList = Array.isArray(tokenData?.tokens)
            ? tokenData.tokens
            : Array.isArray(tokenData)
              ? tokenData
              : [];
          return {
            queueId: queue.id,
            tokens: tokenList,
          };
        })
      );

      const tokensFlat = tokenBuckets.flatMap((bucket) =>
        bucket.tokens.map((token) => {
          const queue = queueList.find((item) => String(item.id) === String(bucket.queueId));
          return {
            id: token.id,
            token: token.token_code || token.tokenCode || '-',
            patient: token.patient_name || token.patientName || 'Patient',
            doctor: queue?.doctor_name || queue?.doctorName || 'Doctor',
            status: (token.status || 'waiting').toLowerCase(),
            time: token.created_at
              ? new Date(token.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '-',
          };
        })
      );

      const normalizedQueues = queueList.map((queue) => {
        const bucket = tokenBuckets.find((entry) => String(entry.queueId) === String(queue.id));
        return normalizeQueue(queue, bucket?.tokens || []);
      });

      setQueues(normalizedQueues);
      setTokens(tokensFlat.slice(0, 20));
    } catch (error) {
      console.error('Failed to load queue data', error);
      setQueues([]);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueueData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(loadQueueData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const filteredQueues = queues.filter(queue => {
    const matchesSearch = queue.doctorName.toLowerCase().includes(search.toLowerCase()) ||
                         queue.department.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || queue.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    activeQueues: queues.filter(q => q.status === 'active').length,
    totalWaiting: queues.reduce((sum, q) => sum + q.waiting, 0),
    totalPatients: tokens.length,
    completedToday: tokens.filter(t => t.status === 'completed').length
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return faClock;
      case 'idle': return faHourglassHalf;
      case 'break': return faExclamationTriangle;
      default: return faClock;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'idle': return '#f59e0b';
      case 'break': return '#ef4444';
      default: return '#64748b';
    }
  };

  return (
    <div style={styles.container}>
      <style>{cssRules}</style>

      <div style={styles.header}>
        <button
          style={styles.backBtn}
          onClick={() => navigate('/hm/management')}
        >
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Queue Management</h1>
          <p style={styles.subtitle}>Live token queue monitoring</p>
          <p style={styles.readOnlyNote}>Read Only - Cannot modify queues</p>
        </div>
        <div style={styles.refreshControl}>
          <label style={styles.toggleSwitch}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span style={styles.toggleSlider}></span>
            Auto Refresh
          </label>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faUsers} />
          <div style={styles.statValue}>{stats.activeQueues}</div>
          <div style={styles.statLabel}>Active Queues</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faClock} />
          <div style={styles.statValue}>{stats.totalWaiting}</div>
          <div style={styles.statLabel}>Patients Waiting</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faUserMd} />
          <div style={styles.statValue}>{stats.totalPatients}</div>
          <div style={styles.statLabel}>Today's Patients</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faCheckCircle} />
          <div style={styles.statValue}>{stats.completedToday}</div>
          <div style={styles.statLabel}>Completed</div>
        </div>
      </div>

      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            placeholder="Search doctor or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.filterGroup}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="break">On Break</option>
          </select>
        </div>
      </div>

      <div style={styles.queuesGrid}>
        {loading ? <p>Loading queues...</p> : null}
        {filteredQueues.map(queue => (
          <div key={queue.id} style={styles.queueCard}>
            <div style={styles.queueHeader}>
              <div style={styles.queueDoctor}>
                <FontAwesomeIcon icon={faUserMd} />
                <div>
                  <h4 style={styles.doctorName}>{queue.doctorName}</h4>
                  <div style={styles.queueMeta}>
                    <span>
                      <FontAwesomeIcon icon={faBuilding} /> {queue.department}
                    </span>
                    <span>
                      <FontAwesomeIcon icon={faDoorOpen} /> Room {queue.room}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  ...styles.queueStatus,
                  color: getStatusColor(queue.status)
                }}
              >
                <FontAwesomeIcon icon={getStatusIcon(queue.status)} />
                {queue.status.toUpperCase()}
              </div>
            </div>

            <div style={styles.queueTokens}>
              <div style={styles.tokenDisplay}>
                <div style={styles.currentToken}>
                  <label style={styles.tokenLabel}>Current Token</label>
                  <div style={styles.tokenNumber}>{queue.currentToken}</div>
                </div>
                <div style={styles.nextToken}>
                  <label style={styles.tokenLabel}>Next Token</label>
                  <div style={styles.tokenNumber}>{queue.nextToken}</div>
                </div>
              </div>

              <div style={styles.queueStats}>
                <div style={styles.stat}>
                  <FontAwesomeIcon icon={faUsers} />
                  <div>
                    <div style={styles.statNumber}>{queue.waiting}</div>
                    <div style={styles.statLabel}>Waiting</div>
                  </div>
                </div>
                <div style={styles.stat}>
                  <FontAwesomeIcon icon={faClock} />
                  <div>
                    <div style={styles.statNumber}>{queue.avgTime}</div>
                    <div style={styles.statLabel}>Avg. Time</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.tokensSection}>
        <h3 style={styles.tokensTitle}>Recent Tokens</h3>
        <div style={styles.tokensList}>
          {tokens.map(token => (
            <div
              key={token.id}
              style={{
                ...styles.tokenCard,
                borderLeftColor:
                  token.status === 'current' ? '#3b82f6' :
                  token.status === 'waiting' ? '#f59e0b' : '#10b981'
              }}
            >
              <div style={styles.tokenNumberBadge}>{token.token}</div>
              <div style={styles.tokenInfo}>
                <div style={styles.tokenPatient}>{token.patient}</div>
                <div style={styles.tokenDoctor}>{token.doctor}</div>
              </div>
              <div style={styles.tokenTime}>{token.time}</div>
              <div
                style={{
                  ...styles.tokenStatus,
                  background:
                    token.status === 'current' ? '#dbeafe' :
                    token.status === 'waiting' ? '#fef3c7' : '#dcfce7',
                  color:
                    token.status === 'current' ? '#1e40af' :
                    token.status === 'waiting' ? '#92400e' : '#166534'
                }}
              >
                {token.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const cssRules = `
  .stat-card svg {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
    color: #3b82f6;
  }
  .search-box svg {
    color: #64748b;
  }
  .queue-doctor svg {
    color: #3b82f6;
    font-size: 1.5rem;
  }
  .queue-meta svg {
    margin-right: 0.25rem;
    font-size: 0.8rem;
    color: #64748b;
  }
  .queue-stats svg {
    color: #64748b;
    font-size: 0.9rem;
  }
  .token-card svg {
    color: #64748b;
    font-size: 0.8rem;
  }
`;

const styles = {
  container: {
    padding: '1.5rem',
    background: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    color: '#475569'
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    color: '#64748b',
    margin: '0.25rem 0 0 0'
  },
  readOnlyNote: {
    fontSize: '0.875rem',
    color: '#f59e0b',
    margin: '0.25rem 0 0 0'
  },
  refreshControl: {
    display: 'flex',
    alignItems: 'center'
  },
  toggleSwitch: {
    position: 'relative',
    display: 'inline-block',
    width: '50px',
    height: '24px',
    cursor: 'pointer'
  },
  toggleSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: '#cbd5e1',
    transition: '0.4s',
    borderRadius: '24px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0.5rem 0'
  },
   statLabel: {
    fontSize: '0.75rem',
    color: '#64748b' // choose one color
  },
  filtersBar: {
    background: 'white',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    background: '#f8fafc',
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    flex: '1',
    minWidth: '250px'
  },
  searchInput: {
    border: 'none',
    background: 'transparent',
    outline: 'none',
    width: '100%',
    fontSize: '0.95rem'
  },
  filterGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  select: {
    padding: '0.5rem 1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    background: 'white',
    fontSize: '0.95rem',
    cursor: 'pointer',
    minWidth: '150px'
  },
  queuesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  queueCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '0.75rem',
    padding: '1.5rem',
    transition: 'all 0.2s'
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem'
  },
  queueDoctor: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  doctorName: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  queueMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    fontSize: '0.75rem',
    color: '#64748b'
  },
  queueStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    background: '#f8fafc'
  },
  queueTokens: {
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '0.5rem'
  },
  tokenDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem'
  },
  currentToken: {
    textAlign: 'center'
  },
  nextToken: {
    textAlign: 'center'
  },
  tokenLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#64748b',
    marginBottom: '0.25rem'
  },
  tokenNumber: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e293b'
  },
  queueStats: {
    display: 'flex',
    justifyContent: 'space-around',
    paddingTop: '1rem',
    borderTop: '1px solid #e2e8f0'
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  statNumber: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1e293b'
  },
 
  tokensSection: {
    background: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    padding: '1.5rem'
  },
  tokensTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 1.5rem 0'
  },
  tokensList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  tokenCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    border: '1px solid #e2e8f0',
    borderRadius: '0.5rem',
    borderLeftWidth: '4px',
    gap: '1rem'
  },
  tokenNumberBadge: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    fontWeight: '600',
    fontSize: '0.875rem',
    minWidth: '70px',
    textAlign: 'center'
  },
  tokenInfo: {
    flex: '1'
  },
  tokenPatient: {
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  tokenDoctor: {
    fontSize: '0.875rem',
    color: '#64748b'
  },
  tokenTime: {
    fontSize: '0.875rem',
    color: '#64748b',
    minWidth: '80px'
  },
  tokenStatus: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600'
  }
};

export default Queues;