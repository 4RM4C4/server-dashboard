import cron from 'node-cron';
import pool from '../db/connection.js';
import config from '../config.js';

async function cleanup() {
  const days = config.retentionDays;
  try {
    const [r1] = await pool.query(
      'DELETE FROM system_metrics WHERE recorded_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    const [r2] = await pool.query(
      'DELETE FROM container_metrics WHERE recorded_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    const [r3] = await pool.query(
      'DELETE FROM health_results WHERE recorded_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    const [r4] = await pool.query(
      'DELETE FROM traefik_snapshots WHERE recorded_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    const [r5] = await pool.query(
      'DELETE FROM traefik_traffic WHERE recorded_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );
    console.log(
      `Cleanup: removed ${r1.affectedRows} system, ${r2.affectedRows} container, ${r3.affectedRows} health, ${r4.affectedRows + r5.affectedRows} traefik records`
    );
  } catch (err) {
    console.error('Cleanup job error:', err.message);
  }
}

export function startCleanup() {
  // Runs daily at 3:00 AM
  cron.schedule('0 3 * * *', cleanup);
  console.log('Cleanup job scheduled (daily at 03:00)');
}
