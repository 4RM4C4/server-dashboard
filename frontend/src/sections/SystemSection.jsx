import { useState, useEffect } from 'react';
import MetricCard from '../components/MetricCard';
import MiniChart from '../components/MiniChart';
import { api } from '../api/client';
import { formatBytes, formatPercent, formatTime, cpuColor, memColor } from '../utils';

export default function SystemSection({ system, token }) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get('/system/history?hours=1')
      .then((rows) =>
        setHistory(
          rows.map((r) => ({
            time: formatTime(r.recorded_at),
            cpu: parseFloat(r.cpu_percent.toFixed(1)),
            ram: parseFloat(((r.ram_used / r.ram_total) * 100).toFixed(1)),
          }))
        )
      )
      .catch(() => {});
  }, [token]);

  const cpuPct = system?.cpu?.percent ?? 0;
  const ramPct = system ? (system.memory.used / system.memory.total) * 100 : 0;
  const diskPct = system ? (system.disk.used / system.disk.total) * 100 : 0;

  return (
    <section className="section fade-in">
      <div className="section-title">system</div>
      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <MetricCard
          label="CPU"
          value={formatPercent(cpuPct)}
          color={cpuColor(cpuPct)}
          bar={cpuPct}
          sub={`load ${system?.loadAvg?.['1m']?.toFixed(2) ?? '—'}`}
        />
        <MetricCard
          label="RAM"
          value={formatPercent(ramPct)}
          color={memColor(ramPct)}
          bar={ramPct}
          sub={`${formatBytes(system?.memory?.used)} / ${formatBytes(system?.memory?.total)}`}
        />
        <MetricCard
          label="Disk"
          value={formatPercent(diskPct)}
          color={diskPct > 85 ? 'var(--red)' : 'var(--yellow)'}
          bar={diskPct}
          sub={`${formatBytes(system?.disk?.used)} / ${formatBytes(system?.disk?.total)}`}
        />
        <MetricCard
          label="Temp"
          value={system?.temperature != null ? system.temperature.toFixed(0) : '—'}
          unit={system?.temperature != null ? '°C' : ''}
          color={
            system?.temperature > 75 ? 'var(--red)'
            : system?.temperature > 60 ? 'var(--yellow)'
            : 'var(--blue)'
          }
          sub={`net ↓${formatBytes(system?.network?.rxSec ?? 0)}/s ↑${formatBytes(system?.network?.txSec ?? 0)}/s`}
        />
      </div>

      {history.length > 1 && (
        <div className="grid-2">
          <div className="card">
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              cpu %
            </div>
            <MiniChart data={history} dataKey="cpu" color="var(--accent)" unit="%" />
          </div>
          <div className="card">
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ram %
            </div>
            <MiniChart data={history} dataKey="ram" color="var(--blue)" unit="%" />
          </div>
        </div>
      )}
    </section>
  );
}
