import { WebSocketServer } from 'ws';

const MB = 1024 * 1024;
const GB = 1024 * MB;

const SYSTEM = {
  uptime: 345600,
  cpu: { percent: 45.2, cores: [40, 60, 35, 50, 45, 55, 30, 65] },
  memory: { used: 3.2 * GB, total: 8 * GB, free: 4.8 * GB },
  temperature: 52.3,
  disk: { used: 45 * GB, total: 120 * GB, mounts: [{ mount: '/', used: 45 * GB, total: 120 * GB, percent: 37.5 }] },
  network: { rxSec: 24500, txSec: 8200, rxTotal: 5 * GB, txTotal: 2 * GB, iface: 'eth0' },
  loadAvg: { '1m': 1.2, '5m': 0.9, '15m': 0.8 },
};

const HEALTH = [
  { name: 'armaca.com.ar', url: 'https://armaca.com.ar', healthy: true, statusCode: 200, latency: 45 },
  { name: 'httprequests', url: 'https://httprequests.armaca.com.ar', healthy: true, statusCode: 200, latency: 32 },
  { name: 'dashboard', url: 'https://dashboard.armaca.com.ar', healthy: true, statusCode: 200, latency: 28 },
  { name: 'drafernandez', url: 'https://drafernandezroxana.com.ar', healthy: false, statusCode: 503, latency: 0 },
];

const CONTAINERS = [
  { id: 'a1b2c3d4e5f6', name: 'server-dashboard', image: 'server-dashboard:latest', status: 'running', statusText: 'Up 2 hours', cpu: 2.3, memUsed: 180 * MB, memLimit: 512 * MB, urls: ['dashboard.armaca.com.ar'] },
  { id: 'b2c3d4e5f6a1', name: 'pk3hb6ob7omouvczwn69ikxv', image: 'nginx:alpine', status: 'running', statusText: 'Up 3 days', cpu: 0.1, memUsed: 20 * MB, memLimit: 256 * MB, urls: ['armaca.com.ar'] },
  { id: 'c3d4e5f6a1b2', name: 'rqt1eaqnmbbjpclto7r8qwox', image: 'node:20-alpine', status: 'running', statusText: 'Up 3 days', cpu: 5.2, memUsed: 100 * MB, memLimit: 512 * MB, urls: ['httprequests.armaca.com.ar'] },
  { id: 'd4e5f6a1b2c3', name: 'ol0ip9oomw4h4vibsasvrlfn', image: 'nginx:alpine', status: 'running', statusText: 'Up 3 days', cpu: 0.2, memUsed: 30 * MB, memLimit: 256 * MB, urls: ['drafernandezroxana.com.ar'] },
  { id: 'e5f6a1b2c3d4', name: 'mariadb', image: 'mariadb:11', status: 'running', statusText: 'Up 3 days', cpu: 0.5, memUsed: 150 * MB, memLimit: 512 * MB, urls: [] },
  { id: 'f6a1b2c3d4e5', name: 'coolify-proxy', image: 'traefik:v3', status: 'running', statusText: 'Up 7 days', cpu: 0.3, memUsed: 45 * MB, memLimit: 256 * MB, urls: [] },
];

const CONTAINERS_PUBLIC = [
  { name: 'pk3hb6ob7omouvczwn69ikxv', status: 'running', urls: ['armaca.com.ar'] },
  { name: 'rqt1eaqnmbbjpclto7r8qwox', status: 'running', urls: ['httprequests.armaca.com.ar'] },
  { name: 'ol0ip9oomw4h4vibsasvrlfn', status: 'running', urls: ['drafernandezroxana.com.ar'] },
  { name: 'mariadb', status: 'running', urls: [] },
];

const TRAFFIC = [
  { entrypoint: 'https', rpm: 90, rxBytesPerSec: 24500, txBytesPerSec: 8200 },
];

const REQUESTS = [
  { domain: 'httprequests.armaca.com.ar', total: 12450 },
  { domain: 'dashboard.armaca.com.ar', total: 1523 },
  { domain: 'armaca.com.ar', total: 847 },
  { domain: 'drafernandezroxana.com.ar', total: 234 },
];

function generateHistory() {
  const now = Date.now();
  return Array.from({ length: 60 }, (_, i) => ({
    recorded_at: new Date(now - (59 - i) * 60000).toISOString(),
    service: 'mock',
    rpm: Math.round(Math.random() * 60 + 10),
  }));
}

function json(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.statusCode = 200;
  res.end(JSON.stringify(data));
}

export default function mockPlugin() {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (!url?.startsWith('/api/')) return next();
        if (url === '/api/system/uptime')              return json(res, { uptime: SYSTEM.uptime });
        if (url === '/api/services/health')            return json(res, HEALTH);
        if (url === '/api/services/ssl')               return json(res, []);
        if (url === '/api/traefik/traffic')            return json(res, TRAFFIC);
        if (url === '/api/traefik/requests')           return json(res, REQUESTS);
        if (url === '/api/traefik/requests/history')   return json(res, generateHistory());
        if (url === '/api/traefik/traffic/history')    return json(res, []);
        next();
      });

      server.httpServer?.once('listening', () => {
        const wss = new WebSocketServer({ noServer: true });

        server.httpServer.on('upgrade', (req, socket, head) => {
          if (req.url !== '/ws') return;
          wss.handleUpgrade(req, socket, head, (ws) => {
            const push = (type, data) => ws.readyState === 1 && ws.send(JSON.stringify({ type, data }));

            push('system_public', { uptime: SYSTEM.uptime });
            push('health', HEALTH);
            push('containers_public', CONTAINERS_PUBLIC);

            ws.on('message', (raw) => {
              try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === 'auth') {
                  push('system', SYSTEM);
                  push('containers', CONTAINERS);
                }
              } catch {}
            });

            const interval = setInterval(() => {
              push('system_public', { uptime: SYSTEM.uptime + Math.floor(Date.now() / 1000 % 86400) });
              push('system', { ...SYSTEM, cpu: { ...SYSTEM.cpu, percent: +(Math.random() * 60 + 20).toFixed(1) }, network: { ...SYSTEM.network, rxSec: Math.round(Math.random() * 50000), txSec: Math.round(Math.random() * 20000) } });
            }, 5000);

            ws.on('close', () => clearInterval(interval));
          });
        });
      });
    },
  };
}
