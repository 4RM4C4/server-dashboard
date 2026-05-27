const BASE = import.meta.env.VITE_API_URL || '';

export const WS_URL =
  BASE
    ? BASE.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws'
    : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

async function request(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path, token) => request('GET', path, { token }),
  post: (path, body) => request('POST', path, { body }),
};
