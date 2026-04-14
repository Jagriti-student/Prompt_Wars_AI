import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function Header({ t, handleSOS }) {
  return (
    <header className="app-header" role="banner">
      <div className="header-content">
        <div className="logo-section">
          <h1 style={{ margin: 0 }}>{t.appTitle}</h1>
          <div className="status-indicator">
            <span className="pulse-dot"></span>
            LIVE INTELLIGENCE
          </div>
        </div>
        <button 
          className="sos-btn-small" 
          onClick={handleSOS}
          aria-label="Trigger Emergency SOS Alert"
        >
          <ShieldAlert size={18} aria-hidden="true" /> {t.sosBtn}
        </button>
      </div>
      <style>{`
        .app-header {
          padding: 20px 20px 15px;
          background: rgba(30, 41, 59, 0.9);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-muted);
          z-index: 100;
        }
        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo-section {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .status-indicator {
          font-size: 0.6rem;
          color: var(--accent-cyan);
          letter-spacing: 1px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: bold;
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          background: var(--accent-cyan);
          border-radius: 50%;
          animation: status-pulse 1.5s infinite;
        }
        @keyframes status-pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </header>
  );
}
