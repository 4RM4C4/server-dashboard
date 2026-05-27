import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const EMPTY_FORM = { name: '', url: '', domain: '', internalUrl: '' };

export default function ServicesConfigSection({ token }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    api.get('/services/config', token).then(setServices).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id, enabled) => {
    await api.patch(`/services/config/${id}`, { enabled: !enabled }, token).catch(() => {});
    load();
  };

  const handleDelete = async (id) => {
    await api.del(`/services/config/${id}`, token).catch(() => {});
    load();
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/services/config', form, token);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section fade-in">
      <div className="section-title">services config</div>

      <div className="card" style={{ padding: 0, marginBottom: '1rem' }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th>domain</th>
              <th>internal url</th>
              <th>enabled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {services.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem' }}>
                  no services configured
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id} style={{ opacity: s.enabled ? 1 : 0.45 }}>
                  <td style={{ fontWeight: 500 }}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--text)', textDecoration: 'none' }}
                      onMouseEnter={(e) => e.target.style.color = 'var(--accent)'}
                      onMouseLeave={(e) => e.target.style.color = 'var(--text)'}
                    >
                      {s.domain}
                    </a>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {s.internalUrl || '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(s.id, s.enabled)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        color: s.enabled ? 'var(--green)' : 'var(--text-dim)',
                        fontSize: '0.75rem', fontFamily: 'inherit',
                      }}
                    >
                      {s.enabled ? '● on' : '○ off'}
                    </button>
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(s.id)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        color: 'var(--text-dim)', fontSize: '0.75rem', fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => e.target.style.color = 'var(--red)'}
                      onMouseLeave={(e) => e.target.style.color = 'var(--text-dim)'}
                    >
                      [ remove ]
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          add service
        </div>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <input
              name="name" value={form.name} onChange={handleChange}
              placeholder="name (e.g. Main Site)"
              required
              style={inputStyle}
            />
            <input
              name="domain" value={form.domain} onChange={handleChange}
              placeholder="domain (e.g. armaca.com.ar)"
              required
              style={inputStyle}
            />
            <input
              name="url" value={form.url} onChange={handleChange}
              placeholder="url (https://...)"
              required
              style={inputStyle}
            />
            <input
              name="internalUrl" value={form.internalUrl} onChange={handleChange}
              placeholder="internal url (optional, http://coolify-proxy)"
              style={inputStyle}
            />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: '0.78rem' }}>{error}</div>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'adding...' : '[ add ]'}
          </button>
        </form>
      </div>
    </section>
  );
}

const inputStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '0.4rem 0.6rem',
  fontFamily: 'inherit',
  fontSize: '0.8rem',
  outline: 'none',
};

const btnStyle = {
  background: 'none',
  border: '1px solid var(--border)',
  color: 'var(--accent)',
  padding: '0.4rem 0.8rem',
  fontFamily: 'inherit',
  fontSize: '0.8rem',
  cursor: 'pointer',
  alignSelf: 'flex-start',
};
