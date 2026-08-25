import React, { useState, useEffect, useRef } from 'react';
import { LRUCacheEngine } from './core/LRUCacheEngine';
import { 
  Zap, 
  Trash2, 
  Database, 
  Layers, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  Terminal,
  Activity
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

  const addLog = (action, detail, status = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-30), { timestamp, action, detail, status }]);
  };

  useEffect(() => {
    refreshState();
    addLog('SYSTEM', 'FastCache engine ready (Max capacity: 5 items)', 'success');

    // Timer to update remaining TTL seconds
    const interval = setInterval(() => {
      setEntries(engine.getEntries());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCapacityChange = (newCap) => {
    const val = parseInt(newCap, 10);
    if (isNaN(val) || val < 1) return;
    setCapacity(val);
    const evicted = engine.setCapacity(val);
    if (evicted.length > 0) {
      addLog('CAPACITY', `Capacity set to ${val}. Removed ${evicted.length} oldest items: [${evicted.map(n => n.key).join(', ')}]`, 'warning');
    } else {
      addLog('CAPACITY', `Capacity updated to ${val}`, 'info');
    }
    refreshState();
  };

  const handleSet = (e) => {
    e?.preventDefault();
    if (!key.trim()) return;

    const ttlNum = ttl ? parseInt(ttl, 10) : null;
    const res = engine.set(key.trim(), value.trim() || 'value', ttlNum);

    if (res.isUpdate) {
      addLog('SET', `Updated key "${key}" (moved to most recent position)`, 'success');
    } else if (res.evicted) {
      addLog('SET', `Added "${key}". Cache was full -> Removed oldest key "${res.evicted.key}"`, 'warning');
    } else {
      addLog('SET', `Added "${key}" to cache`, 'success');
    }

    setLookupResult({ type: 'success', text: `Saved "${key}" = "${value || 'value'}"` });
    setKey('');
    setValue('');
    setTtl('');
    refreshState();
  };

  const handleGet = (searchKey) => {
    const targetKey = searchKey || key.trim();
    if (!targetKey) return;

    const res = engine.get(targetKey);
    if (res.found) {
      addLog('GET', `Found "${targetKey}" = "${res.value}" (moved to most recent)`, 'success');
      setLookupResult({ type: 'hit', text: `Found: "${targetKey}" = "${res.value}"` });
    } else if (res.expired) {
      addLog('GET', `Key "${targetKey}" has expired and was removed`, 'error');
      setLookupResult({ type: 'miss', text: `Expired: "${targetKey}" timed out` });
    } else {
      addLog('GET', `Key "${targetKey}" not found in cache`, 'error');
      setLookupResult({ type: 'miss', text: `Not Found: "${targetKey}" does not exist` });
    }
    refreshState();
  };

  const handleDel = (targetKey) => {
    const k = targetKey || key.trim();
    if (!k) return;

    const removed = engine.del(k);
    if (removed) {
      addLog('DELETE', `Removed key "${k}"`, 'info');
      setLookupResult({ type: 'info', text: `Deleted "${k}"` });
    } else {
      addLog('DELETE', `Key "${k}" not found`, 'warning');
      setLookupResult({ type: 'miss', text: `Delete failed: "${k}" not found` });
    }
    refreshState();
  };

  const handleClearExpired = () => {
    const purged = engine.purgeExpired();
    if (purged.length > 0) {
      addLog('CLEANUP', `Removed ${purged.length} expired items: [${purged.join(', ')}]`, 'warning');
      setLookupResult({ type: 'info', text: `Removed ${purged.length} expired items` });
    } else {
      addLog('CLEANUP', 'No expired items found', 'info');
      setLookupResult({ type: 'info', text: 'No expired items to remove' });
    }
    refreshState();
  };

  const handleClearAll = () => {
    engine.clear();
    addLog('CLEAR', 'Cache emptied completely', 'warning');
    setLookupResult(null);
    refreshState();
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header - Cleaned up without GitHub/Demo buttons */}
      <header style={{ marginBottom: '24px', borderBottom: '1px solid #1f2937', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex' }}>
            <Zap size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, letterSpacing: '-0.025em' }}>
              FastCache <span style={{ fontSize: '13px', fontWeight: '500', color: '#60a5fa', background: '#1e3a8a', padding: '2px 8px', borderRadius: '4px', marginLeft: '6px' }}>C++17 Engine</span>
            </h1>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '2px 0 0 0' }}>
              In-Memory Key-Value Cache & Memory Order Visualizer
            </p>
          </div>
        </div>
      </header>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Items in Cache</div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: stats.size >= stats.capacity ? '#f59e0b' : '#38bdf8' }}>
            {stats.size} / {stats.capacity}
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
            {stats.size >= stats.capacity ? 'Full (Next item will replace oldest)' : 'Space available'}
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Items Found (Hits)</div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: '#22c55e' }}>{stats.hits}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Instant O(1) lookups</div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Items Missed (Misses)</div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: '#ef4444' }}>{stats.misses}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Not in cache or expired</div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '600' }}>Hit Rate</div>
          <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: '#a855f7' }}>{stats.hitRate}</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Success percentage</div>
        </div>
      </div>

      {/* Controls & Inputs */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={16} color="#38bdf8" /> Cache Actions
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#94a3b8' }}>Max Capacity:</span>
            <input 
              type="number" 
              min="1" 
              max="20" 
              value={capacity} 
              onChange={(e) => handleCapacityChange(e.target.value)}
              style={{ width: '60px', padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>
        </div>

        <form onSubmit={handleSet} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Key (e.g. user_id)" 
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{ flex: '1 1 140px', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}
          />
          <input 
            type="text" 
            placeholder="Value (e.g. Sasank)" 
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ flex: '2 1 180px', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}
          />
          <input 
            type="number" 
            placeholder="Expire after (seconds)" 
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            style={{ width: '170px', padding: '8px 12px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}
          />
          
          <button 
            type="submit"
            style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
            Set Key
          </button>
          <button 
            type="button"
            onClick={() => handleGet()}
            style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
            Get Key
          </button>
          <button 
            type="button"
            onClick={() => handleDel()}
            style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
            Delete
          </button>
          <button 
            type="button"
            onClick={handleClearExpired}
            style={{ background: '#475569', color: '#f8fafc', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            Remove Expired
          </button>
          <button 
            type="button"
            onClick={handleClearAll}
            style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
            Clear All
          </button>
        </form>

        {lookupResult && (
          <div style={{ marginTop: '14px', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', background: lookupResult.type === 'hit' || lookupResult.type === 'success' ? '#064e3b' : lookupResult.type === 'miss' ? '#7f1d1d' : '#1e293b', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {lookupResult.type === 'hit' || lookupResult.type === 'success' ? <CheckCircle2 size={16} color="#34d399" /> : lookupResult.type === 'miss' ? <XCircle size={16} color="#f87171" /> : <Activity size={16} color="#38bdf8" />}
            <span style={{ fontFamily: 'monospace' }}>{lookupResult.text}</span>
          </div>
        )}
      </div>

      {/* Main Visualizer Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Linked List Order View */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="#38bdf8" /> Cache Order (Most Recent ➔ Oldest)
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>MRU ➔ LRU</span>
          </div>

          {entries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '13px', border: '1px dashed #334155', borderRadius: '6px' }}>
              Cache is empty. Use the form above to add your first key-value pair.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {entries.map((item, idx) => (
                <div 
                  key={item.key} 
                  style={{ 
                    background: idx === 0 ? '#1e293b' : idx === entries.length - 1 && entries.length >= capacity ? '#451a03' : '#111827',
                    border: idx === 0 ? '1px solid #38bdf8' : idx === entries.length - 1 && entries.length >= capacity ? '1px solid #b45309' : '1px solid #1f2937',
                    padding: '12px',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: idx === 0 ? '#0284c7' : idx === entries.length - 1 && entries.length >= capacity ? '#d97706' : '#334155', color: '#ffffff' }}>
                        {idx === 0 ? 'MOST RECENT' : idx === entries.length - 1 ? 'OLDEST (LRU)' : `#${idx + 1}`}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '14px', fontFamily: 'monospace', color: '#f8fafc' }}>
                        {item.key}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                      value: <span style={{ color: '#e2e8f0' }}>"{item.value}"</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {item.ttlSeconds !== null && (
                      <span style={{ fontSize: '11px', color: item.ttlSeconds <= 5 ? '#f87171' : '#38bdf8', background: '#0f172a', padding: '3px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {item.ttlSeconds}s left
                      </span>
                    )}
                    <button 
                      onClick={() => handleGet(item.key)}
                      style={{ fontSize: '11px', background: '#0284c7', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                      Get
                    </button>
                    <button 
                      onClick={() => handleDel(item.key)}
                      style={{ fontSize: '11px', background: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Key-Value Lookup Table */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: '20px', borderRadius: '8px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Database size={16} color="#38bdf8" /> Key-Value Map Index (<span style={{ fontFamily: 'monospace' }}>std::unordered_map</span>)
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '8px 4px' }}>Key</th>
                <th style={{ padding: '8px 4px' }}>Memory Pointer</th>
                <th style={{ padding: '8px 4px' }}>Lookup Cost</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>
                    Map is currently empty.
                  </td>
                </tr>
              ) : (
                entries.map(item => (
                  <tr key={item.key} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px 4px', fontFamily: 'monospace', color: '#38bdf8' }}>"{item.key}"</td>
                    <td style={{ padding: '8px 4px', fontFamily: 'monospace', color: '#a855f7' }}>0x{(item.key.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) * 16384).toString(16)}</td>
                    <td style={{ padding: '8px 4px', color: '#22c55e', fontWeight: '600' }}>O(1)</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log */}
      <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
            <Terminal size={14} color="#38bdf8" /> Cache Operations History
          </div>
          <button 
            onClick={() => setLogs([])}
            style={{ fontSize: '11px', background: 'transparent', color: '#64748b', border: 'none', cursor: 'pointer' }}>
            Clear Log
          </button>
        </div>

        <div style={{ maxHeight: '150px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {logs.map((log, idx) => (
            <div key={idx} style={{ color: log.status === 'success' ? '#4ade80' : log.status === 'warning' ? '#fbbf24' : log.status === 'error' ? '#f87171' : '#94a3b8' }}>
              <span style={{ color: '#475569' }}>[{log.timestamp}]</span> <span style={{ fontWeight: '700' }}>[{log.action}]</span> {log.detail}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>

      <footer style={{ marginTop: '28px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
        FastCache In-Memory Engine &copy; 2026 Sasank Reddy Baddigam | NIT Raipur
      </footer>
    </div>
  );
}
