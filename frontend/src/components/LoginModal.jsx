import { useState } from 'react';
import { api } from '../api/client';
import './LoginModal.css';

export default function LoginModal({ onLogin, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.post('/auth/login', { username, password });
      onLogin(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">authenticate</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-field">
            <span className="modal-prompt">&gt; username:</span>
            <input
              className="modal-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="modal-field">
            <span className="modal-prompt">&gt; password:</span>
            <input
              className="modal-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && <div className="modal-error">{error}</div>}
          <button className="modal-submit" type="submit" disabled={loading}>
            {loading ? 'authenticating...' : '[ enter ]'}
          </button>
        </form>
      </div>
    </div>
  );
}
