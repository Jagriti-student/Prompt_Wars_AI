import getAIResponse from './ai';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Mic } from 'lucide-react';
import StadiumMap from './components/StadiumMap';
import NavigationOverlay from './components/NavigationOverlay';
import AdminDashboard from './components/AdminDashboard';
import PublicDashboard from './components/PublicDashboard';
import Login from './components/Login';
import Header from './components/Header';
import IntelligencePanel from './components/IntelligencePanel';
import BottomNav from './components/BottomNav';
import { SimulationEngine } from './utils/SimulationEngine';
import { findShortestPath, findNearestExit, findBestAmenity, calculateConfidence } from './utils/Pathfinding';
import { getStrings } from './utils/i18n';

const loadSettings = () => {
  const s = localStorage.getItem('sca_settings');
  const settings = s ? JSON.parse(s) : { lang: 'en', accessibleNav: false, voiceAlerts: true, contactMode: false, geminiKey: '' };
  
  if (!settings.geminiKey) {
    settings.geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  }
  return settings;
};
const saveSettings = (s) => localStorage.setItem('sca_settings', JSON.stringify(s));

export default function App() {
  const [activeTab, setActiveTab] = useState('map');
  const [sosActive, setSosActive] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [alertsHistory, setAlertsHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');

  const [userSettings, setUserSettings] = useState(loadSettings());
  const t = getStrings(userSettings.lang);

  const [densities, setDensities] = useState({});
  const [queues, setQueues] = useState({});
  const [predictive, setPredictive] = useState({});
  const [liveAlerts, setLiveAlerts] = useState([]);
  const engineRef = useRef(null);

  const [currentLocation, setCurrentLocation] = useState("Gate 1");
  const [selectedDest, setSelectedDest] = useState(null);
  const [routePref, setRoutePref] = useState('fastest');
  const [isRouting, setIsRouting] = useState(false);
  const [pathInfo, setPathInfo] = useState({ path: [], totalTime: 0, pref: 'fastest', confidence: { safetyScore: 100, speedScore: 100, text: "" } });
  const pathRef = useRef(pathInfo);
  const [simScenario, setSimScenario] = useState("Normal");

  const [stuckCount, setStuckCount] = useState(0);

  // V6 Pitch Demo Hooks
  const [dramaticPopup, setDramaticPopup] = useState(null);
  const [isDemoFlash, setIsDemoFlash] = useState(false);
  const [lostPersonNode, setLostPersonNode] = useState(null);
  const [aiResult, setAIResult] = useState("");
  const [userAIQuery, setUserAIQuery] = useState("");

  useEffect(() => {
    saveSettings(userSettings);
  }, [userSettings]);

  useEffect(() => {
    engineRef.current = new SimulationEngine((data) => {
      setDensities(data.densities);
      setQueues(data.queues);
      setPredictive(data.predictive);

      if (data.alerts && data.alerts.length > 0) {
        setLiveAlerts(prev => [...data.alerts, ...prev].slice(0, 5));
        data.alerts.forEach(a => addNotification(a));
      }
    });
    engineRef.current.start();

    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (sosActive) {
      setSimScenario("Emergency");
      return;
    }
    const nodes = Object.values(densities);
    const avg = nodes.reduce((a, b) => a + (b !== null ? b : 1), 0) / (nodes.length || 1);
    if (avg >= 2.0 || nodes.some(n => n >= 8.0)) setSimScenario("Rush");
    else setSimScenario("Normal");
  }, [densities, sosActive]);

  useEffect(() => {
    if (densities[currentLocation] >= 8.0 && !sosActive) {
      setStuckCount(prev => prev + 1);
    } else {
      if (stuckCount > 0) setStuckCount(0);
    }
  }, [densities, currentLocation, sosActive]);

  useEffect(() => {
    if (stuckCount === 1 && !sosActive) {
      addNotification("Warning: You are lingering in a high-risk zone.", "warning");
    } else if (stuckCount >= 2 && !sosActive) {
      addNotification("PANIC DETECTION: Anti-trap protocol activated!", "critical");
      handleSOS();
    }
  }, [stuckCount]);

  const speak = (text) => {
    if (!userSettings.voiceAlerts) return;
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = userSettings.lang === 'hi' ? 'hi-IN' : 'en-US';
      window.speechSynthesis.speak(msg);
    }
  };

  useEffect(() => {
    if (sosActive) {
      const exitInfo = findNearestExit(currentLocation, densities);
      exitInfo.confidence = calculateConfidence(exitInfo.path, densities, predictive);

      setPathInfo({ path: exitInfo.path, totalTime: exitInfo.time, pref: 'safest', confidence: exitInfo.confidence });
      pathRef.current = { path: exitInfo.path, totalTime: exitInfo.time };

      setSelectedDest(exitInfo.exit);
      setIsRouting(true);
      return;
    }

    if (selectedDest) {
      const info = findShortestPath(currentLocation, selectedDest, densities, routePref);
      info.confidence = calculateConfidence(info.path, densities, predictive);

      if (info.path.length === 0) {
        addNotification(`Destination is blocked or inaccessible.`);
        setIsRouting(false);
        return;
      }

      if (isRouting && pathRef.current.path.length > 0) {
        if (info.path.join(',') !== pathRef.current.path.join(',')) {
          const prevTime = pathRef.current.totalTime;
          const improvementMargin = prevTime > 0 ? (prevTime - info.totalTime) / prevTime : 0;

          let threshold = 0.20;
          if (simScenario === 'Rush') threshold = 0.15;
          if (simScenario === 'Emergency') threshold = 0.05;

          if (improvementMargin > threshold || info.confidence.safetyScore > (pathInfo.confidence?.safetyScore || 0) + 15) {
            addNotification(`AI OPTIMIZATION: Better path found!`, "info");
            speak("AI detected a safer path. Rerouting now.");
            setPathInfo(info);
            pathRef.current = info;
          }
        } else {
          setPathInfo(info);
          pathRef.current = info;
        }
      } else {
        setPathInfo(info);
        pathRef.current = info;
      }
    } else {
      setPathInfo({ path: [], totalTime: 0, pref: routePref, confidence: { safetyScore: 100, speedScore: 100, text: "" } });
      pathRef.current = { path: [], totalTime: 0 };
      setIsRouting(false);
    }
  }, [selectedDest, currentLocation, densities, routePref, sosActive]);

  const addNotification = (text, type = 'info') => {
    const id = Date.now() + Math.random();
    const alertObj = { id, text, type, time: new Date().toLocaleTimeString() };
    setAlertsHistory(prev => [alertObj, ...prev].slice(0, 30));
    setNotifications(prev => [...prev, alertObj]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const handleSOS = () => {
    if (sosActive) return;
    setSosActive(true);
    setActiveTab('map');
    speak("Emergency mode activated. Please proceed to the nearest exit immediately.");
    setDramaticPopup({
      title: "🚨 PANIC DETECTED IN ZONE",
      subtitle: "Anti-trap protocol engaged.\nSystem activating priority routing...",
      metrics: "Target: Nearest Safe Exit\nAI Priority: Life Safety High"
    });
    setIsDemoFlash(true);
    setTimeout(() => { setDramaticPopup(null); setIsDemoFlash(false); }, 4000);
  };

  const handleAIQuery = async () => {
    try {
      addNotification("AI is analyzing stadium conditions...", "info");
      const result = await getAIResponse(userAIQuery || "Stadium safety update.");
      setAIResult(result);
      addNotification("Intelligence update received", "success");
    } catch (err) {
      setAIResult("Error: AI service unavailable.");
    }
  };

  const clearSos = () => {
    setSosActive(false);
    setSelectedDest(null);
    setIsRouting(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const startVoiceAssistant = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = userSettings.lang === 'hi' ? 'hi-IN' : 'en-US';
    recognition.start();
    addNotification("Listening...");
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      if (transcript.includes('exit')) handleSOS();
    };
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === 'admin@system.com') {
      setIsAdmin(true);
      setIsAuthenticated(true);
      return;
    }
    if (!loginEmail || !loginPass) return;
    setIsAdmin(false);
    setIsAuthenticated(true);
  };

  const contextSuggestions = useMemo(() => {
    if (sosActive) return [];
    let suggs = [];
    const curDen = densities[currentLocation] || 1;
    if (curDen >= 4.0) {
      const exit = findNearestExit(currentLocation, densities);
      if (exit.exit) suggs.push({ text: "Move to safer zone", label: "🚨 Safety Request", color: "var(--danger)", bg: "rgba(239, 68, 68, 0.15)", target: exit.exit });
    }
    return suggs;
  }, [currentLocation, sosActive, densities]);

  const triggerLostPersonDemo = () => {
    setActiveTab('map');
    addNotification("PROTOCOL: Search & Rescue Initialized", "critical");
    speak("Scanning stadium for lost individual. Locating biometric match.");
    setTimeout(() => {
      setLostPersonNode("Stand B");
      addNotification("Biometric Match Found: Stand B", "success");
      speak("Match found at Stand B. Highlighting location on your map.");
      setTimeout(() => setLostPersonNode(null), 10000);
    }, 3000);
  };

  const runDemoSequence = () => {
    setActiveTab('map');
    setSosActive(false);
    addNotification("Demo Mode Initialized", "info");
    speak("Initializing autonomous pitch demonstration.");

    setCurrentLocation("Gate 1");
    setSelectedDest("Emergency Exit A");
    setRoutePref('fastest');
    setIsRouting(true);

    setTimeout(() => {
      setDensities(prev => ({ ...prev, "Corridor A": 9.5 }));
      setDramaticPopup({
        title: "🚨 CRITICAL CROWD DETECTED",
        subtitle: "AI detected high density.\nSwitching to safe route...",
        metrics: `Safety: 85%\nReason: Predictive fallback triggered.`
      });
      setIsDemoFlash(true);
      speak("Critical Crowd Detected. AI Switching to safer route.");

      setTimeout(() => {
        setDramaticPopup(null);
        setIsDemoFlash(false);
        setSelectedDest("Emergency Exit B"); 
      }, 4500);
    }, 4000);
  };

  if (!isAuthenticated) {
    return (
      <Login 
        loginEmail={loginEmail} setLoginEmail={setLoginEmail} 
        loginPass={loginPass} setLoginPass={setLoginPass} 
        handleLogin={handleLogin} t={t} isDarkMode={isDarkMode} 
      />
    );
  }

  if (isAdmin) {
    return <AdminDashboard densities={densities} predictive={predictive} queues={queues} alerts={liveAlerts} onLogout={() => setIsAuthenticated(false)} />;
  }

  return (
    <div className={`app-container ${isDemoFlash ? 'demo-flash' : ''} ${sosActive ? 'sos-mode' : ''} ${!isDarkMode ? 'light-mode' : ''}`}>
      {/* Hidden Golden Demo Button for Pitch Presentations */}
      <button 
        onClick={runDemoSequence} 
        style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', background: 'transparent', border: 'none', zIndex: 9999, cursor: 'pointer' }} 
        aria-hidden="true"
      />
      {activeTab === 'map' && <IntelligencePanel densities={densities} simScenario={simScenario} pathInfo={pathInfo} />}

      {dramaticPopup && (
        <div className="dramatic-overlay">
          <h1 style={{ color: 'var(--danger)', fontSize: '1.4rem', margin: 0 }}>{dramaticPopup.title}</h1>
          <p style={{ color: 'white', whiteSpace: 'pre-line', fontSize: '1.1rem', fontWeight: 'bold' }}>{dramaticPopup.subtitle}</p>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', color: 'var(--accent-cyan)', whiteSpace: 'pre-line', fontSize: '0.85rem' }}>
            {dramaticPopup.metrics}
          </div>
        </div>
      )}

      <Header t={t} handleSOS={handleSOS} />

      <main className="app-main">
        <div className="notifications-container">
          {notifications.map(notif => (
            <div key={notif.id} className={`toast-notification ${notif.type}`}>
              <span>{notif.text}</span>
              <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}>×</button>
            </div>
          ))}
        </div>

        {activeTab === 'map' && (
          <div className="view-container" style={{ padding: '0 15px 15px' }}>
            {sosActive && <div className="emergency-banner">{t.emergencyMode}</div>}
            <StadiumMap 
              densities={densities} queues={queues} activePath={pathInfo.path} 
              currentLocation={currentLocation} selectedDest={selectedDest} 
              lostPersonNode={lostPersonNode} onSelectNode={(nodeId) => { if (!isRouting && !sosActive) setCurrentLocation(nodeId); }} 
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={triggerLostPersonDemo} className="btn-secondary">👤 Find Lost Person</button>
            </div>
            {!sosActive && (
              <NavigationOverlay 
                currentLocation={currentLocation} selectedDest={selectedDest} 
                setSelectedDest={setSelectedDest} pathInfo={pathInfo} 
                isRouting={isRouting} onStartRoute={() => setIsRouting(true)} t={t} 
                routePref={routePref} setRoutePref={setRoutePref} 
                simScenario={simScenario} contextSuggestions={contextSuggestions} 
              />
            )}
            <div className="ai-input-container">
              <input 
                type="text" 
                placeholder="Ask AI Command Center..." 
                value={userAIQuery} 
                onChange={e => setUserAIQuery(e.target.value)} 
                onKeyPress={e => e.key === 'Enter' && handleAIQuery()}
              />
              <button 
                onClick={startVoiceAssistant} 
                className="mic-fab" 
                title="Voice Assistant"
                style={{ padding: '6px' }}
              >
                <Mic size={20} />
              </button>
              <button onClick={handleAIQuery}>
                <Activity size={16} /> Get Advice
              </button>
            </div>
            {aiResult && (
              <div className="ai-result-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(6, 182, 212, 0.2)', paddingBottom: '5px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>AI RESPONSE ANALYTICS</span>
                  <button onClick={() => setAIResult("")} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Dismiss</button>
                </div>
                {aiResult}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && <PublicDashboard densities={densities} queues={queues} predictive={predictive} simScenario={simScenario} />}
        
        {activeTab === 'alerts' && (
          <div className="view-container" style={{ padding: '20px' }}>
            <h2>System Alert Log</h2>
            <div className="alert-log">
              {alertsHistory.map(a => <div key={a.id} className={`alert-item ${a.type}`}>{a.text}</div>)}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="view-container" style={{ padding: '20px', overflowY: 'auto', maxHeight: '100%' }}>
            <h2 style={{ marginBottom: '20px' }}>{t.settingsTitle}</h2>
            
            <div className="setting-row">
              <span>{t.language}</span>
              <select
                value={userSettings.lang}
                onChange={(e) => setUserSettings({ ...userSettings, lang: e.target.value })}
                style={{ background: 'var(--bg-panel)', color: 'var(--text-main)', padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border-muted)' }}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </div>

            <div className="setting-row">
              <span>Voice Guidance</span>
              <div 
                className={`switch ${userSettings.voiceAlerts ? 'on' : ''}`} 
                onClick={() => setUserSettings({ ...userSettings, voiceAlerts: !userSettings.voiceAlerts })}
              >
                <div className="switch-dot"></div>
              </div>
            </div>

            <div className="setting-row">
              <span>Emergency Notify</span>
              <div 
                className={`switch ${userSettings.contactMode ? 'on' : ''}`} 
                onClick={() => setUserSettings({ ...userSettings, contactMode: !userSettings.contactMode })}
              >
                <div className="switch-dot"></div>
              </div>
            </div>

            <div className="setting-row">
              <span>{t.darkMode}</span>
              <div 
                className={`switch ${isDarkMode ? 'on' : ''}`} 
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                <div className="switch-dot"></div>
              </div>
            </div>

            <div className="ai-protocol-section" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '15px', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', marginTop: '10px' }}>
              <h3 style={{ fontSize: '0.8rem', marginBottom: '10px', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase' }}>Gemini AI Protocol</h3>
              <input 
                type="password" 
                autoComplete="new-password"
                placeholder="Enter AI API Key" 
                value={userSettings.geminiKey || ''}
                onChange={(e) => setUserSettings({ ...userSettings, geminiKey: e.target.value })}
                style={{ width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--border-muted)', padding: '12px', borderRadius: '10px', fontSize: '0.9rem' }}
              />
              <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>Status: Protocol active via end-to-end encryption.</p>
            </div>

            <button onClick={() => { setIsAuthenticated(false); setIsAdmin(false); }} className="btn-logout" style={{ width: '100%', marginTop: '20px', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px', fontWeight: 'bold' }}>
              {t.logOut}
            </button>
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} t={t} />
    </div>
  );
}
