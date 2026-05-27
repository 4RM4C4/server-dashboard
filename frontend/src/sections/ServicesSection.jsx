import StatusBadge from '../components/StatusBadge';
import { latencyColor, sslColor } from '../utils';

export default function ServicesSection({ health, ssl }) {
  const sslMap = Object.fromEntries((ssl || []).map((s) => [s.hostname, s]));

  return (
    <section className="section fade-in">
      <div className="section-title">services</div>
      <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th>service</th>
              <th>status</th>
              <th>latency</th>
              <th>ssl expiry</th>
            </tr>
          </thead>
          <tbody>
            {health.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem' }}>
                  loading...
                </td>
              </tr>
            ) : (
              health.map((s) => {
                const cert = sslMap[s.domain] ?? sslMap[s.url?.replace('https://', '').split('/')[0]];
                return (
                  <tr key={s.name}>
                    <td style={{ fontWeight: 500 }}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text)', textDecoration: 'none' }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--text)'}
                      >
                        {s.domain ?? s.name}
                      </a>
                    </td>
                    <td><StatusBadge healthy={s.healthy} /></td>
                    <td style={{ color: s.healthy ? latencyColor(s.latency) : 'var(--text-muted)' }}>
                      {s.healthy ? `${s.latency}ms` : '—'}
                    </td>
                    <td style={{ color: cert ? sslColor(cert.daysRemaining) : 'var(--text-muted)' }}>
                      {cert?.daysRemaining != null ? `${cert.daysRemaining}d` : '—'}
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
