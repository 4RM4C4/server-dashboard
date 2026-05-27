import express from 'express';
import cors from 'cors';
import config from './config.js';
import authRoutes from './routes/auth.js';
import systemRoutes from './routes/system.js';
import dockerRoutes from './routes/docker.js';
import servicesRoutes from './routes/services.js';
import traefikRoutes from './routes/traefik.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json());

  app.get('/health', (_, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/docker', dockerRoutes);
  app.use('/api/services', servicesRoutes);
  app.use('/api/traefik', traefikRoutes);

  return app;
}
