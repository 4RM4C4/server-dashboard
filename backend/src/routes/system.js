import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSystemMetrics } from '../collectors/system.js';
import pool from '../db/connection.js';

const router = Router();

// Public: uptime only
router.get('/uptime', async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    res.json({ uptime: metrics.uptime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: full current snapshot
router.get('/', async (req, res) => {
  try {
    res.json(await getSystemMetrics());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: historical data (max 7 days)
router.get('/history', async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours || '24'), 168);
  try {
    const [rows] = await pool.query(
      `SELECT recorded_at, cpu_percent, cpu_temp, ram_used, ram_total,
              disk_used, disk_total, net_rx_bytes, net_tx_bytes, load_avg_1
       FROM system_metrics
       WHERE recorded_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY recorded_at ASC`,
      [hours]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
