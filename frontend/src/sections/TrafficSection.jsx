import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import MiniChart from '../components/MiniChart';
import { api } from '../api/client';
import { formatBytes, formatTime } from '../utils';

export default function TrafficSection({ token }) {
  const [current, setCurrent] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const load = () => {
      api.get('/traefik/traffic').then(setCurrent).catch(() => {});
      api.get('/traefik/requests/history?hours=1')
        .then((rows) => {
          const byTime = {};
          for (const r of rows) {
            const t = formatTime(r.recorded_at);
            if (!byTime[t]) byTime[t] = { time: t, rpm: 0 };
            byTime[t].rpm += r.rpm;
          }
          setHistory(Object.values(byTime));
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const https = current.find((e) => e.entrypoint === 'https') ?? {};

  return (
    <section className="section fade-in">
      <div className="section-title">traffic</div>
      <div className="grid-3" style={{ marginBottom: '1rem' }}>
        <MetricCard
          label="Requests / min"
          value={https.rpm ?? 0}
          unit=" rpm"
          color="var(--purple)"
        />
        <MetricCard
          label="Bandwidth ↓ in"
          value={formatBytes(https.rxBytesPerSec ?? 0)}
          unit="/s"
          color="var(--green)"
        />
        <MetricCard
          label="Bandwidth ↑ out"
          value={formatBytes(https.txBytesPerSec ?? 0)}
          unit="/s"
          color="var(--yellow)"
        />
      </div>

      {history.length > 1 && (
        <div className="card">
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            requests / min
          </div>
          <MiniChart data={history} dataKey="rpm" color="var(--purple)" unit=" rpm" />
        </div>
      )}
    </section>
  );
}
