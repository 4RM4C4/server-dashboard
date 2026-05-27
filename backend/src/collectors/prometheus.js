import config from '../config.js';

async function fetchMetrics() {
  const res = await fetch(`${config.traefikApiUrl}/metrics`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function parseLabels(str) {
  const labels = {};
  const re = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(str)) !== null) labels[m[1]] = m[2];
  return labels;
}

function sumMetric(text, metricName) {
  const totals = {};
  for (const line of text.split('\n')) {
    if (line.startsWith('#') || !line.includes(metricName)) continue;
    const match = line.match(new RegExp(`${metricName}\\{([^}]+)\\}\\s+([\\d.e+]+)`));
    if (!match) continue;
    const labels = parseLabels(match[1]);
    const value = parseFloat(match[2]);
    const key = JSON.stringify(labels);
    totals[key] = (totals[key] ?? 0) + value;
  }
  return totals;
}

// Returns per-service request totals (aggregated across status codes and methods)
export async function getServiceRequestMetrics() {
  try {
    const text = await fetchMetrics();
    const raw = sumMetric(text, 'traefik_service_requests_total');
    const byService = {};
    for (const [key, count] of Object.entries(raw)) {
      const labels = JSON.parse(key);
      const service = labels.service ?? 'unknown';
      byService[service] = (byService[service] ?? 0) + count;
    }
    return Object.entries(byService).map(([service, total]) => ({ service, total }));
  } catch {
    return null;
  }
}

// Returns per-entrypoint request counts and bytes (for traffic tracking)
export async function getEntrypointTrafficMetrics() {
  try {
    const text = await fetchMetrics();

    const reqCounts = sumMetric(text, 'traefik_entrypoint_requests_total');
    const reqBytes = sumMetric(text, 'traefik_entrypoint_requests_bytes_total');
    const respBytes = sumMetric(text, 'traefik_entrypoint_responses_bytes_total');

    const byEntrypoint = {};

    const aggregate = (raw, field) => {
      for (const [key, value] of Object.entries(raw)) {
        const labels = JSON.parse(key);
        const ep = labels.entrypoint ?? 'unknown';
        if (!byEntrypoint[ep]) byEntrypoint[ep] = { requests_total: 0, req_bytes: 0, resp_bytes: 0 };
        byEntrypoint[ep][field] += value;
      }
    };

    aggregate(reqCounts, 'requests_total');
    aggregate(reqBytes, 'req_bytes');
    aggregate(respBytes, 'resp_bytes');

    return Object.entries(byEntrypoint).map(([entrypoint, data]) => ({
      entrypoint,
      ...data,
    }));
  } catch {
    return null;
  }
}
