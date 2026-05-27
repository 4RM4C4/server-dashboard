import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import MiniChart from '../components/MiniChart';
import { api } from '../api/client';
import { formatBytes, formatTime } from '../utils';

function cleanServiceName(name) {
  return name.replace(/@\w+$/, '').replace(/-service$/, '');
}

export default function TrafficSection({ token }) {
  const [current, setCurrent] = useState([]);
  const [history, setHistory] = useState([]);
  const [services, setServices] = useState([]);

  useEffect(() => {
    const load = () => {
      api.get('/traefik/traffic').then(setCurrent).catch(() => {});
      api.get('/traefik/requests').then(setServices).catch(() => {});
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
  const totalRpm = services.reduce((s, r) => s + r.rpm, 0);
  const activeServices = services.filter((s) => s.rpm > 0).sort((a, b) => b.rpm - a.rpm);

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

      <div className={activeServices.length > 0 ? 'grid-2' : ''} style={activeServices.length > 0 ? { gridTemplateColumns: '2fr 1fr' } : {}}>
        {history.length > 1 && (
          <div className="card">
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              requests / min
            </div>
            <MiniChart data={history} dataKey="rpm" color="var(--purple)" unit=" rpm" />
          </div>
        )}

        {activeServices.length > 0 && (
          <div className="card">
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              by service
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {activeServices.map((s) => {
                const pct = totalRpm > 0 ? (s.rpm / totalRpm) * 100 : 0;
                return (
                  <div key={s.service}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {cleanServiceName(s.service)}
                      </span>
                      <span style={{ color: 'var(--purple)', flexShrink: 0 }}>{s.rpm} rpm</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--border)', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--purple)', borderRadius: '2px', transition: 'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
