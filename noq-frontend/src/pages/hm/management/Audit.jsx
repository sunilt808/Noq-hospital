import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCalendarAlt, faDownload, faHistory, faSearch, faTrash } from '@fortawesome/free-solid-svg-icons';
import { clearHistoryByIds, getRoleScopedHistory, pruneHistory } from '../../../services/historyService';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

const Audit = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [backendLogs, setBackendLogs] = useState([]);
  const currentHospitalId = String(currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || '');

  useEffect(() => {
    pruneHistory();
    const refresh = () => setRefreshKey((prev) => prev + 1);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadBackendLogs = async () => {
      const response = await api
        .get(`/users/audit/credentials${currentHospitalId ? `?hospital_id=${encodeURIComponent(currentHospitalId)}` : ''}`)
        .catch(() => ({ data: { data: { logs: [] } } }));

      if (!active) return;

      const logs = Array.isArray(response?.data?.data?.logs) ? response.data.data.logs : [];
      setBackendLogs(logs);
    };

    loadBackendLogs();
    return () => {
      active = false;
    };
  }, [refreshKey, currentHospitalId]);

  const logs = useMemo(() => {
    const scoped = getRoleScopedHistory(currentUser).map((item) => ({
      ...item,
      id: `local-${item.id}`,
    }));

    const backendMapped = backendLogs.map((item) => ({
      id: `backend-${item.id}`,
      action: item.action || 'credential_event',
      message: `${String(item.action || 'Credential event').replaceAll('_', ' ')} for user ${item.entity_id || '-'}`,
      actorRole: 'hm',
      actorName: 'Backend Audit',
      module: 'credentials',
      timestamp: item.timestamp,
    }));

    return [...backendMapped, ...scoped].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [refreshKey, currentUser, backendLogs]);

  const modules = useMemo(() => ['all', ...new Set(logs.map((item) => item.module || 'general'))], [logs]);

  const filteredLogs = logs.filter((item) => {
    const q = search.toLowerCase();
    const text = `${item.actorName || ''} ${item.action || ''} ${item.message || ''}`.toLowerCase();
    const passSearch = !q || text.includes(q);
    const passModule = moduleFilter === 'all' || String(item.module || '') === moduleFilter;
    return passSearch && passModule;
  });

  const exportLogs = () => {
    const content = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hm-audit-30days-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const clearScopedLogs = () => {
    if (!window.confirm('Clear visible audit logs?')) return;
    clearHistoryByIds(logs.map((item) => item.id));
    setRefreshKey((prev) => prev + 1);
  };

  const styles = {
    container: { padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' },
    title: { margin: 0, color: '#0f172a' },
    subtitle: { margin: '4px 0 0', color: '#64748b' },
    backBtn: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
    actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
    btn: { border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: '#fff', fontWeight: 600 },
    filters: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', gap: 10, flexWrap: 'wrap' },
    input: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', minWidth: 240 },
    select: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px' },
    list: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
    item: { borderBottom: '1px solid #f1f5f9', padding: '10px 0' },
    meta: { color: '#64748b', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/hm/management')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div style={{ flex: 1 }}>
          <h2 style={styles.title}><FontAwesomeIcon icon={faHistory} /> Role Audit (Last 30 Days)</h2>
          <p style={styles.subtitle}>Shows only logs related to your role and hospital relation.</p>
        </div>
        <div style={styles.actions}>
          <button style={{ ...styles.btn, background: '#2563eb' }} onClick={exportLogs}><FontAwesomeIcon icon={faDownload} /> Export</button>
          <button style={{ ...styles.btn, background: '#dc2626' }} onClick={clearScopedLogs}><FontAwesomeIcon icon={faTrash} /> Clear Visible</button>
        </div>
      </div>

      <div style={styles.filters}>
        <div style={{ position: 'relative' }}>
          <FontAwesomeIcon icon={faSearch} style={{ position: 'absolute', left: 10, top: 11, color: '#64748b' }} />
          <input style={{ ...styles.input, paddingLeft: 30 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actor/action/message" />
        </div>
        <select style={styles.select} value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          {modules.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <div style={styles.list}>
        {filteredLogs.length === 0 ? (
          <div style={{ color: '#64748b' }}>No audit records in last 30 days for this role scope.</div>
        ) : (
          filteredLogs.map((item) => (
            <div key={item.id} style={styles.item}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.message || item.action}</div>
              <div style={styles.meta}>
                <span>{item.actorRole} • {item.actorName}</span>
                <span>{item.module}</span>
                <span><FontAwesomeIcon icon={faCalendarAlt} /> {new Date(item.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Audit;
