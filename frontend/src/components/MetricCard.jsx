import './MetricCard.css';

export default function MetricCard({ label, value, unit, sub, color, bar }) {
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color: color || 'var(--text)' }}>
        {value ?? '—'}
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {bar != null && (
        <div className="metric-bar-track">
          <div
            className="metric-bar-fill"
            style={{ width: `${Math.min(bar, 100)}%`, background: color || 'var(--accent)' }}
          />
        </div>
      )}
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  );
}
