import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTraefikOverview, getTraefikRouters, getTraefikServices } from '../collectors/traefik.js';
import pool from '../db/connection.js';

const router = Router();

router.get('/overview', requireAuth, async (req, res) => {
  res.json((await getTraefikOverview()) ?? {});
});

router.get('/routers', requireAuth, async (req, res) => {
  res.json((await getTraefikRouters()) ?? []);
});

router.get('/services', requireAuth, async (req, res) => {
  res.json((await getTraefikServices()) ?? []);
});

// Current RPM per service (delta between last two snapshots)
router.get('/requests', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.service,
        GREATEST(0, a.requests_total - COALESCE(b.requests_total, 0)) AS delta,
        TIMESTAMPDIFF(SECOND, COALESCE(b.recorded_at, a.recorded_at), a.recorded_at) AS seconds
      FROM traefik_snapshots a
      LEFT JOIN traefik_snapshots b
        ON b.service = a.service
        AND b.id = (
          SELECT MAX(s.id) FROM traefik_snapshots s
          WHERE s.service = a.service AND s.id < a.id
        )
      WHERE a.id IN (SELECT MAX(id) FROM traefik_snapshots GROUP BY service)
      ORDER BY delta DESC
    `);
    res.json(
      rows.map((r) => ({
        service: r.service,
        rpm: r.seconds > 0 ? Math.round((r.delta / r.seconds) * 60) : 0,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: historical RPM per service (for charts)
router.get('/requests/history', async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours || '1'), 24);
  try {
    const [rows] = await pool.query(`
      SELECT
        a.recorded_at, a.service,
        GREATEST(0, a.requests_total - COALESCE(b.requests_total, 0)) AS delta,
        TIMESTAMPDIFF(SECOND, COALESCE(b.recorded_at, a.recorded_at), a.recorded_at) AS seconds
      FROM traefik_snapshots a
      LEFT JOIN traefik_snapshots b
        ON b.service = a.service
        AND b.id = (SELECT MAX(s.id) FROM traefik_snapshots s WHERE s.service = a.service AND s.id < a.id)
      WHERE a.recorded_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
      ORDER BY a.recorded_at ASC
    `, [hours]);
    res.json(rows.map((r) => ({
      recorded_at: r.recorded_at,
      service: r.service,
      rpm: r.seconds > 0 ? Math.round((r.delta / r.seconds) * 60) : 0,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: current traffic per entrypoint (bandwidth in/out)
router.get('/traffic', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.entrypoint,
        GREATEST(0, a.requests_total - COALESCE(b.requests_total, 0)) AS req_delta,
        GREATEST(0, a.req_bytes    - COALESCE(b.req_bytes,    0)) AS rx_bytes,
        GREATEST(0, a.resp_bytes   - COALESCE(b.resp_bytes,   0)) AS tx_bytes,
        TIMESTAMPDIFF(SECOND, COALESCE(b.recorded_at, a.recorded_at), a.recorded_at) AS seconds
      FROM traefik_traffic a
      LEFT JOIN traefik_traffic b
        ON b.entrypoint = a.entrypoint
        AND b.id = (SELECT MAX(s.id) FROM traefik_traffic s WHERE s.entrypoint = a.entrypoint AND s.id < a.id)
      WHERE a.id IN (SELECT MAX(id) FROM traefik_traffic GROUP BY entrypoint)
    `);
    res.json(rows.map((r) => ({
      entrypoint: r.entrypoint,
      rpm: r.seconds > 0 ? Math.round((r.req_delta / r.seconds) * 60) : 0,
      rxBytesPerSec: r.seconds > 0 ? Math.round(r.rx_bytes / r.seconds) : 0,
      txBytesPerSec: r.seconds > 0 ? Math.round(r.tx_bytes / r.seconds) : 0,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: historical traffic (for charts)
router.get('/traffic/history', async (req, res) => {
  const hours = Math.min(parseInt(req.query.hours || '1'), 24);
  try {
    const [rows] = await pool.query(`
      SELECT
        a.recorded_at, a.entrypoint,
        GREATEST(0, a.requests_total - COALESCE(b.requests_total, 0)) AS req_delta,
        GREATEST(0, a.req_bytes  - COALESCE(b.req_bytes,  0)) AS rx_bytes,
        GREATEST(0, a.resp_bytes - COALESCE(b.resp_bytes, 0)) AS tx_bytes,
        TIMESTAMPDIFF(SECOND, COALESCE(b.recorded_at, a.recorded_at), a.recorded_at) AS seconds
      FROM traefik_traffic a
      LEFT JOIN traefik_traffic b
        ON b.entrypoint = a.entrypoint
        AND b.id = (SELECT MAX(s.id) FROM traefik_traffic s WHERE s.entrypoint = a.entrypoint AND s.id < a.id)
      WHERE a.recorded_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
      ORDER BY a.recorded_at ASC
    `, [hours]);
    res.json(rows.map((r) => ({
      recorded_at: r.recorded_at,
      entrypoint: r.entrypoint,
      rpm: r.seconds > 0 ? Math.round((r.req_delta / r.seconds) * 60) : 0,
      rxBytesPerSec: r.seconds > 0 ? Math.round(r.rx_bytes / r.seconds) : 0,
      txBytesPerSec: r.seconds > 0 ? Math.round(r.tx_bytes / r.seconds) : 0,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
