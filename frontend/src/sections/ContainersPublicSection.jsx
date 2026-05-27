import StatusBadge from '../components/StatusBadge';
import { formatBytes, formatPercent } from '../utils';

export default function ContainersPublicSection({ containers }) {
  if (!containers.length) return null;

  const running = containers.filter((c) => c.status === 'running').length;

  return (
    <section className="section fade-in">
      <div className="section-title">
        containers
        <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '0.5rem' }}>
          {running}/{containers.length} running
        </span>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th>service</th>
              <th>status</th>
              <th>cpu</th>
              <th>memory</th>
            </tr>
          </thead>
          <tbody>
            {containers.map((c, i) => {
              const memPct = c.memLimit > 0 ? (c.memUsed / c.memLimit) * 100 : 0;
              const isRunning = c.status === 'running';
              const displayName = c.urls?.length ? c.urls[0] : c.name;
              const isUrl = !!c.urls?.length;
              return (
                <tr key={i} style={{ opacity: isRunning ? 1 : 0.45 }}>
                  <td style={{ fontWeight: 500 }}>
                    {isUrl ? (
                      <a
                        href={`https://${displayName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text)', textDecoration: 'none' }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text)'}
                      >
                        {displayName}
                      </a>
                    ) : (
                      <span>
                        {displayName}
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginLeft: '0.4rem', fontWeight: 400 }}>internal</span>
                      </span>
                    )}
                  </td>
                  <td><StatusBadge healthy={isRunning} size="sm" /></td>
                  <td style={{ color: c.cpu > 50 ? 'var(--yellow)' : 'var(--text-muted)' }}>
                    {isRunning ? formatPercent(c.cpu) : '—'}
                  </td>
                  <td>
                    {isRunning && c.memUsed > 0 ? (
                      <span>
                        <span style={{ color: memPct > 80 ? 'var(--red)' : 'var(--text)' }}>
                          {formatBytes(c.memUsed)}
                        </span>
                        {c.memLimit > 0 && (
                          <span style={{ color: 'var(--text-dim)' }}> / {formatBytes(c.memLimit)}</span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
