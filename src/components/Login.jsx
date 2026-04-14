import React from 'react';

export default function Login({ 
  loginEmail, 
  setLoginEmail, 
  loginPass, 
  setLoginPass, 
  handleLogin, 
  t, 
  isDarkMode 
}) {
  return (
    <div className={`app-container ${!isDarkMode ? 'light-mode' : ''}`}>
      <main className="app-main emergency-view" style={{ justifyContent: 'center', background: 'var(--bg-dark)' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          marginBottom: '20px', 
          background: 'linear-gradient(to right, var(--text-main), var(--accent-cyan))', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          textAlign: 'center', 
          fontWeight: 'bold' 
        }}>
          {t.appTitle}
        </h1>
        <form 
          onSubmit={handleLogin} 
          style={{ 
            background: 'var(--bg-panel)', 
            padding: '30px', 
            borderRadius: '24px', 
            border: '1px solid var(--border-muted)', 
            width: '85%', 
            maxWidth: '380px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '18px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)' 
          }}
          aria-label="System Login Form"
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{t.signIn}</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label 
              htmlFor="email"
              style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder={t.email}
              aria-label="Enter your email"
              required
              autoComplete="username"
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-muted)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label 
              htmlFor="password"
              style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={t.password}
              aria-label="Enter your password"
              required
              autoComplete="current-password"
              value={loginPass}
              onChange={e => setLoginPass(e.target.value)}
              style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-muted)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-main)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s' }}
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ marginTop: '10px', padding: '14px', fontSize: '1.05rem' }}
            aria-label="Login to System"
          >
            {t.logIn}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Login as <strong>admin@system.com</strong> for Dashboard
          </p>
        </form>
      </main>
    </div>
  );
}
