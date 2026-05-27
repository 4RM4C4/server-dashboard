import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

const HASH = await bcrypt.hash('dashboard123', 10);

const mockQuery = vi.fn();

vi.mock('../db/connection.js', () => ({
  default: { query: mockQuery, end: vi.fn() },
}));

vi.mock('../collectors/system.js', () => ({
  getSystemMetrics: vi.fn().mockResolvedValue({ uptime: 100, cpu: {}, memory: {}, disk: {}, network: {}, loadAvg: {} }),
}));

vi.mock('../collectors/health.js', () => ({
  checkAllHealth: vi.fn().mockResolvedValue([]),
}));

vi.mock('../db/services.js', () => ({
  getServices: vi.fn().mockResolvedValue([]),
}));

beforeAll(() => {
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

  it('returns 401 for unknown username', async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no user found
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'hacker', password: 'password123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 401 for wrong password', async () => {
    mockQuery.mockResolvedValueOnce([[{ password_hash: HASH }]]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with JWT token on correct credentials', async () => {
    mockQuery.mockResolvedValueOnce([[{ password_hash: HASH }]]);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'dashboard123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
  });
});
