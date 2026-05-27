import pool from './connection.js';

export async function getServices() {
  const [rows] = await pool.query(
    `SELECT id, name, url, domain, internal_url AS internalUrl
     FROM monitored_services
     WHERE enabled = 1
     ORDER BY id ASC`
  );
  return rows;
}
