import React from 'react';
import { Map, Activity, Bell, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, t }) {
  const tabs = [
    { id: 'map', icon: Map, label: t.navMap, aria: "View Stadium Map" },
    { id: 'dashboard', icon: Activity, label: "Data", aria: "View Analytics Dashboard" },
    { id: 'alerts', icon: Bell, label: "Alerts", aria: "View System Alerts" },
    { id: 'settings', icon: Settings, label: t.navSettings, aria: "Adjust App Settings" },
  ];

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main Navigation">
      {tabs.map(({ id, icon: Icon, label, aria }) => (
        <button 
          key={id}
          className={`nav-item ${activeTab === id ? 'active' : ''}`} 
          onClick={() => setActiveTab(id)}
          aria-label={aria}
          aria-pressed={activeTab === id}
        >
          <Icon size={24} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
      <style>{`
        .bottom-nav {
          display: flex;
          justify-content: space-around;
          padding: 12px 0 25px;
          background: rgba(30, 41, 59, 0.8);
          backdrop-filter: blur(15px);
          border-top: 1px solid var(--border-muted);
          z-index: 100;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          background: none;
          font-size: 0.7rem;
          padding: 8px 15px;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .nav-item.active {
          color: var(--accent-cyan);
          background: rgba(6, 182, 212, 0.1);
          transform: translateY(-5px);
        }
        .nav-item:active {
          transform: scale(0.9);
        }
      `}</style>
    </nav>
  );
}
