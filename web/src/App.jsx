import React, { useState, useEffect, useRef } from 'react';
import { LRUCacheEngine } from './core/LRUCacheEngine';
import { 
  Database, 
  Sliders, 
  Clock, 
  Trash2, 
  Search, 
  Plus, 
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Sun,
  Moon
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

  // Theme state: defaults to dark developer theme, with light theme toggle
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('fc_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

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
    addLog('SYSTEM', 'engine', 'FastCache engine ready (Max capacity: 5 items)', 'sys');

    // Timer to update remaining TTL seconds
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
      addLog('CAPACITY', `${val}`, `Capacity set to ${val}. Removed ${evicted.length} oldest items: [${evicted.map(n => n.key).join(', ')}]`, 'evict');
      setLookupResult({ type: 'warning', text: `Capacity set to ${val}. Removed ${evicted.length} oldest item(s)` });
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
      addLog('SET', cleanKey, `Updated key "${cleanKey}" (moved to most recent position)`, 'set');
      setLookupResult({ type: 'success', text: `Saved "${cleanKey}" = "${cleanVal}"` });
    } else if (res.evicted) {
      addLog('SET', cleanKey, `Added "${cleanKey}". Cache was full -> Removed oldest key "${res.evicted.key}"`, 'evict');
      setLookupResult({ type: 'warning', text: `Added "${cleanKey}". Cache full -> Removed "${res.evicted.key}"` });
    } else {
      addLog('SET', cleanKey, `Added "${cleanKey}" to cache`, 'set');
      setLookupResult({ type: 'success', text: `Saved "${cleanKey}" = "${cleanVal}"` });
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
      addLog('GET', targetKey, `Found "${targetKey}" = "${res.value}" (moved to most recent)`, 'hit');
      setLookupResult({ type: 'hit', text: `Found: "${targetKey}" = "${res.value}"` });
    } else if (res.expired) {
      addLog('GET', targetKey, `Key "${targetKey}" has expired and was removed`, 'miss');
      setLookupResult({ type: 'miss', text: `Expired: "${targetKey}" timed out` });
    } else {
      addLog('GET', targetKey, `Key "${targetKey}" not found in cache`, 'miss');
      setLookupResult({ type: 'miss', text: `Not Found: "${targetKey}" does not exist` });
    }
    refreshState();
  };

  const handleDel = (targetKey) => {
    const k = (targetKey || key).trim();
    if (!k) return;

    const removed = engine.del(k);
    if (removed) {
      addLog('DELETE', k, `Removed key "${k}"`, 'del');
      setLookupResult({ type: 'info', text: `Deleted "${k}"` });
    } else {
      addLog('DELETE', k, `Key "${k}" not found`, 'miss');
      setLookupResult({ type: 'miss', text: `Delete failed: "${k}" not found` });
    }
    refreshState();
  };

  const handleClearExpired = () => {
    const purged = engine.purgeExpired();
    if (purged.length > 0) {
      addLog('CLEANUP', `${purged.length} items`, `Removed ${purged.length} expired items: [${purged.join(', ')}]`, 'purge');
      setLookupResult({ type: 'info', text: `Removed ${purged.length} expired items` });
    } else {
      addLog('CLEANUP', '0 items', 'No expired items found', 'sys');
      setLookupResult({ type: 'info', text: 'No expired items to remove' });
    }
    refreshState();
  };

  const handleClearAll = () => {
    engine.clear();
    addLog('CLEAR', 'all', 'Cache emptied completely', 'sys');
    setLookupResult(null);
    refreshState();
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

  const getOpBadgeClass = (status) => {
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

  return (
    <div className="fc-app">
      
      {/* Header */}
      <header className="fc-header">
        <div className="fc-header-left">
          <div className="fc-logo-mark">
            <Database size={16} strokeWidth={2.2} />
          </div>
          <div className="fc-header-text">
            <div className="fc-title-row">
              <h1 className="fc-title">FastCache</h1>
              <span className="fc-badge-tech">C++17 Engine</span>
            </div>
            <p className="fc-subtitle">In-memory key-value cache</p>
          </div>
        </div>

        <div className="fc-header-right">
          <button 
            type="button" 
            onClick={toggleTheme}
            className="fc-theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? (
              <>
                <Sun size={13} />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={13} />
                <span>Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Two-Column Layout: CACHE CONTROLS & CACHE STATUS */}
      <div className="fc-grid-two-col">
        {/* Left: CACHE CONTROLS */}
        <div className="fc-panel">
          <div className="fc-panel-header">
            <div className="fc-panel-title">
              <Sliders size={14} className="fc-panel-icon" />
              <span>Cache Controls</span>
            </div>

            {/* Stepper Number for Capacity (Replaces rolldown spinner) */}
            <div className="fc-capacity-control">
              <span className="fc-cap-label">Capacity:</span>
              <div className="fc-capacity-stepper">
                <button 
                  type="button"
                  onClick={() => handleCapacityChange(capacity - 1)}
                  disabled={capacity <= 1}
                  className="fc-step-btn"
                  title="Decrease capacity">
                  −
                </button>
                <input 
                  id="capacity-input"
                  type="number" 
                  min="1" 
                  max="50" 
                  value={capacity} 
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      setCapacity('');
                      return;
                    }
                    const n = parseInt(v, 10);
                    if (!isNaN(n) && n >= 1) {
                      handleCapacityChange(n);
                    }
                  }}
                  onBlur={() => {
                    if (!capacity || capacity < 1) handleCapacityChange(5);
                  }}
                  className="fc-cap-input font-mono"
                  title="Cache capacity limit"
                />
                <button 
                  type="button"
                  onClick={() => handleCapacityChange(Number(capacity || 0) + 1)}
                  disabled={capacity >= 50}
                  className="fc-step-btn"
                  title="Increase capacity">
                  +
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSet} className="fc-form">
            <div className="fc-form-grid">
              <div className="fc-form-group">
                <label className="fc-label">Key</label>
                <input 
                  type="text" 
                  placeholder="e.g. user_id" 
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
                  placeholder="e.g. Sasank" 
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
                  placeholder="e.g. 60" 
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
                  className="fc-btn fc-btn-subtle">
                  <Clock size={12} />
                  <span>Remove Expired</span>
                </button>

                <button 
                  type="button" 
                  onClick={handleClearAll}
                  className="fc-btn fc-btn-subtle">
                  <RotateCcw size={12} />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </form>

          {/* Feedback status */}
          {lookupResult && (
            <div className={`fc-status-banner fc-status-${lookupResult.type}`}>
              {getStatusIcon(lookupResult.type)}
              <span className="fc-status-text font-mono">{lookupResult.text}</span>
            </div>
          )}
        </div>

        {/* Right: CACHE STATUS (The 4 core metrics) */}
        <div className="fc-panel">
          <div className="fc-panel-header">
            <div className="fc-panel-title">
              <span>Cache Status</span>
            </div>
          </div>

          <div className="fc-status-grid">
            <div className="fc-status-card">
              <div className="fc-status-label">Items in Cache</div>
              <div className="fc-status-value">
                {stats.size} <span className="fc-stat-sub">/ {stats.capacity}</span>
              </div>
              <div className="fc-status-caption">
                {stats.size >= stats.capacity ? 'Full (replaces oldest)' : 'Space available'}
              </div>
            </div>

            <div className="fc-status-card">
              <div className="fc-status-label">Items Found</div>
              <div className="fc-status-value">{stats.hits}</div>
              <div className="fc-status-caption">Instant O(1) lookups</div>
            </div>

            <div className="fc-status-card">
              <div className="fc-status-label">Items Missed</div>
              <div className="fc-status-value">{stats.misses}</div>
              <div className="fc-status-caption">Not in cache or expired</div>
            </div>

            <div className="fc-status-card">
              <div className="fc-status-label">Hit Rate</div>
              <div className="fc-status-value">{stats.hitRate}</div>
              <div className="fc-status-caption">Success percentage</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Order (Most recently used -> Least recently used) */}
      <div className="fc-panel fc-order-section">
        <div className="fc-order-header">
          <div className="fc-panel-title">
            <span>Cache Order</span>
          </div>

          <div className="fc-direction-legend">
            <span className="fc-mru-legend-label">Most recently used (MRU)</span>
            <span className="fc-direction-arrow">───────&gt;</span>
            <span className="fc-lru-legend-label">Least recently used (LRU)</span>
          </div>
        </div>

        <div className="fc-order-body">
          {entries.length === 0 ? (
            <div className="fc-empty-state">
              Cache is empty. Use the form above to add your first key-value pair.
            </div>
          ) : (
            <div className="fc-nodes-chain">
              {entries.map((item, idx) => {
                const isMRU = idx === 0;
                const isLRU = idx === entries.length - 1;
                const isFull = entries.length >= capacity;

                return (
                  <div key={item.key} className="fc-node-item-wrapper">
                    <div 
                      className={`fc-node-card ${isMRU ? 'fc-node-card-mru' : isLRU && isFull ? 'fc-node-card-lru' : ''}`}
                    >
                      <div className="fc-node-header">
                        <div className="fc-node-tag-group">
                          <span className={`fc-node-role-tag ${isMRU ? 'fc-role-mru' : isLRU ? 'fc-role-lru' : 'fc-role-mid'}`}>
                            {isMRU ? 'MOST RECENT' : isLRU ? 'OLDEST (LRU)' : `#${idx + 1}`}
                          </span>
                        </div>

                        <div className="fc-node-actions">
                          <button 
                            type="button"
                            onClick={() => handleGet(item.key)}
                            className="fc-node-btn"
                            title="Get key">
                            Get
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDel(item.key)}
                            className="fc-node-btn fc-node-btn-del"
                            title="Delete key">
                            <Trash2 size={11} />
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
                              : `${item.ttlSeconds}s left`}
                          </span>
                        ) : (
                          <span className="fc-ttl-badge fc-ttl-permanent">
                            No expiration
                          </span>
                        )}
                      </div>
                    </div>

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

      {/* Operation History */}
      <div className="fc-panel fc-history-panel">
        <div className="fc-panel-header">
          <div className="fc-panel-title">
            <span>Operation History</span>
          </div>

          <div className="fc-history-header-actions">
            <span className="fc-log-count">{logs.length} logs</span>
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
                <th style={{ width: '95px' }}>Operation</th>
                <th style={{ width: '150px' }}>Key</th>
                <th>Result</th>
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
                      <span className={`fc-op-tag ${getOpBadgeClass(log.status)}`}>
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

      {/* Footer */}
      <footer className="fc-footer">
        FastCache &copy; 2026
      </footer>

    </div>
  );
}
