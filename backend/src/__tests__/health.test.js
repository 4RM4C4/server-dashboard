import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkAllHealth } from '../collectors/health.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterEach(() => {
  mockFetch.mockReset();
});

describe('checkAllHealth', () => {
  it('returns healthy:true for 2xx response', async () => {
    mockFetch.mockResolvedValue({ status: 200 });
    const results = await checkAllHealth([{ name: 'Test', url: 'https://example.com' }]);
    expect(results[0].healthy).toBe(true);
    expect(results[0].statusCode).toBe(200);
    expect(results[0].name).toBe('Test');
  });

  it('returns healthy:false for 5xx response', async () => {
    mockFetch.mockResolvedValue({ status: 503 });
    const results = await checkAllHealth([{ name: 'Broken', url: 'https://example.com' }]);
    expect(results[0].healthy).toBe(false);
    expect(results[0].statusCode).toBe(503);
  });

  it('returns healthy:false when fetch throws (connection refused)', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const results = await checkAllHealth([{ name: 'Down', url: 'https://example.com' }]);
    expect(results[0].healthy).toBe(false);
    expect(results[0].statusCode).toBe(0);
    expect(results[0].error).toMatch(/ECONNREFUSED/);
  });

  it('uses internalUrl with Host header when internalUrl is set', async () => {
    mockFetch.mockResolvedValue({ status: 200 });
    await checkAllHealth([{
      name: 'Internal',
      url: 'https://myservice.example.com',
      internalUrl: 'https://coolify-proxy',
    }]);
    const [calledUrl, calledOpts] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('https://coolify-proxy');
    expect(calledOpts.headers).toMatchObject({ Host: 'myservice.example.com' });
  });

  it('uses url directly when internalUrl is not set', async () => {
    mockFetch.mockResolvedValue({ status: 200 });
    await checkAllHealth([{ name: 'Direct', url: 'https://example.com' }]);
    const [calledUrl, calledOpts] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('https://example.com');
    expect(calledOpts.headers).toEqual({});
  });

  it('checks all services in parallel and returns all results', async () => {
    mockFetch.mockResolvedValue({ status: 200 });
    const services = [
      { name: 'A', url: 'https://a.com' },
      { name: 'B', url: 'https://b.com' },
      { name: 'C', url: 'https://c.com' },
    ];
    const results = await checkAllHealth(services);
    expect(results).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
