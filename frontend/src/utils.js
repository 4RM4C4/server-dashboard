export function formatUptime(seconds) {
  if (!seconds) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatPercent(value, decimals = 1) {
  if (value == null) return '—';
  return `${parseFloat(value).toFixed(decimals)}%`;
}

export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function sslColor(days) {
  if (days == null) return 'var(--red)';
  if (days < 10) return 'var(--red)';
  if (days < 30) return 'var(--yellow)';
  return 'var(--green)';
}

export function latencyColor(ms) {
  if (ms > 500) return 'var(--red)';
  if (ms > 200) return 'var(--yellow)';
  return 'var(--green)';
}

export function cpuColor(pct) {
  if (pct > 80) return 'var(--red)';
  if (pct > 60) return 'var(--yellow)';
  return 'var(--accent)';
}

export function memColor(pct) {
  if (pct > 85) return 'var(--red)';
  if (pct > 70) return 'var(--yellow)';
  return 'var(--blue)';
}
