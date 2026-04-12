import React, { useState, useEffect } from 'react';
import { Activity, Clock, Users, ShieldAlert } from 'lucide-react';

export default function PublicDashboard({ densities, queues, predictive, simScenario }) {
  const [jitter, setJitter] = useState({ q: 0, c: 0, f: 0 });

  useEffect(() => {
     const t = setInterval(() => {
        setJitter({
           q: (Math.random() * 4 - 2), // +/- 2 mins
           c: Math.round(Math.random() * 8), // fake crowd fluctuation metric
           f: Math.random() > 0.5 ? 1 : 0
        });
     }, 1200);
     return () => clearInterval(t);
  }, []);
  
  const getRiskLevel = (density) => {
    if (density >= 8.0) return { label: 'CRITICAL', color: 'var(--danger)' };
    if (density >= 4.0) return { label: 'HIGH', color: 'var(--warning)' };
    if (density >= 2.0) return { label: 'MED', color: 'var(--accent-cyan)' };
    return { label: 'LOW', color: 'var(--success)' };
  };

  const highRiskZones = Object.entries(densities).filter(([_, d]) => d >= 4.0);
  const avgQ = Object.values(queues).reduce((a,b)=>a+b,0) / (Object.keys(queues).length || 1);

  return (
    <div className="public-dashboard" style={{ padding: '15px' }}>
      <h2 style={{ marginBottom: '15px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={24} color="var(--accent-cyan)" /> Live Analytics
      </h2>

      <div style={{ background: 'var(--bg-translucent)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-muted)', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Current Scenario State</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', padding: '6px 12px', background: simScenario==='Emergency'?'var(--danger)':simScenario==='Rush'?'var(--warning)':'var(--success)', borderRadius: '8px', color:'white' }}>
            {simScenario.toUpperCase()} MODE
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            System routing protocols automatically scale to this state.
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-muted)', textAlign: 'center' }}>
           <Clock size={24} style={{ margin: '0 auto 8px', color: 'var(--accent-blue)' }} />
           <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{Math.max(1, (avgQ + jitter.q)).toFixed(1)} min</div>
           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg. Wait Time</div>
        </div>
        <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-muted)', textAlign: 'center', transition: 'all 0.2s' }}>
           <Users size={24} style={{ margin: '0 auto 8px', color: 'var(--warning)' }} />
           <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-main)', transition: 'color 0.2s' }}>{Math.min(100, Math.round(highRiskZones.length * 10 + 40 + jitter.c))}%</div>
           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Global Crowd Load</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-muted)', marginBottom: '15px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Queue Wait Times</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
           {Object.entries(queues).map(([target, q]) => (
              <div key={target} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                 <span>{target}</span>
                 <span style={{ fontWeight: 'bold', color: q > 6 ? 'var(--warning)' : 'var(--success)' }}>{q} min</span>
              </div>
           ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-panel)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-muted)' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Predicted Surges (Next 10M)</h3>
        {Object.entries(predictive || {}).filter(([_, val]) => val >= 4.0).length === 0 ? (
           <p style={{ fontSize: '0.85rem', color: 'var(--success)', fontStyle: 'italic' }}>No predicted severe bottlenecks.</p>
        ) : (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {Object.entries(predictive || {}).filter(([_, val]) => val >= 4.0).map(([zone, predVal]) => {
                const r = getRiskLevel(predVal);
                return (
                  <div key={zone} style={{ borderLeft: `4px solid ${r.color}`, paddingLeft: '10px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{zone}</div>
                    <div style={{ fontSize: '0.75rem', color: r.color }}>{r.label} RISK</div>
                  </div>
                )
             })}
           </div>
        )}
      </div>

    </div>
  );
}
