import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './app.js';
import { initDb } from './db/init.js';
import { setupWebSocket } from './ws.js';
import { startCollector } from './jobs/collect.js';
import { startCleanup } from './jobs/cleanup.js';
import config from './config.js';

const app = createApp();
const server = createServer(app);

setupWebSocket(server);

try {
  await initDb();
} catch (err) {
  console.error('Database init failed:', err.message);
}

startCollector();
startCleanup();

server.listen(config.port, () => {
  console.log(`Dashboard backend running on port ${config.port}`);
});
