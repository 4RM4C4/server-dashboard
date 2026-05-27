# Stage 1: build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: production backend + built frontend
FROM node:20-alpine AS production

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./

# Drop frontend dist into backend so Express can serve it as static files
COPY --from=frontend-builder /app/frontend/dist ./dist

EXPOSE 3000
CMD ["node", "src/server.js"]
