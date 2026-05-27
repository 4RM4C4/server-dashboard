import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getContainers } from '../collectors/docker.js';
import pool from '../db/connection.js';

const router = Router();

router.get('/containers', requireAuth, async (req, res) => {
  try {
    res.json(await getContainers());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/containers/history', requireAuth, async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours || '24'), 168);
  const name = req.query.name;
  try {
    const [rows] = await pool.query(
      `SELECT recorded_at, container_name, cpu_percent, mem_used, mem_limit, status
       FROM container_metrics
       WHERE recorded_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
         ${name ? 'AND container_name = ?' : ''}
       ORDER BY recorded_at ASC`,
      name ? [hours, name] : [hours]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
