import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import ServicesSection from './sections/ServicesSection';
import SystemSection from './sections/SystemSection';
import ContainersSection from './sections/ContainersSection';
import TrafficSection from './sections/TrafficSection';
import LogsSection from './sections/LogsSection';
import ServicesConfigSection from './sections/ServicesConfigSection';
import ContainersPublicSection from './sections/ContainersPublicSection';
import { useWebSocket } from './hooks/useWebSocket';
import { api } from './api/client';
import './App.css';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('dash_token'));
  const [showLogin, setShowLogin] = useState(false);
  const [uptime, setUptime] = useState(null);
  const [health, setHealth] = useState([]);
  const [ssl, setSsl] = useState([]);
  const [system, setSystem] = useState(null);
  const [containers, setContainers] = useState([]);
  const [containersPublic, setContainersPublic] = useState([]);

  const { connected, send } = useWebSocket({
    token,
    onMessage: useCallback((msg) => {
      window.dispatchEvent(new CustomEvent('ws-message', { detail: msg }));
      if (msg.type === 'system_public') setUptime(msg.data.uptime);
      if (msg.type === 'health') setHealth(msg.data);
      if (msg.type === 'system') setSystem(msg.data);
      if (msg.type === 'containers') setContainers(msg.data);
      if (msg.type === 'containers_public') setContainersPublic(msg.data);
    }, []),
  });

  useEffect(() => {
    api.get('/services/health').then(setHealth).catch(() => {});
    api.get('/services/ssl').then(setSsl).catch(() => {});
    api.get('/system/uptime').then((d) => setUptime(d.uptime)).catch(() => {});
  }, []);

  const handleLogin = useCallback((newToken) => {
    localStorage.setItem('dash_token', newToken);
    setToken(newToken);
    setShowLogin(false);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('dash_token');
    setToken(null);
    setSystem(null);
    setContainers([]);
  }, []);

  return (
    <div className="app">
      <Header
        connected={connected}
        uptime={uptime}
        isAdmin={!!token}
        onLogin={() => setShowLogin(true)}
        onLogout={handleLogout}
      />
      <main className="main">
        <ServicesSection health={health} ssl={ssl} />
        <SystemSection system={system} token={token} />
        <TrafficSection token={token} />

        {token ? (
          <>
            <ContainersSection containers={containers} />
            <LogsSection containers={containers} send={send} />
            <ServicesConfigSection token={token} />
          </>
        ) : (
          <>
            <ContainersPublicSection containers={containersPublic} />
            <div className="guest-hint">
              <span className="guest-hint-prompt">&gt;</span>
              <span>
                login as{' '}
                <button className="guest-hint-link" onClick={() => setShowLogin(true)}>
                  admin
                </button>{' '}
                to view live logs and full container details
              </span>
            </div>
          </>
        )}
      </main>

      {showLogin && <LoginModal onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
    </div>
  );
}
