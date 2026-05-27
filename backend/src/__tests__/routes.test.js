import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret';

vi.mock('../db/connection.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue([[]]),
    end: vi.fn(),
  },
}));

vi.mock('../collectors/system.js', () => ({
  getSystemMetrics: vi.fn().mockResolvedValue({
    uptime: 12345,
    cpu: { percent: 10, cores: [] },
    memory: { used: 1e9, total: 8e9, free: 7e9 },
    temperature: 55,
    disk: { used: 20e9, total: 100e9, mounts: [] },
    network: { rxSec: 0, txSec: 0, rxTotal: 0, txTotal: 0, iface: 'eth0' },
    loadAvg: { '1m': 0.1, '5m': 0.2, '15m': 0.3 },
  }),
}));

vi.mock('../collectors/health.js', () => ({
  checkAllHealth: vi.fn().mockResolvedValue([
    { name: 'test', healthy: true, latency: 50, statusCode: 200, domain: 'example.com', daysLeft: 30 },
  ]),
}));

vi.mock('../collectors/ssl.js', () => ({
  checkSslExpiry: vi.fn().mockResolvedValue([]),
}));

vi.mock('../collectors/docker.js', () => ({
  getContainers: vi.fn().mockResolvedValue([]),
}));

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD_HASH = '$2a$10$VDBa0GTKndISrgo4hHAtIOPOMSoRLZIiD46QXC.kJKyOAi1/sGN16';
});

let app;
beforeAll(async () => {
  const { createApp } = await import('../app.js');
  app = createApp();
});

function adminToken() {
  return jwt.sign({ username: 'admin' }, TEST_SECRET, { expiresIn: '1h' });
}

describe('Public routes (no auth required)', () => {
  it('GET /health → 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/system → 200', async () => {
    const res = await request(app).get('/api/system');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /api/system/uptime → 200', async () => {
    const res = await request(app).get('/api/system/uptime');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('uptime');
  });

  it('GET /api/system/history → 200', async () => {
    const res = await request(app).get('/api/system/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('Protected routes (require auth)', () => {
  it('GET /api/docker/containers → 401 without token', async () => {
    const res = await request(app).get('/api/docker/containers');
    expect(res.status).toBe(401);
  });

  it('GET /api/docker/containers → 200 with valid token', async () => {
    const res = await request(app)
      .get('/api/docker/containers')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/docker/containers → 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/docker/containers')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
