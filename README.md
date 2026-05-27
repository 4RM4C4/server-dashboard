# server-dashboard

A real-time monitoring dashboard for a Raspberry Pi 4 home server running [Coolify](https://coolify.io) + Traefik + MariaDB. Built as a portfolio project to showcase full-stack skills: Node.js, React, WebSockets, Docker, and self-hosted infrastructure.

**Live demo:** [dashboard.armaca.com.ar](https://dashboard.armaca.com.ar)

---

## Features

| Feature | Auth required |
|---|---|
| System metrics — CPU, RAM, disk, temperature | Public |
| 1-hour historical charts (CPU %, RAM %) | Public |
| Network traffic — bandwidth, requests/min | Public |
| Service health checks + latency | Public |
| SSL certificate expiry per domain | Public |
| Load average (1m / 5m / 15m) | Public |
| Docker container list — CPU, RAM, status | Admin |
| Live log streaming per container | Admin |

All public data is pushed via WebSocket every 5 seconds. Historical data is stored in MariaDB with 7-day retention.

---

## Architecture

```
Browser
  │
  ├── WebSocket (/ws)  ←── real-time push (system + health every 5s)
  └── REST API (/api)  ←── historical data, auth
         │
    Express + Node.js
         │
    ┌────┼────────────────────┐
    │    │                    │
  MariaDB  systeminformation  Traefik /metrics
  (history) (CPU/RAM/disk/temp) (Prometheus)
         │
    Docker socket
    (containers + logs)
```

**Docker volumes required (Coolify):**
- `/:/hostfs:ro` — host filesystem for accurate disk usage
- `/sys:/sys:ro` — CPU temperature sensor
- `/var/run/docker.sock:/var/run/docker.sock:ro` — container stats and logs

The backend detects its environment at startup: on Windows or when `/hostfs` is not mounted (local dev), it reads native OS metrics. In production Docker with `/hostfs` mounted, it reads the Raspberry Pi's real filesystem.

---

## Tech stack

**Backend**
- Node.js 20 (ESM)
- Express 4
- WebSocket (`ws`)
- `systeminformation` — CPU, RAM, disk, temperature
- `dockerode` — Docker stats and log streaming
- `mysql2` — MariaDB connection pool
- `node-cron` — metrics collection (every 60s) and cleanup (daily)
- `bcryptjs` + `jsonwebtoken` — admin auth
- Vitest + Supertest — unit and integration tests

**Frontend**
- React 18 + Vite
- Recharts — mini sparkline charts
- JetBrains Mono aesthetic (matches [armaca.com.ar](https://armaca.com.ar))

**Infrastructure**
- Raspberry Pi 4 (8 GB RAM) + Debian 12
- Coolify for container management
- Traefik as reverse proxy (with Prometheus metrics enabled)
- CloudFlare for DNS + Full SSL

---

## Local development

### Prerequisites
- Node.js 20+
- A running MariaDB instance (local or remote)
- Docker (optional, for container features)

### Backend

```bash
cd backend
cp ../. env.example .env   # fill in your values
npm install
npm run dev                # starts with --watch on port 3000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local # set VITE_API_URL=http://localhost:3000
npm install
npm run dev                # starts Vite dev server on port 5173
```

### Tests

```bash
cd backend
npm test
```

26 tests across 4 suites: auth, routes, prometheus parser, health checker.

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `PORT` | Backend port (default `3000`) |
| `JWT_SECRET` | Long random string for signing tokens |
| `DB_HOST` | MariaDB host (use gateway IP when running in Docker) |
| `DB_PORT` | MariaDB port (default `3306`) |
| `DB_USER` | MariaDB user |
| `DB_PASSWORD` | MariaDB password |
| `DB_NAME` | Database name (created automatically) |
| `ADMIN_USERNAME` | Dashboard admin username |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password |
| `MONITORED_SERVICES` | JSON array of services to monitor (see below) |
| `TRAEFIK_API_URL` | Traefik API endpoint (default `http://coolify-proxy:8080`) |
| `FRONTEND_URL` | Frontend origin for CORS |
| `COLLECT_INTERVAL_SECONDS` | Metrics collection interval (default `60`) |
| `RETENTION_DAYS` | Days to keep history (default `7`) |

**Generate bcrypt hash:**
```bash
node -e "import('bcryptjs').then(b => b.default.hash('yourpassword', 10).then(console.log))"
```

**Monitored services format:**
```json
[
  {
    "name": "My Site",
    "url": "https://mysite.com",
    "domain": "mysite.com",
    "internalUrl": "https://coolify-proxy"
  }
]
```

The `internalUrl` field is optional. When set, health checks bypass DNS and hit the internal Traefik proxy directly with a `Host` header. This solves [hairpin NAT](https://en.wikipedia.org/wiki/Hairpinning) issues where containers on the same machine can't reach their own public domain through the modem.

---

## Deploying to Coolify

1. Fork this repo and connect it to Coolify as two separate services (backend + frontend).

2. **Backend environment variables** — set all variables from `.env.example` in the Coolify UI. Do **not** commit `.env`.

3. **Backend volumes:**
   ```
   /:/hostfs:ro
   /sys:/sys:ro
   /var/run/docker.sock:/var/run/docker.sock:ro
   ```

4. **Frontend environment variable:**
   ```
   VITE_API_URL=https://your-backend-domain.com
   ```

5. Both services use multi-stage Docker builds. The backend runs on `node:20-alpine`; the frontend builds with Vite and is served by nginx.

---

## License

MIT
