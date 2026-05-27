import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { getSystemMetrics } from './collectors/system.js';
import { getContainers } from './collectors/docker.js';
import { checkAllHealth } from './collectors/health.js';
import { streamLogs } from './collectors/docker.js';
import { getServices } from './db/services.js';
import config from './config.js';

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let authenticated = false;
    let logStream = null;
    let publicTimer = null;
    let privateTimer = null;

    const send = (type, data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type, data }));
      }
    };

    async function pushPublic() {
      const [system, services] = await Promise.allSettled([
        getSystemMetrics(),
        getServices(),
      ]);
      if (system.status === 'fulfilled') {
        send('system', system.value);
      }
      if (services.status === 'fulfilled') {
        const health = await checkAllHealth(services.value).catch(() => []);
        send('health', health.map(({ name, url, domain, healthy, latency, statusCode }) => ({
          name, url, domain, healthy, latency, statusCode,
        })));
      }
    }

    async function pushPrivate() {
      const [system, containers] = await Promise.allSettled([
        getSystemMetrics(),
        getContainers(),
      ]);
      if (system.status === 'fulfilled') send('system', system.value);
      if (containers.status === 'fulfilled') send('containers', containers.value);
    }

    // Public stream: full system + health for everyone
    publicTimer = setInterval(pushPublic, 5000);
    pushPublic().catch(() => {});

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'auth') {
          const user = verifyToken(msg.token);
          if (user) {
            authenticated = true;
            send('auth', { success: true });
            // Private stream: containers (names/IDs/details) for admin only
            privateTimer = setInterval(pushPrivate, 5000);
            pushPrivate().catch(() => {});
          } else {
            send('auth', { success: false });
          }
        }

        if (msg.type === 'subscribe_logs' && authenticated) {
          if (logStream) logStream.destroy();
          streamLogs(
            msg.containerId,
            (line) => send('log', { containerId: msg.containerId, line }),
            () => send('log_end', { containerId: msg.containerId })
          )
            .then((stream) => { logStream = stream; })
            .catch((err) => send('log_error', { error: err.message }));
        }

        if (msg.type === 'unsubscribe_logs') {
          if (logStream) { logStream.destroy(); logStream = null; }
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      clearInterval(publicTimer);
      clearInterval(privateTimer);
      if (logStream) logStream.destroy();
    });
  });

  console.log('WebSocket server listening at /ws');
}
