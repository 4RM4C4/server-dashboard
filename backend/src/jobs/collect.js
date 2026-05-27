import cron from 'node-cron';
import { getSystemMetrics } from '../collectors/system.js';
import { getContainers } from '../collectors/docker.js';
import { checkAllHealth } from '../collectors/health.js';
import { getServiceRequestMetrics, getEntrypointTrafficMetrics } from '../collectors/prometheus.js';
import pool from '../db/connection.js';
import config from '../config.js';

const num = (v) => (Number.isFinite(v) ? v : null);

async function collectAll() {
  const [system, containers, health, traefikServices, traefikTraffic] = await Promise.allSettled([
    getSystemMetrics(),
    getContainers(),
    checkAllHealth(config.services),
    getServiceRequestMetrics(),
    getEntrypointTrafficMetrics(),
  ]);

  try {
    if (system.status === 'fulfilled') {
      const s = system.value;
      await pool.query(
        `INSERT INTO system_metrics
           (cpu_percent, cpu_temp, ram_used, ram_total, disk_used, disk_total,
            net_rx_bytes, net_tx_bytes, load_avg_1)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          num(s.cpu.percent),
          num(s.temperature),
          num(s.memory.used),
          num(s.memory.total),
          num(s.disk.used),
          num(s.disk.total),
          num(s.network.rxTotal),
          num(s.network.txTotal),
          num(s.loadAvg['1m']),
        ]
      );
    }

    if (containers.status === 'fulfilled') {
      for (const c of containers.value.filter((c) => c.status === 'running')) {
        await pool.query(
          `INSERT INTO container_metrics
             (container_id, container_name, cpu_percent, mem_used, mem_limit, status)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [c.id, c.name, num(c.cpu), num(c.memUsed), num(c.memLimit), c.status]
        );
      }
    }

    if (health.status === 'fulfilled') {
      for (const h of health.value) {
        await pool.query(
          `INSERT INTO health_results
             (service_name, url, status_code, latency_ms, is_healthy)
           VALUES (?, ?, ?, ?, ?)`,
          [h.name, h.url, h.statusCode, h.latency, h.healthy ? 1 : 0]
        );
      }
    }

    if (traefikServices.status === 'fulfilled' && traefikServices.value) {
      for (const { service, total } of traefikServices.value) {
        await pool.query(
          'INSERT INTO traefik_snapshots (service, requests_total) VALUES (?, ?)',
          [service, total]
        );
      }
    }

    if (traefikTraffic.status === 'fulfilled' && traefikTraffic.value) {
      for (const { entrypoint, requests_total, req_bytes, resp_bytes } of traefikTraffic.value) {
        await pool.query(
          'INSERT INTO traefik_traffic (entrypoint, requests_total, req_bytes, resp_bytes) VALUES (?, ?, ?, ?)',
          [entrypoint, requests_total, req_bytes, resp_bytes]
        );
      }
    }
  } catch (err) {
    console.error('Collect job DB error:', err.message);
  }
}

export function startCollector() {
  cron.schedule('* * * * *', collectAll);
  collectAll().catch((err) => console.error('Initial collect error:', err.message));
  console.log('Metrics collector started (every 60s)');
}
