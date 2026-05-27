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
              <th>status</th>
              <th>cpu</th>
              <th>memory</th>
              <th>image</th>
            </tr>
          </thead>
          <tbody>
            {containers.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem' }}>
                  loading...
                </td>
              </tr>
            ) : (
              containers.map((c) => {
                const memPct = c.memLimit > 0 ? (c.memUsed / c.memLimit) * 100 : 0;
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginRight: '0.4rem' }}>{c.id}</span>
                      {c.name}
                    </td>
                    <td><StatusBadge healthy={c.status === 'running'} size="sm" /></td>
                    <td style={{ color: c.cpu > 50 ? 'var(--yellow)' : 'var(--text-muted)' }}>
                      {c.status === 'running' ? formatPercent(c.cpu) : '—'}
                    </td>
                    <td>
                      {c.status === 'running' && c.memLimit > 0 ? (
                        <span>
                          <span style={{ color: memPct > 80 ? 'var(--red)' : 'var(--text)' }}>
                            {formatBytes(c.memUsed)}
                          </span>
                          <span style={{ color: 'var(--text-dim)' }}> / {formatBytes(c.memLimit)}</span>
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {c.image.split(':')[0].split('/').pop()}
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
