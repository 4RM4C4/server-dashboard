import { useState, useEffect, useRef } from 'react';
import LogViewer from '../components/LogViewer';

const MAX_LINES = 500;

export default function LogsSection({ containers, send }) {
  const [selectedId, setSelectedId] = useState('');
  const [lines, setLines] = useState([]);
  const activeId = useRef('');

  const running = containers.filter((c) => c.status === 'running');

  useEffect(() => {
    if (running.length > 0 && !selectedId) {
      setSelectedId(running[0].id);
    }
  }, [running.length]);

  useEffect(() => {
    if (!selectedId) return;
    activeId.current = selectedId;
    setLines([]);
    send({ type: 'subscribe_logs', containerId: selectedId });
    return () => send({ type: 'unsubscribe_logs' });
  }, [selectedId, send]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.detail) return;
      const { type, data } = e.detail;
      if (type === 'log' && data.containerId === activeId.current) {
        const newLines = data.line.split('\n').filter(Boolean);
        setLines((prev) => [...prev, ...newLines].slice(-MAX_LINES));
      }
    };
    window.addEventListener('ws-message', handler);
    return () => window.removeEventListener('ws-message', handler);
  }, []);

  return (
    <section className="section fade-in">
      <div className="section-title" style={{ justifyContent: 'space-between' }}>
        <span>logs</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'var(--font)',
            fontSize: '0.72rem',
            padding: '0.2rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
          }}
        >
          {running.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <LogViewer lines={lines} />
    </section>
  );
}
