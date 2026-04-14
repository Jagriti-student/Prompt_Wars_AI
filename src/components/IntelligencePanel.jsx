import React from 'react';
import { Activity, ShieldCheck, Zap } from 'lucide-react';

export default function IntelligencePanel({ densities, simScenario, pathInfo }) {
  const avgDensity = Math.round((Object.values(densities).reduce((a, b) => a + (b || 0), 0) / (Object.keys(densities).length || 1)) * 10);
  
  return (
    <div 
      className="ai-panel-slide" 
      style={{ 
        position: 'absolute', top: '90px', left: '15px', right: '15px', zIndex: 90, 
        background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(12px)', 
        padding: '12px 18px', borderRadius: '16px', border: '1px solid var(--border-muted)', 
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}
      aria-label="AI Intelligence Live Data"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Activity size={12} aria-hidden="true" /> Live Crowd Load
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: avgDensity > 50 ? 'var(--danger)' : 'var(--success)' }}>
          {avgDensity}%
        </div>
      </div>

      <div style={{ width: '1px', height: '30px', background: 'var(--border-muted)' }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'center' }}>
          <ShieldCheck size={12} aria-hidden="true" /> Risk
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: simScenario === 'Emergency' ? 'var(--danger)' : simScenario === 'Rush' ? 'var(--warning)' : 'var(--success)' }}>
          {simScenario === 'Emergency' ? 'CRIT' : simScenario === 'Rush' ? 'HIGH' : 'SAFE'}
        </div>
      </div>

      <div style={{ width: '1px', height: '30px', background: 'var(--border-muted)' }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
          <Zap size={12} aria-hidden="true" /> Intel
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>
          {pathInfo?.confidence?.safetyScore || 98}%
        </div>
      </div>
    </div>
  );
}
