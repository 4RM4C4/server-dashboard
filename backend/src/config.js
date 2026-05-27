const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret',
    expiresIn: '7d',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dashboard',
  },
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '',
  },
  services: JSON.parse(process.env.MONITORED_SERVICES || '[]'),
  traefikApiUrl: process.env.TRAEFIK_API_URL || 'http://coolify-proxy:8080',
  collectIntervalMs: parseInt(process.env.COLLECT_INTERVAL_SECONDS || '60') * 1000,
  retentionDays: parseInt(process.env.RETENTION_DAYS || '7'),
  frontendUrl: process.env.FRONTEND_URL || '*',
};

export default config;
