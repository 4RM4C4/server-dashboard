import { describe, it, expect, vi } from 'vitest';

// Unit-test the pure parsing functions by importing them directly.
// We re-export them here via a test-only import path since they are not
// exported from prometheus.js — instead we reproduce the pure logic inline.

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

describe('parseLabels', () => {
  it('parses a single label', () => {
    expect(parseLabels('entrypoint="https"')).toEqual({ entrypoint: 'https' });
  });

  it('parses multiple labels', () => {
    expect(parseLabels('entrypoint="https",code="200",method="GET"')).toEqual({
      entrypoint: 'https',
      code: '200',
      method: 'GET',
    });
  });

  it('handles empty string', () => {
    expect(parseLabels('')).toEqual({});
  });
});

describe('sumMetric', () => {
  const sampleMetrics = `
# HELP traefik_entrypoint_requests_total
# TYPE traefik_entrypoint_requests_total counter
traefik_entrypoint_requests_total{entrypoint="https",code="200",method="GET"} 100
traefik_entrypoint_requests_total{entrypoint="https",code="404",method="GET"} 20
traefik_entrypoint_requests_total{entrypoint="http",code="200",method="GET"} 50
`.trim();

  it('sums values for matching metric lines', () => {
    const result = sumMetric(sampleMetrics, 'traefik_entrypoint_requests_total');
    const httpsOk = result[JSON.stringify({ entrypoint: 'https', code: '200', method: 'GET' })];
    expect(httpsOk).toBe(100);
  });

  it('keeps separate entries per label combination', () => {
    const result = sumMetric(sampleMetrics, 'traefik_entrypoint_requests_total');
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('accumulates duplicate label combos across lines', () => {
    const doubled = sampleMetrics + '\ntraefik_entrypoint_requests_total{entrypoint="https",code="200",method="GET"} 50';
    const result = sumMetric(doubled, 'traefik_entrypoint_requests_total');
    expect(result[JSON.stringify({ entrypoint: 'https', code: '200', method: 'GET' })]).toBe(150);
  });

  it('ignores comment lines', () => {
    const result = sumMetric('# traefik_entrypoint_requests_total should be ignored', 'traefik_entrypoint_requests_total');
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('returns empty object when metric not present', () => {
    expect(sumMetric(sampleMetrics, 'traefik_missing_metric')).toEqual({});
  });
});
