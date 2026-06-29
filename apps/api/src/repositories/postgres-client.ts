import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool | null {
  if (!config.databaseUrl) {
    return null;
  }

  pool ??= new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('sslmode=require') ? undefined : { rejectUnauthorized: false },
  });

  return pool;
}

export function hasPostgresDatabase(): boolean {
  return getPostgresPool() !== null;
}
