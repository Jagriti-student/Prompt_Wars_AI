import React from 'react';
import StadiumMap from './StadiumMap';
import { Users, AlertTriangle, Activity, Map as MapIcon, LogOut } from 'lucide-react';

export default function AdminDashboard({ densities, predictive, queues, alerts, onLogout }) {
  
  const getRiskLevel = (density) => {
    if (density >= 8.0) return { label: 'CRITICAL', color: 'var(--danger)' };
    if (density >= 4.0) return { label: 'HIGH', color: 'var(--warning)' };
    if (density >= 2.0) return { label: 'MED', color: 'var(--accent-cyan)' };
    return { label: 'LOW', color: 'var(--success)' };
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="admin-brand">
          <Activity size={28} color="var(--accent-cyan)" />
          <h1>Smart Crowd AI <span>Command Center</span></h1>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="admin-grid">
        {/* Left Column: Metrics and Alerts */}
        <div className="admin-sidebar">
          <div className="admin-card stats-card">
            <h3>Event Overview</h3>
            <div className="stat-row">
              <Users size={20} />
              <span>Simulated Capacity Constraint: <strong style={{color:'var(--warning)'}}>85%</strong></span>
            </div>
            <div className="stat-row">
              <MapIcon size={20} />
              <span>Active Routing Nodes: <strong>{Object.keys(densities).length}</strong></span>
            </div>
          </div>

          <div className="admin-card alert-card">
            <h3><AlertTriangle size={18} /> Real-Time Alerts</h3>
            <div className="alert-list">
              {alerts.length === 0 ? (
                <div className="no-alerts">No active alerts. Flow is optimal.</div>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="alert-item">
                    {a}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="admin-card queue-card">
            <h3>Live Queue Estimates</h3>
            {Object.entries(queues).map(([poi, q]) => (
              <div key={poi} className="queue-row">
                <span>{poi}</span>
                <span className={`q-badge ${q > 6 ? 'q-high' : 'q-low'}`}>{q} min</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Visualization */}
        <div className="admin-main">
          <div className="admin-card map-card">
            <div className="map-header">
              <h3>Live Heatmap Monitor</h3>
              <div className="legend">
                 <span className="l-item"><span className="dot" style={{background:'var(--success)'}}></span> Low</span>
                 <span className="l-item"><span className="dot" style={{background:'var(--accent-cyan)'}}></span> Med</span>
                 <span className="l-item"><span className="dot" style={{background:'var(--warning)'}}></span> High</span>
                 <span className="l-item"><span className="dot" style={{background:'var(--danger)'}}></span> Critical/Blocked</span>
              </div>
            </div>
            
            <div className="map-wrapper">
               <StadiumMap 
                 densities={densities} 
                 queues={queues} 
                 activePath={[]} 
                 currentLocation={null}
                 selectedDest={null}
               />
            </div>
          </div>

          <div className="admin-card risk-card">
            <h3>Predicted Risk Zones (Next 10 Mins)</h3>
            <div className="risk-grid">
              {Object.entries(predictive || {}).filter(([_, val]) => val >= 4.0).map(([zone, predVal]) => {
                const r = getRiskLevel(predVal);
                return (
                  <div key={zone} className="risk-item" style={{ borderLeftColor: r.color }}>
                    <h4>{zone}</h4>
                    <span style={{ color: r.color }}>{r.label} RISK</span>
                  </div>
                )
              })}
              {Object.entries(predictive || {}).filter(([_, val]) => val >= 4.0).length === 0 && (
                <div className="no-alerts">No predicted severe bottlenecks.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-dashboard {
          width: 100vw; height: 100vh;
          background: var(--bg-dark);
          color: var(--text-main);
          display: flex; flex-direction: column;
          font-family: inherit;
        }
        .admin-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 15px 30px;
          background: var(--bg-panel);
          border-bottom: 1px solid var(--border-muted);
        }
        .admin-brand { display: flex; align-items: center; gap: 12px; }
        .admin-brand h1 { font-size: 1.4rem; color: var(--text-main); margin: 0; }
        .admin-brand span { color: var(--text-muted); font-weight: 300; }
        .btn-logout { 
          display: flex; align-items: center; gap: 8px;
          background: transparent; color: var(--danger); border: 1px solid var(--danger);
          padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;
        }
        .admin-grid {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 20px; padding: 20px;
          flex: 1; overflow: hidden;
        }
        .admin-sidebar { display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
        .admin-main { display: flex; flex-direction: column; gap: 20px; overflow-y: hidden; }
        .admin-card {
          background: var(--bg-translucent);
          border: 1px solid var(--border-muted);
          border-radius: 12px; padding: 20px;
        }
        .admin-card h3 { 
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 15px; font-size: 1.1rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;
        }
        .stat-row, .queue-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid var(--border-muted);
        }
        .stat-row { justify-content: flex-start; gap: 12px; color: var(--text-muted); }
        .stat-row strong { color: var(--text-main); font-size: 1.1rem; }
        
        .alert-list { display: flex; flex-direction: column; gap: 10px; }
        .alert-item { background: rgba(239, 68, 68, 0.15); border-left: 4px solid var(--danger); padding: 12px; border-radius: 4px; font-size: 0.9rem; }
        .no-alerts { color: var(--success); padding: 10px; font-style: italic; }
        
        .q-badge { background: var(--bg-panel); padding: 4px 10px; border-radius: 12px; font-weight: bold; border: 1px solid; }
        .q-high { color: var(--warning); border-color: var(--warning); }
        .q-low { color: var(--success); border-color: var(--success); }

        .map-card { flex: 1; display: flex; flex-direction: column; min-height: 400px; }
        .map-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .legend { display: flex; gap: 15px; }
        .l-item { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-muted); }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .map-wrapper { flex: 1; position: relative; border-radius: 12px; overflow: hidden; background: #000; }
        
        .risk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .risk-item { background: var(--bg-panel); padding: 15px; border-radius: 8px; border-left: 4px solid; }
        .risk-item h4 { margin-bottom: 5px; font-size: 1.1rem; }
        .risk-item span { font-size: 0.8rem; font-weight: bold; }
      `}</style>
    </div>
  );
}
