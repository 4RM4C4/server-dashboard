import mysql from 'mysql2/promise';
import config from '../config.js';

export async function initDb() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\``);
    await conn.query(`USE \`${config.db.database}\``);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        cpu_percent FLOAT NOT NULL,
        cpu_temp FLOAT,
        ram_used BIGINT NOT NULL,
        ram_total BIGINT NOT NULL,
        disk_used BIGINT NOT NULL,
        disk_total BIGINT NOT NULL,
        net_rx_bytes BIGINT DEFAULT 0,
        net_tx_bytes BIGINT DEFAULT 0,
        load_avg_1 FLOAT,
        INDEX idx_recorded_at (recorded_at)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS container_metrics (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        container_id VARCHAR(64) NOT NULL,
        container_name VARCHAR(255) NOT NULL,
        cpu_percent FLOAT NOT NULL,
        mem_used BIGINT NOT NULL,
        mem_limit BIGINT NOT NULL,
        status VARCHAR(50) NOT NULL,
        INDEX idx_recorded_at (recorded_at),
        INDEX idx_container_id (container_id)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS health_results (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        service_name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        status_code INT DEFAULT 0,
        latency_ms INT NOT NULL,
        is_healthy TINYINT(1) NOT NULL,
        INDEX idx_recorded_at (recorded_at),
        INDEX idx_service_name (service_name)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS traefik_snapshots (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        service VARCHAR(255) NOT NULL,
        requests_total BIGINT NOT NULL DEFAULT 0,
        INDEX idx_recorded_at (recorded_at),
        INDEX idx_service (service)
      )
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS traefik_traffic (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        entrypoint VARCHAR(100) NOT NULL,
        requests_total BIGINT NOT NULL DEFAULT 0,
        req_bytes BIGINT NOT NULL DEFAULT 0,
        resp_bytes BIGINT NOT NULL DEFAULT 0,
        INDEX idx_recorded_at (recorded_at),
        INDEX idx_entrypoint (entrypoint)
      )
    `);

    console.log('Database initialized');
  } finally {
    await conn.end();
  }
}
