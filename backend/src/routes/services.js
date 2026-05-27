import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { checkAllHealth } from '../collectors/health.js';
import { checkAllSSL } from '../collectors/ssl.js';
import { getServices } from '../db/services.js';
import pool from '../db/connection.js';

const router = Router();

// Public: up/down status + latency + url/domain for display
router.get('/health', async (req, res) => {
  try {
    const services = await getServices();
    const results = await checkAllHealth(services);
    res.json(
      results.map(({ name, url, domain, healthy, latency, statusCode }) => ({
        name, url, domain, healthy, latency, statusCode,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: SSL cert expiration per domain
router.get('/ssl', async (req, res) => {
  try {
    res.json(await checkAllSSL(await getServices()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: historical health data
router.get('/health/history', async (req, res) => {
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

// Admin: full service config list (includes internalUrl)
router.get('/config', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, url, domain, internal_url AS internalUrl, enabled
       FROM monitored_services ORDER BY id ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: add service
router.post('/config', requireAuth, async (req, res) => {
  const { name, url, domain, internalUrl } = req.body ?? {};
  if (!name || !url || !domain) {
    return res.status(400).json({ error: 'name, url and domain are required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO monitored_services (name, url, domain, internal_url) VALUES (?, ?, ?, ?)',
      [name, url, domain, internalUrl || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: toggle enabled / update fields
router.patch('/config/:id', requireAuth, async (req, res) => {
  const { name, url, domain, internalUrl, enabled } = req.body ?? {};
  const fields = [];
  const values = [];
  if (name !== undefined) { fields.push('name = ?'); values.push(name); }
  if (url !== undefined) { fields.push('url = ?'); values.push(url); }
  if (domain !== undefined) { fields.push('domain = ?'); values.push(domain); }
  if (internalUrl !== undefined) { fields.push('internal_url = ?'); values.push(internalUrl || null); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  try {
    await pool.query(`UPDATE monitored_services SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: delete service
router.delete('/config/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM monitored_services WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
