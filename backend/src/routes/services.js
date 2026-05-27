import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkAllHealth } from '../collectors/health.js';
import { checkAllSSL } from '../collectors/ssl.js';
import pool from '../db/connection.js';
import config from '../config.js';

const router = Router();

// Public: up/down status + latency (no internal URLs exposed)
router.get('/health', async (req, res) => {
  try {
    const results = await checkAllHealth(config.services);
    res.json(
      results.map(({ name, healthy, latency, statusCode }) => ({
        name,
        healthy,
        latency,
        statusCode,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: SSL cert expiration per domain
router.get('/ssl', async (req, res) => {
  try {
    res.json(await checkAllSSL(config.services));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Private: full health details including internal URLs
router.get('/health/full', requireAuth, async (req, res) => {
  try {
    res.json(await checkAllHealth(config.services));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Private: health history
router.get('/health/history', requireAuth, async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours || '24'), 168);
  const service = req.query.service;
  try {
    const [rows] = await pool.query(
      `SELECT recorded_at, service_name, status_code, latency_ms, is_healthy
       FROM health_results
       WHERE recorded_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
         ${service ? 'AND service_name = ?' : ''}
       ORDER BY recorded_at ASC`,
      service ? [hours, service] : [hours]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
