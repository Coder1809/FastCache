import React, { useState, useEffect, useRef } from 'react';
import { LRUCacheEngine } from './core/LRUCacheEngine';
import { 
  Database, 
  Sliders, 
  Activity, 
  Clock, 
  Trash2, 
  Search, 
  Plus, 
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function App() {
  const [engine] = useState(() => new LRUCacheEngine(5));
  const [capacity, setCapacity] = useState(5);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState('');
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ size: 0, capacity: 5, hits: 0, misses: 0, hitRate: '0.0%' });
  const [logs, setLogs] = useState([]);
  const [lookupResult, setLookupResult] = useState(null);
  const logEndRef = useRef(null);

  const refreshState = () => {
    setEntries(engine.getEntries());
    setStats(engine.getStats());
  };

  const addLog = (action, keyTarget, detail, status = 'sys') => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0]; // HH:MM:SS
    setLogs(prev => [
      ...prev.slice(-49), 
      { timestamp, action, keyTarget: keyTarget || '—', detail, status }
    ]);
  };

  useEffect(() => {
    refreshState();
    addLog('SYSTEM', 'engine', 'FastCache C++17 initialized with capacity = 5', 'sys');

    // Periodic timer to tick down active TTL values
    const interval = setInterval(() => {
      setEntries(engine.getEntries());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll log table to bottom on update
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleCapacityChange = (newCap) => {
    const val = parseInt(newCap, 10);
    if (isNaN(val) || val < 1) return;
    setCapacity(val);
    const evicted = engine.setCapacity(val);
    if (evicted.length > 0) {
      addLog('CAPACITY', `${val}`, `Resized capacity to ${val}; evicted ${evicted.length} oldest: [${evicted.map(n => n.key).join(', ')}]`, 'evict');
      setLookupResult({ type: 'warning', text: `Capacity reduced to ${val}. Evicted ${evicted.length} LRU item(s).` });
    } else {
      addLog('CAPACITY', `${val}`, `Capacity updated to ${val}`, 'sys');
    }
    refreshState();
  };

  const handleSet = (e) => {
    e?.preventDefault();
    const cleanKey = key.trim();
    if (!cleanKey) return;

    const cleanVal = value.trim() || 'value';
    const ttlNum = ttl ? parseInt(ttl, 10) : null;
    const res = engine.set(cleanKey, cleanVal, ttlNum);

    if (res.isUpdate) {
      addLog('SET', cleanKey, `Updated key "${cleanKey}" -> moved to MRU head`, 'set');
      setLookupResult({ type: 'success', text: `SET: Updated "${cleanKey}" = "${cleanVal}" (promoted to MRU)` });
    } else if (res.evicted) {
      addLog('EVICT', res.evicted.key, `Evicted oldest LRU key "${res.evicted.key}" to make room for "${cleanKey}"`, 'evict');
      addLog('SET', cleanKey, `Inserted "${cleanKey}" = "${cleanVal}" at MRU head`, 'set');
      setLookupResult({ type: 'warning', text: `SET: Inserted "${cleanKey}". Evicted LRU key "${res.evicted.key}"` });
    } else {
      addLog('SET', cleanKey, `Stored "${cleanKey}" = "${cleanVal}"${ttlNum ? ` (TTL: ${ttlNum}s)` : ''}`, 'set');
      setLookupResult({ type: 'success', text: `SET: Stored "${cleanKey}" = "${cleanVal}"` });
    }

    setKey('');
    setValue('');
    setTtl('');
    refreshState();
  };

  const handleGet = (searchKey) => {
    const targetKey = (searchKey || key).trim();
    if (!targetKey) return;

    const res = engine.get(targetKey);
    if (res.found) {
      addLog('GET', targetKey, `Hit: retrieved "${res.value}" -> promoted to MRU head`, 'hit');
      setLookupResult({ type: 'hit', text: `HIT: Found "${targetKey}" = "${res.value}" (promoted to MRU)` });
    } else if (res.expired) {
      addLog('EXPIRE', targetKey, `Miss: key expired and was removed from storage`, 'miss');
      setLookupResult({ type: 'miss', text: `MISS: Key "${targetKey}" has expired (TTL elapsed)` });
    } else {
      addLog('GET', targetKey, `Miss: key not found in cache`, 'miss');
      setLookupResult({ type: 'miss', text: `MISS: Key "${targetKey}" does not exist in cache` });
    }
    refreshState();
  };

  const handleDel = (targetKey) => {
    const k = (targetKey || key).trim();
    if (!k) return;

    const removed = engine.del(k);
    if (removed) {
      addLog('DELETE', k, `Deleted key "${k}" from cache`, 'del');
      setLookupResult({ type: 'info', text: `DELETED: Removed "${k}" from cache` });
    } else {
      addLog('DELETE', k, `Delete failed: key "${k}" not found`, 'miss');
      setLookupResult({ type: 'miss', text: `DELETE FAILED: Key "${k}" not found` });
    }
    refreshState();
  };

  const handleClearExpired = () => {
    const purged = engine.purgeExpired();
    if (purged.length > 0) {
      addLog('PURGE', `${purged.length} keys`, `Purged expired keys: [${purged.join(', ')}]`, 'purge');
      setLookupResult({ type: 'warning', text: `PURGED: Removed ${purged.length} expired item(s)` });
    } else {
      addLog('PURGE', '0 keys', 'Scan complete: no expired items found', 'sys');
      setLookupResult({ type: 'info', text: `PURGE: No expired entries found` });
    }
    refreshState();
  };

  const handleClearAll = () => {
    engine.clear();
    addLog('CLEAR', 'all', 'Flushed all entries; hit/miss metrics reset to 0', 'sys');
    setLookupResult({ type: 'info', text: `CLEARED: Cache completely emptied` });
    refreshState();
  };

  const loadPreset = (presetType) => {
    if (presetType === 'user') {
      engine.set('user_42', 'sasank_reddy', 60);
      engine.set('user_18', 'alex_chen', 30);
      engine.set('user_07', 'sarah_m', null);
      addLog('SYSTEM', 'seed', 'Seeded sample user dataset (user_42, user_18, user_07)', 'set');
    } else if (presetType === 'session') {
      engine.set('sess_auth_901', 'token_xyz1', 15);
      engine.set('sess_auth_902', 'token_xyz2', 45);
      engine.set('sess_auth_903', 'token_xyz3', null);
      engine.set('sess_auth_904', 'token_xyz4', 90);
      addLog('SYSTEM', 'seed', 'Seeded active sessions dataset (4 keys)', 'set');
    }
    refreshState();
    setLookupResult({ type: 'success', text: `Seeded test data into cache` });
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'hit':
      case 'success':
        return <CheckCircle2 size={15} style={{ flexShrink: 0 }} />;
      case 'miss':
      case 'error':
        return <XCircle size={15} style={{ flexShrink: 0 }} />;
      case 'warning':
        return <AlertTriangle size={15} style={{ flexShrink: 0 }} />;
      default:
        return <Info size={15} style={{ flexShrink: 0 }} />;
    }
  };

  const getOpBadgeClass = (status, action) => {
    switch (status) {
      case 'hit':
        return 'fc-op-hit';
      case 'miss':
        return 'fc-op-miss';
      case 'set':
        return 'fc-op-set';
      case 'del':
        return 'fc-op-del';
      case 'evict':
        return 'fc-op-evict';
      case 'purge':
        return 'fc-op-purge';
      case 'cap':
        return 'fc-op-cap';
      default:
        return 'fc-op-sys';
    }
  };

  const cacheUsagePercent = Math.min(100, Math.round((stats.size / (stats.capacity || 1)) * 100));

  return (
    <div className="fc-app">
      
      {/* 1. Header */}
      <header className="fc-header">
        <div className="fc-header-left">
          <div className="fc-logo-mark">
            <Database size={17} strokeWidth={2.2} />
          </div>
          <div className="fc-header-text">
            <div className="fc-title-row">
              <h1 className="fc-title">FastCache</h1>
              <span className="fc-badge-tech">C++17 Engine</span>
            </div>
            <p className="fc-subtitle">In-memory key-value cache & memory visualizer</p>
          </div>
        </div>

        <div className="fc-header-meta">
          <div className="fc-meta-pill">
            <span className="fc-meta-dot" />
            <span>LRU Eviction</span>
          </div>
          <div className="fc-meta-pill">
            <span>O(1) Hash Map + Doubly Linked List</span>
          </div>
        </div>
      </header>

      {/* 2. Statistics Strip (Replaces AI SaaS cards) */}
      <div className="fc-stats-strip">
        <div className="fc-stat-item">
          <div className="fc-stat-label">Cache</div>
          <div className="fc-stat-value">
            {stats.size} <span className="fc-stat-sub">/ {stats.capacity}</span>
          </div>
          <div className="fc-stat-caption">
            {stats.size >= stats.capacity 
              ? 'Full (evicts LRU on insert)' 
              : `${stats.capacity - stats.size} slot${stats.capacity - stats.size === 1 ? '' : 's'} available`}
          </div>
        </div>

        <div className="fc-stat-item">
          <div className="fc-stat-label">Hits</div>
          <div className="fc-stat-value fc-stat-hits">{stats.hits}</div>
          <div className="fc-stat-caption">Instant O(1) lookups</div>
        </div>

        <div className="fc-stat-item">
          <div className="fc-stat-label">Misses</div>
          <div className="fc-stat-value fc-stat-misses">{stats.misses}</div>
          <div className="fc-stat-caption">Not found or TTL expired</div>
        </div>

        <div className="fc-stat-item">
          <div className="fc-stat-label">Hit Rate</div>
          <div className="fc-stat-value fc-stat-rate">{stats.hitRate}</div>
          <div className="fc-stat-caption">Hit efficiency ratio</div>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="fc-grid-two-col">
        {/* Left Column: Cache Controls */}
        <div className="fc-panel">
          <div className="fc-panel-header">
            <div className="fc-panel-title">
              <Sliders size={14} className="fc-panel-icon" />
              <span>Cache Controls</span>
            </div>

            <div className="fc-capacity-control">
              <label htmlFor="capacity-input" className="fc-cap-label">Max Capacity:</label>
              <input 
                id="capacity-input"
                type="number" 
                min="1" 
                max="20" 
                value={capacity} 
                onChange={(e) => handleCapacityChange(e.target.value)}
                className="fc-cap-input"
                title="Change max cache size"
              />
            </div>
          </div>

          <form onSubmit={handleSet} className="fc-form">
            <div className="fc-form-grid">
              <div className="fc-form-group">
                <label className="fc-label">Key</label>
                <input 
                  type="text" 
                  placeholder="e.g. user_42" 
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className="fc-input font-mono"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <div className="fc-form-group">
                <label className="fc-label">Value</label>
                <input 
                  type="text" 
                  placeholder="e.g. session_token" 
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="fc-input font-mono"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>

              <div className="fc-form-group">
                <label className="fc-label">TTL (Seconds)</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="Optional (e.g. 60)" 
                  value={ttl}
                  onChange={(e) => setTtl(e.target.value)}
                  className="fc-input font-mono"
                />
              </div>
            </div>

            <div className="fc-actions-row">
              <div className="fc-primary-actions">
                <button type="submit" className="fc-btn fc-btn-primary">
                  <Plus size={13} />
                  <span>Set Key</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => handleGet()} 
                  className="fc-btn fc-btn-secondary">
                  <Search size={13} />
                  <span>Get Key</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => handleDel()} 
                  className="fc-btn fc-btn-danger">
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>

              <div className="fc-secondary-actions">
                <button 
                  type="button" 
                  onClick={handleClearExpired}
                  className="fc-btn fc-btn-subtle"
                  title="Purge items with elapsed TTL">
                  <Clock size={12} />
                  <span>Remove Expired</span>
                </button>

                <button 
                  type="button" 
                  onClick={handleClearAll}
                  className="fc-btn fc-btn-subtle"
                  title="Flush cache storage">
                  <RotateCcw size={12} />
                  <span>Clear Cache</span>
                </button>
              </div>
            </div>
          </form>

          {/* Inline Operation Feedback */}
          {lookupResult && (
            <div className={`fc-status-banner fc-status-${lookupResult.type}`}>
              {getStatusIcon(lookupResult.type)}
              <span className="fc-status-text font-mono">{lookupResult.text}</span>
            </div>
          )}
        </div>

        {/* Right Column: Engine Specifications & Memory State */}
        <div className="fc-panel">
          <div className="fc-panel-header">
            <div className="fc-panel-title">
              <Activity size={14} className="fc-panel-icon" />
              <span>Engine Status</span>
            </div>
            <span className="fc-badge-tech" style={{ background: '#ecfdf5', color: '#15803d', borderColor: '#bbf7d0' }}>
              ONLINE
            </span>
          </div>

          <div className="fc-specs-body">
            <div className="fc-spec-row">
              <span className="fc-spec-name">Memory Slots Utilized</span>
              <span className="fc-spec-val font-mono">
                {stats.size} / {stats.capacity} items ({cacheUsagePercent}%)
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="fc-progress-track">
              <div 
                className="fc-progress-bar"
                style={{ 
                  width: `${cacheUsagePercent}%`,
                  backgroundColor: stats.size >= stats.capacity ? '#d97706' : '#2563eb'
                }}
              />
            </div>

            <div className="fc-specs-table">
              <div className="fc-specs-table-row">
                <span className="fc-spec-dim">Lookup Time Complexity</span>
                <span className="fc-spec-res font-mono">O(1) Hash Map</span>
              </div>
              <div className="fc-specs-table-row">
                <span className="fc-spec-dim">Eviction Policy</span>
                <span className="fc-spec-res font-mono">LRU (Doubly Linked List)</span>
              </div>
              <div className="fc-specs-table-row">
                <span className="fc-spec-dim">Expiration Model</span>
                <span className="fc-spec-res font-mono">Lazy Check + Manual Purge</span>
              </div>
              <div className="fc-specs-table-row">
                <span className="fc-spec-dim">Current Nodes In Memory</span>
                <span className="fc-spec-res font-mono">{entries.length} active</span>
              </div>
            </div>

            <div className="fc-seed-section">
              <span className="fc-seed-label">Quick test data:</span>
              <div className="fc-seed-btns">
                <button type="button" onClick={() => loadPreset('user')} className="fc-seed-btn">
                  + Seed Users
                </button>
                <button type="button" onClick={() => loadPreset('session')} className="fc-seed-btn">
                  + Seed Sessions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Cache Order Visualization (Doubly Linked List Structure) */}
      <div className="fc-panel fc-order-section">
        <div className="fc-order-header">
          <div className="fc-panel-title">
            <Database size={14} className="fc-panel-icon" />
            <span>Cache Order (Doubly Linked List)</span>
          </div>

          <div className="fc-direction-legend">
            <span>MRU (Head)</span>
            <span className="fc-direction-arrow">───────&gt;</span>
            <span>LRU (Tail: Next Eviction)</span>
          </div>
        </div>

        <div className="fc-order-body">
          {entries.length === 0 ? (
            <div className="fc-empty-state">
              Cache is currently empty. Use the controls above to store key-value entries or load test data.
            </div>
          ) : (
            <div className="fc-nodes-chain">
              {entries.map((item, idx) => {
                const isMRU = idx === 0;
                const isLRU = idx === entries.length - 1;
                const isFull = entries.length >= capacity;

                return (
                  <div key={item.key} className="fc-node-item-wrapper">
                    {/* Node Data Structure Card */}
                    <div 
                      className={`fc-node-card ${isMRU ? 'fc-node-card-mru' : isLRU && isFull ? 'fc-node-card-lru' : ''}`}
                    >
                      <div className="fc-node-header">
                        <div className="fc-node-tag-group">
                          <span className={`fc-node-role-tag ${isMRU ? 'fc-role-mru' : isLRU ? 'fc-role-lru' : 'fc-role-mid'}`}>
                            {isMRU ? 'MRU' : isLRU ? 'LRU' : `#${idx + 1}`}
                          </span>
                        </div>

                        <div className="fc-node-actions">
                          <button 
                            type="button"
                            onClick={() => handleGet(item.key)}
                            className="fc-node-btn"
                            title="Perform GET on this key (promotes to MRU)">
                            GET
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDel(item.key)}
                            className="fc-node-btn fc-node-btn-del"
                            title="Delete this key">
                            DEL
                          </button>
                        </div>
                      </div>

                      <div className="fc-node-field">
                        <span className="fc-node-label">Key</span>
                        <span className="fc-node-key" title={item.key}>{item.key}</span>
                      </div>

                      <div className="fc-node-field">
                        <span className="fc-node-label">Value</span>
                        <span className="fc-node-val" title={item.value}>"{item.value}"</span>
                      </div>

                      <div className="fc-node-footer">
                        {item.ttlSeconds !== null ? (
                          <span className={`fc-ttl-badge ${item.isExpired ? 'fc-ttl-expired' : item.ttlSeconds <= 5 ? 'fc-ttl-expiring' : ''}`}>
                            <Clock size={11} />
                            {item.isExpired 
                              ? 'Expired' 
                              : `${item.ttlSeconds}s remaining`}
                          </span>
                        ) : (
                          <span className="fc-ttl-badge fc-ttl-permanent">
                            No TTL (Persistent)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connector between Nodes */}
                    {idx < entries.length - 1 && (
                      <div className="fc-connector">
                        <span className="fc-connector-arrow">⇄</span>
                        <span className="fc-connector-label">next/prev</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Operation History (Technical Log / Audit Table) */}
      <div className="fc-panel fc-history-panel">
        <div className="fc-panel-header">
          <div className="fc-panel-title">
            <span>Operation History</span>
          </div>

          <div className="fc-history-header-actions">
            <span className="fc-log-count">{logs.length} events logged</span>
            <button 
              type="button"
              onClick={() => setLogs([])}
              className="fc-log-clear-btn">
              Clear Log
            </button>
          </div>
        </div>

        <div className="fc-table-container">
          <table className="fc-table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Time</th>
                <th style={{ width: '85px' }}>Operation</th>
                <th style={{ width: '150px' }}>Key</th>
                <th>Result / Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px 0' }}>
                    No operations recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr key={idx}>
                    <td className="fc-td-time">{log.timestamp}</td>
                    <td className="fc-td-op">
                      <span className={`fc-op-tag ${getOpBadgeClass(log.status, log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="fc-td-key">{log.keyTarget}</td>
                    <td className="fc-td-detail">{log.detail}</td>
                  </tr>
                ))
              )}
              <tr ref={logEndRef} style={{ height: 0, padding: 0, border: 'none' }} />
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Footer (Minimal, FastCache copyright only) */}
      <footer className="fc-footer">
        FastCache &copy; 2026
      </footer>

    </div>
  );
}
