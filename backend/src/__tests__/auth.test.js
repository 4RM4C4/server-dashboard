import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// Stub DB pool before importing app (prevents real DB connection)
vi.mock('../db/connection.js', () => ({
  default: { query: vi.fn(), end: vi.fn() },
}));

// Stub collectors so they don't call real OS/Docker APIs
vi.mock('../collectors/system.js', () => ({
  getSystemMetrics: vi.fn().mockResolvedValue({ uptime: 100, cpu: {}, memory: {}, disk: {}, network: {}, loadAvg: {} }),
}));

vi.mock('../collectors/health.js', () => ({
  checkAllHealth: vi.fn().mockResolvedValue([]),
}));

const HASH_FOR_password123 = '$2a$10$VDBa0GTKndISrgo4hHAtIOPOMSoRLZIiD46QXC.kJKyOAi1/sGN16';

beforeAll(() => {
  process.env.ADMIN_USERNAME = 'admin';
  process.env.ADMIN_PASSWORD_HASH = HASH_FOR_password123;
  process.env.JWT_SECRET = 'test-secret';
});

let app;
beforeAll(async () => {
  const { createApp } = await import('../app.js');
  app = createApp();
});

describe('POST /api/auth/login', () => {
  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for wrong username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hacker', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with JWT token on correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'dashboard123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });
});
