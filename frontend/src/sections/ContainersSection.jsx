import StatusBadge from '../components/StatusBadge';
import { formatBytes, formatPercent } from '../utils';

export default function ContainersSection({ containers }) {
  return (
    <section className="section fade-in">
      <div className="section-title">
        containers
        <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '0.5rem' }}>
          {containers.filter((c) => c.status === 'running').length}/{containers.length} running
        </span>
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th>name</th>
              <th>project</th>
              <th>url</th>
              <th>status</th>
              <th>cpu</th>
              <th>memory</th>
            </tr>
          </thead>
          <tbody>
            {containers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem' }}>
                  loading...
                </td>
              </tr>
            ) : (
              containers.map((c) => {
                const memPct = c.memLimit > 0 ? (c.memUsed / c.memLimit) * 100 : 0;
                const running = c.status === 'running';
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginRight: '0.4rem' }}>{c.id}</span>
                      {c.service ?? c.name}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {c.project ?? '—'}
                    </td>
                    <td>
                      {c.urls?.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          {c.urls.map((url) => (
                            <a
                              key={url}
                              href={`https://${url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem' }}
                              onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                              onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td><StatusBadge healthy={running} size="sm" /></td>
                    <td style={{ color: c.cpu > 50 ? 'var(--yellow)' : 'var(--text-muted)' }}>
                      {running ? formatPercent(c.cpu) : '—'}
                    </td>
                    <td>
                      {running && c.memUsed > 0 ? (
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
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
