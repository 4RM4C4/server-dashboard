import { formatUptime } from '../utils';
import './Header.css';

export default function Header({ connected, uptime, isAdmin, onLogin, onLogout }) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-dot" />
        <span className="header-title">armaca.com.ar</span>
        <span className="header-sub">/ dashboard</span>
      </div>
      <div className="header-right">
        {uptime != null && (
          <span className="header-meta">
            uptime <span className="header-value">{formatUptime(uptime)}</span>
          </span>
        )}
        <span className={`ws-indicator ${connected ? 'connected' : 'disconnected'}`}>
          <span className="ws-dot" />
          {connected ? 'live' : 'connecting'}
        </span>
        {isAdmin ? (
          <button className="btn-header" onClick={onLogout}>logout</button>
        ) : (
          <button className="btn-header accent" onClick={onLogin}>admin</button>
        )}
      </div>
    </header>
  );
}
