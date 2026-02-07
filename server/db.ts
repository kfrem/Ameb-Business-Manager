import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required. Check your .env file.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

// Run database migrations on startup (safe to run multiple times)
export async function runMigrations() {
  const client = await pool.connect();
  try {
    // Add new currency enum values if they don't exist
    const newCurrencies = ['GBP', 'NGN', 'CDF'];
    for (const currency of newCurrencies) {
      await client.query(`
        DO $$ BEGIN
          ALTER TYPE currency ADD VALUE IF NOT EXISTS '${currency}';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    }
    console.log('Database migrations completed');
  } catch (error: any) {
    console.log('Migration note:', error?.message || 'already up to date');
  } finally {
    client.release();
  }
}
