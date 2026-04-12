import React from 'react';
import { Navigation, Clock } from 'lucide-react';
import { POIs } from '../utils/Pathfinding';

export default function NavigationOverlay({ 
  currentLocation, 
  selectedDest, 
  setSelectedDest, 
  pathInfo, 
  onStartRoute, 
  isRouting,
  routePref,
  setRoutePref,
  contextSuggestions = [],
  simScenario = "Normal",
  t
}) {
  
  if (isRouting) {
    return (
      <div className="nav-overlay active-routing">
        <div className="nav-header">
          <Navigation size={20} className="pulse-icon" color="var(--accent-cyan)" />
          <h3>Routing to {selectedDest}</h3>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 6px', background: simScenario==='Emergency'?'var(--danger)':simScenario==='Rush'?'var(--warning)':'var(--success)', borderRadius: '4px', color:'white' }}>
            {simScenario.toUpperCase()}
          </span>
        </div>
        
        <div className="nav-stats" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <div className="stat">
              <Clock size={16} />
              <span>{t.routeEst} {Math.round(pathInfo.totalTime / 10)} mins</span>
            </div>
            <div style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border-muted)', color: 'var(--accent-cyan)' }}>
              Mode: {pathInfo.pref.toUpperCase().replace('_', ' ')}
            </div>
          </div>
          
          <p className="path-text">
            {pathInfo.path.slice(0, 3).join(' ➔ ')}{pathInfo.path.length > 3 ? ' ...' : ''}
          </p>

          {/* AI Confidence Analytics */}
          <div style={{ background: 'var(--bg-panel)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)', marginTop: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>
               <span style={{ color: pathInfo.confidence?.safetyScore > 75 ? 'var(--success)' : 'var(--danger)' }}>
                 🛡️ Safety: {pathInfo.confidence?.safetyScore || 0}%
               </span>
               <span style={{ color: pathInfo.confidence?.speedScore > 75 ? 'var(--success)' : 'var(--warning)' }}>
                 ⚡ Flow Speed: {pathInfo.confidence?.speedScore || 0}%
               </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              "AI: {pathInfo.confidence?.text}"
            </span>
          </div>
        </div>

        <button className="btn-cancel" onClick={() => setSelectedDest(null)}>{t.cancelRoute}</button>

        <style>{`
          .nav-overlay {
            background: var(--bg-translucent);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
            border: 1px solid var(--border-muted);
            box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
            margin-top: 15px;
          }
          .nav-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
          .nav-header h3 { margin: 0; font-size: 1.2rem; }
          .pulse-icon { animation: pulse 2s infinite; }
          .stat { display: flex; align-items: center; gap: 6px; font-weight: bold; font-size: 0.9rem; }
          .path-text { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }
          .btn-cancel { width: 100%; padding: 12px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .btn-cancel:hover { background: rgba(239, 68, 68, 0.2); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="nav-overlay selection-mode">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>{t.whereNext}</h3>
        <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: simScenario==='Emergency'?'var(--danger)':simScenario==='Rush'?'var(--warning)':'var(--success)', borderRadius: '4px', color:'white' }}>
          {simScenario.toUpperCase()} MODE
        </span>
      </div>

      {contextSuggestions.length > 0 && (
        <div className="context-suggestions" style={{ marginTop: '10px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {contextSuggestions.map((sug, i) => (
              <div key={i} onClick={() => sug.target && setSelectedDest(sug.target)} style={{ 
                 background: sug.bg || 'var(--bg-panel)', borderLeft: `4px solid ${sug.color}`, padding: '10px 12px', 
                 borderRadius: '8px', cursor: sug.target ? 'pointer' : 'default', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '4px' 
              }}>
                 <span style={{ fontSize: '0.7rem', color: sug.color, fontWeight: 'bold', textTransform: 'uppercase' }}>{sug.label}</span>
                 <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{sug.text} {sug.target && <span style={{color: 'var(--text-muted)'}}>➔ Route</span>}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="poi-grid">
        {POIs.stands.map(poi => (
          <button key={poi} className={`poi-btn ${selectedDest === poi ? 'selected' : ''}`} onClick={() => setSelectedDest(poi)}>
            {poi}
          </button>
        ))}
      </div>
      <div className="poi-grid" style={{marginTop: '10px', marginBottom: '15px'}}>
        <button className="poi-btn selected" onClick={() => {
           setSelectedDest("Food Court 1");
        }}>🍛 {t.nearestFood}</button>
      </div>

      <h4 style={{fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-muted)'}}>Routing Profile</h4>
      <div className="pref-grid">
        <button className={`pref-btn ${routePref === 'fastest' ? 'active-pref' : ''}`} onClick={() => setRoutePref('fastest')}>⚡ Fastest</button>
        <button className={`pref-btn ${routePref === 'safest' ? 'active-pref' : ''}`} onClick={() => setRoutePref('safest')}>🛡️ Safest</button>
        <button className={`pref-btn ${routePref === 'least_crowded' ? 'active-pref' : ''}`} onClick={() => setRoutePref('least_crowded')}>🧘 Less Crowded</button>
        <button className={`pref-btn ${routePref === 'accessible' ? 'active-pref' : ''}`} onClick={() => setRoutePref('accessible')}>♿ Accessible</button>
      </div>

      {selectedDest && pathInfo && (
        <div className="route-preview">
          <div className="preview-time">{t.routeEst} {Math.round(pathInfo.totalTime / 10)} min</div>
          <button className="btn-start" onClick={onStartRoute}>{t.startNav}</button>
        </div>
      )}

      <style>{`
        .poi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .poi-btn { background: var(--bg-translucent); color: var(--text-main); padding: 10px; border-radius: 8px; font-size: 0.85rem; border: 1px solid transparent; text-align: left; transition: all 0.2s;}
        .poi-btn:hover { background: var(--border-muted); }
        .poi-btn.selected { background: rgba(6, 182, 212, 0.2); border-color: var(--accent-cyan); }
        .pref-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 15px; }
        .pref-btn { background: var(--bg-translucent); color: var(--text-muted); border: 1px solid var(--border-muted); padding: 8px; border-radius: 6px; font-size: 0.75rem; text-align: left; transition: all 0.2s; }
        .pref-btn.active-pref { background: rgba(59, 130, 246, 0.2); border-color: var(--accent-blue); color: var(--text-main); font-weight: bold; }
        .route-preview { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-muted); padding-top: 15px; }
        .preview-time { color: var(--accent-cyan); font-weight: bold; }
        .btn-start { background: var(--accent-cyan); color: #fff; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
}
