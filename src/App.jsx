import getAIResponse from './ai';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Map, ShieldAlert, Bell, Settings, Mic, Activity } from 'lucide-react';
import StadiumMap from './components/StadiumMap';
import NavigationOverlay from './components/NavigationOverlay';
import AdminDashboard from './components/AdminDashboard';
import PublicDashboard from './components/PublicDashboard';
import { SimulationEngine } from './utils/SimulationEngine';
import { findShortestPath, findNearestExit, findBestAmenity, calculateConfidence } from './utils/Pathfinding';
import { getStrings } from './utils/i18n';

const loadSettings = () => {
  const s = localStorage.getItem('sca_settings');
  const settings = s ? JSON.parse(s) : { lang: 'en', accessibleNav: false, voiceAlerts: true, contactMode: false, geminiKey: '' };
  
  // Sync with console-entered key if settings key is empty
  if (!settings.geminiKey) {
    settings.geminiKey = localStorage.getItem('GEMINI_API_KEY') || '';
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

    setDensities(engineRef.current.densities);
    setQueues(engineRef.current.queues);

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

  // V4 Smart Panic Detection (Anti-Trap)
  useEffect(() => {
    if (densities[currentLocation] >= 8.0 && !sosActive) {
      setStuckCount(prev => prev + 1);
    } else {
      if (stuckCount > 0) setStuckCount(0); // Reset immediately if safe
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
        addNotification(`Destination is blocked or inaccessible under '${routePref}' criteria.`);
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

          if (improvementMargin > threshold || info.confidence.safetyScore > pathInfo.confidence.safetyScore + 15) {
            addNotification(`AI OPTIMIZATION: Better path found!`, "info");
            addNotification(`Recalculating safest route...`, "info");
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
      setPathInfo({ path: [], totalTime: 0, pref: routePref, confidence: 100 });
      pathRef.current = { path: [], totalTime: 0 };
      setIsRouting(false);
    }
  }, [selectedDest, currentLocation, densities, routePref, sosActive]); // Deliberately omit depends to prevent infinite reroute looping

  const addNotification = (text, type = 'info') => {
    const id = Date.now() + Math.random();
    const alertObj = { id, text, type, time: new Date().toLocaleTimeString() };

    setAlertsHistory(prev => [alertObj, ...prev].slice(0, 30));

    setNotifications(prev => {
      if (type === 'critical') return [alertObj, ...prev.filter(n => n.type !== 'info')];
      return [...prev, alertObj];
    });
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

    if (userSettings.contactMode) {
      addNotification("SOS Alert sent to Emergency Contact via SMS.", "warning");
    }
  };
  const handleAIQuery = async () => {
    try {
      const currentDensity = densities[currentLocation] || 0;
      const riskLevel = simScenario === 'Emergency' ? 'CRITICAL' : simScenario === 'Rush' ? 'WARNING' : 'SAFE';
      
      const systemContext = `System Context: 
      Location: ${currentLocation}
      Crowd Density: ${currentDensity}/10
      Risk Level: ${riskLevel}
      Scenario: ${simScenario}`;

      const finalPrompt = userAIQuery 
        ? `${systemContext}\n\nUser Question: ${userAIQuery}` 
        : `${systemContext}\n\nQuestion: Is the current area safe and what is the best tactical advice for a user here? Keep it concise and professional.`;

      addNotification("AI is analyzing stadium conditions...", "info");
      
      // Use key from settings if available, otherwise fallback to localStorage GEMINI_API_KEY
      const apiKey = userSettings.geminiKey || localStorage.getItem('GEMINI_API_KEY');
      
      if (!apiKey || apiKey === 'YOUR_API_KEY') {
        addNotification("Gemini API Key missing! Check Settings.", "critical");
        setAIResult("Error: No API Key found. Please go to Settings and enter your Gemini API Key.");
        return;
      }

      // We need to pass the key or have ai.js check localStorage
      // Since ai.js already checks localStorage, we can temporarily set it if user just entered it in Settings
      if (userSettings.geminiKey) localStorage.setItem('GEMINI_API_KEY', userSettings.geminiKey);

      const result = await getAIResponse(prompt);
      setAIResult(result);
      addNotification("Intelligence update received", "success");
    } catch (err) {
      console.error(err);
      addNotification(err.message === "API_KEY_INVALID" ? "Invalid Gemini API Key" : "AI analysis interrupted", "warning");
      setAIResult("Error: AI service unavailable. Please check your API configuration.");
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
    if (!SpeechRecognition) {
      addNotification("Voice recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = userSettings.lang === 'hi' ? 'hi-IN' : 'en-US';
    recognition.start();
    addNotification("Listening...");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      addNotification(`Heard: "${transcript}"`);
      if (transcript.includes('exit') || transcript.includes('निकास')) handleSOS();
      else if (transcript.includes('food') || transcript.includes('भोजन')) {
        const amenity = findBestAmenity(currentLocation, 'food', densities, queues, routePref);
        if (amenity.target) setSelectedDest(amenity.target);
      }
      else if (transcript.includes('washroom') || transcript.includes('शौचालय')) {
        const amenity = findBestAmenity(currentLocation, 'washrooms', densities, queues, routePref);
        if (amenity.target) setSelectedDest(amenity.target);
      }
    };
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === 'admin@system.com') {
      setIsAdmin(true);
      setIsAuthenticated(true);
      return;
    }
    if (!loginEmail || !loginPass) {
      addNotification('Invalid input. Please fill all fields.');
      return;
    }
    setIsAdmin(false);
    setIsAuthenticated(true);
  };

  const contextSuggestions = useMemo(() => {
    if (sosActive) return [];
    let suggs = [];

    const curDen = densities[currentLocation] || 1;
    const predDen = predictive[currentLocation] || 1;

    // 4. Safety & 7. Predictive
    if (curDen >= 4.0) {
      const exit = findNearestExit(currentLocation, densities);
      if (exit.exit) suggs.push({ text: "Move to safer zone", label: "🚨 Safety Request", color: "var(--danger)", bg: "rgba(239, 68, 68, 0.15)", target: exit.exit });
    } else if (predDen >= 4.0) {
      suggs.push({ text: "This area will be crowded soon. Move now to avoid rush.", label: "🧠 Predictive Alert", color: "var(--warning)", bg: "rgba(234, 179, 8, 0.15)", target: "Corridor C" }); // General flow relief node
    }

    // Context-Based: Near Food
    if (currentLocation.includes('Gate') || currentLocation.includes('Exit')) {
      const food = findBestAmenity(currentLocation, 'food', densities, queues, 'least_crowded');
      if (food.target && food.queueTime < 4) {
        suggs.push({ text: "Best time to visit food court: now", label: "⏱️ Time-Based", color: "var(--success)", bg: "rgba(34, 197, 94, 0.15)", target: food.target });
      } else if (food.target) {
        suggs.push({ text: `Less crowded food option available`, label: "🍔 Recommendation", color: "var(--accent-cyan)", bg: "rgba(6, 182, 212, 0.15)", target: food.target });
      }
    }

    // Context-Based: Near Exit / Stand
    if (currentLocation.includes('Stand')) {
      const wroomLC = findBestAmenity(currentLocation, 'washrooms', densities, queues, 'least_crowded');
      const wroomNear = findBestAmenity(currentLocation, 'washrooms', densities, queues, 'fastest');

      if (wroomNear.target === wroomLC.target && wroomNear.target) {
        suggs.push({ text: "Nearest available washroom", label: "🚻 Facility", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", target: wroomNear.target });
      } else if (wroomLC.target) {
        suggs.push({ text: "Less crowded washroom available", label: "🚻 Facility", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)", target: wroomLC.target });
      }

      // 3. Smart Exit
      if (simScenario !== 'Normal') {
        const exit = findNearestExit(currentLocation, densities);
        if (exit.exit) suggs.push({ text: `Best exit route available: ${exit.exit} less crowded`, label: "🚪 Smart Exit", color: "var(--success)", bg: "rgba(34, 197, 94, 0.15)", target: exit.exit });
      }
    }

    // Safety Alert - General Overcrowding Warning
    const hotZone = Object.entries(densities).find(([node, d]) => d >= 6.5 && node !== currentLocation);
    if (hotZone) {
      suggs.push({ text: `Avoid ${hotZone[0]} (overcrowded)`, label: "🚨 Safety Alert", color: "var(--danger)", bg: "rgba(239, 68, 68, 0.15)", target: null });
    }

    return suggs;
  }, [currentLocation, sosActive, simScenario, densities, predictive, queues]);

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

    setCurrentLocation("Gate 1");
    setSelectedDest("Emergency Exit A");
    setRoutePref('fastest');
    setIsRouting(true);

    // Perfectly script the dramatic popup 4 seconds later
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
        setSelectedDest("Emergency Exit B"); // Force a visible reroute
      }, 4500);
    }, 4000);
  };

  if (!isAuthenticated) {
    return (
      <div className={`app-container ${!isDarkMode ? 'light-mode' : ''}`}>
        <main className="app-main emergency-view" style={{ justifyContent: 'center', background: 'var(--bg-dark)' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', background: 'linear-gradient(to right, var(--text-main), var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center', fontWeight: 'bold' }}>
            {t.appTitle}
          </h1>
          <form onSubmit={handleLogin} style={{ background: 'var(--bg-panel)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border-muted)', width: '85%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{t.signIn}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input
                type="email"
                placeholder={t.email}
                aria-label="Email input"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-muted)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input
                type="password"
                placeholder={t.password}
                aria-label="Password input"
                value={loginPass}
                onChange={e => setLoginPass(e.target.value)}
                style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-muted)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s' }}
              />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '14px', fontSize: '1.05rem' }}>{t.logIn}</button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Login as admin@system.com for Dashboard</p>
          </form>
        </main>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminDashboard densities={densities} predictive={predictive} queues={queues} alerts={liveAlerts} onLogout={() => setIsAuthenticated(false)} />;
  }

  return (
    <div className={`app-container ${isDemoFlash ? 'demo-flash' : ''} ${sosActive ? 'sos-mode' : ''} ${!isDarkMode ? 'light-mode' : ''}`}>
      {/* Hidden Golden Demo Button */}
      <button onClick={runDemoSequence} style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '40px', background: 'transparent', border: 'none', zIndex: 99999, cursor: 'pointer' }} />

      {/* AI Intelligence Insight Panel */}
      {activeTab === 'map' && (
        <div className="ai-panel-slide" style={{ position: 'absolute', top: '80px', left: '15px', zIndex: 100, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border-muted)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', minWidth: '150px' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Activity size={12} /> AI Intelligence Live
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Crowd Load:</span>
              <span style={{ fontWeight: 'bold', color: Object.values(densities).filter(d => d >= 5).length > 2 ? 'var(--danger)' : 'var(--success)' }}>
                {Math.round((Object.values(densities).reduce((a, b) => a + (b || 0), 0) / (Object.keys(densities).length || 1)) * 10)}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Risk Level:</span>
              <span style={{ fontWeight: 'bold', color: simScenario === 'Emergency' ? 'var(--danger)' : simScenario === 'Rush' ? 'var(--warning)' : 'var(--success)' }}>
                {simScenario === 'Emergency' ? 'CRITICAL' : simScenario === 'Rush' ? 'WARNING' : 'SAFE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Confidence:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-cyan)' }}>{pathInfo?.confidence?.safetyScore || 98}%</span>
            </div>
          </div>
        </div>
      )}

      {dramaticPopup && (
        <div className="dramatic-overlay">
          <h1 style={{ color: 'var(--danger)', fontSize: '1.4rem', margin: 0 }}>{dramaticPopup.title}</h1>
          <p style={{ color: 'white', whiteSpace: 'pre-line', fontSize: '1.1rem', fontWeight: 'bold' }}>{dramaticPopup.subtitle}</p>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '8px', color: 'var(--accent-cyan)', whiteSpace: 'pre-line', fontSize: '0.85rem' }}>
            {dramaticPopup.metrics}
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="header-content">
          <h1>{t.appTitle}</h1>
          <button className="sos-btn-small" onClick={handleSOS}>
            <ShieldAlert size={20} /> {t.sosBtn}
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="notifications-container" style={{ position: 'absolute', top: 10, left: 15, right: 15, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifications.map(notif => (
            <div key={notif.id} className="toast-notification" style={{
              position: 'relative',
              background: notif.type === 'critical' ? 'var(--danger)' : notif.type === 'warning' ? '#eab308' : 'var(--bg-translucent)',
              color: 'white', padding: '12px 15px', borderRadius: '8px',
              border: notif.type === 'info' ? '1px solid var(--border-muted)' : 'none',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              {notif.type === 'critical' ? <ShieldAlert size={20} /> : <Bell size={18} />}
              <span style={{ fontSize: '0.85rem', fontWeight: notif.type === 'info' ? 'normal' : 'bold', flex: 1 }}>{notif.text}</span>
              <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>

        {activeTab === 'map' && (
          <div className="view-container" style={{ padding: '0 15px 15px' }}>
            {sosActive && (
              <div className="emergency-banner" style={{ background: 'var(--danger)', color: 'white', padding: '10px', borderRadius: '8px', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                {t.emergencyMode}
              </div>
            )}

            <StadiumMap
              densities={densities} queues={queues} activePath={pathInfo.path}
              currentLocation={currentLocation} selectedDest={selectedDest}
              lostPersonNode={lostPersonNode}
              onSelectNode={(nodeId) => { if (!isRouting && !sosActive) setCurrentLocation(nodeId); }}
            />

            {/* Quick Intelligence Boost Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={triggerLostPersonDemo} style={{ flex: 1, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                👤 Find Lost Person
              </button>
              <button onClick={() => speak(`AI Analysis: route safety is ${pathInfo?.confidence?.safetyScore}%. Recommended due to ${pathInfo?.confidence?.text}`)} style={{ flex: 1, background: 'rgba(6, 182, 212, 0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', padding: '8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                🔊 Voice Intel
              </button>
            </div>



            {!sosActive && (
              <NavigationOverlay
                currentLocation={currentLocation} selectedDest={selectedDest}
                setSelectedDest={(dest) => { setSelectedDest(dest); if (!dest) setIsRouting(false); }}
                pathInfo={pathInfo} isRouting={isRouting} onStartRoute={() => setIsRouting(true)} t={t}
                routePref={routePref} setRoutePref={setRoutePref}
                simScenario={simScenario} contextSuggestions={contextSuggestions}
              />
            )}
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="Ask Gemini anything about the stadium..." 
                value={userAIQuery}
                onChange={(e) => setUserAIQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-muted)',
                  color: 'var(--text-main)',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent-cyan)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--border-muted)'}
              />
              <button 
                onClick={handleAIQuery}
                style={{
                  width: '100%',
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid var(--accent-cyan)',
                  color: 'var(--accent-cyan)',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Activity size={16} /> {userAIQuery ? 'Get AI Answer' : '🤖 Ask Gemini AI'}
              </button>
            </div>

            {aiResult && (
              <div style={{ 
                marginTop: '15px', 
                padding: '15px', 
                background: 'rgba(6, 182, 212, 0.05)', 
                borderRadius: '12px', 
                border: '1px solid rgba(6, 182, 212, 0.2)',
                fontSize: '0.85rem', 
                color: 'var(--text-main)',
                lineHeight: '1.5',
                position: 'relative',
                animation: 'ai-slide 0.4s ease-out'
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Activity size={12} /> INTELLIGENCE BREIFING
                </div>
                {aiResult}
                <button 
                  onClick={() => setAIResult("")}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', color: 'var(--text-muted)', fontSize: '1rem' }}
                >×</button>
              </div>
            )}

            {sosActive && (
              <div style={{ marginTop: '10px', textAlign: 'center' }}>
                <p style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '10px' }}>{t.followPath}</p>
                <button className="btn-cancel" style={{ background: 'var(--border-muted)', border: 'none', color: 'var(--text-main)', padding: '10px 20px', borderRadius: '8px' }} onClick={clearSos}>{t.cancelSos}</button>
              </div>
            )}

            <button
              onClick={startVoiceAssistant}
              style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 100 }}
            ><Mic size={24} /></button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <PublicDashboard densities={densities} queues={queues} predictive={predictive} simScenario={simScenario} />
        )}

        {activeTab === 'alerts' && (
          <div className="view-container" style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
            <h2>System Alert Log</h2>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alertsHistory.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No recent alerts logged.</p>}
              {alertsHistory.map(a => (
                <div key={a.id} style={{ background: 'var(--bg-translucent)', padding: '12px', borderRadius: '8px', borderLeft: `4px solid ${a.type === 'critical' ? 'var(--danger)' : a.type === 'warning' ? '#eab308' : 'var(--accent-cyan)'}` }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 'bold', textTransform: 'uppercase' }}>{a.time} - {a.type}</div>
                  <div style={{ fontSize: '0.9rem' }}>{a.text}</div>
                  {a.type === 'critical' && (
                    <button onClick={() => { setActiveTab('map'); handleSOS(); }} style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      👉 View Safe Route
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="view-container" style={{ padding: '20px' }}>
            <h2>{t.settingsTitle}</h2>
            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-translucent)', borderRadius: '12px' }}>
                <span>{t.language}</span>
                <select
                  value={userSettings.lang}
                  onChange={(e) => setUserSettings({ ...userSettings, lang: e.target.value })}
                  style={{ background: 'var(--bg-panel)', color: 'var(--text-main)', padding: '5px', borderRadius: '5px', border: '1px solid var(--border-muted)' }}
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-translucent)', borderRadius: '12px' }}>
                <span>Voice Guidance</span>
                <div onClick={() => setUserSettings({ ...userSettings, voiceAlerts: !userSettings.voiceAlerts })} style={{ width: '40px', height: '22px', background: userSettings.voiceAlerts ? 'var(--accent-cyan)' : '#ccc', borderRadius: '15px', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', right: userSettings.voiceAlerts ? '2px' : 'auto', left: userSettings.voiceAlerts ? 'auto' : '2px', top: '2px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s' }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-translucent)', borderRadius: '12px' }}>
                <span>Notify Emergency Contact</span>
                <div onClick={() => setUserSettings({ ...userSettings, contactMode: !userSettings.contactMode })} style={{ width: '40px', height: '22px', background: userSettings.contactMode ? 'var(--accent-cyan)' : '#ccc', borderRadius: '15px', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', right: userSettings.contactMode ? '2px' : 'auto', left: userSettings.contactMode ? 'auto' : '2px', top: '2px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s' }}></div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px', background: 'var(--bg-translucent)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Gemini API Key</span>
                  <span style={{ fontSize: '0.7rem', color: userSettings.geminiKey ? 'var(--success)' : 'var(--danger)' }}>
                    {userSettings.geminiKey ? '✓ Configured' : '⚠ Missing'}
                  </span>
                </div>
                <input 
                  type="password" 
                  placeholder="Paste your API key here" 
                  value={userSettings.geminiKey || ''}
                  onChange={(e) => setUserSettings({ ...userSettings, geminiKey: e.target.value })}
                  style={{ background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid var(--border-muted)', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}
                />
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Get a key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)' }}>Google AI Studio</a></p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'var(--bg-translucent)', borderRadius: '12px' }}>
                <span>{t.darkMode}</span>
                <div onClick={() => setIsDarkMode(!isDarkMode)} style={{ width: '40px', height: '22px', background: isDarkMode ? 'var(--accent-cyan)' : '#ccc', borderRadius: '15px', position: 'relative', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', right: isDarkMode ? '2px' : 'auto', left: isDarkMode ? 'auto' : '2px', top: '2px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'all 0.3s' }}></div>
                </div>
              </div>
              <button onClick={() => { setIsAuthenticated(false); setIsAdmin(false); }} style={{ padding: '15px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px', marginTop: '20px', fontWeight: 'bold' }}>
                {t.logOut}
              </button>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <Map size={24} /><span>{t.navMap}</span>
        </button>
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Activity size={24} /><span>Data</span>
        </button>
        <button className={`nav-item ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          <Bell size={24} /><span>Alerts</span>
        </button>
        <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={24} /><span>{t.navSettings}</span>
        </button>
      </nav>
    </div>
  );
}
